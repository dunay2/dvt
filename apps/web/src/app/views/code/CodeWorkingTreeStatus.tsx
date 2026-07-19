/** Owned concern: render honest Code working-tree synchronization posture. */
import { StatusIndicator } from '../../components/domain';
import { Button } from '../../components/ui/button';
import { routeWorkbenchHeaderBandClassName } from '../../components/workbench/RouteWorkbenchFrame';
import type { CodeWorkingTreeSyncPhase } from './codeWorkingTreeSyncModel';

type CodeWorkingTreeStatusPhase = CodeWorkingTreeSyncPhase | 'read_only';

type CodeWorkingTreeStatusCopy = Readonly<
  Record<CodeWorkingTreeStatusPhase, Readonly<{ label: string; message: string }>> & {
    retryLabel: string;
    reloadLabel: string;
  }
>;

const STATUS_TONE = {
  synchronized: 'ok',
  modified: 'warning',
  syncing: 'degraded',
  reconciling: 'degraded',
  conflict: 'error',
  failed: 'error',
  reconciliation_failed: 'error',
  persisted_stale: 'warning',
  persisted_invalid: 'error',
  persisted_unavailable: 'error',
  persisted_verification_unavailable: 'error',
  persisted_superseded: 'warning',
  read_only: 'degraded',
} as const;

export function CodeWorkingTreeStatus({
  phase,
  copy,
  onRetry,
  onReload,
}: Readonly<{
  phase: CodeWorkingTreeStatusPhase;
  copy: CodeWorkingTreeStatusCopy;
  onRetry: () => void;
  onReload: () => void;
}>) {
  const statusCopy = copy[phase];
  const isUrgent = STATUS_TONE[phase] === 'error';

  return (
    <div
      role={isUrgent ? 'alert' : 'status'}
      aria-atomic="true"
      aria-live={isUrgent ? 'assertive' : 'polite'}
      data-slot="code-working-tree-status"
      data-phase={phase}
      className={`${routeWorkbenchHeaderBandClassName} flex min-h-11 items-center gap-3 px-4 py-2`}
    >
      <StatusIndicator state={STATUS_TONE[phase]} label={statusCopy.label} />
      <span className="min-w-0 flex-1 text-xs text-[var(--text-muted)]">{statusCopy.message}</span>
      {phase === 'failed' ||
      phase === 'reconciliation_failed' ||
      phase === 'persisted_stale' ||
      phase === 'persisted_invalid' ||
      phase === 'persisted_unavailable' ||
      phase === 'persisted_verification_unavailable' ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {copy.retryLabel}
        </Button>
      ) : null}
      {phase === 'conflict' || phase === 'persisted_superseded' ? (
        <Button type="button" variant="outline" size="sm" onClick={onReload}>
          {copy.reloadLabel}
        </Button>
      ) : null}
    </div>
  );
}
