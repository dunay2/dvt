/**
 * @file packages/@dvt/traceability-service/src/lineage/runtime/lineageWorkerDeadLetterSupport.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Manage lineage dead-letter counting, alerting, and replay as worker-owned recovery behavior
 * @consequence Failed traceability delivery can be recovered without rewriting immutable run events
 * @version 0.1.0
 */
import type { ILineageOutboxStore } from '../contracts.js';
import { toLineageErrorLike } from '../errorSupport.js';
import type { LineageWorkerRuntimeLogger } from '../LineageWorkerRuntime.js';

interface LineageDeadLetterAutoReplayArgs {
  autoReplayBatchSize: number;
  autoReplayEnabled: boolean;
  deadLetterCount: number | null;
  deadLetterTenantId: string | null;
  logger: LineageWorkerRuntimeLogger;
  store: ILineageOutboxStore;
}

interface LineageDeadLetterAutoReplayPlan {
  deadLetterCount: number;
  deadLetterTenantId: string;
  replayBatchSize: number;
  replayDeadLetters: NonNullable<ILineageOutboxStore['replayDeadLetters']>;
}

interface LineageDeadLetterBacklogAlertArgs {
  deadLetterAlertThreshold: number;
  deadLetterCount: number | null;
  deadLetterTenantId: string | null;
  logger: LineageWorkerRuntimeLogger;
}

export async function collectLineageDeadLetterCount(args: {
  deadLetterTenantId: string | null;
  logger: LineageWorkerRuntimeLogger;
  store: ILineageOutboxStore;
}): Promise<number | null> {
  const { deadLetterTenantId, logger, store } = args;

  if (deadLetterTenantId === null || store.countDeadLetter === undefined) {
    return null;
  }

  try {
    return await store.countDeadLetter(deadLetterTenantId);
  } catch (err) {
    logger.error(
      { err: toLineageErrorLike(err), tenantId: deadLetterTenantId },
      'lineage worker: dead-letter count failed'
    );
    return null;
  }
}

export async function runLineageDeadLetterAutoReplay(
  args: LineageDeadLetterAutoReplayArgs
): Promise<void> {
  const plan = resolveLineageDeadLetterAutoReplayPlan(args);
  if (plan === null) {
    return;
  }

  try {
    const moved = await replayLineageDeadLetters(plan);
    maybeLogLineageDeadLetterReplayMove(args.logger, plan, moved);
  } catch (err) {
    logLineageDeadLetterReplayFailure(args.logger, plan, err);
  }
}

export function maybeAlertLineageDeadLetterBacklog(args: LineageDeadLetterBacklogAlertArgs): void {
  const { deadLetterAlertThreshold, deadLetterCount, deadLetterTenantId, logger } = args;

  if (!shouldAlertLineageDeadLetterBacklog(args)) {
    return;
  }

  logger.warn?.(
    {
      tenantId: deadLetterTenantId,
      deadLetterLag: deadLetterCount,
      deadLetterAlertThreshold,
    },
    'lineage worker: dead-letter backlog threshold reached'
  );
}

function resolveLineageDeadLetterAutoReplayPlan(
  args: LineageDeadLetterAutoReplayArgs
): LineageDeadLetterAutoReplayPlan | null {
  const { autoReplayBatchSize, autoReplayEnabled, deadLetterCount, deadLetterTenantId, store } =
    args;
  const replayDeadLetters = store.replayDeadLetters;

  if (
    deadLetterCount === null ||
    deadLetterCount === 0 ||
    !autoReplayEnabled ||
    deadLetterTenantId === null ||
    replayDeadLetters === undefined
  ) {
    return null;
  }

  return {
    deadLetterCount,
    deadLetterTenantId,
    replayBatchSize: autoReplayBatchSize,
    replayDeadLetters,
  };
}

async function replayLineageDeadLetters(plan: LineageDeadLetterAutoReplayPlan): Promise<number> {
  return plan.replayDeadLetters({
    tenantId: plan.deadLetterTenantId,
    limit: plan.replayBatchSize,
  });
}

function maybeLogLineageDeadLetterReplayMove(
  logger: LineageWorkerRuntimeLogger,
  plan: LineageDeadLetterAutoReplayPlan,
  moved: number
): void {
  if (moved === 0) {
    return;
  }

  logger.warn?.(
    {
      moved,
      tenantId: plan.deadLetterTenantId,
      replayBatchSize: plan.replayBatchSize,
      deadLetterLagBeforeReplay: plan.deadLetterCount,
    },
    'lineage worker: automatic dead-letter replay moved records back to pending'
  );
}

function logLineageDeadLetterReplayFailure(
  logger: LineageWorkerRuntimeLogger,
  plan: LineageDeadLetterAutoReplayPlan,
  error: unknown
): void {
  logger.error(
    {
      err: toLineageErrorLike(error),
      tenantId: plan.deadLetterTenantId,
      replayBatchSize: plan.replayBatchSize,
    },
    'lineage worker: automatic dead-letter replay failed'
  );
}

function shouldAlertLineageDeadLetterBacklog(args: LineageDeadLetterBacklogAlertArgs): boolean {
  const { deadLetterAlertThreshold, deadLetterCount, deadLetterTenantId } = args;
  return !(
    deadLetterCount === null ||
    deadLetterTenantId === null ||
    deadLetterAlertThreshold === 0 ||
    deadLetterCount < deadLetterAlertThreshold
  );
}
