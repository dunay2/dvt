/**
 * Owned concern: define the production tenant-isolation table catalog, RLS
 * policy SQL, and transaction-local access context used by the Postgres adapter.
 */
import { quoteIdentifier } from './sqlUtils.js';

export interface TenantIsolationTable {
  readonly name: string;
  readonly tenantColumn: string;
}

export const START_RUN_INTENTS_TENANT_ISOLATION_TABLE: TenantIsolationTable = {
  name: 'start_run_intents',
  tenantColumn: 'tenant_id',
} as const;

export const CORE_TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
  { name: 'run_metadata', tenantColumn: 'tenant_id' },
  { name: 'run_events', tenantColumn: 'tenant_id' },
  { name: 'run_snapshots', tenantColumn: 'tenant_id' },
  { name: 'outbox', tenantColumn: 'tenant_id' },
  { name: 'outbox_dead_letter', tenantColumn: 'tenant_id' },
  { name: 'lineage_outbox', tenantColumn: 'tenant_id' },
  { name: 'lineage_dead_letter', tenantColumn: 'tenant_id' },
  { name: 'run_event_heads', tenantColumn: 'tenant_id' },
  { name: 'snapshot_work_queue', tenantColumn: 'tenant_id' },
] as const;

export const START_RUN_INTENT_TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
  START_RUN_INTENTS_TENANT_ISOLATION_TABLE,
] as const;

export const TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
  ...CORE_TENANT_ISOLATION_TABLES,
  ...START_RUN_INTENT_TENANT_ISOLATION_TABLES,
] as const;

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
      set_config('dvt.access_mode', 'service', true)
  `;
}

export function buildTenantIsolationPolicySql(
  schema: string,
  table: TenantIsolationTable
): readonly string[] {
  const relation = `${quoteIdentifier(schema)}.${table.name}`;
  const tenantColumn = table.tenantColumn;
  const predicate = `
    current_setting('dvt.access_mode', true) = 'service'
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
