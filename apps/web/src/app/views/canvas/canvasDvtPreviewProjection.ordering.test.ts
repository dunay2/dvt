/** Proves Preview admission follows canonical wrappers without mutating or disguising them. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { describe, expect, it } from 'vitest';

import documents from '../../../../../../packages/@dvt/postgres-projection/test/fixtures/inner-join-documents.json';
import type { CanonicalNode } from '../../types/canonical';
import { buildProtectedDvtPreviewProjection } from './canvasDvtPreviewProjection';
import {
  decodeDvtSubstraitSemanticDocument,
  encodeDvtSubstraitSemanticDocument,
  type DvtSubstraitSemanticDraft,
} from './canvasDvtSubstraitSemanticDocument';
import {
  applyDvtSubstraitFetch,
  applyDvtSubstraitSort,
  resolveDvtSubstraitSortFetchInputFields,
} from './canvasDvtSubstraitSortFetch';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';

function intent(
  draft: DvtSubstraitSemanticDraft
): Parameters<typeof buildProtectedDvtPreviewProjection>[0] {
  const sources: CanonicalNode[] = draft.sidecar.relations.flatMap((relation) =>
    relation.sourceRef == null
      ? []
      : [
          {
            id: relation.relationId,
            name: relation.displayName!,
            pluginId: 'dvt.warehouse-source',
            kind: 'dvt:source',
            role: 'input',
            status: 'idle',
            tags: [],
            metadata: {
              connectedSourceRef: relation.sourceRef,
              schema: 'raw',
              tableName: relation.displayName,
            },
          },
        ]
  );
  const model = applyDvtSubstraitSemanticDocument(
    {
      id: 'model',
      name: 'Ordered model',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
    },
    encodeDvtSubstraitSemanticDocument(draft)
  );
  return {
    canvasId: 'canvas',
    canonicalNodes: [...sources, model],
    canonicalEdges: sources.map((source) => ({
      id: source.id,
      sourceId: source.id,
      targetId: model.id,
      relation: 'lineage',
    })),
    workspaceNodeIds: [...sources.map((source) => source.id), model.id],
    selectionIntent: { mode: 'explicit', nodeIds: [model.id] },
  };
}

function orderedDraft(
  order: readonly ('sort' | 'fetch')[],
  direction: SortField_SortDirection
): DvtSubstraitSemanticDraft {
  let draft = decodeDvtSubstraitSemanticDocument(documents.two);
  for (const operation of order) {
    const fieldId = resolveDvtSubstraitSortFetchInputFields(draft)[0]!.fieldId;
    draft =
      operation === 'sort'
        ? applyDvtSubstraitSort(draft, [{ fieldId, direction }])
        : applyDvtSubstraitFetch(draft, { count: 2n, offset: 0n });
  }
  return draft;
}

describe('protected Preview ordering admission', () => {
  it.each([
    SortField_SortDirection.ASC_NULLS_FIRST,
    SortField_SortDirection.ASC_NULLS_LAST,
    SortField_SortDirection.DESC_NULLS_FIRST,
    SortField_SortDirection.DESC_NULLS_LAST,
  ])('admits direction %i in either wrapper order without changing the document', (direction) => {
    for (const order of [
      ['sort', 'fetch'],
      ['fetch', 'sort'],
    ] as const) {
      const args = intent(orderedDraft(order, direction));
      const before = structuredClone(args);
      expect(buildProtectedDvtPreviewProjection(args)).toMatchObject({
        ok: true,
        selection: { mode: 'upstream', nodeIds: ['model'] },
        scopedNodeIds: [...args.workspaceNodeIds].sort(),
      });
      expect(args).toEqual(before);
      expect(
        buildProtectedDvtPreviewProjection({
          ...args,
          canonicalEdges: args.canonicalEdges.slice(1),
        }).ok
      ).toBe(false);
    }
  });

  it.each([SortField_SortDirection.UNSPECIFIED, SortField_SortDirection.CLUSTERED])(
    'rejects unsupported Sort selector %i without dropping it',
    (direction) => {
      const draft = orderedDraft(['sort'], SortField_SortDirection.ASC_NULLS_LAST);
      const root = draft.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'sort')
        throw new Error('Expected Sort');
      root.value.input.relType.value.sorts[0]!.sortKind = { case: 'direction', value: direction };
      const args = intent(draft);
      const before = structuredClone(args);
      expect(buildProtectedDvtPreviewProjection(args).ok).toBe(false);
      expect(args).toEqual(before);
    }
  );
});
