# Run Events Contract (Normative v2.0.1)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 2.0.1  
**Stability**: Contracts — breaking changes require major version bump  
**Consumers**: StateStore (Append Authority), Projectors, UI, Audit Systems  
**Parent Contract**: [`IWorkflowEngine.v2.0.md`](./IWorkflowEngine.v2.0.md)  
**References**: [`ExecutionSemantics.v2.0.md`](./ExecutionSemantics.v2.0.md), [`IRunStateStore.v2.0.md`](../state-store/IRunStateStore.v2.0.md), SignalsAndAuth v1.1 (pending publication), [`AgnosticEventLayerStrategy.v2.0.1.md`](./AgnosticEventLayerStrategy.v2.0.1.md)

**Normative keywords**: The key words “MUST”, “MUST NOT”, “SHOULD”, “SHOULD NOT”, “MAY” in this document are to be interpreted as described in BCP 14 (RFC 2119 and RFC 8174).

---

## 1) Scope and Event Catalog

### 1.1 Scope (NORMATIVE)

This contract governs run and step lifecycle events emitted by the Engine domain:

- engine runtime,
- workers/activities owned by the engine adapter.

Signal decision events (`SignalAccepted`, `SignalRejected`) are out of scope and remain defined in SignalsAndAuth v1.1 (pending publication).

### 1.2 Known Lifecycle Events (NORMATIVE)

Known lifecycle events are:

- `RunQueued`
- `RunStarted`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `StepSkipped`
- `RunPaused`
- `RunResumed`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

`RunQueued` MAY be emitted by admission-control components (inside or outside engine boundary). If emitted, it MUST comply with this envelope model.

### 1.3 Forward Compatibility (NORMATIVE)

Consumers MUST tolerate unknown `eventType` values, treat them as opaque for display/logging, and still advance watermarks deterministically. In this contract, a 'watermark' is a consumer checkpoint for deterministic ingestion progress. When consuming persisted `RunEventRecord`, consumers MUST advance the watermark using `(runId, runSeq)` order. If consuming a non-persisted stream (`RunEventWrite`) without `runSeq`/`persistedAt`, the consumer MUST define a deterministic checkpoint strategy (for example, ingestion offset) and MUST NOT use that stream to mutate authoritative derived state unless documented. Unknown `eventType` values MUST NOT mutate derived run/step state unless the consumer explicitly implements documented semantics for that `eventType`.

---

## 2) Event Envelope Requirements

### 2.1 Required Fields (NORMATIVE)

All events MUST include:

- `eventId` (UUID v4)
- `eventType`
- `runId`
- `tenantId`, `projectId`, `environmentId`
- `planId`, `planVersion`
- `engineAttemptId` (number)
- `logicalAttemptId` (number)
- `idempotencyKey`
- `emittedAt` (producer clock timestamp, RFC 3339 UTC)

### 2.2 stepId Applicability (NORMATIVE)

- Step-level events (`StepStarted`, `StepCompleted`, `StepFailed`, `StepSkipped`): `stepId` MUST be present and non-empty.
- Run-level events: `stepId` MUST NOT be present.

### 2.3 Timestamp Authority Split (NORMATIVE)

- `emittedAt` = producer time (engine/worker clock)
- `persistedAt` = Append Authority time (StateStore server clock)

For time-window queries, audit windows, and authoritative temporal slicing, consumers MUST use `persistedAt` when processing persisted records.

### 2.4 Attempts (NORMATIVE)

- `logicalAttemptId` MUST start at `1`.
- `engineAttemptId` MUST be present in every event.
- If provider runtime does not expose attempts, producer MUST set `engineAttemptId = 1`.
- Producers MUST NOT increment `engineAttemptId` artificially.

### 2.5 eventId Stability Under Retries (NORMATIVE)

- Producers MUST reuse the same `eventId` for the same `idempotencyKey` across retries.
- If producer reuse cannot be guaranteed:
  - Append Authority MUST treat persisted record metadata as authoritative.
  - Append Authority MUST return existing metadata (`eventId`, `runSeq`, `persistedAt`).
  - Callers MUST accept returned metadata.

### 2.5.1 Producer EventId Registry (NORMATIVE)

- Producers MUST maintain a per-run mapping `EventIdRegistry` keyed by `(runId, idempotencyKey)` returning a stable `eventId` (UUID v4).
- On first emission for a given `(runId, idempotencyKey)`, the producer MUST:
  1. generate a new UUID v4 as `eventId`,
  2. write it into `EventIdRegistry` BEFORE attempting append, and
  3. reuse the same `eventId` for all retries of that event.
- `EventIdRegistry` MUST survive producer retries/restarts that can re-emit the same logical event. Accepted durability mechanisms:
  - Deterministic workflow state replay (e.g., workflow memory/state that replays identically), OR
  - Durable per-run storage scoped to `(runId, idempotencyKey)` with idempotent writes.
- Producers MUST NOT derive `eventId` deterministically from inputs (UUID v5 or hashes are NOT allowed) because `eventId` MUST be UUID v4.
- If the producer cannot guarantee registry durability (e.g., crash before registry write), it MAY generate a new UUID v4 on retry, BUT then it MUST accept Append Authority’s returned metadata as authoritative and MUST update `EventIdRegistry` to the returned `eventId` for the remainder of the run.

### 2.5.2 Temporal/Runtime Notes (INFORMATIVE)

- For Temporal TypeScript Workflows, UUID v4 generation MUST be determinism-safe. Use Temporal’s workflow-safe UUID helper rather than a standard non-deterministic UUID library in workflow code.
- Activities may generate UUIDs safely because their results are recorded in history, but the producer still MUST preserve `(runId, idempotencyKey) → eventId` stability across retries via the registry rules above.

References:

- <https://typescript.temporal.io/api/modules/workflow#uuid4>
- <https://community.temporal.io/t/uuid-from-workflow-sdk-vs-via-activity/8536>

### 2.6 payload Presence (NORMATIVE)

- If an event carries event-specific data (errors, outputs, skip reasons, pause/resume/cancel reasons), producer MUST include `payload`.
- If no additional data exists, `payload` MAY be omitted.

---

## 3) Idempotency and Duplicate Handling

### 3.1 Idempotency Derivation (NORMATIVE, BREAKING)

`idempotencyKey` MUST be derived exactly as:

```text
SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planId | planVersion)
```

Derivation requirements:

1. Field set MUST be exactly the six fields above.
2. Field order MUST be exactly as shown.
3. Hash algorithm MUST be SHA-256.
4. Delimiter MUST be the literal character `|`.
5. Preimage string encoding MUST be UTF-8.
   All string fields (runId, stepId, eventType, planId, planVersion) are used verbatim, case-sensitive, without trimming or Unicode normalization.
6. Numeric rendering for `logicalAttemptId` MUST be base-10 ASCII with no leading zeros (except literal `0`).
7. `stepIdNormalized` rules:
   - step-level events: `stepIdNormalized = stepId`
   - run-level events: `stepIdNormalized = 'RUN'`
8. `tenantId`, `projectId`, `environmentId`, and `engineAttemptId` MUST NOT participate in derivation.
9. `runId`, `eventType`, `planId`, and `planVersion` MUST NOT contain `|`. `stepId` MUST NOT contain `|` when present.

Any implementation that changes ordering, delimiter, encoding, algorithm, normalization, or includes forbidden fields is NOT compliant with v2.0.1.

### 3.2 Duplicate Handling (NORMATIVE, BREAKING)

If an event with the same `(runId, idempotencyKey)` already exists, Append Authority MUST:

1. Succeed,
2. Return existing metadata at minimum: `eventId`, `runSeq`, `persistedAt`,
3. MUST NOT insert a duplicate record.

Reject-on-duplicate behavior is NOT compliant in v2.0.1.

---

## 3.3 Conformance Tests (NORMATIVE)

- Implementations MUST provide golden test vectors for `idempotencyKey` derivation covering:
  - run-level events (stepIdNormalized = 'RUN')
  - step-level events (stepIdNormalized = stepId)
  - multiple logicalAttemptId values
  - multiple planVersion values
- Tests MUST assert:
  - exact UTF-8 preimage formatting,
  - exact delimiter usage (`|`),
  - SHA-256 output matches expected hex digest,
  - forbidden fields do not affect output.
- The contract repository MUST include at least 5 vectors in a machine-readable form named `RunEvents.v2.0.1.idempotency_vectors.json` stored next to this contract.

---

## 4) Two-Phase Event Shapes

```ts
type KnownRunEventType =
  | 'RunQueued'
  | 'RunStarted'
  | 'StepStarted'
  | 'StepCompleted'
  | 'StepFailed'
  | 'StepSkipped'
  | 'RunPaused'
  | 'RunResumed'
  | 'RunCompleted'
  | 'RunFailed'
  | 'RunCancelled';

type RunEventType = KnownRunEventType | (string & {});

interface RunEventWrite {
  eventId: string; // UUID v4
  eventType: RunEventType;
  emittedAt: string; // RFC 3339 UTC (producer clock)
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  stepId?: string; // constrained by section 2.2
  payload?: Record<string, unknown>;
}

interface RunEventRecord extends RunEventWrite {
  runSeq: number; // monotonic per runId; gaps allowed
  persistedAt: string; // RFC 3339 UTC (Append Authority clock)
}
```

`persistedAt` MUST be present in `RunEventRecord`.

---

## 5) State Transition Mapping and Enforcement

### 5.1 Run-Level Transition Mapping

| Event          | Status Transition |
| -------------- | ----------------- |
| `RunStarted`   | `RUNNING`         |
| `RunPaused`    | `PAUSED`          |
| `RunResumed`   | `RUNNING`         |
| `RunCompleted` | `COMPLETED`       |
| `RunFailed`    | `FAILED`          |
| `RunCancelled` | `CANCELLED`       |

### 5.2 Step-Level Transition Mapping

| Event           | Step Transition       |
| --------------- | --------------------- |
| `StepStarted`   | `PENDING` → `RUNNING` |
| `StepCompleted` | `RUNNING` → `SUCCESS` |
| `StepFailed`    | `RUNNING` → `FAILED`  |
| `StepSkipped`   | `PENDING` → `SKIPPED` |

### 5.3 Transition Enforcement (NORMATIVE)

- Enforcement MUST be implemented as three layers with the responsibilities below. The system is compliant ONLY if Layer 3 is implemented.

#### Layer 1 — Producer Guard (Engine domain) (NORMATIVE)

- Producers MUST validate the current derived state they believe to be true before emitting the next transition event.
- Producers MUST NOT emit an invalid transition event.
- If invalid transition is detected locally:
  - Producers MUST stop further emission for the affected entity (run/step) and surface an internal error.
  - Producers MAY emit `RunFailed` with payload describing `invalidTransitionDetected`, ONLY IF doing so does not itself violate run-level sequencing assumptions in their runtime; if uncertain, producers SHOULD emit no further lifecycle events and rely on Layer 3 to flag inconsistency.
  - Producers MAY emit `StepFailed` ONLY if the producer’s current derived step state is `RUNNING`; otherwise producers MUST NOT emit `StepFailed`.
- Payload for this condition MUST include `invalidTransitionDetected=true`, `expectedState`, `actualState`, and `attemptedEventType`.

#### Layer 2 — Append Authority Optional Validation (StateStore) (NORMATIVE OPTIONAL)

- Append Authority MAY validate transitions at append-time to reduce bad data entering the log.
- Append Authority MUST NOT be the only enforcement layer.
- If Append Authority performs validation, on invalid transition it MUST NOT write a record and MUST return a deterministic rejection using machine-readable code `INVALID_TRANSITION`.
- For invalid transitions rejected before append, §3.2 does not apply because no persisted event exists for that key.
- Retries of the same invalid append MUST return the same deterministic rejection (same error code and metadata), and MUST NOT create a record.

#### Layer 3 — Projector Reduction Validation (MANDATORY) (NORMATIVE)

- Projectors MUST validate transitions while reducing the append-only event stream into derived state.
- On invalid transition, projectors MUST:
  1. raise an operational alert,
  2. MUST NOT corrupt derived state,
  3. apply a deterministic handling policy chosen below and documented:
     - Policy A (RECOMMENDED): ignore the invalid event for state mutation and mark the run as `INCONSISTENT` in derived metadata (without changing terminal status), OR
     - Policy B: freeze further reductions for that `runId` at the last valid `runSeq` and mark run as `STALLED_INVALID_TRANSITION`.
- The chosen policy MUST be consistent across deployments and MUST be test-covered.

### 5.4 Invalid Transition Alert Payload (NORMATIVE)

- Alerts emitted/logged by projectors for invalid transitions MUST include at minimum:
  - runId, tenantId, projectId, environmentId
  - offending eventId, eventType, runSeq, persistedAt
  - prior derived state and attempted next state
  - a machine-readable code: `INVALID_TRANSITION`
- Alerts MUST be idempotent per `(runId, offending eventId)`.

---

## 6) Change Log

- **2.0.1 (2026-02-16)**: PATCH — clarified producer-side `eventId` tracking requirements and specified a three-layer transition enforcement architecture with deterministic invalid-transition handling; added conformance test requirements and golden vectors for idempotency derivation.
- **2.0.0 (2026-02-16)**: **MAJOR** — `eventId` REQUIRED; idempotency formula now includes `planId` + `planVersion` with strict SHA-256, ordered derivation, `|` delimiter, and `RUN` normalization; duplicate handling changed to return-existing metadata and no insert; lifecycle catalog explicitly includes `RunQueued`; `eventType` made forward-compatible; `stepId` MUST/MUST NOT applicability made strict; `eventId` retry-stability rule added; payload presence rule added; transition enforcement responsibilities added; scope clarified to engine runtime plus adapter-owned workers/activities; attempt fallback (`engineAttemptId = 1`) formalized; timestamp authority split (`emittedAt` vs `persistedAt`) formalized.

---

## Appendix A — Decisions & Risks (INFORMATIVE)

### A.1 Decisions

**D0 — Separation of concerns alignment (INFORMATIVE)**  
Decision: this scope is aligned with the product principles: UI does not execute, engine does not decide, planner does not persist state, and StateStore/Append Authority is the source of truth.  
Reason: preserves clear ownership boundaries across planning, execution, and persistence.

**D1 — Strict idempotency derivation**  
Decision: strict SHA-256 derivation with fixed order, fixed delimiter, fixed normalization.  
Reason: prevents cross-language drift and preserves deterministic retries/business dedup.

**D2 — Include `planId` + `planVersion` in idempotency**  
Decision: both identifiers are mandatory inputs to key derivation.  
Reason: prevents collisions across plan lineage and version boundaries.

**D3 — Duplicate policy is return-existing**  
Decision: reject-on-duplicate prohibited; append must return existing metadata.  
Reason: enables safe retries in distributed systems.

**D4 — Timestamp authority split**  
Decision: producer clock (`emittedAt`) separated from append authority clock (`persistedAt`).  
Reason: producer skew is expected; authoritative audit/time slicing requires append-time clock.

**D5 — Engine domain ownership includes adapter workers/activities**  
Decision: event ownership includes runtime plus adapter-owned workers/activities.  
Reason: matches real distributed topology and clarifies accountability boundaries.

### A.2 Risks and Mitigations

**R1 — Producer clock skew**  
Mitigation: use `persistedAt` for windows and audit slicing.

**R2 — Mixed v1/v2 streams during rollout**  
Mitigation: define a bounded compatibility window; during that window, projectors apply deterministic normalization before reduction.

**R3 — Canonicalization drift in key derivation**  
Mitigation: exact algorithm/ordering/delimiter/encoding rules plus golden test vectors and shared helper implementation.

**R4 — `runSeq` concurrency contention**  
Mitigation: Append Authority remains the sole transactional ordering authority.

**R5 — Event volume and cost growth**  
Mitigation: retention tiers, archival policy, and replay boundaries.

**R6 — Orchestrator behavior differences (Temporal vs Conductor)**  
Mitigation: projector transition validation, deterministic invalid-transition policy, and operational alerting.

**R7 — eventId instability under crash-before-registry-write**  
Mitigation: Producer EventIdRegistry durability + accept returned metadata + update registry.

**R8 — Divergent invalid-transition handling across environments**  
Mitigation: mandate a single documented projector policy (A or B) + tests.

---

## Appendix B — Golden Test Vectors (INFORMATIVE)

The vectors below are copy/paste-safe conformance fixtures for `idempotencyKey` derivation under section 3.1.

### Vector 1 (step-level)

- `runId` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a`
- `stepId` = `model.orders`
- `stepIdNormalized` = `model.orders`
- `logicalAttemptId` = `1`
- `eventType` = `StepStarted`
- `planId` = `plan_abc`
- `planVersion` = `2`
- `preimage` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|model.orders|1|StepStarted|plan_abc|2`
- `expectedSha256Hex` = `7f4b974658a54fb2aee9ecb9cefebd2eec27f3fd01f0f8c0d031dfc4a5b96e3c`

### Vector 2 (run-level)

- `runId` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a`
- `stepIdNormalized` = `RUN`
- `logicalAttemptId` = `1`
- `eventType` = `RunStarted`
- `planId` = `plan_abc`
- `planVersion` = `2`
- `preimage` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|RUN|1|RunStarted|plan_abc|2`
- `expectedSha256Hex` = `204197f81e5dc1a8491d8e411c440a730c51a741cd48a74863d3e5c4c452640d`

### Vector 3 (step-level, logicalAttemptId=2)

- `runId` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a`
- `stepId` = `model.orders`
- `stepIdNormalized` = `model.orders`
- `logicalAttemptId` = `2`
- `eventType` = `StepFailed`
- `planId` = `plan_abc`
- `planVersion` = `2`
- `preimage` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|model.orders|2|StepFailed|plan_abc|2`
- `expectedSha256Hex` = `599945c1a8023ece5d2ae5132a4397b8cfbe9fa1c4c08d6fc4193a9bd9a2ebcd`

### Vector 4 (run-level, planVersion=3)

- `runId` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a`
- `stepIdNormalized` = `RUN`
- `logicalAttemptId` = `1`
- `eventType` = `RunFailed`
- `planId` = `plan_abc`
- `planVersion` = `3`
- `preimage` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|RUN|1|RunFailed|plan_abc|3`
- `expectedSha256Hex` = `b5a178e6f30962ca3d17b573c0d4c5f96d7623be5fe62a972644785fc05a003b`

### Vector 5 (step-level, different stepId, planVersion=1)

- `runId` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a`
- `stepId` = `seed.customers`
- `stepIdNormalized` = `seed.customers`
- `logicalAttemptId` = `1`
- `eventType` = `StepSkipped`
- `planId` = `plan_abc`
- `planVersion` = `1`
- `preimage` = `0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|seed.customers|1|StepSkipped|plan_abc|1`
- `expectedSha256Hex` = `6bfdbe26d62eac0c00cf2683aae31115e76e4d33d515e39957627be091367b31`

### Machine-readable vectors (INFORMATIVE)

```json
[
  {
    "name": "vector-1-step-started",
    "runId": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a",
    "stepId": "model.orders",
    "stepIdNormalized": "model.orders",
    "logicalAttemptId": 1,
    "eventType": "StepStarted",
    "planId": "plan_abc",
    "planVersion": "2",
    "preimage": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|model.orders|1|StepStarted|plan_abc|2",
    "expectedSha256Hex": "7f4b974658a54fb2aee9ecb9cefebd2eec27f3fd01f0f8c0d031dfc4a5b96e3c"
  },
  {
    "name": "vector-2-run-started",
    "runId": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a",
    "stepIdNormalized": "RUN",
    "logicalAttemptId": 1,
    "eventType": "RunStarted",
    "planId": "plan_abc",
    "planVersion": "2",
    "preimage": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|RUN|1|RunStarted|plan_abc|2",
    "expectedSha256Hex": "204197f81e5dc1a8491d8e411c440a730c51a741cd48a74863d3e5c4c452640d"
  },
  {
    "name": "vector-3-step-failed-attempt-2",
    "runId": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a",
    "stepId": "model.orders",
    "stepIdNormalized": "model.orders",
    "logicalAttemptId": 2,
    "eventType": "StepFailed",
    "planId": "plan_abc",
    "planVersion": "2",
    "preimage": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|model.orders|2|StepFailed|plan_abc|2",
    "expectedSha256Hex": "599945c1a8023ece5d2ae5132a4397b8cfbe9fa1c4c08d6fc4193a9bd9a2ebcd"
  },
  {
    "name": "vector-4-run-failed-plan-v3",
    "runId": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a",
    "stepIdNormalized": "RUN",
    "logicalAttemptId": 1,
    "eventType": "RunFailed",
    "planId": "plan_abc",
    "planVersion": "3",
    "preimage": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|RUN|1|RunFailed|plan_abc|3",
    "expectedSha256Hex": "b5a178e6f30962ca3d17b573c0d4c5f96d7623be5fe62a972644785fc05a003b"
  },
  {
    "name": "vector-5-step-skipped-customers-v1",
    "runId": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a",
    "stepId": "seed.customers",
    "stepIdNormalized": "seed.customers",
    "logicalAttemptId": 1,
    "eventType": "StepSkipped",
    "planId": "plan_abc",
    "planVersion": "1",
    "preimage": "0d3c6a9e-4f0c-4a8e-9d5d-3d4c0f7dbb8a|seed.customers|1|StepSkipped|plan_abc|1",
    "expectedSha256Hex": "6bfdbe26d62eac0c00cf2683aae31115e76e4d33d515e39957627be091367b31"
  }
]
```

---

## References

- BCP14 (RFC 2119 / RFC 8174): <https://www.rfc-editor.org/bcp/bcp14.txt>
- RFC 3339 (timestamps): <https://www.rfc-editor.org/rfc/rfc3339>
- RFC 4122 (UUID): <https://www.rfc-editor.org/rfc/rfc4122>
- NIST FIPS 180-4 (SHA-256): <https://csrc.nist.gov/pubs/fips/180-4/final>
- AWS Builders Library (idempotency): <https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apis/>
- Temporal Cloud limits: <https://docs.temporal.io/cloud/limits>
- Temporal message passing: <https://docs.temporal.io/workflows#message-passing>
- Temporal TypeScript SDK: <https://docs.temporal.io/develop/typescript>
- Netflix Conductor wiki: <https://github.com/netflix/conductor/wiki>
- Agnostic Event Layer Strategy v2.0.1: [`AgnosticEventLayerStrategy.v2.0.1.md`](./AgnosticEventLayerStrategy.v2.0.1.md)
