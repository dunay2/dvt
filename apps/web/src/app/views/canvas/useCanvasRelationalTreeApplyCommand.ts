/** Owned concern: commit one complete relational-tree authoring draft through the canonical command. */
import { useCallback } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  createCanvasRelationalTreeNodeDraft,
  createCanvasRelationalTreeUnionAllDraft,
} from './canvasRelationalTreeAuthoringModel';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function useCanvasRelationalTreeApplyCommand(args: {
  authoring?: CanvasRelationalTreeAuthoringContract;
  editable: boolean;
  edges: readonly CanonicalEdge[];
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  nodes: readonly CanonicalNode[];
  operation: CanvasRelationalOperation | null;
  reset: () => void;
  selectedInputIds: readonly string[];
  transformNode: CanonicalNode;
}) {
  const {
    authoring,
    editable,
    edges,
    joinDraft,
    nodes,
    operation,
    reset,
    selectedInputIds,
    transformNode,
  } = args;
  return useCallback(() => {
    if (!editable || operation == null) return;
    const semantic =
      operation === 'inner_join'
        ? joinDraft
        : createCanvasRelationalTreeUnionAllDraft({
            edges,
            nodes,
            selectedInputIds,
            targetNodeId: transformNode.id,
          });
    if (semantic == null) return;
    authoring?.onApplyNodeDraft(
      transformNode.id,
      createCanvasRelationalTreeNodeDraft(transformNode, operation, semantic)
    );
    reset();
  }, [
    authoring,
    editable,
    edges,
    joinDraft,
    nodes,
    operation,
    reset,
    selectedInputIds,
    transformNode,
  ]);
}
