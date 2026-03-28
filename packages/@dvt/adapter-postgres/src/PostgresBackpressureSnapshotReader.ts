import { Pool } from 'pg';

import { getBackpressureSnapshotSql } from './PostgresBackpressureSnapshotReaderSql.js';
import { normalizeSchema } from './sqlUtils.js';

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
    assertTenantId(tenantId);
    const nowIso = this.now();
    const stuckCutoffIso = new Date(
      new Date(nowIso).getTime() - this.stuckEventAgeThresholdMs
    ).toISOString();

    const result = await this.pool.query<BackpressureSnapshotRow>({
      text: getBackpressureSnapshotSql(this.schema),
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

function assertTenantId(tenantId: string): void {
  if (tenantId.trim().length === 0) {
    throw new Error('TENANT_SCOPE_REQUIRED');
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
