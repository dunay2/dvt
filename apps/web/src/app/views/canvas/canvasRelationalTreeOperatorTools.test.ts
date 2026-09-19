import { describe, expect, it } from 'vitest';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1, allocateDvtFieldId } from '@dvt/contracts';
import {
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinAcceptedDraft,
  inspectDvtSubstraitJoinPredicateContext,
  updateDvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinComposition';
import {
  appendDvtSubstraitUnionAllInput,
  createDvtSubstraitUnionAllDraft,
  inspectDvtSubstraitUnionAllAcceptedDraft,
  type DvtSubstraitUnionAllSource,
  type DvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { dvtSubstraitJoinConditionKey } from './canvasDvtSubstraitJoinCondition';
import { dvtSubstraitJoinOperandKey } from './canvasDvtSubstraitJoinOperand';
import { removeCanvasRelationalTreeNode } from './canvasRelationalTreeRemoval';
import { projectDvtSubstraitJoinToPostgresSql } from './canvasDvtSubstraitPostgresProjection';

const source = (table: string): DvtSubstraitUnionAllSource => ({
  nodeId: table,
  schema: 'public',
  table,
  fields: [
    { name: 'customer_id', type: 'string' as const },
    { name: 'name', type: 'string' as const },
  ],
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse',
      provider: 'postgres' as const,
    },
    sourceObjectId: `public.${table}`,
  },
});

describe('admitted relational operator tools', () => {
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
    const sql = await projectDvtSubstraitJoinToPostgresSql(next);
    expect(sql).toMatch(/<>/);
    expect(sql).toMatch(/count\(\*\)/i);
    expect(sql).toMatch(/row_number\(\)/i);
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
  it('accounts for every admitted relation and window capability, not candidate operators', () => {
    const supported = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.filter(
      (entry) => entry.kind === 'standard' && entry.profileStatus === 'supported-profile'
    );
    expect(
      supported
        .filter((entry) => entry.entryId.includes('/relation/'))
        .map((entry) => entry.entryId.split('/relation/')[1])
        .sort()
    ).toEqual([
      'substrait.AggregateRel',
      'substrait.FilterRel',
      'substrait.JoinRel/JoinType.JOIN_TYPE_INNER',
      'substrait.JoinRel/JoinType.JOIN_TYPE_LEFT',
      'substrait.ProjectRel',
      'substrait.ReadRel/read_type.named_table',
      'substrait.RelCommon/emit_kind.emit',
      'substrait.SetRel/SetOp.SET_OP_UNION_ALL',
    ]);
    expect(
      supported
        .filter((entry) => entry.entryId.includes('/window-function/'))
        .map((entry) => entry.entryId.split('/').at(-1))
    ).toEqual(['row_number']);
  });
  it('authors all six text filters and source ROW_NUMBER without changing the source or its identities', () => {
    const input = source('customers');
    const draft = createDvtSubstraitProjectionDraft({
      source: {
        ...input,
        fields: input.fields.map((field) => ({ name: field.name, dataType: field.type })),
      },
      targetNodeId: 'model',
      outputs: input.fields.map((field) => ({
        fieldId: allocateDvtFieldId(),
        name: field.name,
        sourceFieldName: field.name,
      })),
    });
    const baseline = encodeDvtSubstraitSemanticDocument(draft);
    const tools = resolveCanvasRelationalOperatorTools(draft);
    const filter = tools.find((item) => item.id === 'filter')!;
    expect(filter.comparisons?.map((item) => item.name).sort()).toEqual([
      'equal',
      'gt',
      'gte',
      'lt',
      'lte',
      'not_equal',
    ]);
    for (const comparison of filter.comparisons!) {
      const next = applyCanvasRelationalOperatorTool(draft, {
        tool: 'filter',
        fieldId: filter.fields[0]!.fieldId,
        capabilityId: comparison.capabilityId,
        value: "O'Reilly",
      });
      expect(inspectDvtSubstraitFilter(next)).toMatchObject({
        operator: comparison.name,
        value: "O'Reilly",
      });
      const removed = applyCanvasRelationalOperatorTool(next, { tool: 'filter', remove: true });
      expect(inspectDvtSubstraitProjectionDraft(removed).ok).toBe(true);
      expect(removed.sidecar.fields).toEqual(draft.sidecar.fields);
      const filterId = next.sidecar.relations.find(
        (relation) =>
          !draft.sidecar.relations.some((original) => original.relationId === relation.relationId)
      )!.relationId;
      const retired = removeCanvasRelationalTreeNode({
        draft: next,
        relationId: filterId,
        targetNodeId: 'model',
      });
      expect(retired.ok).toBe(true);
      if (retired.ok) expect(inspectDvtSubstraitFilter(retired.draft)).toBeNull();
    }
    const window = applyCanvasRelationalOperatorTool(draft, {
      tool: 'window',
      fieldId: filter.fields[0]!.fieldId,
      alias: 'position',
    });
    const inspected = inspectDvtSubstraitProjectionDraft(window);
    expect(inspected.ok).toBe(true);
    if (inspected.ok)
      expect(inspected.projection.outputs.at(-1)?.calculation?.kind).toBe('row-number');
    if (inspected.ok) {
      const retired = removeCanvasRelationalTreeNode({
        draft: window,
        relationId: inspected.projection.targetRelationId,
        targetNodeId: 'model',
      });
      expect(retired.ok).toBe(true);
      if (retired.ok) expect(retired.draft.sidecar.fields).toEqual(draft.sidecar.fields);
    }
    expect(encodeDvtSubstraitSemanticDocument(draft)).toEqual(baseline);
    expect(
      applyCanvasRelationalOperatorTool(draft, {
        tool: 'window',
        fieldId: 'missing',
        alias: 'position',
      })
    ).toBe(draft);
  });
  it('appends a third UNION source without replacing any existing relation or field', () => {
    const draft = createDvtSubstraitUnionAllDraft({
      inputs: [source('north'), source('south')],
      targetNodeId: 'model',
    });
    const next = appendDvtSubstraitUnionAllInput(draft, source('west'));
    const inspection = inspectDvtSubstraitUnionAllAcceptedDraft(next);
    expect(inspection.ok).toBe(true);
    if (inspection.ok) expect(inspection.projection.inputs).toHaveLength(3);
    for (const field of draft.sidecar.fields) expect(next.sidecar.fields).toContainEqual(field);
    for (const relation of draft.sidecar.relations)
      expect(next.sidecar.relations).toContainEqual(
        expect.objectContaining({ relationId: relation.relationId })
      );
    expect(appendDvtSubstraitUnionAllInput(next, source('west'))).toBe(next);
    expect(
      appendDvtSubstraitUnionAllInput(next, {
        ...source('bad'),
        fields: [{ name: 'wrong', type: 'string' }],
      })
    ).toBe(next);
  });
  for (const shape of ['inner_join', 'union_all'] as const) {
    const fixture = (): DvtSubstraitUnionAllDraft =>
      shape === 'inner_join'
        ? createDvtSubstraitJoinDraft({
            left: source('customers'),
            right: source('orders'),
            targetNodeId: 'model',
          })
        : createDvtSubstraitUnionAllDraft({
            inputs: [source('north'), source('south'), source('west')],
            targetNodeId: 'model',
          });
    it(`${shape}: groups, windows, persists and removes without replacing source identities`, () => {
      const original = fixture();
      const group = resolveCanvasRelationalOperatorTools(original).find(
        (tool) => tool.id === 'aggregate'
      )!;
      expect(group.enabled).toBe(true);
      const grouped = applyCanvasRelationalOperatorTool(original, {
        tool: 'aggregate',
        fieldId: group.fields[0]!.fieldId,
        alias: 'total',
      });
      expect(grouped).not.toBe(original);
      const window = resolveCanvasRelationalOperatorTools(grouped).find(
        (tool) => tool.id === 'window'
      )!;
      expect(window.enabled).toBe(true);
      const windowed = applyCanvasRelationalOperatorTool(grouped, {
        tool: 'window',
        alias: 'position',
      });
      const reloaded = decodeDvtSubstraitSemanticDocument(
        encodeDvtSubstraitSemanticDocument(windowed)
      );
      const inspect =
        shape === 'inner_join'
          ? inspectDvtSubstraitJoinAcceptedDraft
          : inspectDvtSubstraitUnionAllAcceptedDraft;
      expect(inspect(reloaded).ok).toBe(true);
      expect(reloaded.sidecar.relations).toEqual(windowed.sidecar.relations);
      expect(reloaded.sidecar.fields).toEqual(windowed.sidecar.fields);
      expect(
        resolveCanvasRelationalOperatorTools(reloaded).find((tool) => tool.id === 'window')?.active
      ).toBe(true);
      const unwindowed = applyCanvasRelationalOperatorTool(reloaded, {
        tool: 'window',
        remove: true,
      });
      const ungrouped = applyCanvasRelationalOperatorTool(unwindowed, {
        tool: 'aggregate',
        remove: true,
      });
      expect(inspect(ungrouped).ok).toBe(true);
      expect(ungrouped.sidecar.relations.map((r) => r.relationId)).toEqual(
        original.sidecar.relations.map((r) => r.relationId)
      );
    });
    it(`${shape}: rejects stale fields, duplicate/invalid aliases and premature windows`, () => {
      const draft = fixture();
      const group = resolveCanvasRelationalOperatorTools(draft).find(
        (tool) => tool.id === 'aggregate'
      )!;
      expect(
        applyCanvasRelationalOperatorTool(draft, {
          tool: 'aggregate',
          fieldId: 'missing',
          alias: 'total',
        })
      ).toBe(draft);
      expect(
        applyCanvasRelationalOperatorTool(draft, {
          tool: 'aggregate',
          fieldId: group.fields[0]!.fieldId,
          alias: group.fields[0]!.name,
        })
      ).toBe(draft);
      expect(
        applyCanvasRelationalOperatorTool(draft, {
          tool: 'aggregate',
          fieldId: group.fields[0]!.fieldId,
          alias: '\u0000',
        })
      ).toBe(draft);
      expect(applyCanvasRelationalOperatorTool(draft, { tool: 'window', alias: 'rn' })).toBe(draft);
    });
  }
});
