# Glossary Contract (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT  
**Version**: v1
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: Engine, adapters, planner, state store, UI, contract authors  
**Related Contracts**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [RunEvents.v1.md](./RunEvents.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md)

---

## 1) Purpose and Scope

This glossary defines canonical terminology and identifier semantics for engine contracts.

- Terms in this document are normative when marked as MUST / MUST NOT.
- The key words MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are to be interpreted as described in BCP 14 (RFC 2119, RFC 8174).
- If another document uses conflicting wording, this glossary is the terminology source of truth for v1.
- This document does not redefine full behavioral semantics; it standardizes naming and term meaning.

---

## 2) Canonical Core Terms

| Term                      | Canonical meaning                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Run**                   | One workflow execution instance identified by `runId`.                                                                            |
| **Plan**                  | Declarative definition of workflow steps and execution logic.                                                                     |
| **planId**                | Stable identifier for a plan definition (independent of version).                                                                 |
| **planVersion**           | Specific version of a plan (semantic version or hash).                                                                            |
| **RunRef**                | Provider-specific run handle (`EngineRunRef`) used for operations; not a global run identity.                                     |
| **Step**                  | One executable unit inside a run plan; may have multiple attempts.                                                                |
| **stepId**                | Canonical identifier for a step within a plan/run context.                                                                        |
| **Attempt (logical)**     | Business/policy retry counter (`logicalAttemptId`) for run/step processing.                                                       |
| **Attempt (engine)**      | Infrastructure retry/restart counter (`engineAttemptId`).                                                                         |
| **Run Event**             | Append-only lifecycle event emitted by engine components and persisted in StateStore/Append Authority.                            |
| **Event Envelope**        | Canonical common event metadata wrapper (identity, sequencing, correlation, idempotency, timestamps).                             |
| **eventType**             | Canonical name of the event (e.g., `RunStarted`, `StepFailed`). MUST follow naming policy §4.1.                                   |
| **KnownEventType**        | Set of event types defined in the contract that have specified semantics.                                                         |
| **UnknownEventType**      | Event type not in `KnownEventType`; consumers MUST tolerate per forward compatibility rules.                                      |
| **Signal**                | External/operator/system command that requests run mutation (e.g., pause, resume, retry).                                         |
| **SignalDecisionRecord**  | Persisted authorization decision record for a signal request and audit trail.                                                     |
| **PlanRef**               | Opaque reference to externally stored execution plan plus integrity metadata (combines `planId`, `planVersion`, and storage URI). |
| **Append Authority**      | Persistence authority that assigns `runSeq` and enforces append/idempotency constraints.                                          |
| **Run Snapshot**          | Projected state for a run derived from event stream.                                                                              |
| **Watermark**             | Consumer checkpoint indicating deterministic ingestion progress. For persisted records, advanced using `(runId, runSeq)` order.   |
| **Watermark advancement** | Process of updating watermark to the highest contiguously processed sequence.                                                     |
| **Payload**               | Event-specific data container. MAY be required for certain event types (e.g., errors, outputs).                                   |
| **Payload schema**        | Defined structure for a specific event type's payload (see RunEventCatalog).                                                      |
| **Payload truncation**    | Mechanism for handling payloads that exceed size limits via external references.                                                  |

---

## 3) Canonical Identifiers and Semantics

### 3.1 Correlation identifiers

The following identifiers are canonical across contracts and events:

- `tenantId`: tenant isolation boundary.
- `projectId`: project scope within tenant.
- `environmentId`: runtime environment scope (dev/staging/prod).
- `runId`: globally unique run identifier (UUID v4 recommended).

**Identifier shape rules (normative):**

- Canonical identifier fields (`tenantId`, `projectId`, `environmentId`, `runId`, `signalId`) MUST be non-empty strings.
- Identifiers SHOULD be trimmed at API/transport boundaries.
- Identifiers MUST be treated as case-sensitive unless explicitly documented otherwise.
- `runId` SHOULD use UUID canonical textual representation (RFC 4122; UUID v4 recommended).

### 3.2 Attempt identifiers

- `logicalAttemptId` is the canonical business-level attempt counter.
  - MUST drive idempotency key derivation.
  - SHOULD be shown to operators as retry count.
  - SHOULD start at `1` for first logical attempt.
- `engineAttemptId` is the canonical infrastructure-level attempt counter.
  - MUST be present for diagnostics/audit.
  - MUST NOT affect idempotency key derivation.

### 3.3 Event sequencing and identity

- `runSeq` is the canonical monotonic sequence per `runId`.
- `runSeq` MUST be strictly increasing per `(tenantId, runId)` and assigned by Append Authority.
- `runSeq` gap policy SHOULD be defined explicitly by the execution semantics contract.
- `idempotencyKey` is the canonical deduplication key for event append.
- `signalId` is the canonical idempotency key component for signal requests.

### 3.4 Step identifiers and event identity

- `stepId` is the canonical identifier field name for step-level correlation.
- Step-level events MUST carry canonical `stepId` when applicable.
- Event identity is canonically represented by `(runId, runSeq)` for ordering and by `(runId, idempotencyKey)` for deduplication.

### 3.5 Identity field character restrictions

The following canonical identifiers MUST NOT contain the pipe character `|` (U+007C):

- `runId`
- `stepId` (when present)
- `eventType`
- `planId`
- `planVersion`
- `signalId`

Rationale: This character is used as delimiter in idempotency key derivation (§3.1 of RunEvents contract).
Any implementation that allows `|` in these fields is NON-COMPLIANT.

---

## 4) Naming Policies (Normative)

### 4.1 Event naming

- Event names MUST use PascalCase (`RunStarted`, `StepFailed`).
- Event names MUST NOT use `on` prefix (`onRunStarted` is invalid).

### 4.2 Timestamp naming and format

- Engine event timestamp field MUST be named `emittedAt`.
- StateStore-assigned persistence timestamp MUST be named `persistedAt`.
- `emittedAt` and `persistedAt` MUST be RFC 3339 timestamps (`string`) in UTC.
- Contracts in v1.x MUST NOT mix envelope timestamp names for the same concept.

### 4.3 Identifier naming

- Canonical identifier fields MUST use lowerCamelCase with `Id` suffix (e.g., `runId`, `tenantId`, `signalId`).
- Transport and schema fields SHOULD keep exact canonical names to avoid mapping drift.

### 4.4 Run-level idempotency normalization token

- For formulas requiring a normalized step token on run-level events, the canonical token is `RUN`.

### 4.5 Event envelope minimum fields

Canonical event envelopes SHOULD include at least:

- Correlation: `tenantId`, `projectId`, `environmentId`, `runId`
- Identity/sequencing: `eventType`, `runSeq`, `idempotencyKey`
- Attempts: `logicalAttemptId`, `engineAttemptId`
- Timing: `emittedAt`, `persistedAt` (if persisted record)

### 4.6 Run and step status naming

#### Run status values (canonical)

- `PENDING`: Run created but not started
- `APPROVED`: Run approved by planner and ready to start
- `RUNNING`: Execution in progress
- `PAUSED`: Execution temporarily halted
- `COMPLETED`: Successful termination
- `FAILED`: Unsuccessful termination
- `CANCELLED`: Terminated by user/system request

#### Step status values (canonical)

- `PENDING`: Step not started
- `RUNNING`: Step execution in progress
- `SUCCESS`: Step completed successfully
- `FAILED`: Step execution failed
- `SKIPPED`: Step was skipped (by policy or condition)

These status strings MUST be used exactly as shown (uppercase) in all contracts and implementations.

---

## 5) Contract Invariants (Terminology-linked)

1. Idempotency key derivation MUST depend on `logicalAttemptId`, not `engineAttemptId`.
2. `runId` MUST be available for all run operations (status, cancel, signal).
3. Correlation fields (`tenantId`, `projectId`, `environmentId`, `runId`) MUST be present in event envelopes.
4. `runSeq` ordering is monotonic per run and assigned by Append Authority.
5. Signal idempotency key MUST include `(tenantId, runId, signalId)`.
6. Timestamp authority separation: `emittedAt` represents producer clock and MAY have skew; `persistedAt` represents append authority clock and is the source of truth for time-window operations. Consumers MUST use `persistedAt` for all authoritative temporal queries.

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

### 6.4 UUID v4 examples

- ✅ Valid UUID v4: `f47ac10b-58cc-4372-a567-0e02b2c3d479`
- ✅ Valid UUID v4: `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a`
- ❌ Invalid (v1): `6ba7b810-9dad-11d1-80b4-00c04fd430c8`
- ❌ Invalid (missing hyphen): `f47ac10b58cc4372a5670e02b2c3d479`

`runId` MUST use canonical hyphenated format.

---

## 7) Non-goals

This glossary does not replace:

- Full state-machine definitions (see [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)).
- Complete event schemas (see [RunEvents.v1.md](./RunEvents.v1.md)).
- Signal authorization/policy details (see [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md)).

---

## 8) Change Control

- Additive terminology clarifications MAY be released as minor/patch if non-breaking.
- Renaming canonical fields/terms is breaking and requires major version bump.

---

## 9) References

- RFC 2119: Key words for use in RFCs to Indicate Requirement Levels.
- RFC 8174: Ambiguity of Uppercase vs Lowercase in RFC 2119 Key Words.
- RFC 3339: Date and Time on the Internet: Timestamps.
- RFC 4122: A Universally Unique IDentifier (UUID) URN Namespace.

---

## 10) Prohibited Synonyms

To maintain consistency across codebase and documentation, the following synonyms are PROHIBITED:

| Canonical Term | Prohibited Synonyms                            |
| -------------- | ---------------------------------------------- |
| run            | execution, workflow, job, process, instance    |
| step           | task, activity, operation, unit, action        |
| attempt        | try, retry-count, iteration, invocation        |
| snapshot       | checkpoint, state-view, materialization, cache |
| replay         | reprocess, rebuild, reconstitute, recover      |
| signal         | command, instruction, request, directive       |
| plan           | blueprint, definition, template, workflow-def  |
| payload        | data, body, content, attributes                |

Code reviews MUST enforce these prohibitions. Documentation updates SHOULD replace prohibited terms.

---

## 11) Conformance Requirements

Implementations MUST verify idempotency key derivation against the golden vectors in
the version-aligned RunEvents idempotency vectors artifact (for v1 releases, publish as
`RunEvents.v1.idempotency_vectors.json`). These vectors use the canonical field names
and formats defined in this glossary.

See [RunEvents Contract §2.2](./RunEvents.v1.md#22-idempotency-guarantee).
