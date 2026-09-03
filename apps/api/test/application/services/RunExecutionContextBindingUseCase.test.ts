import {
  DBT_STEP_REQUIRED_CAPABILITY,
  createDefaultStepTypeRegistry,
  parseExecutionSelection,
  parseExecutionPlan,
  parsePlanRef,
  parseRunExecutionContextRef,
  type IStepTypeRegistry,
  type StartRunCommand,
} from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { WarehouseConnectionNotFoundError } from '../../../src/application/ports/warehouseSourceImport.js';
import { RunExecutionContextBindingUseCase } from '../../../src/application/services/RunExecutionContextBindingUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { buildAuthorizedContext } from './engineStartRunUseCase.test.support.js';

type BindingDependencies = ConstructorParameters<typeof RunExecutionContextBindingUseCase>[0];

const PLAN_ID = 'd'.repeat(64);
const PROJECT_REVISION = '1'.repeat(64);
const BUNDLE_SHA = '2'.repeat(64);
const TARGET = {
  provider: 'temporal',
  adapter: 'postgres',
  targetName: 'production',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-production',
    provider: 'postgres',
  },
  resolutionSource: 'environment-default',
  credentialRef: 'vault:dbt/production',
} as const;
const PLAN_REF = parsePlanRef({
  uri: 'dvt-plan://postgres/dbt-plan-1',
  sha256: 'a'.repeat(64),
  schemaVersion: '1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});
const RUN_CONTEXT_REF = parseRunExecutionContextRef({
  uri: 'file:///run-contexts/context.json',
  sha256: '3'.repeat(64),
  schemaVersion: 'v1.0',
  planId: PLAN_ID,
  planVersion: '1.0',
});
const STEP_TYPE_REGISTRY = createDefaultStepTypeRegistry();

describe('RunExecutionContextBindingUseCase', () => {
  it('orchestrates a revision-bound bundle and server-owned run context before dispatch', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = {
      build: vi.fn(async () => ({
        ok: true as const,
        contentSetSha256: PROJECT_REVISION,
        projectBundleRef: {
          uri: `file:///bundles/tenants/tenant-1/${BUNDLE_SHA}`,
          kind: 'dbt-project-bundle' as const,
          sha256: BUNDLE_SHA,
          tenantId: 'tenant-1',
        },
      })),
    };
    const contextWriter = {
      write: vi.fn(async () => ({ ok: true as const, ref: RUN_CONTEXT_REF })),
    };
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter,
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(),
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('DBT_MODEL', DBT_PROVENANCE)
    );

    expect(result).toMatchObject({ ok: true, value: { kind: 'accepted' } });
    expect(bundleBuilder.build).toHaveBeenCalledWith({
      scope: { tenantId: 'tenant-1', projectId: 'proj-1', environmentId: 'env-1' },
      projectRoot: 'analytics',
      expectedContentSetSha256: PROJECT_REVISION,
    });
    expect(contextWriter.write).toHaveBeenCalledWith({
      runId: 'run-test-1',
      context: expect.objectContaining({
        planSha256: PLAN_REF.sha256,
        pluginContexts: {
          dbt: expect.objectContaining({
            targetProfile: 'production',
            credentialRef: 'vault:dbt/production',
          }),
        },
      }),
    });
    expect(delegate.execute).toHaveBeenCalledWith(
      expect.objectContaining({ runExecutionContextRef: RUN_CONTEXT_REF }),
      expect.any(Object)
    );
  });

  it('rejects a changed project before writing context or dispatching', async () => {
    const delegate = makeDelegate();
    const contextWriter = { write: vi.fn() };
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder: {
        build: vi.fn(async () => ({
          ok: false as const,
          reason: 'revision_mismatch' as const,
          expectedContentSetSha256: PROJECT_REVISION,
          actualContentSetSha256: '9'.repeat(64),
        })),
      },
      contextWriter,
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(),
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('DBT_MODEL', DBT_PROVENANCE)
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: 'plan_rejected',
        accepted: false,
        reason: 'The DBT project changed after Preview. Run Preview again before Run.',
      },
    });
    expect(contextWriter.write).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('delegates non-DBT plans without creating DBT artifacts', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = { build: vi.fn() };
    const command = { ...buildCommand(), planRef: PLAN_REF };
    const context = buildContext();
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(),
    });

    await useCase.executeAdmitted(command, context, makeAdmission(undefined, undefined));

    expect(delegate.execute).toHaveBeenCalledWith(command, context);
    expect(bundleBuilder.build).not.toHaveBeenCalled();
  });

  it('binds DBT context for extension steps declared through the canonical capability registry', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = {
      build: vi.fn(async () => ({
        ok: false as const,
        reason: 'artifact_store_unavailable' as const,
      })),
    };
    const stepTypeRegistry = createDbtExtensionRegistry();
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry,
      ...dbtBindingDependencies(),
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('CUSTOM_DBT_OPERATION', undefined)
    );

    expect(result).toMatchObject({
      value: { reason: 'The DBT project bundle artifact store is not configured.' },
    });
    expect(bundleBuilder.build).toHaveBeenCalledOnce();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('reports an unavailable bundle store without dispatching', async () => {
    const delegate = makeDelegate();
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder: {
        build: vi.fn(async () => ({
          ok: false as const,
          reason: 'artifact_store_unavailable' as const,
        })),
      },
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(),
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('DBT_MODEL', DBT_PROVENANCE)
    );

    expect(result).toMatchObject({
      value: { reason: 'The DBT project bundle artifact store is not configured.' },
    });
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('rejects Run when the preview-bound dbt connection is absent from the workspace', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = { build: vi.fn() };
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(async () => {
        throw new WarehouseConnectionNotFoundError(TARGET.connectionRef.connectionId);
      }),
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('DBT_MODEL', DBT_PROVENANCE)
    );

    expect(result).toMatchObject({
      value: { reason: 'The Preview-bound DBT connection is not in this workspace.' },
    });
    expect(bundleBuilder.build).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('rejects Run when the dbt profile does not resolve to the preview-bound connection', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = { build: vi.fn() };
    const verify = vi.fn(async () => false);
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(),
      executionConnectionBindingVerifier: { verify },
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('DBT_MODEL', DBT_PROVENANCE)
    );

    expect(verify).toHaveBeenCalledWith({
      runtimeCredentialRef: TARGET.credentialRef,
      targetProfile: TARGET.targetName,
      connectionCredentialRef: TARGET.credentialRef,
    });
    expect(result).toMatchObject({
      value: {
        reason:
          'The Preview-bound DBT profile does not resolve to its governed workspace connection.',
      },
    });
    expect(bundleBuilder.build).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });

  it('rejects Run when the governed connection has no credential reference', async () => {
    const delegate = makeDelegate();
    const bundleBuilder = { build: vi.fn() };
    const verify = vi.fn(async () => true);
    const useCase = new RunExecutionContextBindingUseCase({
      delegate,
      bundleBuilder,
      contextWriter: { write: vi.fn() },
      executionTargetResolver: { resolve: () => TARGET },
      stepTypeRegistry: STEP_TYPE_REGISTRY,
      ...dbtBindingDependencies(async (_scope, connectionId) => ({
        id: connectionId,
        name: 'DBT execution warehouse',
        type: 'postgres',
        database: 'analytics',
        sourceObjects: [],
      })),
      executionConnectionBindingVerifier: { verify },
    });

    const result = await useCase.executeAdmitted(
      { ...buildCommand(), planRef: PLAN_REF },
      buildContext(),
      makeAdmission('DBT_MODEL', DBT_PROVENANCE)
    );

    expect(result).toMatchObject({
      value: {
        reason:
          'The Preview-bound DBT profile does not resolve to its governed workspace connection.',
      },
    });
    expect(verify).not.toHaveBeenCalled();
    expect(bundleBuilder.build).not.toHaveBeenCalled();
    expect(delegate.execute).not.toHaveBeenCalled();
  });
});

const DBT_PROVENANCE = {
  kind: 'dbt-project-files',
  canvasId: 'analytics-canvas',
  projectRoot: 'analytics',
  contentSetSha256: PROJECT_REVISION,
  analysisSha256: '4'.repeat(64),
  dbtVersion: '1.10.0',
  selectedUniqueIds: ['model.analytics.orders'],
  executionTarget: TARGET,
} as const;

function makeDelegate(): BindingDependencies['delegate'] {
  return {
    execute: vi.fn(async () => ({
      ok: true as const,
      value: { kind: 'accepted' as const, runId: 'run-test-1', accepted: true as const },
    })),
  };
}

function dbtBindingDependencies(
  getConnection: BindingDependencies['warehouseConnectionCatalog']['getConnection'] = async (
    _scope,
    connectionId
  ) => ({
    id: connectionId,
    name: 'DBT execution warehouse',
    type: 'postgres',
    database: 'analytics',
    credentialRef: TARGET.credentialRef,
    sourceObjects: [],
  })
): Pick<BindingDependencies, 'executionConnectionBindingVerifier' | 'warehouseConnectionCatalog'> {
  const unexpected = async (): Promise<never> => {
    throw new Error('Unexpected PostgreSQL binding for a DBT-only plan');
  };
  return {
    executionConnectionBindingVerifier: { verify: vi.fn(async () => true) },
    warehouseConnectionCatalog: {
      listConnections: unexpected,
      listSourceObjects: unexpected,
      getConnection,
      createConnection: unexpected,
      renameConnection: unexpected,
    },
  };
}

function createDbtExtensionRegistry(): IStepTypeRegistry {
  return {
    validate: (...args) => STEP_TYPE_REGISTRY.validate(...args),
    isKnown: (kind) => kind === 'CUSTOM_DBT_OPERATION' || STEP_TYPE_REGISTRY.isKnown(kind),
    getKinds: () => [...STEP_TYPE_REGISTRY.getKinds(), 'CUSTOM_DBT_OPERATION'],
    getExecutionProfile: (kind) =>
      kind === 'CUSTOM_DBT_OPERATION'
        ? {
            supportedAdapters: ['temporal'],
            requiredCapabilities: [DBT_STEP_REQUIRED_CAPABILITY],
          }
        : STEP_TYPE_REGISTRY.getExecutionProfile?.(kind),
  };
}

function makeAdmission(
  stepKind: string | undefined,
  provenance: unknown
): Parameters<RunExecutionContextBindingUseCase['executeAdmitted']>[2] {
  const plan = parseExecutionPlan({
    metadata: {
      planId: PLAN_ID,
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: '5'.repeat(64),
      createdAtIso: '2026-07-15T00:00:00.000Z',
    },
    steps:
      stepKind === undefined
        ? []
        : [
            {
              stepId: 'model.analytics.orders',
              kind: stepKind,
              dependsOn: [],
              stepTypeConfig: {},
            },
          ],
    ...(provenance === undefined
      ? {}
      : { observability: { extra: { planPreviewProvenance: provenance } } }),
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
    materialized: {
      executionPolicy: {},
      plan,
    },
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
      createdAtIso: '2026-07-15T00:00:00.000Z',
      updatedAtIso: '2026-07-15T00:00:00.000Z',
      state: 'ACTIVE',
    },
    validation: { status: 'OK', planId: PLAN_ID, adapterId: 'temporal' },
    validationRecord: {
      planId: PLAN_ID,
      state: 'VALID',
      storedAtIso: '2026-07-15T00:00:00.000Z',
      updatedAtIso: '2026-07-15T00:00:00.000Z',
    },
  };
}

function buildCommand(): StartRunCommand {
  return {
    runId: 'run-test-1',
    targetAdapter: 'temporal',
    selection: parseExecutionSelection({
      mode: 'explicit',
      nodeIds: ['model.analytics.orders'],
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
    authorizedAt: new Date('2026-07-15T00:00:00.000Z'),
  };
}
