---
title: Test Architecture
status: Active
owner: engineering
last_reviewed: 2026-05-20
---

# Test Architecture

This guide defines how tests should be structured in this repository.

It does not replace the command inventory in
[`testing-and-ci-capabilities.md`](./testing-and-ci-capabilities.md). That guide
answers "what can I run?". This guide answers "how should tests be organized
and written so they stay maintainable?".

## Core rule

The repository standardizes on `vitest` unless a workspace has a documented and
accepted exception. Disorder in test code should be solved first with better
boundaries, fixtures, and harnesses, not by adding another framework.

## Canonical test categories

Use these categories consistently in docs, PRs, and test reviews:

- `unit`: pure logic, deterministic transforms, policy evaluation
- `contract`: schema, wire shape, or explicit boundary behavior
- `integration`: multi-component behavior with real collaborators
- `smoke`: minimal end-to-end confidence that a module boots and its primary
  path works

For frontend capabilities, also classify tests by architecture layer:

- `domain`: selectors, projection models, pure derived state
- `application`: orchestration seams and injected use cases
- `presentation`: hooks, providers, view wiring, query composition
- `infrastructure`: transport adapters, HTTP clients, cache adapters, external
  integration points

Do not mix several responsibilities in one test file when it obscures the
boundary being tested.

## Placement and naming

- Use `*.test.ts` and `*.test.tsx` for executable suites.
- Keep frontend capability tests close to the capability they validate.
- Keep backend runtime and integration tests under the workspace `test/`
  directory unless there is a stronger local convention.
- Use `testing/` for builders, harnesses, and reusable support code that belong
  to one bounded context.
- Use `fixtures/` only for fixture data or serialized samples, not executable
  harness logic.

If a helper is only used by one test file and does not encode shared semantics,
keep it local. Do not create empty or ceremonial `testing/` directories.

## Shared utility promotion rule

Promote a helper to shared support only when all of these are true:

- it has at least two real consumers
- it solves an infrastructure concern, not domain semantics
- its API is stable enough that reuse will reduce churn instead of spreading it

Keep these local to a module or bounded context:

- domain fixtures
- DTO builders tied to one capability
- harnesses whose semantics change with a single contract

Promote these when duplication appears:

- provider wrappers
- `QueryClient` or router harnesses
- async flush and wait helpers
- environment bootstrap helpers used by several modules

## Assertion rules

Prefer assertions on observable contract:

- inputs sent
- outputs returned
- error classification
- state transitions
- required side effects

Avoid over-specifying internals:

- do not lock test expectations to call order unless order is part of the
  contract
- do not snapshot large ad hoc objects when a builder with explicit overrides is
  clearer
- do not mock the module graph globally when seam injection is feasible

## Frontend guidance

Frontend capability tests should normally follow this pattern:

- `domain/` uses local builders from `testing/`
- `application/` verifies injected seam behavior and little else
- `presentation/` uses a shared frontend harness for providers such as
  `QueryClientProvider`
- `infrastructure/` verifies HTTP or adapter behavior with request recorders and
  response builders

The current pilot for this pattern is:

- `apps/web/src/capabilities/platform-health`

Shared frontend test support should stay narrow. Preferred exports:

- `createTestQueryClient()`
- `withTestQueryClient(...)`
- small async wait helpers

Shared frontend support must also follow two stability rules:

- wait helpers should separate observation from scheduler-driving; use a proven
  wait primitive for real-time polling and keep custom `tick` hooks only for
  explicit scheduler-controlled tests
- side effects that release or drive async work belong in the test body inside
  `act(...)`, not in a shared wait helper API
- any helper that mutates process-global React test state such as
  `IS_REACT_ACT_ENVIRONMENT` must use lease-style or ref-counted restoration so
  overlapping mounts do not restore global state too early
- shared React Query harnesses should integrate TanStack Query notification
  dispatch with `act(...)` at the harness boundary instead of making each test
  paper over observer notification timing individually

Do not place capability-specific DTO or snapshot builders in shared frontend
support.

## @dvt/web Vitest suite partition

`apps/web` owns a single Vitest suite catalog in
[`apps/web/vitest.suites.ts`](../../apps/web/vitest.suites.ts). The package
keeps `pnpm --filter @dvt/web test` as the full suite and adds smaller lanes
for development and CI:

- `test:unit`: `*.test.ts`, excluding architecture tests
- `test:presentation`: `*.test.tsx`, excluding architecture tests
- `test:architecture`: `*.architecture.test.{ts,tsx}`
- `test:canvas`: overlapping Canvas focus lane for `Canvas*.test.tsx` and
  `views/canvas/**`
- `test:canvas-unit`: Canvas non-architecture `.ts` focus lane
- `test:canvas-presentation`: Canvas non-architecture `.tsx` focus lane
- `test:canvas-architecture`: Canvas architecture focus lane
- `test:monaco`: Monaco focus lane for Code editing, Artifacts read-only
  viewing, and Diff review architecture tests
- `test:changed`: changed-file router that selects the smallest safe suite
  command from the suite catalog for local use and ordinary web pull requests
- `test:ci`: unit, presentation, then architecture

Each public web suite command runs `test:deps` before its raw Vitest delegate.
That keeps the split commands aligned with the package dependency-build
contract instead of relying on package-manager lifecycle hooks for custom script
names. `test:ci` runs `test:deps` once, then calls the internal `*:run`
delegates in catalog order.

Every web Vitest file must belong to exactly one primary suite: `unit`,
`presentation`, or `architecture`. Focus lanes such as `test:canvas` may
overlap with a primary suite, but they do not define ownership. The semantic
guard is
[`apps/web/src/testing/vitestSuites.architecture.test.ts`](../../apps/web/src/testing/vitestSuites.architecture.test.ts).
That guard also verifies that package scripts, suite config files, and the Test
Suite workflow stay wired to the catalog instead of carrying parallel suite
definitions.

Canvas route-level presentation tests must stay partitioned by responsibility.
Route-level `Canvas.*.test.tsx` presentation files have a target maximum of
eight cases and 350 lines. Shared route helpers belong in
`Canvas.test.support.tsx` only after they have at least two real consumers.

Canvas startup and draft-recovery architecture tests are split by semantics:

- `canvasStartupBootstrapPublication.architecture.test.ts`
- `canvasDraftRecoveryBoundary.architecture.test.ts`
- `canvasRoutePosturePriority.architecture.test.ts`

Do not recreate `Canvas.routeStates.test.tsx` or
`canvasStartupAndDraftRecovery.architecture.test.ts` as catch-all files.

Changed-file routing is feedback infrastructure for local loops and ordinary
web pull requests. The router follows these semantic rules:

- suite catalog, config, and frontend test-governance documentation changes run
  the architecture suite;
- Canvas-scoped source or test changes run the narrow Canvas focus suite that
  matches the file type;
- Monaco-scoped source or test changes run the Monaco focus suite so local
  editor/viewer work does not execute the full presentation lane;
- non-Canvas `.tsx` changes run the presentation suite;
- non-Canvas `.ts` changes run the unit suite;
- non-web changes skip cleanly.

The changed-file router must not replace `test:ci` for pushes to `main`,
manual workflow runs, or root-build-sensitive pull requests. It reduces local
and ordinary pull-request feedback-loop size while the full primary-suite gate
remains available for broad CI routes.

## Backend and worker guidance

Backend and worker tests should prefer explicit harnesses when bootstrapping
runtime collaborators, for example:

- server bootstrap harnesses in `apps/api/test`
- ownership and runtime harnesses in `apps/outbox-worker/test`

The harness should model real boundaries and avoid hidden global state. If a
runtime helper is only valid for one subsystem, keep it in that subsystem.

## Anti-patterns

- adding a new test framework before fixing seams and helper sprawl
- re-declaring the same healthy fixture in many files
- asserting parallel internals in a fixed order when the contract does not
  require it
- using giant inline setup blocks instead of small builders with overrides
- keeping a shared helper in a global location before it has multiple stable
  consumers

## Current rollout

This architecture is adopted incrementally.

- `apps/web` is the first frontend rollout area
- `platform-health` is the pilot capability
- backend and worker harnesses remain local until repeated patterns justify
  promotion

When touching an area with disordered tests, prefer improving structure as part
of the change instead of adding one more ad hoc helper.
