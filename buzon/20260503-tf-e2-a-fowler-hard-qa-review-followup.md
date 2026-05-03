# TF-E2-A Fowler Hard QA Review Follow-up

Date: 2026-05-03
Scope: Canvas draft posture, startup readiness, workspace projection fixtures, route interaction, strategy resolution.

## Executive Result

The slice has strong governance mechanization coverage, but still shows
implementation and architecture debt in SRP boundaries, test fixture
composability, and planning traceability for newly identified debt documents.

## Findings

1. Governance drift for newly captured debt docs:

- New debt plans exist but are not yet integrated in canonical planning route
  surfaces (`portfolio-map`, lane planning state).

1. Pre-push quality gate can pass while skipping changed-file lint/type checks:

- `verify:prepush` succeeded with messages indicating changed-file checks were
  skipped.
- This weakens confidence if the working tree differs from staged diff.

1. SRP breach in `canvasDraftPersistenceRuntime.ts`:

- Debounce lifecycle, save-attempt identity ledger, readiness policy, and draft
  resolution projection are mixed in one module.

1. High branch complexity in `canvasActiveGraphStrategy.ts`:

- `resolveActiveCanvasGraphStrategy` combines fallback mode resolution, plugin
  availability checks, unsupported-kind checks, and return-shape projection.

1. Readability drift in `canvasRouteInteractionState.ts`:

- Nested ternary and broad interaction state derivation in one path reduce
  maintainability.

1. Fixture monolith in
   `workspaceGraphDraftProjectionExpected.test.fixtures.ts`:

- One large expected graph builder increases drift risk and lowers reuse.

1. Architecture test historical coupling:

- Startup and draft recovery architecture test references a specific historical
  mailbox artifact, reducing review-source flexibility.

1. Owned concern consistency gap:

- Not all touched modules include explicit `Owned concern` docblocks.

## Fowler / DDD / Hexagonal Assessment

### Fowler

- Positive: debt is now being captured explicitly with mechanized manifests.
- Gaps: large-method, data-clump, divergent-change, and feature-envy signals
  remain in runtime and test-fixture layers.

### DDD

- Positive: command-query rail discipline is applied in planning docs.
- Gaps: runtime services still carry mixed policy/orchestration concerns that
  should be split into domain policies and projection services.

### Hexagonal

- Positive: strong architectural guardrails and anti-drift checks exist.
- Gaps: some UI/runtime helpers cross concern boundaries and should be
  partitioned into clearer ports/policies.

## Test Quality (Including Negative Cases)

Observed:

- Targeted web unit tests and selected Cypress specs passed.
- Architecture and mechanization checks passed for current selected scope.

Gaps:

- Negative tests should be expanded for:
  - stale save-attempt race resolution
  - missing/invalid provider capability metadata
  - fixture boundary violations (monolith fixture reintroduction)
  - route interaction fallback and disabled-plugin state transitions

## Proposed Fix Plan

1. Runtime SRP split (`canvasDraftPersistenceRuntime.ts`)

- Extract `canvasDraftAutosaveSchedulePolicy.ts`
- Extract `canvasDraftSaveAttemptLedger.ts`
- Extract `canvasDraftPersistenceResolution.ts`
- Keep a thin orchestration layer only if needed

1. Strategy complexity reduction (`canvasActiveGraphStrategy.ts`)

- Extract fallback resolution policy
- Extract plugin-disable reason resolver
- Keep final composition function below complexity threshold

1. Route interaction readability (`canvasRouteInteractionState.ts`)

- Replace nested ternary with explicit branch statements
- Extract workbench error derivation helper
- Extract permission gating helper

1. Projection fixture composability

- Add node fixture builders (`source`, `transform`, `sink`)
- Add edge fixture builders
- Build final graph via fixture assembler
- Add architecture test that rejects monolithic fixture literal patterns

1. Governance and planning alignment

- Register new debt docs in `portfolio-map`
- Link debt route into lane planning state
- Keep one canonical active route per debt item

1. Quality gate hardening

- Add a guard that fails when changed-file checks are skipped while `apps/web`
  contains local modifications intended for the active slice

## Expected Value

- Reduced accidental complexity in Canvas draft persistence and route logic
- Better negative-test coverage against regressions
- More composable and maintainable test fixtures
- Stronger consistency between documented promises and executable architecture
  boundaries

## Completion Criteria For This Follow-up Route

- SRP split implemented and covered by tests
- Complexity debt items reduced below configured thresholds
- New negative tests green
- Debt docs integrated in canonical planning routes
- No legacy aliases introduced
- `pnpm verify:prepush` plus targeted web tests and selected Cypress flows pass
