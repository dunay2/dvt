import { CircleStop, LoaderCircle, RotateCcw } from 'lucide-react';

import type { RunControlAvailability } from '../../ports/runs';
import type {
  RunControlCommandFailure,
  RunControlCommandOutcome,
  RunControlCommandRequest,
} from '../../services/runs/runControlCommandModel';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { resolveRunControlCopy } from './runControlCopy';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';

type RunControlActionsProps = Readonly<{
  runId: string;
  availability: RunControlAvailability | undefined;
  activity: RunControlCommandRequest | null;
  outcome: RunControlCommandOutcome | null;
  failure: RunControlCommandFailure | null;
  onCancel: () => void;
  onRecover: () => void;
  compact?: boolean;
  locale?: string;
}>;

function describeOutcome(outcome: RunControlCommandOutcome, locale?: string): string {
  const copy = resolveRunControlCopy(locale);
  if (outcome.action === 'recover') {
    return copy.recoveryStarted(outcome.receipt.recoveryRunId);
  }

  switch (outcome.receipt.disposition) {
    case 'already_requested':
      return copy.cancellationAlreadyRequested;
    case 'already_cancelled':
      return copy.cancellationAlreadyCompleted;
    case 'requested':
      return copy.cancellationRequested;
  }
}

export function RunControlActions({
  activity,
  availability,
  compact = true,
  failure,
  locale,
  onCancel,
  onRecover,
  outcome,
  runId,
}: RunControlActionsProps): JSX.Element | null {
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  if (!availability) {
    return null;
  }

  const resolvedLocale = locale ?? applicationLanguage;
  const copy = resolveRunControlCopy(resolvedLocale);
  const activeForRun = activity?.runId === runId ? activity : null;
  const outcomeForRun = outcome?.runId === runId ? outcome : null;
  const failureForRun = failure?.runId === runId ? failure : null;
  const commandsPending = activity !== null;
  const cancelDescription = availability.cancel.available
    ? copy.cancel
    : copy.unavailableReason[availability.cancel.reason];
  const recoverDescription = availability.recover.available
    ? copy.recover
    : copy.unavailableReason[availability.recover.reason];
  const feedback = failureForRun
    ? copy.failure(failureForRun.error.message)
    : outcomeForRun
      ? describeOutcome(outcomeForRun, resolvedLocale)
      : null;

  return (
    <div data-slot="run-control-actions" className="flex flex-wrap items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="destructive"
              size={compact ? 'icon' : 'sm'}
              data-slot="run-cancel-action"
              aria-label={copy.cancel}
              aria-description={cancelDescription}
              disabled={commandsPending || !availability.cancel.available}
              onClick={onCancel}
            >
              {activeForRun?.action === 'cancel' ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <CircleStop aria-hidden="true" />
              )}
              {compact ? null : copy.cancel}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{cancelDescription}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              type="button"
              variant="outline"
              size={compact ? 'icon' : 'sm'}
              data-slot="run-recover-action"
              aria-label={copy.recover}
              aria-description={recoverDescription}
              disabled={commandsPending || !availability.recover.available}
              onClick={onRecover}
            >
              {activeForRun?.action === 'recover' ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <RotateCcw aria-hidden="true" />
              )}
              {compact ? null : copy.recover}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{recoverDescription}</TooltipContent>
      </Tooltip>

      {feedback ? (
        <span
          data-slot="run-control-feedback"
          className={failureForRun ? 'text-sm text-red-300' : 'text-sm text-emerald-300'}
          role={failureForRun ? 'alert' : 'status'}
        >
          {feedback}
        </span>
      ) : null}
    </div>
  );
}

export type { RunControlActionsProps };
