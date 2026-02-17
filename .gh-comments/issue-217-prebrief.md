## Think-First Analysis

### Problem summary (facts only)

- The contracts registry tracks `IRunStateStore (domain baseline)` as pending in scope US-1.1 with tracking `#217`.
- Repository currently has a general state-store contract in [`state-store/README.md`](../docs/architecture/engine/contracts/state-store/README.md) and a v2 contract in [`state-store/IRunStateStore.v2.0.md`](../docs/architecture/engine/contracts/state-store/IRunStateStore.v2.0.md), but no explicit v1 file.

### Constraints and invariants

- Keep this slice focused on contract definition/docs only.
- Use normalized structure from [`CONTRACT_TEMPLATE.v1.md`](../docs/architecture/engine/contracts/CONTRACT_TEMPLATE.v1.md).
- Avoid changing runtime behavior or introducing breaking semantics.
- Preserve append-only, idempotency, monotonic `runSeq` invariants aligned with current contracts.

### Options considered

A) Create a new v1 contract file (`IRunStateStore.v1.md`) with minimal baseline and links to existing state-store/engine docs.

B) Reuse `state-store/README.md` as de-facto v1 and skip file creation.

C) Backport v2 content fully into v1 with broad wording parity.

### Selected option + rationale

- Selected: **A**.
- Reason: resolves discoverability and tracking gap for #217 with small, explicit normative surface.

### Alternatives rejected + why

- B rejected: registry/issue explicitly call for contract artifact, not only a generic README.
- C rejected: larger doc churn and higher drift risk for a baseline issue.

### Expected validation evidence

- Markdown lint for contracts path passes.
- Local internal-link scan for contracts path reports no broken links.

---

## Pre-implementation brief

### Suitability

- Creating [`IRunStateStore.v1.md`](../docs/architecture/engine/contracts/state-store/IRunStateStore.v1.md) is the most direct closure for #217 with low risk.

### Blockers

- No technical blockers identified.

### Opportunities

- Improve cross-version navigation between v1 and v2 state-store contracts.

### WHAT

- Add new v1 normative state-store contract file.
- Update contracts registry to include the new v1 artifact in current contracts list.

### FOR (goal)

- Establish explicit domain baseline contract for `IRunStateStore` in US-1.1 scope.

### HOW

1. Draft v1 contract from template.
2. Align invariants with existing state-store/engine normative documents.
3. Update registry row(s) for discoverability.

### WHY

- Smallest change-set that satisfies scope and keeps contract governance consistent.

### Scope touched

- `docs/architecture/engine/contracts/state-store/IRunStateStore.v1.md` (new)
- `docs/architecture/engine/contracts/README.md`

### Risk

- Low.

### Risks & Mitigation

- Risk: semantic mismatch with v2 wording.
  - Mitigation: keep v1 concise and reference v2 only as related/forward contract.
- Risk: accidental broken links in registry.
  - Mitigation: run link scan + markdown lint over contracts path.

### Impact (affected areas)

- Contract discoverability and governance.
- No runtime/CI behavior change expected.

### Validation plan

- `pnpm exec markdownlint-cli2 "docs/architecture/engine/contracts/**/*.md"`
- local broken-link scan for contracts markdown.

### Unknowns / maintainer decisions needed

- None for this implementation slice.
