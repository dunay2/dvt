/** @baseline ADR-0030 @ownedConcern Prove late provider completion through Engine and maintenance without redispatch. */
import { asIsoUtcString, parseEngineRunRef } from '@dvt/contracts';
import { createNoopObservability } from '@dvt/observability';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { RunMaintenanceService } from '../../src/services/RunMaintenanceService.js';
import { InMemoryStartRunIntentStore } from '../../src/state/InMemoryStartRunIntentStore.js';
import {
  createWorkflowEngineFixture,
  makeTemporalAdapter,
} from '../helpers/workflowEngine.fixture.js';

import { makeContext, makePlanRef } from './WorkflowEngine.helpers.js';

describe('late provider start completion', () => {
  afterEach(() => vi.useRealTimers());

  it.each([true, false])(
    'reconciles after timeout and an early missing observation (estimated=%s)',
    async (estimated) => {
      vi.useFakeTimers();
      let now = Date.parse('2026-10-01T00:00:00.000Z');
      const clock = { nowIsoUtc: () => asIsoUtcString(new Date(now).toISOString()) };
      const intentStore = new InMemoryStartRunIntentStore(clock);
      const runId = 'late-provider-start';
      const runRef = parseEngineRunRef({
        provider: 'temporal',
        tenantId: 't',
        namespace: 'default',
        workflowId: runId,
        runId,
      });
      const target = { runRef, executionId: 'actual-late-execution' };
      let release!: () => void;
      let entered!: () => void;
      const providerEntered = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const providerRelease = new Promise<void>((resolve) => {
        release = resolve;
      });
      let visible = false;
      const adapter = makeTemporalAdapter({
        ...(estimated ? { estimateRunRef: () => runRef } : {}),
        startRun: async () => {
          entered();
          await providerRelease;
          visible = true;
          return runRef;
        },
        observeStartRun: async () =>
          visible ? { kind: 'active', target } : { kind: 'missing_at_observation' },
      });
      const start = vi.spyOn(adapter, 'startRun');
      const cancel = vi.spyOn(adapter, 'cancelRun');
      const fixture = createWorkflowEngineFixture({ adapter, clock, intentStore });
      const service = new RunMaintenanceService({
        stateStoreRead: fixture.store,
        stateStoreWrite: fixture.store,
        intentStore,
        adapters: fixture.adapters,
        clock,
        idempotency: fixture.idempotency,
        authorizer: new AllowAllAuthorizer(),
        observability: createNoopObservability(),
      });
      const ref = {
        tenantId: 't',
        intentId: fixture.idempotency.startRunIntentId('t', runId, 1, 'temporal'),
      };
      const result = fixture.engine
        .startRun(makePlanRef(), makeContext(runId))
        .catch((error: unknown) => error);
      try {
        await providerEntered;
        expect(await intentStore.getIntent(ref)).toMatchObject({
          providerOutcome: { kind: 'unknown' },
        });
        await vi.advanceTimersByTimeAsync(30_001);
        expect(await result).toBeInstanceOf(Error);
        now += 600_000;
        expect(await service.reconcileStartRunIntent(ref)).toEqual({ kind: 'blocked' });
        expect(await intentStore.getIntent(ref)).toMatchObject({
          status: 'PENDING',
          providerOutcome: { kind: 'unknown' },
          reconciliation: { attempts: 1, reason: 'provider_missing' },
        });
        release();
        await vi.advanceTimersByTimeAsync(0);
        expect(visible).toBe(true);
        expect(await intentStore.getIntent(ref)).toMatchObject({
          providerOutcome: { kind: 'unknown' },
        });
        now += 600_000;
        expect(await service.reconcileStartRunIntent(ref)).toEqual({
          kind: estimated ? 'confirmed' : 'blocked',
        });
        expect(start).toHaveBeenCalledTimes(1);
        expect(
          (await fixture.store.listEvents('t', runId)).some(
            (event) => event.eventType === 'RunFailed'
          )
        ).toBe(false);
        if (estimated) {
          expect(cancel).not.toHaveBeenCalled();
          expect(await intentStore.getIntent(ref)).toMatchObject({
            status: 'RESOLVED',
            providerOutcome: { kind: 'started', runRef },
          });
        } else {
          expect(cancel).toHaveBeenCalledExactlyOnceWith(runRef, target.executionId);
          expect(await intentStore.getIntent(ref)).toMatchObject({
            status: 'DISPATCHED',
            compensation: { kind: 'required' },
          });
          expect(await fixture.store.getRunMetadataByRunId('t', runId)).toBeNull();
        }
      } finally {
        release();
        await vi.advanceTimersByTimeAsync(0);
      }
    }
  );
});
