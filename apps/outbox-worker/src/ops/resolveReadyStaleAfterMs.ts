import type { ActiveEnv } from '../plugins/env.js';

const READY_STALE_MULTIPLIER = 3;

export function resolveReadyStaleAfterMs(env: ActiveEnv): number {
  const steadyStateBudgetMs = Math.max(
    env.DVT_OUTBOX_WORKER_POLL_INTERVAL_MS,
    env.DVT_OUTBOX_WORKER_ERROR_BACKOFF_MS
  );
  const perRecordBudgetMs = Math.max(
    env.DVT_OUTBOX_EVENT_BUS_MODE === 'http' ? env.DVT_OUTBOX_HTTP_TIMEOUT_MS : 0,
    env.DVT_PG_QUERY_TIMEOUT_MS,
    env.DVT_PG_STATEMENT_TIMEOUT_MS
  );
  const inFlightBatchBudgetMs =
    perRecordBudgetMs === 0 ? 0 : env.DVT_OUTBOX_WORKER_BATCH_SIZE * perRecordBudgetMs;

  return Math.max(
    steadyStateBudgetMs * READY_STALE_MULTIPLIER,
    inFlightBatchBudgetMs + steadyStateBudgetMs
  );
}
