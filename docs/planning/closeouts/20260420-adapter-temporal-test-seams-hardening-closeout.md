---
slice: 20260420-adapter-temporal-test-seams-hardening
date: 2026-04-20
author: AI (GPT-5)
last_reviewed: 2026-04-20
status: Accepted
---

# Closeout: Adapter Temporal Test Seams Hardening

## Think-First Analysis

- Problem summary:
  The active `@dvt/adapter-temporal` test slice shows editor-only diagnostics
  across integration helpers and unit-test doubles even though package
  typecheck is green. The recurring signals are `unknown` plans in harnesses,
  generic `withAbortSignal()` mocks inferred as `Promise<unknown>`, and test
  helper seams whose runtime shape is stricter than their exported types.
- Root cause:
  Recent fixture/canonicalization work tightened runtime behavior but left
  several test seams with broad or indirect types. The helpers still expose
  `unknown` or generic `ActivityDeps` where the concrete test harness always
  provides canonical `ExecutionPlan`, `fetcher`, and `integrity` behavior. The
  mismatch produces IDE friction and complexity warnings around helper assembly.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/guides/testing-and-ci-capabilities.md`;
  `docs/adr/ADR-0001-temporal-integration-test-policy.md`;
  `docs/adr/ADR-0003-execution-model.md`;
  `docs/adr/ADR-0005-contract-formalization-tooling.md`;
  `docs/adr/ADR-0010-run-event-envelope-split.md`;
  `docs/adr/ADR-0011-run-started-ownership.md`;
  `docs/adr/ADR-0012-plan-integrity-ownership.md`.
- Options considered:
  1. Ignore the editor diagnostics because `tsc` currently passes.
  2. Silence the warnings with local casts and non-null assertions in each test.
  3. Harden the shared test seams so harnesses export the concrete contracts
     they already implement, and refactor the noisiest helper to reduce
     accidental complexity.
- Selected option and rationale:
  Option 3. The warnings are symptoms of shared helper drift, not isolated test
  bugs. Tightening the helper contracts once is lower-risk than sprinkling casts
  across call sites and keeps the tests aligned with canonical runtime shapes.
- Rejected alternatives:
  Option 1 would preserve repeated editor noise and hide future drift. Option 2
  would normalize local type escapes instead of fixing the seam that generated
  them.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Harden adapter-temporal test helper contracts and the affected test harnesses
  so they use explicit `ExecutionPlan`, concrete fetch/integrity seams, and
  correctly generic Temporal client mocks.
- Touched files or paths:
  `packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts`,
  `packages/@dvt/adapter-temporal/test/helpers/integration/dbtRuntimeFixtures.ts`,
  `packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts`,
  `packages/@dvt/adapter-temporal/test/integration.postgres.time-skipping.test.ts`,
  `packages/@dvt/adapter-temporal/test/integration.transformation.time-skipping.test.ts`,
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`,
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.lookupRunRef.test.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-test-seams-hardening-closeout.md`.
- Expected outcome:
  The affected tests and helpers use narrow canonical types, the helper API
  reflects the runtime guarantees it actually provides, and the highest-signal
  duplication/complexity hotspots are reduced without changing adapter behavior.
- Risks and mitigations:
  Tightening helper return types can ripple through many tests. Mitigation: keep
  the public helper surface backward-compatible at runtime, make the changes in
  the shared helper layer first, and validate the full package test scope.
- Out-of-scope:
  Production adapter behavior changes, new contract schema work, ARC evidence
  artifacts for a PR, and unrelated dirty worktree edits outside this slice.
- Validation plan:
  `pnpm --filter @dvt/adapter-temporal typecheck:test`;
  `pnpm --filter @dvt/adapter-temporal test`;
  `pnpm docs:sync`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Reuse the existing unit/integration suite as the regression net and keep at
  least one explicit seam assertion where helper consumers call
  `fetchAndValidate(planRef, fetcher)` through the tightened helper contract.
- Libraries evaluated:
  None evaluated - no custom implementation.

## Implementation

- Refactored `test/helpers/integration/testActivities.ts` so the shared test
  harness exports explicit `TestPlanFetcher`, `TestPlanIntegrity`, and
  `TestActivityDeps` contracts. The helper now states that `fetcher` and
  `integrity` are always present and splits plan fetching/run-state assembly
  into focused helpers to reduce accidental complexity.
- Updated `test/helpers/integration/dbtRuntimeFixtures.ts` to return the tighter
  `TestActivityDeps` seam from both single-run and multi-run DBT helpers, so
  downstream tests consume the concrete helper contract instead of a looser
  generic `ActivityDeps`.
- Hardened the affected integration harnesses by typing `plan` as
  `ExecutionPlan` in the Postgres and transformation helpers, matching the
  canonical plan builders they already use.
- Updated the `lookupRunRef` unit tests so `withAbortSignal` mocks carry the
  same generic `<R>` signature as the Temporal SDK helper instead of collapsing
  to `Promise<unknown>`.
- Reduced duplication in `integration.time-skipping.test.ts` by extracting a
  single cancellation-result assertion helper for the paired `signal()` /
  `cancelRun()` scenario.

## Validation Evidence

- `pnpm --filter @dvt/adapter-temporal typecheck:test` - passed
- `pnpm --filter @dvt/adapter-temporal test` - passed
- `pnpm --filter @dvt/adapter-temporal test:integration` - passed
- `pnpm --filter @dvt/adapter-temporal test:integration:transformation` - passed
- `pnpm --filter @dvt/adapter-temporal test:integration:postgres` - passed
- `pnpm docs:sync` - passed
- `pnpm verify:prepush` - passed
  Output note: the repo pre-push gate completed successfully, but its
  `changed-only` subchecks reported `No changed files detected` for that run.
  The package-level typecheck and test commands above are the substantive
  validation evidence for this slice.

## No-Debt / No-Stub Evidence

- No stubs, placeholders, fake adapters, TODOs, or compatibility casts were
  added.
- No hooks, lint rules, type rules, or validation gates were bypassed.
- The fix corrected the shared test seams themselves instead of silencing the
  diagnostics at each call site with non-null assertions or `as any`.
