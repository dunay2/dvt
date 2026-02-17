## Think-First Analysis

### Problem summary (facts only)

- Issue [#218](https://github.com/dunay2/dvt/issues/218) requires defining `IProviderAdapter v0.1` as a base domain contract.
- The repository already contains a TypeScript interface at [`packages/engine/src/adapters/IProviderAdapter.ts`](../packages/engine/src/adapters/IProviderAdapter.ts), but there is no dedicated normative contract markdown for this boundary in `docs/architecture/engine/contracts`.
- The contracts registry in [`docs/architecture/engine/contracts/README.md`](../docs/architecture/engine/contracts/README.md) does not yet list `IProviderAdapter` as a current artifact.

### Constraints and invariants

- Scope is docs/contracts only for this issue slice.
- Keep interface aligned with existing contract types (`PlanRef`, `RunContext`, `EngineRunRef`, `RunStatusSnapshot`, `SignalRequest`).
- Avoid changing runtime behavior or provider selection mechanics.
- Preserve existing provider boundary expectations (`startRun`, `cancelRun`, `getRunStatus`, `signal`).

### Options considered

A) Create a normative markdown contract for `IProviderAdapter v0.1` under `docs/architecture/engine/contracts/engine`.

B) Document it only inside `packages/engine` source comments.

C) Wait for v2 contracts and skip v0.1 doc creation.

### Selected option + rationale

- Selected: **A**.
- Rationale: closes issue acceptance directly, improves discoverability/governance, and keeps parity with other domain contracts.

### Alternatives rejected + why

- B rejected: not sufficient for contractual governance and cross-team discoverability.
- C rejected: issue explicitly asks for v0.1 baseline now.

### Expected validation evidence

- Contracts markdown lint passes.
- Contracts internal-link scan passes.

---

## Pre-implementation brief

### Suitability

- Adding `IProviderAdapter.v1.md` as normative DRAFT is the minimal and correct step for #218.

### Blockers

- No blockers identified.

### Opportunities

- Improve linkage between adapter contract and provider-selection logic documentation.

### WHAT

- Create new normative contract document for `IProviderAdapter`.
- Add it to contracts registry table.

### FOR (goal)

- Define minimal provider boundary, capabilities, responsibilities, error rules, and traceability for US-1.1.

### HOW

1. Draft contract using template structure.
2. Align method signatures and responsibilities with existing TS interface and stubs.
3. Update registry and validate markdown + links.

### WHY

- Smallest safe change-set that satisfies issue acceptance criteria.

### Scope touched

- `docs/architecture/engine/contracts/engine/IProviderAdapter.v1.md` (new)
- `docs/architecture/engine/contracts/README.md`
- `.gh-comments/issue-218-prebrief.md` (traceability)

### Risk

- Low.

### Risks & Mitigation

- Risk: semantic mismatch with existing engine interface expectations.
  - Mitigation: source interface alignment against [`IProviderAdapter.ts`](../packages/engine/src/adapters/IProviderAdapter.ts).
- Risk: reference/link drift.
  - Mitigation: run contracts link scan and markdown lint.

### Impact (affected areas)

- Contract docs discoverability and implementation guidance.
- No runtime behavior impact.

### Validation plan

- `pnpm exec markdownlint-cli2 "docs/architecture/engine/contracts/**/*.md"`
- Local contracts broken-link scan.

### Unknowns / maintainer decisions needed

- None for this v0.1 baseline slice.
