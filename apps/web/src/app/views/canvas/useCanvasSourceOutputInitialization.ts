/** Coordinate asynchronous terminal Output initialization within one discardable graph snapshot. */
import { useEffect, useMemo, useState } from 'react';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { resolveCanvasStagedProducerDocument } from './canvasStagedOperationDocument';
import { resolveCanvasCompositionConnection } from './canvasCompositionConnection';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';
import { initializeCanvasSourceOutputs } from './canvasSourceOutputDefaults';

export function useCanvasSourceOutputInitialization(
  args: Readonly<{
    state: ReturnType<typeof useCanvasRelationalTreeDraftState>;
    editable: boolean;
    inputs: readonly CanvasDvtCompositionInput[];
    nodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
) {
  const { state, editable, inputs, nodeId, nodes, edges } = args;
  const snapshot = state.graphSnapshot;
  const document = useMemo(
    () =>
      resolveCanvasStagedProducerDocument({
        relationId: snapshot.outputRelationId,
        canonical: snapshot.joinDraft,
        operations: snapshot.stagedOperations,
        sources: snapshot.pendingSources,
      }),
    [snapshot]
  );
  const needed = useMemo(() => {
    if (!state.active || snapshot.outputRelationId == null) return false;
    const index = document == null ? null : indexSubstraitRelations(document);
    const reachable = new Set<string>([snapshot.outputRelationId]);
    if (index?.ok) for (const id of index.index.relations.keys()) reachable.add(id);
    else
      for (const id of reachable)
        for (const input of snapshot.stagedOperations.find((operation) => operation.id === id)
          ?.inputs ?? [])
          if (input != null) reachable.add(input);
    return snapshot.pendingSources.some(
      (source) =>
        source.initialOutputFieldIds != null && reachable.has(source.read.binding.relationId)
    );
  }, [state.active, snapshot, document]);
  const attempt = useMemo(
    () => ({ snapshot, editable, inputs, nodeId, nodes, edges }),
    [snapshot, editable, inputs, nodeId, nodes, edges]
  );
  const [failure, setFailure] = useState<typeof attempt | null>(null);
  const commit = state.commitOutputInitialization;
  useEffect(() => {
    if (!needed || !editable || document == null) return;
    const cancellation = new AbortController();
    const connection = resolveCanvasCompositionConnection([document], inputs);
    if (connection.state !== 'available') {
      setFailure(attempt);
      return;
    }
    const eligibility = resolveCanvasReadFieldEligibility({ document, nodeId, nodes, edges });
    void initializeCanvasSourceOutputs({
      document,
      sources: snapshot.pendingSources,
      connection: connection.connection,
      deniedInputs: eligibility.denied,
      disconnectedInputs: eligibility.disconnected,
      signal: cancellation.signal,
    })
      .then((result) => {
        if (!cancellation.signal.aborted) commit(snapshot, result.document, result.consumedIds);
      })
      .catch(() => {
        if (!cancellation.signal.aborted) setFailure(attempt);
      });
    return () => cancellation.abort();
  }, [needed, editable, document, snapshot, inputs, nodeId, nodes, edges, commit, attempt]);
  return {
    blocked: needed,
    pending: needed && failure !== attempt,
    failed: needed && failure === attempt,
  };
}
