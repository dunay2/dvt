/** Owned concern: render honest Code working-tree synchronization posture. */
import { StatusIndicator } from '../../components/domain';
import { Button } from '../../components/ui/button';
import { routeWorkbenchHeaderBandClassName } from '../../components/workbench/RouteWorkbenchFrame';

type CodeWorkingTreeStatusPhase =
  'synchronized' | 'modified' | 'syncing' | 'conflict' | 'failed' | 'read_only';
type ExtendedCodeWorkingTreeStatusPhase =
  CodeWorkingTreeStatusPhase | 'reconciling' | 'reconciliation_failed';

type CodeWorkingTreeStatusCopy = Readonly<
  Record<ExtendedCodeWorkingTreeStatusPhase, Readonly<{ label: string; message: string }>> & {
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
  read_only: 'degraded',
} as const;

export function CodeWorkingTreeStatus({
  phase,
  copy,
  onRetry,
  onReload,
}: Readonly<{
  phase: ExtendedCodeWorkingTreeStatusPhase;
  copy: CodeWorkingTreeStatusCopy;
  onRetry: () => void;
  onReload: () => void;
}>) {
  const statusCopy = copy[phase];

  return (
    <div
      data-slot="code-working-tree-status"
      className={`${routeWorkbenchHeaderBandClassName} flex min-h-11 items-center gap-3 px-4 py-2`}
    >
      <StatusIndicator state={STATUS_TONE[phase]} label={statusCopy.label} />
      <span className="min-w-0 flex-1 text-xs text-[var(--text-muted)]">{statusCopy.message}</span>
      {phase === 'failed' || phase === 'reconciliation_failed' ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {copy.retryLabel}
        </Button>
      ) : null}
      {phase === 'conflict' ? (
        <Button type="button" variant="outline" size="sm" onClick={onReload}>
          {copy.reloadLabel}
        </Button>
      ) : null}
    </div>
  );
}
