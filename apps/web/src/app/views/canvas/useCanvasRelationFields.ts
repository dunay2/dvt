/** Discard stale selections and project only the exact selected relation's derived fields. */
import { useContext, useEffect, useState } from 'react';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

export function useCanvasRelationFields(
  relationId: string | null,
  owner?: ReturnType<typeof useCanvasRelationAnalysisSession>
) {
  const context = useContext(CanvasRelationAnalysisContext);
  const analysis = owner === undefined ? context : owner;
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string | null;
    result: RelationAnalysisResult | null;
    error: unknown;
  } | null>(null);
  useEffect(() => {
    if (analysis == null || analysis.document == null) return;
    const cancellation = new AbortController();
    if (analysis.error != null) {
      setSettled({ analysis, relationId, result: null, error: analysis.error });
      return;
    }
    void analysis.session.query(relationId, cancellation.signal).then(
      (result) => {
        if (!cancellation.signal.aborted) setSettled({ analysis, relationId, result, error: null });
      },
      (error: unknown) => {
        if (!cancellation.signal.aborted) setSettled({ analysis, relationId, result: null, error });
      }
    );
    return () => cancellation.abort();
  }, [analysis, relationId]);
  const current = settled?.analysis === analysis && settled?.relationId === relationId;
  return {
    available: analysis?.document != null,
    loading: !current,
    result: current ? settled.result : null,
    error: current ? settled.error : null,
  };
}
