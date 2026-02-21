```markdown
# ADR-0006: Contract Tooling Governance (Repository-Authoritative, Editor-Supportive)

- **Status**: Accepted
- **Date**: 2026-02-16
- **Owners**: Architecture / Engine Contracts maintainers
- **Related files**:
  - [`docs/architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1.md`](../architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1.md)
  - [`docs/architecture/engine/contracts/engine/GlossaryContract.v1.md`](../architecture/engine/contracts/engine/GlossaryContract.v1.md)
  - [`scripts/validate-contracts.cjs`](../../scripts/validate-contracts.cjs)
  - [`.github/workflows/contracts.yml`](../../.github/workflows/contracts.yml)

---

## Context

Contract documentation quality currently depends on a mix of manual review and partial automation.

Main risk areas:

1. Terminology drift vs canonical glossary terms.
2. Broken or version-mismatched cross-contract references.
3. Weak enforcement of idempotency correctness evidence.
4. Inconsistent contributor workflows between local editor and CI.

The team needs a scalable policy that preserves velocity while enforcing normative consistency.

---

## Decision

Adopt a **hybrid tooling model** with strict enforcement in repository/CI and optional editor productivity support.

### 1) Authoritative validation layer (MUST)

Repository scripts + CI workflows are the source of truth for merge quality.

- Blocking validations are executed through npm/pnpm scripts and CI gates.
- Editor extensions are non-blocking and cannot replace CI checks.

### 2) Validation roadmap (phased)

The following validator set is approved for implementation:

- `validate-glossary-usage`
- `validate-idempotency-vectors`
- `validate-references`
- `validate-rfc2119`
- executable examples validation
- contract index generation (governance support)

Severity progression follows warning-first rollout, then critical validations become blocking.

### 3) ADR coupling for semantic changes

Contract semantic changes MUST include an ADR in `docs/decisions/` once the ADR gate is hardened in CI.

---

## Consequences

### Positive

- Single authoritative quality gate model (local + CI parity).
- Better traceability from contract changes to governance decisions.
- Reduced drift in terminology, references, and normative language.

### Trade-offs

- Initial implementation overhead for validators and CI wiring.
- Temporary warning noise during phased adoption.

---

## Acceptance Criteria

1. Proposal baseline is documented in [`CONTRACT_TOOLING_PROPOSAL.v1.md`](../architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1.md).
2. Contributor workflow is documented in [`docs/CONTRIBUTING.md`](../CONTRIBUTING.md).
3. One GitHub issue exists per approved validator implementation stream.
4. CI integration path is explicitly tracked in workflow backlog.

---

## References

- [`docs/architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1.md`](../architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1.md)
- [`docs/architecture/engine/contracts/engine/RunEvents.v1.md`](../architecture/engine/contracts/engine/RunEvents.v1.md)
- [`docs/architecture/engine/contracts/engine/GlossaryContract.v1.md`](../architecture/engine/contracts/engine/GlossaryContract.v1.md)
- [RFC 2119](https://datatracker.ietf.org/doc/html/rfc2119)
- [RFC 8174](https://datatracker.ietf.org/doc/html/rfc8174)
```
