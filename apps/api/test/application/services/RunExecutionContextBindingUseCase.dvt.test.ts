import {
  DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
  DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  KNOWN_STEP_KINDS,
  createDefaultStepTypeRegistry,
  createDvtPostgresOutputSchemaDigestV1,
  parseExecutionPlan,
  parseExecutionSelection,
  parsePlanRef,
  parseRunExecutionContextRef,
  type DvtOperationalWorkloadV2,
  type StartRunCommand,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { RunExecutionContextBindingUseCase } from '../../../src/application/services/RunExecutionContextBindingUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { buildAuthorizedContext } from './engineStartRunUseCase.test.support.js';

type Dependencies = ConstructorParameters<typeof RunExecutionContextBindingUseCase>[0];

const PLAN_ID = 'd'.repeat(64);
const PLAN_REF = parsePlanRef({
  uri: 'dvt-plan://postgres/dvt-run-plan',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});
const RUN_CONTEXT_REF = parseRunExecutionContextRef({
  uri: 'file:///run-contexts/dvt-run.json',
  sha256: 'c'.repeat(64),
  schemaVersion: 'v1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});

describe('RunExecutionContextBindingUseCase DVT runtime binding', () => {
  it('persists the governed PostgreSQL connection context before dispatch', async () => {
    const delegate = makeDelegate();
    const contextWriter = {
      write: vi.fn(async () => ({ ok: true as const, ref: RUN_CONTEXT_REF })),
    };
    const getConnection = vi.fn(async () => ({
      id: 'warehouse-a',
      name: 'Warehouse A',
      type: 'postgres' as const,
      database: 'analytics',
      credentialRef: 'postgres:warehouse-a',
      sourceObjects: [],
    }));
    const useCase = new RunExecutionContextBindingUseCase(
      dependencies({ delegate, contextWriter, getConnection })
    );

    const result = await useCase.executeAdmitted(
      command(),
      authorizedContext(),
      admission(buildRunWorkload())
    );

    expect(result).toMatchObject({ ok: true, value: { kind: 'accepted' } });
    expect(getConnection).toHaveBeenCalledWith(
      { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
      'warehouse-a'
    );
    expect(contextWriter.write).toHaveBeenCalledWith({
      runId: 'run-dvt-1',
      context: expect.objectContaining({
        pluginContexts: {
          'dvt-postgres': {
            connectionRef: buildRunWorkload().connectionRef,
            credentialRef: 'postgres:warehouse-a',
          },
        },
      }),
    });
    expect(delegate.execute).toHaveBeenCalledWith(
      expect.objectContaining({ planRef: PLAN_REF, runExecutionContextRef: RUN_CONTEXT_REF }),
      expect.any(Object)
    );
  });

  it('rejects Preview workload v1 before dispatch', async () => {
    const delegate = makeDelegate();
    const contextWriter = { write: vi.fn() };
    const getConnection = vi.fn();
    const useCase = new RunExecutionContextBindingUseCase(
      dependencies({ delegate, contextWriter, getConnection })
    );

    const result = await useCase.executeAdmitted(
      command(),
      authorizedContext(),
      admission(buildPreviewWorkload())
    );

    expect(result).toMatchObject({
      value: {
        kind: 'plan_rejected',
        reason: 'DVT operational Run requires workload schema v2.',
      },
    });
    expect(getConnection).not.toHaveBeenCalled();
    expect(contextWriter.write).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});

function dependencies(input: {
  readonly delegate: Dependencies['delegate'];
  readonly contextWriter: Dependencies['contextWriter'];
  readonly getConnection: Dependencies['warehouseConnectionCatalog']['getConnection'];
}): Dependencies {
  const unexpected = vi.fn(async (): Promise<never> => {
    throw new Error('Unexpected dependency call');
  });
  return {
    delegate: input.delegate,
    bundleBuilder: { build: unexpected },
    contextWriter: input.contextWriter,
    executionTargetResolver: {
      resolve() {
        throw new Error('Unexpected dependency call');
      },
    },
    executionConnectionBindingVerifier: { verify: unexpected },
    stepTypeRegistry: createDefaultStepTypeRegistry(),
    warehouseConnectionCatalog: {
      listConnections: unexpected,
      listSourceObjects: unexpected,
      getConnection: input.getConnection,
      createConnection: unexpected,
      renameConnection: unexpected,
    },
  };
}

function makeDelegate(): Dependencies['delegate'] {
  return {
    execute: vi.fn(async () => ({
      ok: true as const,
      value: { kind: 'accepted' as const, runId: 'run-dvt-1', accepted: true as const },
    })),
  };
}

function admission(
  stepTypeConfig: unknown
): Parameters<RunExecutionContextBindingUseCase['executeAdmitted']>[2] {
  const plan = parseExecutionPlan({
    metadata: {
      planId: PLAN_ID,
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'e'.repeat(64),
      createdAtIso: '2026-09-15T00:00:00.000Z',
      ownership: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    },
    steps: [
      {
        stepId: 'transform-a',
        kind: KNOWN_STEP_KINDS.DVT_POSTGRES_OPERATIONAL_WORKLOAD,
        dependsOn: [],
        stepTypeConfig,
      },
    ],
  });
  return {
    accepted: true,
    planRef: PLAN_REF,
    scopedPlanRef: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      planRef: PLAN_REF,
    },
    materialized: { executionPolicy: {}, plan },
    planRecord: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'env-a',
      planId: PLAN_ID,
      canonicalPlanJson: JSON.stringify(plan),
      canonicalHash: 'f'.repeat(64),
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      sourceRef: PLAN_REF.uri,
      createdAtIso: '2026-09-15T00:00:00.000Z',
      updatedAtIso: '2026-09-15T00:00:00.000Z',
      state: 'ACTIVE',
    },
    validation: { status: 'OK', planId: PLAN_ID, adapterId: 'temporal' },
    validationRecord: {
      planId: PLAN_ID,
      state: 'VALID',
      storedAtIso: '2026-09-15T00:00:00.000Z',
      updatedAtIso: '2026-09-15T00:00:00.000Z',
    },
  };
}

function buildRunWorkload(): DvtOperationalWorkloadV2 {
  const semanticPlanSha256 = '1'.repeat(64);
  return {
    schemaVersion: 'dvt-operational-workload.v2',
    executionIntent: 'run',
    scope: { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'env-a' },
    graph: {
      draftRevision: 'revision-a',
      canvasId: 'canvas-a',
      selectedNodeIds: ['source-a', 'transform-a'],
      selectedEdgeIds: ['source-transform'],
    },
    semantics: [
      {
        transformNodeId: 'transform-a',
        semanticPlanSha256,
        profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
      },
    ],
    targetProjection: {
      profileId: DVT_POSTGRES_PROJECT_REL_PROFILE_ID,
      toolIdentity: DVT_POSTGRES_PROJECT_REL_TOOL_IDENTITY,
      semanticPlanSha256,
      schemaDigestSha256: createDvtPostgresOutputSchemaDigestV1({
        schemaVersion: 'dvt-postgres-output-schema.v1',
        columns: [
          {
            ordinal: 0,
            name: 'order_id',
            postgresType: 'bigint',
            nullable: true,
            defaultExpression: null,
            generatedExpression: null,
            collation: null,
          },
        ],
        constraints: [],
        indexes: [],
      }),
      artifact: {
        artifactKind: 'compiled-sql',
        sha256: '2'.repeat(64),
        storageUri: `s3://dvt-artifacts/tenants/tenant-a/${'2'.repeat(64)}`,
        sizeBytes: 64,
        encoding: 'utf-8',
      },
    },
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-a',
      provider: 'postgres',
    },
    output: {
      kind: 'transform-result',
      nodeId: 'transform-a',
      disposition: 'table',
      target: {
        schemaVersion: 'dvt-transform-result-target.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-a',
          provider: 'postgres',
        },
        schema: 'analytics',
        relation: 'orders_result',
      },
      publicationPolicy: 'postgres-stable-table-publication.v1',
    },
    publicationBoundaries: [],
  };
}

function buildPreviewWorkload(): unknown {
  const run = buildRunWorkload();
  const { schemaDigestSha256: _schemaDigestSha256, ...targetProjection } = run.targetProjection;
  return {
    schemaVersion: 'dvt-operational-workload.v1',
    scope: run.scope,
    graph: run.graph,
    semantics: run.semantics,
    targetProjection,
    connectionRef: run.connectionRef,
    output: { kind: 'ephemeral-preview', nodeId: 'transform-a' },
  };
}

function command(): StartRunCommand {
  return {
    runId: 'run-dvt-1',
    targetAdapter: 'temporal',
    planRef: PLAN_REF,
    selection: parseExecutionSelection({ mode: 'explicit', nodeIds: ['transform-a'] }),
  };
}

function authorizedContext(): ReturnType<typeof buildAuthorizedContext> {
  return {
    ...buildAuthorizedContext('tenant-a'),
    scope: {
      resource: 'environment',
      tenantId: TenantId.unsafe('tenant-a'),
      projectId: ProjectId.unsafe('project-a'),
      environmentId: EnvironmentId.unsafe('env-a'),
    },
    authorizedAt: new Date('2026-09-15T00:00:00.000Z'),
  };
}
