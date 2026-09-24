/** Discard stale selections and project only the exact selected relation's derived fields. */
import { useContext, useEffect, useState } from 'react';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';

export function useCanvasRelationFields(relationId: string) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string;
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
