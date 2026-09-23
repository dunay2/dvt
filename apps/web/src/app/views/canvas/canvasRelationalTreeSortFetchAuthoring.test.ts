import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';

import {
  createDvtSubstraitJoinDraft,
  encodeDvtSubstraitJoinDocument,
  type DvtSubstraitJoinType,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitPilotDraft,
  encodeDvtSubstraitPilotDocument,
} from './canvasDvtSubstraitPilot';
import type { DvtSubstraitPilotDraft } from './canvasDvtSubstraitPilot';
import {
  inspectCanvasDvtSubstraitSortFetch,
  removeDvtSubstraitSortFetch,
  selectCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';
import { applyCanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorCommands';
import { resolveCanvasRelationalOperatorTools } from './canvasRelationalTreeOperatorModel';
import {
  applyDvtTransformAuthoringMetadata,
  createDvtTransformAuthoringMetadata,
} from './canvasDvtTransformAuthoring';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { canvasJoinOperationForType } from './canvasRelationalTreeJoinType';

function draft(): DvtSubstraitPilotDraft {
  return createDvtSubstraitPilotDraft({ sourceNodeId: 'orders', targetNodeId: 'model' });
}

describe('Canvas relational Sort/Fetch authoring tools', () => {
  it('offers contextual unary tools over the current output', () => {
    const tools = resolveCanvasRelationalOperatorTools(draft());
    expect(tools.find((tool) => tool.id === 'sort')).toMatchObject({
      enabled: true,
      active: false,
      fields: [{ name: 'name' }, { name: 'email' }, { name: 'country' }],
    });
    expect(tools.find((tool) => tool.id === 'fetch')).toMatchObject({
      enabled: true,
      active: false,
    });
  });

  it('authors multiple ordered keys and preserves their priority on reopen', () => {
    const base = draft();
    const fields = resolveCanvasRelationalOperatorTools(base).find(
      (tool) => tool.id === 'sort'
    )!.fields;
    const sorted = applyCanvasRelationalOperatorTool(base, {
      tool: 'sort',
      sortKeys: [
        {
          fieldId: fields[1]!.fieldId,
          direction: SortField_SortDirection.DESC_NULLS_LAST,
        },
        {
          fieldId: fields[0]!.fieldId,
          direction: SortField_SortDirection.ASC_NULLS_FIRST,
        },
      ],
    });
    expect(inspectCanvasDvtSubstraitSortFetch(sorted)).toMatchObject({
      ok: true,
      operation: 'sort',
      keys: [
        { fieldId: fields[1]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST },
        { fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_FIRST },
      ],
    });
    expect(
      resolveCanvasRelationalOperatorTools(sorted).find((tool) => tool.id === 'sort')
    ).toMatchObject({ active: true });
  });

  it('authors exact i64 Fetch values and removes only the selected wrapper', () => {
    const base = draft();
    const fetched = applyCanvasRelationalOperatorTool(base, {
      tool: 'fetch',
      offset: 9_007_199_254_740_993n,
      count: 9_223_372_036_854_775_807n,
    });
    expect(inspectCanvasDvtSubstraitSortFetch(fetched)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 9_007_199_254_740_993n,
      count: 9_223_372_036_854_775_807n,
    });
    const removed = applyCanvasRelationalOperatorTool(fetched, { tool: 'fetch', remove: true });
    expect(inspectCanvasDvtSubstraitSortFetch(removed)).toEqual({ ok: false });
  });

  it('rejects duplicate sort keys, negative values, fractions, and i64 overflow', () => {
    const base = draft();
    const field = resolveCanvasRelationalOperatorTools(base).find((tool) => tool.id === 'sort')!
      .fields[0]!;
    expect(
      applyCanvasRelationalOperatorTool(base, {
        tool: 'sort',
        sortKeys: [
          { fieldId: field.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
          { fieldId: field.fieldId, direction: SortField_SortDirection.DESC_NULLS_LAST },
        ],
      })
    ).toBe(base);
    expect(applyCanvasRelationalOperatorTool(base, { tool: 'fetch', offset: -1n })).toBe(base);
    expect(
      applyCanvasRelationalOperatorTool(base, {
        tool: 'fetch',
        count: 9_223_372_036_854_775_808n,
      })
    ).toBe(base);
  });

  it('reopens and edits an inner ORDER BY without losing an outer LIMIT', () => {
    const base = draft();
    const fields = resolveCanvasRelationalOperatorTools(base).find(
      (tool) => tool.id === 'sort'
    )!.fields;
    const sorted = applyCanvasRelationalOperatorTool(base, {
      tool: 'sort',
      sortKeys: [
        { fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
      ],
    });
    const sort = inspectCanvasDvtSubstraitSortFetch(sorted);
    if (!sort.ok) throw new Error('Expected SortRel');
    const fetched = applyCanvasRelationalOperatorTool(sorted, {
      tool: 'fetch',
      offset: 2n,
      count: 3n,
    });
    const edited = applyCanvasRelationalOperatorTool(fetched, {
      tool: 'sort',
      targetRelationId: sort.relationId,
      sortKeys: [
        { fieldId: fields[1]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_FIRST },
      ],
    });
    expect(inspectCanvasDvtSubstraitSortFetch(edited)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 2n,
      count: 3n,
    });
    expect(
      inspectCanvasDvtSubstraitSortFetch(
        selectCanvasDvtSubstraitSortFetch(edited, sort.relationId)!
      )
    ).toMatchObject({
      ok: true,
      operation: 'sort',
      keys: [{ fieldId: fields[1]!.fieldId, direction: SortField_SortDirection.DESC_NULLS_FIRST }],
    });
  });

  it('removes an inner ORDER BY and keeps the outer LIMIT valid', () => {
    const base = draft();
    const field = resolveCanvasRelationalOperatorTools(base).find((tool) => tool.id === 'sort')!
      .fields[0]!;
    const sorted = applyCanvasRelationalOperatorTool(base, {
      tool: 'sort',
      sortKeys: [{ fieldId: field.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST }],
    });
    const sort = inspectCanvasDvtSubstraitSortFetch(sorted);
    if (!sort.ok) throw new Error('Expected SortRel');
    const fetched = applyCanvasRelationalOperatorTool(sorted, { tool: 'fetch', count: 10n });

    const removed = removeDvtSubstraitSortFetch(fetched, 'sort', sort.relationId);

    const outer = inspectCanvasDvtSubstraitSortFetch(removed);
    expect(outer).toMatchObject({ ok: true, operation: 'fetch', count: 10n });
    if (!outer.ok) return;
    expect(
      inspectCanvasDvtSubstraitSortFetch(selectDvtSubstraitRelation(removed, outer.inputRelationId))
    ).toEqual({ ok: false });
  });

  it('persists and reloads nested SortRel/FetchRel without changing the base shape', () => {
    const base = draft();
    const field = resolveCanvasRelationalOperatorTools(base).find((tool) => tool.id === 'sort')!
      .fields[0]!;
    const sorted = applyCanvasRelationalOperatorTool(base, {
      tool: 'sort',
      sortKeys: [{ fieldId: field.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST }],
    });
    const fetched = applyCanvasRelationalOperatorTool(sorted, {
      tool: 'fetch',
      offset: 2n,
      count: 3n,
    });
    const node: CanonicalNode = {
      id: 'model',
      name: 'Model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { config: { materialized: 'view' }, columns: [] },
    };
    const semanticNode = applyDvtSubstraitSemanticDocument(
      node,
      encodeDvtSubstraitPilotDocument(fetched)
    );

    const metadata = createDvtTransformAuthoringMetadata(semanticNode);

    expect(metadata).toMatchObject({ mode: 'substrait', shape: 'pilot' });
    expect(applyDvtTransformAuthoringMetadata(semanticNode, metadata)).toEqual(semanticNode);
  });

  it('persists wrappers around a JOIN after validating the underlying JOIN shape', () => {
    const connectionRef = {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres' as const,
    };
    const joined = createDvtSubstraitJoinDraft({
      left: {
        nodeId: 'customers',
        schema: 'raw',
        table: 'customers',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'raw.customers',
        },
      },
      right: {
        nodeId: 'orders',
        schema: 'raw',
        table: 'orders',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef,
          sourceObjectId: 'raw.orders',
        },
      },
      targetNodeId: 'model',
    });
    const sortField = resolveCanvasRelationalOperatorTools(joined).find(
      (tool) => tool.id === 'sort'
    )!.fields[0]!;
    const sorted = applyCanvasRelationalOperatorTool(joined, {
      tool: 'sort',
      sortKeys: [{ fieldId: sortField.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST }],
    });
    const fetched = applyCanvasRelationalOperatorTool(sorted, {
      tool: 'fetch',
      offset: 2n,
      count: 3n,
    });
    const semanticNode = applyDvtSubstraitSemanticDocument(
      {
        id: 'model',
        name: 'Model',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: [],
        metadata: { config: { materialized: 'view' }, columns: [] },
      },
      encodeDvtSubstraitJoinDocument(joined)
    );
    const baseMetadata = createDvtTransformAuthoringMetadata(semanticNode);
    if (baseMetadata.mode === 'uninitialized') throw new Error('Expected Substrait metadata');

    const persisted = applyDvtTransformAuthoringMetadata(semanticNode, {
      ...baseMetadata,
      plan: fetched.plan,
      sidecar: fetched.sidecar,
    });
    const reopened = createDvtTransformAuthoringMetadata(persisted);

    expect(reopened).toMatchObject({ mode: 'substrait', shape: 'inner_join' });
    if (reopened.mode === 'uninitialized') throw new Error('Expected Substrait metadata');
    expect(inspectCanvasDvtSubstraitSortFetch(reopened)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 2n,
      count: 3n,
    });
  });

  const admittedJoinTypes: readonly DvtSubstraitJoinType[] = [
    JoinRel_JoinType.INNER,
    JoinRel_JoinType.LEFT,
    JoinRel_JoinType.RIGHT,
    JoinRel_JoinType.OUTER,
    JoinRel_JoinType.LEFT_SEMI,
    JoinRel_JoinType.LEFT_ANTI,
    JoinRel_JoinType.RIGHT_SEMI,
    JoinRel_JoinType.RIGHT_ANTI,
  ];
  for (const joinType of admittedJoinTypes) {
    it(`persists aggregate and window beneath ORDER BY/LIMIT for JOIN type ${joinType}`, () => {
      const connectionRef = {
        schemaVersion: 'connection-ref.v1' as const,
        connectionId: 'warehouse-main',
        provider: 'postgres' as const,
      };
      const joined = createDvtSubstraitJoinDraft({
        left: {
          nodeId: 'customers',
          schema: 'raw',
          table: 'customers',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'raw.customers',
          },
        },
        right: {
          nodeId: 'orders',
          schema: 'raw',
          table: 'orders',
          sourceRef: {
            schemaVersion: 'connected-source-ref.v1',
            connectionRef,
            sourceObjectId: 'raw.orders',
          },
        },
        targetNodeId: 'model',
        joinType,
      });
      const aggregate = resolveCanvasRelationalOperatorTools(joined).find(
        (tool) => tool.id === 'aggregate'
      )!;
      const grouped = applyCanvasRelationalOperatorTool(joined, {
        tool: 'aggregate',
        fieldId: aggregate.fields[0]!.fieldId,
        alias: 'total',
      });
      const windowed = applyCanvasRelationalOperatorTool(grouped, {
        tool: 'window',
        alias: 'position',
      });
      const sortField = resolveCanvasRelationalOperatorTools(windowed).find(
        (tool) => tool.id === 'sort'
      )!.fields[0]!;
      const sorted = applyCanvasRelationalOperatorTool(windowed, {
        tool: 'sort',
        sortKeys: [
          { fieldId: sortField.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST },
        ],
      });
      const fetched = applyCanvasRelationalOperatorTool(sorted, {
        tool: 'fetch',
        offset: 2n,
        count: 3n,
      });
      const semanticNode = applyDvtSubstraitSemanticDocument(
        {
          id: 'model',
          name: 'Model',
          pluginId: 'dvt',
          kind: 'dvt:transform',
          role: 'transform',
          status: 'idle',
          tags: [],
          metadata: { config: { materialized: 'view' }, columns: [] },
        },
        encodeDvtSubstraitJoinDocument(joined)
      );
      const baseMetadata = createDvtTransformAuthoringMetadata(semanticNode);
      if (baseMetadata.mode === 'uninitialized') throw new Error('Expected Substrait metadata');

      const persisted = applyDvtTransformAuthoringMetadata(semanticNode, {
        ...baseMetadata,
        plan: fetched.plan,
        sidecar: fetched.sidecar,
      });
      const reopened = createDvtTransformAuthoringMetadata(persisted);

      expect(reopened).toMatchObject({
        mode: 'substrait',
        shape: canvasJoinOperationForType(joinType),
      });
      if (reopened.mode === 'uninitialized') throw new Error('Expected Substrait metadata');
      expect(reopened.sidecar.relations).toEqual(fetched.sidecar.relations);
      expect(reopened.sidecar.fields).toEqual(fetched.sidecar.fields);
      expect(inspectCanvasDvtSubstraitSortFetch(reopened)).toMatchObject({
        ok: true,
        operation: 'fetch',
        offset: 2n,
        count: 3n,
      });
    });
  }
});
