/** @ownedConcern Assemble the real in-memory ownership and canonical stores for maintenance proofs. */
import { asIsoUtcString, parseEngineRunRef, type EngineRunRef } from '@dvt/contracts';

import { createNoopObservability } from '../../../observability/src/noopObservability.js';
import { IdempotencyKeyBuilder } from '../../src/core/idempotency.js';
import type { StartRunIntentClaimReceipt } from '../../src/ports/IStartRunIntentStore.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { RunMaintenanceService } from '../../src/services/RunMaintenanceService.js';
import { StartRunEventFactory } from '../../src/services/startRun/StartRunEventFactory.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import { InMemoryTxStore } from '../../src/state/InMemoryTxStore.js';
import type { IClock } from '../../src/utils/clock.js';
import { makeContext, makePlanRef } from '../core/WorkflowEngine.helpers.js';

import { makeTemporalAdapter } from './workflowEngine.fixture.js';

export async function startRunMaintenanceFixture(
  options: { canonical?: boolean; outcome?: 'not_requested' | 'unknown' | 'started' } = {}
): Promise<{
  service: RunMaintenanceService;
  store: InMemoryTxStore;
  intentStore: InMemoryStartRunIntentStore;
  adapter: ReturnType<typeof makeTemporalAdapter>;
  adapters: Map<'temporal', ReturnType<typeof makeTemporalAdapter>>;
  observability: ReturnType<typeof createNoopObservability>;
  clock: IClock;
  target: { runRef: EngineRunRef; executionId: string };
  context: ReturnType<typeof makeContext>;
  receipt: StartRunIntentClaimReceipt;
  advance: (milliseconds?: number) => void;
}> {
  let now = Date.parse('2026-09-30T00:00:00.000Z');
  const clock: IClock = { nowIsoUtc: () => asIsoUtcString(new Date(now).toISOString()) };
  const intentStore = new InMemoryStartRunIntentStore(clock);
  const store = new InMemoryTxStore({ startRunIntents: intentStore });
  const context = { ...makeContext('maintenance-run'), logicalAttemptId: 1 };
  const runRef = parseEngineRunRef({
    provider: 'temporal',
    tenantId: context.tenantId,
    runId: context.runId,
    workflowId: 'workflow',
    namespace: 'default',
  });
  const target = { runRef, executionId: 'actual-execution' };
  const adapter = makeTemporalAdapter({
    observeStartRun: async () => ({ kind: 'active', target }),
  });
  const adapters = new Map([['temporal' as const, adapter]]);
  const observability = createNoopObservability();
  const idempotency = new IdempotencyKeyBuilder();
  const claim = await intentStore.claimIntent({
    intentId: 'maintenance-intent',
    tenantId: context.tenantId,
    runId: context.runId,
    provider: 'temporal',
    createdAt: clock.nowIsoUtc(),
  });
  if (claim.kind !== 'acquired') throw new Error('Expected exclusive claim');
  if (options.canonical ?? true) {
    const factory = new StartRunEventFactory({ clock, idempotency });
    const metadata = factory.buildRunMetadata(context, makePlanRef(), runRef, clock.nowIsoUtc());
    await store.applyStartRunWrite(claim.receipt, {
      kind: 'bootstrap',
      input: { metadata, firstEvents: [factory.buildRunEvent(metadata, 'RunQueued')] },
    });
  }
  const outcome = options.outcome ?? 'unknown';
  if (outcome !== 'not_requested') await intentStore.authorizeDispatch(claim.receipt);
  if (outcome === 'started') await intentStore.markDispatched(claim.receipt, runRef);
  const service = new RunMaintenanceService({
    stateStoreRead: store,
    stateStoreWrite: store,
    intentStore,
    adapters,
    authorizer: new AllowAllAuthorizer(),
    clock,
    idempotency,
    observability,
  });
  const advance = (milliseconds = 600_000): void => {
    now += milliseconds;
  };
  advance();
  return {
    service,
    store,
    intentStore,
    adapter,
    adapters,
    observability,
    clock,
    target,
    context,
    receipt: claim.receipt,
    advance,
  };
}
