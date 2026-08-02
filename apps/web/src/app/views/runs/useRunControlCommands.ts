/** Owned concern: adapt run-control UI intents to authoritative Runs command rails. */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useRunsService } from '../../services/AppServicesContext';
import type {
  RunControlCommandFailure,
  RunControlCommandOutcome,
  RunControlCommandRequest,
} from '../../services/runs/runControlCommandModel';

type UseRunControlCommandsOptions = Readonly<{
  onRecoveryAccepted?: (runId: string) => void;
}>;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Run command failed.');
}

export function useRunControlCommands(options: UseRunControlCommandsOptions = {}) {
  const runsService = useRunsService();
  const queryClient = useQueryClient();
  const mutation = useMutation<RunControlCommandOutcome, Error, RunControlCommandRequest>({
    mutationFn: async (request) => {
      if (request.action === 'cancel') {
        return {
          action: 'cancel',
          runId: request.runId,
          receipt: await runsService.cancelRun(request.runId),
        };
      }

      return {
        action: 'recover',
        runId: request.runId,
        receipt: await runsService.recoverRun(request.runId),
      };
    },
    onSuccess: async (outcome) => {
      await queryClient.invalidateQueries({ queryKey: ['runs'] });
      if (outcome.action === 'recover') {
        options.onRecoveryAccepted?.(outcome.receipt.recoveryRunId);
      }
    },
  });

  const failure: RunControlCommandFailure | null =
    mutation.isError && mutation.variables
      ? {
          ...mutation.variables,
          error: toError(mutation.error),
        }
      : null;

  return {
    cancelRun: (runId: string) => mutation.mutate({ action: 'cancel', runId }),
    recoverRun: (runId: string) => mutation.mutate({ action: 'recover', runId }),
    activity: mutation.isPending ? (mutation.variables ?? null) : null,
    outcome: mutation.data ?? null,
    failure,
    resetFeedback: mutation.reset,
  };
}
