# Playbook Next Steps — Planner / Engine / State Alignment

- Version: `v0.1-draft`
- Status: `proposed`
- Date (UTC): `2026-02-21`
- Scope: `Planner → Engine → State contract hardening and decoupling`
- Basis: `AI Issue Resolution Playbook v1.6.2`

## 1) Think-First Analysis

### Problem summary (facts only)

- Planner/Engine/State separation is conceptually clear but partially fragile at runtime boundaries.
- Contract shape and capabilities are not fully governed by automated compatibility gates.
- Recent fixes restored test integrity and idempotency consistency, but structural governance remains pending.

### Constraints and invariants

- Keep deterministic semantics in engine/adapters.
- Preserve compatibility unless explicitly version-bumped.
- Keep ownership semantics aligned with ADR decisions (Engine emits `RunQueued`; adapters own `RunStarted`).
- Avoid broad refactors in a single iteration.

### Options considered

- **Option A — Full redesign now**
  - Rewrite Planner/Engine boundaries and contracts in one large PR.
- **Option B — Incremental contract-first hardening (selected)**
  - Stabilize contract metadata + capability gating + compatibility tests in small PRs.
- **Option C — Docs-only clarification**
  - Update docs and postpone code/test governance.

### Selected option and rationale

- **Selected: Option B**.
- Reason: smallest-risk path to reduce coupling while preserving delivery velocity and rollback safety.

### Alternatives rejected

- **A rejected**: too risky, high regression surface, poor rollback granularity.
- **C rejected**: does not reduce runtime/compatibility risk.

### Expected validation evidence

- Target package tests green for engine and temporal adapter.
- Contract compatibility checks introduced and enforced in CI.
- Explicit WHAT/WHY traceability in issue/PR comments.

---

## 2) Pre-implementation brief

### Suitability

- This plan is suitable because it addresses the highest-risk coupling points first (contract/version/capabilities), then runtime decoupling.

### Blockers

- Missing automated compatibility gate for Planner→Engine contract evolution.
- Potential ambiguity on business-rule ownership for runtime decisions (retry/backpressure/cost heuristics).

### Opportunities

- Add explicit provenance fields in plan metadata.
- Improve discoverability with a single compatibility matrix report artifact.

### WHAT

- Introduce incremental corrections for contract governance and runtime responsibility boundaries.

### FOR (goal)

- Ensure Planner/Engine/State separation is robust at runtime and enforceable by CI.

### HOW

- Execute 5 PRs in sequence with isolated risk and explicit validation gates.

### WHY

- Contract-first governance reduces hidden coupling and prevents silent breakage across adapters.

### Scope touched

- In scope: `packages/@dvt/engine`, `packages/@dvt/contracts`, `packages/@dvt/adapter-temporal`, CI workflows, architecture docs.
- Out of scope: frontend feature work, unrelated refactors, non-contract runtime optimization not tied to separation risks.

### Risk classification

- **High** (cross-package contract and runtime semantics).

### Risks and mitigation

- Risk: accidental breaking change in plan schema.
  - Mitigation: versioned contract checks + compatibility tests.
- Risk: ownership drift between engine and adapters.
  - Mitigation: ADR-aligned assertions and tests around lifecycle events.

### Validation plan

- Package tests: engine + temporal adapter.
- Contract compatibility matrix tests.
- CI gates for contract drift and path-based impact.

### Unknowns / decisions needed

- Final policy for capability lifecycle (`experimental/stable/deprecated`) enforcement at runtime.
- Required backward-compatibility window for Planner-generated plans.

---

## 3) Execution plan (incremental PRs)

## PR-1 — Documentation and policy alignment

### WHAT

- Align gap docs with ADR ownership semantics and current implementation reality.

### WHY

- Remove contradictory guidance before further implementation.

### Expected files

- `packages/@dvt/engine/docs/GAPS_AND_FIXES.md`
- `docs/decisions/ADR-0011-run-started-ownership.md` (reference-only updates if needed)

### Validation

- Markdown lint + reviewer verification of semantic consistency.

## PR-2 — Contract hardening for Planner → Engine

### WHAT

- Extend and formalize `ExecutionPlan` metadata (`contractVersion`, `plannerVersion`, `plannerGitSha`, `generatedAt`, `requiresCapabilities`).

### WHY

- Prevent hidden coupling by making provenance and compatibility explicit.

### Expected files

- `packages/@dvt/engine/src/contracts/executionPlan.ts`
- `packages/@dvt/contracts/src/*` (if shared promotion is required)
- Contract tests under `packages/@dvt/engine/test/contracts/*`

### Validation

- Contract tests + targeted build/test in affected packages.

## PR-3 — Capability gating and compatibility matrix

### WHAT

- Enforce runtime capability checks against adapter matrix and emit explicit validation report.

### WHY

- Ensure plans cannot request unsupported features silently.

### Expected files

- `docs/architecture/engine/contracts/capabilities/adapters.capabilities.json`
- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- CI workflow files for compatibility gate

### Validation

- Positive/negative tests for required capabilities.

## PR-4 — Runtime decoupling cleanup

### WHAT

- Move operational decisions out of plan payload where they are runtime concerns; keep plan declarative.

### WHY

- Reduce Planner↔Engine operational coupling.

### Expected files

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- Adapter workflow tests

### Validation

- Determinism and integration tests remain green.

## PR-5 — CI governance and migration safeguards

### WHAT

- Add automated breaking-change policy checks and migration-note requirement.

### WHY

- Make contract stability enforceable, not aspirational.

### Expected files

- `.github/workflows/*`
- `docs/architecture/engine/VERSIONING.md`
- `docs/CONTRACTS_AUTOMATION_INDEX.md`

### Validation

- CI fails on incompatible contract changes without version/migration updates.

---

## 4) Quality gates checklist (must pass)

- [ ] Acceptance criteria checked per PR.
- [ ] WHAT/WHY documented in PR/issue comments.
- [ ] Determinism-sensitive tests pass.
- [ ] Contract compatibility checks pass.
- [ ] No untracked business-rule ambiguity remains.
- [ ] Technical debt register reviewed (`no new debt` or explicit entries).

---

## 5) Final expected outcome

- Planner/Engine/State separation remains conceptually clear **and** operationally enforceable.
- Contract drift becomes detectable in CI before merge.
- Adapter/runtime-specific behavior no longer leaks silently into planner contract assumptions.
