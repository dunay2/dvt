/** Explicit presentation data and actions; the view does not depend on the hook's return type. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import type { CanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import type { CanvasStagedAnalysisBinding } from './CanvasStagedAnalysisProvider';
import { resolveCanvasReadFieldEligibility } from './canvasInputFieldEligibility';

export type CanvasRelationalTreeAuthoringDto = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  analysisBinding: CanvasStagedAnalysisBinding;
  draft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  selectedInputIds: readonly string[];
  selectedRelationId: string | null;
  pendingSources: readonly PendingSourceOccurrence[];
  selectedPendingId: string | null;
  stagedOperations: readonly CanvasStagedOperation[];
  selectedStagedOperationId: string | null;
  outputRelationId: string | null;
}>;

export type CanvasRelationalTreeAuthoringActions = Readonly<{
  changeDraft: (document: SubstraitDocument) => void;
  selectRelation: (id: string | null) => void;
  reconcileSelection: (id: string | null) => void;
  remove: (id: string) => void;
  dropSource: (id: string) => string | null;
  selectPending: (id: string) => void;
  renamePending: (id: string, alias: string) => boolean;
  setPendingOutputIncluded: (id: string, fieldId: string, included: boolean) => boolean;
  stageOperation: CanvasStagedOperationActions['stage'];
  selectStagedOperation: CanvasStagedOperationActions['select'];
  clearStagedOperationSelection: CanvasStagedOperationActions['clearSelection'];
  connectStagedOperation: CanvasStagedOperationActions['connect'];
  disconnectStagedOperation: CanvasStagedOperationActions['disconnect'];
  disconnectRelation: (id: string, port: number) => void;
  connectOutput: (relationId: string) => void;
  disconnectOutput: () => void;
  updateStagedOperation: CanvasStagedOperationActions['updateConfiguration'];
}>;

export function projectCanvasRelationalTreeAuthoringView(
  context: Readonly<{
    model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    pendingCondition: boolean;
  }>,
  selectRelation: CanvasRelationalTreeAuthoringActions['selectRelation']
): Readonly<{
  data: CanvasRelationalTreeAuthoringDto;
  actions: CanvasRelationalTreeAuthoringActions;
}> {
  const { model, transformNode, nodes, edges } = context;
  const { session } = model;
  const select = context.pendingCondition ? selectRelation : model.selectRelation;
  return {
    data: {
      transformNode,
      nodes,
      edges,
      inputs: model.inputs,
      analysisBinding: {
        inputs: model.inputs,
        readFieldEligibility: (document) =>
          resolveCanvasReadFieldEligibility({
            document,
            nodeId: transformNode.id,
            nodes,
            edges,
          }),
      },
      draft: session.joinDraft,
      operation: session.operation,
      selectedInputIds: session.selectedInputIds,
      selectedRelationId: model.selectedRelationId,
      pendingSources: session.occurrences.pending,
      selectedPendingId: session.occurrences.selectedId,
      stagedOperations: session.staged.operations,
      selectedStagedOperationId: session.staged.selectedId,
      outputRelationId: session.output.relationId ?? null,
    },
    actions: {
      changeDraft: session.setJoinDraft,
      selectRelation: select,
      reconcileSelection: model.selectRelation,
      remove: session.removal.remove,
      dropSource: session.occurrences.drop,
      selectPending: select,
      renamePending: session.occurrences.rename,
      setPendingOutputIncluded: session.occurrences.setOutputIncluded,
      stageOperation: session.staged.stage,
      selectStagedOperation: session.staged.select,
      clearStagedOperationSelection: session.staged.clearSelection,
      connectStagedOperation: session.staged.connect,
      disconnectStagedOperation: session.staged.disconnect,
      disconnectRelation: session.disconnectRelation,
      connectOutput: session.output.connect,
      disconnectOutput: session.output.disconnect,
      updateStagedOperation: session.staged.updateConfiguration,
    },
  };
}
