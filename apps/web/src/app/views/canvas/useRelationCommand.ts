/** Execute one local revision-bound command; discard completions after selection or document changes. */
import { useContext, useEffect, useRef, useState } from 'react';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import { CanvasRelationAnalysisContext } from './CanvasRelationAnalysisContext';
import type { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';

type Command = (
  session: CanvasRelationAnalysisSession,
  request: Readonly<{
    relationId: string;
    expectedRevision: number;
    signal: AbortSignal;
  }>
) => Promise<SubstraitDocument>;

export function useRelationCommand(
  relationId: string,
  onChange: (document: SubstraitDocument) => void,
  owner?: ReturnType<typeof useCanvasRelationAnalysisSession>
) {
  const context = useContext(CanvasRelationAnalysisContext);
  const analysis = owner === undefined ? context : owner;
  const pending = useRef<AbortController | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  useEffect(() => {
    setState('idle');
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [analysis, relationId]);
  const execute = async (command: Command): Promise<boolean> => {
    if (pending.current != null || analysis?.document == null || analysis.error != null)
      return false;
    const controller = new AbortController();
    pending.current = controller;
    setState('busy');
    try {
      const document = await command(analysis.session, {
        relationId,
        expectedRevision: analysis.revision,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      onChange(document);
      setState('idle');
      return true;
    } catch {
      if (!controller.signal.aborted) setState('error');
      return false;
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  };
  return { state, execute };
}
