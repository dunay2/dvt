/** Upgrade exact legacy producer snapshots once at the persisted-draft boundary. */
import {
  canonicalizeDvtSubstraitSemanticDocumentV1,
  decodeDvtSubstraitPlanV1,
  encodeDvtSubstraitPlanV1,
  DvtTransformAuthoringAuthorityV1Schema,
} from '@dvt/contracts';
import { migrateEmbeddedProducerInput, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalNode } from '../../types/canonical';

export function migrateWorkspaceProducerInputs(
  nodes: CanonicalNode[],
  edges: readonly { sourceId: string; targetId: string }[]
): CanonicalNode[] {
  const originals = new Map(
    nodes.flatMap((node) => {
      const authority = DvtTransformAuthoringAuthorityV1Schema.safeParse(
        node.metadata?.transformAuthoring
      );
      if (!authority.success || node.kind !== 'dvt:transform' || node.pluginId !== 'dvt') return [];
      const document = {
        plan: decodeDvtSubstraitPlanV1(authority.data.semanticDocument),
        sidecar: authority.data.semanticDocument.sidecar,
      };
      return [[node.id, { node, authority: authority.data, document }] as const];
    })
  );
  return nodes.map((node) => {
    const original = originals.get(node.id);
    if (original == null) return node;
    let document: SubstraitDocument = original.document;
    for (const edge of edges) {
      const producer = originals.get(edge.sourceId);
      if (edge.targetId === node.id && producer != null)
        document = migrateEmbeddedProducerInput(document, {
          nodeId: producer.node.id,
          name: producer.node.name,
          document: producer.document,
        });
    }
    if (document === original.document) return node;
    const semanticDocument = canonicalizeDvtSubstraitSemanticDocumentV1({
      ...original.authority.semanticDocument,
      semanticPlan: encodeDvtSubstraitPlanV1(document.plan),
      sidecar: document.sidecar,
    });
    return {
      ...node,
      metadata: {
        ...node.metadata,
        transformAuthoring: { ...original.authority, semanticDocument },
      },
    };
  });
}
