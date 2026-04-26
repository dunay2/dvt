import { describe, expect, it } from 'vitest';

import { PostgresSchemaManager } from '../src/PostgresSchemaManager.js';

type QueryRow = { exists?: boolean; version?: string };

class RecordingRollbackClient {
  public readonly queries: Array<{ sql: string; params?: unknown[] }> = [];
  public readonly deletedVersions: string[] = [];
  public releaseCalls = 0;

  constructor(public appliedVersions: string[]) {}

  async query(sql: string, params?: unknown[]): Promise<{ rows: QueryRow[]; rowCount: number }> {
    this.queries.push({ sql, params });

    if (sql.includes('SELECT version') && sql.includes('schema_migrations')) {
      return {
        rows: this.appliedVersions.map((version) => ({ version })),
        rowCount: this.appliedVersions.length,
      };
    }

    if (sql.includes('DELETE FROM') && sql.includes('schema_migrations')) {
      const version = params?.[1];
      if (typeof version === 'string') {
        this.deletedVersions.push(version);
        this.appliedVersions = this.appliedVersions.filter((applied) => applied !== version);
      }
      return { rows: [], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  release(): void {
    this.releaseCalls += 1;
  }
}

describe('PostgresSchemaManager rollback', () => {
  it('plans rollback steps in reverse order for a known target version', async () => {
    const client = new RecordingRollbackClient([
      'core_001_initial_tables',
      'core_002_run_snapshots_table',
      'core_003_outbox_dead_letter_table',
    ]);
    const manager = new PostgresSchemaManager({ connect: async () => client } as never, 'DvtOps');

    const plan = await manager.planRollback('core_001_initial_tables');

    expect(plan.currentVersion).toBe('core_003_outbox_dead_letter_table');
    expect(plan.targetVersion).toBe('core_001_initial_tables');
    expect(plan.steps.map((step) => step.version)).toEqual([
      'core_003_outbox_dead_letter_table',
      'core_002_run_snapshots_table',
    ]);
  });

  it('rejects unknown rollback target versions', async () => {
    const client = new RecordingRollbackClient(['core_001_initial_tables']);
    const manager = new PostgresSchemaManager({ connect: async () => client } as never, 'DvtOps');

    await expect(manager.planRollback('core_999_missing')).rejects.toThrow(
      /UNKNOWN_MIGRATION_VERSION/
    );
  });

  it('rejects rollback targets that are not applied in the current schema', async () => {
    const client = new RecordingRollbackClient(['core_001_initial_tables']);
    const manager = new PostgresSchemaManager({ connect: async () => client } as never, 'DvtOps');

    await expect(manager.rollbackTo('core_003_outbox_dead_letter_table')).rejects.toThrow(
      /ROLLBACK_TARGET_NOT_APPLIED/
    );
  });

  it('rolls back applied steps in reverse order and clears ready state', async () => {
    const client = new RecordingRollbackClient([
      'core_001_initial_tables',
      'core_002_run_snapshots_table',
      'core_003_outbox_dead_letter_table',
    ]);
    const manager = new PostgresSchemaManager({ connect: async () => client } as never, 'DvtOps');
    manager.markReady();

    const plan = await manager.rollbackTo('core_001_initial_tables');

    expect(plan.steps.map((step) => step.version)).toEqual([
      'core_003_outbox_dead_letter_table',
      'core_002_run_snapshots_table',
    ]);
    expect(client.deletedVersions).toEqual([
      'core_003_outbox_dead_letter_table',
      'core_002_run_snapshots_table',
    ]);
    expect(
      client.queries.some((query) =>
        query.sql.includes('DROP TABLE IF EXISTS "DvtOps".outbox_dead_letter')
      )
    ).toBe(true);
    expect(
      client.queries.some((query) =>
        query.sql.includes('DROP TABLE IF EXISTS "DvtOps".run_snapshots')
      )
    ).toBe(true);
    expect(() => manager.ready()).toThrow(/MIGRATE_NOT_CALLED/);
  });

  it('treats hardening rollback as no-downgrade policy reapplication', async () => {
    const client = new RecordingRollbackClient([
      'core_001_initial_tables',
      'core_002_run_snapshots_table',
      'core_003_outbox_dead_letter_table',
      'core_004_lineage_tables',
      'core_005_archive_catalog_tables',
      'core_006_archive_lease_restore_tables',
      'core_007_compat_columns',
      'core_008_compat_cleanup',
      'core_009_core_indexes',
      'core_010_purge_indexes',
      'core_011_retry_lineage_columns',
      'core_012_lineage_outbox_retry_schedule',
      'core_013_lineage_outbox_claim_timeout',
      'core_014_lineage_tenant_scope_hardening',
      'core_015_run_event_heads',
      'core_016_snapshot_work_queue',
      'core_017_tenant_rls_baseline',
      'core_018_service_access_owner_rls_hardening',
      'core_019_table_scoped_service_owner_rls',
      'core_020_run_events_tenant_run_idx',
    ]);
    const manager = new PostgresSchemaManager({ connect: async () => client } as never, 'DvtOps');

    const plan = await manager.rollbackTo('core_017_tenant_rls_baseline');

    expect(plan.steps.map((step) => step.version)).toEqual([
      'core_020_run_events_tenant_run_idx',
      'core_019_table_scoped_service_owner_rls',
      'core_018_service_access_owner_rls_hardening',
    ]);
    expect(plan.steps[1]?.rollbackDescription).toContain('intentionally not downgraded');
    expect(plan.steps[2]?.rollbackDescription).toContain('intentionally not downgraded');

    const executedSql = client.queries.map((query) => query.sql).join('\n');
    expect(executedSql).toContain('CREATE POLICY dvt_tenant_isolation');
    expect(executedSql).not.toContain('DISABLE ROW LEVEL SECURITY');
  });
});
