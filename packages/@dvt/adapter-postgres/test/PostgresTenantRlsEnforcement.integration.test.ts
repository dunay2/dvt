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
        AND c.relkind = 'r'
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
        AND c.relkind = 'r'
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
