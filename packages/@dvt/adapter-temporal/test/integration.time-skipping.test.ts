/**
 * @file packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
 * @baseline ADR-0001: Temporal Integration Test Policy
 * @baseline ADR-0010: Run Event Envelope Split
 * @baseline ADR-0011: RunStarted Ownership
 * @decision Section 2 — Build precondition mandatory
 * @decision Section 3 — Single teardown owner
 * @decision Section 4 — Prefer environment-provided client
 * @decision Section 5 — Time-skipping semantics
 * @consequence Tests are deterministic, isolated, and follow Temporal best practices
 * @version 1.0.0
 * @date 2026-02-21
 */

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  EngineRunRef,
  PlanRef,
  ResolvedRunContext,
  RunStateCommandPort,
} from '@dvt/contracts';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STEP_EXECUTORS,
  type ActivityDeps,
  type StepExecutor,
} from '../src/activities/stepActivities.js';
import type {
  EventEnvelope as TemporalEventEnvelope,
  EventIdempotencyInput,
  EventInput,
  RunMetadata,
} from '../src/engine-types.js';
import {
  loadTemporalAdapterConfig,
  TemporalAdapter,
  TemporalWorkerHost,
  toTemporalTaskQueue,
} from '../src/index.js';

import { permanentErrorExecutor, withErrorExecutors } from './helpers/testExecutors.js';

// Local outbox record type for test doubles — mirrors engine's OutboxRecord shape.
interface OutboxRecord {
  id: string;
  createdAt: string;
  idempotencyKey: string;
  payload: unknown;
  attempts: number;
  lastError?: string;
}

// ============================================================================
// Constants
// ============================================================================

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_PATH = resolve(TEST_DIR, '../src/workflows/RunPlanWorkflow.ts');
const WORKFLOW_JS_PATH = WORKFLOW_PATH.replace(/\.ts$/, '.js');
const WORKFLOW_DIST_JS_PATH = resolve(TEST_DIR, '../dist/workflows/RunPlanWorkflow.js');
const INTEGRATION_TEST_TIMEOUT = 120_000;

// Artifact validation (ADR-0001 Section 1)
if (!existsSync(WORKFLOW_JS_PATH) && !existsSync(WORKFLOW_DIST_JS_PATH) && process.env.CI) {
  console.error(`
❌ Workflow artifact not found: ${WORKFLOW_JS_PATH} (or ${WORKFLOW_DIST_JS_PATH})
   Run 'pnpm build' first or ensure build completes successfully.
  `);
  process.exit(1);
}

// ============================================================================
// Types
// ============================================================================

type EventEnvelope = TemporalEventEnvelope;

type RunStatusValue = 'PENDING' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

interface AppendResult {
  runSeq: number;
  idempotent: boolean;
  persisted: boolean;
  eventId: string;
  persistedAt: string;
}

interface RunSnapshot {
  runId: string;
  status: RunStatusValue;
  lastEventSeq: number;
  projectedAt: string;
}

class RunId {
  private constructor(readonly value: string) {}

  static of(value: string): RunId {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new TypeError('RUN_ID_REQUIRED');
    }
    return new RunId(normalized);
  }
}

interface EventSliceQuery {
  runId: RunId;
  afterSeq?: number;
  limit?: number;
}

// ============================================================================
// Test Doubles (Mocks/Stubs)
// ============================================================================

/**
 * @baseline ADR-0010 Section 3.3 — Idempotency derivation
 */
class TestIdempotency {
  private counter = 0;

  eventId(): string {
    this.counter += 1;
    return `test-event-${this.counter}`;
  }

  runEventKey(args: EventIdempotencyInput): string {
    // Simplified implementation but follows the principle:
    // provider retries do not change the key
    return [
      args.eventType,
      args.tenantId,
      args.runId,
      String(args.logicalAttemptId),
      args.planId,
      args.planVersion,
      args.stepId ?? '',
    ].join('|');
  }
}

/**
 * @baseline ADR-0010 Section 3.1 — Envelope split
 */
class TestClock {
  nowIsoUtc(): string {
    return '2026-01-01T00:00:00.000Z';
  }
}

/**
 * Test implementation of IRunStateStore v1 for Temporal integration tests
 *
 * @baseline ADR-0004 - Event Sourcing Strategy
 * @baseline ADR-0010 - Run Event Envelope Split
 * @baseline ADR-0013 - bootstrapRunTx
 *
 * Implements the normative contract from IRunStateStore.v1.md with:
 * - Append-only event log semantics
 * - Monotonic runSeq per runId
 * - Idempotency via (runId, idempotencyKey) uniqueness
 * - Deterministic replay capability
 */
class TestStateStore {
  /**
   * Map of runId -> array of persisted events
   * Maintains strict append order with monotonic runSeq
   */
  private readonly eventsByRun = new Map<string, EventEnvelope[]>();

  /**
   * Map of runId -> Map<idempotencyKey, EventEnvelope>
   * Enforces idempotency uniqueness constraint
   */
  private readonly idempByRun = new Map<string, Map<string, EventEnvelope>>();

  /**
   * Map of runId -> latest snapshot
   * Used for projector state
   */
  private readonly snapshotsByRun = new Map<string, RunSnapshot>();
  private readonly metadataByRun = new Map<string, RunMetadata>();

  /**
   * Appends a single event to the run's event log
   *
   * @param event - Event to append (without runSeq)
   * @returns AppendResult indicating outcome and assigned metadata
   *
   * @invariant INV-STATE-1: runSeq is strictly increasing per runId
   * @invariant INV-STATE-3: (runId, idempotencyKey) uniqueness enforced
   * @invariant INV-STATE-4: Event log is immutable after persist
   */
  async appendEvent(event: EventInput): Promise<AppendResult> {
    const runId = event.runId;

    // Retrieve or initialize data structures for this run
    const events = this.eventsByRun.get(runId) ?? [];
    const idx = this.idempByRun.get(runId) ?? new Map<string, EventEnvelope>();

    // Check idempotency (INV-STATE-3)
    const existing = idx.get(event.idempotencyKey);
    if (existing) {
      return {
        runSeq: existing.runSeq,
        idempotent: true,
        persisted: false,
        eventId: existing.eventId,
        persistedAt: existing.persistedAt,
      };
    }

    // Assign next runSeq (1-based, monotonic) (INV-STATE-1)
    const nextRunSeq = events.length + 1;
    const persistedAt = new Date().toISOString();

    const record: EventEnvelope = {
      ...event,
      runSeq: nextRunSeq,
      persistedAt,
    };

    // Persist atomically
    events.push(record);
    idx.set(event.idempotencyKey, record);

    this.eventsByRun.set(runId, events);
    this.idempByRun.set(runId, idx);

    return {
      runSeq: nextRunSeq,
      idempotent: false,
      persisted: true,
      eventId: `evt-${runId}-${nextRunSeq}`,
      persistedAt,
    };
  }

  /**
   * Fetches events for a run with optional pagination
   *
   * @param query - Run-scoped query including optional pagination
   * @returns Array of events ordered by runSeq ascending
   *
   * @invariant INV-STATE-5: Returns events ordered by ascending runSeq
   */
  async fetchEvents(query: EventSliceQuery): Promise<EventEnvelope[]> {
    const events = this.eventsByRun.get(query.runId.value) ?? [];

    // Filter by afterSeq if provided
    let filtered = events;
    const afterSeq = query.afterSeq;
    if (afterSeq !== undefined) {
      filtered = filtered.filter((e) => e.runSeq > afterSeq);
    }

    // Apply limit if provided
    if (query.limit !== undefined) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  /**
   * Retrieves the latest snapshot for a run
   *
   * @param runId - The run identifier
   * @returns The latest snapshot or null if none exists
   */
  async getSnapshot(runId: RunId): Promise<RunSnapshot | null> {
    return this.snapshotsByRun.get(runId.value) ?? null;
  }

  /**
   * Projects a snapshot from events (test implementation)
   * In real implementation, this would run the projector
   *
   * @param runId - The run identifier
   * @returns A newly projected snapshot
   */
  async projectSnapshot(runId: RunId): Promise<RunSnapshot> {
    const events = await this.fetchEvents({ runId });
    const status = this.calculateStatus(events);
    const snapshot: RunSnapshot = {
      runId: runId.value,
      status,
      lastEventSeq: events.at(-1)?.runSeq ?? 0,
      projectedAt: new Date().toISOString(),
    };
    this.snapshotsByRun.set(runId.value, snapshot);
    return snapshot;
  }

  private calculateStatus(events: EventEnvelope[]): RunStatusValue {
    let status: RunStatusValue = 'PENDING';
    for (const e of events) {
      switch (e.eventType) {
        case 'RunStarted':
          status = 'RUNNING';
          break;
        case 'RunPaused':
          status = 'PAUSED';
          break;
        case 'RunResumed':
          status = 'RUNNING';
          break;
        case 'RunCompleted':
          status = 'COMPLETED';
          break;
        case 'RunFailed':
          status = 'FAILED';
          break;
        case 'RunCancelled':
          status = 'CANCELLED';
          break;
      }
    }
    return status;
  }

  async bootstrapRunTx(input: {
    metadata: RunMetadata;
    firstEvents: EventInput[];
  }): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    this.metadataByRun.set(input.metadata.runId, input.metadata);
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];
    for (const event of input.firstEvents) {
      const res = await this.appendEvent(event);
      const events = await this.listRunEvents(RunId.of(input.metadata.runId));
      const persisted = events.find((e) => e.runSeq === res.runSeq);
      if (!persisted) continue;
      if (res.idempotent) deduped.push(persisted);
      else appended.push(persisted);
    }
    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? 0,
    };
  }

  async appendAndEnqueueTx(
    runId: string,
    events: EventInput[]
  ): Promise<{ appended: EventEnvelope[]; deduped: EventEnvelope[]; lastSeq: number }> {
    const appended: EventEnvelope[] = [];
    const deduped: EventEnvelope[] = [];
    for (const event of events) {
      const res = await this.appendEvent({ ...event, runId });
      const persisted = (await this.listRunEvents(RunId.of(runId))).find(
        (e) => e.runSeq === res.runSeq
      );
      if (!persisted) continue;
      if (res.idempotent) deduped.push(persisted);
      else appended.push(persisted);
    }
    const all = await this.listRunEvents(RunId.of(runId));
    return {
      appended,
      deduped,
      lastSeq: appended.at(-1)?.runSeq ?? all.at(-1)?.runSeq ?? 0,
    };
  }

  async getRunMetadataByRunId(runId: string): Promise<RunMetadata | null> {
    return this.metadataByRun.get(runId) ?? null;
  }

  async saveProviderRef(
    _runId: string,
    _runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    // no-op for integration tests
  }

  // Test helper methods (not part of IRunStateStore)

  /**
   * Adapter contract helper: list events by tenant/run
   */
  async listEvents(_tenantId: string, runId: string): Promise<EventEnvelope[]> {
    return this.eventsByRun.get(runId) ?? [];
  }

  /**
   * TEST HELPER: List all events for a run
   */
  async listRunEvents(runId: RunId): Promise<EventEnvelope[]> {
    return this.eventsByRun.get(runId.value) ?? [];
  }

  /**
   * TEST HELPER: Clear all data for a run
   */
  clearRun(runId: RunId): void {
    this.eventsByRun.delete(runId.value);
    this.idempByRun.delete(runId.value);
    this.snapshotsByRun.delete(runId.value);
  }
}

/**
 * Test implementation of IOutboxStorage for Temporal integration tests
 *
 * @baseline ADR-0013 - bootstrapRunTx (outbox semantics)
 * @baseline ADR-0004 - Event Sourcing Strategy
 * @baseline ADR-0010 - Run Event Envelope Split (idempotency)
 *
 * Simulates outbox behavior for testing with:
 * - In-memory event storage using correct OutboxRecord structure
 * - Pending events list with limit
 * - Delivery tracking (markDelivered/markFailed)
 * - Idempotency tracking via idempotencyKey
 * - Verification helpers for test assertions
 */
class TestOutbox {
  /**
   * Map of outbox record ID -> OutboxRecord
   * Simulates the outbox table in production
   */
  private readonly records = new Map<string, OutboxRecord>();

  /**
   * Counter for generating unique record IDs
   */
  private idCounter = 0;

  /**
   * Enqueues events to the outbox
   *
   * @param runId - The run identifier (used for logging/tracking)
   * @param events - Events to enqueue (must be persisted with runSeq)
   * @throws Error if any event lacks runSeq
   *
   * @invariant Creates OutboxRecord with:
   *   - Unique ID (outbox-{counter})
   *   - Current timestamp as createdAt
   *   - Event's idempotencyKey for deduplication
   *   - Initial attempts = 0
   *   - No lastError
   */
  async enqueueTx(runId: string, events: EventEnvelope[]): Promise<void> {
    // Verify events have required runSeq (production safety)
    for (const event of events) {
      if (event.runSeq === undefined) {
        throw new Error('Events must have runSeq before enqueue');
      }
    }

    // Create outbox records for each event
    for (const event of events) {
      const id = `outbox-${++this.idCounter}`;
      const record: OutboxRecord = {
        id,
        createdAt: new Date().toISOString(),
        idempotencyKey: event.idempotencyKey, // From the event
        payload: event, // The complete persisted event
        attempts: 0,
        // lastError is undefined initially
      };
      this.records.set(id, record);
    }
  }

  /**
   * Lists pending outbox records with limit
   *
   * @param limit - Maximum number of records to return
   * @returns Array of pending OutboxRecord
   *
   * @invariant Only returns records with attempts < maxRetries (implicitly via absence of success)
   * @invariant Orders by createdAt ascending (FIFO)
   * @invariant Does NOT return records that have been successfully processed
   */
  async listPending(limit: number): Promise<OutboxRecord[]> {
    // In test implementation, we consider all records as pending
    // since we don't have a separate 'delivered' status
    // Records with attempts > 0 and lastError are still pending (retryable)

    const pending = Array.from(this.records.values())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .slice(0, limit);

    return pending;
  }

  /**
   * Marks outbox records as delivered (removes them from outbox)
   *
   * @param ids - Array of record IDs that were successfully delivered
   * @invariant Removes records from the outbox (no longer pending)
   */
  async markDelivered(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.records.delete(id);
    }
  }

  /**
   * Marks an outbox record as failed (increments attempts, stores error)
   *
   * @param id - Record ID that failed
   * @param error - Error message or reason
   * @invariant Increments attempts counter
   * @invariant Stores error message in lastError
   * @invariant Record remains in outbox for retry
   */
  async markFailed(id: string, error: string): Promise<void> {
    const record = this.records.get(id);
    if (record) {
      record.attempts += 1;
      record.lastError = error;
      this.records.set(id, record);
    }
  }

  // ============================================================================
  // Test Helper Methods (not part of IOutboxStorage)
  // ============================================================================

  /**
   * TEST HELPER: List all outbox records
   */
  listAll(): OutboxRecord[] {
    return Array.from(this.records.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * TEST HELPER: Get record by ID
   */
  getRecord(id: string): OutboxRecord | undefined {
    return this.records.get(id);
  }

  /**
   * TEST HELPER: Find records by idempotencyKey
   */
  findByIdempotencyKey(key: string): OutboxRecord[] {
    return Array.from(this.records.values()).filter((r) => r.idempotencyKey === key);
  }

  /**
   * TEST HELPER: Get records with failed attempts
   */
  getFailedRecords(): OutboxRecord[] {
    return Array.from(this.records.values()).filter((r) => r.lastError !== undefined);
  }

  /**
   * TEST HELPER: Get records by attempt count
   */
  getRecordsByAttempts(attemptCount: number): OutboxRecord[] {
    return Array.from(this.records.values()).filter((r) => r.attempts === attemptCount);
  }

  /**
   * TEST HELPER: Count total records
   */
  get count(): number {
    return this.records.size;
  }

  /**
   * TEST HELPER: Clear all records
   */
  clear(): void {
    this.records.clear();
    this.idCounter = 0;
  }

  /**
   * TEST HELPER: Check if specific event is in outbox
   */
  hasEventWithIdempotencyKey(key: string): boolean {
    return this.findByIdempotencyKey(key).length > 0;
  }
}

/**
 * @baseline ADR-0011 — RunStarted Ownership
 */
class TestProjector {
  rebuild(
    runId: string,
    events: EventEnvelope[]
  ): {
    runId: string;
    status: RunStatusValue;
  } {
    let status: RunStatusValue = 'PENDING';

    for (const e of events) {
      if (e.eventType === 'RunStarted') status = 'RUNNING';
      if (e.eventType === 'RunPaused') status = 'PAUSED';
      if (e.eventType === 'RunResumed') status = 'RUNNING';
      if (e.eventType === 'RunCompleted') status = 'COMPLETED';
      if (e.eventType === 'RunFailed') status = 'FAILED';
      if (e.eventType === 'RunCancelled') status = 'CANCELLED';
    }

    return {
      runId,
      status,
    };
  }
}

/**
 * @baseline ADR-0012 — Plan Integrity Ownership
 */
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

// ============================================================================
// Factories
// ============================================================================

function createPlanRef(
  planId: string,
  planBytes: Uint8Array,
  options?: {
    uri?: string;
  }
): PlanRef {
  return {
    uri: options?.uri ?? `memory://plans/${planId}.json`,
    sha256: sha256Hex(planBytes),
    schemaVersion: 'v1.2',
    planId,
    planVersion: '1.0.0',
    sizeBytes: planBytes.byteLength,
  };
}

function createRunContext(runId: RunId): ResolvedRunContext {
  return {
    tenantId: 't-it',
    projectId: 'p-it',
    environmentId: 'test',
    runId: runId.value,
    targetAdapter: 'temporal',
    logicalAttemptId: 1,
    originRunId: runId.value,
  };
}

function createActivityDeps(
  store: TestStateStore,
  _outbox: TestOutbox,
  planBytes: Uint8Array,
  options?: {
    onFetch?: (planRef: PlanRef) => void;
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
    fetcher: {
      fetch: async (planRef) => {
        options?.onFetch?.(planRef);
        return planBytes;
      },
    },
    integrity: new TestIntegrity(),
  };
}

// ============================================================================
// Helpers
// ============================================================================

type WaitForConditionFn = <T>(
  fn: () => Promise<T>,
  predicate: (v: T) => boolean,
  opts?: { timeoutMs?: number; intervalMs?: number }
) => Promise<T>;

async function waitForTerminalStatus(
  adapter: TemporalAdapter,
  runRef: EngineRunRef,
  waitForCondition: WaitForConditionFn,
  timeoutMs = 10_000
): Promise<RunStatusValue> {
  await waitForCondition(
    () => adapter.getRunStatus(runRef),
    (s) => s.status === 'COMPLETED' || s.status === 'FAILED' || s.status === 'CANCELLED',
    { timeoutMs }
  );
  const status = await adapter.getRunStatus(runRef);
  return status.status as RunStatusValue;
}

interface CancelScenarioRequest {
  mode: 'signal' | 'cancel';
  adapter: TemporalAdapter;
  planRef: PlanRef;
  runId: RunId;
  store: TestStateStore;
  waitForCondition: WaitForConditionFn;
}

async function runCancelScenario(args: CancelScenarioRequest): Promise<{
  status: RunStatusValue;
  cancelledCount: number;
  eventTypes: string[];
}> {
  const runCtx = createRunContext(args.runId);
  const runRef = await args.adapter.startRun(args.planRef, runCtx);
  await args.waitForCondition(
    () => args.store.listRunEvents(args.runId),
    (events) => events.some((event) => event.eventType === 'StepStarted'),
    { timeoutMs: 30_000 }
  );

  if (args.mode === 'signal') {
    await args.adapter.signal(runRef, { signalId: `s-${args.runId.value}`, type: 'CANCEL' });
  } else {
    await args.adapter.cancelRun(runRef);
  }

  const status = await waitForTerminalStatus(args.adapter, runRef, args.waitForCondition);
  const events = await args.store.listRunEvents(RunId.of(runRef.runId));
  const cancelledCount = events.filter((e) => e.eventType === 'RunCancelled').length;
  const eventTypes = events.map((event) => event.eventType);

  return { status, cancelledCount, eventTypes };
}

function createBlockingExecutor(targetStepId: string): {
  executor: StepExecutor;
  waitUntilExecuting: Promise<void>;
  release: () => void;
} {
  let markExecuting: (() => void) | null = null;
  let releaseExecution: (() => void) | null = null;
  const waitUntilExecuting = new Promise<void>((resolve) => {
    markExecuting = resolve;
  });

  return {
    executor: {
      canExecute(step) {
        return step.stepId === targetStepId;
      },
      async execute(step) {
        markExecuting?.();
        await new Promise<void>((resolve) => {
          releaseExecution = resolve;
        });
        return { stepId: step.stepId, status: 'COMPLETED' };
      },
    },
    waitUntilExecuting,
    release() {
      if (!releaseExecution) {
        throw new Error('BLOCKING_EXECUTOR_NOT_READY');
      }
      releaseExecution();
    },
  };
}

function mkPlan(stepCount: number): unknown {
  return {
    metadata: {
      planId: 'it-plan',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: Array.from({ length: stepCount }, (_, i) => ({ stepId: `s-${i + 1}`, kind: 'noop' })),
  } as const;
}

function mkLinearPlan(stepCount: number): unknown {
  return {
    metadata: {
      planId: 'it-plan',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: Array.from({ length: stepCount }, (_, i) => ({
      stepId: `s-${i + 1}`,
      kind: 'noop',
      ...(i === 0 ? {} : { dependsOn: [`s-${i}`] }),
    })),
  } as const;
}

function mkLinearThreeStepPlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-linear-3',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [
      { stepId: 's-1', kind: 'noop' },
      { stepId: 's-2', kind: 'noop', dependsOn: ['s-1'] },
      { stepId: 's-3', kind: 'noop', dependsOn: ['s-2'] },
    ],
  } as const;
}

function mkPermanentFailurePlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-permanent-failure',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [{ stepId: 's-fail', kind: 'noop' }],
  } as const;
}

function mkGatewaySkipPlan(): unknown {
  return {
    metadata: {
      planId: 'it-plan-gateway-skip',
      planVersion: '1.0.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
    },
    steps: [
      { stepId: 's-1', kind: 'noop' },
      {
        stepId: 'gw-1',
        type: 'gateway',
        gateway: {
          dslVersion: '1.0',
          expression: "status='FAILED'",
        },
        dependsOn: ['s-1'],
      },
      { stepId: 's-2', kind: 'noop', dependsOn: ['gw-1'] },
    ],
  } as const;
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

// ============================================================================
// Tests
// ============================================================================

/**
 * Deterministic waiting helper (does not use time-skipping internally)
 */
async function waitForCondition<T>(
  fn: () => Promise<T>,
  predicate: (v: T) => boolean,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const intervalMs = opts.intervalMs ?? 25;
  const start = Date.now();
  while (true) {
    const v = await fn();
    if (predicate(v)) return v;
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitForCondition: timeout');
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

describe('temporal integration (time-skipping)', () => {
  /**
   * @verifies ADR-0001 Section 2 — Build precondition
   * @verifies ADR-0001 Section 3 — Single teardown owner
   * @verifies ADR-0001 Section 4 — Environment client
   * @verifies ADR-0001 Section 5 — Time-skipping semantics
   */
  it(
    'executes startRun -> status -> cancel against TestWorkflowEnvironment',
    async () => {
      // Setup (ADR-0001 Section 4: usar environment-provided client)
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(250);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan', planBytes);
      const ctx = createRunContext(RunId.of('run-it-1'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection); // ✅ usa env.nativeConnection

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow, // ✅ usa env.client
        config: temporalConfig,
      });

      try {
        const runRef = await adapter.startRun(plan, planRef, ctx);
        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'StepStarted'),
          { timeoutMs: 30_000 }
        );

        const status = await adapter.getRunStatus(runRef);
        expect(['PENDING', 'RUNNING']).toContain(status.status);

        await adapter.cancelRun(runRef);

        const afterCancel = await waitForTerminalStatus(adapter, runRef, waitForCondition);
        expect(['CANCELLED', 'COMPLETED', 'FAILED']).toContain(afterCancel);
      } finally {
        // Teardown (ADR-0001 Section 3: single teardown owner)
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'executes a planner-backed dvt-plan postgres ref through the Temporal runtime',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearThreeStepPlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const fetchedPlanRefs: PlanRef[] = [];
      const planRef = createPlanRef('it-plan-linear-3', planBytes, {
        uri: 'dvt-plan://postgres/it-plan-linear-3',
      });
      const ctx = createRunContext(RunId.of('run-it-stored-plan-temporal'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-stored-plan',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes, {
          onFetch(planRefFromFetch) {
            fetchedPlanRefs.push(planRefFromFetch);
          },
        }),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((event) => event.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        expect(fetchedPlanRefs).toContainEqual(planRef);
        expect((await store.listRunEvents(RunId.of(ctx.runId))).at(-1)?.eventType).toBe(
          'RunCompleted'
        );
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  /**
   * @verifies ADR-0001 Section 3 — Single teardown owner
   * @verifies ADR-0011 — RunCancelled event semantics
   */
  it(
    'signal(CANCEL) and cancelRun() produce identical terminal behaviour with a single RunCancelled event',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(10);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan', planBytes);

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-cancel',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue('t-it', temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        const signalResult = await runCancelScenario({
          mode: 'signal',
          adapter,
          planRef,
          runId: RunId.of('run-it-cancel-1'),
          store,
          waitForCondition,
        });
        expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(signalResult.status);
        expect(signalResult.cancelledCount).toBeLessThanOrEqual(1);
        expect(signalResult.eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
        expect(signalResult.eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
          signalResult.eventTypes.indexOf('RunCancelRequested')
        );

        const cancelResult = await runCancelScenario({
          mode: 'cancel',
          adapter,
          planRef,
          runId: RunId.of('run-it-cancel-2'),
          store,
          waitForCondition,
        });
        expect(['PENDING', 'CANCELLED', 'COMPLETED', 'FAILED']).toContain(cancelResult.status);
        expect(cancelResult.cancelledCount).toBeLessThanOrEqual(1);
        expect(cancelResult.eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
        expect(cancelResult.eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
          cancelResult.eventTypes.indexOf('RunCancelRequested')
        );

        expect(signalResult.cancelledCount).toBe(cancelResult.cancelledCount);
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'cancel requested during finalization emits RunCancelRequested before RunCancelled and never RunCompleted',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = mkPlan(1);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');
      const planRef = createPlanRef('it-plan', planBytes);
      const blocker = createBlockingExecutor('s-1');

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-cancel-finalization',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue('t-it', temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
        stepExecutors: [blocker.executor, ...DEFAULT_STEP_EXECUTORS],
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
        stateStore: store,
        projector,
      });

      try {
        const runId = RunId.of('run-it-cancel-finalization-1');
        const runRef = await adapter.startRun(plan, planRef, createRunContext(runId));

        await blocker.waitUntilExecuting;
        await adapter.cancelRun(runRef);
        blocker.release();

        const status = await waitForTerminalStatus(adapter, runRef, waitForCondition, 30_000);
        expect(status).toBe('CANCELLED');

        const eventTypes = (await store.listRunEvents(RunId.of(runRef.runId))).map(
          (event) => event.eventType
        );
        expect(eventTypes.indexOf('RunCancelRequested')).toBeGreaterThanOrEqual(0);
        expect(eventTypes.indexOf('RunCancelled')).toBeGreaterThan(
          eventTypes.indexOf('RunCancelRequested')
        );
        expect(eventTypes).not.toContain('RunCompleted');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  /**
   * @verifies ADR-0010 Section 3.2 — Ordering via runSeq
   * @verifies ADR-0010 Section 3.6 — Atomic append
   * @verifies ADR-0011 — RunStarted ownership
   */
  it(
    'golden path: linear 3-step plan reaches COMPLETED with deterministic event order',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = mkLinearThreeStepPlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-linear-3', planBytes);
      const ctx: ResolvedRunContext = {
        ...createRunContext(RunId.of('run-it-linear-3')),
        tenantId: 't-it', // Explicit, non-empty
      };

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-linear-3',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((e) => e.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expect(events.map((e) => `${e.eventType}:${e.stepId ?? '-'}`)).toEqual([
          'RunStarted:-',
          'StepStarted:s-1',
          'StepCompleted:s-1',
          'StepStarted:s-2',
          'StepCompleted:s-2',
          'StepStarted:s-3',
          'StepCompleted:s-3',
          'RunCompleted:-',
        ]);

        // Verify monotonic runSeq (ADR-0010 Section 3.2)
        expect(events.every((e, idx) => e.runSeq === idx + 1)).toBe(true);

        const projected = projector.rebuild(ctx.runId, events);
        expect(projected.status).toBe('COMPLETED');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'gateway path: evaluates DSL in activity boundary and emits StepSkipped deterministically',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = mkGatewaySkipPlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-gateway-skip', planBytes);
      const ctx: ResolvedRunContext = {
        ...createRunContext(RunId.of('run-it-gateway-skip')),
        tenantId: 't-it',
      };

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-gateway-skip',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((e) => e.eventType === 'RunCompleted'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expect(events.map((e) => `${e.eventType}:${e.stepId ?? '-'}`)).toEqual([
          'RunStarted:-',
          'StepStarted:s-1',
          'StepCompleted:s-1',
          'StepStarted:gw-1',
          'StepCompleted:gw-1',
          'StepSkipped:s-2',
          'RunCompleted:-',
        ]);

        const gatewayCompleted = events.find(
          (e) => e.eventType === 'StepCompleted' && e.stepId === 'gw-1'
        );
        expect(gatewayCompleted).toBeDefined();
        expect(
          (gatewayCompleted?.payload as { gatewayDecision?: boolean } | undefined)?.gatewayDecision
        ).toBe(false);

        expect(events.every((e, idx) => e.runSeq === idx + 1)).toBe(true);

        const projected = projector.rebuild(ctx.runId, events);
        expect(projected.status).toBe('COMPLETED');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  /**
   * @verifies ADR-0012 — Plan integrity validation
   * @verifies ADR-0010 Section 3.5 — Retry semantics
   */
  it(
    'retry/error path: permanent step failure emits StepFailed + RunFailed deterministically',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const projector = new TestProjector();
      const plan = mkPermanentFailurePlan();
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan-permanent-failure', planBytes);
      const ctx: ResolvedRunContext = {
        ...createRunContext(RunId.of('run-it-permanent-failure')),
        tenantId: 't-it', // Explicit, non-empty
      };

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-permanent-failure',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const worker = new TemporalWorkerHost({
        temporalConfig: {
          ...temporalConfig,
          taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
        },
        workflowsPath: WORKFLOW_PATH,
        activityDeps: createActivityDeps(store, outbox, planBytes),
        stepExecutors: withErrorExecutors(permanentErrorExecutor('s-fail')),
      });

      await worker.start(env.nativeConnection);

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      try {
        await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((e) => e.eventType === 'RunFailed'),
          { timeoutMs: 30_000 }
        );

        const events = await store.listRunEvents(RunId.of(ctx.runId));
        expect(events.map((e) => `${e.eventType}:${e.stepId ?? '-'}`)).toEqual([
          'RunStarted:-',
          'StepStarted:s-fail',
          'StepFailed:s-fail',
          'RunFailed:-',
        ]);
        expect(events.find((e) => e.eventType === 'RunFailed')?.payload).toMatchObject({
          reason: 'STEP_FAILURE',
        });

        const projected = projector.rebuild(ctx.runId, events);
        expect(projected.status).toBe('FAILED');
      } finally {
        await worker.shutdown();
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );

  it(
    'crash recovery: worker restart preserves idempotency (no duplicate idempotencyKey)',
    async () => {
      const env = await TestWorkflowEnvironment.createTimeSkipping();

      const store = new TestStateStore();
      const outbox = new TestOutbox();
      const plan = mkLinearPlan(40);
      const planBytes = Buffer.from(JSON.stringify(plan), 'utf-8');

      const planRef = createPlanRef('it-plan', planBytes);
      const ctx = createRunContext(RunId.of('run-it-crash-recovery'));

      const temporalConfig = loadTemporalAdapterConfig({
        TEMPORAL_NAMESPACE: 'default',
        TEMPORAL_TASK_QUEUE: 'dvt-it-time-skipping-crash-recovery',
        TEMPORAL_IDENTITY: 'adapter-temporal-it',
      });

      const mkWorker = (): TemporalWorkerHost =>
        new TemporalWorkerHost({
          temporalConfig: {
            ...temporalConfig,
            taskQueue: toTemporalTaskQueue(ctx.tenantId, temporalConfig),
          },
          workflowsPath: WORKFLOW_PATH,
          activityDeps: createActivityDeps(store, outbox, planBytes),
        });

      const adapter = new TemporalAdapter({
        workflowClient: env.client.workflow,
        config: temporalConfig,
      });

      const worker1 = mkWorker();
      await worker1.start(env.nativeConnection);

      try {
        const _runRef = await adapter.startRun(plan, planRef, ctx);

        await waitForCondition(
          () => store.listRunEvents(RunId.of(ctx.runId)),
          (events) => events.some((e) => e.eventType === 'StepStarted'),
          { timeoutMs: 30_000 }
        );
        const eventsBeforeRestart = await store.listRunEvents(RunId.of(ctx.runId));
        const lastRunSeqBeforeRestart = eventsBeforeRestart.at(-1)?.runSeq ?? 0;

        await worker1.shutdown();

        const worker2 = mkWorker();
        await worker2.start(env.nativeConnection);

        try {
          await new Promise((resolve) => setTimeout(resolve, 2_000));
          const resumedEvents = await store.listRunEvents(RunId.of(ctx.runId));
          const uniqueKeys = new Set(resumedEvents.map((e) => e.idempotencyKey));
          expect(uniqueKeys.size).toBe(resumedEvents.length);
          expect((resumedEvents.at(-1)?.runSeq ?? 0) >= lastRunSeqBeforeRestart).toBe(true);
        } finally {
          await worker2.shutdown();
        }
      } finally {
        await env.teardown();
      }
    },
    INTEGRATION_TEST_TIMEOUT
  );
});
