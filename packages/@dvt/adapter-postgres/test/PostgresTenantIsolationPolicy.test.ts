import { describe, expect, it } from 'vitest';

import {
  TENANT_ISOLATION_TABLES,
  buildTenantIsolationPolicySql,
  setServiceContextSql,
  setTenantContextSql,
} from '../src/PostgresTenantIsolationPolicy.js';

describe('PostgresTenantIsolationPolicy', () => {
  it('covers tenant-owned online tables with explicit tenant columns', () => {
    expect(TENANT_ISOLATION_TABLES.map((table) => table.name)).toEqual([
      'run_metadata',
      'run_events',
      'run_snapshots',
      'outbox',
      'outbox_dead_letter',
      'lineage_outbox',
      'lineage_dead_letter',
      'run_event_heads',
      'snapshot_work_queue',
      'start_run_intents',
    ]);
    expect(TENANT_ISOLATION_TABLES.every((table) => table.tenantColumn === 'tenant_id')).toBe(true);
  });

  it('uses transaction-local tenant and service contexts', () => {
    expect(setTenantContextSql()).toContain("set_config('dvt.tenant_id', $1, true)");
    expect(setTenantContextSql()).toContain("set_config('dvt.access_mode', 'tenant', true)");
    expect(setServiceContextSql()).toContain("set_config('dvt.access_mode', 'service', true)");
  });

  it('builds RLS policies that deny missing context and require table-scoped service owners', () => {
    const runMetadataTable = TENANT_ISOLATION_TABLES.find((table) => table.name === 'run_metadata');
    expect(runMetadataTable?.serviceAccessOwners).toEqual([
      'backpressure-snapshot-reader',
      'run-metadata-tenant-resolver',
      'snapshot-staleness-query',
    ]);

    const statements = buildTenantIsolationPolicySql('DvtOps', runMetadataTable!).join('\n');

    expect(statements).toContain('ALTER TABLE "DvtOps"."run_metadata" ENABLE ROW LEVEL SECURITY');
    expect(statements).toContain('ALTER TABLE "DvtOps"."run_metadata" FORCE ROW LEVEL SECURITY');
    expect(statements).toContain('DROP POLICY IF EXISTS dvt_tenant_isolation');
    expect(statements).toContain('CREATE POLICY dvt_tenant_isolation');
    expect(statements).toContain("current_setting('dvt.access_mode', true) = 'service'");
    expect(statements).toContain("current_setting('dvt.service_access_owner', true)");
    expect(statements).toContain("current_setting('dvt.access_mode', true) = 'tenant'");
    expect(statements).toContain("'run-metadata-tenant-resolver'");
    expect(statements).not.toContain("'outbox-worker'");
    expect(statements).not.toContain("'run-archive-maintenance'");
    expect(statements).toContain("tenant_id = current_setting('dvt.tenant_id', true)");
  });
});
