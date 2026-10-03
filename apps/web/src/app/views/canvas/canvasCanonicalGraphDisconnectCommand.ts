/** Admit canonical edge disconnection and publish its incomplete draft atomically. */
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { disconnectCanvasCanonicalGraph } from './canvasCanonicalGraphDisconnect';

export function createCanvasCanonicalGraphDisconnectCommand(
  args: Readonly<{
    editable: boolean;
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    start: () => boolean;
    sourceNodeIds: readonly string[];
    state: Pick<
      ReturnType<typeof useCanvasRelationalTreeDraftState>,
      | 'setJoinDraft'
      | 'setOperation'
      | 'setPendingSources'
      | 'setStagedOperations'
      | 'setSelectedStagedOperationId'
    >;
  }>
): (consumerId: string, port: number) => void {
  return (consumerId, port) => {
    const { analysis } = args;
    if (
      !args.editable ||
      analysis?.document == null ||
      analysis.error != null ||
      !analysis.session.hasDocument(analysis.document) ||
      analysis.revision !== analysis.session.revision
    )
      return;
    const detached = disconnectCanvasCanonicalGraph(
      args.analysis.document,
      consumerId,
      port,
      args.sourceNodeIds
    );
    if (detached == null || !args.start()) return;
    args.state.setJoinDraft(null);
    args.state.setOperation(null);
    args.state.setPendingSources((current) => [...current, ...detached.sources]);
    args.state.setStagedOperations((current) => [...current, ...detached.operations]);
    args.state.setSelectedStagedOperationId(consumerId);
  };
}
