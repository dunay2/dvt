# Migration Guide: v1.1.1 → v2.0.0

**Status**: Normative migration companion  
**Audience**: Engine runtime maintainers, adapter maintainers, StateStore implementers, projector maintainers

---

## 1) Scope

This guide defines migration impacts between:

- v1.1.1 contract family (`IWorkflowEngine.v1.1.md`, `ExecutionSemantics.v1.md`, `RunEvents.v1.1.md`), and
- v2.0.0 contract family (`IWorkflowEngine.v2.0.md`, `ExecutionSemantics.v2.0.md`, `RunEvents.v2.0.md`, `IRunStateStore.v2.0.md`, `GlossaryContract.v2.0.md`).

---

## 2) Breaking Changes Matrix

| Area                        | v1.1.1                                             | v2.0.0 (normative)                                                                 | Runtime impact                                                  |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Envelope timestamps         | Partial ambiguity across docs                      | `emittedAt` = producer time; `persistedAt` = Append Authority time (authoritative) | adapt query semantics and audit windows to `persistedAt`        |
| Idempotency formula         | `SHA256(... \| eventType \| planVersion)`          | `SHA256(... \| eventType \| planId \| planVersion)`                                | emitters and validators must regenerate key derivation          |
| Duplicate handling          | `reject OR return existing` allowed                | return existing metadata only                                                      | adapters must stop rejecting duplicate idempotency writes       |
| `eventId` field             | not consistently required                          | REQUIRED in `RunEventWrite` and `RunEventRecord`                                   | producers and stores must generate/persist/return `eventId`     |
| StateStore write/read split | mixed expectations in some docs                    | strict `RunEventWrite` input vs `RunEventRecord` output                            | API and persistence model must split write and persisted shapes |
| Attempt typing/requiredness | mixed optional/string references in ecosystem docs | `logicalAttemptId` + `engineAttemptId` are REQUIRED numbers                        | normalize parsers and schemas to required numeric attempts      |
| Attempt fallback            | implicit in some implementations                   | if provider lacks attempt API: `engineAttemptId = 1`; no artificial increments     | standardize fallback logic in all adapters/workers              |
| Scope wording               | “Engine” may be interpreted narrowly               | “Engine domain” = runtime + adapter-owned workers/activities                       | clarifies ownership and auditing boundaries                     |

---

## 3) Migration Steps

1. Update producer schemas to `RunEventWrite` v2.0.0 (include `eventId`, plan identifiers, numeric attempts).
2. Update Append Authority to enforce duplicate return-existing-only semantics.
3. Update read path to expose `RunEventRecord` with `persistedAt` and `runSeq`.
4. Update idempotency key derivation logic to include `planId`.
5. Update projector and audit query policies to use `persistedAt` for time windows.
6. Freeze v1.1.1 docs as read-only references.

---

## 4) Compatibility Policy

- v1.1.1 and v2.0.0 are not wire-compatible by default.
- Chosen rollout strategy: **Option B (double read)**.

### 4.1 Rollout Strategy (Chosen)

**Option B: double read (normative migration policy for this release)**

1. Producers migrate to v2 write-shape first.
2. Consumers/projectors accept both v1 and v2 envelopes during transition window.
3. Compatibility layer normalizes v1 records to v2 internal shape (`eventId`, `planId`, `planVersion`, `persistedAt` handling).
4. After migration window, v1 ingestion path is disabled.

### 4.2 Why Option B

- Reduces rollback risk compared with hard cutover.
- Avoids mandatory dual-write storage semantics.
- Preserves deterministic projector behavior while old producers are drained.

### 4.3 Risks and Mitigations

- **Risk**: mixed streams produce inconsistent idempotency behavior.  
  **Mitigation**: normalize v1 keys before projector apply and alert on non-canonical formulas.
- **Risk**: timestamp ambiguity in old records.  
  **Mitigation**: use `persistedAt` when present; for v1 historical records, document fallback policy.
- **Risk**: prolonged compatibility mode.  
  **Mitigation**: set explicit migration deadline and disable v1 ingestion after cutoff.

---

## 5) Cross-Contract Mapping

- [RunEvents.v2.0.md](./engine/RunEvents.v2.0.md)
- [ExecutionSemantics.v2.0.md](./engine/ExecutionSemantics.v2.0.md)
- [IRunStateStore.v2.0.md](./state-store/IRunStateStore.v2.0.md)
- [IWorkflowEngine.v2.0.md](./engine/IWorkflowEngine.v2.0.md)
- [GlossaryContract.v2.0.md](./engine/GlossaryContract.v2.0.md)
