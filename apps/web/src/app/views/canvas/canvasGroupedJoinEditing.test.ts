import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';
import { source } from './canvasRelationalOperator.test-support';
import {
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinPredicateContext,
  updateDvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinComposition';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { dvtSubstraitJoinConditionKey } from './canvasDvtSubstraitJoinCondition';
import { dvtSubstraitJoinOperandKey } from './canvasDvtSubstraitJoinOperand';
import { removeCanvasRelationalTreeNode } from './canvasRelationalTreeRemoval';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('canvasGroupedJoinEditing', () => {
  it('edits a selected JOIN beneath grouping and window without losing either wrapper', async () => {
    const original = createDvtSubstraitJoinDraft({
      left: source('customers'),
      right: source('orders'),
      targetNodeId: 'model',
    });
    const grouping = resolveCanvasRelationalOperatorTools(original).find(
      (tool) => tool.id === 'aggregate'
    )!;
    const grouped = applyCanvasRelationalOperatorTool(original, {
      tool: 'aggregate',
      fieldId: grouping.fields[0]!.fieldId,
      alias: 'total',
    });
    const windowed = applyCanvasRelationalOperatorTool(grouped, {
      tool: 'window',
      alias: 'position',
    });
    const root = windowed.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
      throw new Error('Expected window');
    const windowAnchor = root.value.input.relType.value.common!.relAnchor;
    const windowId = windowed.sidecar.relations.find(
      (rel) => rel.relAnchor === windowAnchor
    )!.relationId;
    const removed = removeCanvasRelationalTreeNode({
      draft: windowed,
      relationId: windowId,
      targetNodeId: 'model',
    });
    expect(removed.ok).toBe(true);
    if (removed.ok)
      expect(
        resolveCanvasRelationalOperatorTools(removed.draft).find((tool) => tool.id === 'window')
          ?.active
      ).toBe(false);
    const context = inspectDvtSubstraitJoinPredicateContext(windowed);
    expect(context?.inspection.ok).toBe(true);
    if (context == null || !context.inspection.ok) throw new Error('Expected nested JOIN context');
    const projection = context.inspection.projection;
    const previous = projection.joins[0]!.conditions[0]!;
    const conditionKey = dvtSubstraitJoinConditionKey(previous, (operand) =>
      dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId)
    );
    const baseEdited = updateDvtSubstraitJoinPredicateCondition({
      draft: context.baseDraft,
      joinRelationId: projection.joinRelations[0]!.relationId,
      conditionKey,
      condition: {
        left: { kind: 'field', sourceFieldId: projection.inputs[0]!.fields[0]!.fieldId },
        right: { kind: 'field', sourceFieldId: projection.inputs[1]!.fields[0]!.fieldId },
        operator: 'not_equal',
      },
    });
    expect(baseEdited).not.toBe(context.baseDraft);
    expect(baseEdited.sidecar.relations).toEqual(context.baseDraft.sidecar.relations);
    expect(baseEdited.sidecar.fields).toEqual(context.baseDraft.sidecar.fields);
    const next = updateDvtSubstraitJoinPredicateCondition({
      draft: windowed,
      joinRelationId: projection.joinRelations[0]!.relationId,
      conditionKey,
      condition: {
        left: { kind: 'field', sourceFieldId: projection.inputs[0]!.fields[0]!.fieldId },
        right: { kind: 'field', sourceFieldId: projection.inputs[1]!.fields[0]!.fieldId },
        operator: 'not_equal',
      },
    });
    expect(next).not.toBe(windowed);
    expect(next.sidecar.relations).toEqual(windowed.sidecar.relations);
    expect(next.sidecar.fields).toEqual(windowed.sidecar.fields);
    expect(inspectDvtSubstraitJoinAcceptedDraft(next).ok).toBe(true);
    expect(
      resolveCanvasRelationalOperatorTools(next).find((tool) => tool.id === 'window')?.active
    ).toBe(true);
    const projected = await projectSubstraitToPostgresSql(next);
    expect(projected.projection.outputs.map((field) => field.dataType)).toEqual([
      'string',
      'i64',
      'i64',
    ]);
    const decoded = decodeDvtSubstraitSemanticDocument(encodeDvtSubstraitSemanticDocument(next));
    const reloaded = inspectDvtSubstraitJoinPredicateContext(decoded);
    expect(
      reloaded?.inspection.ok && reloaded.inspection.projection.joins[0]!.conditions[0]
    ).toMatchObject({ operator: 'not_equal' });
    expect(
      updateDvtSubstraitJoinPredicateCondition({
        draft: windowed,
        joinRelationId: 'missing',
        conditionKey,
        condition: {
          left: { kind: 'literal', literal: { dataType: 'string', value: 'x' } },
          operator: 'is_null',
        },
      })
    ).toBe(windowed);
  });
});
