# Issue #227 Playbook Draft (Local)

Status: Local draft prepared before publishing to GitHub comments.

---

## Template A — Pre-implementation brief

### Suitability

- Issue #227 is a strong fit for a deterministic static validator in [`scripts/validate-idempotency-vectors.cjs`](scripts/validate-idempotency-vectors.cjs).
- The canonical formula is already documented in [`RunEvents.v1.md`](docs/architecture/engine/contracts/engine/RunEvents.v1.md), so vectors can be validated as executable contract fixtures.

### Blockers

- No implementation blockers identified.
- Initial risk is digest mismatch noise if fixture vectors are not generated with exact canonical field order.

### Opportunities

- Add a blocking correctness gate for idempotency materialization without changing runtime code paths.
- Reuse deterministic output style established by existing validators for easier CI triage.

### WHAT

- Add idempotency vectors validator.
- Add baseline vectors file for RunEvents v1.
- Integrate validator as blocking step in contracts workflow.
- Document script behavior, formula versions, and usage.

### FOR (goal)

- Prevent contract drift in idempotency digest composition.
- Guarantee reproducible hash vectors across environments and contributors.

### HOW

- Scan `*.idempotency_vectors.json` artifacts in engine contracts.
- Validate required fields, canonical `RUN` token rules, and delimiter guards.
- Recompute SHA-256 digests using canonical formula material.
- Compare computed digest against expected vectors and fail on mismatch.

### WHY

- Idempotency correctness is a P0 invariant for state consistency and replay safety.
- Static vector checks provide cheap, deterministic safety before runtime integration testing.

### Scope touched

- [`scripts/validate-idempotency-vectors.cjs`](scripts/validate-idempotency-vectors.cjs)
- [`docs/architecture/engine/contracts/engine/RunEvents.v1.idempotency_vectors.json`](docs/architecture/engine/contracts/engine/RunEvents.v1.idempotency_vectors.json)
- [`package.json`](package.json)
- [`.github/workflows/contracts.yml`](.github/workflows/contracts.yml)
- [`scripts/README.md`](scripts/README.md)

### Risk

- Classification: Low.
- Main risk: false negatives if vectors omit required fields or use an inconsistent formula version.

### Risks & Mitigation

- Mitigation: enforce required field checks and strict digest format (`[a-f0-9]{64}`).
- Mitigation: include formula-version branching (`v1`, `v2.0.1`) with explicit guards.
- Mitigation: make workflow step blocking to catch drift early.

### Impact (affected areas)

- Contracts CI gains an additional correctness gate.
- No runtime behavior changed in engine or adapters.

### Validation plan

- Run `pnpm contracts:idempotency:validate` and confirm status `OK`.
- Run formatting/lint checks for touched files.
- Confirm `contracts.yml` path filters and step integration are correct.

### Unknowns / maintainer decisions needed

- Decision on when to add additional vector suites for v2 contracts.

---

## Template B — Final issue close summary (draft)

### Suitability outcome

- Deterministic vector validation solved the issue with minimal footprint and strong CI enforcement.

### Blockers encountered

- No blockers in implementation; only fixture correctness verification required.

### Opportunities identified

- Extend vector artifacts to additional contracts and include negative test fixtures in a future issue.

### WHAT changed

- Added idempotency validator in [`scripts/validate-idempotency-vectors.cjs`](scripts/validate-idempotency-vectors.cjs).
- Added baseline vectors in [`RunEvents.v1.idempotency_vectors.json`](docs/architecture/engine/contracts/engine/RunEvents.v1.idempotency_vectors.json).
- Added npm script [`contracts:idempotency:validate`](package.json:52).
- Added blocking CI step in [`contract-validate`](.github/workflows/contracts.yml:391).
- Updated usage docs in [`scripts/README.md`](scripts/README.md).

### WHY this approach

- Captures idempotency formula regressions as static CI failures with deterministic diagnostics.

### Acceptance criteria mapping

- [x] Validate required idempotency vector fields.
- [x] Validate canonical `RUN` token for run-scope vectors.
- [x] Validate delimiter guard constraints.
- [x] Recompute and verify SHA-256 digest equality.
- [x] Integrate as a blocking contracts CI step.

### Validation evidence

- `pnpm contracts:idempotency:validate` passes with `status=OK`.
- Formatting and lint checks pass for modified files.

### Rollback note

- Revert touched files listed in scope section to remove validator and CI gate.

### Residual scope (if any)

- Add broader vectors covering additional event-type edge cases and v2 artifacts.
