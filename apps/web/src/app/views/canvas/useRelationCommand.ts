/**
 * Owned concern: bind one pending relation command to its accepted semantic authority.
 * @baseline GH-3578: equivalent save acknowledgements must not discard an in-flight intent.
 * @decision Bind both cancellation and feedback to session, revision, relation and eligibility.
 * @consequence Equivalent refreshes preserve Busy; rollback preserves its rejection, not stale feedback.
 * @version 1.1.0
 */
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  const [state, setState] = useState<{
    value: 'busy' | 'error';
    session: CanvasRelationAnalysisSession;
    revision: number;
    relationId: string;
    permissionIdentity: string;
  } | null>(null);
  const session = analysis?.error == null ? analysis?.session : undefined;
  const revision = analysis?.revision;
  const permissionIdentity = analysis?.permissionIdentity;
  const matchesAuthority = useCallback(
    (candidate: typeof state): candidate is NonNullable<typeof state> =>
      candidate != null &&
      candidate.session === session &&
      candidate.revision === revision &&
      candidate.relationId === relationId &&
      candidate.permissionIdentity === permissionIdentity,
    [session, revision, relationId, permissionIdentity]
  );
  useEffect(() => {
    setState((current) => (matchesAuthority(current) ? current : null));
    return () => {
      pending.current?.abort();
      pending.current = null;
    };
  }, [matchesAuthority]);
  const executeAtDetailed = async (
    targetRelationId: string,
    command: Command
  ): Promise<RelationCommandResult> => {
    if (pending.current != null || analysis?.document == null || analysis.error != null)
      return { ok: false };
    const controller = new AbortController();
    pending.current = controller;
    const authority = {
      session: analysis.session,
      revision: analysis.revision,
      relationId,
      permissionIdentity: analysis.permissionIdentity,
    };
    setState({ ...authority, value: 'busy' });
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
        setState({ ...authority, revision: analysis.session.revision, value: 'error' });
        return { ok: false };
      }
      setState(null);
      return { ok: true };
    } catch (error) {
      if (controller.signal.aborted) return { ok: false };
      setState({ ...authority, value: 'error' });
      return { ok: false, error };
    } finally {
      if (pending.current === controller) pending.current = null;
    }
  };
  const executeAt = async (targetRelationId: string, command: Command): Promise<boolean> =>
    (await executeAtDetailed(targetRelationId, command)).ok;
  return {
    state: matchesAuthority(state) ? state.value : ('idle' as const),
    execute: (command: Command) => executeAt(relationId, command),
    executeAt,
    executeDetailed: (command: Command) => executeAtDetailed(relationId, command),
    executeAtDetailed,
  };
}
