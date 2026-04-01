import type { EngineRunRef } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../../src/adapters/IProviderAdapter.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import { SnapshotProjector } from '../../src/core/SnapshotProjector.js';
import { WorkflowEngine } from '../../src/core/WorkflowEngine.js';
import { WorkflowEngineCoreService } from '../../src/core/WorkflowEngineCoreService.js';
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
    async getRunStatus(runRef) {
      return { runId: runRef.runId, status: 'RUNNING' } as const;
    },
    async signal() {},
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
    observability: input?.observability ?? createNoopObservability(),
    adapters,
    requiredProviders: input?.requiredProviders,
    observabilityFallbackThrottleMs: input?.observabilityFallbackThrottleMs,
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
