/** Selection-scoped retirement with explicit confirmation and stale-revision rejection. */
import { useContext, useEffect, useRef, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import {
  prepareRelationRemoval,
  type RelationRemovalProposal,
} from './canvasPrepareRelationRemoval';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import { removalTarget } from './canvasRelationRemovalTarget';

export function useRelationRemoval(
  onChange: (document: SubstraitDocument) => void,
  enabled = true,
  owner?: ReturnType<typeof useCanvasRelationAnalysisSession>,
  onEmpty?: () => void
) {
  const context = useContext(CanvasRelationAnalysisContext);
  const analysis = owner === undefined ? context : owner;
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Readonly<{
    result:
      | RelationRemovalProposal
      | Readonly<{
          change: null;
          expectedRevision: number;
          operations: readonly string[];
        }>;
    analysis: NonNullable<typeof analysis>;
  }> | null>(null);
  useEffect(() => () => request.current?.abort(), [analysis, enabled]);
  const accept = (
    result: NonNullable<typeof pending>['result'],
    current: NonNullable<typeof analysis>
  ) => {
    if (result.change != null) onChange(current.session.apply(result.change));
    else {
      current.session.locate(current.session.rootId, result.expectedRevision);
      if (onEmpty == null) throw new Error('This editor requires a surviving relation.');
      onEmpty();
    }
  };
  const remove = (relationId: string, keep?: 'left' | 'right'): void => {
    if (!enabled || analysis?.document == null || analysis.error != null) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(null);
    setError(null);
    const prepare = async (): Promise<NonNullable<typeof pending>['result']> => {
      if (onEmpty != null) {
        const target = removalTarget(analysis.session, relationId, analysis.revision, keep);
        if (target.replacement == null)
          return {
            change: null,
            expectedRevision: analysis.revision,
            operations: target.operations,
          };
      }
      return prepareRelationRemoval(analysis.session, {
        relationId,
        keep,
        expectedRevision: analysis.revision,
        signal: controller.signal,
      });
    };
    void prepare()
      .then((result) => {
        controller.signal.throwIfAborted();
        if (result.operations.length > 0) setPending({ result, analysis });
        else accept(result, analysis);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('dependent-condition');
      });
  };
  const confirm = () => {
    if (pending == null) return;
    try {
      if (!enabled || analysis !== pending.analysis) throw new Error('Selection changed.');
      accept(pending.result, analysis);
    } catch {
      setError('unavailable');
    }
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
