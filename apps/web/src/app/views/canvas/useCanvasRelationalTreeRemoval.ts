/** Owned concern: keep contextual removal local until the existing Apply command. */
import { useEffect, useRef, useState } from 'react';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { CanvasRelationalTreeExistingJoinDraft } from './canvasRelationalTreeExistingJoinDraft';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { removeSelectedRelationFilter } from './canvasSelectedRelationFilter';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import {
  removeCanvasRelationalTreeNode,
  type CanvasRelationalRemovalResult,
} from './canvasRelationalTreeRemoval';

export function useCanvasRelationalTreeRemoval(
  args: Readonly<{
    enabled: boolean;
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    operation: CanvasRelationalOperation | null;
    active: boolean;
    draft: DvtSubstraitJoinDraft | null;
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
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [args.analysis, args.enabled, args.draft]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Readonly<{
    draft: DvtSubstraitJoinDraft;
    result: Extract<CanvasRelationalRemovalResult, { reason: 'dependent-operations' }>;
    ids: readonly string[];
  }> | null>(null);
  const accept = (
    result: Extract<CanvasRelationalRemovalResult, { ok: true }>,
    ids: readonly string[]
  ) => {
    if (!args.active) args.hydrate();
    args.accept(
      result,
      result.retained.map((index) => ids[index]!)
    );
  };
  const remove = (relationId: string, keep?: 'left' | 'right'): void => {
    if (!args.enabled) return;
    const draft = args.active ? args.draft : args.seed?.draft;
    const ids = args.active ? args.selectedInputIds : args.seed?.inputIds;
    if (draft == null || ids == null) return;
    request.current?.abort();
    const analysis = args.analysis;
    if (analysis?.document === draft && analysis.error == null && args.operation != null) {
      const selected = analysis.session.locate(relationId, analysis.revision);
      if (selected.relation.relType.case === 'filter') {
        const operation = args.operation;
        const cancellation = new AbortController();
        request.current = cancellation;
        setPending(null);
        void removeSelectedRelationFilter(
          analysis.session,
          relationId,
          analysis.revision,
          cancellation.signal
        ).then(
          (next) => {
            if (cancellation.signal.aborted) return;
            setError(null);
            accept(
              { ok: true, draft: next, operation, retained: ids.map((_, index) => index) },
              ids
            );
          },
          () => {
            if (!cancellation.signal.aborted) setError('unavailable');
          }
        );
        return;
      }
    }
    const result = removeCanvasRelationalTreeNode({
      draft,
      relationId,
      keep,
      targetNodeId: args.targetNodeId,
    });
    setPending(null);
    if (!result.ok && result.reason === 'dependent-operations') {
      setError(null);
      setPending({ draft, result, ids });
      return;
    }
    setError(result.ok ? null : result.reason);
    if (!result.ok) return;
    accept(result, ids);
  };
  const confirm = () => {
    if (pending == null) return;
    const current = args.active ? args.draft : args.seed?.draft;
    if (args.enabled && current === pending.draft) accept(pending.result.proposal, pending.ids);
    else setError('unavailable');
    setPending(null);
  };
  return {
    remove,
    error,
    clearError: () => setError(null),
    pending,
    confirm,
    cancel: () => setPending(null),
  };
}
