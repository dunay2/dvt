import { describe, expect, it } from 'vitest';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import {
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import { source } from './canvasRelationalOperator.test-support';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';

describe('computed projection output selection', () => {
  it('excludes a visible operand without deleting its calculation or physical input', async () => {
    const document = createDvtSubstraitProjectionDraft({
      source: {
        ...source('records'),
        fields: ['first', 'last'].map((name) => ({ name, dataType: 'text' })),
      },
      targetNodeId: 'model',
      outputs: ['first', 'last'].map((name) => ({
        fieldId: `output:${name}`,
        name,
        sourceFieldName: name,
      })),
    });
    const concat = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    }).find((fn) => fn.name === 'concat')!;
    const created = createDvtSubstraitProjectionOutput(
      document,
      {
        alias: 'full_name',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:first', 'output:last'],
          capabilityId: concat.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text'], provider: 'postgres' }
    );
    if (created.outcome !== 'applied') throw new Error(created.reason);
    const calculated = created.draft;
    const session = new CanvasRelationAnalysisSession('calculated');
    session.receive(calculated);
    const target = session.locate(session.rootId, session.revision);
    const inputs = await Promise.all(target.inputs.map((id) => session.query(id)));
    const slots = relationOutputSlots(target, inputs);
    const selected = slots.filter((slot) => slot.output != null && slot.key !== 'output:last');
    const next = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: selected.map((slot) => ({ slot: slot.slot, alias: slot.name })),
    });
    const output = await session.query(session.rootId);
    expect(output.bindings.map((field) => field.displayName)).toEqual(['first', 'full_name']);
    expect(output.fields.at(-1)?.sourceFieldIds).toHaveLength(2);
    expect(session.locate(session.rootId, session.revision).inputs).toEqual(target.inputs);
    expect(deriveSubstraitSchemas(next).schemas.get(session.rootId)).toEqual(output.fields);
    expect(inspectDvtSubstraitProjectionDraft(next).ok).toBe(true);
  });
});
