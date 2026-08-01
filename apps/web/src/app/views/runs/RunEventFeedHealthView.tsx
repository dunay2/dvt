/** Owned concern: render the shared run-event feed health in the Runs workspace. */
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import type { RunEventFeedHealthCopy } from '../../services/runs/runEventFeedHealthCopy';
import type { RunEventFeedHealthModel } from '../../services/runs/runEventFeedHealthModel';

const classes = {
  root: 'mb-3 flex flex-wrap items-center gap-2 border-b border-[color:var(--border-default)] pb-3 text-xs',
  badge: 'shrink-0 text-[10px] uppercase',
  message: 'min-w-0 flex-1 text-[var(--text-subtle)]',
  retry: 'h-7 shrink-0',
} as const;

type RunEventFeedHealthViewProps = {
  readonly copy: RunEventFeedHealthCopy;
  readonly health: RunEventFeedHealthModel;
  readonly onRetry?: () => void;
};

export function RunEventFeedHealthView({
  copy,
  health,
  onRetry,
}: RunEventFeedHealthViewProps): JSX.Element | null {
  if (health.state === 'idle') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="run-event-feed-health"
      data-state={health.state}
      className={classes.root}
    >
      <Badge variant="outline" className={classes.badge}>
        {copy.states[health.state]}
      </Badge>
      <span className={classes.message}>{copy.messages[health.state]}</span>
      {health.canRetry && onRetry ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={classes.retry}
          data-slot="run-event-feed-retry"
          onClick={onRetry}
        >
          {copy.retryAction}
        </Button>
      ) : null}
    </div>
  );
}
