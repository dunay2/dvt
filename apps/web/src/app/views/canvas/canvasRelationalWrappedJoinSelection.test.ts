import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  createDvtSubstraitSortDraft,
  createDvtSubstraitFetchDraft,
  removeDvtSubstraitSortFetchRelation,
  selectDvtSubstraitRelation,
  projectDvtJoinDraftToPostgresSql,
} from '@dvt/postgres-projection';
import { describe, expect, it } from 'vitest';
import {
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinDraft,
  applyDvtSubstraitInnerJoinGrouping,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
} from './canvasDvtSubstraitJoinComposition';
import { sourceRef } from './CanvasRelationalTreeWorkbench.test-support';
import type { DvtSubstraitJoinSource } from './canvasDvtSubstraitJoinComposition';

describe('selected wrappers preserve LEFT JOIN identity', () => {
  it.each(['aggregate', 'window'] as const)(
    'projects selected Sort/Fetch over %s without changing LEFT to INNER',
    async (wrapper) => {
      const source = (table: string): DvtSubstraitJoinSource => ({
        nodeId: table,
        table,
        schema: 'public',
        sourceRef: sourceRef(table),
      });
      const join = createDvtSubstraitJoinDraft({
        left: source('orders'),
        right: source('customers'),
        targetNodeId: 'model',
        joinType: JoinRel_JoinType.LEFT,
      });
      const inspection = inspectDvtSubstraitJoinDraft(join);
      if (!inspection.ok) throw new Error('Expected JOIN');
      const grouped = applyDvtSubstraitInnerJoinGrouping(join, {
        groupFieldId: inspection.projection.outputs[0]!.fieldId,
        countOutputName: 'row_count',
      });
      const wrapped =
        wrapper === 'window'
          ? applyDvtSubstraitInnerJoinGroupedRowNumber(grouped, { outputName: 'rank' })
          : grouped;
      const relation = wrapped.sidecar.relations.reduce((a, b) =>
        a.relAnchor > b.relAnchor ? a : b
      );
      const fields = wrapped.sidecar.fields.filter(
        (field) => field.relationId === relation.relationId
      );
      const sorted = createDvtSubstraitSortDraft(wrapped, {
        relationId: 'sort',
        outputFieldIds: fields.map((_, i) => `sort:${i}`),
        keys: [{ fieldId: fields[0]!.fieldId, direction: SortField_SortDirection.ASC_NULLS_LAST }],
      });
      const fetched = createDvtSubstraitFetchDraft(sorted, {
        relationId: 'fetch',
        outputFieldIds: fields.map((_, i) => `fetch:${i}`),
        count: 20n,
        offset: 0n,
      });
      const expected = await projectDvtJoinDraftToPostgresSql(wrapped);
      expect(expected.sql).toContain('LEFT JOIN');
      for (const id of [relation.relationId, 'sort', 'fetch']) {
        let selected = selectDvtSubstraitRelation(fetched, id);
        if (id === 'fetch') selected = removeDvtSubstraitSortFetchRelation(selected, 'fetch');
        if (id !== relation.relationId)
          selected = removeDvtSubstraitSortFetchRelation(selected, 'sort');
        expect((await projectDvtJoinDraftToPostgresSql(selected)).sql).toBe(expected.sql);
      }
    }
  );
});
