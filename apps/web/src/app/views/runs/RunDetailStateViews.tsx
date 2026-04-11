import { Link } from 'react-router';

import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { RunStateFrame } from './RunStateFrame';
import { runStatesCopy as copy } from './runStatesCopy';

type RunsEmptyStateProps = {
  title?: string;
};

export function RunsEmptyStateView({ title = copy.runsTitle }: RunsEmptyStateProps) {
  return (
    <RunStateFrame title={title}>
      <Card
        data-slot="runs-empty-state"
        className={cn(routeWorkbenchPanelClassName, 'mx-auto max-w-xl p-8 text-center')}
      >
        <h2 className="mb-2 text-base font-semibold">{copy.emptyRunsTitle}</h2>
        <p className={cn('mb-3 text-sm', routeWorkbenchMutedTextClassName)}>{copy.emptyRuns}</p>
        <Link to="/canvas" className="text-sm text-blue-400 underline underline-offset-2">
          {copy.emptyRunsLink}
        </Link>
      </Card>
    </RunStateFrame>
  );
}

type RunMissingStateProps = {
  runId: string;
};

export function RunMissingStateView({ runId }: RunMissingStateProps) {
  return (
    <RunStateFrame title={copy.runsTitle}>
      <Card
        data-slot="run-missing-state"
        className={cn(routeWorkbenchPanelClassName, 'mx-auto max-w-xl p-5')}
      >
        <h2 className="mb-2 text-base font-semibold">{copy.runMissingTitle}</h2>
        <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
          {copy.runMissingMessagePrefix} <span className="font-mono">{runId}</span>.
        </p>
      </Card>
    </RunStateFrame>
  );
}

type RunsErrorStateProps = {
  message: string;
};

export function RunsErrorStateView({ message }: RunsErrorStateProps) {
  return (
    <RunStateFrame title={copy.runsTitle}>
      <Card
        data-slot="runs-error-state"
        className={cn(
          routeWorkbenchPanelClassName,
          'mx-auto max-w-xl border-[color:var(--status-danger)] bg-[var(--surface-elevated)] p-5'
        )}
      >
        <h2 className="mb-2 text-base font-semibold text-[var(--status-danger)]">
          {copy.runsUnavailableTitle}
        </h2>
        <p className="text-sm text-[var(--text-default)]">{message}</p>
      </Card>
    </RunStateFrame>
  );
}

type RunDetailLoadingStateProps = {
  runId: string;
};

export function RunDetailLoadingStateView({ runId }: RunDetailLoadingStateProps) {
  return (
    <RunStateFrame title={`Run ${runId}`}>
      <Card
        data-slot="run-detail-loading-state"
        className={cn(
          routeWorkbenchPanelClassName,
          'mx-auto max-w-xl p-5 text-sm',
          routeWorkbenchMutedTextClassName
        )}
      >
        {copy.runWorkspaceLoading}
      </Card>
    </RunStateFrame>
  );
}

type RunDetailErrorStateProps = {
  runId: string;
  message: string;
};

export function RunDetailErrorStateView({ runId, message }: RunDetailErrorStateProps) {
  return (
    <RunStateFrame title={`Run ${runId}`}>
      <Card
        data-slot="run-detail-error-state"
        className={cn(
          routeWorkbenchPanelClassName,
          'mx-auto max-w-xl border-[color:var(--status-danger)] bg-[var(--surface-elevated)] p-5'
        )}
      >
        <h2 className="mb-2 text-base font-semibold text-[var(--status-danger)]">
          {copy.runWorkspaceUnavailable}
        </h2>
        <p className="text-sm text-[var(--text-default)]">{message}</p>
      </Card>
    </RunStateFrame>
  );
}

type RunDegradedStateProps = {
  message: string;
};

export function RunDegradedStateView({ message }: RunDegradedStateProps) {
  return (
    <div
      data-slot="run-degraded-state"
      className={cn(
        routeWorkbenchPanelClassName,
        'rounded border-[color:var(--status-warning)] bg-[var(--surface-elevated)] px-3 py-2 text-sm'
      )}
    >
      <div className="font-semibold text-[var(--status-warning)]">{copy.runDegradedTitle}</div>
      <div className="mt-1 text-[var(--text-default)]">{message}</div>
      <div className={cn('mt-1', routeWorkbenchMutedTextClassName)}>{copy.runDegradedNote}</div>
    </div>
  );
}
