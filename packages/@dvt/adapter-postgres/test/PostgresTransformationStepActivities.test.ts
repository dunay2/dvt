import { Client } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

import { PostgresRelationalExecutionCapability } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

const schemaPrefix = `dvt_transform_it_${Date.now()}`;
const createdSchemas = new Set<string>();
let schemaCounter = 0;

function allocateSchema(): string {
  schemaCounter += 1;
  const schema = `${schemaPrefix}_${schemaCounter}`;
  createdSchemas.add(schema);
  return schema;
}

async function createClient(): Promise<Client> {
  const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DVT_PG_URL or DATABASE_URL is required for integration tests');
  }
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

afterAll(async () => {
  const client = await createClient().catch(() => null);
  if (!client) return;
  try {
    for (const schema of createdSchemas) {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    }
  } finally {
    await client.end();
  }
});

describe('PostgresRelationalExecutionCapability', () => {
  it('fails fast when no connection source is provided', () => {
    const previousPgUrl = process.env.DVT_PG_URL;
    const previousDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DVT_PG_URL;
    delete process.env.DATABASE_URL;

    try {
      expect(() => new PostgresRelationalExecutionCapability({})).toThrow(
        /POSTGRES_CONNECTION_STRING_REQUIRED/
      );
    } finally {
      if (typeof previousPgUrl === 'undefined') {
        delete process.env.DVT_PG_URL;
      } else {
        process.env.DVT_PG_URL = previousPgUrl;
      }
      if (typeof previousDatabaseUrl === 'undefined') {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl;
      }
    }
  });
});

describeIfPg('PostgresRelationalExecutionCapability integration', () => {
  it('prepares schema, materializes SQL, and captures materialization evidence', async () => {
    const schema = allocateSchema();
    const sinkTable = 'orders_daily';
    const client = await createClient();
    const capability = new PostgresRelationalExecutionCapability({
      connectionString: process.env.DVT_PG_URL ?? process.env.DATABASE_URL,
      nowIsoUtc: () => '2026-04-09T00:00:00.000Z',
    });

    try {
      const activities = capability.stepActivitiesByKind;
      const prepare = activities.get('PREPARE_POSTGRES_TRANSFORM');
      const transform = activities.get('POSTGRES_SQL_TRANSFORM');
      const capture = activities.get('CAPTURE_MATERIALIZATION_EVIDENCE');

      expect(prepare).toBeDefined();
      expect(transform).toBeDefined();
      expect(capture).toBeDefined();

      const prepareResult = await prepare!.execute(
        {
          stepId: 'prepare-1',
          kind: 'PREPARE_POSTGRES_TRANSFORM',
          dependsOn: [],
          stepTypeConfig: {
            targetSchema: schema,
          },
        },
        {}
      );
      expect(prepareResult).toEqual({ stepId: 'prepare-1', status: 'COMPLETED' });

      const transformResult = await transform!.execute(
        {
          stepId: 'transform-1',
          kind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['prepare-1'],
          stepTypeConfig: {
            sql: 'SELECT 1 AS order_id UNION ALL SELECT 2 AS order_id',
            sinkSchema: schema,
            sinkTable,
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {}
      );
      expect(transformResult).toEqual({ stepId: 'transform-1', status: 'COMPLETED' });

      const captureResult = await capture!.execute(
        {
          stepId: 'capture-1',
          kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
          dependsOn: ['transform-1'],
          stepTypeConfig: {
            environmentId: 'env-it',
            sinkSchema: schema,
            sinkTable,
          },
        },
        {}
      );

      expect(captureResult).toMatchObject({
        stepId: 'capture-1',
        status: 'COMPLETED',
        resultEvidence: {
          executor: 'postgres',
          environmentId: 'env-it',
          sinkTable: `${schema}.${sinkTable}`,
          rowsWritten: 2,
        },
      });

      const rows = await client.query<{ order_id: number }>(
        `SELECT order_id FROM ${quoteIdentifier(schema)}.${quoteIdentifier(sinkTable)} ORDER BY order_id`
      );
      expect(rows.rows).toEqual([{ order_id: 1 }, { order_id: 2 }]);
    } finally {
      await capability.close();
      await client.end();
    }
  });

  it('returns a failed step result when SQL execution is invalid', async () => {
    const schema = allocateSchema();
    const capability = new PostgresRelationalExecutionCapability({
      connectionString: process.env.DVT_PG_URL ?? process.env.DATABASE_URL,
      nowIsoUtc: () => '2026-04-09T00:00:00.000Z',
    });

    try {
      const prepare = capability.stepActivitiesByKind.get('PREPARE_POSTGRES_TRANSFORM');
      const transform = capability.stepActivitiesByKind.get('POSTGRES_SQL_TRANSFORM');

      await prepare!.execute(
        {
          stepId: 'prepare-invalid-sql',
          kind: 'PREPARE_POSTGRES_TRANSFORM',
          dependsOn: [],
          stepTypeConfig: {
            targetSchema: schema,
          },
        },
        {}
      );

      const result = await transform!.execute(
        {
          stepId: 'transform-invalid-sql',
          kind: 'POSTGRES_SQL_TRANSFORM',
          dependsOn: ['prepare-invalid-sql'],
          stepTypeConfig: {
            sql: 'SELECT * FROM missing_source_table',
            sinkSchema: schema,
            sinkTable: 'broken_sink',
            materialization: 'table',
            writeMode: 'replace',
          },
        },
        {}
      );

      expect(result).toMatchObject({
        stepId: 'transform-invalid-sql',
        status: 'FAILED',
        failureReason: 'POSTGRES_SQL_TRANSFORM_ERROR',
        retriable: false,
      });
      expect(result.error).toContain('missing_source_table');
    } finally {
      await capability.close();
    }
  });
});
