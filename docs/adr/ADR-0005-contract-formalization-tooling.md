```markdown
# ADR-0005: Contract Formalization Tooling

- **Status**: Accepted
- **Date**: 2026-02-16
- **Owners**: Architecture / Developer Experience
- **Related files**:
  - [`ADR-0003-execution-model.md`](./ADR-0003-execution-model.md)
  - [`ADR-0004-event-sourcing-strategy.md`](./ADR-0004-event-sourcing-strategy.md)
  - [`RunEvents.v2.0.md`](../architecture/engine/contracts/engine/RunEvents.v2.0.md)
  - [`RunEventRecord.v2.0.schema.json`](../architecture/engine/contracts/engine/events/RunEventRecord.v2.0.schema.json)
  - [`RunEventWrite.v2.0.schema.json`](../architecture/engine/contracts/engine/events/RunEventWrite.v2.0.schema.json)

---

## Context

Repeated ambiguity appeared while refining execution contracts. Root causes included weak formalization around:

- event invariants,
- idempotency derivation,
- transition validation,
- schema enforcement,
- deterministic conformance tests.

Markdown-only contracts were insufficient to prevent semantic drift.

---

## Decision

Adopt a formal contract toolchain where contracts are documentation **and** executable validation assets.

### 1) JSON Schema as normative shape

Each event contract MUST include versioned machine-readable schema definitions.

### 2) Runtime validation layer

TypeScript runtime boundaries MUST validate payloads/envelopes using validators aligned to schemas (e.g., Zod).

### 3) Conformance kit

Each contract MUST ship executable fixtures:

- positive vectors,
- negative vectors,
- invalid transition scenarios,
- deterministic idempotency vectors.

### 4) Property-based validation

Property-based testing SHOULD fuzz idempotency and transition behavior to catch edge-case drift.

### 5) CI enforcement gate

Contract PRs MUST pass schema validation, vector checks, and negative-path expectations before merge.

### 6) Version discipline

Breaking semantic changes (idempotency formula, required fields, transition model) require MAJOR version bump.

---

## Consequences

### Positive

- Contracts become executable and testable.
- Semantic drift is reduced.
- Cross-language consistency improves through vectors.

### Trade-offs

- Higher CI/tooling overhead.
- Learning curve for formal tooling.
- Higher upfront definition effort.

---

## Acceptance Criteria

1. Versioned schemas exist for core event contracts.
2. Runtime validator coverage exists at adapter boundaries.
3. Conformance vectors are validated in CI.
4. Versioning policy reflects semantic compatibility rules.

---

## References

- JSON Schema: <https://json-schema.org/>
- Zod: <https://zod.dev/>
- fast-check: <https://fast-check.dev/>
```
