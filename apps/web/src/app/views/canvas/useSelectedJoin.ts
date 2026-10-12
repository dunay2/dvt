/** Selection lifetime and cancellation only; relation semantics remain in the query owner. */
import { useContext, useEffect, useState } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { querySelectedJoin, type SelectedJoin } from './canvasSelectedJoin';

export function useSelectedJoin(relationId: string | null) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<{ analysis: typeof analysis; value: SelectedJoin } | null>(
    null
  );
  useEffect(() => {
    if (analysis?.document == null || analysis.error != null || relationId == null) return;
    const controller = new AbortController();
    void querySelectedJoin(analysis.session, relationId, analysis.revision, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setSettled({ analysis, value });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled(null);
      });
    return () => controller.abort();
  }, [analysis, relationId]);
  return settled?.analysis === analysis && settled?.value.relationId === relationId
    ? settled.value
    : null;
}
