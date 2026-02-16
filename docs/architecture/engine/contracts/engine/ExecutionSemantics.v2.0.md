# Execution Semantics Contract (Normative v2.0.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 2.0.0  
**Stability**: Contracts — breaking changes require major version bump  
**Consumers**: Engine runtime, adapters, StateStore (Append Authority), projectors, audit pipelines  
**Related Contracts**: [IWorkflowEngine.v2.0.md](./IWorkflowEngine.v2.0.md), [RunEvents.v2.0.md](./RunEvents.v2.0.md), [IRunStateStore.v2.0.md](../state-store/IRunStateStore.v2.0.md)

---

## 1) Core Model

Execution state is defined by an append-only event stream per `runId`.

- Ordering authority: `runSeq` (monotonic per `runId`, gaps allowed).
- Deduplication authority: `(runId, idempotencyKey)`.
- Time-window authority: `persistedAt`.

Projectors MUST order by `runSeq`, not by timestamps.

---

## 2) Event Envelope Time Semantics (Normative)

### 2.1 Canonical fields

- `emittedAt`: producer time (engine/worker clock)
- `persistedAt`: append authority time (StateStore server clock)

### 2.2 Rules

1. Producers MUST set `emittedAt`.
2. Append Authority MUST set `persistedAt` at write time.
3. Audit/time-window queries MUST use `persistedAt`.
4. Ordering MUST use `runSeq` only.

### 2.3 Envelope cleanliness

`occurredAt` is NOT a canonical envelope field in v2.0.0.

If a domain needs source event-time, it MAY include `sourceOccurredAt` inside event `payload`.

---

## 3) Idempotency and Attempts (Normative)

### 3.1 Key formula

`idempotencyKey` MUST be:

```text
SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planId | planVersion)
```

`stepIdNormalized = 'RUN'` for run-level events.

### 3.2 Collision behavior

On duplicate `(runId, idempotencyKey)`, Append Authority MUST:

- return existing metadata (`eventId`, `runSeq`, `persistedAt`),
- mark operation idempotent,
- and MUST NOT insert a duplicate.

### 3.3 Attempts

- `logicalAttemptId` MUST start at `1`.
- `engineAttemptId` MUST be present.
- If provider does not expose engine attempts, producer MUST set `engineAttemptId = 1`.
- Producers MUST NOT increment `engineAttemptId` artificially.

---

## 4) Projection Requirements

Projectors MUST:

1. Be idempotent on duplicate records.
2. Advance watermark by `runSeq`.
3. Tolerate unknown future event types (forward compatibility).
4. Treat duplicate events as no-op state transitions.

---

## 5) Run-level and Step-level Event Set

Canonical lifecycle events are defined in [RunEvents.v2.0.md](./RunEvents.v2.0.md):

- Run-level: `RunStarted`, `RunPaused`, `RunResumed`, `RunCompleted`, `RunFailed`, `RunCancelled`
- Step-level: `StepStarted`, `StepCompleted`, `StepFailed`, `StepSkipped`

`RunQueued` remains admission-control owned and MAY be emitted if schema-compatible.

---

## 6) Append Authority Responsibilities

Append Authority MUST enforce:

- monotonic `runSeq` assignment per run,
- uniqueness on `(runId, idempotencyKey)`,
- immutable persisted records,
- deterministic duplicate response.

---

## 7) Change Log

- **2.0.0 (2026-02-16)**: **MAJOR** — removed envelope-level `occurredAt`; split authoritative timestamp responsibilities (`emittedAt` producer, `persistedAt` append authority); idempotency formula now includes `planId`; duplicate handling standardized to return-existing-only; attempt fallback rule made normative (`engineAttemptId=1` when provider lacks attempt API).
