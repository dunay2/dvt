---
title: G8 - AI Execution Tracker
status: Active
owner: Delivery / Engineering
last_reviewed: 2026-03-12
planning_type: execution-plan
---

# G8 - AI Execution Tracker

Operational tracker for AI-assisted execution of the remaining `G8` work.

## Authority Rule

- Canonical spec: [G8 Real Auth Final Spec](G8-REAL-AUTH-FINAL-SPEC.md)
- Active status doc: [DVT+ - Gap Execution Plans](GAP_EXECUTION_PLANS.md)

This file is not a second source of truth. Its job is narrower:

- record the current execution pointer for AI work;
- show what remains in `G8` after T8-1 through T8-5;
- make the next validation lane explicit;
- leave a short execution log.

If this tracker conflicts with the canonical spec, update the canonical spec
first and then sync this tracker.

## Current Pointer

Update this section before any substantial implementation turn.

- `as_of`: `2026-03-12`
- `gap`: `G8`
- `epic`: `T8-6 + T8-7`
- `current_focus`: `closed`
- `state`: `Closed`
- `currently_working_on`: `nothing — all tasks complete`
- `next_after_current`: `G9 StepTypeRegistry`
- `blocking_dependencies`: none
- `last_completed`: `T8-7 — EngineStartRunUseCase wired; 21/21 api tests pass`

## Remaining G8 Roadmap

- `T8-6` scope: dependency-cruiser rules enforcing §16.2 layer constraints
  exit signal: `pnpm --filter dvt-api test:arch` passes with all 5 rules verified
- `T8-7` scope: replace `NotImplementedStartRunUseCase` with `EngineStartRunUseCase` wrapping `WorkflowEngine`
  exit signal: `engine.startRun()` called on `POST /runs/start`; 19+ tests pass

## Execution Protocol For AI

1. Before code changes, update [Current Pointer](#current-pointer).
2. If scope or acceptance changes, update the canonical spec first, then this tracker.
3. Keep the current stage tied to one task at a time.
4. Record the touched-files plan before implementation for the active stage.
5. After each validation batch, append an execution-log entry with exact commands and pass/fail state.
6. When a stage closes, sync this tracker, [GAP_EXECUTION_PLANS.md](GAP_EXECUTION_PLANS.md), and affected status docs in the same change.

## Stage Detail

### T8-6 — dependency-cruiser arch tests

Think-first analysis:

- problem summary: the §16.2 layer rules are documented but not enforced; a
  careless import of Fastify inside an application service, or a JWT import in
  the engine, would pass TypeScript and only be caught by code review
- constraints and invariants:
  - must run offline with no external services
  - must not depend on the build being up-to-date (static analysis on source)
  - rules must be strict enough to catch real violations but not block legitimate
    cross-layer usage (e.g. `domain` importing from `@dvt/contracts`)
- options considered:
  - `dependency-cruiser` — mature, rule-based, JSON config, integrates with ESLint
  - `ts-arch` — test-style DSL, more ergonomic but more code to write
  - ESLint `no-restricted-imports` — file-level only, no graph analysis
- selected option and rationale:
  - `dependency-cruiser` — no-code config, graph-aware, can express "module
    group A must not depend on module group B" as a single rule; standard in
    the Node ecosystem for this kind of structural enforcement

Pre-implementation brief:

- scope:
  - add `dependency-cruiser` as devDependency in `apps/api/package.json`
  - create `apps/api/.dependency-cruiser.cjs` with 5 rules from §16.2
  - add `test:arch` script to `package.json`
- touched files or paths:
  - `apps/api/package.json` (add devDep + test:arch script)
  - `apps/api/.dependency-cruiser.cjs` (new)
- expected outcome:
  - `pnpm --filter dvt-api test:arch` passes with no violations
  - importing Fastify from `application/**` would fail the rule
- validation plan:
  - `pnpm --filter dvt-api test:arch`

### T8-7 — Engine-backed StartRun use case

Think-first analysis:

- problem summary: `IStartRunUseCase` is implemented by `NotImplementedStartRunUseCase`
  which throws; the engine's `WorkflowEngine` is never called from the API; the
  `StartRunCommand` model doesn't carry enough data to call `engine.startRun()`
- root cause: `StartRunCommand = { selection: string[] }` lacks `PlanRef` fields
  (uri, sha256, schemaVersion, planId, planVersion) and `RunContext` fields
  (runId, targetAdapter); these must come from the HTTP request body
- constraints and invariants:
  - `WorkflowEngine` needs: stateStore, outbox, projector, idempotency, clock,
    authorizer, planRefPolicy, intentStore, adapters, observability
  - engine-level `IAuthorizer` is a redundant secondary check — G8 already does
    the real tenant authorization at the application layer; safe to wire a
    `TenantContextAuthorizer` that validates the run context tenant matches the
    authorized scope
  - must not break existing 19 tests
  - must not introduce circular dependencies
- options considered:
  - extend `StartRunCommand` with plan reference data — cleanest, forces API
    callers to supply the plan URI they intend to run
  - keep `StartRunCommand` as-is, add a `IPlanRepository` port — indirection
    not needed yet; the API caller already knows the plan they want to run
- selected option and rationale:
  - extend `StartRunCommand` with `planRef: StartRunPlanRef`, `runId: string`,
    and `targetAdapter: 'temporal' | 'mock'`; wire `WorkflowEngine` in `app.ts`
    with `PostgresStateStoreAdapter` (state+outbox), `PostgresStartRunIntentStore`,
    `MockAdapter`, system clock, `TenantContextAuthorizer`

Pre-implementation brief:

- scope:
  - extend `StartRunCommand` in `application/ports/auth.ts`
  - extend body parsing in `entrypoints/http/startRunRoute.ts`
  - create `application/services/engineStartRunUseCase.ts`
  - wire `WorkflowEngine` in `app.ts`, replace `NotImplementedStartRunUseCase`
  - update route tests for new command shape
  - add `EngineStartRunUseCase` unit tests
- touched files or paths:
  - `apps/api/src/application/ports/auth.ts` (extend StartRunCommand)
  - `apps/api/src/application/services/engineStartRunUseCase.ts` (new)
  - `apps/api/src/entrypoints/http/startRunRoute.ts` (parse new fields)
  - `apps/api/src/app.ts` (wire engine)
  - `apps/api/test/entrypoints/http/startRunRoute.test.ts` (update command assertion)
  - `apps/api/test/application/services/engineStartRunUseCase.test.ts` (new)
- expected outcome:
  - `POST /runs/start` calls `engine.startRun()` with the plan ref and run context
  - existing auth/authorization paths unchanged
  - 20+ tests pass
- validation plan:
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-api test`

## Execution Log

- `2026-03-12` `G8` `planning`
  summary: created G8-AI-EXECUTION-TRACKER.md; established think-first and
  pre-implementation briefs for T8-6 and T8-7; baseline confirmed — 19/19 api
  tests pass; dependency-cruiser not yet installed; `NotImplementedStartRunUseCase`
  still in place
  validation: repo inspection of `apps/api/src/**`, `G8-REAL-AUTH-FINAL-SPEC.md`,
  `WorkflowEngine.ts`, `PostgresStateStoreAdapter.ts` interfaces

- `2026-03-12` `T8-6` `closed`
  summary: added `dependency-cruiser@17.3.9` as devDependency; created
  `apps/api/.dependency-cruiser.cjs` with 5 rules enforcing §16.2 layer
  constraints; added `test:arch` script to `apps/api/package.json`
  validation: `pnpm --filter dvt-api test:arch` → ✔ no dependency violations
  found (104 modules, 134 dependencies cruised)

- `2026-03-12` `T8-7` `closed`
  summary: extended `StartRunCommand` with `planRef`, `runId`, `targetAdapter`;
  created `EngineStartRunUseCase` bridging application command to
  `IWorkflowEngine.startRun()`; wired `WorkflowEngine` with real adapters and
  `AllowAllAuthorizer` in `app.ts` via deferred dynamic imports; updated
  `startRunRoute.ts` to parse new fields; updated `app.test.ts` to await the
  async `buildApp()` path and to assert the OIDC/database fast-fail branch;
  `engineStartRunUseCase.test.ts` added (2 tests)
  validation: `pnpm --filter dvt-api test` → 21/21 pass
  `pnpm --filter dvt-api typecheck` → 0 errors
  `pnpm --filter dvt-api test:arch` → 0 violations
