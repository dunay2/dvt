import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import {
  ObservedTemporalAdapter,
  TemporalAdapter,
  loadTemporalAdapterConfig,
} from '@dvt/adapter-temporal';
import type { IStoredPlanArtifactStore } from '@dvt/artifacts';
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  CURRENT_EXECUTION_PLAN_VERSION,
  asIsoUtcString,
  createDefaultStepTypeRegistry,
  parseExecutionPlan,
  parsePlanRef,
  type PlanRef,
} from '@dvt/contracts';
import type { EngineRunRef, IProviderAdapter } from '@dvt/engine';
import { AllowAllAuthorizer, SequenceClock } from '@dvt/engine/runtime';
import { InMemoryStartRunIntentStore, InMemoryTxStore } from '@dvt/engine/testing';
import { OtelObservability } from '@dvt/observability-otel';
import { PlannerFacade } from '@dvt/planner';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import Fastify, { type FastifyInstance } from 'fastify';

import {
  toExecutionScope,
  type IAccessDecisionService,
} from '../../src/application/ports/accessDecision.js';
import type { IAuthenticator } from '../../src/application/ports/auth.js';
import type { IWorkspaceGraphDraftStore } from '../../src/application/ports/workspaceGraphDraft.js';
import { AuthorizeCommandScopeService } from '../../src/application/services/authorizeCommandScopeService.js';
import { EngineStartRunUseCase } from '../../src/application/services/engineStartRunUseCase.js';
import { PlannerBackedStartRunUseCase } from '../../src/application/services/PlannerBackedStartRunUseCase.js';
import { ResolveAuthorizedExecutableSubgraphService } from '../../src/application/services/resolveAuthorizedExecutableSubgraph.js';
import { StartRunAuthorizedFacade } from '../../src/application/services/startRunAuthorizedFacade.js';
import { createStartRunTargetAdapterRegistryFromValues } from '../../src/application/services/startRunTargetAdapterRegistry.js';
import { StoredExecutablePlanResolver } from '../../src/application/services/StoredExecutablePlanResolver.js';
import { StoredPlanExecutabilityValidator } from '../../src/application/services/StoredPlanExecutabilityValidator.js';
import { buildWorkflowEngine } from '../../src/application/services/WorkflowEngineFactory.js';
import { startRunRoute } from '../../src/entrypoints/http/startRunRoute.js';
import { ObservabilityStartRunSlaTelemetry } from '../../src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry.js';

const RUN_ID = 'run_0196454a-f0c8-7d37-a8e8-8a7f9afac0f1';
const SECRET_TOKEN = 'secret-bearer-token-value';
const PLAN_PATH_SENTINEL = 'private-credential-plan';

export interface StartRunOpenTelemetryProof {
  readonly app: FastifyInstance;
  readonly exporter: InMemorySpanExporter;
  readonly observability: OtelObservability;
  readonly planRef: PlanRef;
  readonly planPathSentinel: string;
  readonly secretToken: string;
  readonly temporalSubmissions: readonly unknown[];
  close(): Promise<void>;
}

export async function createStartRunOpenTelemetryProof(
  authorized: boolean
): Promise<StartRunOpenTelemetryProof> {
  const exporter = new InMemorySpanExporter();
  const observability = new OtelObservability({
    serviceName: 'dvt-api-start-run-proof',
    spanExporter: exporter,
  });
  const inputHashSha256 = 'a'.repeat(64);
  const planId = createHash('sha256')
    .update(
      JSON.stringify({
        metadata: {
          inputHashSha256,
          planVersion: CURRENT_EXECUTION_PLAN_VERSION,
        },
        steps: [],
      })
    )
    .digest('hex');
  const plan = parseExecutionPlan({
    metadata: {
      planId,
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
      contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
      inputHashSha256,
      createdAtIso: '2026-08-03T00:00:00.000Z',
      ownership: {
        tenantId: 'tenant-1',
        projectId: 'project-1',
        environmentId: 'env-1',
      },
    },
    steps: [],
  });
  const planBytes = Buffer.from(JSON.stringify(plan), 'utf8');
  const planRef = parsePlanRef({
    uri: `dvt-plan://proof/${PLAN_PATH_SENTINEL}`,
    sha256: createHash('sha256').update(planBytes).digest('hex'),
    schemaVersion: plan.metadata.schemaVersion,
    planId: plan.metadata.planId,
    planVersion: plan.metadata.planVersion,
    sizeBytes: planBytes.byteLength,
  });
  const planStore = createControlledPlanStore(planBytes);
  const stepTypeRegistry = createDefaultStepTypeRegistry();
  const planMaterializer = new StoredExecutablePlanResolver({
    fetcher: planStore,
    stepTypeRegistry,
  });
  const temporalSubmissions: unknown[] = [];
  const temporalConfig = loadTemporalAdapterConfig({
    TEMPORAL_ADDRESS: 'temporal-proof.invalid:7233',
    TEMPORAL_NAMESPACE: 'dvt-proof',
    TEMPORAL_TASK_QUEUE: 'dvt-proof-queue',
  });
  const temporalAdapter = new ObservedTemporalAdapter({
    adapter: new TemporalAdapter({
      config: temporalConfig,
      workflowClient: {
        async start(_workflowType, options) {
          temporalSubmissions.push(options);
          return { workflowId: RUN_ID, firstExecutionRunId: 'temporal-proof-run' };
        },
        getHandle() {
          throw new Error('Unexpected Temporal handle lookup in StartRun proof');
        },
      },
    }),
    config: temporalConfig,
    observability,
  });
  const adapters = new Map<EngineRunRef['provider'], IProviderAdapter>([
    ['temporal', temporalAdapter],
  ]);
  const clock = new SequenceClock(asIsoUtcString('2026-08-03T00:00:00.000Z'));
  const stateStore = new InMemoryTxStore();
  const engineRuntime = buildWorkflowEngine({
    security: {
      authorizer: new AllowAllAuthorizer(),
      planRefAllowedSchemes: ['dvt-plan'],
    },
    persistence: {
      stateStoreRead: stateStore,
      stateStoreWrite: stateStore,
      intentStore: new InMemoryStartRunIntentStore(clock),
      planFetcher: planStore,
    },
    runtime: { adapters },
    infrastructure: { clock, observability },
  });
  const planner = new PlannerFacade();
  const startRunSlaTelemetry = new ObservabilityStartRunSlaTelemetry({ observability });
  const plannerBackedStartRun = new PlannerBackedStartRunUseCase({
    planner,
    planStore,
    compileTelemetry: startRunSlaTelemetry,
    validator: new StoredPlanExecutabilityValidator({
      materializer: planMaterializer,
      adapters,
      stepTypeRegistry,
    }),
    delegate: new EngineStartRunUseCase(engineRuntime.engine),
    executableSubgraphResolver: new ResolveAuthorizedExecutableSubgraphService({
      planner,
      workspaceGraphDraftStore: createUnusedWorkspaceGraphDraftStore(),
    }),
  });
  const facade = new StartRunAuthorizedFacade(
    createAuthenticator(),
    createAuthorizer(authorized),
    plannerBackedStartRun,
    startRunSlaTelemetry
  );
  const app = Fastify({ logger: false });
  app.post('/runs/start', async (request, reply) =>
    startRunRoute(request as never, reply, facade, {
      adapterRegistry: createStartRunTargetAdapterRegistryFromValues(['temporal']),
      observability,
      runIdGenerator: () => RUN_ID,
    })
  );
  await app.ready();

  return {
    app,
    exporter,
    observability,
    planRef,
    planPathSentinel: PLAN_PATH_SENTINEL,
    secretToken: SECRET_TOKEN,
    temporalSubmissions,
    async close() {
      await app.close();
      await observability.shutdown();
    },
  };
}

type RouteResponse = Awaited<ReturnType<ReturnType<typeof Fastify>['inject']>>;

export async function startRunProofRequest(
  proof: StartRunOpenTelemetryProof
): Promise<RouteResponse> {
  return proof.app.inject({
    method: 'POST',
    url: '/runs/start',
    headers: { authorization: `Bearer ${proof.secretToken}` },
    payload: {
      tenantId: 'tenant-1',
      projectId: 'project-1',
      environmentId: 'env-1',
      selection: { mode: 'explicit', nodeIds: ['model-a'] },
      planRef: proof.planRef,
      targetAdapter: 'temporal',
    },
  });
}

function createControlledPlanStore(bytes: Uint8Array): IStoredPlanArtifactStore {
  const artifact = { bytes, executionPolicy: {} };
  return {
    async getStoredPlanValidationRecord() {
      return undefined;
    },
    async fetchStoredPlanArtifact() {
      return artifact;
    },
    async fetchStoredPlanArtifactForValidation() {
      return artifact;
    },
    async storePlanArtifact() {
      throw new Error('Unexpected plan compilation in planRef StartRun proof');
    },
    async markStoredPlanArtifactValid() {
      throw new Error('Unexpected validation write in planRef StartRun proof');
    },
    async markStoredPlanArtifactInvalid() {
      throw new Error('Unexpected invalidation write in accepted StartRun proof');
    },
  };
}

function createAuthenticator(): IAuthenticator {
  return {
    async authenticateBearerToken(token) {
      if (token !== SECRET_TOKEN) return { ok: false, code: 'INVALID_TOKEN' };
      return {
        ok: true,
        principal: {
          principalId: 'proof-user',
          principalType: 'user',
          subjectId: 'proof-subject',
          issuer: 'https://issuer.example.com',
          audience: 'dvt-api',
          expiresAt: new Date('2027-01-01T00:00:00.000Z'),
          rawScopes: [],
          assertedTenantIds: [],
          assertedProjectIds: [],
        },
      };
    },
  };
}

function createAuthorizer(authorized: boolean): AuthorizeCommandScopeService {
  const accessDecision: IAccessDecisionService = {
    async decide(_principal, requestedScope) {
      return authorized
        ? { ok: true, approvedScope: toExecutionScope(requestedScope) }
        : { ok: false, reason: 'ACTION_NOT_GRANTED' };
    },
  };
  return new AuthorizeCommandScopeService(
    accessDecision,
    { async record() {} },
    () => new Date('2026-08-03T00:00:00.000Z')
  );
}

function createUnusedWorkspaceGraphDraftStore(): IWorkspaceGraphDraftStore {
  return {
    async migrate() {},
    async close() {},
    async read() {
      return null;
    },
    async save() {
      throw new Error('Unexpected graph draft write in planRef StartRun proof');
    },
  };
}
