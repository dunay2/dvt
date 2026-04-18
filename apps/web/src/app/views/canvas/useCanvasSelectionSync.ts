import { useEffect } from 'react';

import { areNodeIdsEqual, type CanvasUiScope } from './canvasDraftScope';

type UseCanvasSelectionSyncArgs = {
  isBootstrapping: boolean;
  storeSelection: string[];
  storeInspectorNodeId: string | null;
  uiScope: CanvasUiScope;
  setSelectedNodes: (nodeIds: string[]) => void;
  setInspectorNode: (nodeId: string | null) => void;
};

export function useCanvasSelectionSync({
  isBootstrapping,
  storeSelection,
  storeInspectorNodeId,
  uiScope,
  setSelectedNodes,
  setInspectorNode,
}: UseCanvasSelectionSyncArgs) {
  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    if (!areNodeIdsEqual(storeSelection, uiScope.selectedNodeIds)) {
      setSelectedNodes(uiScope.selectedNodeIds);
    }
    if (storeInspectorNodeId !== uiScope.inspectorNodeId) {
      setInspectorNode(uiScope.inspectorNodeId);
    }
  }, [
    isBootstrapping,
    setInspectorNode,
    setSelectedNodes,
    storeInspectorNodeId,
    storeSelection,
    uiScope.inspectorNodeId,
    uiScope.selectedNodeIds,
  ]);
}
