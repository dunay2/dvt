/** Owned concern: keep contextual removal local until the existing Apply command. */
import { useState } from 'react';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalTreeExistingJoinDraft } from './canvasRelationalTreeExistingJoinDraft';
import {
  removeCanvasRelationalTreeNode,
  type CanvasRelationalRemovalResult,
} from './canvasRelationalTreeRemoval';

export function useCanvasRelationalTreeRemoval(
  args: Readonly<{
    enabled: boolean;
    active: boolean;
    draft: DvtSubstraitInnerJoinDraft | null;
    selectedInputIds: readonly string[];
    seed: CanvasRelationalTreeExistingJoinDraft | null;
    targetNodeId: string;
    hydrate: () => boolean;
    accept: (
      result: Extract<CanvasRelationalRemovalResult, { ok: true }>,
      ids: readonly string[]
    ) => void;
  }>
) {
  const [error, setError] = useState<string | null>(null);
  const remove = (relationId: string, keep?: 'left' | 'right'): void => {
    if (!args.enabled) return;
    const draft = args.active ? args.draft : args.seed?.draft;
    const ids = args.active ? args.selectedInputIds : args.seed?.inputIds;
    if (draft == null || ids == null) return;
    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId,
      keep,
      targetNodeId: args.targetNodeId,
    });
    setError(result.ok ? null : result.reason);
    if (!result.ok) return;
    if (!args.active) args.hydrate();
    args.accept(
      result,
      result.retained.map((index) => ids[index]!)
    );
  };
  return { remove, error, clearError: () => setError(null) };
}
