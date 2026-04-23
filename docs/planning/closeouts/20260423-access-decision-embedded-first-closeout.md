---
slice: 20260423-access-decision-embedded-first
date: 2026-04-23
last_reviewed: 2026-04-23
work_item: fix(api)
status: Done
author: AI (Codex)
---

# Closeout: Access decision embedded-first hard cut

## Think-First Analysis

### Problem summary

`apps/api` still owned active authorization policy evaluation through the split
between `principal_grants` storage and `TenantHierarchyAuthorizationPolicy`,
while the desired target state was one DVT-owned access-decision contract with
no policy leakage into route or use-case code.

### Root cause

The current protected-runtime authorization path coupled three concerns into one
app-local stack:

- grant persistence in Postgres through `principal_grants`
- hierarchy policy evaluation in process
- route/use-case authorization through those implementation details

That coupling meant the application layer depended on local policy mechanics
instead of an explicit DVT-owned access decision boundary.

### Constraints and invariants

- `AGENTS.md` requires doc-driven design first, root-cause fixes, no hidden
  debt, and full touched-scope validation.
- `docs/guides/ai-work-protocol.md` requires a Full-mode workflow for new
  contract and external-boundary changes, including negative-path coverage and
  a mandatory closeout.
- `docs/adr/ADR-0003-execution-model.md` keeps execution lifecycle authority in
  DVT rather than in external providers.
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
  requires explicit boundary contracts instead of cross-context implementation
  leakage.
- `docs/architecture/components/engine/security/SECURITY_INVARIANTS.v1.md`
  keeps the API boundary as the policy enforcement point while leaving runtime
  scope integrity in engine-owned concerns.
- `docs/adr/ADR-0051-access-decision-service-and-openfga-adapter.md` now fixes
  the target state for this slice as embedded-first behind one pluggable
  DVT-owned `IAccessDecisionService`.

### Options considered

1. Keep the local Postgres grant repository and hierarchy policy split.
   - Rejected: preserves the same scattered application-owned policy engine.

2. Jump directly to a remote OpenFGA dependency.
   - Rejected: introduces another network dependency in the protected request
     path before the boundary itself is stable.

3. Introduce a DVT-owned access-decision contract in `apps/api`, implement the
   first backend as an embedded service, remove the old repository-plus-policy
   split, and keep the backend swappable later.
   - Selected: produces the clean boundary now without forcing a remote PDP in
     the first cut.

### Selected option and rationale

Make `AuthorizeCommandScopeService` depend only on
`IAccessDecisionService`, implement that port with
`EmbeddedAccessDecisionService`, keep token assertion conflicts as
DVT-owned behavior, and remove the old `PostgresPrincipalAccessRepository` plus
`TenantHierarchyAuthorizationPolicy` split from the protected runtime.

### Rejected alternatives

- Shadow mode, dual-write, or fallback to the old stack.
  - Rejected: the user explicitly asked for a hard cut with no compatibility
    posture.
- Direct vendor SDK/HTTP use in application code.
  - Rejected: future external PDPs must remain behind the same contract.

## Pre-Implementation Brief

- **Mode**: Full
- **Scope**:
  - define a DVT-owned access-decision application port
  - replace the protected-runtime local policy split with an embedded first
    backend
  - remove `PostgresPrincipalAccessRepository` and
    `TenantHierarchyAuthorizationPolicy` from the active runtime wiring
  - align the protected-runtime builder tests, app startup tests, and active
    API/architecture docs
- **Touched files or paths**:
  - `apps/api/src/application/ports/auth.ts`
  - `apps/api/src/application/ports/accessDecision.ts`
  - `apps/api/src/application/services/authorizeCommandScopeService.ts`
  - `apps/api/src/domain/auth/types.ts`
  - `apps/api/src/infrastructure/auth/embeddedAccessDecisionService.ts`
  - `apps/api/src/modules/protectedRuntime/buildProtectedSecurityRuntime.ts`
  - `apps/api/src/modules/buildProtectedRuntimeModule.ts`
  - `apps/api/test/application/services/authorizeCommandScopeService.test.ts`
  - `apps/api/test/infrastructure/auth/embeddedAccessDecisionService.test.ts`
  - `apps/api/test/modules/protectedRuntimeDependencyBuilders.cases.ts`
  - `apps/api/test/modules/modulesArchitectureSource.support.ts`
  - `apps/api/test/app.test.ts`
  - `apps/api/docs/protected-runtime-dependency-builders-component.md`
  - `docs/adr/index.md`
  - `docs/architecture/components/api/api-current-to-target-architecture.md`
  - `docs/planning/reviews/architecture-and-governance/20260423-dvt-plus-system-architecture-review.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `docs/planning/state/agent-lane-c.md`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/planning/status/generated-code-state.md`
  - this closeout file
- **Expected outcome**:
  - protected runtime authorizes through one DVT-owned access-decision contract
  - the old repository-plus-policy split is gone from active runtime wiring
  - the first backend stays embedded, while later external PDPs remain backend
    swaps rather than API rewrites
- **Risks and mitigations**:
  - Risk: tests and docs still encode the removed repository and policy names.
    Mitigation: write the failing tests first for builder wiring and startup
    migration hooks, then update the docs in the same slice.
  - Risk: architecture tests report false negatives because the owned-concern
    docblock helper assumes LF-only source files.
    Mitigation: harden the test helper to accept both LF and CRLF so the
    assertions reflect real architecture rather than line-ending format.
  - Risk: later externalization might re-leak vendor shapes into `apps/api`.
    Mitigation: keep the new `IAccessDecisionService` port as the only
    application-facing seam.
- **Out-of-scope items**:
  - provisioning an external PDP or writing an OpenFGA adapter in this slice
  - moving engine runtime scope checks to signed authorization envelopes
  - redesigning the `principal_grants` data model itself
- **Validation plan**:
  - targeted red-green runs for the new unit and architecture tests
  - `pnpm --filter dvt-api test`
  - `pnpm --filter dvt-api build`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- **Test coverage plan**:
  - negative unit coverage for denied embedded decisions and token assertion
    conflicts
  - architecture coverage proving the protected security builder no longer
    constructs the removed repository or policy classes
  - app startup coverage proving the protected runtime now migrates the embedded
    access-decision backend
- **Libraries evaluated**:
  - OpenFGA remained the evaluated future backend option, but was deliberately
    not introduced in the first cut

## Traceability

- **Baseline ADRs (verified in Phase 3)**:
  - `ADR-0003`
  - `ADR-0034`
  - `ADR-0051`
- **Canonical contract**:
  - `apps/api/src/application/ports/accessDecision.ts`
- **Generated artifacts**:
  - none beyond governed doc indexes/status surfaces refreshed by repo
    generators

## Implementation Log

- Added the DVT-owned access-decision contract at
  `apps/api/src/application/ports/accessDecision.ts`.
- Reworked `AuthorizeCommandScopeService` so it now depends on
  `IAccessDecisionService` instead of the removed repository-plus-policy split.
- Added `EmbeddedAccessDecisionService` as the first backend and wired it into
  `buildProtectedSecurityRuntime.ts`.
- Tightened the security-runtime seam so the outer protected root now depends on
  a security-runtime migration hook instead of calling the embedded backend
  lifecycle method directly.
- Removed the active runtime sources
  `apps/api/src/domain/auth/policy.ts` and
  `apps/api/src/infrastructure/auth/postgresPrincipalAccessRepository.ts`.
- Updated startup migration wiring and runtime-builder architecture tests so the
  protected security slice now migrates and constructs the embedded backend.
- Hardened `modulesArchitectureSource.support.ts` so owned-concern docblock
  checks accept both LF and CRLF, fixing an environment-sensitive false red in
  module architecture tests.
- Updated active ADR/API/planning surfaces to reflect the embedded-first
  boundary.
- Left `docs/adr/ADR-Index.md` untouched in the final diff because
  `docs:gov:filenames:changed` blocks changed non-kebab-case markdown files.
  ADR navigation is instead updated through generated `docs/adr/index.md`.

## Validation Evidence

- `pnpm --filter dvt-api test -- test/application/services/authorizeCommandScopeService.test.ts test/infrastructure/auth/embeddedAccessDecisionService.test.ts test/app.test.ts`
  - passed
- `pnpm --filter dvt-api test -- test/modules.test.ts`
  - first run failed because the docblock detector in
    `modulesArchitectureSource.support.ts` assumed LF-only line endings
  - second run passed after hardening the detector to accept CRLF as well
- `pnpm --filter dvt-api build`
  - passed
- `pnpm --filter dvt-api test`
  - passed with `93` test files green and `502` tests passed; the protected
    runtime integration file remained skipped under its existing guard
- `pnpm --filter dvt-api typecheck`
  - passed
- `pnpm docs:workboard:generate`
  - passed and regenerated `docs/planning/state/execution-workboard.md` and
    `docs/planning/state/open-task-route.md`
- `pnpm docs:sync`
  - passed and regenerated `docs/adr/index.md` plus
    `docs/planning/state/agent-lane-c.md`
- `pnpm docs:status:generate`
  - passed and regenerated `docs/planning/status/generated-code-state.md`
- `pnpm verify:prepush`
  - first run failed because `docs/adr/ADR-Index.md` is a changed non-kebab-case
    markdown file
  - final run passed after removing that delta and keeping ADR navigation on the
    generated kebab-safe surfaces

## No-Debt / No-Stub Evidence

- No hooks were bypassed.
- No quality gate was relaxed or disabled.
- No stub, placeholder, or fake implementation was introduced.
- No compatibility alias, dual-path policy wiring, or fallback authorization
  engine was left in the protected runtime.
