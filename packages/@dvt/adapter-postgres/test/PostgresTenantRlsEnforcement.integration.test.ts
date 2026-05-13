import { Client } from 'pg';
import { expect, it } from 'vitest';

import { PostgresStartRunIntentStore, PostgresStateStoreAdapter } from '../src/index.js';
import { enterPostgresMaintenanceContext } from '../src/PostgresMaintenanceAccess.js';
import { POSTGRES_SERVICE_ACCESS } from '../src/PostgresServiceAccessCapability.js';
import {
  POSTGRES_RLS_SERVICE_ACCESS_OWNERS,
  TENANT_ISOLATION_TABLES,
  setTenantContextSql,
} from '../src/PostgresTenantIsolationPolicy.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import {
  POSTGRES_RLS_PROOF_NOW,
  type PostgresRlsProofHarness,
  assertLeastPrivilegeApplicationRole,
  describeIfPg,
  usePostgresRlsProofHarness,
} from './helpers/postgresRlsProofHarness.js';
import { makeBootstrap } from './helpers/runEventFixtures.js';

/**
 * Owned concern: prove real PostgreSQL forced-RLS behavior independently from
 * admin migration authority and from adapter-level tenant predicates.
 */
describeIfPg('Postgres RLS tenant isolation enforcement', () => {
  const harness = usePostgresRlsProofHarness('dvt_rls_it');

  it('rejects direct RLS proof roles that can bypass or create schema objects', async () => {
    await harness.withAppClient((client) =>
      assertLeastPrivilegeApplicationRole(client, harness.connections.appRole)
    );
  });

  it('protects every tenant table with forced RLS and table-scoped service owners', async () => {
    const schema = await prepareTenantIsolationSchema(harness);

    await harness.withAppClient(async (client) => {
      await assertTenantOwnedTableCatalogHasNoDrift(client, schema);
      await assertTenantIsolationCatalogIsProtected(client, schema);
    });
  }, 30000);

  it('rejects tenant-owned tables missing from the isolation catalog', async () => {
    const schema = await prepareTenantIsolationSchema(harness);
    await harness.withAdminClient((client) =>
      client.query(`
        CREATE TABLE ${quoteIdentifier(schema)}.rogue_tenant_rows (
          tenant_id text NOT NULL,
          row_id text NOT NULL
        )
      `)
    );

    await harness.withAppClient(async (client) => {
      await expect(assertTenantOwnedTableCatalogHasNoDrift(client, schema)).rejects.toThrow(
        /TENANT_TABLE_RLS_CATALOG_DRIFT:rogue_tenant_rows/
      );
    });
  }, 30000);

  it('returns only the tenant rows selected by direct tenant context', async () => {
    const schema = await prepareTenantIsolationSchema(harness, { seedRunMetadata: true });
    await harness.grantRlsProbePrivileges(schema);

    await harness.withAppClient(async (client) => {
      const tenantRows = await withTransaction(client, async () => {
        await client.query(setTenantContextSql(), ['tenant-a']);
        return client.query<{ run_id: string; tenant_id: string }>(
          `
            SELECT run_id, tenant_id
            FROM ${quoteIdentifier(schema)}.run_metadata
            ORDER BY run_id
          `
        );
      });

      expect(tenantRows.rows).toEqual([{ run_id: 'run-rls-a', tenant_id: 'tenant-a' }]);
    });
  }, 30000);

  it('returns zero tenant rows without tenant or service context', async () => {
    const schema = await prepareTenantIsolationSchema(harness, { seedRunMetadata: true });
    await harness.grantRlsProbePrivileges(schema);

    await harness.withAppClient(async (client) => {
      const missingContextRows = await withTransaction(client, () =>
        client.query(`SELECT run_id FROM ${quoteIdentifier(schema)}.run_metadata`)
      );

      expect(missingContextRows.rows).toEqual([]);
    });
  }, 30000);

  it('applies tenant-mode RLS across every tenant-owned catalog table', async () => {
    const schema = await prepareTenantIsolationSchema(harness);
    await seedTenantIsolationProbeRows(harness, schema);
    await harness.grantRlsProbePrivileges(schema);

    await harness.withAppClient(async (client) => {
      for (const table of TENANT_ISOLATION_TABLES) {
        const missingContextRows = await withTransaction(client, () =>
          selectDistinctTenantIds(client, schema, table.name)
        );
        expect(missingContextRows.rows, `${table.name} must deny missing context`).toEqual([]);

        const tenantIdOnlyRows = await withTransaction(client, async () => {
          await client.query("SELECT set_config('dvt.tenant_id', $1, true)", ['tenant-a']);
          return selectDistinctTenantIds(client, schema, table.name);
        });
        expect(tenantIdOnlyRows.rows, `${table.name} must deny partial tenant context`).toEqual([]);

        const tenantARows = await withTransaction(client, async () => {
          await client.query(setTenantContextSql(), ['tenant-a']);
          return selectDistinctTenantIds(client, schema, table.name);
        });
        expect(tenantARows.rows, `${table.name} must return only tenant-a rows`).toEqual([
          { tenant_id: 'tenant-a' },
        ]);

        const tenantBRows = await withTransaction(client, async () => {
          await client.query(setTenantContextSql(), ['tenant-b']);
          return selectDistinctTenantIds(client, schema, table.name);
        });
        expect(tenantBRows.rows, `${table.name} must return only tenant-b rows`).toEqual([
          { tenant_id: 'tenant-b' },
        ]);
      }
    });
  }, 30000);

  it('rejects direct tenant-owned writes when tenant context is missing or mismatched', async () => {
    const schema = await prepareTenantIsolationSchema(harness);
    await harness.grantStateStoreRuntimePrivileges(schema);

    await harness.withAppClient(async (client) => {
      await expect(
        withTransaction(client, () =>
          insertRunMetadataProbeRow(client, schema, {
            runId: 'run-rls-write-missing-context',
            tenantId: 'tenant-a',
          })
        )
      ).rejects.toThrow(/row-level security|permission denied/i);

      await expect(
        withTransaction(client, async () => {
          await client.query(setTenantContextSql(), ['tenant-a']);
          await insertRunMetadataProbeRow(client, schema, {
            runId: 'run-rls-write-wrong-tenant',
            tenantId: 'tenant-b',
          });
        })
      ).rejects.toThrow(/row-level security|permission denied/i);
    });
  }, 30000);

  it('allows approved service access only through the explicit maintenance context', async () => {
    const schema = await prepareTenantIsolationSchema(harness, { seedRunMetadata: true });
    await harness.grantRlsProbePrivileges(schema);

    await harness.withAppClient(async (client) => {
      const wrongServiceRows = await withTransaction(client, async () => {
        await enterPostgresMaintenanceContext(client, POSTGRES_SERVICE_ACCESS.outboxWorker);
        return client.query<{ run_id: string }>(
          `
            SELECT run_id
            FROM ${quoteIdentifier(schema)}.run_metadata
            ORDER BY run_id
          `
        );
      });
      expect(wrongServiceRows.rows).toEqual([]);

      const serviceRows = await withTransaction(client, async () => {
        await enterPostgresMaintenanceContext(
          client,
          POSTGRES_SERVICE_ACCESS.runMetadataTenantResolver
        );
        return client.query<{ run_id: string }>(
          `
            SELECT run_id
            FROM ${quoteIdentifier(schema)}.run_metadata
            ORDER BY run_id
          `
        );
      });

      expect(serviceRows.rows.map((row) => row.run_id)).toEqual(['run-rls-a', 'run-rls-b']);
    });
  }, 30000);
});

async function prepareTenantIsolationSchema(
  harness: PostgresRlsProofHarness,
  options: { seedRunMetadata?: boolean } = {}
): Promise<string> {
  const schema = harness.allocateSchema();
  const adapter = new PostgresStateStoreAdapter({
    connectionString: harness.connections.adminConnectionString,
    schema,
    now: () => POSTGRES_RLS_PROOF_NOW,
  });
  const intentStore = new PostgresStartRunIntentStore({
    connectionString: harness.connections.adminConnectionString,
    schema,
    now: () => POSTGRES_RLS_PROOF_NOW,
  });

  try {
    await adapter.migrate();
    await intentStore.migrate();
    if (options.seedRunMetadata === true) {
      await adapter.bootstrapRunTx(makeBootstrap('run-rls-a', 'tenant-a'));
      await adapter.bootstrapRunTx(makeBootstrap('run-rls-b', 'tenant-b'));
    }
    return schema;
  } finally {
    await intentStore.close();
    await adapter.close();
  }
}

async function assertTenantIsolationCatalogIsProtected(
  client: Client,
  schema: string
): Promise<void> {
  expect(POSTGRES_RLS_SERVICE_ACCESS_OWNERS.length).toBeGreaterThan(1);

  const result = await client.query<{
    relname: string;
    relrowsecurity: boolean;
    relforcerowsecurity: boolean;
    policyname: string | null;
    qual: string | null;
    with_check: string | null;
  }>(
    `
      SELECT
        c.relname,
        c.relrowsecurity,
        c.relforcerowsecurity,
        p.policyname,
        p.qual,
        p.with_check
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policies p
        ON p.schemaname = n.nspname
       AND p.tablename = c.relname
       AND p.policyname = 'dvt_tenant_isolation'
      WHERE n.nspname = $1
        AND c.relkind IN ('p', 'r')
        AND c.relname = ANY($2::text[])
      ORDER BY c.relname ASC
    `,
    [schema, TENANT_ISOLATION_TABLES.map((table) => table.name)]
  );

  const rowsByTable = new Map(result.rows.map((row) => [row.relname, row]));
  for (const table of TENANT_ISOLATION_TABLES) {
    const row = rowsByTable.get(table.name);
    expect(row, `missing RLS catalog table ${table.name}`).toBeDefined();
    expect(row?.relrowsecurity, `${table.name} must enable RLS`).toBe(true);
    expect(row?.relforcerowsecurity, `${table.name} must force RLS`).toBe(true);
    expect(row?.policyname, `${table.name} must define tenant policy`).toBe('dvt_tenant_isolation');
    expect(row?.qual, `${table.name} policy must use tenant column`).toContain(table.tenantColumn);
    expect(row?.with_check, `${table.name} policy must use tenant column`).toContain(
      table.tenantColumn
    );
    assertServiceOwnerCatalog(row?.qual, `${table.name} USING policy`, table);
    assertServiceOwnerCatalog(row?.with_check, `${table.name} WITH CHECK policy`, table);
  }
}

async function assertTenantOwnedTableCatalogHasNoDrift(
  client: Client,
  schema: string
): Promise<void> {
  const result = await client.query<{ relname: string }>(
    `
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a
        ON a.attrelid = c.oid
       AND a.attname = 'tenant_id'
       AND a.attisdropped = false
      WHERE n.nspname = $1
        AND c.relkind IN ('p', 'r')
      ORDER BY c.relname ASC
    `,
    [schema]
  );
  const catalogedTables = new Set(TENANT_ISOLATION_TABLES.map((table) => table.name));
  const missingTables = result.rows
    .map((row) => row.relname)
    .filter((tableName) => !catalogedTables.has(tableName));
  if (missingTables.length > 0) {
    throw new Error(`TENANT_TABLE_RLS_CATALOG_DRIFT:${missingTables.join(',')}`);
  }
}

function assertServiceOwnerCatalog(
  policySql: string | null | undefined,
  label: string,
  table: (typeof TENANT_ISOLATION_TABLES)[number]
): void {
  expect(policySql, `${label} must gate service bypass by owner`).toContain(
    'dvt.service_access_owner'
  );
  for (const owner of table.serviceAccessOwners) {
    expect(policyIncludesOwner(policySql, owner), `${label} must include ${owner}`).toBe(true);
  }
  for (const owner of POSTGRES_RLS_SERVICE_ACCESS_OWNERS) {
    if (table.serviceAccessOwners.includes(owner)) {
      continue;
    }
    expect(policyIncludesOwner(policySql, owner), `${label} must not include ${owner}`).toBe(false);
  }
}

async function seedTenantIsolationProbeRows(
  harness: PostgresRlsProofHarness,
  schema: string
): Promise<void> {
  await harness.withAdminClient((client) =>
    withTransaction(client, async () => {
      for (const tenantId of ['tenant-a', 'tenant-b'] as const) {
        await client.query(setTenantContextSql(), [tenantId]);
        for (const table of TENANT_ISOLATION_TABLES) {
          await insertTenantIsolationProbeRow(client, schema, table.name, tenantId);
        }
      }
    })
  );
}

async function selectDistinctTenantIds(
  client: Client,
  schema: string,
  tableName: string
): Promise<{ rows: Array<{ tenant_id: string }> }> {
  return client.query<{ tenant_id: string }>(
    `
      SELECT DISTINCT tenant_id
      FROM ${quoteIdentifier(schema)}.${quoteIdentifier(tableName)}
      ORDER BY tenant_id ASC
    `
  );
}

function policyIncludesOwner(
  policySql: string | null | undefined,
  owner: (typeof POSTGRES_RLS_SERVICE_ACCESS_OWNERS)[number]
): boolean {
  return policySql?.includes(`'${owner}'`) ?? false;
}

async function withTransaction<T>(client: Client, fn: () => Promise<T>): Promise<T> {
  await client.query('BEGIN');
  try {
    const result = await fn();
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function insertRunMetadataProbeRow(
  client: Client,
  schema: string,
  row: { runId: string; tenantId: string }
): Promise<void> {
  await client.query(
    `
      INSERT INTO ${quoteIdentifier(schema)}.run_metadata (
        run_id,
        tenant_id,
        project_id,
        environment_id,
        plan_id,
        plan_version,
        logical_attempt_id,
        origin_run_id,
        next_retry_attempt_id,
        provider,
        provider_workflow_id,
        provider_run_id,
        provider_namespace
      )
      VALUES ($1, $2, 'project-rls', 'env-rls', 'plan-rls', 'v1', 1, $1, 2, 'temporal', $1, $1, 'default')
    `,
    [row.runId, row.tenantId]
  );
}

async function insertTenantIsolationProbeRow(
  client: Client,
  schema: string,
  tableName: string,
  tenantId: 'tenant-a' | 'tenant-b'
): Promise<void> {
  const suffix = tenantId === 'tenant-a' ? 'a' : 'b';
  const runId = `run-rls-catalog-${tableName}-${suffix}`;
  const rowId = `rls-catalog-${tableName}-${suffix}`;

  if (/^run_events_h\d{2}$/.test(tableName)) {
    await insertRunEventsPartitionProbeRow(client, schema, tableName, tenantId);
    return;
  }

  switch (tableName) {
    case 'run_metadata':
      await insertRunMetadataProbeRow(client, schema, { runId, tenantId });
      return;
    case 'run_events':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.run_events (
            run_id,
            run_seq,
            event_type,
            emitted_at,
            tenant_id,
            project_id,
            environment_id,
            engine_attempt_id,
            logical_attempt_id,
            plan_id,
            plan_version,
            persisted_at,
            idempotency_key,
            payload
          )
          VALUES ($1, 1, 'RunQueued', $3, $2, 'project-rls', 'env-rls', 1, 1, 'plan-rls', 'v1', $3, $4, $5::jsonb)
        `,
        [runId, tenantId, POSTGRES_RLS_PROOF_NOW, `${rowId}:queued`, JSON.stringify({ tenantId })]
      );
      return;
    case 'run_snapshots':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.run_snapshots (
            run_id,
            tenant_id,
            snapshot,
            last_run_seq,
            updated_at
          )
          VALUES ($1, $2, $3::jsonb, 1, $4)
        `,
        [runId, tenantId, JSON.stringify({ status: 'PENDING' }), POSTGRES_RLS_PROOF_NOW]
      );
      return;
    case 'outbox':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.outbox (
            id,
            tenant_id,
            run_id,
            run_seq,
            created_at,
            idempotency_key,
            payload
          )
          VALUES ($1, $2, $3, 1, $4, $5, $6::jsonb)
        `,
        [rowId, tenantId, runId, POSTGRES_RLS_PROOF_NOW, `${rowId}:outbox`, JSON.stringify({})]
      );
      return;
    case 'outbox_dead_letter':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.outbox_dead_letter (
            id,
            original_id,
            tenant_id,
            run_id,
            payload,
            last_error,
            dead_lettered_at
          )
          VALUES ($1, $2, $3, $4, $5::jsonb, 'rls-proof', $6)
        `,
        [rowId, `${rowId}:original`, tenantId, runId, JSON.stringify({}), POSTGRES_RLS_PROOF_NOW]
      );
      return;
    case 'lineage_outbox':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.lineage_outbox (
            id,
            tenant_id,
            run_id,
            event_type,
            payload
          )
          VALUES ($1, $2, $3, 'RunQueued', $4::jsonb)
        `,
        [rowId, tenantId, runId, JSON.stringify({})]
      );
      return;
    case 'lineage_dead_letter':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.lineage_dead_letter (
            id,
            original_id,
            tenant_id,
            run_id,
            event_type,
            payload,
            last_error
          )
          VALUES ($1, $2, $3, $4, 'RunQueued', $5::jsonb, 'rls-proof')
        `,
        [rowId, `${rowId}:original`, tenantId, runId, JSON.stringify({})]
      );
      return;
    case 'run_event_heads':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.run_event_heads (
            run_id,
            tenant_id,
            latest_run_seq,
            updated_at
          )
          VALUES ($1, $2, 1, $3)
        `,
        [runId, tenantId, POSTGRES_RLS_PROOF_NOW]
      );
      return;
    case 'snapshot_work_queue':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.snapshot_work_queue (
            run_id,
            tenant_id,
            latest_run_seq,
            enqueued_at
          )
          VALUES ($1, $2, 1, $3)
        `,
        [runId, tenantId, POSTGRES_RLS_PROOF_NOW]
      );
      return;
    case 'start_run_intents':
      await client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.start_run_intents (
            intent_id,
            tenant_id,
            run_id,
            provider,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 'temporal', $4, $4)
        `,
        [rowId, tenantId, runId, POSTGRES_RLS_PROOF_NOW]
      );
      return;
    default:
      throw new Error(`UNHANDLED_TENANT_ISOLATION_PROBE_TABLE:${tableName}`);
  }
}

async function insertRunEventsPartitionProbeRow(
  client: Client,
  schema: string,
  targetPartition: string,
  tenantId: 'tenant-a' | 'tenant-b'
): Promise<void> {
  const suffix = tenantId === 'tenant-a' ? 'a' : 'b';

  for (let attempt = 0; attempt < 512; attempt += 1) {
    const runId = `run-rls-catalog-${targetPartition}-${suffix}-${attempt}`;
    const rowId = `rls-catalog-${targetPartition}-${suffix}-${attempt}`;
    const result = await client.query<{ inserted_relation: string }>(
      `
        INSERT INTO ${quoteIdentifier(schema)}.run_events (
          run_id,
          run_seq,
          event_type,
          emitted_at,
          tenant_id,
          project_id,
          environment_id,
          engine_attempt_id,
          logical_attempt_id,
          plan_id,
          plan_version,
          persisted_at,
          idempotency_key,
          payload
        )
        VALUES ($1, 1, 'RunQueued', $3, $2, 'project-rls', 'env-rls', 1, 1, 'plan-rls', 'v1', $3, $4, $5::jsonb)
        RETURNING tableoid::regclass::text AS inserted_relation
      `,
      [runId, tenantId, POSTGRES_RLS_PROOF_NOW, `${rowId}:queued`, JSON.stringify({ tenantId })]
    );

    if (result.rows[0]?.inserted_relation.endsWith(targetPartition)) {
      return;
    }
  }

  throw new Error(`RUN_EVENTS_PARTITION_PROBE_NOT_ROUTED:${targetPartition}`);
}
