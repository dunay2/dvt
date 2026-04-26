import { expect, it } from 'vitest';

import { PostgresStartRunIntentStore, PostgresStateStoreAdapter } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import {
  POSTGRES_RLS_PROOF_NOW,
  assertLeastPrivilegeApplicationRole,
  describeIfPg,
  usePostgresRlsProofHarness,
} from './helpers/postgresRlsProofHarness.js';
import { makeBootstrap, rid } from './helpers/runEventFixtures.js';

/**
 * Owned concern: prove online adapter operations run under the non-owner
 * PostgreSQL application role after schema setup has been performed by an
 * explicit admin role.
 */
describeIfPg('Postgres app-role adapter runtime', () => {
  const harness = usePostgresRlsProofHarness('dvt_app_role_it');

  it('runs tenant-scoped writes and reads as the non-owner app role', async () => {
    const schema = harness.allocateSchema();
    const adminAdapter = new PostgresStateStoreAdapter({
      connectionString: harness.connections.adminConnectionString,
      schema,
      now: () => POSTGRES_RLS_PROOF_NOW,
    });
    const appAdapter = new PostgresStateStoreAdapter({
      connectionString: harness.connections.appConnectionString,
      schema,
      now: () => POSTGRES_RLS_PROOF_NOW,
      assumeSchemaReady: true,
    });

    try {
      await adminAdapter.migrate();
      await harness.withAppClient((client) =>
        assertLeastPrivilegeApplicationRole(client, harness.connections.appRole)
      );
      await harness.grantStateStoreRuntimePrivileges(schema);
      await expectSchemaMigrationsInsertDenied(harness, schema);

      await appAdapter.bootstrapRunTx(makeBootstrap('run-app-role-a', 'tenant-a'));
      await appAdapter.bootstrapRunTx(makeBootstrap('run-app-role-b', 'tenant-b'));

      const tenantARuns = await appAdapter.listRuns({ tenantId: 'tenant-a' });
      expect(tenantARuns.map((run) => run.runId)).toEqual(['run-app-role-a']);
      await expect(
        appAdapter.getRunMetadataByRunId('tenant-b', 'run-app-role-a')
      ).resolves.toBeNull();
      await expect(appAdapter.getSnapshot('tenant-b', rid('run-app-role-a'))).resolves.toBeNull();
    } finally {
      await appAdapter.close();
      await adminAdapter.close();
    }
  }, 30000);

  it('runs start-run intent commands as the non-owner app role after admin migration', async () => {
    const schema = harness.allocateSchema();
    const adminIntentStore = new PostgresStartRunIntentStore({
      connectionString: harness.connections.adminConnectionString,
      schema,
      now: () => POSTGRES_RLS_PROOF_NOW,
    });
    const appIntentStore = new PostgresStartRunIntentStore({
      connectionString: harness.connections.appConnectionString,
      schema,
      now: () => POSTGRES_RLS_PROOF_NOW,
      assumeSchemaReady: true,
    });

    try {
      await adminIntentStore.migrate();
      await harness.grantStartRunIntentRuntimePrivileges(schema);
      await expectSchemaMigrationsInsertDenied(harness, schema);

      const created = await appIntentStore.createIntent({
        intentId: 'intent-app-role-a',
        tenantId: 'tenant-a',
        runId: 'run-intent-app-role-a',
        provider: 'temporal',
        createdAt: POSTGRES_RLS_PROOF_NOW,
      });
      expect(created.status).toBe('PENDING');

      await appIntentStore.markDispatched(
        { tenantId: 'tenant-a', intentId: 'intent-app-role-a' },
        {
          provider: 'temporal',
          tenantId: 'tenant-a',
          workflowId: 'wf-app-role-a',
          runId: 'run-intent-app-role-a',
          namespace: 'default',
        }
      );

      await expect(
        appIntentStore.getIntent({ tenantId: 'tenant-b', intentId: 'intent-app-role-a' })
      ).resolves.toBeNull();
      await expect(
        appIntentStore.getIntent({ tenantId: 'tenant-a', intentId: 'intent-app-role-a' })
      ).resolves.toMatchObject({ status: 'DISPATCHED' });
    } finally {
      await appIntentStore.close();
      await adminIntentStore.close();
    }
  }, 30000);
});

async function expectSchemaMigrationsInsertDenied(
  harness: ReturnType<typeof usePostgresRlsProofHarness>,
  schema: string
): Promise<void> {
  await harness.withAppClient(async (client) => {
    await expect(
      client.query(
        `
          INSERT INTO ${quoteIdentifier(schema)}.schema_migrations (
            component,
            version,
            description,
            applied_at
          )
          VALUES ('app-role-proof', 'forbidden', 'forbidden', now())
        `
      )
    ).rejects.toThrow(/permission denied/i);
  });
}
