/**
 * Owned concern: render the route-contributed Run command with readiness help.
 * @decision Keep status in the shared tooltip instead of occupying header space.
 * @consequence A disabled command retains native gating and a focusable help target.
 */
import { Play } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import type { OperationalDrawerContribution } from './operationalDrawerContributionStore';
import styles from './ShellChrome.module.css';

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

export function ShellRunStatusIndicator({
  contribution,
  copy,
}: ShellRunStatusIndicatorProps): JSX.Element | null {
  const [helpOpen, setHelpOpen] = useState(false);
  if (contribution?.source !== 'canvas') {
    return null;
  }

  const statusLabel = resolveRunStatusLabel(contribution, copy);
  const runDisabled = contribution.runs.activeRunId != null || !contribution.runs.canStartRun;

  return (
    <Tooltip open={helpOpen} onOpenChange={setHelpOpen}>
      <TooltipTrigger asChild>
        <div
          data-slot="shell-run-status-indicator"
          className={styles.runStatusControl}
          role="group"
          tabIndex={runDisabled ? 0 : undefined}
          aria-label={copy.canvasRunStatusTemplate.replace('{status}', statusLabel)}
          onClick={(event) => {
            if (!runDisabled) return;
            // A tap has no hover; prevent Radix's click dismissal only for blocked Run help.
            event.preventDefault();
            setHelpOpen(true);
          }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-slot="shell-run-command"
            className={topAppBarClasses.menuButton}
            disabled={runDisabled}
            onClick={contribution.runs.onStartRun}
            aria-label={copy.runCommand}
          >
            <Play aria-hidden="true" className={topAppBarClasses.menuTriggerIcon} />
            <span className={styles.runCommandLabel}>{copy.runCommand}</span>
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={6} className={styles.runStatusTooltip}>
        {statusLabel}
      </TooltipContent>
    </Tooltip>
  );
}
