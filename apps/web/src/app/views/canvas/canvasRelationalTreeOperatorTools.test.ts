import { describe, expect, it } from 'vitest';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1, allocateDvtFieldId } from '@dvt/contracts';
import {
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitFilter } from './canvasDvtSubstraitFilter';
import {
  createDvtSubstraitInnerJoinDraft,
  inspectDvtSubstraitInnerJoinAcceptedDraft,
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
        ? createDvtSubstraitInnerJoinDraft({
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
          ? inspectDvtSubstraitInnerJoinAcceptedDraft
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
