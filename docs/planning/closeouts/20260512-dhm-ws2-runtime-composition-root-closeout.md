---
title: DHM-WS2 runtime composition root closeout
status: Accepted
owner: API / Engine / Architecture
last_reviewed: 2026-05-12
planning_type: closeout
work_item: DHM-WS2
---

# DHM-WS2 Runtime Composition Root Closeout

## Think-First Analysis

Problem summary:
`DHM-WS2` must simplify the intent reconciler runtime composition root without
changing externally visible runtime behavior. The current
`createIntentReconcilerRuntime` function resolves config, creates Postgres
stores, migrates them, resolves provider adapters, creates the maintenance
service, creates the worker, and publishes the runtime handle in one flow.

Root cause:
The runtime grew as an operational bootstrap script rather than a named
composition object. That makes the startup order implicit and leaves the API
runtime file as the only proof that concrete adapter binding remains in the
composition root.

Constraints and invariants:
`AGENTS.md` requires governance-first execution, no hidden debt, no stubs, and
closeout evidence. `ADR-0039` requires adapter instantiation to remain in the
composition root and keeps provider selection out of `@dvt/engine`.
`docs/architecture/command-query-rail-governance.md` requires a named rail for
externally observable behavior. This slice reuses the internal
`IntentReconcilerRuntimeComposition` command rail and does not add a public API.
`docs/architecture/fowler-opportunity-planning-governance.md` requires a
planning matrix because this is a non-trivial runtime boundary change.

Options considered:

1. Keep the current single function and add comments. Rejected because comments
   do not make ordering mechanically testable.
2. Split each assembly step into exported helper functions. Rejected because it
   widens the public API of the runtime module without adding product value.
3. Add a named internal composition object that owns the startup sequence while
   preserving the existing exported factory. Selected because it narrows
   responsibility and keeps callers unchanged.

Libraries evaluated:
None evaluated - no custom implementation library is needed for an internal
composition refactor.

Selected option and rationale:
Introduce `IntentReconcilerRuntimeComposition` and
`createIntentReconcilerRuntimeComposition` inside
`apps/api/src/runtime/intentReconcilerRuntime.ts`. The class will own the
ordered sequence: config, stores, migrations, adapters, maintenance, worker,
handle. The exported `createIntentReconcilerRuntime` remains the caller-facing
factory and delegates to the composition object.

Rejected alternatives:
Moving runtime assembly into `@dvt/engine` would violate `ADR-0039` because it
would move concrete adapter binding out of the API composition root. Creating a
new package is too broad for this slice and would add file inventory churn
without reducing current risk.

Fowler opportunity matrix:

| scenario                                                                                           | opportunity             | Fowler pattern                                 | DDD owner                    | command/query rail                           | implementation surfaces                           | unit or package test                                | architecture test                                                                                         | user-flow test | out of scope                                                          |
| -------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| Intent reconciler startup assembly remains behaviorally identical while startup order is explicit. | Responsibility overload | Extract Class / Service Layer composition root | API runtime composition root | `IntentReconcilerRuntimeComposition` command | `apps/api/src/runtime/intentReconcilerRuntime.ts` | `pnpm --filter dvt-api test -- test/server.test.ts` | `pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts` | Not applicable | Env schema changes, adapter contract changes, worker behavior changes |
| Concrete provider and Postgres binding stays in API runtime.                                       | Boundary drift          | Composition Root / Adapter boundary            | API runtime composition root | `IntentReconcilerRuntimeComposition` command | `apps/api/src/runtime/intentReconcilerRuntime.ts` | `pnpm --filter dvt-api typecheck`                   | `intentReconcilerRuntimeComposition.architecture.test.ts`                                                 | Not applicable | Moving provider resolution into engine                                |
| Runtime docs and tests describe the same sequence.                                                 | Documentation drift     | Architecture fitness function                  | API runtime composition root | `IntentReconcilerRuntimeComposition` command | docs component guide, user stories, closeout      | docs feature mechanization checks                   | `intentReconcilerRuntimeComposition.architecture.test.ts`                                                 | Not applicable | Public route or health contract changes                               |

## Pre-Implementation Brief

Mode:
Full. The slice adds architecture guard artifacts and changes runtime
composition internals, but it does not add a public HTTP API or contract shape.

Scope:
Refactor intent reconciler runtime assembly into one internal composition
object, add architecture guard coverage, document the component and stories, and
record evidence and risk because `apps/api` binds concrete adapter behavior.

Touched files or paths:
`apps/api/src/runtime/intentReconcilerRuntime.ts`,
`apps/api/test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts`,
`docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-component.md`,
`docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-user-stories.md`,
this closeout, evidence, risk register, and generated documentation indexes.

Expected outcome:
The exported runtime factory still returns the same handle behavior, disabled
states remain disabled, unsupported providers still fail closed, and the startup
sequence is mechanically visible in one class.

Risks and mitigations:
The main risk is changing startup order while refactoring. The mitigation is a
source-level architecture test that asserts the ordered calls and the absence of
concrete adapter binding outside the runtime composition object.

Out-of-scope items:
Environment variable schema changes, new provider support, changes to
`RunMaintenanceService`, worker timing semantics, and health endpoint behavior.

Validation plan:
Run the DHM-WS2 feature mechanization check, the new architecture test,
`apps/api` server bootstrap tests, `dvt-api` typecheck, docs generators, the
implementation mechanization check, and `pnpm verify:prepush`.

Test coverage plan:
Add a negative architecture guard that fails when concrete provider or store
binding drifts outside the composition object or when the ordered startup calls
are removed. Existing server tests cover disabled runtime, runtime start,
bootstrap failure, and health hook transitions.

Command/query rail impact:
No new public command or query is introduced. The internal
`IntentReconcilerRuntimeComposition` command rail is declared in the
mechanization block and owned by the API runtime composition root.

Fowler planning impact:
This slice addresses responsibility overload, boundary drift, and documentation
drift in the API runtime bootstrap. Residual provider resolution and telemetry
policy standardization remain in `WE-HX-5`.

## Normative Baseline

Verified ADR set:
`ADR-0039` authorizes composition-root ownership of provider selection and
concrete adapter construction. The planned output keeps `@dvt/engine` free of
runtime env resolution and preserves adapter instantiation in `apps/api`.

## Traceability

Baseline ADRs:
`ADR-0039`.

Canonical proposal:
`docs/planning/proposals/mandatory/runtime-and-contracts/workflow-engine-hexagonal-derivation-plan-20260403.md`.

Canonical component guide:
`docs/architecture/components/engine/architecture/intent-reconciler-runtime-composition-component.md`.

## Closeout Evidence

Real work performed:
`apps/api/src/runtime/intentReconcilerRuntime.ts` now delegates the exported
factory to `IntentReconcilerRuntimeComposition`, which owns the ordered startup
sequence without changing the public runtime handle. The slice also adds the
architecture guard, component guide, user stories, evidence file, and risk
register entry named in the feature mechanization block.

The 2026-05-18 hardening pass removed the remaining facade/composition collapse:
`intentReconcilerRuntime.ts` now owns only the public runtime factory and handle
types, while `apps/api/src/runtime/intentReconcilerRuntimeComposition.ts` owns
config parsing, store binding, migration, provider adapter resolution,
maintenance creation, worker creation, and handle assembly.

Validation evidence:

- `pnpm docs:feature-mechanization -- --feature DHM-WS2-RUNTIME-COMPOSITION-ROOT`
  - Passed before implementation wiring and will be rerun after docs index
    refresh.
- `pnpm --filter dvt-api test -- test/architecture/intentReconcilerRuntimeComposition.architecture.test.ts`
  - RED first: failed because no `IntentReconcilerRuntimeComposition` class
    existed and the ordered calls were absent.
  - RED again during the 2026-05-18 hardening pass: failed because the public
    facade still imported concrete assembly and the dedicated composition module
    was absent.
  - GREEN after implementation: passed, 3 tests.
- `pnpm --filter dvt-api test -- test/server.test.ts`
  - Passed, 18 tests.
- `pnpm --filter dvt-api typecheck`
  - Passed.

No-debt evidence:
No lint, type, test, hook, or quality rule was disabled or relaxed. No public
API, contract, adapter package, or engine package was changed for this slice.
The hardening pass added one API runtime source module and updates generated
source status instead of hiding the structural change.

No-stub evidence:
No stub, placeholder, fake adapter, fake success path, TODO, FIXME, or
unfinished branch was added.
