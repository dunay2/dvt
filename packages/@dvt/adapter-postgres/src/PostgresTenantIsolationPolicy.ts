/**
 * Owned concern: define the production tenant-isolation table catalog, RLS
 * policy SQL, and transaction-local access context used by the Postgres adapter.
 */
import { quoteIdentifier } from './sqlUtils.js';

export interface TenantIsolationTable {
  readonly name: string;
  readonly tenantColumn: string;
}

export const TENANT_ISOLATION_TABLES: readonly TenantIsolationTable[] = [
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
    `DROP POLICY IF EXISTS dvt_tenant_isolation ON ${relation}`,
    `
      CREATE POLICY dvt_tenant_isolation ON ${relation}
      FOR ALL
      USING (${predicate})
      WITH CHECK (${predicate})
    `,
  ];
}

export function buildDropTenantIsolationPolicySql(schema: string): readonly string[] {
  return TENANT_ISOLATION_TABLES.flatMap((table) => {
    const relation = `${quoteIdentifier(schema)}.${table.name}`;
    return [
      `DROP POLICY IF EXISTS dvt_tenant_isolation ON ${relation}`,
      `ALTER TABLE ${relation} DISABLE ROW LEVEL SECURITY`,
    ];
  });
}
