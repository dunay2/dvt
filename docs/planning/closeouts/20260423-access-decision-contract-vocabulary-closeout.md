---
slice: 20260423-access-decision-contract-vocabulary
date: 2026-04-23
last_reviewed: 2026-04-23
work_item: fix(api)
status: Done
author: AI (Codex)
---

# Closeout: Access decision contract vocabulary hardening

## Think-First Analysis

### Problem summary

`apps/api` now owns an explicit `IAccessDecisionService` seam, but the seam
still reuses app-local auth vocabulary from `domain/auth/types.ts` and still
infers resource ownership from optional `projectId` and `environmentId`
presence instead of from one canonical resource/scope contract.

### Root cause

The first embedded-first cut extracted the backend seam before fully
canonicalizing the action/resource/scope vocabulary behind that seam.

That left three drift risks:

- the application contract still imports authz semantics from a broader local
  domain file instead of owning them at the port;
- future backends would need to reverse-engineer scope intent from partially
  implicit shapes;
- route families can keep reintroducing local string-and-shape conventions
  instead of one governed access vocabulary.

### Constraints and invariants

- `AGENTS.md` requires doc-driven execution first, no stubs, no hidden debt,
  and real validation evidence.
- `docs/guides/ai-work-protocol.md` requires the think-first analysis and
  pre-implementation brief before code changes, plus negative-path coverage for
  new behavior.
- `docs/adr/ADR-0003-execution-model.md` keeps execution semantics and runtime
  invariants DVT-owned rather than vendor-owned.
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
  requires explicit contracts between bounded contexts instead of leaking
  implementation details through shared internals.
- `docs/adr/ADR-0051-access-decision-service-and-openfga-adapter.md` requires
  one DVT-owned access-decision contract and keeps future PDP integrations
  behind that contract rather than exposing vendor vocabulary to application
  code.

### Options considered

1. Keep the current seam shape and document the implicit scope rules.
   - Rejected: preserves drift and leaves future adapters reconstructing
     semantics from optional fields and scattered route conventions.

2. Introduce OpenFGA-oriented tuple or relation concepts into the API port now.
   - Rejected: exposes vendor semantics before a real backend exists and breaks
     the embedded-first decision.

3. Canonicalize DVT-owned access vocabulary at the application port with
   explicit resource/scope kinds plus helper builders, then make routes and the
   embedded backend consume that contract directly.
   - Selected: closes the semantic hole without introducing a fake external
     adapter.

### Selected option and rationale

Move the canonical access action/resource/scope types to the
`IAccessDecisionService` boundary, make resource ownership explicit in the
scope shape, and update route parsers, authorizers, and the embedded backend to
preserve and validate that vocabulary directly.

### Rejected alternatives

- Adding a placeholder `OpenFgaAccessDecisionService` without a real backend.
  - Rejected: violates the no-stub rule and would only pretend the seam is
    proven.
- Keeping workspace-graph-draft as a completely separate capability-only
  vocabulary without mapping it into the same access contract.
  - Rejected: keeps a second authz dialect alive inside `apps/api`.

## Pre-Implementation Brief

- **Mode**: Full
- **Scope**:
  - harden `IAccessDecisionService` so it owns the canonical access
    action/resource/scope vocabulary
  - make route-facing scopes explicit about resource ownership
  - update the embedded backend and auth application services to consume the
    explicit contract
  - add negative and contract-oriented tests that future backends can satisfy
  - align ADR/API/planning docs with the canonical vocabulary
- **Touched files or paths**:
  - `apps/api/src/application/ports/accessDecision.ts`
  - `apps/api/src/application/ports/auth.ts`
  - `apps/api/src/application/ports/authContract.ts`
  - `apps/api/src/application/services/authorizeCommandScopeService.ts`
  - `apps/api/src/application/services/authorizeWorkspaceGraphDraftCapabilityService.ts`
  - `apps/api/src/domain/auth/types.ts`
  - `apps/api/src/entrypoints/http/**`
  - `apps/api/src/infrastructure/auth/embeddedAccessDecisionService.ts`
  - `apps/api/test/**` for authz contract, route parser, and embedded-backend
    coverage
  - `docs/adr/ADR-0051-access-decision-service-and-openfga-adapter.md`
  - `docs/architecture/components/api/**`
  - `docs/planning/reviews/architecture-and-governance/20260423-dvt-plus-system-architecture-review.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - this closeout file
- **Expected outcome**:
  - one DVT-owned access vocabulary exists for action, resource, scope, and
    denial reason
  - route families build explicit resource kinds instead of relying on optional
    field presence
  - the embedded backend preserves and validates the canonical scope shape
  - a future external PDP adapter can map the contract without pulling vendor
    semantics into `apps/api`
- **Risks and mitigations**:
  - Risk: the refactor widens import churn across API runtime and tests.
    Mitigation: keep identifier/principal types in `domain/auth/types.ts` and
    move only contract-owned access vocabulary to the application port.
  - Risk: route parsers and use-case tests may encode current implicit scope
    shapes.
    Mitigation: add parser- and authorizer-level failing tests first so the new
    shape is forced deliberately.
  - Risk: workspace graph draft capability code could drift again from the main
    authz seam.
    Mitigation: make its authorizer calls use the same explicit access-scope
    builders.
- **Out-of-scope items**:
  - implementing a real OpenFGA backend
  - adding remote PDP network calls
  - redesigning grant persistence beyond what the explicit scope contract
    requires
- **Validation plan**:
  - targeted red-green runs for new authz contract and parser tests
  - `pnpm --filter dvt-api test`
  - `pnpm --filter dvt-api build`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- **Test coverage plan**:
  - explicit-scope contract tests for tenant/project/environment and
    workspace-graph-draft mappings
  - embedded backend tests proving approved scope preserves resource ownership
  - route/parser/service coverage proving the new contract is used at HTTP and
    capability boundaries
- **Libraries evaluated**:
  - no new library adoption in this slice; the goal is to harden the DVT-owned
    contract before any backend swap

## Implementation Log

- Moved the canonical protected authz language fully into
  `apps/api/src/application/ports/accessDecision.ts`, adding named action
  constants plus explicit tenant/project/environment/workspace-draft resource
  discriminants.
- Kept `domain/auth/types.ts` focused on identity primitives and removed the
  access-language ownership leak from that module.
- Updated route and application consumers to reuse the canonical action
  catalog instead of redefining raw action literals:
  `planRoutePolicyCatalog.ts`,
  `workspaceGraphDraft.ts`,
  `startRunRouteParser.ts`,
  `getRunRouteParser.constants.ts`,
  `getRunEventsRouteParser.constants.ts`,
  `listRunsRouteParser.constants.ts`,
  `runCommandRoute.constants.ts`,
  and `adminRoutes.ts`.
- Refactored `EmbeddedAccessDecisionService` to switch on
  `requestedScope.resource` instead of reconstructing scope ownership from
  optional ids.
- Added short owned-concern docblocks to the access-decision component modules
  and their immediate route adapters so the semantic ownership is explicit in
  source as well as in docs.
- Added the local component guide
  `apps/api/docs/protected-security-access-decision-component.md` with public
  API, invariants, transitions, consumers, and diagrams.
- Added the Fowler mailbox analysis
  `buzon/20260423-codex-fowler-access-decision-component-analysis-and-remediation.md`
  to capture patterns improved, mature-system comparison, antipatterns,
  repetitions, opportunities, and drift.
- Added the semantic architecture test
  `apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts`
  to pin that:
  the published language lives in `accessDecision.ts`,
  route/application consumers reuse it,
  and the embedded backend consumes explicit resource discriminants.
- Fowler-style cleanup on
  `authorizeWorkspaceGraphDraftCapabilityService.ts` and the extracted
  companion module
  `apps/api/src/application/services/workspaceGraphDraftCapabilityPolicy.ts`
  replaced wrapper-style duplicated capability builders with one named
  capability-policy map and a typed denial-to-capability translator based on
  `DeniedReason` instead of an open-ended string alias.
- Follow-up cleanup reduced local branching in
  `apps/api/src/entrypoints/http/listRunsRouteParser.ts` by splitting
  tenant/project/environment parsing into focused helpers and removed repeated
  capability-fixture builders from
  `packages/@dvt/contracts/test/validation/workspace-graph-draft.ts`.
- Updated active ADR/API/review docs so the current protected-security runtime
  is described as embedded-first access-decision assembly rather than as the
  retired repository-plus-policy split.

## Validation Evidence

- `pnpm --filter dvt-api test -- test/application/services/protectedSecurityAccessDecision.architecture.test.ts test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts test/application/services/planRoutePolicyCatalog.test.ts test/infrastructure/auth/embeddedAccessDecisionService.test.ts test/entrypoints/http/listRunsRouteParser.test.ts test/entrypoints/http/planRouteRequestResolver.test.ts test/entrypoints/http/startRunRoute.authAndSuccess.test.ts`
  - passed with `7/7` files and `29/29` tests green
- `pnpm --filter dvt-api build`
  - passed
- `pnpm --filter dvt-api typecheck`
  - passed
- `pnpm --filter dvt-api test`
  - passed with `98` files green, `521` tests green, and `15` skipped
    integration tests already marked skipped in the suite
- `pnpm --filter dvt-api test -- test/application/services/authorizeWorkspaceGraphDraftCapabilityService.test.ts test/application/services/protectedSecurityAccessDecision.architecture.test.ts`
  - passed after the final Fowler-style capability-policy cleanup
- `pnpm --filter dvt-api test -- test/application/services/workspaceGraphDraftCapabilityPolicy.test.ts`
  - failed first because the extracted companion module did not exist yet, then
    passed after the module extraction and typed denial-reason cleanup
- `pnpm docs:workboard:generate`
  - passed and regenerated
    `docs/planning/state/execution-workboard.md` and
    `docs/planning/state/open-task-route.md`
- `pnpm docs:sync`
  - passed and regenerated `docs/planning/state/agent-lane-c.md`
- `pnpm docs:status:generate`
  - passed and regenerated `docs/planning/status/generated-code-state.md`
- `pnpm verify:prepush`
  - passed
  - note: the changed-only governance scripts reported `No changed files detected`
    in this local state, so the stronger evidence for the slice remains the
    explicit package and docs commands above

## No-Debt / No-Stub Evidence

- No new debt entry was created.
- No lint, type, test, or docs rules were disabled or relaxed.
- No hooks were bypassed.
- No placeholders, fake adapters, migration shims, or vendor-facing stubs were
  introduced.
- The branch mailbox, local component guide, and semantic architecture test all
  describe and enforce the same active boundary; no compatibility-only shadow
  path was added.
