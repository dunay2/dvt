import { describe, expect, it } from 'vitest';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import {
  applyDvtSubstraitProjectionFunction,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';

describe('Calculated scalar composition', () => {
  it('projects inspected CONCAT with ACCEPT_NULLS semantics and a quoted alias', async () => {
    const concat = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'concat');
    if (concat == null) throw new Error('Expected admitted CONCAT capability.');

    const result = createDvtSubstraitProjectionOutput(
      connectedNamesProjectionDraft(),
      {
        alias: 'display name',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:first_name', 'output:last_name'],
          capabilityId: concat.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text'], provider: 'postgres' }
    );
    if (result.outcome !== 'applied') throw new Error('Expected CONCAT output creation.');
    const createdBinding = result.draft.sidecar.fields.find(
      (field) => field.fieldId === result.createdFieldId
    );
    expect(createdBinding?.operandFieldIds).toEqual(['output:first_name', 'output:last_name']);
    const extension = result.draft.plan.extensions.find(
      (entry) => entry.mappingType.case === 'extensionFunction'
    );
    expect(extension?.mappingType.case).toBe('extensionFunction');
    if (extension?.mappingType.case !== 'extensionFunction') {
      throw new Error('Expected CONCAT extension declaration.');
    }
    expect(extension.mappingType.value.name).toBe('concat:str');

    const projected = await projectSubstraitToPostgresSql(result.draft);
    expect(projected.projection.outputs.length).toBe(
      result.draft.sidecar.fields.filter(
        (field) =>
          field.relationId === projected.projection.resultRelationId && field.parentFieldId == null
      ).length
    );
  });
  it('projects recursively inspected CONCAT operands without losing their order', async () => {
    const concat = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'concat');
    if (concat == null) throw new Error('Expected admitted CONCAT capability.');

    const first = createDvtSubstraitProjectionOutput(
      connectedNamesProjectionDraft(),
      {
        alias: 'full_name',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:first_name', 'output:last_name'],
          capabilityId: concat.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text'], provider: 'postgres' }
    );
    if (first.outcome !== 'applied') throw new Error('Expected first CONCAT output creation.');
    const second = createDvtSubstraitProjectionOutput(
      first.draft,
      {
        alias: 'extended_name',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: [first.createdFieldId, 'output:first_name'],
          capabilityId: concat.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text'], provider: 'postgres' }
    );
    if (second.outcome !== 'applied') throw new Error('Expected recursive CONCAT output creation.');

    expect(
      second.draft.sidecar.fields.find((field) => field.fieldId === second.createdFieldId)
        ?.operandFieldIds
    ).toEqual([first.createdFieldId, 'output:first_name']);
    const projected = await projectSubstraitToPostgresSql(second.draft);
    expect(projected.projection.outputs.length).toBe(
      second.draft.sidecar.fields.filter(
        (field) =>
          field.relationId === projected.projection.resultRelationId && field.parentFieldId == null
      ).length
    );
  });
  it('projects an admitted unary function around a recursive CONCAT tree', async () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    });
    const concat = functions.find((candidate) => candidate.name === 'concat');
    const upper = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text'],
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'upper');
    if (concat == null || upper == null) {
      throw new Error('Expected admitted CONCAT and UPPER capabilities.');
    }

    const concatResult = createDvtSubstraitProjectionOutput(
      connectedNamesProjectionDraft(),
      {
        alias: 'full_name',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: ['output:first_name', 'output:last_name'],
          capabilityId: concat.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text'], provider: 'postgres' }
    );
    if (concatResult.outcome !== 'applied') throw new Error('Expected CONCAT output creation.');
    const upperDraft = applyDvtSubstraitProjectionFunction(concatResult.draft, {
      fieldId: concatResult.createdFieldId,
      operandFieldIds: [concatResult.createdFieldId],
      capabilityId: upper.capabilityId,
      alias: 'full_name',
      dataTypes: ['text'],
      provider: 'postgres',
    });
    expect(upperDraft).not.toBe(concatResult.draft);

    const inspection = inspectDvtSubstraitProjectionDraft(upperDraft);
    expect(inspection.ok).toBe(true);
    if (inspection.ok) expect(inspection.projection.outputs.at(-1)?.operations).toContain('upper');
    const projected = await projectSubstraitToPostgresSql(upperDraft);
    expect(projected.projection.outputs.length).toBe(
      upperDraft.sidecar.fields.filter(
        (field) =>
          field.relationId === projected.projection.resultRelationId && field.parentFieldId == null
      ).length
    );
  });
});
