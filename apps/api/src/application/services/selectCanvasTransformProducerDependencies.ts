/**
 * Owned concern: select consumed producer identities after complete protected
 * Preview topology admission, using the existing semantic traversal.
 * Why: a topological predecessor alone must not trigger file authorization,
 * compilation or provenance for an expression that does not consume it.
 * Corner cases: selected subtrees, transitive native producers and external
 * targets retain their real dependencies without replacing original authority;
 * references outside the admitted scope or without direct edges fail closed.
 */
import {
  decodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
  readWorkspaceDbtModelReference,
} from '@dvt/contracts';
import {
  resolveProducerDocuments,
  selectDvtSubstraitRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import {
  selectProtectedDvtTransforms,
  type DvtTransformSelection,
} from './dvtProtectedTransformSelection.js';

export type CanvasTransformProducerDependencies = Readonly<{
  transformNodeIds: ReadonlySet<string>;
  externalNodeIds: ReadonlySet<string>;
  documents: ReadonlyMap<string, SubstraitDocument>;
}>;

export function selectCanvasTransformProducerDependencies(
  input: DvtTransformSelection,
  relationId?: string
): CanvasTransformProducerDependencies {
  const selection = selectProtectedDvtTransforms(input);
  const transforms = new Map(selection.transforms.map((node) => [node.id, node]));
  const externalIds = new Set<string>();
  const available = new Map<string, SubstraitDocument>();
  for (const node of selection.transforms) {
    if (readWorkspaceDbtModelReference(node) != null) {
      if (node.metadata?.transformAuthoring != null)
        throw new Error('A file-model reference cannot carry competing semantic authority.');
      externalIds.add(node.id);
      continue;
    }
    const { semanticDocument } = DvtTransformAuthoringAuthorityV1Schema.parse(
      node.metadata?.transformAuthoring
    );
    available.set(node.id, {
      plan: decodeDvtSubstraitPlanV1(semanticDocument),
      sidecar: semanticDocument.sidecar,
    });
  }
  const target = available.get(selection.transform.id);
  if (target != null && relationId != null)
    available.set(selection.transform.id, selectDvtSubstraitRelation(target, relationId));
  const documents = resolveProducerDocuments(selection.transform.id, available);
  const transformNodeIds = new Set([selection.transform.id, ...documents.keys()]);
  for (const [consumerId, document] of documents) {
    for (const binding of document.sidecar.relations) {
      const producerId = binding.producerRef?.nodeId;
      if (producerId == null) continue;
      if (
        !transforms.has(producerId) ||
        !selection.edges.some(
          (edge) => edge.sourceId === producerId && edge.targetId === consumerId
        )
      )
        throw new Error('Producer reference has no authorized direct dependency.');
      transformNodeIds.add(producerId);
    }
  }
  return {
    transformNodeIds,
    externalNodeIds: new Set([...transformNodeIds].filter((id) => externalIds.has(id))),
    documents,
  };
}
