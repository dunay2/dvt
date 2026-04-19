import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback } from 'react';

import type { UseCanvasGraphHandlersParams, UseCanvasGraphHandlersResult } from './useCanvasGraphHandlers.types';

type UseCanvasSelectionHandlersArgs = Pick<
  UseCanvasGraphHandlersParams,
  | 'canonicalNodesById'
  | 'selectedNodeIds'
  | 'focusMode'
  | 'inspectorPanelVisible'
  | 'setSelectedNodes'
  | 'setInspectorNode'
  | 'toggleInspectorPanel'
>;

type UseCanvasSelectionHandlersResult = Pick<
  UseCanvasGraphHandlersResult,
  'handleInspectNode' | 'handleNodeClick' | 'onSelectionChange' | 'handleToggleNodeSelection'
>;

export function useCanvasSelectionHandlers({
  canonicalNodesById,
  selectedNodeIds,
  focusMode,
  inspectorPanelVisible,
  setSelectedNodes,
  setInspectorNode,
  toggleInspectorPanel,
}: UseCanvasSelectionHandlersArgs): UseCanvasSelectionHandlersResult {
  const handleInspectNode = useCallback(
    (nodeId: string) => {
      setInspectorNode(nodeId);
      if (!focusMode && !inspectorPanelVisible) {
        toggleInspectorPanel();
      }
    },
    [focusMode, inspectorPanelVisible, setInspectorNode, toggleInspectorPanel]
  );

  const handleNodeClick = useCallback<NonNullable<ReactFlowProps<Node, Edge>['onNodeClick']>>(
    (_event, node) => {
      if (!canonicalNodesById.has(node.id)) {
        return;
      }

      if (inspectorPanelVisible && !focusMode) {
        setInspectorNode(node.id);
      }
    },
    [canonicalNodesById, focusMode, inspectorPanelVisible, setInspectorNode]
  );

  const onSelectionChange = useCallback<
    NonNullable<ReactFlowProps<Node, Edge>['onSelectionChange']>
  >(
    ({ nodes: nextSelectedNodes }) => {
      setSelectedNodes(nextSelectedNodes.map((node) => node.id));
    },
    [setSelectedNodes]
  );

  const handleToggleNodeSelection = useCallback(
    (nodeId: string, shouldSelect: boolean) => {
      if (shouldSelect) {
        if (selectedNodeIds.includes(nodeId)) {
          return;
        }

        setSelectedNodes([...selectedNodeIds, nodeId]);
        return;
      }

      setSelectedNodes(selectedNodeIds.filter((id) => id !== nodeId));
    },
    [selectedNodeIds, setSelectedNodes]
  );

  return {
    handleInspectNode,
    handleNodeClick,
    onSelectionChange,
    handleToggleNodeSelection,
  };
}
