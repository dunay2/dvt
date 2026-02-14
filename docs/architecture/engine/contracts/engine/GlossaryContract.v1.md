# Glossary Contract (Normative v1)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.0.0  
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: Engine, adapters, planner, state store, UI, contract authors  
**Related Contracts**: [IWorkflowEngine.v1.1.md](./IWorkflowEngine.v1.1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [RunEvents.v1.1.md](./RunEvents.v1.1.md), [SignalsAndAuth.v1.1.md](./SignalsAndAuth.v1.1.md)

---

## 1) Purpose and Scope

This glossary defines canonical terminology and identifier semantics for engine contracts.

- Terms in this document are normative when marked as MUST / MUST NOT.
- If another document uses conflicting wording, this glossary is the terminology source of truth for v1.
- This document does not redefine full behavioral semantics; it standardizes naming and term meaning.

---

## 2) Canonical Core Terms

| Term                  | Canonical meaning                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| **Run**               | One workflow execution instance identified by `runId`.                                                 |
| **Step**              | One executable unit inside a run plan; may have multiple attempts.                                     |
| **Attempt (logical)** | Business/policy retry counter (`logicalAttemptId`) for run/step processing.                            |
| **Attempt (engine)**  | Infrastructure retry/restart counter (`engineAttemptId`).                                              |
| **Run Event**         | Append-only lifecycle event emitted by engine components and persisted in StateStore/Append Authority. |
| **Signal**            | External/operator/system command that requests run mutation (e.g., pause, resume, retry).              |
| **PlanRef**           | Opaque reference to externally stored execution plan plus integrity metadata.                          |
| **Append Authority**  | Persistence authority that assigns `runSeq` and enforces append/idempotency constraints.               |
| **Run Snapshot**      | Projected state for a run derived from event stream.                                                   |

---

## 3) Canonical Identifiers and Semantics

### 3.1 Correlation identifiers

The following identifiers are canonical across contracts and events:

- `tenantId`: tenant isolation boundary.
- `projectId`: project scope within tenant.
- `environmentId`: runtime environment scope (dev/staging/prod).
- `runId`: globally unique run identifier (UUID v4 recommended).

### 3.2 Attempt identifiers

- `logicalAttemptId` is the canonical business-level attempt counter.
  - MUST drive idempotency key derivation.
  - SHOULD be shown to operators as retry count.
- `engineAttemptId` is the canonical infrastructure-level attempt counter.
  - MUST be present for diagnostics/audit.
  - MUST NOT affect idempotency key derivation.

### 3.3 Event sequencing and identity

- `runSeq` is the canonical monotonic sequence per `runId`.
- `idempotencyKey` is the canonical deduplication key for event append.
- `signalId` is the canonical idempotency key component for signal requests.

---

## 4) Naming Policies (Normative)

### 4.1 Event naming

- Event names MUST use PascalCase (`RunStarted`, `StepFailed`).
- Event names MUST NOT use `on` prefix (`onRunStarted` is invalid).

### 4.2 Timestamp naming

- Engine event timestamp field MUST be named `emittedAt`.
- StateStore-assigned persistence timestamp MUST be named `persistedAt`.
- Contracts in v1.x MUST NOT mix envelope timestamp names for the same concept.

### 4.3 Identifier naming

- Canonical identifier fields MUST use lowerCamelCase with `Id` suffix (e.g., `runId`, `tenantId`, `signalId`).
- Transport and schema fields SHOULD keep exact canonical names to avoid mapping drift.

### 4.4 Run-level idempotency normalization token

- For formulas requiring a normalized step token on run-level events, the canonical token is `RUN`.

---

## 5) Contract Invariants (Terminology-linked)

1. Idempotency key derivation MUST depend on `logicalAttemptId`, not `engineAttemptId`.
2. `runId` MUST be available for all run operations (status, cancel, signal).
3. Correlation fields (`tenantId`, `projectId`, `environmentId`, `runId`) MUST be present in event envelopes.
4. `runSeq` ordering is monotonic per run and assigned by Append Authority.
5. Signal idempotency key MUST include `(tenantId, runId, signalId)`.

---

## 6) Canonical Examples

### 6.1 Event naming

- ✅ `RunStarted`, `StepStarted`, `RunCompleted`
- ❌ `onRunStarted`, `run_started`, `RUN_COMPLETED`

### 6.2 Attempt semantics

- Infra retry without business retry:
  - `engineAttemptId` may increment.
  - `logicalAttemptId` remains stable.
  - `idempotencyKey` remains stable.

### 6.3 Timestamp semantics

- Use `persistedAt` for server-authoritative ordering/query windows.
- Use `emittedAt` for producer-side timing context.

---

## 7) Non-goals

This glossary does not replace:

- Full state-machine definitions (see [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)).
- Complete event schemas (see [RunEvents.v1.1.md](./RunEvents.v1.1.md)).
- Signal authorization/policy details (see [SignalsAndAuth.v1.1.md](./SignalsAndAuth.v1.1.md)).

---

## 8) Change Control

- Additive terminology clarifications MAY be released as minor/patch if non-breaking.
- Renaming canonical fields/terms is breaking and requires major version bump.
