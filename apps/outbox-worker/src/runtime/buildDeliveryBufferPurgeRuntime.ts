import { PostgresDeliveryBufferPurgeStore } from '@dvt/adapter-postgres';
import { DeliveryBufferPurger } from '@dvt/state-store';
import type { Pool } from 'pg';

import type { ActiveEnv } from '../plugins/env.js';

import { DeliveryBufferPurgeRuntime } from './DeliveryBufferPurgeRuntime.js';
import type { OutboxWorkerRuntimeLogger } from './OutboxWorkerRuntime.js';

export function buildDeliveryBufferPurgeRuntime(
  env: ActiveEnv,
  pool: Pool,
  logger: OutboxWorkerRuntimeLogger
): DeliveryBufferPurgeRuntime {
  const purgeStore = new PostgresDeliveryBufferPurgeStore(env.DVT_PG_SCHEMA, pool as never);
  const purger = new DeliveryBufferPurger({ store: purgeStore });
  const policy = {
    deliveredOutboxRetentionDays: env.DVT_PURGE_DELIVERED_OUTBOX_RETENTION_DAYS,
    outboxDeadLetterRetentionDays: env.DVT_PURGE_OUTBOX_DEAD_LETTER_RETENTION_DAYS,
    lineageDeadLetterRetentionDays: env.DVT_PURGE_LINEAGE_DEAD_LETTER_RETENTION_DAYS,
    maxRowsPerRun: env.DVT_PURGE_MAX_ROWS_PER_RUN,
  };
  return new DeliveryBufferPurgeRuntime(
    () => purger.purge(policy),
    env.DVT_PURGE_INTERVAL_MS,
    logger
  );
}
