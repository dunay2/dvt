---
slice: 20260420-adapter-temporal-canonical-test-route-cleanup
date: 2026-04-20
author: AI (GPT-5)
last_reviewed: 2026-04-20
status: Completed
---

# Closeout: Adapter Temporal Canonical Test Route Cleanup

## Think-First Analysis

- Problem summary:
  The active `@dvt/adapter-temporal` test harness still exposes multiple helper
  routes and incomplete doubles that no longer match the canonical contract
  shapes. The resulting drift shows up as editor diagnostics around branded
  strings, generic plugin contexts, incomplete idempotency/clock doubles, and
  positional helper signatures that are harder to maintain than the underlying
  binding model.
- Root cause:
  Test helpers evolved incrementally while runtime and contract boundaries were
  tightened. The shared helpers still carry a legacy split between single-run
  and multi-run DBT wiring, and some test doubles only implement the subset of
  production contracts that earlier tests happened to exercise. The editor is
  surfacing that mismatch before the runtime does.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/guides/testing-and-ci-capabilities.md`;
  `docs/adr/ADR-0001-temporal-integration-test-policy.md`;
  `docs/adr/ADR-0005-contract-formalization-tooling.md`;
  `docs/adr/ADR-0010-run-event-envelope-split.md`;
  `docs/adr/ADR-0011-run-started-ownership.md`;
  `docs/adr/ADR-0012-plan-integrity-ownership.md`.
- Options considered:
  1. Keep the current helper surface and patch each test with local casts or
     guards.
  2. Add overloads on top of the current helper surface so both old and new
     call paths coexist.
  3. Collapse the DBT test helper surface into one canonical binding-based
     route, complete the missing engine-contract methods in the doubles, and
     migrate affected tests to that single path.
- Selected option and rationale:
  Option 3. The binding model is already the real source of truth in the helper
  internals. Keeping multiple public routes or patching tests individually
  would preserve legacy shape drift instead of removing it.
- Rejected alternatives:
  Option 1 would leave repetitive local type escapes. Option 2 would preserve
  dual-path helper maintenance and delay the cleanup the editor is already
  signaling.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Replace legacy DBT test helper entry points with a single canonical
  binding-based route, align runtime test doubles with the full engine
  contracts, and migrate the affected integration/unit tests to the new path.
- Touched files or paths:
  `packages/@dvt/adapter-temporal/test/helpers/integration/runtimeState.ts`,
  `packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts`,
  `packages/@dvt/adapter-temporal/test/helpers/integration/dbtRuntimeFixtures.ts`,
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`,
  `packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts`,
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`,
  `packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts`,
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`.
- Expected outcome:
  The test harness exposes one canonical DBT activity-deps API, legacy helper
  wrappers are removed, and the affected tests compile and run without local
  casts or stale branded-string mismatches.
- Risks and mitigations:
  Removing helper routes can ripple through many tests. Mitigation: migrate all
  current consumers in the same slice, keep the new helper API structurally
  simple, and validate both unit and integration suites for `@dvt/adapter-temporal`.
- Out-of-scope:
  Production adapter behavior changes, contract schema changes, and unrelated
  dirty worktree edits outside this test/helper slice.
- Validation plan:
  `pnpm --filter @dvt/adapter-temporal typecheck:test`;
  `pnpm --filter @dvt/adapter-temporal test`;
  `pnpm --filter @dvt/adapter-temporal test:integration`;
  `pnpm --filter @dvt/adapter-temporal test:integration:transformation`;
  `pnpm --filter @dvt/adapter-temporal test:integration:postgres`;
  `pnpm docs:sync`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Preserve the existing regression scenarios while migrating them to the new
  helper route. Keep explicit assertions for registered plan-byte lookup,
  registered run-execution-context resolution, cancellation ordering, and
  transformation result evidence.
- Libraries evaluated:
  None evaluated - no custom implementation.

## Implementation Outcome

- Canonical DBT test wiring now goes through one public helper route:
  `createDbtActivityDeps({ store, outbox, bindings, dbtPluginRunner? })`.
- The shared integration barrel no longer re-exports the legacy multi-run DBT
  helper path.
- Runtime test doubles now satisfy the current engine contracts:
  `TestClock.nowIsoUtc()` returns an `IsoUtcString` and `TestIdempotency`
  implements `startRunIntentId(...)`.
- DBT fixture tests now narrow plugin context through
  `resolveDbtPluginContext(...)` instead of reaching into generic plugin
  context records as if they were already strongly typed.
- Integration tests were migrated to binding-based activity-deps wiring and the
  heaviest cancellation scenario setup was extracted into a dedicated harness so
  the remaining spec focuses on lifecycle assertions instead of legacy worker
  plumbing.
- Transformation evidence fixtures and `withAbortSignal` mocks were aligned to
  the branded contract surfaces instead of relying on plain strings or
  `Promise<unknown>`-shaped generics.

## Actual Files Changed In This Slice

- `packages/@dvt/adapter-temporal/test/helpers/integration/runtimeState.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
- `packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts`
- `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`

## Validation Results

- Passed: `pnpm --filter @dvt/adapter-temporal typecheck:test`
- Passed: `pnpm --filter @dvt/adapter-temporal test`
- Passed: `pnpm --filter @dvt/adapter-temporal test:integration:local`
- Passed: `pnpm --filter @dvt/adapter-temporal test:integration:transformation:local`
- Passed: `pnpm --filter @dvt/adapter-temporal test:integration:postgres`
- Passed: `pnpm docs:sync`
- Passed: `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No legacy DBT helper wrapper was kept alive in the shared test surface.
- No lint/type/test rules were relaxed and no hooks were bypassed.
- No placeholder, fake success path, or TODO/FIXME branch was introduced.
- The repository already contained unrelated dirty worktree changes outside this
  slice; they were left intact and not reverted.

## Follow-Up Note

- A same-day follow-up removed one remaining stale `TemporalAdapter` test
  construction in `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
  where the test still passed `stateStore` and `projector` into
  `new TemporalAdapter(...)` even though those deps are no longer part of
  `TemporalAdapterDeps`.

## SRP Follow-Up Think-First Analysis

- Problem summary:
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
  still mixes too many responsibilities: scenario intent, Temporal runtime
  setup, plan/binding wiring, worker bootstrapping, and lifecycle assertions.
- Root cause:
  The file kept absorbing setup logic test by test. Even after the canonical
  DBT binding cleanup, the repetitive single-run harness construction remained
  inline across most scenarios.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/adr/ADR-0001-temporal-integration-test-policy.md`;
  `docs/adr/ADR-0010-run-event-envelope-split.md`;
  `docs/adr/ADR-0011-run-started-ownership.md`.
- Options considered:
  1. Keep the file structure and extract only a few tiny local helpers.
  2. Split every scenario into its own file.
  3. Move the reusable single-run Temporal/DBT harness construction into the
     shared integration helper barrel and leave the spec file focused on
     scenario behavior.
- Selected option and rationale:
  Option 3. It reduces duplication materially without fragmenting the suite
  into too many files or hiding behavior behind overly small wrappers.
- Rejected alternatives:
  Option 1 would leave most setup duplication intact. Option 2 is a larger test
  topology change than needed for this slice.

## SRP Follow-Up Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Extract reusable single-run Temporal integration harness setup from
  `integration.time-skipping.test.ts` into shared helpers and rewrite the spec
  to consume that harness.
- Touched files or paths:
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`,
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`.
- Expected outcome:
  The time-skipping integration spec reads as scenario-focused tests, with the
  common env/store/outbox/worker/adapter bootstrapping removed from most cases.
- Risks and mitigations:
  Over-abstracting the harness could hide per-test intent. Mitigation: keep the
  extracted helper narrow, single-run only, and let scenario-specific control
  flow stay inside the spec.
- Out-of-scope:
  Splitting the suite into multiple files, changing production adapter behavior,
  or rewriting the multi-run cancellation-specific helper shape.
- Validation plan:
  `pnpm --filter @dvt/adapter-temporal typecheck:test`;
  `pnpm --filter @dvt/adapter-temporal test:integration:local`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Preserve all existing scenarios in `integration.time-skipping.test.ts` and
  confirm the refactor does not change lifecycle assertions, cancellation
  ordering, restart behavior, or pause/resume deduplication coverage.
- Libraries evaluated:
  None evaluated - no custom implementation.

## SRP Follow-Up Outcome

- The reusable single-run Temporal/DBT integration harness now lives in
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts` as
  `createSingleRunDbtTimeSkippingHarness(...)`.
- `integration.time-skipping.test.ts` now uses the shared harness for the
  single-run scenarios, including restart and step-blocking cases, instead of
  rebuilding env/store/outbox/worker/adapter wiring inline in each test.
- The spec still keeps one local multi-run cancellation harness because that
  case genuinely owns distinct run-context wiring and would become harder to
  read if forced through the single-run abstraction.
- After the extraction, the file retains only one inline Temporal runtime
  bootstrap path instead of repeating that setup across most scenarios.

## SRP Follow-Up Files Changed

- `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
- `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`

## SRP Follow-Up Validation Results

- Passed: `pnpm --filter @dvt/adapter-temporal typecheck:test`
- Passed: `pnpm --filter @dvt/adapter-temporal test`
- Passed: `pnpm --filter @dvt/adapter-temporal test:integration:local`
- Passed: `pnpm --filter @dvt/adapter-temporal test:integration:transformation:local`
- Passed: `pnpm --filter @dvt/adapter-temporal test:integration:postgres`
- Passed: `pnpm verify:prepush`

## Barrel Hygiene Follow-Up

- Root cause:
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`
  still imported several symbols only to re-export them, which kept the
  compatibility barrel noisier than necessary and tripped the `export...from`
  hygiene warning.
- Change made:
  The shared barrel now imports only symbols it uses locally for the
  single-run harness implementation and re-exports the remaining public test
  helpers directly from their canonical source modules, including the last
  `TestProjector` re-export that was still coming through an unnecessary
  local import.
- Files changed:
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`.
- Fresh validation:
  Passed `pnpm --filter @dvt/adapter-temporal typecheck:test`;
  passed `pnpm --filter @dvt/adapter-temporal test`;
  passed `pnpm --filter @dvt/adapter-temporal test:integration:local`;
  passed `pnpm --filter @dvt/adapter-temporal test:integration:transformation:local`;
  passed `pnpm --filter @dvt/adapter-temporal test:integration:postgres:local`;
  passed `pnpm verify:prepush`.

## LookupRunRef Size And Typing Follow-Up

- Root cause:
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`
  had grown to 409 lines and mixed three concerns: lookup reconciliation,
  timeout/abort wiring, and provider-status diagnostics. It also used
  `vi.fn(async <R>(...))` without the generic mock signature that the
  `WorkflowClientLike.withAbortSignal?<R>(...)` contract requires, which is
  why the editor surfaced the generic assignability error in the screenshot.
- Change made:
  Introduced a focused harness at
  `packages/@dvt/adapter-temporal/test/helpers/lookupRunRefHarness.ts`,
  switched the abort helper to `vi.fn<WithAbortSignalLike>(...)`, reduced the
  lookup spec to integration-owned cases, and moved
  `getProviderStatusView` assertions into
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.getProviderStatusView.test.ts`.
  The detailed not-found code normalization matrix remains owned by
  `packages/@dvt/adapter-temporal/test/temporalErrorPolicy.test.ts`, so the
  lookup spec no longer duplicates that same branch table.
- File-size outcome:
  `lookupRunRefHarness.ts` = 89 lines;
  `TemporalAdapter.lookupRunRef.test.ts` = 174 lines;
  `TemporalAdapter.getProviderStatusView.test.ts` = 66 lines.
- Files changed:
  `packages/@dvt/adapter-temporal/test/helpers/lookupRunRefHarness.ts`,
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`,
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.getProviderStatusView.test.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`.
- Fresh validation:
  Passed `pnpm exec eslint packages/@dvt/adapter-temporal/test/helpers/lookupRunRefHarness.ts packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts packages/@dvt/adapter-temporal/test/TemporalAdapter.getProviderStatusView.test.ts --max-warnings 0`;
  passed `pnpm --filter @dvt/adapter-temporal typecheck:test`;
  passed `pnpm --filter @dvt/adapter-temporal test`.

## LookupRunRef Mock Typing Follow-Up

- Root cause:
  `createWithAbortSignalMock(...)` returned a hand-written intersection type
  instead of Vitest's native mock type, so the editor flagged the return value
  from `vi.fn<WithAbortSignalLike>(...)` as incompatible with the declared
  signature.
- Change made:
  Switched the helper return type to `Mock<WithAbortSignalLike>` and imported
  the Vitest `Mock` type directly, aligning the helper with the framework's
  real mock contract instead of a synthetic `ReturnType<typeof vi.fn> & ...`
  approximation.
- Files changed:
  `packages/@dvt/adapter-temporal/test/helpers/lookupRunRefHarness.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-canonical-test-route-cleanup-closeout.md`.
- Fresh validation:
  Pending below in this follow-up slice.
