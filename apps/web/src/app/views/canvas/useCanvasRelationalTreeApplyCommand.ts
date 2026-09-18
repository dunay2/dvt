/** Owned concern: commit one complete relational-tree authoring draft through the canonical command. */
import { useCallback } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  createCanvasRelationalTreeNodeDraft,
  createCanvasRelationalTreeUnionAllDraft,
} from './canvasRelationalTreeAuthoringModel';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';

export function useCanvasRelationalTreeApplyCommand(args: {
  authoring?: CanvasRelationalTreeAuthoringContract;
  editable: boolean;
  edges: readonly CanonicalEdge[];
  joinDraft: DvtSubstraitInnerJoinDraft | null;
  inputs: readonly CanvasDvtCompositionInput[];
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
    inputs,
    nodes,
    operation,
    reset,
    selectedInputIds,
    transformNode,
  } = args;
  return useCallback(() => {
    if (
      !editable ||
      operation == null ||
      (operation === 'projection' && selectedInputIds.length !== 1)
    )
      return;
    const semantic =
      operation === 'projection' && joinDraft == null
        ? (() => {
            const input = inputs.find((candidate) => candidate.nodeId === selectedInputIds[0]);
            return input == null
              ? null
              : createCanvasRelationalTreeProjectionDraft({
                  input,
                  targetNodeId: transformNode.id,
                });
          })()
        : joinDraft != null || operation === 'inner_join' || operation === 'projection'
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
    inputs,
    nodes,
    operation,
    reset,
    selectedInputIds,
    transformNode,
  ]);
}
