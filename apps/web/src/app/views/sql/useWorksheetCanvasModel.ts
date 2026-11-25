/** Keep proposal freshness and publication acknowledgement as separate state transitions. */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { jcsCanonicalize, randomUuidV4 } from '@dvt/crypto';
import { useSessionContext, useWorksheetCanvasModelQuery } from '../../services/AppServicesContext';
import {
  useWorksheetCanvasPublication,
  worksheetCanvasFailure,
  type WorksheetCanvasFailure as Failure,
  type WorksheetCanvasOperation,
} from './useWorksheetCanvasPublication';
import {
  worksheetCanvasProposalSnapshot as proposalSnapshot,
  type PreparedWorksheetCanvasProposal as Prepared,
  type WorksheetCanvasSnapshot as Snapshot,
} from './worksheetCanvasModelRequest';
import type { SqlWorksheetConversionProps } from './sqlWorksheet.types';

function useWorksheetOperation(onBusyChange?: (busy: boolean) => void): WorksheetCanvasOperation {
  const active = useRef(false),
    mounted = useRef(false);
  const [phase, setPhase] = useState<'proposing' | 'saving' | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(next: Exclude<typeof phase, null>, action: () => Promise<void>) {
    if (active.current) return;
    active.current = true;
    setPhase(next);
    onBusyChange?.(true);
    try {
      await action();
    } finally {
      active.current = false;
      if (mounted.current) setPhase(null);
      onBusyChange?.(false);
    }
  }
  return { phase, run, alive: () => mounted.current };
}

function useProposalStep(
  operation: ReturnType<typeof useWorksheetOperation>,
  current: (snapshot: Snapshot) => boolean
) {
  const query = useWorksheetCanvasModelQuery();
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [error, setError] = useState<Failure | null>(null);
  const [diagnostics, setDiagnostics] = useState<readonly string[]>([]);
  const prepare = (snapshot: Snapshot) =>
    operation.run('proposing', async () => {
      setError(null);
      setDiagnostics([]);
      setPrepared(null);
      try {
        const result = await query.propose(snapshot.request);
        if (!operation.alive()) return;
        if (!current(snapshot)) {
          setError('stale');
          return;
        }
        if (result.status === 'current') {
          setError('contract');
          return;
        }
        if (result.status === 'invalid') {
          setError('invalid');
          setDiagnostics(result.diagnostics.map((diagnostic) => diagnostic.message));
          return;
        }
        setPrepared({ identity: snapshot.identity, snapshot, proposal: result });
      } catch (failure) {
        if (operation.alive()) setError(worksheetCanvasFailure(failure));
      }
    });
  return { prepared, error, diagnostics, setError, prepare };
}

function canRecoverPublication(
  prepared: Prepared | null,
  unknown: boolean,
  sameScope: (snapshot: Snapshot) => boolean
): boolean {
  if (!unknown) return false;
  if (prepared == null) return false;
  return sameScope(prepared.snapshot);
}

export function useWorksheetCanvasModel(
  props: SqlWorksheetConversionProps,
  onBusyChange?: (busy: boolean) => void
) {
  const session = useSessionContext(),
    [name, setName] = useState('');
  const [modelId] = useState(() => 'model_' + randomUuidV4());
  const snapshot = proposalSnapshot(props, name, modelId),
    latest = useRef({ snapshot, scope: props.scope });
  useLayoutEffect(() => {
    latest.current = { snapshot, scope: props.scope };
  });
  const sameScope = (captured: Snapshot) =>
    jcsCanonicalize(latest.current.scope) === jcsCanonicalize(captured.scope) &&
    jcsCanonicalize(session.getWorkspaceScopeSnapshot()) === jcsCanonicalize(captured.scope);
  const current = (captured: Snapshot) =>
    latest.current.snapshot?.identity === captured.identity && sameScope(captured);
  const operation = useWorksheetOperation(onBusyChange),
    proposal = useProposalStep(operation, current),
    publication = useWorksheetCanvasPublication(operation, current);
  const fresh = snapshot != null && proposal.prepared?.identity === snapshot.identity;
  const terminal = publication.receipt?.kind === 'saved';
  async function prepare() {
    if (snapshot == null) return;
    if (terminal) return;
    if (publication.receipt?.kind === 'unknown') return;
    if (!current(snapshot)) {
      proposal.setError('stale');
      return;
    }
    publication.clear();
    await proposal.prepare(snapshot);
  }
  const canRetry = canRecoverPublication(
    proposal.prepared,
    publication.receipt?.kind === 'unknown',
    sameScope
  );
  async function confirm() {
    if (proposal.prepared == null) return;
    if (canRetry) {
      await publication.confirm(proposal.prepared);
      return;
    }
    if (terminal) return;
    if (publication.receipt != null) return;
    if (!current(proposal.prepared.snapshot)) {
      proposal.setError('stale');
      return;
    }
    await publication.confirm(proposal.prepared);
  }
  return {
    name,
    setName,
    prepare,
    confirm,
    prepared: proposal.prepared?.proposal,
    receipt: publication.receipt,
    diagnostics: proposal.diagnostics,
    error:
      publication.error ??
      proposal.error ??
      (proposal.prepared != null && !fresh && !terminal ? 'stale' : null),
    busy: operation.phase != null,
    phase: operation.phase,
    canPrepare: snapshot != null && !terminal && publication.receipt?.kind !== 'unknown',
    canConfirm: canRetry || (fresh && !terminal && publication.receipt == null),
  };
}
