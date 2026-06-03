import type { CanonicalNode } from '../../types/canonical';
import { canvasViewCopy } from './copy';

type AdmitCanonicalNodeToCanvasArgs = {
  canonicalNode: CanonicalNode;
  visibleNodeIds: readonly string[];
};

export type AdmitCanonicalNodeToCanvasResult =
  | {
      outcome: 'added';
      canonicalNode: CanonicalNode;
    }
  | {
      outcome: 'noop';
      reason: string;
    };

export function admitCanonicalNodeToCanvas({
  canonicalNode,
  visibleNodeIds,
}: AdmitCanonicalNodeToCanvasArgs): AdmitCanonicalNodeToCanvasResult {
  if (visibleNodeIds.includes(canonicalNode.id)) {
    return { outcome: 'noop', reason: canvasViewCopy.nodeAlreadyOnCanvasMessage };
  }

  return {
    outcome: 'added',
    canonicalNode,
  };
}
