/**
 * @file packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Tenant-owned Postgres tables use forced RLS with tenant context or approved service owners.
 * @consequence Storage isolation no longer relies only on application predicates or table ownership.
 * @version 1.0.0
 *
 * Owned concern: define the production tenant-isolation table catalog, RLS
 * policy SQL, and transaction-local access context used by the Postgres adapter.
 */
import {
  POSTGRES_SERVICE_ACCESS,
  type PostgresServiceAccessOwner,
} from './PostgresServiceAccessCapability.js';
import { quoteIdentifier } from './sqlUtils.js';

export interface TenantIsolationTable {
  readonly name: string;
  readonly tenantColumn: string;
  readonly serviceAccessOwners: readonly PostgresServiceAccessOwner[];
}

export const START_RUN_INTENTS_TENANT_ISOLATION_TABLE: TenantIsolationTable = {
  name: 'start_run_intents',
  tenantColumn: 'tenant_id',
  serviceAccessOwners: [POSTGRES_SERVICE_ACCESS.startRunIntentReconciler.owner],
} as const;

export const CORE_TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
  {
    name: 'run_metadata',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [
      POSTGRES_SERVICE_ACCESS.backpressureSnapshotReader.owner,
      POSTGRES_SERVICE_ACCESS.runMetadataTenantResolver.owner,
      POSTGRES_SERVICE_ACCESS.snapshotStalenessQuery.owner,
    ],
  },
  {
    name: 'run_events',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [
      POSTGRES_SERVICE_ACCESS.runArchiveMaintenance.owner,
      POSTGRES_SERVICE_ACCESS.snapshotStalenessQuery.owner,
    ],
  },
  {
    name: 'run_snapshots',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [
      POSTGRES_SERVICE_ACCESS.runArchiveMaintenance.owner,
      POSTGRES_SERVICE_ACCESS.snapshotStalenessQuery.owner,
      POSTGRES_SERVICE_ACCESS.snapshotWorkQueue.owner,
    ],
  },
  {
    name: 'outbox',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [
      POSTGRES_SERVICE_ACCESS.backpressureSnapshotReader.owner,
      POSTGRES_SERVICE_ACCESS.deliveryBufferPurge.owner,
      POSTGRES_SERVICE_ACCESS.outboxWorker.owner,
    ],
  },
  {
    name: 'outbox_dead_letter',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [
      POSTGRES_SERVICE_ACCESS.deliveryBufferPurge.owner,
      POSTGRES_SERVICE_ACCESS.outboxWorker.owner,
    ],
  },
  {
    name: 'lineage_outbox',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [POSTGRES_SERVICE_ACCESS.lineageOutboxWorker.owner],
  },
  {
    name: 'lineage_dead_letter',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [
      POSTGRES_SERVICE_ACCESS.deliveryBufferPurge.owner,
      POSTGRES_SERVICE_ACCESS.lineageOutboxWorker.owner,
    ],
  },
  {
    name: 'run_event_heads',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [POSTGRES_SERVICE_ACCESS.snapshotStalenessQuery.owner],
  },
  {
    name: 'snapshot_work_queue',
    tenantColumn: 'tenant_id',
    serviceAccessOwners: [POSTGRES_SERVICE_ACCESS.snapshotWorkQueue.owner],
  },
] as const;

export const START_RUN_INTENT_TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
  START_RUN_INTENTS_TENANT_ISOLATION_TABLE,
] as const;

export const TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
  ...CORE_TENANT_ISOLATION_TABLES,
  ...START_RUN_INTENT_TENANT_ISOLATION_TABLES,
] as const;

export const POSTGRES_RLS_SERVICE_ACCESS_OWNERS = Object.freeze(
  Object.values(POSTGRES_SERVICE_ACCESS).map((capability) => capability.owner)
) satisfies readonly PostgresServiceAccessOwner[];

export function setTenantContextSql(): string {
  return `
    SELECT
      set_config('dvt.tenant_id', $1, true),
      set_config('dvt.access_mode', 'tenant', true)
  `;
}

export function setServiceContextSql(): string {
  return `
    SELECT
      set_config('dvt.tenant_id', '', true),
      set_config('dvt.access_mode', 'service', true),
      set_config('dvt.service_access_owner', $1, true)
  `;
}

export function buildTenantIsolationPolicySql(
  schema: string,
  table: TenantIsolationTable
): readonly string[] {
  const relation = `${quoteIdentifier(schema)}.${table.name}`;
  const tenantColumn = table.tenantColumn;
  const serviceAccessOwnerList = table.serviceAccessOwners.map(toSqlStringLiteral).join(', ');
  const predicate = `
    (
      current_setting('dvt.access_mode', true) = 'service'
      AND current_setting('dvt.service_access_owner', true) IN (${serviceAccessOwnerList})
    )
    OR ${tenantColumn} = current_setting('dvt.tenant_id', true)
  `;

  return [
    `ALTER TABLE ${relation} ENABLE ROW LEVEL SECURITY`,
    `ALTER TABLE ${relation} FORCE ROW LEVEL SECURITY`,
    `DROP POLICY IF EXISTS dvt_tenant_isolation ON ${relation}`,
    `
      CREATE POLICY dvt_tenant_isolation ON ${relation}
      FOR ALL
      USING (${predicate})
      WITH CHECK (${predicate})
    `,
  ];
}

export function buildDropTenantIsolationPolicySql(
  schema: string,
  tables: readonly TenantIsolationTable[] = TENANT_ISOLATION_TABLES
): readonly string[] {
  return tables.flatMap((table) => {
    const relation = `${quoteIdentifier(schema)}.${table.name}`;
    return [
      `DROP POLICY IF EXISTS dvt_tenant_isolation ON ${relation}`,
      `ALTER TABLE ${relation} NO FORCE ROW LEVEL SECURITY`,
      `ALTER TABLE ${relation} DISABLE ROW LEVEL SECURITY`,
    ];
  });
}

function toSqlStringLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
