/** Enforce column publication at the existing producer graph boundary, before SQL or provider access. */
import { jcsCanonicalize } from '@dvt/crypto';

import { SubstraitAnalysisError } from './document.js';
import type { ProducerGraph, ResolvedProducer } from './producerGraph.js';
import { deriveSubstraitPublication } from './relationPublication.js';

export function requireProducerPublication(
  graph: ProducerGraph,
  nodeId: string,
  resolved: ResolvedProducer
): void {
  const denied = new Set<string>();
  for (const entry of resolved.index.relations.values()) {
    if (entry.relation.relType.case !== 'read') continue;
    const producer = entry.binding.producerRef;
    const edge = graph.edges.find(
      (candidate) =>
        candidate.targetId === nodeId &&
        (producer != null
          ? candidate.sourceId === producer.nodeId
          : entry.binding.sourceRef != null &&
            graph.sources.has(candidate.sourceId) &&
            jcsCanonicalize(graph.sources.get(candidate.sourceId)) ===
              jcsCanonicalize(entry.binding.sourceRef))
    );
    if (edge == null)
      throw new SubstraitAnalysisError('invalid_binding', 'Read publication is disconnected.');
    const published = producer == null ? graph.sourcePublications?.get(edge.sourceId) : undefined;
    const selected =
      edge.inputBindings == null
        ? null
        : new Set(edge.inputBindings.fields.map((field) => field.producerFieldId));
    if (selected == null && published == null) continue;
    for (const field of entry.fields) {
      const name =
        producer == null
          ? field.displayName
          : producer.fields.find((binding) => binding.fieldId === field.fieldId)?.producerFieldId;
      if (
        name == null ||
        (selected != null && !selected.has(name)) ||
        (published != null && !published.has(name))
      )
        denied.add(field.fieldId);
    }
  }
  if (denied.size === 0) return;
  const validity = deriveSubstraitPublication(resolved.document, denied);
  for (const [id, publication] of validity) {
    if (
      resolved.index.relations.get(id)!.relation.relType.case === 'read' &&
      id !== resolved.index.rootId
    )
      continue;
    if (publication.rowUnavailable || publication.unavailableFieldIds.length > 0)
      throw new SubstraitAnalysisError(
        'invalid_binding',
        'Operation references an unpublished input field.',
        id
      );
  }
}
