/** Query only the selected operator and its cached input schemas. */
import { useContext, useEffect, useState } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { relationOutputSlots } from './canvasRelationOutputSchema';

export function useRelationOutputs(relationId: string) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string;
    slots: ReturnType<typeof relationOutputSlots>;
    physical: boolean;
  } | null>(null);
  useEffect(() => {
    if (analysis?.document == null || analysis.error != null) return;
    const cancellation = new AbortController();
    const query = async () => {
      const target = analysis.session.locate(relationId, analysis.revision);
      const inputs = await Promise.all(
        target.inputs.map((id) => analysis.session.query(id, cancellation.signal))
      );
      cancellation.signal.throwIfAborted();
      analysis.session.locate(relationId, analysis.revision);
      setSettled({
        analysis,
        relationId,
        slots: relationOutputSlots(target, inputs),
        physical: target.relation.relType.case === 'read',
      });
    };
    void query().catch(() => {
      if (!cancellation.signal.aborted) setSettled(null);
    });
    return () => cancellation.abort();
  }, [analysis, relationId]);
  return settled?.analysis === analysis && settled?.relationId === relationId ? settled : null;
}
