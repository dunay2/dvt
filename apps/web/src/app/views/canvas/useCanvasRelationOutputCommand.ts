/** Serialize explicit output commands through the shared draft transaction. */
import { useCallback } from 'react';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import { applyCanvasRelationOutput } from './canvasRelationOutputAuthoring';
import type { RelationOutputIntent } from './canvasRelationOutputIntent';
import type { useCanvasColumnDraftCommand } from './useCanvasColumnDraftCommand';

export function useCanvasRelationOutputCommand(
  nodes: ReadonlyMap<string, CanonicalNode>,
  submit: ReturnType<typeof useCanvasColumnDraftCommand>
) {
  return useCallback(
    (
      intent: RelationOutputIntent,
      fallback: (draft: CanvasDraftSession) => CanvasColumnMappingResult
    ): Promise<CanvasColumnMappingResult> =>
      submit(
        async (current, signal): Promise<CanvasColumnMappingResult> => {
          const node = resolveCanvasSessionNode(current, nodes, intent.nodeId);
          if (node == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
          if (
            node.pluginId !== 'dvt' ||
            node.kind !== 'dvt:transform' ||
            node.metadata?.transformAuthoring == null ||
            ('parentColumnId' in intent && intent.parentColumnId != null)
          )
            return fallback(current);
          return applyCanvasRelationOutput({
            draftSession: current,
            canonicalNodesById: nodes,
            intent,
            signal,
          });
        },
        (): CanvasColumnMappingResult => ({
          outcome: 'rejected',
          reason: 'invalid_transform_authority',
        })
      ),
    [nodes, submit]
  );
}
