import {
  parseRunExecutionContext,
  parseRunExecutionContextRef,
  type ConnectionRef,
  type ExecutionPlan,
  type ResolvedRunContext,
  type RunExecutionContext,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { TemporalWorkerPostgresPlanConnectionResolver } from '../../src/runtime/TemporalWorkerPostgresPlanConnectionResolver.js';

const CONNECTION_REF = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;
const RUN_CONTEXT_REF = parseRunExecutionContextRef({
  uri: 'file:///run-contexts/run-a.json',
  sha256: 'a'.repeat(64),
  schemaVersion: 'v1.0',
  planId: 'b'.repeat(64),
  planVersion: '1.0',
});

describe('TemporalWorkerPostgresPlanConnectionResolver', () => {
  it('resolves the nonsecret PlanRef binding through the governed credential alias', async () => {
    const reader = {
      resolve: vi.fn(async () => buildExecutionContext()),
    };
    const credentials = {
      resolveCredential: vi.fn(async () => 'postgresql://warehouse-a/orders'),
    };
    const resolver = new TemporalWorkerPostgresPlanConnectionResolver(reader, credentials);

    await expect(resolver.resolveConnection(transformStep(), runtimeContext())).resolves.toEqual({
      connectionRef: CONNECTION_REF,
      credentialRef: 'postgres:warehouse-a',
      connectionString: 'postgresql://warehouse-a/orders',
    });
    expect(reader.resolve).toHaveBeenCalledWith(RUN_CONTEXT_REF);
    expect(credentials.resolveCredential).toHaveBeenCalledWith('postgres:warehouse-a');
  });

  it.each([
    ['missing run context ref', runtimeContextWithoutRef(), transformStep(), undefined],
    [
      'workspace mismatch',
      runtimeContext(),
      transformStep(),
      buildExecutionContext({ projectId: 'another-project' }),
    ],
    [
      'step connection mismatch',
      runtimeContext(),
      transformStep({ connectionId: 'warehouse-b' }),
      undefined,
    ],
  ])('rejects %s before credential resolution', async (_name, runContext, step, artifact) => {
    const credentials = { resolveCredential: vi.fn() };
    const resolver = new TemporalWorkerPostgresPlanConnectionResolver(
      { resolve: vi.fn(async () => artifact ?? buildExecutionContext()) },
      credentials
    );

    await expect(resolver.resolveConnection(step, runContext)).rejects.toMatchObject({
      name: 'PostgresPlanConnectionRejectedError',
    });
    expect(credentials.resolveCredential).not.toHaveBeenCalled();
  });

  it('rejects an unconfigured alias without falling back to DATABASE_URL', async () => {
    const resolver = new TemporalWorkerPostgresPlanConnectionResolver(
      { resolve: vi.fn(async () => buildExecutionContext()) },
      { resolveCredential: vi.fn(async () => null) }
    );

    await expect(
      resolver.resolveConnection(transformStep(), runtimeContext())
    ).rejects.toMatchObject({
      name: 'PostgresPlanConnectionRejectedError',
      message: 'POSTGRES_PLAN_CREDENTIAL_NOT_CONFIGURED',
    });
  });
});

function buildExecutionContext(overrides: Record<string, unknown> = {}): RunExecutionContext {
  return parseRunExecutionContext({
    schemaVersion: 'v1.0',
    planId: RUN_CONTEXT_REF.planId,
    planVersion: RUN_CONTEXT_REF.planVersion,
    planSha256: 'c'.repeat(64),
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'prod',
    targetAdapter: 'temporal',
    createdAtIso: '2026-08-14T00:00:00.000Z',
    createdBy: 'api',
    pluginContexts: {
      postgres: {
        connectionRef: CONNECTION_REF,
        credentialRef: 'postgres:warehouse-a',
      },
    },
    ...overrides,
  });
}

function transformStep(overrides: Partial<ConnectionRef> = {}): ExecutionPlan['steps'][number] {
  return {
    stepId: 'transform-orders',
    kind: 'POSTGRES_SQL_TRANSFORM',
    dependsOn: ['prepare-orders'],
    stepTypeConfig: {
      connectionRef: { ...CONNECTION_REF, ...overrides },
      dialect: 'postgres',
      entrypoint: 'models/orders.sql',
      sql: 'select * from raw.orders',
      sqlArtifact: {
        repo: 'org/repo',
        path: 'models/orders.sql',
        ref: 'refs/heads/main',
        commitSha: 'd'.repeat(40),
        contentSha256: 'e'.repeat(64),
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

function runtimeContext(overrides: Partial<ResolvedRunContext> = {}): ResolvedRunContext {
  return {
    tenantId: 'tenant-a' as ResolvedRunContext['tenantId'],
    projectId: 'project-a' as ResolvedRunContext['projectId'],
    environmentId: 'prod' as ResolvedRunContext['environmentId'],
    runId: 'run-a' as ResolvedRunContext['runId'],
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    runExecutionContextRef: RUN_CONTEXT_REF,
    ...overrides,
  };
}

function runtimeContextWithoutRef(): ResolvedRunContext {
  const { runExecutionContextRef: _omitted, ...context } = runtimeContext();
  return context;
}
