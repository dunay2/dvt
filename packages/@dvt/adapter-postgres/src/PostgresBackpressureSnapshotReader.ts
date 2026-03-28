import { Pool } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';

export interface PostgresBackpressureSnapshot {
  readonly tenantActivePendingEventCount: number;
  readonly tenantStuckPendingEventCount: number;
  readonly globalActivePendingEventCount: number;
  readonly globalHealthyTenantOldestActiveAgeMs: number;
}

type PgSnapshotField = number | string | null;

interface BackpressureSnapshotRow {
  tenant_active_pending_event_count: PgSnapshotField;
  tenant_stuck_pending_event_count: PgSnapshotField;
  global_active_pending_event_count: PgSnapshotField;
  global_healthy_tenant_oldest_active_age_ms: PgSnapshotField;
}

export interface PostgresBackpressureSnapshotReaderConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
  queryTimeoutMs?: number;
  stuckEventAgeThresholdMs: number;
  localOverloadPendingThreshold: number;
}

export class PostgresBackpressureSnapshotReader {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly now: () => string;
  private readonly queryTimeoutMs: number;
  private readonly stuckEventAgeThresholdMs: number;
  private readonly localOverloadPendingThreshold: number;

  public constructor(config: PostgresBackpressureSnapshotReaderConfig) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.now = config.now ?? (() => new Date().toISOString());
    this.queryTimeoutMs =
      config.queryTimeoutMs ?? Number(process.env['DVT_PG_QUERY_TIMEOUT_MS'] ?? 0);
    this.stuckEventAgeThresholdMs = config.stuckEventAgeThresholdMs;
    this.localOverloadPendingThreshold = config.localOverloadPendingThreshold;

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString:
          config.connectionString ??
          process.env['DVT_PG_URL'] ??
          process.env['DATABASE_URL'] ??
          'postgresql://dvt:dvt@localhost:5432/dvt',
        query_timeout: this.queryTimeoutMs,
      });
      this.ownsPool = true;
    }
  }

  public async close(): Promise<void> {
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  public async getTenantSnapshot(tenantId: string): Promise<PostgresBackpressureSnapshot> {
    const nowIso = this.now();
    const stuckCutoffIso = new Date(
      new Date(nowIso).getTime() - this.stuckEventAgeThresholdMs
    ).toISOString();

    const result = await this.pool.query<BackpressureSnapshotRow>({
      text: `
        WITH active_outbox AS (
          SELECT m.tenant_id, o.created_at
          FROM ${quoteIdentifier(this.schema)}.outbox o
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = o.run_id
          WHERE o.delivered_at IS NULL
            AND o.created_at >= $3::timestamptz
        ),
        stuck_outbox AS (
          SELECT m.tenant_id
          FROM ${quoteIdentifier(this.schema)}.outbox o
          INNER JOIN ${quoteIdentifier(this.schema)}.run_metadata m ON m.run_id = o.run_id
          WHERE o.delivered_at IS NULL
            AND o.created_at < $3::timestamptz
        ),
        tenant_counts AS (
          SELECT
            tenant_id,
            COUNT(*)::integer AS active_pending_count,
            MIN(created_at) AS oldest_created_at
          FROM active_outbox
          GROUP BY tenant_id
        )
        SELECT
          COALESCE(
            (SELECT active_pending_count FROM tenant_counts WHERE tenant_id = $1),
            0
          )::integer AS tenant_active_pending_event_count,
          COALESCE(
            (SELECT COUNT(*) FROM stuck_outbox WHERE tenant_id = $1),
            0
          )::integer AS tenant_stuck_pending_event_count,
          COALESCE((SELECT COUNT(*) FROM active_outbox), 0)::integer AS global_active_pending_event_count,
          COALESCE(
            (
              SELECT FLOOR(EXTRACT(EPOCH FROM (($2::timestamptz) - MIN(oldest_created_at))) * 1000)
              FROM tenant_counts
              WHERE active_pending_count <= $4
            ),
            0
          )::bigint AS global_healthy_tenant_oldest_active_age_ms
      `,
      values: [tenantId, nowIso, stuckCutoffIso, this.localOverloadPendingThreshold],
      ...(this.queryTimeoutMs > 0
        ? { signal: globalThis.AbortSignal.timeout(this.queryTimeoutMs) }
        : {}),
    });

    const row = result.rows[0];
    if (!row) {
      return {
        tenantActivePendingEventCount: 0,
        tenantStuckPendingEventCount: 0,
        globalActivePendingEventCount: 0,
        globalHealthyTenantOldestActiveAgeMs: 0,
      };
    }

    return {
      tenantActivePendingEventCount: toNumber(row.tenant_active_pending_event_count),
      tenantStuckPendingEventCount: toNumber(row.tenant_stuck_pending_event_count),
      globalActivePendingEventCount: toNumber(row.global_active_pending_event_count),
      globalHealthyTenantOldestActiveAgeMs: toNumber(
        row.global_healthy_tenant_oldest_active_age_ms
      ),
    };
  }
}

function toNumber(value: number | string | null): number {
  if (value === null) {
    return 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
