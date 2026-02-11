# State Store Contract (Normative)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0  
**Stability**: Core semantics — breaking changes require version bump  
**Consumers**: Engine, Adapters, Projector  

**References**:

- [ExecutionSemantics.v1.md](../engine/ExecutionSemantics.v1.md) — defines WHAT (semantics)
- [StateStore Adapters](../../adapters/state-store/) — defines HOW (implementations)
- [Contract Versioning Policy](../../VERSIONING.md)

---

## Purpose

This contract defines the **storage-agnostic interface** for State Store implementations. It specifies:

- **Logical constraints** (uniqueness, ordering, idempotency)
- **Core operations** (append events, fetch events, project snapshots)
- **Invariants** (append-only, monotonicity, idempotency)

It does **NOT** specify:

- Physical schemas (DDLs, indexes, clustering)
- Storage engine tuning (Snowflake vs Postgres vs DynamoDB)
- Concurrency control mechanisms (locks, transactions, optimistic concurrency)

See [adapters/state-store/](../../adapters/state-store/) for backend-specific implementations.

---

## 1) Core Interface

```ts
interface IRunStateStore {
  // Append new event (idempotent via idempotencyKey)
  appendEvent(event: CanonicalEngineEvent): Promise<AppendResult>;
  
  // Fetch events for projection (ordered by runSeq)
  fetchEvents(
    runId: string,
    options: {
      afterSeq?: number;      // Fetch events with runSeq > afterSeq (watermark-based)
      limit?: number;         // Pagination (default: 1000)
    }
  ): Promise<CanonicalEngineEvent[]>;
  
  // Get latest snapshot (cached/materialized view)
  getSnapshot(runId: string): Promise<RunSnapshot | null>;
  
  // Project snapshot from event log (on-demand)
  projectSnapshot(runId: string): Promise<RunSnapshot>;
}

interface AppendResult {
  runSeq: number;           // Assigned by Append Authority
  idempotent: boolean;      // true if duplicate (same idempotencyKey)
  persisted: boolean;       // true if new event written
}

interface CanonicalEngineEvent {
  runId: string;
  runSeq: number;           // Assigned by Append Authority (monotonic per runId)
  eventId: string;          // UUID
  stepId?: string;
  engineAttemptId?: string; // Platform-level retry counter
  logicalAttemptId?: string;// Business-level retry counter
  eventType: string;        // "RunStarted", "StepCompleted", etc.
  eventData: unknown;       // Event-specific payload
  idempotencyKey: string;   // SHA256(runId | stepId | logicalAttemptId | eventType | planVersion)
  emittedAt: string;        // ISO 8601 timestamp (when activity emitted)
  persistedAt?: string;     // ISO 8601 timestamp (when StateStore persisted)
  adapterVersion?: string;
  engineRunRef?: unknown;   // Temporal WorkflowId, Conductor executionId, etc.
  causedBySignalId?: string;// UUID of signal that caused this event
  parentEventId?: string;   // UUID of parent event (for causality tracking)
}
```

---

## 2) Logical Constraints (Normative)

These constraints MUST be enforced by ALL State Store adapters, regardless of backend:

### 2.1 Uniqueness Constraints

1. **`(runId, runSeq)`** MUST be unique.
   - Same run cannot have duplicate sequence numbers
   - Adapter-specific enforcement: PRIMARY KEY, UNIQUE INDEX, conditional insert, etc.

2. **`(runId, idempotencyKey)`** MUST be unique.
   - Same idempotency key cannot produce multiple events
   - Adapter-specific enforcement: UNIQUE INDEX, conditional insert, etc.

### 2.2 Monotonicity Constraint

**`runSeq` MUST be strictly increasing per `runId`**.

- **Who assigns**: "Append Authority" (adapter-specific: stored procedure, application sequence, database sequence)
- **Gap tolerance**: Gaps are allowed and natural (see [ExecutionSemantics.v1.md § 1.0](../engine/ExecutionSemantics.v1.md#10-runseq-design-decision))
- **Contiguity**: NOT required (distributed writers create gaps)

### 2.3 Append-Only Invariant

**Events MUST NEVER be updated or deleted** (append-only log).

- **Deletes**: Only allowed for retention/archival (entire run, not individual events)
- **Updates**: NEVER allowed (breaks event sourcing invariant)
- **Corrections**: Emit compensating events (e.g., `StepCorrected`)

---

## 3) Append Authority Pattern

**Append Authority** = the mechanism that assigns monotonic `runSeq` values.

### 3.1 Implementation Strategies (Adapter-Specific)

| Backend | Append Authority Strategy | Trade-offs |
|---------|---------------------------|------------|
| **Snowflake** | Stored procedure with `MAX(runSeq) + 1` | ✅ No global sequencer<br>⚠️ Requires transaction serialization per runId |
| **Postgres** | Database sequence per runId | ✅ Native support<br>❌ Sequence proliferation (1 seq per run) |
| **Postgres** | Application-managed (Redis atomic increment) | ✅ Horizontal scaling<br>⚠️ External dependency (Redis) |
| **DynamoDB** | Conditional write with version counter | ✅ Fully managed<br>⚠️ Higher latency for conflicts |

See [adapters/state-store/{backend}/](../../adapters/state-store/) for detailed implementation patterns.

### 3.2 Idempotency Contract

**Duplicate `idempotencyKey` MUST return existing `runSeq`** (not fail).

```ts
// Scenario: Activity retries emit same event twice
const event1 = { runId: "r1", idempotencyKey: "abc123", eventType: "StepCompleted", ... };
const event2 = { runId: "r1", idempotencyKey: "abc123", eventType: "StepCompleted", ... };

const result1 = await store.appendEvent(event1);
// result1 = { runSeq: 10, idempotent: false, persisted: true }

const result2 = await store.appendEvent(event2);
// result2 = { runSeq: 10, idempotent: true, persisted: false }  ← SAME runSeq
```

**Adapter implementations**:

- Snowflake: `MERGE` with idempotencyKey match → return existing runSeq
- Postgres: `INSERT ... ON CONFLICT (runId, idempotencyKey) DO NOTHING` + `SELECT runSeq`
- DynamoDB: Conditional put + atomic counter

---

## 4) Fetch Contract (Watermark-Based)

**`fetchEvents()` MUST return events ordered by `runSeq` ASC**.

### 4.1 Watermark Pattern

UI/Projector maintains a **watermark** (`lastEventSeq`) and fetches incrementally:

```ts
let watermark = 0;

while (true) {
  const events = await store.fetchEvents(runId, { afterSeq: watermark, limit: 100 });
  
  if (events.length === 0) {
    await sleep(1000); // Polling interval
    continue;
  }
  
  await projector.apply(events);
  watermark = events[events.length - 1].runSeq; // Advance watermark
}
```

### 4.2 Non-Contiguous Observations (Expected)

**Gaps are normal** in distributed systems (see [ExecutionSemantics.v1.md § 1.0](../engine/ExecutionSemantics.v1.md#10-runseq-design-decision)):

```
Fetch 1: runSeq = [1, 2, 3]        (watermark = 3)
Fetch 2: runSeq = [5, 6]           (gap: 4 missing, watermark = 6)
Fetch 3: runSeq = [4, 7, 8]        (gap filled + new events, watermark = 8)
```

**Projector response** (normative):

1. Detect non-contiguous observation (5 > 3+1)
2. Mark run as `STALE`
3. Trigger resync (refetch snapshot + delta)
4. Resume once watermark advances successfully

---

## 5) Snapshot Contract

**Snapshots are derived views** (immutable, not source of truth).

### 5.1 Snapshot Sources (Adapter-Specific)

| Source | Strategy | Use Case |
|--------|----------|----------|
| **On-demand projection** | Replay events from offset 0 | Cold start, debugging |
| **Materialized view** | Incremental update on new events | High-frequency reads (UI) |
| **Cache layer** | Redis/Memcached with TTL | p99 latency SLA |

### 5.2 Snapshot Staleness SLA

**Projector lag MUST be ≤1s** in normal operation.

- **Alert P2** if lag >5s: `PROJECTOR_LAG_HIGH`
- **Resync trigger**: Non-contiguous observation or lag >10s

---

## 6) Schema Evolution

Changes to this contract follow **Semantic Versioning** (see [VERSIONING.md](../../VERSIONING.md)):

**MINOR Bump (v1.0 → v1.1)**: Backward-compatible additions

- New optional field in `CanonicalEngineEvent`
- New optional parameter in `fetchEvents()`
- New event type (consumers ignore unknown types per [ExecutionSemantics.v1.md § 1.5 rule 6](../engine/ExecutionSemantics.v1.md))

**MAJOR Bump (v1.0 → v2.0)**: Breaking changes

- Remove required field from `CanonicalEngineEvent`
- Change `runSeq` assignment semantics (e.g., switch to UUIDv7)
- Change idempotency key structure

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial State Store contract (extracted from ExecutionSemantics.v1.md) |
