import { Client } from 'pg';
import { expect, test } from 'vitest';

import { listStaleSnapshotRunsSql } from '../src/PostgresSnapshotStalenessQuerySql.js';
import { PostgresStateStoreAdapter } from '../src/PostgresStateStoreAdapter.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import { describeIfPg } from './helpers/postgresIntegrationHarness.js';
import { NOW } from './helpers/runEventFixtures.js';

function requireConnectionString(): string {
  const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DVT_PG_URL or DATABASE_URL is required for integration tests');
  }
  return connectionString;
}

function makeSchemaName(): string {
  return `dvt_s19f1_it_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

async function withIsolatedSchema(
  fn: (ctx: { schema: string; adapter: PostgresStateStoreAdapter; client: Client }) => Promise<void>
): Promise<void> {
  const schema = makeSchemaName();
  const connectionString = requireConnectionString();
  const client = new Client({ connectionString });
  const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });

  await client.connect();
  try {
    await adapter.migrate();
    await fn({ schema, adapter, client });
  } finally {
    await adapter.close();
    await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    await client.end();
  }
}

describeIfPg('S19-F1-C snapshot queue closure (real PostgreSQL)', () => {
  test(
    'captures EXPLAIN plan and returns 5000 stale runs using run_event_heads path',
    () =>
      withIsolatedSchema(async ({ schema, adapter, client }) => {
        const quotedSchema = quoteIdentifier(schema);
        await client.query(
          `
          INSERT INTO ${quotedSchema}.run_metadata (
            run_id,
            tenant_id,
            project_id,
            environment_id,
            plan_id,
            plan_version,
            provider,
            provider_workflow_id,
            provider_run_id,
            logical_attempt_id,
            origin_run_id,
            next_retry_attempt_id
          )
          SELECT
            'run-' || gs::text,
            'tenant-1',
            'project-1',
            'dev',
            'plan-minimal',
            '1.0',
            'mock',
            'wf-' || gs::text,
            'pr-' || gs::text,
            1,
            'run-' || gs::text,
            2
          FROM generate_series(1, 5000) AS gs
        `
        );

        await client.query(
          `
          INSERT INTO ${quotedSchema}.run_events (
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
          SELECT
            'run-' || gs::text,
            1,
            'RunQueued',
            $1::timestamptz,
            'tenant-1',
            'project-1',
            'dev',
            1,
            1,
            'plan-minimal',
            '1.0',
            $1::timestamptz,
            'run-' || gs::text || ':queued',
            jsonb_build_object('status', 'queued')
          FROM generate_series(1, 5000) AS gs
        `,
          [NOW]
        );

        await client.query(
          `
          INSERT INTO ${quotedSchema}.run_event_heads (run_id, tenant_id, latest_run_seq, updated_at)
          SELECT
            'run-' || gs::text,
            'tenant-1',
            1,
            $1::timestamptz
          FROM generate_series(1, 5000) AS gs
        `,
          [NOW]
        );

        const explainResult = await client.query<{ 'QUERY PLAN': string }>(
          `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${listStaleSnapshotRunsSql(schema)}`,
          [5000]
        );
        const planText = explainResult.rows.map((row) => row['QUERY PLAN']).join('\n');

        expect(planText.toLowerCase()).toContain('run_event_heads');
        expect(planText.toLowerCase()).toContain('rows=5000');

        const staleRuns = await adapter.listStaleSnapshotRuns(5000);
        expect(staleRuns).toHaveLength(1000);
      }),
    30000
  );

  test(
    'concurrent claimers split snapshot work without duplicate claims',
    () =>
      withIsolatedSchema(async ({ schema, adapter: adapterA, client }) => {
        const adapterB = new PostgresStateStoreAdapter({ schema, now: () => NOW });

        await adapterB.migrate();
        try {
          const quotedSchema = quoteIdentifier(schema);
          await client.query(
            `
            INSERT INTO ${quotedSchema}.snapshot_work_queue (
              run_id,
              tenant_id,
              latest_run_seq,
              enqueued_at
            )
            SELECT
              'run-claim-' || gs::text,
              'tenant-1',
              1,
              $1::timestamptz
            FROM generate_series(1, 300) AS gs
          `,
            [NOW]
          );

          const [claimsA, claimsB] = await Promise.all([
            adapterA.claimSnapshotWork(200),
            adapterB.claimSnapshotWork(200),
          ]);

          const allClaims = [...claimsA, ...claimsB];
          const uniqueRunIds = new Set(
            allClaims.map((claim) => `${claim.tenantId}/${claim.runId}`)
          );

          expect(allClaims).toHaveLength(300);
          expect(uniqueRunIds.size).toBe(300);
        } finally {
          await adapterB.close();
        }
      }),
    30000
  );
});
