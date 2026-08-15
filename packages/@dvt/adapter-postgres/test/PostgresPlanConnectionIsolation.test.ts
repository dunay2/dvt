import type { ExecutionPlan } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import {
  PostgresPlanConnectionRejectedError,
  PostgresRelationalExecutionCapability,
  type PostgresPlanConnection,
  type RuntimeStepExecutionContext,
} from '../src/index.js';

const CONNECTION_REF_A = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;
const CONNECTION_REF_B = { ...CONNECTION_REF_A, connectionId: 'warehouse-b' } as const;
const CONNECTION_REF_C = { ...CONNECTION_REF_A, connectionId: 'warehouse-c' } as const;

describe('PostgresRelationalExecutionCapability plan connection isolation', () => {
  it('fails closed when SQL-first execution has no plan connection resolver', async () => {
    const globalPool = createPool();
    const capability = new PostgresRelationalExecutionCapability({
      pool: globalPool as never,
    });
    const transform = capability.stepActivitiesByKind.get('POSTGRES_SQL_TRANSFORM');

    await expect(
      transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('run-without-resolver'))
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureReason: 'POSTGRES_PLAN_CONNECTION_RESOLVER_REQUIRED',
      retriable: false,
    });
    expect(globalPool.connect).not.toHaveBeenCalled();
    await capability.close();
  });

  it('routes homonymous SQL to the connection fixed by each admitted plan', async () => {
    const poolA = createPool();
    const poolB = createPool();
    const pools = new Map([
      ['postgresql://warehouse-a/orders', poolA],
      ['postgresql://warehouse-b/orders', poolB],
    ]);
    const resolver = {
      resolveConnection: vi.fn(async (_step, context): Promise<PostgresPlanConnection> =>
        context.runId === 'run-a'
          ? {
              connectionRef: CONNECTION_REF_A,
              credentialRef: 'postgres:warehouse-a',
              connectionString: 'postgresql://warehouse-a/orders',
            }
          : {
              connectionRef: CONNECTION_REF_B,
              credentialRef: 'postgres:warehouse-b',
              connectionString: 'postgresql://warehouse-b/orders',
            }
      ),
    };
    const capability = new PostgresRelationalExecutionCapability({
      pool: createPool() as never,
      planConnectionResolver: resolver,
      planPoolFactory: (binding) => pools.get(binding.connectionString) as never,
    });
    const transform = capability.stepActivitiesByKind.get('POSTGRES_SQL_TRANSFORM');
    expect(transform).toBeDefined();

    await transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('run-a'));
    await transform!.execute(transformStep(CONNECTION_REF_B), runtimeContext('run-b'));

    expect(poolA.client.query).toHaveBeenCalledWith(
      'CREATE TABLE "analytics"."orders" AS select * from raw.orders'
    );
    expect(poolB.client.query).toHaveBeenCalledWith(
      'CREATE TABLE "analytics"."orders" AS select * from raw.orders'
    );
    expect(resolver.resolveConnection).toHaveBeenCalledTimes(2);
    await capability.close();
  });

  it('fails closed without opening a pool when the admitted binding is unavailable', async () => {
    const planPoolFactory = vi.fn();
    const capability = new PostgresRelationalExecutionCapability({
      pool: createPool() as never,
      planConnectionResolver: {
        async resolveConnection() {
          throw new PostgresPlanConnectionRejectedError('POSTGRES_PLAN_CONNECTION_NOT_ADMITTED');
        },
      },
      planPoolFactory,
    });
    const transform = capability.stepActivitiesByKind.get('POSTGRES_SQL_TRANSFORM');

    await expect(
      transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('run-missing'))
    ).resolves.toMatchObject({
      status: 'FAILED',
      failureReason: 'POSTGRES_PLAN_CONNECTION_NOT_ADMITTED',
      retriable: false,
    });
    expect(planPoolFactory).not.toHaveBeenCalled();
    await capability.close();
  });

  it('evicts and closes the least recently used idle plan connection', async () => {
    const poolA = createPool();
    const poolB = createPool();
    const poolC = createPool();
    const pools = new Map([
      ['postgresql://warehouse-a/orders', poolA],
      ['postgresql://warehouse-b/orders', poolB],
      ['postgresql://warehouse-c/orders', poolC],
    ]);
    const capability = new PostgresRelationalExecutionCapability({
      pool: createPool() as never,
      maxPlanClientSessions: 2,
      planConnectionResolver: {
        async resolveConnection(_step, context): Promise<PostgresPlanConnection> {
          const connectionId = context.runId.replace('run-', 'warehouse-');
          return {
            connectionRef: {
              schemaVersion: 'connection-ref.v1',
              connectionId,
              provider: 'postgres',
            },
            credentialRef: `postgres:${connectionId}`,
            connectionString: `postgresql://${connectionId}/orders`,
          };
        },
      },
      planPoolFactory: (binding) => pools.get(binding.connectionString) as never,
    });
    const transform = capability.stepActivitiesByKind.get('POSTGRES_SQL_TRANSFORM');

    await transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('run-a'));
    await transform!.execute(transformStep(CONNECTION_REF_B), runtimeContext('run-b'));
    await transform!.execute(transformStep(CONNECTION_REF_A), runtimeContext('run-a'));
    await transform!.execute(transformStep(CONNECTION_REF_C), runtimeContext('run-c'));

    expect(poolA.end).not.toHaveBeenCalled();
    expect(poolB.end).toHaveBeenCalledTimes(1);
    expect(poolC.end).not.toHaveBeenCalled();

    await capability.close();
    expect(poolA.end).toHaveBeenCalledTimes(1);
    expect(poolB.end).toHaveBeenCalledTimes(1);
    expect(poolC.end).toHaveBeenCalledTimes(1);
  });
});

function createPool(): {
  client: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
} {
  const client = {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    release: vi.fn(),
  };
  return {
    client,
    connect: vi.fn(async () => client),
    end: vi.fn(async () => undefined),
  };
}

function transformStep(
  connectionRef: typeof CONNECTION_REF_A | typeof CONNECTION_REF_B | typeof CONNECTION_REF_C
): ExecutionPlan['steps'][number] {
  return {
    stepId: 'transform-orders',
    kind: 'POSTGRES_SQL_TRANSFORM',
    dependsOn: ['prepare-orders'],
    stepTypeConfig: {
      connectionRef,
      dialect: 'postgres',
      entrypoint: 'models/orders.sql',
      sql: 'select * from raw.orders',
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
