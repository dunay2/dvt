/**
 * Owned concern: Retain the dependency closure of one discardable relational editing graph.
 * Reason to change: Private graph lifecycle and reference-retention invariants change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Keep only working definitions reached by pending Reads or semantic producers.
 * @consequence Removing a pending Read cannot later publish an orphan working definition.
 * @version 1.0.0
 */
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasModelCompositionCopy } from './canvasModelCompositionCandidate';
import type { prepareCanvasSourceOccurrenceInputRecovery } from './canvasSourceOccurrenceInputRecovery';

export type GraphSnapshot = Readonly<{
  modelCopies: readonly CanvasModelCompositionCopy[];
  joinDraft: SubstraitDocument | null;
  pendingSources: readonly PendingSourceOccurrence[];
  stagedOperations: readonly CanvasStagedOperation[];
  outputRelationId: string | null;
  inputRecovery:
    | (Awaited<ReturnType<typeof prepareCanvasSourceOccurrenceInputRecovery>> & {
        authorityIdentity: string;
      })
    | null;
}>;
export const emptyGraph: GraphSnapshot = {
  modelCopies: [],
  joinDraft: null,
  pendingSources: [],
  stagedOperations: [],
  outputRelationId: null,
  inputRecovery: null,
};

/** Deleting a pending Read must not later publish an unused working definition. */
export function retainReferencedModelCopies(graph: GraphSnapshot): GraphSnapshot {
  const needed = new Set(graph.pendingSources.map((source) => source.sourceNodeId));
  const documents = [
    graph.joinDraft,
    ...graph.stagedOperations.flatMap((operation) => [
      operation.semanticDocument,
      operation.configurationDocument,
    ]),
  ];
  for (const document of documents)
    for (const relation of document?.sidecar.relations ?? [])
      if (relation.producerRef != null) needed.add(relation.producerRef.nodeId);
  for (let previous = -1; previous !== needed.size;) {
    previous = needed.size;
    for (const addition of graph.modelCopies)
      if (needed.has(addition.copy.node.id))
        for (const edge of addition.copy.edges) needed.add(edge.sourceId);
  }
  const modelCopies = graph.modelCopies.filter((addition) => needed.has(addition.copy.node.id));
  return modelCopies.length === graph.modelCopies.length ? graph : { ...graph, modelCopies };
}
