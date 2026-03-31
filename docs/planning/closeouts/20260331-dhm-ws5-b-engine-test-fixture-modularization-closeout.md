---
slice: 20260331-dhm-ws5-b-engine-test-fixture-modularization
date: 2026-03-31
work_item: DHM-WS5-B
status: Done
---

# Closeout: DHM-WS5-B Engine Test Fixture Modularization

## Think-First Analysis

### Problem summary

The remaining `@dvt/engine` tests still duplicate infrastructure-heavy
`WorkflowEngine` and `WorkflowEngineCoreService` construction across `contracts`,
`security`, and `core` suites, even after the first WS5 intent-log extraction.

### Root cause

The first WS5 slice extracted helper-backed setup only for
`WorkflowEngine.intentLog.test.ts`. The rest of the test tree kept local
constructor wiring for `SnapshotProjector`, `IdempotencyKeyBuilder`,
`RunAccessPolicy`, in-memory stores, and clock defaults, so the same
infrastructure fixture is still repeated in multiple files.

### Constraints and invariants

- `AGENTS.md`: inventory-first execution, real validation, no hidden debt, no
  stubs, and `pnpm verify:prepush` in closeout.
- `docs/guides/ai-work-protocol.md`: think-first before code edits, closeout is
  mandatory, and planning surfaces must stay synchronized when task state
  changes.
- `docs/guides/test-architecture.md`: promote shared helpers only for repeated
  infrastructure concerns with multiple real consumers; keep domain semantics
  local.
- `ADR-0034`: test helpers must stay inside the owning bounded context and must
  not create cross-context coupling.
- `ADR-0039`: engine construction should stay explicit about ports and injected
  collaborators; test refactors must not change behavior.
- `docs/evidence/ED-20260330-lane-a-ws5-intent-log-fixture-modularization.md`:
  WS5-A already established helper-backed engine setup as the accepted direction
  for this modularization stream.

### Options considered

- Keep each suite's local constructor wiring and only clean formatting.
  - Rejected because it preserves the fixture drift WS5 is trying to remove.
- Extend the existing `test/core/WorkflowEngine.helpers.ts` into a package-level
  shared helper and migrate the remaining helper-heavy consumers.
  - Selected because the repeated setup is infrastructure-only and already has
    more than two real consumers.
- Create one oversized global test harness that also owns plan/contract/domain
  semantics.
  - Rejected because it would blur stable infrastructure setup with
    capability-specific fixtures.

### Selected option and rationale

Add a shared engine test fixture helper under `packages/@dvt/engine/test/helpers`
that centralizes engine/core-service construction, then migrate the remaining
helper-heavy suites to it while keeping plan-specific and authorization-specific
fixtures local to each test file.

### Rejected alternatives

- Continue using only `test/core/WorkflowEngine.helpers.ts` as an implicit
  shared helper across unrelated folders.
- Move test fixture helpers into production exports or runtime package surfaces.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - `packages/@dvt/engine/test/helpers/**`
  - `packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts`
  - remaining helper-heavy `@dvt/engine` suites that still construct engine/core
    dependencies inline
  - lane-A planning state if `DHM-WS5-B` is fully closed in this slice
- Expected outcome:
  - repeated engine/core-service fixture wiring is centralized
  - migrated suites stop duplicating inline constructor setup
  - test semantics stay unchanged
- Risks and mitigations:
  - Risk: helper defaults drift from constructor expectations.
    - Mitigation: keep helpers thin, delegate to real constructors, and run full
      `@dvt/engine` tests plus pre-push validation.
  - Risk: over-generalizing the helper and hiding test intent.
    - Mitigation: only centralize infrastructure wiring and leave plan/auth
      semantics local to each suite.
- Out-of-scope items:
  - runtime code changes under `packages/@dvt/engine/src`
  - cross-package fixture promotion outside `@dvt/engine`
  - closing the WS5 risk without fresh validation evidence
- Validation plan:
  - `pnpm --filter @dvt/engine test`
  - `pnpm verify:prepush`
  - `pnpm docs:sync`
- Test coverage plan:
  - existing `@dvt/engine` suites remain green after helper migration
  - no negative-path assertions are removed during fixture extraction
- Libraries evaluated:
  - None evaluated - this is a local test-fixture refactor.

## Traceability

- Baseline ADRs:
  - `ADR-0034`
  - `ADR-0039`
- Canonical planning sources:
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`
  - `docs/evidence/ED-20260330-lane-a-ws5-intent-log-fixture-modularization.md`
  - `docs/risk-register/quality/R-20260330-WS5-ENGINE-TEST-FIXTURE-DRIFT.md`

## Real Work Performed

- Added `packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts` as the
  shared infrastructure fixture for `WorkflowEngine` and
  `WorkflowEngineCoreService` construction.
- Updated `packages/@dvt/engine/test/core/WorkflowEngine.helpers.ts` to build on
  the new shared helper instead of owning a second constructor-wiring path.
- Migrated the remaining helper-heavy suites:
  - `packages/@dvt/engine/test/contracts/engine.test.ts`
  - `packages/@dvt/engine/test/contracts/capabilities.contract.test.ts`
  - `packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts`
  - `packages/@dvt/engine/test/security/authorizer.deny.test.ts`
  - `packages/@dvt/engine/test/core/WorkflowEngineCoreService.test.ts`
  - `packages/@dvt/engine/test/services/RunMaintenanceService.test.ts`
- Added accepted evidence for `DHM-WS5-B` and updated the WS5 risk entry with
  closure evidence.
- Updated `docs/planning/state/agent-lane-a.yaml` to close `DHM-WS5-B` and
  regenerate the planning views.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/guides/test-architecture.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md`
- `docs/planning/state/agent-lane-a.yaml`
- `docs/evidence/ED-20260330-lane-a-ws5-intent-log-fixture-modularization.md`
- `docs/risk-register/quality/R-20260330-WS5-ENGINE-TEST-FIXTURE-DRIFT.md`

## Validation evidence

- `pnpm --filter @dvt/engine build` - Passed.
- `pnpm --filter @dvt/engine test` - Passed.
- `pnpm docs:sync` - Passed and regenerated `docs/evidence/index.md` plus
  `docs/planning/state/agent-lane-a.md`.
- `pnpm docs:workboard:generate` - Passed and regenerated
  `docs/planning/state/execution-workboard.md` plus
  `docs/planning/state/open-task-route.md`.
- `pnpm verify:prepush` - Passed.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No TODO/FIXME or temporary compatibility path was introduced.
- The helper extraction stayed inside `@dvt/engine/test`; no production runtime
  surface was widened.

## No-stub evidence

- No fake implementation was introduced.
- Shared helpers call the real `WorkflowEngine` and `WorkflowEngineCoreService`
  constructors with real in-memory collaborators.
- Suite-specific plan, authorization, and maintenance semantics remain asserted
  in the owning test files instead of being hidden behind placeholder helpers.
