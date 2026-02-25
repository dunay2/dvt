# Glossary Contract (Normative v2.0.0)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 2.0.0  
**Stability**: Contracts — breaking changes require major version bump  
**Consumers**: Engine, adapters, planner, state store, UI, contract authors  
**Related Contracts**: [IWorkflowEngine.v2.0.md](./IWorkflowEngine.v2.0.md), [ExecutionSemantics.v2.0.md](./ExecutionSemantics.v2.0.md), [RunEvents.v2.0.md](./RunEvents.v2.0.md)

---

## 1) Canonical Terms

| Term                 | Canonical meaning                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| **Run Event**        | Append-only lifecycle event emitted by engine domain and persisted by Append Authority.        |
| **Event Envelope**   | Canonical metadata for event identity, ordering, correlation, attempts, and time fields.       |
| **Append Authority** | StateStore component assigning `runSeq`, enforcing idempotency and persistence-time authority. |
| **eventId**          | Canonical event identity field (UUID v4), REQUIRED in write and record shapes.                 |
| **logicalAttemptId** | Business retry counter, starts at 1, drives idempotency.                                       |
| **engineAttemptId**  | Infrastructure retry/restart counter; required for diagnostics, excluded from idempotency.     |

---

## 2) Timestamp Vocabulary (Normative)

- `emittedAt`: producer time (engine runtime / worker clock)
- `persistedAt`: append authority time (StateStore commit clock; authoritative for time windows)

Envelope-level `occurredAt` is not canonical in v2.0.0.
If needed, source-time SHOULD be represented in event payload (for example `sourceOccurredAt`).

---

## 3) Idempotency Vocabulary (Normative)

Canonical formula:

```text
SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planId | planVersion)
```

Normalization:

- step-level events: `stepIdNormalized = stepId`
- run-level events: `stepIdNormalized = 'RUN'`

Collision behavior:

- duplicate key MUST return existing metadata,
- MUST NOT create duplicate rows,
- reject-on-duplicate is non-canonical in v2.0.0.

---

## 4) Attempt Vocabulary (Normative)

- `logicalAttemptId` MUST start at `1`.
- `engineAttemptId` MUST be present.
- If provider runtime does not expose attempts, producer MUST set `engineAttemptId = 1`.
- Producers MUST NOT increment `engineAttemptId` artificially.

---

## 5) Canonical Envelope Minimum

Canonical persisted event envelopes MUST include:

- Correlation: `tenantId`, `projectId`, `environmentId`, `runId`
- Identity and order: `eventId`, `eventType`, `runSeq`, `idempotencyKey`
- Attempts: `logicalAttemptId`, `engineAttemptId`
- Time: `emittedAt`, `persistedAt`
- Plan identity: `planId`, `planVersion`

---

## 6) References

- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339)
- [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122)
- [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119)

---

## 7) Change Log

- **2.0.0 (2026-02-16)**: **MAJOR** — canonicalized `eventId` as required envelope field; fixed timestamp vocabulary (`emittedAt` producer / `persistedAt` append authority); removed envelope `occurredAt` from canonical terminology; aligned idempotency formula with `planId + planVersion`; formalized non-reject duplicate handling semantics.
