import {
  TRANSFORMATION_STEP_KIND,
  createDefaultStepTypeRegistry,
  parseExecutionPlan,
  parseExecutionSelection,
  parsePlanRef,
  parseRunExecutionContextRef,
  type StartRunCommand,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import type { IRunExecutionContextWriter } from '../../../src/application/ports/runExecutionContextWriter.js';
import type { IWarehouseConnectionCatalog } from '../../../src/application/ports/warehouseSourceImport.js';
import { WarehouseConnectionNotFoundError } from '../../../src/application/ports/warehouseSourceImport.js';
import { RunExecutionContextBindingUseCase } from '../../../src/application/services/RunExecutionContextBindingUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { buildAuthorizedContext } from './engineStartRunUseCase.test.support.js';

const PLAN_ID = 'd'.repeat(64);
const PLATFORM_RUN_ID = 'run_0196454a-f0c8-7d37-a8e8-8a7f9afac0f1';
const CONNECTION_REF = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
} as const;
const PLAN_REF = parsePlanRef({
  uri: 'dvt-plan://postgres/sql-first-a',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});
const RUN_CONTEXT_REF = parseRunExecutionContextRef({
  uri: 'file:///run-contexts/sql-first-a.json',
  sha256: '3'.repeat(64),
  schemaVersion: 'v1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});

describe('RunExecutionContextBindingUseCase PostgreSQL authority', () => {
  it('binds the scoped catalog credential to the immutable PlanRef context once', async () => {
    const delegate = makeDelegate();
    const contextWriter = {
      write: vi.fn(async () => ({ ok: true as const, ref: RUN_CONTEXT_REF })),
    };
    const catalog = makeCatalog();
    const credentialResolver = {
      resolveCredential: vi.fn(async () => 'postgresql://warehouse-a/orders'),
    };
    const bundleBuilder = { build: vi.fn() };
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter,
      executionTargetResolver: { resolve: () => null },
      stepTypeRegistry: createDefaultStepTypeRegistry(),
      warehouseConnectionCatalog: catalog,
      postgresCredentialResolver: credentialResolver,
    });

    const result = await useCase.executeAdmitted(buildCommand(), buildContext(), makeAdmission());

    expect(result).toMatchObject({ ok: true, value: { kind: 'accepted' } });
    expect(catalog.getConnection).toHaveBeenCalledWith(
      { tenantId: 'tenant-1', projectId: 'proj-1', environmentId: 'env-1' },
      'warehouse-a'
    );
    expect(credentialResolver.resolveCredential).toHaveBeenCalledWith('postgres:warehouse-a');
    expect(contextWriter.write).toHaveBeenCalledWith({
      runId: 'run-test-1',
      context: expect.objectContaining({
        planSha256: PLAN_REF.sha256,
        pluginContexts: {
          postgres: {
            connectionRef: CONNECTION_REF,
            credentialRef: 'postgres:warehouse-a',
          },
        },
      }),
    });
    expect(bundleBuilder.build).not.toHaveBeenCalled();
    expect(delegate.execute).toHaveBeenCalledWith(
      expect.objectContaining({ runExecutionContextRef: RUN_CONTEXT_REF }),
      expect.any(Object)
    );
  });

  it('fails closed when the PlanRef connection does not exist in the authorized scope', async () => {
    const delegate = makeDelegate();
    const contextWriter = { write: vi.fn() };
    const catalog = makeCatalog();
    catalog.getConnection.mockRejectedValueOnce(
      new WarehouseConnectionNotFoundError(CONNECTION_REF.connectionId)
    );
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder: { build: vi.fn() },
      contextWriter,
      executionTargetResolver: { resolve: () => null },
      stepTypeRegistry: createDefaultStepTypeRegistry(),
      warehouseConnectionCatalog: catalog,
      postgresCredentialResolver: { resolveCredential: vi.fn() },
    });

    await expect(
      useCase.executeAdmitted(buildCommand(), buildContext(), makeAdmission())
    ).resolves.toMatchObject({
      ok: true,
      value: { kind: 'plan_rejected', accepted: false, cause: 'run_execution_context' },
    });
    expect(contextWriter.write).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('creates retry-stable context bytes from the platform run identity', async () => {
    let firstContextBytes: string | undefined;
    const contextWriter = {
      write: vi.fn<IRunExecutionContextWriter['write']>(async (input) => {
        const contextBytes = JSON.stringify(input.context);
        if (firstContextBytes === undefined) {
          firstContextBytes = contextBytes;
        } else if (contextBytes !== firstContextBytes) {
          throw new Error('The immutable run context changed across a retry.');
        }
        return { ok: true as const, ref: RUN_CONTEXT_REF };
      }),
    };
    const useCase = new RunExecutionContextBindingUseCase({
      delegate: makeDelegate(),
      bundleBuilder: { build: vi.fn() },
      contextWriter,
      executionTargetResolver: { resolve: () => null },
      stepTypeRegistry: createDefaultStepTypeRegistry(),
      warehouseConnectionCatalog: makeCatalog(),
      postgresCredentialResolver: {
        resolveCredential: vi.fn(async () => 'postgresql://warehouse-a/orders'),
      },
    });
    const command = { ...buildCommand(), runId: PLATFORM_RUN_ID };
    const retryContext = {
      ...buildContext(),
      authorizedAt: new Date('2026-08-15T00:00:00.000Z'),
    };

    await expect(
      useCase.executeAdmitted(command, buildContext(), makeAdmission())
    ).resolves.toMatchObject({ ok: true, value: { kind: 'accepted' } });
    await expect(
      useCase.executeAdmitted(command, retryContext, makeAdmission())
    ).resolves.toMatchObject({ ok: true, value: { kind: 'accepted' } });

    expect(contextWriter.write).toHaveBeenCalledTimes(2);
    expect(contextWriter.write.mock.calls[0]?.[0].context.createdAtIso).toBe(
      '2025-04-17T19:47:41.384Z'
    );
  });
});

function makeCatalog(): IWarehouseConnectionCatalog & {
  getConnection: ReturnType<typeof vi.fn>;
} {
  return {
    listConnections: vi.fn(),
    listSourceObjects: vi.fn(),
    createConnection: vi.fn(),
    renameConnection: vi.fn(),
    getConnection: vi.fn(async () => ({
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres' as const,
      database: 'orders',
      credentialRef: 'postgres:warehouse-a',
      sourceObjects: [],
    })),
  };
}

function makeDelegate(): { execute: ReturnType<typeof vi.fn> } {
  return {
    execute: vi.fn(async () => ({
      ok: true as const,
      value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
    })),
  };
}

function buildCommand(): StartRunCommand {
  return {
    runId: 'run-test-1',
    targetAdapter: 'temporal',
    planRef: PLAN_REF,
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['prepare', 'transform', 'capture'],
    }),
  };
}

function buildContext(): ReturnType<typeof buildAuthorizedContext> {
  return {
    ...buildAuthorizedContext('tenant-1'),
    scope: {
      resource: 'environment',
      tenantId: TenantId.unsafe('tenant-1'),
      projectId: ProjectId.unsafe('proj-1'),
      environmentId: EnvironmentId.unsafe('env-1'),
    },
    authorizedAt: new Date('2026-08-14T00:00:00.000Z'),
  };
}

function makeAdmission(): Parameters<RunExecutionContextBindingUseCase['executeAdmitted']>[2] {
  const sqlArtifact = {
    repo: 'dunay2/dvt',
    path: 'models/orders.sql',
    ref: 'refs/heads/main',
    commitSha: 'b'.repeat(40),
    contentSha256: 'c'.repeat(64),
  };
  const plan = parseExecutionPlan({
    metadata: {
      planId: PLAN_ID,
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: '5'.repeat(64),
      createdAtIso: '2026-08-14T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'prepare',
        kind: TRANSFORMATION_STEP_KIND.preparePostgresTransform,
        dependsOn: [],
        stepTypeConfig: {
          connectionRef: CONNECTION_REF,
          targetSchema: 'analytics',
          sourceSchema: 'raw',
          sourceTable: 'orders',
          sourceAlias: 'orders',
        },
      },
      {
        stepId: 'transform',
        kind: TRANSFORMATION_STEP_KIND.postgresSqlTransform,
        dependsOn: ['prepare'],
        stepTypeConfig: {
          connectionRef: CONNECTION_REF,
          dialect: 'postgres',
          entrypoint: 'models/orders.sql',
          sql: 'select * from raw.orders',
          sqlArtifact,
          sourceSchema: 'raw',
          sourceTable: 'orders',
          sourceAlias: 'orders',
          sinkSchema: 'analytics',
          sinkTable: 'orders',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
      {
        stepId: 'capture',
        kind: TRANSFORMATION_STEP_KIND.captureMaterializationEvidence,
        dependsOn: ['transform'],
        stepTypeConfig: {
          connectionRef: CONNECTION_REF,
          sinkSchema: 'analytics',
          sinkTable: 'orders',
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    ],
  });
  return {
    accepted: true,
    planRef: PLAN_REF,
    scopedPlanRef: {
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      planRef: PLAN_REF,
    },
    materialized: { executionPolicy: {}, plan },
    planRecord: {
      tenantId: 'tenant-1',
      projectId: 'proj-1',
      environmentId: 'env-1',
      planId: PLAN_ID,
      canonicalPlanJson: JSON.stringify(plan),
      canonicalHash: '6'.repeat(64),
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      sourceRef: PLAN_REF.uri,
      createdAtIso: '2026-08-14T00:00:00.000Z',
      updatedAtIso: '2026-08-14T00:00:00.000Z',
      state: 'ACTIVE',
    },
    validation: { status: 'OK', planId: PLAN_ID, adapterId: 'temporal' },
    validationRecord: {
      planId: PLAN_ID,
      state: 'VALID',
      storedAtIso: '2026-08-14T00:00:00.000Z',
      updatedAtIso: '2026-08-14T00:00:00.000Z',
    },
  };
}
