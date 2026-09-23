import {
  JoinRel_JoinType,
  SortField_SortDirection,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';
import {
  createDvtSubstraitJoinDraft,
  inspectDvtSubstraitJoinPredicateContext,
  inspectDvtSubstraitJoinDraft,
  setDvtSubstraitJoinType,
} from './canvasDvtSubstraitJoinComposition';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  peelCanvasDvtSubstraitSortFetch,
} from './canvasDvtSubstraitSortFetch';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
} from './canvasDvtSubstraitSemanticDocument';
import { sourceRef, transformNode } from './CanvasRelationalTreeWorkbench.test-support';
import { applyCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { projectSemanticWorkbenchGraph } from './semanticWorkbenchProjection';

describe('editing a JOIN beneath canonical Sort/Fetch', () => {
  it.each(['sort', 'fetch', 'sort-fetch'] as const)(
    'preserves %s and stable identities when editing the JOIN',
    (wrappers) => {
      let draft = createDvtSubstraitJoinDraft({
        left: { nodeId: 'a', schema: 'public', table: 'a', sourceRef: sourceRef('a') },
        right: { nodeId: 'b', schema: 'public', table: 'b', sourceRef: sourceRef('b') },
        targetNodeId: 'model',
      });
      const base = inspectDvtSubstraitJoinPredicateContext(draft)!;
      const relationId = base.inspection.projection.joinRelations[0]!.relationId;
      if (wrappers.includes('sort'))
        draft = applyDvtSubstraitSort(draft, [
          {
            fieldId: base.inspection.projection.outputs[0]!.fieldId,
            direction: SortField_SortDirection.ASC_NULLS_LAST,
          },
        ]);
      if (wrappers.includes('fetch'))
        draft = applyDvtSubstraitFetch(draft, { count: 100n, offset: 7n });
      const before = encodeDvtSubstraitSemanticDocument(draft);
      const node = transformNode();
      const graph = projectSemanticWorkbenchGraph(
        applyCanvasInspectorNodeDraft(
          node,
          createCanvasRelationalTreeNodeDraft(node, 'inner_join', draft)
        ),
        { view: 'relation-expressions', expressionRelationId: relationId }
      );
      expect(graph.relationId).toBe(relationId);
      expect(graph.nodes.map(({ data }) => data.label)).toEqual(
        expect.arrayContaining([
          'EQUAL\n=',
          'FIELD\npublic.a.customer_id',
          'FIELD\npublic.b.customer_id',
        ])
      );
      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(2);
      expect(
        inspectDvtSubstraitJoinPredicateContext(draft)?.inspection.projection.joinRelations[0]
          ?.relationId
      ).toBe(relationId);
      const edited = setDvtSubstraitJoinType({
        draft,
        joinRelationId: relationId,
        joinType: JoinRel_JoinType.LEFT,
      });
      expect(edited).not.toBe(draft);
      expect(
        inspectDvtSubstraitJoinDraft(peelCanvasDvtSubstraitSortFetch(edited).base)
      ).toMatchObject({ ok: true });
      const reopened = decodeDvtSubstraitSemanticDocument(
        encodeDvtSubstraitSemanticDocument(edited)
      );
      expect(
        inspectDvtSubstraitJoinPredicateContext(reopened)?.inspection.projection.joinRelations[0]
          ?.joinType
      ).toBe(JoinRel_JoinType.LEFT);
      expect(reopened.sidecar.relations.map(({ relationId }) => relationId)).toEqual(
        draft.sidecar.relations.map(({ relationId }) => relationId)
      );
      expect(reopened.sidecar.fields.map(({ fieldId }) => fieldId)).toEqual(
        draft.sidecar.fields.map(({ fieldId }) => fieldId)
      );
      const [originalWrappers, reopenedWrappers] = [draft, reopened].map((value) =>
        peelCanvasDvtSubstraitSortFetch(value).wrappers.map((wrapper) => ({
          relationId: wrapper.relationId,
          operation: wrapper.operation,
          specification:
            wrapper.operation === 'sort' ? wrapper.keys : [wrapper.count, wrapper.offset],
        }))
      );
      expect(reopenedWrappers).toEqual(originalWrappers);
      expect(encodeDvtSubstraitSemanticDocument(draft)).toEqual(before);
    }
  );
});
