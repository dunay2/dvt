---
slice: 20260423-engine-capability-validation-fail-closed
date: 2026-04-23
last_reviewed: 2026-04-23
work_item: fix(engine)
status: Done
author: AI (Codex)
---

# Closeout: Engine capability validation fail-closed

## Think-First Analysis

### Problem summary

`StoredPlanExecutabilityValidator` in `apps/api` already rejects plans that
require capabilities when the target adapter does not implement
`capabilities()`, but `StartRunValidationPolicy` in `@dvt/engine` currently
accepts that same case.

### Root cause

The API-side stored-plan validator and the engine-side admission validator
encode similar capability checks independently. The API path was hardened to
fail closed for undeclared adapter capabilities, while the engine path kept the
older graceful-degradation behavior and returns early when `adapter.capabilities`
is absent.

### Constraints and invariants

- `AGENTS.md` requires root-cause fixes, no hidden debt, and real validation.
- `docs/guides/ai-work-protocol.md` requires think-first analysis, a
  pre-implementation brief, negative-path coverage, and a mandatory closeout.
- `docs/adr/ADR-0003-execution-model.md` keeps execution admission semantics in
  the engine rather than in provider adapters.
- `docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md` requires
  adapters to be treated as state-equivalent runtime implementations behind the
  engine boundary, which means admission guarantees cannot diverge by caller
  path.
- `docs/planning/reviews/architecture-and-governance/20260423-dvt-plus-system-architecture-review.md`
  explicitly calls this drift out as a P0 architecture defect.

### Options considered

1. Fix docs only and leave engine fail-open.
   - Rejected: the review finding is behavioral, not editorial.

2. Move capability validation fully out of engine and rely only on API.
   - Rejected: direct engine callers would still bypass the fail-closed rule,
     which contradicts engine-owned admission.

3. Change `StartRunValidationPolicy` to reject undeclared adapter capabilities,
   add regression coverage, and update the contract comment/docs that still
   describe graceful degradation.
   - Selected: smallest change that removes the semantic split without widening
     the engine surface.

### Selected option and rationale

Keep capability validation in both admission paths but make them agree on the
fail-closed rule: if `requiresCapabilities` is non-empty and the adapter omits
`capabilities()`, engine admission must reject rather than proceed.

### Rejected alternatives

- Introducing a transitional compatibility flag for adapters.
  - Rejected: the user explicitly asked for no legacy/migration posture.
- Leaving the old test and adding a second warning-only test.
  - Rejected: that would preserve the invalid fail-open contract in the active
    tree.

## Pre-Implementation Brief

- **Mode**: Slim
- **Scope**:
  - replace the engine's undeclared-capabilities fail-open branch with a
    fail-closed rejection
  - add regression coverage for the engine path
  - update the active contract comment/docs that still describe skipping
    capability validation when `capabilities()` is absent
- **Touched files or paths**:
  - `packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts`
  - `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts`
  - `packages/@dvt/engine/src/adapters/IProviderAdapter.ts`
  - `docs/architecture/components/engine/contracts/engine/index.md`
  - `docs/planning/reviews/architecture-and-governance/20260423-dvt-plus-system-architecture-review.md`
  - this closeout file
- **Expected outcome**:
  - engine admission rejects undeclared adapter capabilities whenever the plan
    requires capabilities
  - active engine docs/tests stop claiming graceful degradation for that case
- **Risks and mitigations**:
  - Risk: some tests or docs still encode the old fail-open rule.
    Mitigation: search active docs/tests for the exact graceful-degradation
    wording and update them in the same slice.
  - Risk: direct API-to-engine callers might surface a different rejection shape
    than the stored-plan validator.
    Mitigation: keep the change focused on validator semantics and verify the
    negative path explicitly in engine tests.
- **Out-of-scope items**:
  - broader start-run error translation redesign
  - runtime capability matrix expansion
  - planner-side capability derivation changes
- **Validation plan**:
  - targeted red-green run for
    `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts`
  - `pnpm --filter dvt-api test -- test/application/services/StoredPlanExecutabilityValidator.test.ts`
  - `pnpm --filter @dvt/engine test`
  - `pnpm --filter @dvt/engine typecheck`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- **Test coverage plan**:
  - prove the negative path where `requiresCapabilities` is non-empty and
    `adapter.capabilities()` is absent
  - keep the existing positive-path capability tests green
- **Libraries evaluated**:
  - None evaluated; this is an engine admission policy correction.

## Implementation Log

- Replaced the fail-open branch in
  `StartRunValidationPolicy.validateCapabilitiesOrThrow()` so the engine now
  rejects when `requiresCapabilities` is non-empty and the target adapter omits
  `capabilities()`.
- Flipped the engine contract regression in
  `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts` from
  graceful-degradation acceptance to fail-closed rejection.
- Updated the source-level `IProviderAdapter` contract comment so it no longer
  claims that omitting `capabilities()` skips admission checks.
- Recorded the behavior correction in the active engine contract index and in
  the 2026-04-23 architecture review update note.
- Kept
  `docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md`
  untouched in the final diff because changed-file docs governance rejects
  modified non-kebab-case filenames; the active clarification lives in the
  kebab-safe contract index instead.

## Validation Evidence

- `pnpm --filter @dvt/engine test -- test/contracts/capabilities.contract.test.ts`
  - red: failed because engine resolved the run instead of rejecting when the
    adapter omitted `capabilities()`
  - green: passed with `13/13` tests after the policy change
- `pnpm --filter dvt-api test -- test/application/services/StoredPlanExecutabilityValidator.test.ts`
  - passed with `10/10` tests, preserving the existing API-side fail-closed
    validator behavior
- `pnpm --filter @dvt/engine test`
  - passed with `42/42` files and `369/369` tests green
- `pnpm --filter @dvt/engine typecheck`
  - passed
- `pnpm docs:sync`
  - passed
- `pnpm verify:prepush`
  - first run failed on changed-file docs governance because
    `IProviderAdapter.v1.md` is a non-kebab-case versioned filename
  - second run passed after moving the active clarification into
    `docs/architecture/components/engine/contracts/engine/index.md`

## No-Debt / No-Stub Evidence

- No hooks were bypassed.
- No quality gate was relaxed or disabled.
- No stub, placeholder, or fake implementation was introduced.
- No migration, compatibility alias, or legacy fallback was added; the engine
  path now rejects the previously fail-open case directly.
