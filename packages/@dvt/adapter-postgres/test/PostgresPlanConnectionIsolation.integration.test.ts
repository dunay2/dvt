import { URL } from 'node:url';

import type { ExecutionPlan } from '@dvt/contracts';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import {
  PostgresPlanConnectionRejectedError,
  PostgresRelationalExecutionCapability,
  type PostgresPlanConnection,
  type RuntimeStepExecutionContext,
} from '../src/index.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

const CONNECTION_REF_A = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;
const CONNECTION_REF_B = { ...CONNECTION_REF_A, connectionId: 'warehouse-b' } as const;

describeIfPg('Postgres plan connection isolation (real PostgreSQL)', () => {
  it('keeps homonymous source and sink tables isolated by the connection fixed in each plan', async () => {
    const adminConnectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (adminConnectionString === undefined) {
      throw new Error('DVT_PG_URL or DATABASE_URL is required for integration tests');
    }

    const suffix = `${process.pid}_${Date.now().toString().slice(-8)}`;
    const databaseA = `pth2_connection_a_${suffix}`;
    const databaseB = `pth2_connection_b_${suffix}`;
    const connectionStringA = withDatabase(adminConnectionString, databaseA);
    const connectionStringB = withDatabase(adminConnectionString, databaseB);
    const adminPool = new Pool({ connectionString: adminConnectionString });
    const fallbackPool = new Pool({ connectionString: adminConnectionString });
    let capability: PostgresRelationalExecutionCapability | undefined;

    try {
      await adminPool.query(`CREATE DATABASE ${quoteDatabase(databaseA)}`);
      await adminPool.query(`CREATE DATABASE ${quoteDatabase(databaseB)}`);
      await seedHomonymousDatabase(connectionStringA, 'a-before');
      await seedHomonymousDatabase(connectionStringB, 'b-before');

      capability = new PostgresRelationalExecutionCapability({
        pool: fallbackPool,
        planConnectionResolver: {
          async resolveConnection(step): Promise<PostgresPlanConnection> {
            const connectionId = readStepConnectionId(step.stepTypeConfig);
            if (connectionId === CONNECTION_REF_A.connectionId) {
              return {
                connectionRef: CONNECTION_REF_A,
                credentialRef: 'postgres:warehouse-a',
                connectionString: connectionStringA,
              };
            }
            if (connectionId === CONNECTION_REF_B.connectionId) {
              return {
                connectionRef: CONNECTION_REF_B,
                credentialRef: 'postgres:warehouse-b',
                connectionString: connectionStringB,
              };
            }
            throw new PostgresPlanConnectionRejectedError('POSTGRES_PLAN_CONNECTION_NOT_ADMITTED');
          },
        },
        planPoolFactory: (binding) => new Pool({ connectionString: binding.connectionString }),
      });
      const transform = capability.stepActivitiesByKind.get('POSTGRES_SQL_TRANSFORM');
      expect(transform).toBeDefined();

      await expect(
        transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('plan-a'))
      ).resolves.toMatchObject({ status: 'COMPLETED' });
      await expect(
        transform!.execute(transformStep(CONNECTION_REF_B), runtimeContext('plan-b'))
      ).resolves.toMatchObject({ status: 'COMPLETED' });
      await expect(readSinkMarkers(connectionStringA)).resolves.toEqual(['a-before']);
      await expect(readSinkMarkers(connectionStringB)).resolves.toEqual(['b-before']);

      await replaceSourceMarkers(connectionStringA, 'a-after');
      await replaceSourceMarkers(connectionStringB, 'b-after');

      // The editable Canvas may now point at B; the already admitted PlanRef A remains A.
      await expect(
        transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('old-plan-a'))
      ).resolves.toMatchObject({ status: 'COMPLETED' });
      await expect(readSinkMarkers(connectionStringA)).resolves.toEqual(['a-after']);
      await expect(readSinkMarkers(connectionStringB)).resolves.toEqual(['b-before']);
    } finally {
      await capability?.close();
      await fallbackPool.end();
      await dropDatabase(adminPool, databaseA);
      await dropDatabase(adminPool, databaseB);
      await adminPool.end();
    }
  }, 60_000);
});

function transformStep(
  connectionRef: typeof CONNECTION_REF_A | typeof CONNECTION_REF_B
): ExecutionPlan['steps'][number] {
  return {
    stepId: `transform-${connectionRef.connectionId}`,
    kind: 'POSTGRES_SQL_TRANSFORM',
    dependsOn: [`prepare-${connectionRef.connectionId}`],
    stepTypeConfig: {
      connectionRef,
      dialect: 'postgres',
      entrypoint: 'models/orders.sql',
      sql: 'select marker from raw.orders',
      sqlArtifact: {
        repo: 'org/repo',
        path: 'models/orders.sql',
        ref: 'refs/heads/main',
        commitSha: 'a'.repeat(40),
        contentSha256: 'b'.repeat(64),
      },
      sourceSchema: 'raw',
      sourceTable: 'orders',
      sourceAlias: 'orders',
      sinkSchema: 'analytics',
      sinkTable: 'orders',
      materialization: 'table',
      writeMode: 'replace',
    },
  };
}

function runtimeContext(runId: string): RuntimeStepExecutionContext {
  return {
    executionIdentity: { tenantId: 'tenant-a', environmentId: 'prod', runId },
    runContext: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'prod',
      runId,
      targetAdapter: 'temporal',
      logicalAttemptId: 1,
    },
  } as const;
}

async function seedHomonymousDatabase(connectionString: string, marker: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await pool.query('CREATE SCHEMA raw');
    await pool.query('CREATE SCHEMA analytics');
    await pool.query('CREATE TABLE raw.orders (marker text NOT NULL)');
    await pool.query('INSERT INTO raw.orders (marker) VALUES ($1)', [marker]);
  } finally {
    await pool.end();
  }
}

async function replaceSourceMarkers(connectionString: string, marker: string): Promise<void> {
  const pool = new Pool({ connectionString });
  try {
    await pool.query('TRUNCATE raw.orders');
    await pool.query('INSERT INTO raw.orders (marker) VALUES ($1)', [marker]);
  } finally {
    await pool.end();
  }
}

async function readSinkMarkers(connectionString: string): Promise<string[]> {
  const pool = new Pool({ connectionString });
  try {
    const result = await pool.query<{ marker: string }>(
      'SELECT marker FROM analytics.orders ORDER BY marker'
    );
    return result.rows.map(({ marker }) => marker);
  } finally {
    await pool.end();
  }
}

async function dropDatabase(adminPool: Pool, database: string): Promise<void> {
  await adminPool.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [database]
  );
  await adminPool.query(`DROP DATABASE IF EXISTS ${quoteDatabase(database)}`);
}

function withDatabase(connectionString: string, database: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${database}`;
  return url.toString();
}

function quoteDatabase(database: string): string {
  if (!/^[a-z0-9_]+$/.test(database)) {
    throw new Error('Generated PostgreSQL database name is invalid');
  }
  return `"${database}"`;
}

function readStepConnectionId(stepTypeConfig: unknown): string | undefined {
  if (typeof stepTypeConfig !== 'object' || stepTypeConfig === null) {
    return undefined;
  }
  const connectionRef = Reflect.get(stepTypeConfig, 'connectionRef');
  if (typeof connectionRef !== 'object' || connectionRef === null) {
    return undefined;
  }
  const connectionId = Reflect.get(connectionRef, 'connectionId');
  return typeof connectionId === 'string' ? connectionId : undefined;
}
