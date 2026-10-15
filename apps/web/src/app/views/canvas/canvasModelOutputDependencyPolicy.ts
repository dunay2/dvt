/**
 * Owned concern: reject Model publication changes that invalidate a connected canonical consumer.
 * @baseline ADR-0064 / GH-3628: stable producer field identities own model dependencies.
 * @decision Admit candidate metadata before the draft aggregate changes, without rewriting consumers.
 * @consequence Alias/reorder and unused removal remain valid; required removal is atomic and explicit.
 * @version 1.0.0
 */
import { jcsCanonicalize } from '@dvt/crypto';
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { DvtSubstraitFieldBindingV1 } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { canonicalInputFieldsAreRequired } from './canvasCanonicalInputDependencyPolicy';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import type { CanvasInputBindingEdge } from './canvasInputBindings';

export type CanvasModelOutputDependencyRejection =
  | Readonly<{
      outcome: 'rejected';
      reason: 'model_output_required';
      consumer: Readonly<{ nodeId: string; name: string }>;
      fields: readonly Readonly<{ fieldId: string; name: string }>[];
    }>
  | Readonly<{ outcome: 'rejected'; reason: 'model_output_dependency_unavailable' }>;

function modelDocument(node: CanonicalNode): SubstraitDocument | null {
  const authority = readDvtTransformAuthoringAuthority(node);
  return authority == null ? null : decodeDvtSubstraitSemanticDocument(authority.semanticDocument);
}

function publishedFields(
  document: SubstraitDocument | null
): readonly DvtSubstraitFieldBindingV1[] {
  if (document == null) return [];
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  return indexed.index.relations.get(indexed.index.rootId)!.fields;
}

function requiredFields(
  document: SubstraitDocument,
  producerId: string,
  removed: readonly DvtSubstraitFieldBindingV1[]
): readonly DvtSubstraitFieldBindingV1[] {
  const reads = document.sidecar.relations.filter(
    (binding) => binding.producerRef?.nodeId === producerId
  );
  return removed.filter((field) => {
    const denied = new Set(
      reads.flatMap((read) =>
        read.producerRef!.fields.flatMap((mapping) =>
          mapping.producerFieldId === field.fieldId ? [mapping.fieldId] : []
        )
      )
    );
    return canonicalInputFieldsAreRequired(document, denied);
  });
}

export function modelOutputDependencyRejection(
  args: Readonly<{
    node: CanonicalNode;
    candidate: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanvasInputBindingEdge[];
  }>
): CanvasModelOutputDependencyRejection | null {
  if (args.node.pluginId !== 'dvt' || args.node.kind !== 'dvt:transform') return null;
  const targets = new Set(
    args.edges.filter((edge) => edge.sourceId === args.node.id).map((edge) => edge.targetId)
  );
  const consumers = args.nodes.filter(
    (node) => targets.has(node.id) && node.pluginId === 'dvt' && node.kind === 'dvt:transform'
  );
  if (consumers.length === 0) return null;
  try {
    const previous = readDvtTransformAuthoringAuthority(args.node);
    const candidate = readDvtTransformAuthoringAuthority(args.candidate);
    if (previous == null) return null;
    if (
      candidate != null &&
      jcsCanonicalize(previous.semanticDocument) === jcsCanonicalize(candidate.semanticDocument)
    )
      return null;
    const nextFields = new Map(
      publishedFields(modelDocument(args.candidate)).map((field) => [field.fieldId, field])
    );
    const removed = publishedFields(modelDocument(args.node)).filter((field) => {
      const next = nextFields.get(field.fieldId);
      return next == null || field.parentFieldId !== next.parentFieldId;
    });
    if (removed.length === 0) return null;
    for (const consumer of consumers) {
      const document = modelDocument(consumer);
      if (document == null) continue;
      const required = requiredFields(document, args.node.id, removed);
      if (required.length > 0)
        return {
          outcome: 'rejected',
          reason: 'model_output_required',
          consumer: { nodeId: consumer.id, name: consumer.name },
          fields: required.map((field) => ({
            fieldId: field.fieldId,
            name: field.displayName ?? field.fieldId,
          })),
        };
    }
    return null;
  } catch {
    return { outcome: 'rejected', reason: 'model_output_dependency_unavailable' };
  }
}
