import { it } from 'vitest';
import { setTimeout as sleep } from 'node:timers/promises';

import type {
  EventEnvelope as RunEventPersisted,
  IOutboxStorage,
  OutboxRecord,
} from '@dvt/contracts';
import { InMemoryEventBus } from '@dvt/delivery/testing';

import {
  OutboxWorkerRuntime,
  type OutboxWorkerRuntimeHooks,
  type OutboxWorkerRuntimeLogger,
  type OutboxWorkerRuntimeOptions,
} from '../../src/runtime/OutboxWorkerRuntime.js';

type RunIdentifier = RunEventPersisted['runId'];
type EventIdentifier = RunEventPersisted['eventId'];
type IdempotencyKey = RunEventPersisted['idempotencyKey'];
type FailureMessage = NonNullable<OutboxRecord['lastError']>;

interface RuntimeTestScenario {
  readonly title: string;
}

interface SyntheticFailure {
  readonly message: string;
  readonly pattern: RegExp;
}

interface RuntimeLoggerState {
  readonly logger: OutboxWorkerRuntimeLogger;
  getErrorCount(): number;
  getWarnCount(): number;
}

interface EventFixtureContext {
  readonly eventType: RunEventPersisted['eventType'];
  readonly runId: RunIdentifier;
  readonly tenantId: RunEventPersisted['tenantId'];
  readonly projectId: RunEventPersisted['projectId'];
  readonly environmentId: RunEventPersisted['environmentId'];
  readonly planId: RunEventPersisted['planId'];
  readonly planVersion: RunEventPersisted['planVersion'];
  readonly logicalAttemptId: RunEventPersisted['logicalAttemptId'];
  readonly engineAttemptId: RunEventPersisted['engineAttemptId'];
  readonly emittedAt: RunEventPersisted['emittedAt'];
  readonly persistedAt: RunEventPersisted['persistedAt'];
  readonly runSeq: RunEventPersisted['runSeq'];
}

function defineScenario(title: string): RuntimeTestScenario {
  return { title };
}

function escapeRegex(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function defineSyntheticFailure(message: string): SyntheticFailure {
  return {
    message,
    pattern: new RegExp(escapeRegex(message)),
  };
}

function buildEventIdentifier(ordinal: number): EventIdentifier {
  return `evt-${ordinal}`;
}

function buildIdempotencyKey(ordinal: number): IdempotencyKey {
  return `key-${ordinal}`;
}

function buildPersistedEvent(ordinal: number): RunEventPersisted {
  return {
    eventId: buildEventIdentifier(ordinal),
    eventType: runtimeEventFixture.eventType,
    runId: runtimeEventFixture.runId,
    tenantId: runtimeEventFixture.tenantId,
    projectId: runtimeEventFixture.projectId,
    environmentId: runtimeEventFixture.environmentId,
    planId: runtimeEventFixture.planId,
    planVersion: runtimeEventFixture.planVersion,
    logicalAttemptId: runtimeEventFixture.logicalAttemptId,
    engineAttemptId: runtimeEventFixture.engineAttemptId,
    emittedAt: runtimeEventFixture.emittedAt,
    idempotencyKey: buildIdempotencyKey(ordinal),
    runSeq: runtimeEventFixture.runSeq,
    persistedAt: runtimeEventFixture.persistedAt,
  };
}

function createLoggerState(): RuntimeLoggerState {
  let errorCount = 0;
  let warnCount = 0;

  return {
    logger: {
      info: (): void => {},
      warn: (): void => {
        warnCount += 1;
      },
      error: (): void => {
        errorCount += 1;
      },
    } satisfies OutboxWorkerRuntimeLogger,
    getErrorCount() {
      return errorCount;
    },
    getWarnCount() {
      return warnCount;
    },
  };
}

export const runtimeEventFixture: EventFixtureContext = {
  eventType: 'RunQueued',
  runId: 'run-1',
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'dev',
  planId: 'plan-1',
  planVersion: '1.0.0',
  logicalAttemptId: 1,
  engineAttemptId: 1,
  emittedAt: '2026-03-08T00:00:00.000Z',
  persistedAt: '2026-03-08T00:00:00.000Z',
  runSeq: 1,
};

export const runtimeScenarios = {
  startDrainsPendingRecordsAndStopExitsCleanly: defineScenario(
    'start drains pending records and stop exits cleanly'
  ),
  stopInterruptsIdlePollingWaitWithoutHanging: defineScenario(
    'stop interrupts idle polling wait without hanging'
  ),
  stopInterruptsAnInFlightTickWhenAnInterrupterIsConfigured: defineScenario(
    'stop interrupts an in-flight tick when an interrupter is configured'
  ),
  runtimePassesAClockIntoOutboxWorkerSoTickLagIsPopulated: defineScenario(
    'runtime passes a clock into OutboxWorker so tick lag is populated'
  ),
  runtimePreservesReceiverForObjectBackedHooks: defineScenario(
    'runtime preserves receiver for object-backed hooks'
  ),
  runtimeStopsAndSurfacesTheFirstFailureWhenStopOnErrorIsTrue: defineScenario(
    'runtime stops and surfaces the first failure when stopOnError=true'
  ),
  runtimePreservesPartialTickTelemetryBeforeSurfacingAStopOnErrorFailure: defineScenario(
    'runtime preserves partial tick telemetry before surfacing a stop-on-error failure'
  ),
  runtimeTreatsHookFailuresAsBestEffortAndKeepsDraining: defineScenario(
    'runtime treats hook failures as best-effort and keeps draining'
  ),
  runtimeStartIsIdempotentAndReusesTheSameLoopPromise: defineScenario(
    'runtime start is idempotent and reuses the same loop promise'
  ),
  runtimeDoesNotStartTheLoopWhenTheProvidedSignalIsAlreadyAborted: defineScenario(
    'runtime does not start the loop when the provided signal is already aborted'
  ),
  runtimeDoesNotMissAnAbortThatLandsDuringListenerRegistration: defineScenario(
    'runtime does not miss an abort that lands during listener registration'
  ),
} as const;

export const runtimeFailures = {
  tickInterrupted: defineSyntheticFailure('synthetic tick interruption'),
  fatalPublish: defineSyntheticFailure('synthetic fatal publish failure'),
  hookStarted: defineSyntheticFailure('onStarted failed'),
  hookTick: defineSyntheticFailure('onTick failed'),
  hookStopped: defineSyntheticFailure('onStopped failed'),
} as const;

export const runtimeClock = {
  oneMinuteAfterFixtureEventMs: Date.parse('2026-03-08T00:01:00.000Z'),
} as const;

export class MemoryOutboxStorage implements IOutboxStorage {
  private readonly records: OutboxRecord[] = [];

  async enqueueTx(_runId: RunIdentifier, events: RunEventPersisted[]): Promise<void> {
    for (const event of events) {
      this.records.push({
        id: event.eventId,
        createdAt: event.persistedAt,
        idempotencyKey: event.idempotencyKey,
        payload: event,
        attempts: 0,
      });
    }
  }

  async listPending(limit: number): Promise<OutboxRecord[]> {
    return this.records.slice(0, limit);
  }

  async markDelivered(ids: EventIdentifier[]): Promise<void> {
    for (const id of ids) {
      const index = this.records.findIndex((record) => record.id === id);
      if (index >= 0) {
        this.records.splice(index, 1);
      }
    }
  }

  async markFailed(id: EventIdentifier, error: FailureMessage): Promise<void> {
    const record = this.records.find((candidate) => candidate.id === id);
    if (!record) {
      return;
    }
    record.attempts += 1;
    record.lastError = error;
  }

  async hasPendingRetries(_selection?: { shardIds?: readonly number[] }): Promise<boolean> {
    return this.records.some((record) => record.attempts > 0);
  }
}

export interface MemoryRuntimeFixture {
  storage: MemoryOutboxStorage;
  bus: InMemoryEventBus;
  runtime: OutboxWorkerRuntime;
  logger: OutboxWorkerRuntimeLogger;
  getErrorCount(): number;
  getWarnCount(): number;
}

export function createMemoryRuntime(
  options: OutboxWorkerRuntimeOptions = {}
): MemoryRuntimeFixture {
  const storage = new MemoryOutboxStorage();
  const bus = new InMemoryEventBus();
  const loggerState = createLoggerState();
  const runtime = new OutboxWorkerRuntime(storage, bus, loggerState.logger, options);

  return {
    storage,
    bus,
    runtime,
    ...loggerState,
  };
}

export async function enqueuePendingEvents(
  storage: MemoryOutboxStorage,
  ...ordinals: readonly number[]
): Promise<void> {
  await storage.enqueueTx(
    runtimeEventFixture.runId,
    ordinals.map((ordinal) => buildPersistedEvent(ordinal))
  );
}

export async function waitForCondition(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();

  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Condition not met before timeout');
    }
    await sleep(10);
  }
}

export function assertPresent<T>(
  value: T,
  message = 'Expected value to be present'
): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

export class CountingHooks implements OutboxWorkerRuntimeHooks {
  public started = false;
  public tickCount = 0;
  public stopped = false;

  onStarted(): void {
    this.started = true;
  }

  onTick(): void {
    this.tickCount += 1;
  }

  onStopped(): void {
    this.stopped = true;
  }
}

export class AbortDuringListenerRegistrationSignal {
  private abortedState = false;
  private registeredListener: unknown = null;

  get aborted(): boolean {
    return this.abortedState;
  }

  addEventListener(type: unknown, listener: unknown): void {
    if (type !== 'abort') {
      return;
    }
    this.registeredListener = listener;
    this.abortedState = true;
  }

  removeEventListener(type: unknown, listener: unknown): void {
    if (type !== 'abort') {
      return;
    }
    if (this.registeredListener === listener) {
      this.registeredListener = null;
    }
  }
}

export function runtimeTest(
  scenario: RuntimeTestScenario,
  implementation: () => Promise<void> | void
): void {
  it(scenario.title, implementation);
}

export function createSyntheticError(failure: SyntheticFailure): Error {
  return new Error(failure.message);
}

export { createLoggerState };
