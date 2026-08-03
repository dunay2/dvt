/** Owned concern: adapt run-control UI intents to authoritative Runs command rails. */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { queryKeys } from '../../queries/queryKeys';
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.runs.root() });
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

  const cancelRun = useCallback(
    (runId: string) => mutation.mutate({ action: 'cancel', runId }),
    [mutation.mutate]
  );
  const recoverRun = useCallback(
    (runId: string) => mutation.mutate({ action: 'recover', runId }),
    [mutation.mutate]
  );

  return useMemo(
    () => ({
      cancelRun,
      recoverRun,
      activity: mutation.isPending ? (mutation.variables ?? null) : null,
      outcome: mutation.data ?? null,
      failure,
      resetFeedback: mutation.reset,
    }),
    [
      cancelRun,
      failure,
      mutation.data,
      mutation.isPending,
      mutation.reset,
      mutation.variables,
      recoverRun,
    ]
  );
}

export type RunControlCommandController = ReturnType<typeof useRunControlCommands>;
