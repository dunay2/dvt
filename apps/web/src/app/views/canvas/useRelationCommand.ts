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

export type RelationCommandResult = Readonly<{ ok: true } | { ok: false; error?: unknown }>;

export function useRelationCommand(
  relationId: string,
  onChange: (document: SubstraitDocument) => void | boolean,
  owner?: ReturnType<typeof useCanvasRelationAnalysisSession>
) {
  const context = useContext(CanvasRelationAnalysisContext);
  const analysis = owner === undefined ? context : owner;
  const pending = useRef<AbortController | null>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  useEffect(() => {
    setState('idle');
  }, [analysis?.document, relationId]);
  useEffect(() => {
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [analysis, relationId]);
  const executeAtDetailed = async (
    targetRelationId: string,
    command: Command
  ): Promise<RelationCommandResult> => {
    if (pending.current != null || analysis?.document == null || analysis.error != null)
      return { ok: false };
    const controller = new AbortController();
    pending.current = controller;
    setState('busy');
    try {
      const document = await command(analysis.session, {
        relationId: targetRelationId,
        expectedRevision: analysis.revision,
        signal: controller.signal,
      });
      controller.signal.throwIfAborted();
      if (onChange(document) === false) {
        analysis.session.receive(analysis.document);
        analysis.refresh();
        setState('error');
        return { ok: false };
      }
      setState('idle');
      return { ok: true };
    } catch (error) {
      if (controller.signal.aborted) return { ok: false };
      setState('error');
      return { ok: false, error };
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  };
  const executeAt = async (targetRelationId: string, command: Command): Promise<boolean> =>
    (await executeAtDetailed(targetRelationId, command)).ok;
  return {
    state,
    execute: (command: Command) => executeAt(relationId, command),
    executeAt,
    executeDetailed: (command: Command) => executeAtDetailed(relationId, command),
    executeAtDetailed,
  };
}
