/** Owned concern: render a compact route-contributed Run status in the top bar. */
import { Play } from 'lucide-react';

import { Button } from '../ui/button';
import type { ShellTopBarCopy } from './copy';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

const shellRunStatusClasses = {
  root: 'flex shrink-0 items-center gap-1.5',
  status: 'inline whitespace-nowrap text-[11px] font-medium text-[var(--text-subtle)]',
  activeStatus: 'text-[var(--status-running)]',
  blockedStatus: 'text-amber-100',
  readyStatus: 'text-[var(--status-success)]',
  runButton:
    'h-8 gap-1.5 px-2 text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
  icon: 'size-3.5',
} as const;

type ShellRunStatusIndicatorProps = Readonly<{
  contribution: OperationalDrawerContribution | null;
  copy: ShellTopBarCopy;
}>;

function resolveRunStatusLabel(
  contribution: OperationalDrawerContribution,
  copy: ShellTopBarCopy
): string {
  if (contribution.runs.activeRunId != null) {
    return copy.runningTemplate.replace('{runId}', contribution.runs.activeRunId);
  }

  if (contribution.runs.status === 'ready') {
    return copy.runReady;
  }

  if (contribution.preview.status === 'blocked') {
    return copy.previewRequired;
  }

  return copy.runBlocked;
}

function resolveStatusClassName(contribution: OperationalDrawerContribution): string {
  if (contribution.runs.activeRunId != null || contribution.runs.status === 'active') {
    return `${shellRunStatusClasses.status} ${shellRunStatusClasses.activeStatus}`;
  }

  if (contribution.runs.status === 'ready') {
    return `${shellRunStatusClasses.status} ${shellRunStatusClasses.readyStatus}`;
  }

  return `${shellRunStatusClasses.status} ${shellRunStatusClasses.blockedStatus}`;
}

export function ShellRunStatusIndicator({
  contribution,
  copy,
}: ShellRunStatusIndicatorProps): JSX.Element | null {
  if (contribution?.source !== 'canvas') {
    return null;
  }

  const statusLabel = resolveRunStatusLabel(contribution, copy);
  const runDisabled = contribution.runs.activeRunId != null || !contribution.runs.canStartRun;

  return (
    <div
      data-slot="shell-run-status-indicator"
      className={shellRunStatusClasses.root}
      aria-label={copy.canvasRunStatusTemplate.replace('{status}', statusLabel)}
    >
      <span data-slot="shell-run-status-label" className={resolveStatusClassName(contribution)}>
        {statusLabel}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="shell-run-command"
        className={shellRunStatusClasses.runButton}
        disabled={runDisabled}
        onClick={contribution.runs.onStartRun}
        aria-label={copy.runCommand}
      >
        <Play className={shellRunStatusClasses.icon} />
        <span className="hidden sm:inline">{copy.runCommand}</span>
      </Button>
    </div>
  );
}
