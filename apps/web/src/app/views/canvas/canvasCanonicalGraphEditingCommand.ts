/**
 * Owned concern: admit revision-bound canonical connections and publish the authoring graph.
 * @baseline GH-3271-COMPOSITION-CONCERNS: ConfigureCanvasDvtNode owns topology mutation.
 * @decision Check editability and revision before reusing the shared connection admission.
 * @consequence Rejected and unchanged connections never start or partially publish a draft.
 * @version 1.0.0
 */
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import {
  disconnectCanvasCanonicalGraph,
  projectCanvasCanonicalGraphEditing,
} from './canvasCanonicalGraphEditing';
import {
  admitCanvasStagedConnection,
  type CanvasStagedConnectionScope,
} from './canvasStagedConnectionAdmission';
import { connectCanvasStagedOperation, type CanvasStagedOperation } from './canvasStagedOperation';
import { invalidateCanvasOperationConsumers } from './canvasRetainedOperationConfiguration';

export function createCanvasCanonicalGraphEditingCommands(
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
) {
  const project = () => {
    const { analysis } = args;
    if (
      !args.editable ||
      analysis?.document == null ||
      analysis.error != null ||
      !analysis.session.hasDocument(analysis.document) ||
      analysis.revision !== analysis.session.revision
    )
      return null;
    return analysis.document;
  };
  const publish = (
    graph: NonNullable<ReturnType<typeof projectCanvasCanonicalGraphEditing>>,
    consumerId: string
  ) => {
    if (!args.start()) return;
    args.state.setJoinDraft(null);
    args.state.setOperation(null);
    args.state.setPendingSources((current) => [...current, ...graph.sources]);
    args.state.setStagedOperations((current) => [...current, ...graph.operations]);
    args.state.setSelectedStagedOperationId(consumerId);
  };
  return {
    disconnect: (consumerId: string, port: number) => {
      const document = project();
      if (document == null) return;
      const graph = disconnectCanvasCanonicalGraph(document, consumerId, port, args.sourceNodeIds);
      if (graph != null) publish(graph, consumerId);
    },
    connect: (
      consumerId: string,
      port: number,
      relationId: string,
      scope: CanvasStagedConnectionScope,
      pending: readonly CanvasStagedOperation[]
    ) => {
      const document = project();
      if (document == null) return;
      const graph = projectCanvasCanonicalGraphEditing(document, args.sourceNodeIds);
      if (graph == null) return;
      const target = admitCanvasStagedConnection(
        scope,
        [...graph.operations, ...pending],
        consumerId,
        port,
        relationId
      );
      if (target == null) return;
      const connected = connectCanvasStagedOperation(target, port, relationId);
      if (connected === target) return;
      const operations = graph.operations.map((operation) =>
        operation === target ? connected : operation
      );
      publish(
        {
          ...graph,
          operations: invalidateCanvasOperationConsumers(operations, new Set([consumerId])),
        },
        consumerId
      );
    },
  };
}
