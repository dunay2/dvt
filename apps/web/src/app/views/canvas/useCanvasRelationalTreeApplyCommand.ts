/** Owned concern: commit one complete relational-tree authoring draft through the canonical command. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { createCanvasRelationalTreeNodeDraft } from './canvasRelationalTreeAuthoringModel';
import { createCanvasRelationalTreeSetDraft } from './canvasRelationalTreeUnionAuthoring';
import { createCanvasRelationalTreeProjectionDraft } from './canvasRelationalTreeProjectionAuthoring';
import type {
  CanvasRelationalTreeApplyResult,
  CanvasRelationalTreeAuthoringContract,
  RelationalApplyRejection,
} from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';

export function useCanvasRelationalTreeApplyCommand(args: {
  authoring?: CanvasRelationalTreeAuthoringContract;
  editable: boolean;
  edges: readonly CanonicalEdge[];
  joinDraft: DvtSubstraitJoinDraft | null;
  inputs: readonly CanvasDvtCompositionInput[];
  nodes: readonly CanonicalNode[];
  operation: CanvasRelationalOperation | null;
  reject: (rejection: RelationalApplyRejection) => void;
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
    reject,
    reset,
    selectedInputIds,
    transformNode,
  } = args;
  return (): CanvasRelationalTreeApplyResult => {
    if (
      !editable ||
      operation == null ||
      (operation === 'projection' && selectedInputIds.length !== 1)
    ) {
      const rejection = { outcome: 'rejected', reason: 'command_unavailable' } as const;
      reject(rejection);
      return rejection;
    }
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
        : joinDraft != null || isCanvasJoinOperation(operation) || operation === 'projection'
          ? joinDraft
          : isCanvasSetOperation(operation)
            ? createCanvasRelationalTreeSetDraft(
                { edges, nodes, selectedInputIds, targetNodeId: transformNode.id },
                operation
              )
            : null;
    if (semantic == null || authoring == null) {
      const rejection = { outcome: 'rejected', reason: 'command_unavailable' } as const;
      reject(rejection);
      return rejection;
    }
    const result = authoring.onApplyNodeDraft(
      transformNode.id,
      createCanvasRelationalTreeNodeDraft(transformNode, operation, semantic)
    );
    if (result.outcome === 'rejected') reject(result);
    else reset();
    return result;
  };
}
