/** Owned concern: translate explicit inspect and execution-selection intents into local adapter-side effects. */

import { useCallback } from 'react';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { CanvasInspectorRequest } from '../../stores/canvasInspectorTarget';

import type { CanvasSelectionContracts } from './canvasGraphHandlerContracts';

type UseCanvasSelectionHandlersArgs = CanvasSelectionContracts;

type UseCanvasSelectionHandlersResult = {
  handleInspectNode: (request: CanvasInspectorRequest, preferredTabId?: string | null) => boolean;
  handleToggleNodeSelection: (nodeId: string, shouldSelect: boolean) => void;
};

export function useCanvasSelectionHandlers({
  state,
  effects,
}: UseCanvasSelectionHandlersArgs): UseCanvasSelectionHandlersResult {
  const { selectedNodeIds, focusMode, inspectorPanelVisible } = state;
  const { setSelectedNodes, setInspectorNode, toggleInspectorPanel } = effects;

  const handleInspectNode = useCallback(
    (request: CanvasInspectorRequest, preferredTabId?: string | null) => {
      // An explicit Properties gesture starts a new request, even for the same node.
      if (setInspectorNode(request, preferredTabId ?? 'general') === false) return false;
      const layout = useUiLayoutStore.getState();
      if (focusMode && layout.focusMode) layout.toggleFocusMode();
      if (!inspectorPanelVisible) {
        toggleInspectorPanel();
      }
      return true;
    },
    [focusMode, inspectorPanelVisible, setInspectorNode, toggleInspectorPanel]
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
    handleToggleNodeSelection,
  };
}
