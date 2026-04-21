import { createHash } from 'node:crypto';

import type { IRunExecutionContextReader } from '@dvt/artifacts';
import {
  parseExecutionPlan,
  type ExecutionPlan,
  type PlanRef,
  type RunExecutionPolicy,
} from '@dvt/contracts';
import type { RunStateCommandPort } from '@dvt/engine';

import type { ActivityDeps, DbtPluginRunner } from '../../../src/activities/stepActivities.js';

import { TestClock, TestIdempotency, TestOutbox, TestStateStore } from './runtimeState.js';

export interface TestPlanArtifact {
  bytes: Uint8Array;
  executionPolicy: RunExecutionPolicy;
}

export interface TestPlanFetcher {
  fetch(planRef: PlanRef): Promise<TestPlanArtifact>;
}

export interface TestPlanIntegrityResult {
  executionPolicy: RunExecutionPolicy;
  plan: ExecutionPlan;
}

export interface TestPlanIntegrity {
  fetchAndValidate(planRef: PlanRef, fetcher: TestPlanFetcher): Promise<TestPlanIntegrityResult>;
}

export interface TestActivityDeps extends ActivityDeps {
  fetcher: TestPlanFetcher;
  integrity: TestPlanIntegrity;
}

interface CreateActivityDepsOptions {
  onFetch?: (planRef: PlanRef) => void;
  fetchPlanBytes?: (planRef: PlanRef) => Promise<Uint8Array> | Uint8Array;
  runExecutionContextReader?: IRunExecutionContextReader;
  dbtPluginRunner?: DbtPluginRunner;
}

class TestIntegrity implements TestPlanIntegrity {
  async fetchAndValidate(
    planRef: PlanRef,
    fetcher: TestPlanFetcher
  ): Promise<TestPlanIntegrityResult> {
    const artifact = await fetcher.fetch(planRef);
    const bytes = artifact.bytes;
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== planRef.sha256) {
      throw new Error('PLAN_INTEGRITY_VALIDATION_FAILED');
    }

    return {
      plan: decodeExecutionPlanForTests(bytes),
      executionPolicy: artifact.executionPolicy,
    };
  }
}

function decodeExecutionPlanForTests(bytes: Uint8Array): ExecutionPlan {
  return parseExecutionPlan(JSON.parse(Buffer.from(bytes).toString('utf-8')) as unknown);
}

function createRunStateCommandPort(store: TestStateStore): RunStateCommandPort {
  return {
    bootstrapRun: (input) => store.bootstrapRunTx(input),
    appendTransitions: (runId, events) => store.appendAndEnqueueTx(runId, events),
  };
}

function createPlanFetcher(
  planBytes: Uint8Array,
  options?: CreateActivityDepsOptions
): TestPlanFetcher {
  return {
    fetch: async (planRef: PlanRef) => {
      options?.onFetch?.(planRef);
      return {
        bytes: (await options?.fetchPlanBytes?.(planRef)) ?? planBytes,
        executionPolicy: {},
      };
    },
  };
}

export function createActivityDeps(
  store: TestStateStore,
  _outbox: TestOutbox,
  planBytes: Uint8Array,
  options?: CreateActivityDepsOptions
): TestActivityDeps {
  const runStateCommandPort = createRunStateCommandPort(store);

  return {
    runStateCommandPort,
    clock: new TestClock(),
    idempotency: new TestIdempotency(),
    ...(options?.runExecutionContextReader === undefined
      ? {}
      : { runExecutionContextReader: options.runExecutionContextReader }),
    ...(options?.dbtPluginRunner === undefined ? {} : { dbtPluginRunner: options.dbtPluginRunner }),
    fetcher: createPlanFetcher(planBytes, options),
    integrity: new TestIntegrity(),
  };
}
