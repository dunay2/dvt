import {
  CURRENT_SIGNAL_SEMANTICS_VERSION,
  type EngineRunRef,
  type ExecutionPlan,
  type PlanRef,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex } from '@dvt/crypto';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { WorkflowEngineCoreService } from '../../src/core/WorkflowEngineCoreService.js';
import type { IRunExecutionContextResolver } from '../../src/ports/IRunExecutionContextResolver.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import type { IAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import type { IClock } from '../../src/utils/clock.js';
import { SequenceClock } from '../../src/utils/clock.js';

export function makeTemporalAdapter(overrides?: Partial<IProviderAdapter>): IProviderAdapter {
  const base: IProviderAdapter = {
    provider: 'temporal',
    async startRun(_plan, _planRef, ctx) {
      return {
        provider: 'temporal',
        tenantId: ctx.tenantId,
        namespace: 'default',
        workflowId: `wf-${ctx.runId}`,
        runId: ctx.runId,
      } as EngineRunRef;
    },
    async cancelRun() {},
    async getRunStatus(runRef) {
      return { runId: runRef.runId, status: 'RUNNING' } as const;
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

export function createWorkflowEngineFixture(input?: {
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
  planFetcher?: { fetch(planRef: PlanRef): Promise<Uint8Array> };
}): {
  engine: WorkflowEngine;
  store: InMemoryTxStore;
  stateStoreRead: InMemoryTxStore;
  stateStoreWrite: InMemoryTxStore;
  intentStore: InMemoryStartRunIntentStore;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  projector: SnapshotProjector;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
} {
  const store = input?.stateStore ?? input?.stateStoreRead ?? new InMemoryTxStore();
  const stateStoreRead = input?.stateStoreRead ?? store;
  const stateStoreWrite = input?.stateStoreWrite ?? store;
  const intentStore = input?.intentStore ?? new InMemoryStartRunIntentStore();
  const projector = input?.projector ?? new SnapshotProjector();
  const idempotency = input?.idempotency ?? new IdempotencyKeyBuilder();
  const clock = input?.clock ?? new SequenceClock('2026-02-12T00:00:00.000Z');
  const adapters =
    input?.adapters ??
    (input?.adapter
      ? makeProviderMap(input.adapter)
      : new Map<EngineRunRef['provider'], IProviderAdapter>());
  const defaultPlan = makeDefaultExecutionPlan();
  const planFetcher =
    input?.planFetcher ??
    ({
      async fetch(_planRef: PlanRef): Promise<Uint8Array> {
        return Buffer.from(JSON.stringify(defaultPlan), 'utf8');
      },
    } as const);

  const engine = new WorkflowEngine({
    stateStoreRead,
    stateStoreWrite,
    projector,
    idempotency,
    clock,
    policy: new RunAccessPolicy({
      authorizer: input?.authorizer ?? new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: input?.allowedSchemes ?? ['https'] }),
    }),
    intentStore,
    planFetcher,
    observability: input?.observability ?? createNoopObservability(),
    adapters,
    requiredProviders: input?.requiredProviders,
    observabilityFallbackThrottleMs: input?.observabilityFallbackThrottleMs,
    runExecutionContextResolver: input?.runExecutionContextResolver,
  });

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
    uri,
    sha256: sha256Hex(bytes),
    schemaVersion: plan.metadata.schemaVersion,
    planId: plan.metadata.planId,
    planVersion: plan.metadata.planVersion,
    sizeBytes: bytes.byteLength,
  };
}

export function makePlanFetcherForPlan(plan: ExecutionPlan): {
  fetch(planRef: PlanRef): Promise<Uint8Array>;
} {
  return {
    async fetch(_planRef: PlanRef): Promise<Uint8Array> {
      return Buffer.from(JSON.stringify(plan), 'utf8');
    },
  };
}

export function makeDefaultExecutionPlan(): ExecutionPlan {
  const inputHashSha256 = '1'.repeat(64);
  const steps: ExecutionPlan['steps'] = [];
  const planId = sha256Hex(
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
      schemaVersion: 'v1.2',
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
}): {
  core: WorkflowEngineCoreService;
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
  const clock = input?.clock ?? new SequenceClock('2026-03-26T00:00:00.000Z');
  const adapter = input?.adapter ?? makeTemporalAdapter(input?.adapterOverrides);
  const adapters = makeProviderMap(adapter);

  const core = new WorkflowEngineCoreService({
    stateStoreRead,
    stateStoreWrite,
    projector,
    idempotency,
    policy: new RunAccessPolicy({
      authorizer: input?.authorizer ?? new AllowAllAuthorizer(),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: input?.allowedSchemes ?? ['https'] }),
    }),
    adapters,
    observability: input?.observability ?? createNoopObservability(),
    clock,
  });

  return {
    core,
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
