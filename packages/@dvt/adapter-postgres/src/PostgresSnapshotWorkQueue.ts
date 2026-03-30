import type { PoolClient } from 'pg';

import { quoteIdentifier } from './sqlUtils.js';

type WithClient = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;

const MIN_BATCH_SIZE = 0;
const MAX_BATCH_SIZE = 1000;
const DEFAULT_CLAIM_TIMEOUT_MS = 300_000;
const INVALID_BATCH_SIZE_ERROR_CODE = 'INVALID_SNAPSHOT_WORK_BATCH_SIZE';
const INVALID_RETRY_DELAY_ERROR_CODE = 'INVALID_SNAPSHOT_WORK_RETRY_DELAY_MS';
const INVALID_CLAIM_TOKEN_ERROR_CODE = 'INVALID_SNAPSHOT_WORK_CLAIM_TOKEN';

export class PostgresSnapshotWorkQueue {
  constructor(
    private readonly schema: string,
    private readonly withClient: WithClient,
    private readonly claimTimeoutMs = DEFAULT_CLAIM_TIMEOUT_MS
  ) {}

  async claimSnapshotWork(
    batchSize: number
  ): Promise<Array<{ runId: string; tenantId: string; claimToken: string }>> {
    const boundedBatchSize = normalizeBatchSize(batchSize);
    if (boundedBatchSize === 0) {
      return [];
    }

    return this.withClient(async (client) => {
      const result = await client.query<{ run_id: string; tenant_id: string; claim_token: string }>(
        claimSnapshotWorkSql(this.schema),
        [boundedBatchSize, this.claimTimeoutMs]
      );
      return result.rows.map((row) => ({
        runId: row.run_id,
        tenantId: row.tenant_id,
        claimToken: row.claim_token,
      }));
    });
  }

  async completeSnapshotWork(tenantId: string, runId: string, claimToken: string): Promise<void> {
    const normalizedClaimToken = normalizeClaimToken(claimToken);
    await this.withClient((client) =>
      client.query(
        `
          WITH deleted AS (
            DELETE FROM ${quoteIdentifier(this.schema)}.snapshot_work_queue q
            USING ${quoteIdentifier(this.schema)}.run_snapshots s
            WHERE q.tenant_id = $1
              AND q.run_id = $2
              AND s.run_id = q.run_id
              AND q.latest_run_seq <= COALESCE(s.last_run_seq, 0)
              AND ${claimTokenSql('q.claimed_at')} = $3
            RETURNING q.run_id, q.tenant_id
          )
          UPDATE ${quoteIdentifier(this.schema)}.snapshot_work_queue q
          SET claimed_at = NULL,
              next_attempt_at = NULL,
              last_error = NULL
          WHERE q.tenant_id = $1
            AND q.run_id = $2
            AND NOT EXISTS (SELECT 1 FROM deleted)
            AND ${claimTokenSql('q.claimed_at')} = $3
        `,
        [tenantId, runId, normalizedClaimToken]
      )
    );
  }

  async failSnapshotWork(
    tenantId: string,
    runId: string,
    retryDelayMs: number,
    errorMessage: string,
    claimToken: string
  ): Promise<void> {
    const boundedRetryDelayMs = normalizeRetryDelay(retryDelayMs);
    const boundedErrorMessage = normalizeErrorMessage(errorMessage);
    const normalizedClaimToken = normalizeClaimToken(claimToken);
    await this.withClient((client) =>
      client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.snapshot_work_queue
          SET claimed_at = NULL,
              attempts = attempts + 1,
              last_error = $4,
              next_attempt_at = (NOW() + ($3::bigint * INTERVAL '1 millisecond'))
          WHERE tenant_id = $1
            AND run_id = $2
            AND ${claimTokenSql('claimed_at')} = $5
        `,
        [tenantId, runId, boundedRetryDelayMs, boundedErrorMessage, normalizedClaimToken]
      )
    );
  }
}

function claimSnapshotWorkSql(schema: string): string {
  return `
    WITH picked AS (
      SELECT q.run_id, q.tenant_id
      FROM ${quoteIdentifier(schema)}.snapshot_work_queue q
      LEFT JOIN ${quoteIdentifier(schema)}.run_snapshots s ON s.run_id = q.run_id
      WHERE q.latest_run_seq > COALESCE(s.last_run_seq, 0)
        AND (q.next_attempt_at IS NULL OR q.next_attempt_at <= NOW())
        AND (
          q.claimed_at IS NULL
          OR q.claimed_at < (NOW() - ($2::bigint * INTERVAL '1 millisecond'))
        )
      ORDER BY q.enqueued_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE ${quoteIdentifier(schema)}.snapshot_work_queue q
    SET claimed_at = NOW()
    FROM picked
    WHERE q.run_id = picked.run_id
      AND q.tenant_id = picked.tenant_id
    RETURNING q.run_id, q.tenant_id, ${claimTokenSql('q.claimed_at')} AS claim_token
  `;
}

function normalizeBatchSize(batchSize: number): number {
  if (!Number.isInteger(batchSize) || !Number.isFinite(batchSize) || batchSize < MIN_BATCH_SIZE) {
    throw new Error(`${INVALID_BATCH_SIZE_ERROR_CODE}: ${batchSize}`);
  }
  return Math.min(batchSize, MAX_BATCH_SIZE);
}

function normalizeRetryDelay(retryDelayMs: number): number {
  if (!Number.isInteger(retryDelayMs) || !Number.isFinite(retryDelayMs) || retryDelayMs < 0) {
    throw new Error(`${INVALID_RETRY_DELAY_ERROR_CODE}: ${retryDelayMs}`);
  }
  return retryDelayMs;
}

function normalizeErrorMessage(errorMessage: string): string {
  const normalized = errorMessage.trim();
  if (normalized.length === 0) {
    return 'unknown_error';
  }
  return normalized.slice(0, 1024);
}

function normalizeClaimToken(claimToken: string): string {
  const normalized = claimToken.trim();
  if (normalized.length === 0) {
    throw new Error(`${INVALID_CLAIM_TOKEN_ERROR_CODE}: <empty>`);
  }
  return normalized;
}

function claimTokenSql(columnExpr: string): string {
  return `to_char(${columnExpr} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
}
