/** Selection-scoped retirement with explicit confirmation and stale-revision rejection. */
import { useContext, useEffect, useRef, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import {
  prepareRelationRemoval,
  type RelationRemovalProposal,
} from './canvasPrepareRelationRemoval';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

export function useRelationRemoval(
  onChange: (document: SubstraitDocument) => void,
  enabled = true,
  owner?: ReturnType<typeof useCanvasRelationAnalysisSession>
) {
  const context = useContext(CanvasRelationAnalysisContext);
  const analysis = owner === undefined ? context : owner;
  const request = useRef<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Readonly<{
    result: RelationRemovalProposal;
    analysis: NonNullable<typeof analysis>;
  }> | null>(null);
  useEffect(() => () => request.current?.abort(), [analysis, enabled]);
  const remove = (relationId: string, keep?: 'left' | 'right'): void => {
    if (!enabled || analysis?.document == null || analysis.error != null) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(null);
    setError(null);
    void prepareRelationRemoval(analysis.session, {
      relationId,
      keep,
      expectedRevision: analysis.revision,
      signal: controller.signal,
    })
      .then((result) => {
        controller.signal.throwIfAborted();
        if (result.operations.length > 0) setPending({ result, analysis });
        else onChange(analysis.session.apply(result.change));
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('dependent-condition');
      });
  };
  const confirm = () => {
    if (pending == null) return;
    try {
      if (!enabled || analysis !== pending.analysis) throw new Error('Selection changed.');
      onChange(analysis.session.apply(pending.result.change));
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
