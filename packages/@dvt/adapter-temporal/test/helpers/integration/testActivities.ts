import { createHash } from 'node:crypto';

import type { IRunExecutionContextReader } from '@dvt/artifacts';
import type { PlanRef } from '@dvt/contracts';
import type { RunStateCommandPort } from '@dvt/engine';

import type { ActivityDeps, DbtPluginRunner } from '../../../src/activities/stepActivities.js';

import { TestClock, TestIdempotency, TestOutbox, TestStateStore } from './runtimeState.js';

class TestIntegrity {
  async fetchAndValidate(
    planRef: PlanRef,
    fetcher: { fetch(planRef: PlanRef): Promise<Uint8Array> }
  ): Promise<Uint8Array> {
    const bytes = await fetcher.fetch(planRef);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== planRef.sha256) {
      throw new Error('PLAN_INTEGRITY_VALIDATION_FAILED');
    }
    return bytes;
  }
}

export function createActivityDeps(
  store: TestStateStore,
  _outbox: TestOutbox,
  planBytes: Uint8Array,
  options?: {
    onFetch?: (planRef: PlanRef) => void;
    fetchPlanBytes?: (planRef: PlanRef) => Promise<Uint8Array> | Uint8Array;
    runExecutionContextReader?: IRunExecutionContextReader;
    dbtPluginRunner?: DbtPluginRunner;
  }
): ActivityDeps {
  const runStateCommandPort: RunStateCommandPort = {
    bootstrapRun: (input) => store.bootstrapRunTx(input),
    appendTransitions: (runId, events) => store.appendAndEnqueueTx(runId, events),
  };

  return {
    runStateCommandPort,
    clock: new TestClock(),
    idempotency: new TestIdempotency(),
    ...(options?.runExecutionContextReader === undefined
      ? {}
      : { runExecutionContextReader: options.runExecutionContextReader }),
    ...(options?.dbtPluginRunner === undefined ? {} : { dbtPluginRunner: options.dbtPluginRunner }),
    fetcher: {
      fetch: async (planRef: PlanRef) => {
        options?.onFetch?.(planRef);
        return (await options?.fetchPlanBytes?.(planRef)) ?? planBytes;
      },
    },
    integrity: new TestIntegrity(),
  };
}
