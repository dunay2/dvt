/** Selection lifetime for replacement menus; initial/append discovery remains with its session. */
import { useContext, useEffect, useState } from 'react';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import { queryCompositionChoices } from './canvasCompositionChoices';
import { relationOperation } from './canvasRelationOperation';

export function useCompositionChoices(
  relationId: string | null,
  readOnly: boolean,
  enabled: boolean
) {
  const analysis = useContext(CanvasRelationAnalysisContext);
  const [settled, setSettled] = useState<{
    analysis: typeof analysis;
    relationId: string | null;
    readOnly: boolean;
    choices: Awaited<ReturnType<typeof queryCompositionChoices>>;
    operation: ReturnType<typeof relationOperation>;
  } | null>(null);
  useEffect(() => {
    if (!enabled || analysis?.document == null || analysis.error != null) return;
    const controller = new AbortController();
    const id = relationId ?? analysis.session.rootId;
    void queryCompositionChoices(
      analysis.session,
      id,
      analysis.revision,
      readOnly,
      controller.signal
    )
      .then((choices) => {
        if (!controller.signal.aborted)
          setSettled({
            analysis,
            relationId,
            readOnly,
            choices,
            operation: relationOperation(analysis.session, id),
          });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled(null);
      });
    return () => controller.abort();
  }, [analysis, relationId, readOnly, enabled]);
  return enabled &&
    settled?.analysis === analysis &&
    settled?.relationId === relationId &&
    settled?.readOnly === readOnly
    ? settled
    : null;
}
