/** Owned concern: render a compact route-contributed Run status in the top bar. */
import { Play } from 'lucide-react';

import { Button } from '../ui/button';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';

const shellRunStatusClasses = {
  root: 'flex min-w-0 items-center gap-2',
  status: 'hidden max-w-56 truncate text-[11px] font-medium text-[var(--text-subtle)] md:inline',
  activeStatus: 'text-[var(--status-running)]',
  blockedStatus: 'text-amber-100',
  readyStatus: 'text-[var(--status-success)]',
  runButton:
    'h-8 gap-1.5 px-2 text-[var(--text-default)] hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)]',
  icon: 'size-3.5',
} as const;

type ShellRunStatusIndicatorProps = Readonly<{
  contribution: OperationalDrawerContribution | null;
}>;

function resolveRunStatusLabel(contribution: OperationalDrawerContribution): string {
  if (contribution.runs.activeRunId != null) {
    return `Running ${contribution.runs.activeRunId}`;
  }

  if (contribution.runs.status === 'ready') {
    return 'Ready';
  }

  if (contribution.preview.status === 'blocked') {
    return 'Preview required';
  }

  return 'Run blocked';
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
}: ShellRunStatusIndicatorProps): JSX.Element | null {
  if (contribution?.source !== 'canvas') {
    return null;
  }

  const statusLabel = resolveRunStatusLabel(contribution);
  const runDisabled = contribution.runs.activeRunId != null || !contribution.runs.canStartRun;

  return (
    <div
      data-slot="shell-run-status-indicator"
      className={shellRunStatusClasses.root}
      aria-label={`Canvas run status: ${statusLabel}`}
    >
      <span className={resolveStatusClassName(contribution)}>{statusLabel}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-slot="shell-run-command"
        className={shellRunStatusClasses.runButton}
        disabled={runDisabled}
        onClick={contribution.runs.onStartRun}
      >
        <Play className={shellRunStatusClasses.icon} />
        Run
      </Button>
    </div>
  );
}
