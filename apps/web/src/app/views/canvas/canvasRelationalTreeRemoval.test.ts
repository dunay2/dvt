import { describe, expect, it } from 'vitest';
import type { ConnectedSourceRef } from '@dvt/contracts';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  appendDvtSubstraitJoinInput,
  applyDvtSubstraitInnerJoinGrouping,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
  inspectDvtSubstraitInnerJoinGroupedWindowDraft,
  inspectDvtSubstraitJoinPredicateContext,
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitJoinDraft,
  type DvtSubstraitNInputJoinProjection,
  type DvtSubstraitJoinSource,
  type DvtSubstraitJoinDataType,
} from './canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitProjectionDraft } from './canvasDvtSubstraitProjection';
import { removeCanvasRelationalTreeNode } from './canvasRelationalTreeRemoval';
import { createDvtSubstraitCrossDraft } from './canvasDvtSubstraitCrossComposition';
import { inspectDvtSubstraitCrossDraft } from '@dvt/postgres-projection';
import {
  applyDvtSubstraitUnionAllGroupedRowNumber,
  applyDvtSubstraitUnionAllGrouping,
  createDvtSubstraitSetDraft,
  type DvtSubstraitUnionAllSource,
} from './canvasDvtSubstraitSetComposition';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  inspectCanvasDvtSubstraitSortFetch,
  selectCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

function source(table: string): DvtSubstraitJoinSource {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse',
      provider: 'postgres',
    },
    sourceObjectId: `public.${table}`,
  };
  return { nodeId: table, schema: 'public', table, sourceRef };
}

function crossInput(table: string): CanvasDvtCompositionInput {
  const base = source(table);
  return {
    ...base,
    fields: [{ name: 'id', dataType: 'string', joinDataType: 'string' as const, nullable: true }],
  };
}

function fixture(valueType?: DvtSubstraitJoinDataType): {
  draft: DvtSubstraitJoinDraft;
  projection: DvtSubstraitNInputJoinProjection;
} {
  const binary = createDvtSubstraitJoinDraft({
    left: source('customers'),
    right: source('orders'),
    targetNodeId: 'model',
  });
  const inspection = inspectDvtSubstraitJoinDraft(binary);
  if (!inspection.ok) throw new Error('Invalid fixture');
  const draft = appendDvtSubstraitJoinInput(binary, {
    source: source('tickets'),
    fields: valueType == null ? ['customer_id'] : ['customer_id', 'value'],
    fieldTypes: valueType == null ? ['string'] : ['string', valueType],
    predicate: {
      leftSourceFieldId: inspection.projection.inputs[0]!.fields[0]!.fieldId,
      rightFieldName: 'customer_id',
    },
    selectedFields: valueType == null ? ['customer_id'] : ['customer_id', 'value'],
  });
  const result = inspectDvtSubstraitJoinDraft(draft);
  if (!result.ok) throw new Error('Invalid fixture');
  return { draft, projection: result.projection };
}

describe('Contextual relational card removal', () => {
  it('keeps UNION DISTINCT metadata when removing its outer window wrapper', () => {
    const setInput = (table: string): DvtSubstraitUnionAllSource => ({
      ...source(table),
      fields: [{ name: 'id', type: 'string' as const }],
    });
    const distinct = createDvtSubstraitSetDraft({
      targetNodeId: 'model',
      operation: 'union_distinct',
      inputs: [setInput('customers'), setInput('orders')],
    });
    const resultBinding = distinct.sidecar.relations.at(-1)!;
    const groupField = distinct.sidecar.fields.find(
      (field) => field.relationId === resultBinding.relationId
    )!;
    const grouped = applyDvtSubstraitUnionAllGrouping(distinct, {
      groupFieldId: groupField.fieldId,
      countOutputName: 'total',
    });
    const windowed = applyDvtSubstraitUnionAllGroupedRowNumber(grouped, {
      outputName: 'rank',
    });
    const result = removeCanvasRelationalTreeNode({
      draft: windowed,
      relationId: windowed.sidecar.relations.at(-1)!.relationId,
      targetNodeId: 'model',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation).toBe('union_distinct');
  });

  it('removes a CROSS source while preserving the surviving product and source identities', () => {
    const draft = createDvtSubstraitCrossDraft({
      inputs: [crossInput('customers'), crossInput('orders'), crossInput('tickets')],
    });
    const before = inspectDvtSubstraitCrossDraft(draft);
    expect(before.ok).toBe(true);
    if (!before.ok) return;

    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId: before.projection.inputs[1]!.relationId,
      targetNodeId: 'model',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation).toBe('cross_join');
    const after = inspectDvtSubstraitCrossDraft(result.draft);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.projection.inputs.map((input) => input.table)).toEqual(['customers', 'tickets']);
    expect(after.projection.inputs.map((input) => input.relationId)).toEqual([
      before.projection.inputs[0]!.relationId,
      before.projection.inputs[2]!.relationId,
    ]);
  });

  it('retires a CROSS card with an explicit retained branch', () => {
    const draft = createDvtSubstraitCrossDraft({
      inputs: [crossInput('customers'), crossInput('orders'), crossInput('tickets')],
    });
    const before = inspectDvtSubstraitCrossDraft(draft);
    expect(before.ok).toBe(true);
    if (!before.ok) return;

    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId: before.projection.crossRelations[1]!.relationId,
      keep: 'left',
      targetNodeId: 'model',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = inspectDvtSubstraitCrossDraft(result.draft);
    expect(after.ok && after.projection.inputs.map((input) => input.table)).toEqual([
      'customers',
      'orders',
    ]);
  });

  it.each(['right', 'aggregate'] as const)(
    'proposes explicit dependent retirement for %s without altering the original',
    (target) => {
      const { draft, projection } = fixture();
      const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
        groupFieldId: projection.outputs[0]!.fieldId,
        countOutputName: 'total',
      });
      const wrapped = applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, { outputName: 'rn' });
      const snapshot = JSON.stringify(wrapped);
      const result = removeCanvasRelationalTreeNode({
        draft: wrapped,
        relationId:
          target === 'right'
            ? projection.joinRelations[1]!.relationId
            : grouped.sidecar.relations.at(-1)!.relationId,
        keep: target === 'right' ? 'right' : undefined,
        targetNodeId: 'model',
      });
      expect(result.ok).toBe(false);
      if (result.ok || result.reason !== 'dependent-operations')
        throw new Error('Expected explicit confirmation');
      expect(result.operations).toEqual(target === 'right' ? ['AGGREGATE', 'WINDOW'] : ['WINDOW']);
      expect(result.proposal.operation).toBe(target === 'right' ? 'projection' : 'inner_join');
      expect(JSON.stringify(wrapped)).toBe(snapshot);
    }
  );
  it('removes a source below AGGREGATE and WINDOW without replacing surviving identities', () => {
    const { draft, projection } = fixture();
    const grouped = applyDvtSubstraitInnerJoinGrouping(draft, {
      groupFieldId: projection.outputs.at(-1)!.fieldId,
      countOutputName: 'total',
    });
    const wrapped = applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, { outputName: 'rn' });
    const before = inspectDvtSubstraitInnerJoinGroupedWindowDraft(wrapped);
    expect(before.ok).toBe(true);
    const result = removeCanvasRelationalTreeNode({
      draft: wrapped,
      relationId: projection.inputs[1]!.relationId,
      targetNodeId: 'model',
    });
    expect(result.ok).toBe(true);
    if (!result.ok || !before.ok) return;
    const after = inspectDvtSubstraitInnerJoinGroupedWindowDraft(result.draft);
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.projection.outputs).toEqual(before.projection.outputs);
    expect(
      inspectDvtSubstraitJoinPredicateContext(result.draft)?.inspection.projection.inputs.map(
        (input) => input.table
      )
    ).toEqual(['customers', 'tickets']);
    const baseIds = new Set(draft.sidecar.relations.map((rel) => rel.relationId));
    expect(
      result.draft.sidecar.relations
        .filter((rel) => !baseIds.has(rel.relationId))
        .map((rel) => rel.relationId)
    ).toEqual(
      wrapped.sidecar.relations
        .filter((rel) => !baseIds.has(rel.relationId))
        .map((rel) => rel.relationId)
    );
  });
  it('removes an input and its JOIN while preserving surviving semantics and stable identities', () => {
    const { draft, projection } = fixture();
    const snapshot = JSON.stringify(draft);
    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId: projection.inputs[1]!.relationId,
      targetNodeId: 'model',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = inspectDvtSubstraitJoinDraft(result.draft);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.projection.inputs.map((input) => input.table)).toEqual(['customers', 'tickets']);
    expect(next.projection.inputs[0]).toEqual(projection.inputs[0]);
    expect(next.projection.joinRelations[0]?.relationId).toBe(
      projection.joinRelations[1]?.relationId
    );
    expect(next.projection.joins[0]).toEqual(projection.joins[1]);
    expect(next.projection.outputs.map((field) => field.fieldId)).toEqual(
      projection.outputs
        .filter((field) => field.source.inputIndex !== 1)
        .map((field) => field.fieldId)
    );
    expect(JSON.stringify(draft)).toBe(snapshot);
  });

  it('retires a JOIN keeping L explicitly, without dropping upstream conditions', () => {
    const { draft, projection } = fixture();
    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId: projection.joinRelations[1]!.relationId,
      keep: 'left',
      targetNodeId: 'model',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = inspectDvtSubstraitJoinDraft(result.draft);
    expect(next.ok && next.projection.joins).toEqual([projection.joins[0]]);
    expect(next.ok && next.projection.joinRelations[0]?.relationId).toBe(
      projection.joinRelations[0]?.relationId
    );
  });

  it('keeps R as a canonical projection with stable source and output identities', () => {
    const { draft, projection } = fixture();
    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId: projection.joinRelations[1]!.relationId,
      keep: 'right',
      targetNodeId: 'model',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation).toBe('projection');
    expect(inspectDvtSubstraitProjectionDraft(result.draft).ok).toBe(true);
    expect(
      result.draft.sidecar.relations.some(
        (rel) => rel.relationId === projection.inputs[2]!.relationId
      )
    ).toBe(true);
    expect(result.draft.sidecar.fields.map((field) => field.fieldId)).toContain(
      projection.inputs[2]!.fields[0]!.fieldId
    );
    expect(result.draft.sidecar.fields.map((field) => field.fieldId)).toContain(
      projection.outputs.at(-1)!.fieldId
    );
  });

  it('rejects removing fields required by downstream predicates without mutating the draft', () => {
    const { draft, projection } = fixture();
    const snapshot = JSON.stringify(draft);
    expect(
      removeCanvasRelationalTreeNode({
        draft,
        relationId: projection.inputs[0]!.relationId,
        targetNodeId: 'model',
      })
    ).toEqual({ ok: false, reason: 'dependent-condition' });
    expect(JSON.stringify(draft)).toBe(snapshot);
  });

  it.each(['bool', 'fp64', 'precisionTimestampTz'] as const)(
    'rejects a single-source projection that would erase its %s type',
    (valueType) => {
      const { draft, projection } = fixture(valueType);
      const snapshot = JSON.stringify(draft);
      expect(
        removeCanvasRelationalTreeNode({
          draft,
          relationId: projection.joinRelations[1]!.relationId,
          keep: 'right',
          targetNodeId: 'model',
        })
      ).toEqual({ ok: false, reason: 'unsupported-projection-type' });
      expect(JSON.stringify(draft)).toBe(snapshot);
    }
  );

  it('preserves an admitted i64 field when the retained branch becomes a projection', () => {
    const { draft, projection } = fixture('i64');
    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId: projection.joinRelations[1]!.relationId,
      keep: 'right',
      targetNodeId: 'model',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const next = inspectDvtSubstraitProjectionDraft(result.draft);
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.projection.source.fields.find((field) => field.name === 'value')?.dataType).toBe(
      'bigint'
    );
  });

  it('removes a source below ORDER BY and LIMIT while preserving valid wrappers', () => {
    const { draft, projection } = fixture();
    const sorted = applyDvtSubstraitSort(draft, [
      {
        fieldId: projection.outputs[0]!.fieldId,
        direction: SortField_SortDirection.ASC_NULLS_LAST,
      },
    ]);
    const sort = inspectCanvasDvtSubstraitSortFetch(sorted);
    if (!sort.ok) throw new Error('Expected SortRel.');
    const fetched = applyDvtSubstraitFetch(sorted, { count: 20n });

    const result = removeCanvasRelationalTreeNode({
      draft: fetched,
      relationId: projection.inputs[1]!.relationId,
      targetNodeId: 'model',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fetch = inspectCanvasDvtSubstraitSortFetch(result.draft);
    expect(fetch).toMatchObject({ ok: true, operation: 'fetch', count: 20n });
    const reopenedSort = selectCanvasDvtSubstraitSortFetch(result.draft, sort.relationId);
    expect(reopenedSort).not.toBeNull();
    expect(reopenedSort && inspectCanvasDvtSubstraitSortFetch(reopenedSort)).toMatchObject({
      ok: true,
      operation: 'sort',
      keys: [{ fieldId: projection.outputs[0]!.fieldId }],
    });
  });

  it('removes ORDER BY below LIMIT without reclassifying the underlying JOIN as a projection', () => {
    const { draft, projection } = fixture();
    const sorted = applyDvtSubstraitSort(draft, [
      {
        fieldId: projection.outputs[0]!.fieldId,
        direction: SortField_SortDirection.ASC_NULLS_LAST,
      },
    ]);
    const sort = inspectCanvasDvtSubstraitSortFetch(sorted);
    if (!sort.ok) throw new Error('Expected SortRel.');
    const fetched = applyDvtSubstraitFetch(sorted, { offset: 2n, count: 3n });

    const result = removeCanvasRelationalTreeNode({
      draft: fetched,
      relationId: sort.relationId,
      targetNodeId: 'model',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.operation).toBe('inner_join');
    expect(inspectCanvasDvtSubstraitSortFetch(result.draft)).toMatchObject({
      ok: true,
      operation: 'fetch',
      offset: 2n,
      count: 3n,
    });
  });

  it('rejects stale relation IDs and JOIN removal without a retained branch', () => {
    const { draft, projection } = fixture();
    expect(
      removeCanvasRelationalTreeNode({ draft, relationId: 'missing', targetNodeId: 'model' }).ok
    ).toBe(false);
    expect(
      removeCanvasRelationalTreeNode({
        draft,
        relationId: projection.joinRelations[0]!.relationId,
        targetNodeId: 'model',
      }).ok
    ).toBe(false);
  });
});
