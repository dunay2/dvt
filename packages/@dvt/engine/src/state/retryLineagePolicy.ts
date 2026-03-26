import type { RunMetadata } from '../contracts/runEvents.js';
import type { RetryAttemptReservation } from '../ports/IRunStateStore.js';

const FIRST_RETRY_LOGICAL_ATTEMPT = 2;

export interface RetryLineageCheckpoint {
  originRunId: string;
  previousNextAttempt: number | undefined;
}

export function reserveRetryAttemptFromSource(
  nextRetryAttemptByOriginRunId: Map<string, number>,
  sourceMeta: RunMetadata
): RetryAttemptReservation {
  const originRunId = resolveOriginRunId(sourceMeta);
  const nextAttempt = nextRetryAttemptByOriginRunId.get(originRunId) ?? FIRST_RETRY_LOGICAL_ATTEMPT;
  nextRetryAttemptByOriginRunId.set(originRunId, nextAttempt + 1);

  return {
    parentRunId: sourceMeta.runId,
    originRunId,
    logicalAttemptId: nextAttempt,
  };
}

export function initializeRetryLineageFromMetadata(
  nextRetryAttemptByOriginRunId: Map<string, number>,
  meta: RunMetadata
): void {
  const originRunId = resolveOriginRunId(meta);
  const nextAttempt = meta.logicalAttemptId + 1;
  const current = nextRetryAttemptByOriginRunId.get(originRunId) ?? FIRST_RETRY_LOGICAL_ATTEMPT;

  if (nextAttempt > current) {
    nextRetryAttemptByOriginRunId.set(originRunId, nextAttempt);
    return;
  }

  if (!nextRetryAttemptByOriginRunId.has(originRunId)) {
    nextRetryAttemptByOriginRunId.set(originRunId, current);
  }
}

export function captureRetryLineageCheckpoint(
  nextRetryAttemptByOriginRunId: Map<string, number>,
  meta: RunMetadata
): RetryLineageCheckpoint {
  const originRunId = resolveOriginRunId(meta);
  return {
    originRunId,
    previousNextAttempt: nextRetryAttemptByOriginRunId.get(originRunId),
  };
}

export function restoreRetryLineageCheckpoint(
  nextRetryAttemptByOriginRunId: Map<string, number>,
  checkpoint: RetryLineageCheckpoint
): void {
  if (checkpoint.previousNextAttempt === undefined) {
    nextRetryAttemptByOriginRunId.delete(checkpoint.originRunId);
    return;
  }
  nextRetryAttemptByOriginRunId.set(checkpoint.originRunId, checkpoint.previousNextAttempt);
}

function resolveOriginRunId(meta: RunMetadata): string {
  return meta.originRunId ?? meta.runId;
}
