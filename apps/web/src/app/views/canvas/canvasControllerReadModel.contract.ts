import type { Edge, EdgeChange, Node } from '@xyflow/react';
import type { RuntimeCapabilities } from '../../plugins/registry';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type {
  CanvasCardActions,
  CanvasColumnActions,
  CanvasCompositionActions,
} from './canvasNodeInteractionPresentation';
import type { CanvasColumnLineageEdgeData } from './canvasColumnLineageProjection';

export type CanvasControllerReadModelArgs = {
  graphModel: {
    nodes: Node[];
    edges: Edge[];
    canonicalNodesById: Map<string, CanonicalNode>;
    onEdgesChange: (changes: EdgeChange<Edge>[]) => void;
  };
  visibleScope: {
    canonicalNodes: CanonicalNode[];
    canonicalEdges: CanonicalEdge[];
  };
  executionScope: {
    selectedNodeIds: string[];
    workspaceNodeIds: string[];
  };
  uiScope: {
    selectedNodeIds: string[];
    inspectorNodeId: string | null;
  };
  overlayModel: {
    activeRunId: string | null;
    overlayDecorations: ReadonlyMap<string, unknown>;
    runStatusByNodeId: ReadonlyMap<string, string>;
  };
  cardActions: CanvasCardActions;
  columnActions: CanvasColumnActions;
  compositionActions: CanvasCompositionActions;
  activeColumnHandleId: string | null;
  onRemoveColumnMapping: (mapping: CanvasColumnLineageEdgeData) => void;
  onToggleExecutionSelection: (nodeId: string, shouldSelect: boolean) => void;
  runtimeCapabilities?: RuntimeCapabilities;
  canMutateGraph: boolean;
  canSelectExecution: boolean;
  columnLevelLineageEnabled: boolean;
};
