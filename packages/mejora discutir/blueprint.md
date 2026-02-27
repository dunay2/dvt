# DVT+ RunStateStore + Outbox — TypeScript Class Implementation Blueprint (MD)

**Goal:** Provide an implementation-ready class design for developers.
**Baseline decisions:** Postgres authority, synchronous snapshots, strict contiguous outbox leasing (batch-per-run), UUID PKs, `bigint` `run_seq`.
**Scope:** Contracts + Postgres adapter + projector + outbox publisher worker + tests outline.

References:

- Transactional Outbox: https://microservices.io/patterns/data/transactional-outbox.html
- Postgres row locking / `SKIP LOCKED`: https://www.postgresql.org/docs/current/explicit-locking.html
- `INSERT ... ON CONFLICT`: https://www.postgresql.org/docs/current/sql-insert.html
- CQRS background: https://martinfowler.com/bliki/CQRS.html

---

## 1) File structure (monorepo)

```
packages/
  @dvt/contracts/
    src/
      ids.ts
      run-status.ts
      artifacts.ts
      run-events.ts
      run-snapshots.ts
      commands.ts
      errors.ts
      ports/
        run-state-store.ts
        outbox-storage.ts
        event-bus.ts
      index.ts

  @dvt/adapter-postgres/
    src/
      db/
        sql.ts
        tx.ts
      projector/
        run-projector.ts
      store/
        postgres-run-state-store.ts
        postgres-outbox-storage.ts
      worker/
        outbox-publisher-worker.ts
      index.ts
    test/
      append-events.int.test.ts
      outbox-lease.int.test.ts
      projector.unit.test.ts
```

---

## 2) `@dvt/contracts` — core types and ports

### 2.1 `ids.ts` (typed IDs)

```ts
export type TenantId = string & { readonly brand: 'TenantId' };
export type ProjectId = string & { readonly brand: 'ProjectId' };
export type EnvironmentId = string & { readonly brand: 'EnvironmentId' };

export type RunId = string & { readonly brand: 'RunId' };
export type PlanId = string & { readonly brand: 'PlanId' };
export type StepId = string & { readonly brand: 'StepId' };

export type AttemptId = number & { readonly brand: 'AttemptId' };
export type RunSeq = number & { readonly brand: 'RunSeq' };

export type IdempotencyKey = string & { readonly brand: 'IdempotencyKey' };
export type OutboxId = string & { readonly brand: 'OutboxId' };
```

### 2.2 `run-status.ts`

```ts
export type RunStatus = 'PENDING' | 'RUNNING' | 'FAILED' | 'COMPLETED' | 'CANCELLED';

export type StepStatus = 'PENDING' | 'RUNNING' | 'FAILED' | 'COMPLETED' | 'SKIPPED';
```

### 2.3 `artifacts.ts`

```ts
export interface ArtifactRef {
  readonly kind: 'dbt.manifest' | 'dbt.run_results' | 'dbt.catalog' | 'log' | 'other';
  readonly uri: string; // immutable pointer
  readonly contentHash?: string; // optional for integrity
  readonly createdAt?: string;
}
```

### 2.4 `run-events.ts` (discriminated union)

```ts
import type { AttemptId, PlanId, RunId, StepId } from './ids';
import type { ArtifactRef } from './artifacts';

export type RunEvent =
  | {
      eventType: 'RunStarted';
      runId: RunId;
      payload: { planId: PlanId; planVersion: string };
    }
  | {
      eventType: 'RunCompleted';
      runId: RunId;
      payload: { completedAt: string };
    }
  | {
      eventType: 'RunFailed';
      runId: RunId;
      payload: { errorCode: string; errorMessage: string };
    }
  | {
      eventType: 'StepStarted';
      runId: RunId;
      stepId: StepId;
      attemptId: AttemptId;
      payload: { engineRunRef?: string };
    }
  | {
      eventType: 'StepCompleted';
      runId: RunId;
      stepId: StepId;
      attemptId: AttemptId;
      payload: { artifactRefs: readonly ArtifactRef[]; endedAt?: string };
    }
  | {
      eventType: 'StepFailed';
      runId: RunId;
      stepId: StepId;
      attemptId: AttemptId;
      payload: { errorCode: string; errorMessage: string; endedAt?: string };
    }
  | {
      eventType: 'StepRetried';
      runId: RunId;
      stepId: StepId;
      attemptId: AttemptId;
      payload: { reason?: string };
    };
```

### 2.5 `commands.ts`

```ts
import type { IdempotencyKey, RunId, RunSeq, TenantId, PlanId } from './ids';
import type { RunEvent } from './run-events';
import type { RunStatus } from './run-status';

export interface RunEventEnvelope<E extends RunEvent = RunEvent> {
  readonly runId: RunId;
  readonly runSeq?: RunSeq; // assigned by store
  readonly idempotencyKey: IdempotencyKey;
  readonly occurredAt: string; // engine time
  readonly persistedAt?: string;
  readonly event: E;
}

/**
 * Bootstrap command: creates the run_metadata row atomically.
 * Called by the engine after adapter.startRun() succeeds (ADR-0013).
 * Includes provider refs so there is no two-phase write gap (ADR-0014).
 */
export interface BootstrapRunCmd {
  readonly tenantId: TenantId;
  readonly runId: RunId;
  readonly planId: PlanId;
  readonly planVersion: string;
  readonly logicalAttemptId: number; // Phase 1: always 1
  readonly provider: string; // 'temporal' | 'conductor' | 'mock'
  readonly providerWorkflowId: string;
  readonly providerRunId: string;
}

export interface AppendEventsCmd {
  readonly tenantId: TenantId;
  readonly runId: RunId;
  readonly expectedRunSeq?: RunSeq;
  readonly receiptKey?: IdempotencyKey; // command-level dedupe (recommended)
  readonly events: readonly RunEventEnvelope[];
}

export interface AppendEventsResult {
  readonly runId: RunId;
  readonly firstAssignedSeq: RunSeq;
  readonly lastAssignedSeq: RunSeq;
  readonly newCurrentRunSeq: RunSeq;
}

/** AppendResult: legacy compat shape returned by bootstrapRunTx. */
export interface AppendResult {
  readonly runSeq: number;
  readonly appended: unknown[];
}

/** Filter for listRuns. */
export interface RunFilter {
  readonly status?: RunStatus;
  readonly tenantId?: TenantId;
}
```

### 2.6 `run-snapshots.ts`

```ts
import type { EnvironmentId, PlanId, ProjectId, RunId, RunSeq, StepId, TenantId } from './ids';
import type { RunStatus, StepStatus } from './run-status';
import type { ArtifactRef } from './artifacts';

export interface RunSnapshot {
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;

  readonly runId: RunId;
  readonly planId: PlanId;
  readonly planVersion: string;

  readonly status: RunStatus;

  readonly createdAt: string;
  readonly createdBy: string;

  readonly startedAt?: string;
  readonly completedAt?: string;

  readonly currentRunSeq: RunSeq;

  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly failedSteps: number;
}

export interface RunStepSnapshot {
  readonly runId: RunId;
  readonly stepId: StepId;

  readonly status: StepStatus;
  readonly attempt: number;

  readonly startedAt?: string;
  readonly endedAt?: string;

  readonly errorCode?: string;
  readonly errorMessage?: string;

  readonly artifactRefs: readonly ArtifactRef[];
}
```

### 2.7 `errors.ts` (typed errors)

```ts
export class OptimisticConcurrencyError extends Error {
  readonly name = 'OptimisticConcurrencyError';
  constructor(
    public readonly runId: string,
    public readonly expectedRunSeq: number,
    public readonly actualRunSeq: number
  ) {
    super(`Run ${runId} expected runSeq=${expectedRunSeq} but got ${actualRunSeq}`);
  }
}

export class DuplicateReceiptError extends Error {
  readonly name = 'DuplicateReceiptError';
  constructor(public readonly receiptKey: string) {
    super(`Duplicate receiptKey: ${receiptKey}`);
  }
}

export class InvalidTransitionError extends Error {
  readonly name = 'InvalidTransitionError';
  constructor(public readonly reason: string) {
    super(reason);
  }
}
```

### 2.8 Ports

#### `ports/run-state-store.ts`

```ts
import type { AppendEventsCmd, AppendEventsResult, BootstrapRunCmd } from '../commands';
import type { RunId, StepId } from '../ids';
import type { RunSnapshot, RunStepSnapshot } from '../run-snapshots';
import type { AppendResult, RunFilter } from '../run-status';

/**
 * Domain-oriented state store port.
 *
 * Public read methods return domain projections (RunSnapshot / RunStepSnapshot),
 * not provider-coupled metadata. Provider fields (providerWorkflowId, etc.)
 * are kept internal to the Postgres adapter via the RunMetadata row.
 *
 * ADR-0013/0014: bootstrapRunTx is a required separate operation.
 *   - Engine calls adapter.startRun() BEFORE bootstrapRunTx.
 *   - If bootstrapRunTx fails → adapter.cancelRun() compensation.
 *   - bootstrapRunTx returns AppendResult (runSeq) used by the engine.
 *
 * cancelRunTx is NOT part of this interface (would violate ADR-0007).
 * Cancellation is expressed as an event via appendEventsTx.
 */
export interface IRunStateStore {
  /** Create run record atomically. Returns AppendResult for engine correlation. */
  bootstrapRunTx(cmd: BootstrapRunCmd): Promise<AppendResult>;

  /** Append events + update snapshot + enqueue outbox in a single transaction. */
  appendEventsTx(cmd: AppendEventsCmd): Promise<AppendEventsResult>;

  /** Domain read: returns projected RunSnapshot, not raw RunMetadata. */
  getRun(runId: RunId): Promise<RunSnapshot | null>;

  /** Domain read: returns step-level projection. */
  getRunStep(runId: RunId, stepId: StepId): Promise<RunStepSnapshot | null>;

  /** List runs with optional filter. Returns domain projections. */
  listRuns(filter?: RunFilter): Promise<readonly RunSnapshot[]>;
}
```

#### `ports/outbox-storage.ts`

```ts
import type { IdempotencyKey, OutboxId, RunId, RunSeq } from '../ids';

export interface OutboxMessage {
  readonly outboxId: OutboxId;
  readonly orderingKey: string; // runId string (or tenantId:runId)
  readonly runId: RunId;
  readonly runSeq: RunSeq;
  readonly topic: string;
  readonly payload: object;
  readonly idempotencyKey: IdempotencyKey;
  readonly status: 'PENDING' | 'LEASED' | 'FAILED' | 'PUBLISHED' | 'FAILED_PERMANENT';
  readonly attempts: number;
  readonly nextRetryAt?: string;
  readonly leaseId?: string;
  readonly leaseExpiresAt?: string;
  readonly createdAt: string;
  readonly publishedAt?: string;
  readonly lastError?: string;
}

export interface LeaseResult {
  readonly leaseId: string;
  readonly leaseExpiresAt: string;
  readonly messages: readonly OutboxMessage[];
}

export interface IOutboxStorage {
  // Internal use (within appendEventsTx) usually, but keep public for tests.
  enqueueTx(
    messages: readonly Omit<OutboxMessage, 'outboxId' | 'status' | 'attempts' | 'createdAt'>[]
  ): Promise<void>;

  lease(batchSize: number, leaseMs: number): Promise<LeaseResult>;
  markPublished(outboxId: OutboxId): Promise<void>;
  markFailed(
    outboxId: OutboxId,
    error: string,
    nextRetryAt: string,
    permanent?: boolean
  ): Promise<void>;
}
```

#### `ports/event-bus.ts`

```ts
export interface IEventBus {
  publish(topic: string, key: string, payload: object): Promise<void>;
}
```

---

## 3) `@dvt/adapter-postgres` — DB utilities

### 3.1 `db/tx.ts` (typed transaction wrapper)

> Uses `pg` Pool/Client. This is intentionally minimal; integrate with your existing DB layer.

```ts
import type { Pool, PoolClient, QueryResult } from 'pg';

export type Tx = Pick<PoolClient, 'query'>;

export async function withTx<T>(pool: Pool, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### 3.2 `db/sql.ts` (centralize SQL strings)

```ts
export const SQL = {
  // appendEventsTx primitives
  lockRunMetadata: `
    SELECT current_run_seq
    FROM run_metadata
    WHERE run_id = $1
    FOR UPDATE
  `,

  updateRunMetadataSeq: `
    UPDATE run_metadata
    SET current_run_seq = $2
    WHERE run_id = $1
  `,

  insertRunEvents: `
    INSERT INTO run_events
      (run_id, run_seq, event_type, step_id, attempt_id, idempotency_key, payload, occurred_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
  `,

  // receipts
  insertReceipt: `
    INSERT INTO idempotency_receipts (idempotency_key, run_id, first_seq, last_seq)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (idempotency_key) DO NOTHING
  `,
  readReceipt: `
    SELECT run_id, first_seq, last_seq
    FROM idempotency_receipts
    WHERE idempotency_key = $1
  `,

  // snapshots upserts
  upsertRunSnapshot: `
    INSERT INTO run_snapshot (
      run_id, tenant_id, project_id, environment_id, plan_id, plan_version,
      status, created_at, created_by, started_at, completed_at, current_run_seq,
      total_steps, completed_steps, failed_steps
    ) VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,$10,$11,$12,
      $13,$14,$15
    )
    ON CONFLICT (run_id) DO UPDATE SET
      status = EXCLUDED.status,
      started_at = EXCLUDED.started_at,
      completed_at = EXCLUDED.completed_at,
      current_run_seq = EXCLUDED.current_run_seq,
      total_steps = EXCLUDED.total_steps,
      completed_steps = EXCLUDED.completed_steps,
      failed_steps = EXCLUDED.failed_steps
  `,

  upsertRunStepSnapshot: `
    INSERT INTO run_step_snapshot (
      run_id, step_id, status, attempt, started_at, ended_at, error_code, error_message, artifact_refs
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb
    )
    ON CONFLICT (run_id, step_id) DO UPDATE SET
      status = EXCLUDED.status,
      attempt = EXCLUDED.attempt,
      started_at = EXCLUDED.started_at,
      ended_at = EXCLUDED.ended_at,
      error_code = EXCLUDED.error_code,
      error_message = EXCLUDED.error_message,
      artifact_refs = EXCLUDED.artifact_refs
  `,

  // outbox enqueue (within tx)
  insertOutbox: `
    INSERT INTO outbox (
      ordering_key, run_id, run_seq, topic, payload, idempotency_key,
      status, attempts, next_retry_at
    ) VALUES (
      $1,$2,$3,$4,$5::jsonb,$6,
      'PENDING', 0, NULL
    )
  `,

  // strict contiguous leasing (batch-per-run, across runs)
  leaseOutboxStrict: `
    WITH eligible AS (
      SELECT o1.outbox_id
      FROM outbox o1
      WHERE o1.status IN ('PENDING','FAILED')
        AND (o1.next_retry_at IS NULL OR o1.next_retry_at <= now())
        AND NOT EXISTS (
          SELECT 1
          FROM outbox o2
          WHERE o2.ordering_key = o1.ordering_key
            AND o2.status IN ('PENDING','FAILED','LEASED')
            AND o2.run_seq < o1.run_seq
        )
      ORDER BY o1.ordering_key, o1.run_seq
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox o
    SET status = 'LEASED',
        lease_id = gen_random_uuid(),
        lease_expires_at = now() + ($2::int * interval '1 millisecond')
    FROM eligible e
    WHERE o.outbox_id = e.outbox_id
    RETURNING o.*
  `,

  markPublished: `
    UPDATE outbox
    SET status = 'PUBLISHED', published_at = now(), last_error = NULL
    WHERE outbox_id = $1
  `,

  markFailed: `
    UPDATE outbox
    SET status = $2,
        attempts = attempts + 1,
        next_retry_at = $3::timestamptz,
        last_error = $4
    WHERE outbox_id = $1
  `,
} as const;
```

---

## 4) Projector (pure functions)

### 4.1 `projector/run-projector.ts`

```ts
import type { RunEventEnvelope } from '@dvt/contracts/src/commands';
import type { RunSnapshot, RunStepSnapshot } from '@dvt/contracts/src/run-snapshots';
import type { RunEvent } from '@dvt/contracts/src/run-events';
import type { RunStatus, StepStatus } from '@dvt/contracts/src/run-status';
import type { RunSeq, StepId } from '@dvt/contracts/src/ids';

export interface ProjectedState {
  readonly run: RunSnapshot;
  readonly steps: ReadonlyMap<StepId, RunStepSnapshot>;
}

function setRunStatus(run: RunSnapshot, status: RunStatus): RunSnapshot {
  return { ...run, status };
}

function setStepStatus(step: RunStepSnapshot, status: StepStatus): RunStepSnapshot {
  return { ...step, status };
}

export function applyEvents(
  current: ProjectedState,
  assignedRunSeqEnd: RunSeq,
  envelopes: readonly RunEventEnvelope[]
): ProjectedState {
  let run = { ...current.run, currentRunSeq: assignedRunSeqEnd };
  const steps = new Map(current.steps);

  for (const env of envelopes) {
    const ev: RunEvent = env.event;

    switch (ev.eventType) {
      case 'RunStarted': {
        run = setRunStatus(run, 'RUNNING');
        run = { ...run, startedAt: env.occurredAt };
        break;
      }
      case 'RunCompleted': {
        run = setRunStatus(run, 'COMPLETED');
        run = { ...run, completedAt: ev.payload.completedAt ?? env.occurredAt };
        break;
      }
      case 'RunFailed': {
        run = setRunStatus(run, 'FAILED');
        run = { ...run, completedAt: env.occurredAt };
        break;
      }
      case 'StepStarted': {
        const prev = steps.get(ev.stepId);
        const next: RunStepSnapshot = prev
          ? { ...prev, status: 'RUNNING', attempt: Number(ev.attemptId), startedAt: env.occurredAt }
          : {
              runId: ev.runId,
              stepId: ev.stepId,
              status: 'RUNNING',
              attempt: Number(ev.attemptId),
              startedAt: env.occurredAt,
              artifactRefs: [],
            };
        steps.set(ev.stepId, next);
        break;
      }
      case 'StepCompleted': {
        const prev = steps.get(ev.stepId);
        if (!prev) {
          // If this happens, you likely missed a StepStarted; decide policy (reject vs tolerate).
          // MVP: tolerate by creating the row.
        }
        const next: RunStepSnapshot = {
          runId: ev.runId,
          stepId: ev.stepId,
          status: 'COMPLETED',
          attempt: Number(ev.attemptId),
          startedAt: prev?.startedAt,
          endedAt: ev.payload.endedAt ?? env.occurredAt,
          artifactRefs: [...ev.payload.artifactRefs],
        };
        steps.set(ev.stepId, next);
        break;
      }
      case 'StepFailed': {
        const prev = steps.get(ev.stepId);
        const next: RunStepSnapshot = {
          runId: ev.runId,
          stepId: ev.stepId,
          status: 'FAILED',
          attempt: Number(ev.attemptId),
          startedAt: prev?.startedAt,
          endedAt: ev.payload.endedAt ?? env.occurredAt,
          errorCode: ev.payload.errorCode,
          errorMessage: ev.payload.errorMessage,
          artifactRefs: prev?.artifactRefs ?? [],
        };
        steps.set(ev.stepId, next);
        break;
      }
      case 'StepRetried': {
        // Often informational; attemptId indicates new attempt. Snapshot stays RUNNING/PENDING based on policy.
        break;
      }
      default: {
        const _exhaustive: never = ev;
        return _exhaustive;
      }
    }
  }

  // Derived counters: compute cheaply from steps map
  let completed = 0;
  let failed = 0;
  for (const s of steps.values()) {
    if (s.status === 'COMPLETED') completed++;
    if (s.status === 'FAILED') failed++;
  }
  run = { ...run, completedSteps: completed, failedSteps: failed };

  return { run, steps };
}
```

**Notes**

- Keep this pure. No DB, no clock reads other than event timestamps.
- Unit tests should cover all event sequences.

---

## 5) Postgres adapters (classes)

### 5.1 `store/postgres-outbox-storage.ts`

```ts
import type { Pool } from 'pg';
import { SQL } from '../db/sql';
import type {
  IOutboxStorage,
  LeaseResult,
  OutboxMessage,
} from '@dvt/contracts/src/ports/outbox-storage';
import type { OutboxId } from '@dvt/contracts/src/ids';

export class PostgresOutboxStorage implements IOutboxStorage {
  constructor(private readonly pool: Pool) {}

  async enqueueTx(
    _messages: readonly Omit<OutboxMessage, 'outboxId' | 'status' | 'attempts' | 'createdAt'>[]
  ): Promise<void> {
    // Typically called inside RunStateStore tx using the same client.
    // Keep this method for interface completeness; implement client-scoped version in RunStateStore.
    throw new Error('Use RunStateStore.enqueueOutboxTx(client, ...) to preserve atomicity.');
  }

  async lease(batchSize: number, leaseMs: number): Promise<LeaseResult> {
    // One statement leases up to batchSize messages (across runs).
    const r = await this.pool.query(SQL.leaseOutboxStrict, [batchSize, leaseMs]);
    const messages = r.rows as unknown as OutboxMessage[];

    // lease_id/lease_expires_at are set per-row; return a synthetic leaseId for convenience.
    // Consumers should treat message.leaseId as the real lease identity.
    const leaseId = messages[0]?.leaseId ?? crypto.randomUUID();
    const leaseExpiresAt =
      messages[0]?.leaseExpiresAt ?? new Date(Date.now() + leaseMs).toISOString();

    return { leaseId, leaseExpiresAt, messages };
  }

  async markPublished(outboxId: OutboxId): Promise<void> {
    await this.pool.query(SQL.markPublished, [outboxId]);
  }

  async markFailed(
    outboxId: OutboxId,
    error: string,
    nextRetryAt: string,
    permanent?: boolean
  ): Promise<void> {
    const status = permanent ? 'FAILED_PERMANENT' : 'FAILED';
    await this.pool.query(SQL.markFailed, [outboxId, status, nextRetryAt, error]);
  }
}
```

### 5.2 `store/postgres-run-state-store.ts`

```ts
import type { Pool, PoolClient } from 'pg';
import { withTx } from '../db/tx';
import { SQL } from '../db/sql';
import type { IRunStateStore } from '@dvt/contracts/src/ports/run-state-store';
import type {
  AppendEventsCmd,
  AppendEventsResult,
  RunEventEnvelope,
} from '@dvt/contracts/src/commands';
import type { RunId, RunSeq, StepId } from '@dvt/contracts/src/ids';
import type { RunSnapshot, RunStepSnapshot } from '@dvt/contracts/src/run-snapshots';
import { OptimisticConcurrencyError } from '@dvt/contracts/src/errors';
import { applyEvents, type ProjectedState } from '../projector/run-projector';

function toJson(v: unknown): string {
  return JSON.stringify(v);
}

export class PostgresRunStateStore implements IRunStateStore {
  constructor(private readonly pool: Pool) {}

  async appendEventsTx(cmd: AppendEventsCmd): Promise<AppendEventsResult> {
    return withTx(this.pool, async (tx) => this.appendEventsTxWithClient(tx as PoolClient, cmd));
  }

  private async appendEventsTxWithClient(
    client: PoolClient,
    cmd: AppendEventsCmd
  ): Promise<AppendEventsResult> {
    // 0) receipt-level idempotency (recommended)
    if (cmd.receiptKey) {
      const receipt = await client.query(SQL.readReceipt, [cmd.receiptKey]);
      if (receipt.rowCount === 1) {
        const row = receipt.rows[0] as { run_id: string; first_seq: number; last_seq: number };
        return {
          runId: cmd.runId,
          firstAssignedSeq: row.first_seq as RunSeq,
          lastAssignedSeq: row.last_seq as RunSeq,
          newCurrentRunSeq: row.last_seq as RunSeq,
        };
      }
    }

    // 1) Lock metadata row and read current seq
    const meta = await client.query(SQL.lockRunMetadata, [cmd.runId]);
    if (meta.rowCount !== 1) throw new Error(`run_metadata not found for runId=${cmd.runId}`);
    const currentSeq = Number(meta.rows[0].current_run_seq) as RunSeq;

    // 2) OCC check
    if (cmd.expectedRunSeq !== undefined && Number(cmd.expectedRunSeq) !== Number(currentSeq)) {
      throw new OptimisticConcurrencyError(
        String(cmd.runId),
        Number(cmd.expectedRunSeq),
        Number(currentSeq)
      );
    }

    // 3) Assign runSeq range
    const first = (Number(currentSeq) + 1) as RunSeq;
    const last = (Number(currentSeq) + cmd.events.length) as RunSeq;

    // 4) Insert run_events (idempotency per-event)
    // If any insert conflicts on idempotency_key, decide policy:
    // MVP: let it throw and rely on caller retry with receiptKey; or handle per-event conflicts explicitly.
    let seq = Number(first);
    for (const env of cmd.events) {
      const ev = env.event;
      const stepId = 'stepId' in ev ? (ev.stepId as string) : null;
      const attemptId = 'attemptId' in ev ? Number(ev.attemptId) : null;

      await client.query(SQL.insertRunEvents, [
        cmd.runId,
        seq,
        ev.eventType,
        stepId,
        attemptId,
        env.idempotencyKey,
        toJson(ev),
        env.occurredAt,
      ]);
      seq++;
    }

    // 5) Update run_metadata seq
    await client.query(SQL.updateRunMetadataSeq, [cmd.runId, Number(last)]);

    // 6) Load current snapshots (MVP: assume run_snapshot exists; steps can be fetched by run_id)
    // To keep this blueprint concise, treat snapshot load as a separate query you add:
    // - read run_snapshot by run_id (or derive from run_metadata on first write)
    // - read run_step_snapshot by run_id
    // Here: placeholder "current" passed in from caller in real code.
    const current: ProjectedState = await this.loadProjectedState(client, cmd.runId);

    // 7) Project new snapshots (pure function)
    const projected = applyEvents(current, last, cmd.events);

    // 8) Upsert snapshots
    await client.query(SQL.upsertRunSnapshot, [
      projected.run.runId,
      projected.run.tenantId,
      projected.run.projectId,
      projected.run.environmentId,
      projected.run.planId,
      projected.run.planVersion,
      projected.run.status,
      projected.run.createdAt,
      projected.run.createdBy,
      projected.run.startedAt ?? null,
      projected.run.completedAt ?? null,
      Number(projected.run.currentRunSeq),
      projected.run.totalSteps,
      projected.run.completedSteps,
      projected.run.failedSteps,
    ]);

    for (const step of projected.steps.values()) {
      await client.query(SQL.upsertRunStepSnapshot, [
        step.runId,
        step.stepId,
        step.status,
        step.attempt,
        step.startedAt ?? null,
        step.endedAt ?? null,
        step.errorCode ?? null,
        step.errorMessage ?? null,
        toJson(step.artifactRefs),
      ]);
    }

    // 9) Insert receipt if provided
    if (cmd.receiptKey) {
      await client.query(SQL.insertReceipt, [
        cmd.receiptKey,
        cmd.runId,
        Number(first),
        Number(last),
      ]);
    }

    // 10) Enqueue outbox rows (one per event is typical)
    // ordering_key = runId (string)
    // topic can be decided by downstream strategy. MVP: single topic.
    seq = Number(first);
    for (const env of cmd.events) {
      await client.query(SQL.insertOutbox, [
        String(cmd.runId),
        cmd.runId,
        seq,
        'dvt.run.events',
        toJson({ ...env, runSeq: seq }),
        env.idempotencyKey,
      ]);
      seq++;
    }

    return {
      runId: cmd.runId,
      firstAssignedSeq: first,
      lastAssignedSeq: last,
      newCurrentRunSeq: last,
    };
  }

  private async loadProjectedState(_client: PoolClient, _runId: RunId): Promise<ProjectedState> {
    // Implement:
    // - SELECT * FROM run_snapshot WHERE run_id = $1
    // - SELECT * FROM run_step_snapshot WHERE run_id = $1
    // If snapshot doesn't exist yet, initialize from run_metadata.
    throw new Error('Not implemented in blueprint: loadProjectedState()');
  }

  async getRun(_runId: RunId): Promise<RunSnapshot | null> {
    throw new Error('Implement: SELECT from run_snapshot by run_id');
  }

  async getRunStep(_runId: RunId, _stepId: StepId): Promise<RunStepSnapshot | null> {
    throw new Error('Implement: SELECT from run_step_snapshot by (run_id, step_id)');
  }

  async listRuns(
    _projectId: string,
    _filter?: { status?: string }
  ): Promise<readonly RunSnapshot[]> {
    throw new Error('Implement: SELECT from run_snapshot by project_id with filters');
  }
}
```

**Important implementation notes**

- `loadProjectedState()` must be implemented to make the projector work deterministically.
- You should decide whether you allow per-event idempotency conflicts to be “handled” or require `receiptKey` usage. MVP recommendation: **require `receiptKey` for command-level dedupe**.

---

## 6) Outbox publisher worker (class)

### 6.1 `worker/outbox-publisher-worker.ts`

```ts
import type { IEventBus } from '@dvt/contracts/src/ports/event-bus';
import type { IOutboxStorage, OutboxMessage } from '@dvt/contracts/src/ports/outbox-storage';

function computeBackoffMs(attempts: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(maxMs, baseMs * Math.pow(2, attempts));
  const jitter = Math.floor(Math.random() * Math.floor(exp * 0.2)); // 0..20%
  return exp + jitter;
}

export interface OutboxPublisherConfig {
  readonly batchSize: number;
  readonly leaseMs: number;
  readonly baseBackoffMs: number;
  readonly maxBackoffMs: number;
  readonly maxAttempts: number;
  readonly tickMs: number;
}

export class OutboxPublisherWorker {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outbox: IOutboxStorage,
    private readonly bus: IEventBus,
    private readonly cfg: OutboxPublisherConfig,
    private readonly log: (obj: Record<string, unknown>) => void
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.cfg.tickMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    const lease = await this.outbox.lease(this.cfg.batchSize, this.cfg.leaseMs);
    if (lease.messages.length === 0) return;

    for (const msg of lease.messages) {
      await this.publishOne(msg);
    }
  }

  private async publishOne(msg: OutboxMessage): Promise<void> {
    try {
      await this.bus.publish(msg.topic, msg.orderingKey, msg.payload);
      await this.outbox.markPublished(msg.outboxId);

      this.log({
        level: 'info',
        event: 'outbox.published',
        outboxId: msg.outboxId,
        runId: msg.runId,
        runSeq: msg.runSeq,
      });
    } catch (err) {
      const attempts = msg.attempts + 1;
      const permanent = attempts >= this.cfg.maxAttempts;

      const delayMs = computeBackoffMs(attempts, this.cfg.baseBackoffMs, this.cfg.maxBackoffMs);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      await this.outbox.markFailed(msg.outboxId, String(err), nextRetryAt, permanent);

      this.log({
        level: permanent ? 'error' : 'warn',
        event: 'outbox.failed',
        outboxId: msg.outboxId,
        runId: msg.runId,
        runSeq: msg.runSeq,
        attempts,
        nextRetryAt,
        permanent,
      });
    }
  }
}
```

---

## 7) Integration test outline (Vitest)

### 7.1 `test/append-events.int.test.ts`

Tests to implement against real Postgres:

- Assigns sequential `runSeq`
- Updates snapshots synchronously
- Enqueues outbox
- Enforces `expectedRunSeq`
- Handles duplicate receiptKey deterministically
- Concurrency: two append calls (one waits / one fails with OCC)

Reference: Vitest
https://vitest.dev/

### 7.2 `test/outbox-lease.int.test.ts`

- Strict ordering: runSeq 1 must be leased before runSeq 2
- Holes: if runSeq 1 is LEASED, do not lease runSeq 2
- Failed messages: failed with nextRetryAt > now should block subsequent
- Parallel runs: orderingKey A and B can both lease in same batch

### 7.3 `test/projector.unit.test.ts`

- Deterministic projection given snapshots + events
- Exhaustive union handling (TypeScript `never` check)

---

## 8) Notes & agreements carried into implementation

- **Snapshots are updated inside `appendEventsTx`**, not by async projector.
- **Outbox publish is derived**, never authoritative.
- **Strict contiguous ordering** is enforced by leasing query.
- **Batch-per-run is allowed only for contiguous sequences**.
- Prefer **command-level receiptKey** for dedupe of multi-event commands.

---

End of implementation blueprint.
