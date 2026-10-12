/**
 * Owned concern: manage one explicit Run-result read and discard obsolete responses.
 * @baseline ADR-0066: Publication evidence is immutable; current rows are not.
 * @decision Keep transient state keyed to scope, Run, attempt, target and publication token.
 * @consequence Reopening or refreshing never presents cached rows as a newly verified result.
 * @version 1.0.0
 */
import { useEffect, useRef, useState } from 'react';
import type { RunSnapshot } from '../../ports/runs';
import type { WorkspaceScope } from '../../ports/sessionContext';
import {
  classifyRunPublicationSampleFailure,
  loadRunPublicationSample,
  runPublicationSampleIdentity,
  type RunPublicationSamplePorts,
  type RunPublicationSampleState,
} from '../../services/runs/runPublicationSample';

export function useRunPublicationSample({
  snapshot,
  scope,
  connections,
  samples,
  getScope,
}: RunPublicationSamplePorts &
  Readonly<{
    snapshot: RunSnapshot;
    scope: WorkspaceScope;
    getScope: () => WorkspaceScope;
  }>) {
  const identity = runPublicationSampleIdentity(snapshot, scope);
  const request = useRef(0);
  const [entry, setEntry] = useState<{ identity: string; state: RunPublicationSampleState } | null>(
    null
  );
  useEffect(() => {
    setEntry(null);
    return () => {
      request.current += 1;
    };
  }, [identity]);

  async function load(): Promise<void> {
    if (identity === null || snapshot.publication == null) return;
    const requestId = ++request.current;
    const isCurrent = () =>
      requestId === request.current &&
      identity === runPublicationSampleIdentity(snapshot, getScope());
    if (!isCurrent()) return;
    setEntry({ identity, state: { kind: 'loading' } });
    try {
      const sample = await loadRunPublicationSample(
        snapshot.publication,
        { connections, samples },
        isCurrent
      );
      if (sample !== null && isCurrent()) setEntry({ identity, state: { kind: 'ready', sample } });
    } catch (error) {
      if (isCurrent())
        setEntry({
          identity,
          state: { kind: 'error', reason: classifyRunPublicationSampleFailure(error) },
        });
    }
  }

  const state: RunPublicationSampleState =
    identity === null
      ? { kind: 'unavailable' }
      : entry?.identity === identity
        ? entry.state
        : { kind: 'idle' };
  return { state, load };
}
