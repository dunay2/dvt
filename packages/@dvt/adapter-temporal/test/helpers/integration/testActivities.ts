import { createHash } from 'node:crypto';

import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import {
  parseExecutionPlan,
  type ExecutionPlan,
  type PlanRef,
  type RunExecutionPolicy,
  type ScopedPlanRef,
} from '@dvt/contracts';
import type { RunStateCommandPort } from '@dvt/engine';

import {
  createScopedTemporalPlanArtifactReader,
  type ActivityDeps,
} from '../../../src/activities/stepActivities.js';

import { TestClock, TestIdempotency, TestOutbox, TestStateStore } from './runtimeState.js';

export interface TestPlanArtifact {
  bytes: Uint8Array;
  executionPolicy: RunExecutionPolicy;
}

export type TestPlanFetcher = IStoredPlanArtifactReader;

export interface TestPlanIntegrityResult {
  executionPolicy: RunExecutionPolicy;
  plan: ExecutionPlan;
}

export interface TestPlanIntegrity {
  fetchAndValidate(
    input: ScopedPlanRef,
    fetcher: TestPlanFetcher
  ): Promise<TestPlanIntegrityResult>;
}

export interface TestActivityDeps extends ActivityDeps {
  fetcher: TestPlanFetcher;
  integrity: TestPlanIntegrity;
}

interface CreateActivityDepsOptions {
  onFetch?: (planRef: PlanRef) => void;
  fetchPlanBytes?: (planRef: PlanRef) => Promise<Uint8Array> | Uint8Array;
}

class TestIntegrity implements TestPlanIntegrity {
  async fetchAndValidate(
    input: ScopedPlanRef,
    fetcher: TestPlanFetcher
  ): Promise<TestPlanIntegrityResult> {
    const artifact = await fetcher.fetchStoredPlanArtifact(input);
    const bytes = artifact.bytes;
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== input.planRef.sha256) {
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
    getStoredPlanValidationRecord: async () => undefined,
    fetchStoredPlanArtifact: async (input: ScopedPlanRef): Promise<TestPlanArtifact> => {
      options?.onFetch?.(input.planRef);
      return {
        bytes: (await options?.fetchPlanBytes?.(input.planRef)) ?? planBytes,
        executionPolicy: {},
      };
    },
    fetchStoredPlanArtifactForValidation: async (
      input: ScopedPlanRef
    ): Promise<TestPlanArtifact> => {
      options?.onFetch?.(input.planRef);
      return {
        bytes: (await options?.fetchPlanBytes?.(input.planRef)) ?? planBytes,
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
  const fetcher = createPlanFetcher(planBytes, options);
  const integrity = new TestIntegrity();

  return {
    runStateCommandPort,
    clock: new TestClock(),
    idempotency: new TestIdempotency(),
    fetcher,
    integrity,
    planArtifactReader: createScopedTemporalPlanArtifactReader({
      fetcher,
      integrity,
    }),
  };
}
