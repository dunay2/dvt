import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  createDvtSubstraitSortDraft,
  createDvtSubstraitFetchDraft,
  removeDvtSubstraitSortFetchRelation,
} from '@dvt/postgres-projection';
import { selectDvtSubstraitRelation } from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';
import {
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinDraft,
  applyDvtSubstraitInnerJoinGrouping,
  applyDvtSubstraitInnerJoinGroupedRowNumber,
} from './canvasDvtSubstraitJoinComposition';
import { sourceRef } from './CanvasRelationalTreeWorkbench.test-support';
import type { DvtSubstraitJoinSource } from './canvasDvtSubstraitJoinComposition';
import {
  encodeDvtSubstraitSemanticDocument,
  decodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';

describe('selected wrappers preserve LEFT JOIN identity', () => {
  it.each(['aggregate', 'window'] as const)(
    'preserves Substrait through %s, selection, removal and serialization',
    (wrapper) => {
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
      const root = wrapped.plan.relations[0]?.relType;
      const outer = root?.case === 'root' ? root.value.input?.relType : undefined;
      const aggregate = outer?.case === 'project' ? outer.value.input?.relType : outer;
      if (aggregate?.case !== 'aggregate') throw new Error('Expected canonical AggregateRel');
      const canonicalJoin = aggregate.value.input?.relType;
      expect(canonicalJoin?.case).toBe('join');
      if (canonicalJoin?.case !== 'join') throw new Error('Expected canonical JoinRel');
      expect(canonicalJoin.value.type).toBe(JoinRel_JoinType.LEFT);
      const before = encodeDvtSubstraitSemanticDocument(fetched);
      for (const id of [relation.relationId, 'sort', 'fetch']) {
        let selected = selectDvtSubstraitRelation(fetched, id);
        if (id === 'fetch') selected = removeDvtSubstraitSortFetchRelation(selected, 'fetch');
        if (id !== relation.relationId)
          selected = removeDvtSubstraitSortFetchRelation(selected, 'sort');
        expect(selected.plan).toEqual(wrapped.plan);
        expect(selected.sidecar.relations).toEqual(wrapped.sidecar.relations);
        expect(selected.sidecar.fields).toEqual(wrapped.sidecar.fields);
        const reopened = decodeDvtSubstraitSemanticDocument(
          encodeDvtSubstraitSemanticDocument(selected)
        );
        expect(reopened.plan).toEqual(wrapped.plan);
        expect(reopened.sidecar.fields).toEqual(wrapped.sidecar.fields);
      }
      expect(encodeDvtSubstraitSemanticDocument(fetched)).toEqual(before);
    }
  );
});
