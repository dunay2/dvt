# Decision & Risk Log — Contracts v2.0.0

## 1) Decisions

### D1 — Idempotency key formula

Canonical formula:

`SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planId | planVersion)`

Rationale:

- deterministic across retries,
- stable for business-level deduplication,
- explicit run-level normalization via `RUN`.

### D2 — Duplicate handling policy

Append Authority duplicates are handled as **return existing metadata** (`eventId`, `runSeq`, `persistedAt`) and **no duplicate insert**.

Rationale:

- safe retries in distributed systems,
- no producer-side race amplification,
- deterministic replay semantics.

### D3 — Time authority split

- `emittedAt`: producer clock.
- `persistedAt`: Append Authority clock (authoritative for windows/audit).

Rationale:

- decouples producer skew from query semantics,
- preserves causal producer signal while enforcing store authority.

### D4 — Engine domain scope

Event ownership includes engine runtime + adapter workers/activities.

Rationale:

- matches real distributed execution topology,
- removes ambiguity from audit ownership boundaries.

### D5 — Rollout strategy

Selected: **Option B (double read)** from migration guide.

Rationale:

- lower risk than hard cutover,
- avoids dual-write complexity,
- enables deterministic normalization during transition.

---

## 2) Risks and Mitigations

### R1 — Producer clock skew

Risk: incorrect time-window analytics if based on producer time.

Mitigation: use `persistedAt` for windows/audit; keep `emittedAt` informational.

### R2 — Partial rollout (v1/v2 mixed streams)

Risk: consumer divergence and inconsistent dedup semantics.

Mitigation: double-read compatibility window + normalization layer + explicit cutoff date.

### R3 — Canonicalization drift in key derivation

Risk: dedup misses due to field-order/encoding differences.

Mitigation: exact ordered formula, fixed delimiter (`|`), SHA-256 only, dedicated tests.

### R4 — `runSeq` concurrency contention

Risk: non-monotonic assignment under concurrent writers.

Mitigation: Append Authority as single ordering authority; transactional append contract.

### R5 — Event volume/cost growth

Risk: storage and replay costs rise with append-only retention.

Mitigation: lifecycle retention tiers + archival + replay boundaries.

### R6 — Orchestrator behavior differences (Temporal vs Conductor)

Risk: pause/cancel semantics produce diverging event sequences.

Mitigation: projector transition validation + deterministic invalid-transition policy + operational alerts.

---

## 3) References

- BCP14: <https://www.rfc-editor.org/bcp/bcp14.txt>
- RFC 3339: <https://www.rfc-editor.org/rfc/rfc3339>
- RFC 4122: <https://www.rfc-editor.org/rfc/rfc4122>
- RFC 3986: <https://www.rfc-editor.org/rfc/rfc3986>
- Temporal limits: <https://docs.temporal.io/encyclopedia/limits>
- Temporal messages: <https://docs.temporal.io/handling-messages>
- Temporal TS SDK: <https://docs.temporal.io/develop/typescript>
- Conductor wiki: <https://github.com/netflix/conductor/wiki>
- Idempotency guidance: <https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-apis/>
