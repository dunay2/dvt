import { Pool } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { resolvePostgresConnectionString } from './PostgresAdapterConnectionString.js';
import {
  POSTGRES_ADAPTER_ERROR_CONSTANTS as E,
  POSTGRES_ADAPTER_RUNTIME_CONSTANTS as C,
} from './PostgresAdapterConstants.js';
import { getBackpressureSnapshotSql } from './PostgresBackpressureSnapshotReaderSql.js';
import { enterPostgresMaintenanceContext } from './PostgresMaintenanceAccess.js';
import { POSTGRES_SERVICE_ACCESS } from './PostgresServiceAccessCapability.js';
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

const BACKPRESSURE_SNAPSHOT_SERVICE_ACCESS = POSTGRES_SERVICE_ACCESS.backpressureSnapshotReader;

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
  private readonly clientSession: PostgresAdapterClientSession;
  private readonly queryTimeoutMs: number;
  private readonly stuckEventAgeThresholdMs: number;
  private readonly localOverloadPendingThreshold: number;

  public constructor(config: PostgresBackpressureSnapshotReaderConfig) {
    this.schema = normalizeSchema(config.schema ?? C.defaultSchema);
    this.now = config.now ?? (() => new Date().toISOString());
    this.queryTimeoutMs =
      config.queryTimeoutMs ?? Number(process.env[C.queryTimeoutEnvVar] ?? C.defaultTimeoutMs);
    this.stuckEventAgeThresholdMs = config.stuckEventAgeThresholdMs;
    this.localOverloadPendingThreshold = config.localOverloadPendingThreshold;

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      const connectionString = resolvePostgresConnectionString(config.connectionString);
      this.pool = new Pool({
        connectionString,
        query_timeout: this.queryTimeoutMs,
      });
      this.ownsPool = true;
    }
    this.clientSession = new PostgresAdapterClientSession(this.pool, 0);
  }

  public async close(): Promise<void> {
    await this.clientSession.close(this.ownsPool);
  }

  public async getTenantSnapshot(tenantId: string): Promise<PostgresBackpressureSnapshot> {
    assertTenantId(tenantId);
    const nowIso = this.now();
    const stuckCutoffIso = calculateStuckCutoffIso(nowIso, this.stuckEventAgeThresholdMs);

    const result = await this.clientSession.withClient(async (client) => {
      await enterPostgresMaintenanceContext(client, BACKPRESSURE_SNAPSHOT_SERVICE_ACCESS);
      return client.query<BackpressureSnapshotRow>({
        text: getBackpressureSnapshotSql(this.schema),
        values: [tenantId, nowIso, stuckCutoffIso, this.localOverloadPendingThreshold],
        ...(this.queryTimeoutMs > C.defaultTimeoutMs
          ? { signal: globalThis.AbortSignal.timeout(this.queryTimeoutMs) }
          : {}),
      });
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
    throw new Error(E.tenantScopeRequiredErrorMessage);
  }
}

function calculateStuckCutoffIso(nowIso: string, thresholdMs: number): string {
  const nowMs = new Date(nowIso).getTime();
  return new Date(nowMs - thresholdMs).toISOString();
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
