# ADR-0010 — Run Event Envelope Split

Status: Proposed  
Date: 2026-02-20

## Context

The existing `EventEnvelope` mixes producer-assigned and store-assigned fields (notably `runSeq`), forcing callers to fabricate values and weakening the append-authority boundary.

Additionally, RunEvents.v2 requires producer-derived idempotency keys and provider attempt semantics, and the state store must preserve a dedupe signal for outbox correctness.

## Decision

### 1) Envelope split (producer vs store authority)

We define two canonical shapes:

- **`RunEventInput`** — producer-created, contract-complete, stable across retries.
- **`RunEventPersisted`** — store-returned, includes store-assigned fields.

#### RunEventInputBase

```ts
interface RunEventInputBase {
  eventId: string; // UUID v4, producer-generated, stable across retries
  eventType: RunEventType;

  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;

  planId: string; // required
  planVersion: string; // required

  logicalAttemptId: number; // domain attempt counter (adapter-owned)
  engineAttemptId: number; // provider attempt (REQUIRED; default=1 if not exposed)

  emittedAt: string; // ISO 8601 UTC (producer clock)

  idempotencyKey: string; // producer-derived SHA-256 per contract §3.1

  payload?: Record<string, unknown>;
}
```

#### Two-variant `stepId` enforcement (compile-time)

We use a **two-variant discriminated union**, not N-variants:

```ts
export type RunLevelEventInput = RunEventInputBase & { stepId?: never };
export type StepLevelEventInput = RunEventInputBase & { stepId: string };
export type RunEventInput = RunLevelEventInput | StepLevelEventInput;
```

- `stepId?: never` prevents accidental `stepId` on run-level events at **compile time**.
- Step-level events MUST use `StepLevelEventInput`.

### 2) Store-assigned fields: RunEventPersisted

```ts
export type RunEventPersisted = RunEventInput & {
  runSeq: number; // assigned by append authority
  persistedAt: string; // ISO 8601 UTC
};
```

### 3) Dedup-aware append API (AppendResult)

The store returns an explicit dedupe signal:

```ts
export interface AppendResult {
  appended: RunEventPersisted[];
  deduped: RunEventPersisted[];
}

appendEventsTx(inputs: RunEventInput[]): Promise<AppendResult>
```

## Outbox rule (normative)

- **Only `appended` events are eligible for outbox enqueue.**
- **`deduped` events MUST NOT be re-enqueued.**

## Construction defaults (normative)

- `engineAttemptId` is REQUIRED on `RunEventInput`. If a provider runtime does not expose attempts, producers MUST set `engineAttemptId = 1`.
- This defaulting MUST be enforced by a construction helper (not by ad-hoc call-site discretion).

## Consequences

- No caller may fabricate `runSeq`.
- Compile-time correctness for `stepId` presence/absence via a two-variant union.
- **TypeScript note:** `RunEventPersisted = RunEventInput & { runSeq; persistedAt }` is correct: `&` distributes over the `RunEventInput` union, producing both run-level and step-level persisted variants.
- Dedupe behavior is explicit and keeps outbox semantics correct under retries.
- Event emission retries are expected and safe: idempotencyKey + AppendResult prevents duplicate deliveries.
