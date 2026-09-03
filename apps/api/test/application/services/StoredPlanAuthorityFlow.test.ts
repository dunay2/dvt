import {
  DBT_STEP_REQUIRED_CAPABILITY,
  createDefaultStepTypeRegistry,
  parseExecutionPlan,
  parseExecutionSelection,
  parsePlanRef,
  parseRunExecutionContextRef,
  type GenericGraphSourceV1,
  type PlannerBuildResultV1,
} from '@dvt/contracts';
import { sha256Hex } from '@dvt/crypto';
import { describe, expect, it, vi } from 'vitest';

import { PlannerBackedStartRunUseCase } from '../../../src/application/services/PlannerBackedStartRunUseCase.js';
import { PreviewPlanUseCase } from '../../../src/application/services/PreviewPlanUseCase.js';
import { RunExecutionContextBindingUseCase } from '../../../src/application/services/RunExecutionContextBindingUseCase.js';
import { StoredExecutablePlanResolver } from '../../../src/application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../../../src/application/services/StoredPlanExecutabilityValidator.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';

import { makeAdapter } from './storedPlanExecutabilityValidator/harness.js';

const PLAN = parseExecutionPlan({
  metadata: {
    planId: 'd'.repeat(64),
    planVersion: '1.0',
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    inputHashSha256: 'e'.repeat(64),
    createdAtIso: '2026-08-13T00:00:00.000Z',
    ownership: {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
    },
  },
  steps: [{ stepId: 'model.analytics.orders', kind: 'DBT_MODEL', dependsOn: [] }],
});
const PLAN_BYTES = Buffer.from(JSON.stringify(PLAN), 'utf8');
const PLAN_REF = parsePlanRef({
  uri: `dvt-plan://postgres/${PLAN.metadata.planId}`,
  sha256: sha256Hex(PLAN_BYTES),
  schemaVersion: PLAN.metadata.schemaVersion,
  planId: PLAN.metadata.planId,
  planVersion: PLAN.metadata.planVersion,
  sizeBytes: PLAN_BYTES.byteLength,
});
const BUILD_RESULT: PlannerBuildResultV1 = {
  plan: PLAN,
  executionPolicy: {},
  canonicalPlanCoreJson: JSON.stringify({ metadata: PLAN.metadata, steps: PLAN.steps }),
};
const PLAN_RECORD = {
  ...PLAN.metadata.ownership!,
  planId: PLAN.metadata.planId,
  canonicalPlanJson: JSON.stringify(PLAN),
  canonicalHash: PLAN_REF.sha256,
  planVersion: PLAN.metadata.planVersion,
  schemaVersion: PLAN.metadata.schemaVersion,
  contractVersion: PLAN.metadata.contractVersion,
  sourceRef: PLAN_REF.uri,
  createdAtIso: PLAN.metadata.createdAtIso,
  updatedAtIso: PLAN.metadata.createdAtIso,
  state: 'ACTIVE' as const,
};
const SELECTION = parseExecutionSelection({
  mode: 'explicit',
  nodeIds: ['model.analytics.orders'],
});
const CONTEXT = {
  principal: {
    principalId: 'user-1',
    principalType: 'user' as const,
    subjectId: 'subject-1',
    issuer: 'https://issuer.example/',
    audience: 'dvt-api',
    expiresAt: new Date('2026-08-13T01:00:00.000Z'),
    rawScopes: [],
    assertedTenantIds: [],
    assertedProjectIds: [],
  },
  scope: {
    resource: 'environment' as const,
    tenantId: TenantId.unsafe('tenant-1'),
    projectId: ProjectId.unsafe('project-1'),
    environmentId: EnvironmentId.unsafe('env-1'),
  },
  action: { kind: 'command' as const, name: 'run:start' as const },
  requestId: 'request-1',
  authorizedAt: new Date('2026-08-13T00:00:00.000Z'),
};

type AuthorityHarness = {
  readonly planStore: {
    readonly storePlanArtifact: ReturnType<typeof vi.fn>;
    readonly getPlanRecordByRef: ReturnType<typeof vi.fn>;
    readonly getStoredPlanValidationRecord: ReturnType<typeof vi.fn>;
    readonly fetchStoredPlanArtifact: ReturnType<typeof vi.fn>;
    readonly fetchStoredPlanArtifactForValidation: ReturnType<typeof vi.fn>;
    readonly markStoredPlanArtifactValid: ReturnType<typeof vi.fn>;
    readonly markStoredPlanArtifactInvalid: ReturnType<typeof vi.fn>;
  };
  readonly stepTypeRegistry: ReturnType<typeof createDefaultStepTypeRegistry>;
  readonly validator: StoredPlanExecutabilityValidator;
};

describe('stored plan authority flow', () => {
  it('persists equivalent Preview and Start builds through one ref and one terminal transition', async () => {
    const harness = createAuthorityHarness();
    const planner = { buildPlan: vi.fn(async () => BUILD_RESULT) };
    const preview = new PreviewPlanUseCase({
      planner: planner as never,
      planStore: harness.planStore as never,
      planValidator: harness.validator,
      previewSelectionResolver: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: {
            graphSource: graphSource(),
            nodeIds: ['model.analytics.orders'],
            decisionScopeNodeIds: ['model.analytics.orders'],
            requestedRootNodeIds: ['model.analytics.orders'],
          },
        })),
      } as never,
    });
    const executeAdmitted = vi.fn(async () => ({
      ok: true as const,
      value: { kind: 'accepted' as const, runId: 'run-1', accepted: true as const },
    }));
    const start = new PlannerBackedStartRunUseCase({
      planner: planner as never,
      planStore: harness.planStore as never,
      validator: harness.validator,
      delegate: { execute: vi.fn(), executeAdmitted } as never,
      compileTelemetry: { recordPlanCompileLatency: vi.fn() },
      executableSubgraphResolver: {
        execute: vi.fn(async () => ({
          ok: true as const,
          value: {
            selection: SELECTION,
            nodeIds: ['model.analytics.orders'],
            edgeIds: [],
            executable: true,
            diagnostics: [],
          },
        })),
      } as never,
    });

    const previewResult = await preview.execute(
      { targetAdapter: 'temporal', graphSource: graphSource(), selection: SELECTION },
      CONTEXT
    );
    await start.execute(
      {
        runId: 'run-1',
        targetAdapter: 'temporal',
        graphSource: graphSource(),
        selection: SELECTION,
      },
      CONTEXT
    );

    expect(previewResult).toMatchObject({ kind: 'accepted', planRef: PLAN_REF });
    expect(harness.planStore.storePlanArtifact).toHaveBeenNthCalledWith(1, {
      buildResult: BUILD_RESULT,
    });
    expect(harness.planStore.storePlanArtifact).toHaveBeenNthCalledWith(2, {
      buildResult: BUILD_RESULT,
    });
    expect(harness.planStore.markStoredPlanArtifactValid).toHaveBeenCalledOnce();
    expect(executeAdmitted).toHaveBeenCalledWith(
      expect.objectContaining({ planRef: PLAN_REF }),
      CONTEXT,
      expect.objectContaining({
        planRef: PLAN_REF,
        materialized: expect.objectContaining({ plan: PLAN }),
      })
    );
  });

  it('materializes once before Start hands the admitted plan to DBT binding', async () => {
    const harness = createAuthorityHarness();
    const engineDelegate = {
      execute: vi.fn(async () => ({
        ok: true as const,
        value: { kind: 'accepted' as const, runId: 'run-1', accepted: true as const },
      })),
    };
    const runContextBinding = new RunExecutionContextBindingUseCase({
      delegate: engineDelegate,
      bundleBuilder: {
        build: vi.fn(async () => ({
          ok: true as const,
          contentSetSha256: 'f'.repeat(64),
          projectBundleRef: {
            uri: `file:///bundles/tenants/tenant-1/${'f'.repeat(64)}`,
            kind: 'dbt-project-bundle' as const,
            sha256: 'f'.repeat(64),
            tenantId: 'tenant-1',
          },
        })),
      },
      contextWriter: {
        write: vi.fn(async () => ({
          ok: true as const,
          ref: parseRunExecutionContextRef({
            uri: 'file:///run-contexts/run-1.json',
            sha256: 'a'.repeat(64),
            schemaVersion: 'v1.0',
            planId: PLAN_REF.planId,
            planVersion: PLAN_REF.planVersion,
          }),
        })),
      },
      executionTargetResolver: {
        resolve: () => ({
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
        }),
      },
      executionConnectionBindingVerifier: { verify: vi.fn(async () => true) },
      stepTypeRegistry: harness.stepTypeRegistry,
      warehouseConnectionCatalog: {
        listConnections: vi.fn(),
        listSourceObjects: vi.fn(),
        getConnection: vi.fn(async () => ({
          id: 'warehouse-production',
          name: 'Production warehouse',
          type: 'postgres' as const,
          database: 'analytics',
          credentialRef: 'postgres:warehouse-production',
          sourceObjects: [],
        })),
        createConnection: vi.fn(),
        renameConnection: vi.fn(),
      },
    });
    const start = new PlannerBackedStartRunUseCase({
      planner: { buildPlan: vi.fn() } as never,
      planStore: harness.planStore as never,
      validator: harness.validator,
      delegate: runContextBinding,
      compileTelemetry: { recordPlanCompileLatency: vi.fn() },
      executableSubgraphResolver: { execute: vi.fn() } as never,
    });

    await start.execute(
      { runId: 'run-1', targetAdapter: 'temporal', selection: SELECTION, planRef: PLAN_REF },
      CONTEXT
    );

    expect(harness.planStore.fetchStoredPlanArtifactForValidation).toHaveBeenCalledOnce();
    expect(engineDelegate.execute).toHaveBeenCalledOnce();
  });
});

function graphSource(): GenericGraphSourceV1 {
  return {
    kind: 'generic-graph-v1' as const,
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: [{ nodeId: 'model.analytics.orders', stepKind: 'DBT_MODEL', dependsOn: [] }],
  };
}

function createAuthorityHarness(): AuthorityHarness {
  let validationState: 'PENDING_VALIDATION' | 'VALID' = 'PENDING_VALIDATION';
  const planStore = {
    storePlanArtifact: vi.fn(async () => PLAN_REF),
    getPlanRecordByRef: vi.fn(async () => PLAN_RECORD),
    getStoredPlanValidationRecord: vi.fn(async () => ({
      planId: PLAN_REF.planId,
      state: validationState,
      storedAtIso: PLAN.metadata.createdAtIso,
      updatedAtIso: PLAN.metadata.createdAtIso,
    })),
    fetchStoredPlanArtifact: vi.fn(async () => ({ bytes: PLAN_BYTES, executionPolicy: {} })),
    fetchStoredPlanArtifactForValidation: vi.fn(async () => ({
      bytes: PLAN_BYTES,
      executionPolicy: {},
    })),
    markStoredPlanArtifactValid: vi.fn(async () => {
      validationState = 'VALID';
    }),
    markStoredPlanArtifactInvalid: vi.fn(),
  };
  const stepTypeRegistry = createDefaultStepTypeRegistry();
  const materializer = new StoredExecutablePlanResolver({
    fetcher: planStore,
    stepTypeRegistry,
  });
  const validator = new StoredPlanExecutabilityValidator({
    materializer,
    adapters: new Map([['temporal', makeAdapter([DBT_STEP_REQUIRED_CAPABILITY])]]),
    stepTypeRegistry,
  });
  return { planStore, stepTypeRegistry, validator };
}
