import type { CanonicalNode } from '../../types/canonical';

export type LineageWorkbenchState =
  { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'empty' } | { kind: 'ready' };

type BuildLineageWorkbenchStateInput = {
  canonicalNodes: CanonicalNode[];
  focusNode: CanonicalNode | null;
  isLoadingSnapshot: boolean;
  snapshotError: Error | null;
  snapshotErrorMessage: string;
};

export function buildLineageWorkbenchState({
  canonicalNodes,
  focusNode,
  isLoadingSnapshot,
  snapshotError,
  snapshotErrorMessage,
}: BuildLineageWorkbenchStateInput): LineageWorkbenchState {
  if (snapshotError && canonicalNodes.length === 0) {
    return {
      kind: 'error',
      message: snapshotErrorMessage,
    };
  }

  if (isLoadingSnapshot && canonicalNodes.length === 0) {
    return { kind: 'loading' };
  }

  if (!focusNode) {
    return { kind: 'empty' };
  }

  return { kind: 'ready' };
}
