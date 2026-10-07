/**
 * Owned concern: bind one pending relation command to its accepted semantic authority.
 * @baseline GH-3578: equivalent save acknowledgements must not discard an in-flight intent.
 * @decision Cancel by session, revision, relation and eligibility rather than React wrapper identity.
 * @consequence Busy survives equivalent refreshes; authority changes and unmount still abort.
 * @version 1.0.0
 */
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
  const session = analysis?.error == null ? analysis?.session : undefined;
  const revision = analysis?.revision;
  const permissionIdentity = analysis?.permissionIdentity;
  useEffect(() => {
    setState('idle');
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [session, revision, relationId, permissionIdentity]);
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
