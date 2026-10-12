/** One cancellable query of an exact operand, shared by the unary property forms. */
import { useContext, useEffect, useState } from 'react';
import type { RelationAnalysisResult } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';

export type SelectedRelationInput = Readonly<{
  analysis: NonNullable<React.ContextType<typeof CanvasRelationAnalysisContext>>;
  relationId: string | null;
  targetId: string;
  intent: 'insert' | 'edit';
  target: ReturnType<CanvasRelationAnalysisSession['locate']>;
  schema: RelationAnalysisResult;
}>;

export function useSelectedRelationInput(
  relationId: string | null,
  intent: 'insert' | 'edit'
): SelectedRelationInput | null {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<SelectedRelationInput | null>(null);
  useEffect(() => {
    if (analysis?.document == null || analysis.error != null) return;
    const cancellation = new AbortController();
    const resolve = async () => {
      const targetId = relationId ?? analysis.session.rootId;
      const target = analysis.session.locate(targetId, analysis.revision);
      if (intent === 'edit' && target.inputs.length !== 1) return;
      const inputId = intent === 'edit' ? target.inputs[0]! : targetId;
      const [schema] = await Promise.all([
        analysis.session.query(inputId, cancellation.signal),
        ...(intent === 'edit' ? [analysis.session.query(targetId, cancellation.signal)] : []),
      ]);
      analysis.session.locate(targetId, analysis.revision);
      cancellation.signal.throwIfAborted();
      setSettled({ analysis, relationId, targetId, intent, target, schema: schema! });
    };
    void resolve().catch(() => {
      if (!cancellation.signal.aborted) setSettled(null);
    });
    return () => cancellation.abort();
  }, [analysis, relationId, intent]);
  return settled?.analysis === analysis &&
    settled?.relationId === relationId &&
    settled?.intent === intent
    ? settled
    : null;
}
