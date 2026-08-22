/**
 * @ownedConcern WorkflowEngine test composition fixture using fake provider adapters and engine-owned ports.
 *
 * Composes in-memory stores and engine services for tests without production
 * adapter or provider-runtime imports.
 */
import type { IStoredPlanArtifactReader, StoredPlanArtifact } from '@dvt/artifacts';
import {
  asIsoUtcString,
  asNonBlankString,
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
  type RunExecutionPolicy,
  type ScopedPlanRef,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex, sha256HexUtf8 } from '@dvt/crypto';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { buildRunRecoveryService } from '../../src/application/RecoverRunApplicationService.js';
import { StartRunAdmissionGuard } from '../../src/application/StartRunAdmissionGuard.js';
import { buildStartRunApplicationService } from '../../src/application/StartRunApplicationService.js';
import { buildWorkflowEngineUseCases } from '../../src/application/workflow-engine-use-cases/index.js';
import { buildWorkflowEngineFacade } from '../../src/core/buildWorkflowEngineFacade.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { WorkflowEngineCoreService } from '../../src/core/WorkflowEngineCoreService.js';
import type { IRunExecutionContextBindingPolicy } from '../../src/ports/IRunExecutionContextBindingPolicy.js';
import type { IRunExecutionContextResolver } from '../../src/ports/IRunExecutionContextResolver.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import type { IAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { buildRunCommandService } from '../../src/services/runControl/RunCommandService.js';
import { buildRunSignalService } from '../../src/services/runControl/RunSignalService.js';
import { RunEnrichmentService } from '../../src/services/RunEnrichmentService.js';
import {
  buildRunStatusQueryService,
  RunStatusQueryService,
} from '../../src/services/RunStatusQueryService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import type { IClock } from '../../src/utils/clock.js';
import { SequenceClock } from '../../src/utils/clock.js';

export function makeTemporalAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
  const base: IProviderAdapter = {
    provider: 'temporal',
    async startRun(_planRef, ctx) {
      return {
        provider: 'temporal',
        tenantId: ctx.tenantId,
        namespace: 'default',
        workflowId: `wf-${ctx.runId}`,
        runId: ctx.runId,
      } as EngineRunRef;
    },
    async cancelRun() {},
    async getProviderStatusView() {
      return { provider: 'temporal', providerStatus: 'RUNNING' } as const;
    },
    async signal() {},
    signalSemanticsVersions() {
      return [CURRENT_SIGNAL_SEMANTICS_VERSION];
    },
  };

  return overrides ? { ...base, ...overrides } : base;
}

export function makeProviderMap(
  adapter: IProviderAdapter
): Map<EngineRunRef['provider'], IProviderAdapter> {
  return new Map([[adapter.provider, adapter]]);
}

interface WorkflowEngineFixtureInput {
  adapters?: Map<EngineRunRef['provider'], IProviderAdapter>;
  adapter?: IProviderAdapter;
  authorizer?: IAuthorizer;
  observability?: IObservability;
  stateStore?: InMemoryTxStore;
  stateStoreRead?: InMemoryTxStore;
  stateStoreWrite?: InMemoryTxStore;
  intentStore?: InMemoryStartRunIntentStore;
  projector?: SnapshotProjector;
  idempotency?: IdempotencyKeyBuilder;
  clock?: IClock;
  allowedSchemes?: string[];
  requiredProviders?: EngineRunRef['provider'][];
  observabilityFallbackThrottleMs?: number;
  runExecutionContextResolver?: IRunExecutionContextResolver;
  runExecutionContextBindingPolicy?: IRunExecutionContextBindingPolicy;
  planFetcher?: IStoredPlanArtifactReader;
}

interface WorkflowEngineFixture {
  engine: WorkflowEngine;
  store: InMemoryTxStore;
  stateStoreRead: InMemoryTxStore;
  stateStoreWrite: InMemoryTxStore;
  intentStore: InMemoryStartRunIntentStore;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
}

export function createWorkflowEngineFixture(
  input?: WorkflowEngineFixtureInput
): WorkflowEngineFixture {
  const store = input?.stateStore ?? input?.stateStoreRead ?? new InMemoryTxStore();
  const stateStoreRead = input?.stateStoreRead ?? store;
  const stateStoreWrite = input?.stateStoreWrite ?? store;
  const intentStore = input?.intentStore ?? new InMemoryStartRunIntentStore();
  const projector = input?.projector ?? new SnapshotProjector();
  const idempotency = input?.idempotency ?? new IdempotencyKeyBuilder();
  const clock = input?.clock ?? new SequenceClock(asIsoUtcString('2026-02-12T00:00:00.000Z'));
  const observability = input?.observability ?? createNoopObservability();
  const adapters =
    input?.adapters ??
    (input?.adapter
      ? makeProviderMap(input.adapter)
      : new Map<EngineRunRef['provider'], IProviderAdapter>());
  const planFetcher = input?.planFetcher ?? makePlanFetcherForPlan(makeDefaultExecutionPlan());
  const policy = new RunAccessPolicy({
    authorizer: input?.authorizer ?? new AllowAllAuthorizer(),
    planRefPolicy: new PlanRefPolicy({ allowedSchemes: input?.allowedSchemes ?? ['https'] }),
  });
  const startRunApplicationService = buildStartRunApplicationService({
    guard: new StartRunAdmissionGuard({
      policy,
      stateStoreRead,
      adapters,
      ...(input?.runExecutionContextResolver === undefined
        ? {}
        : { runExecutionContextResolver: input.runExecutionContextResolver }),
      ...(input?.runExecutionContextBindingPolicy === undefined
        ? {}
        : { runExecutionContextBindingPolicy: input.runExecutionContextBindingPolicy }),
    }),
    stateStoreRead,
    stateStoreWrite,
    idempotency,
    clock,
    intentStore,
    planFetcher,
    observability,
    ...(input?.observabilityFallbackThrottleMs === undefined
      ? {}
      : { observabilityFallbackThrottleMs: input.observabilityFallbackThrottleMs }),
  });
  const runCommandService = buildRunCommandService({
    stateStoreRead,
    idempotency,
    policy,
    adapters,
    observability,
    clock,
  });
  const runSignalService = buildRunSignalService({
    stateStoreRead,
    stateStoreWrite,
    idempotency,
    policy,
    adapters,
    observability,
    clock,
  });
  const runStatusQueryService = buildRunStatusQueryService({
    stateStoreRead,
    projector,
    policy,
    observability,
    clock,
  });
  const runRecoveryService = buildRunRecoveryService({
    stateStoreRead,
    stateStoreWrite,
    projector,
    policy,
    planFetcher,
    adapters,
    observability,
    clock,
    idempotency,
    startRunApplicationService,
    ...(input?.runExecutionContextResolver === undefined
      ? {}
      : { runExecutionContextResolver: input.runExecutionContextResolver }),
    ...(input?.runExecutionContextBindingPolicy === undefined
      ? {}
      : { runExecutionContextBindingPolicy: input.runExecutionContextBindingPolicy }),
  });
  const workflowUseCases = buildWorkflowEngineUseCases({
    observability,
    startRunApplicationService,
    runRecoveryService,
    runCommandService,
    runSignalService,
    runStatusQueryService,
  });
  const engine = buildWorkflowEngineFacade({
    ...workflowUseCases,
    adapters,
    ...(input?.requiredProviders === undefined
      ? {}
      : { requiredProviders: input.requiredProviders }),
  }) as WorkflowEngine;

  return {
    engine,
    store,
    stateStoreRead,
    stateStoreWrite,
    intentStore,
    adapters,
    projector,
    idempotency,
    clock,
  };
}

export function makePlanRefForPlan(
  plan: ExecutionPlan,
  uri = `https://example.com/plans/${plan.metadata.planId}.json`
): PlanRef {
  const bytes = Buffer.from(JSON.stringify(plan), 'utf8');
  return {
    uri: asNonBlankString(uri),
    sha256: asNonBlankString(sha256Hex(bytes)),
    schemaVersion: asNonBlankString(plan.metadata.schemaVersion),
    planId: asNonBlankString(plan.metadata.planId),
    planVersion: asNonBlankString(plan.metadata.planVersion),
    sizeBytes: bytes.byteLength,
  };
}

export function makePlanFetcherForPlan(
  plan: ExecutionPlan,
  executionPolicy: RunExecutionPolicy = {}
): IStoredPlanArtifactReader {
  return {
    async getStoredPlanValidationRecord() {
      return undefined;
    },
    async fetchStoredPlanArtifact(_input: ScopedPlanRef): Promise<StoredPlanArtifact> {
      return {
        bytes: Buffer.from(JSON.stringify(plan), 'utf8'),
        executionPolicy,
      };
    },
    async fetchStoredPlanArtifactForValidation(_input: ScopedPlanRef): Promise<StoredPlanArtifact> {
      return {
        bytes: Buffer.from(JSON.stringify(plan), 'utf8'),
        executionPolicy,
      };
    },
  };
}

export function makeDefaultExecutionPlan(): ExecutionPlan {
  const inputHashSha256 = '1'.repeat(64);
  const steps: ExecutionPlan['steps'] = [];
  const planId = sha256HexUtf8(
    jcsCanonicalize({
      metadata: {
        planVersion: '1.0',
        inputHashSha256,
      },
      steps,
    })
  );
  return {
    metadata: {
      planId,
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256,
      createdAtIso: '2026-02-12T00:00:00.000Z',
    },
    steps,
  };
}

export function createWorkflowEngineCoreFixture(input?: {
  adapter?: IProviderAdapter;
  adapterOverrides?: Partial<IProviderAdapter>;
  stateStore?: InMemoryTxStore;
  stateStoreRead?: InMemoryTxStore;
  stateStoreWrite?: InMemoryTxStore;
  observability?: IObservability;
  projector?: SnapshotProjector;
  idempotency?: IdempotencyKeyBuilder;
  clock?: IClock;
  authorizer?: IAuthorizer;
  allowedSchemes?: string[];
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
}): {
  core: WorkflowEngineCoreService;
  runStatusQueryService: RunStatusQueryService;
  runEnrichmentService: RunEnrichmentService;
  store: InMemoryTxStore;
  stateStoreRead: InMemoryTxStore;
  stateStoreWrite: InMemoryTxStore;
  adapter: IProviderAdapter;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
} {
  const store = input?.stateStore ?? input?.stateStoreRead ?? new InMemoryTxStore();
  const stateStoreRead = input?.stateStoreRead ?? store;
  const stateStoreWrite = input?.stateStoreWrite ?? store;
  const projector = input?.projector ?? new SnapshotProjector();
  const idempotency = input?.idempotency ?? new IdempotencyKeyBuilder();
  const clock = input?.clock ?? new SequenceClock(asIsoUtcString('2026-03-26T00:00:00.000Z'));
  const adapter = input?.adapter ?? makeTemporalAdapter(input?.adapterOverrides);
  const adapters = makeProviderMap(adapter);
  const policy = new RunAccessPolicy({
    authorizer: input?.authorizer ?? new AllowAllAuthorizer(),
    planRefPolicy: new PlanRefPolicy({ allowedSchemes: input?.allowedSchemes ?? ['https'] }),
  });
  const observability = input?.observability ?? createNoopObservability();
  const runCommandService = buildRunCommandService({
    stateStoreRead,
    idempotency,
    policy,
    adapters,
    observability,
    clock,
    ...(input?.timeouts ? { timeouts: input.timeouts } : {}),
  });
  const runSignalService = buildRunSignalService({
    stateStoreRead,
    stateStoreWrite,
    idempotency,
    policy,
    adapters,
    observability,
    clock,
    ...(input?.timeouts ? { timeouts: input.timeouts } : {}),
  });

  const core = new WorkflowEngineCoreService({
    runCommandService,
    runSignalService,
  });
  const runStatusQueryService = new RunStatusQueryService({
    stateStoreRead,
    projector,
    policy,
    observability,
    clock,
  });
  const runEnrichmentService = new RunEnrichmentService({
    stateStoreRead,
    projector,
    policy,
    adapters,
    observability,
    ...(input?.timeouts ? { timeouts: input.timeouts } : {}),
  });

  return {
    core,
    runStatusQueryService,
    runEnrichmentService,
    store,
    stateStoreRead,
    stateStoreWrite,
    adapter,
    adapters,
    projector,
    idempotency,
    clock,
  };
}
