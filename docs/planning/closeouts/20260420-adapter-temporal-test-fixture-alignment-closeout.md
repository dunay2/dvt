---
slice: 20260420-adapter-temporal-test-fixture-alignment
date: 2026-04-20
author: AI (GPT-5)
last_reviewed: 2026-04-20
status: Accepted
---

# Closeout: Adapter Temporal Test Fixture Alignment

## Think-First Analysis

- Problem summary:
  The active `@dvt/adapter-temporal` test slice had two overlapping issues:
  editor diagnostics around branded contract values (`taskQueue`, `signalId`,
  canonical `ExecutionPlan`) and a hidden fixture drift where plan bytes were
  not valid against the current `ExecutionPlan` contract.
- Root cause:
  Shared test helpers had drifted from the canonical planner/runtime contract.
  `toTemporalTaskQueue()` still exposed a plain `string`, plan factories were
  typed loosely and emitted non-canonical `planVersion`/`planId` metadata, and
  the integration test integrity helper shallow-cast decoded plan JSON instead
  of validating it.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/guides/testing-and-ci-capabilities.md`;
  `docs/adr/ADR-0001-temporal-integration-test-policy.md`;
  `docs/adr/ADR-0005-contract-formalization-tooling.md`;
  `docs/adr/ADR-0010-run-event-envelope-split.md`;
  `docs/adr/ADR-0011-run-started-ownership.md`.
- Options considered:
  1. Quiet the IDE squiggles locally and leave helper behavior unchanged.
  2. Fix the shared helper layer so task queues, signals, and plan fixtures are
     canonical by construction, then validate through the real parser/runtime.
  3. Revert the stricter parser change and keep shallow test-only casting.
- Selected option and rationale:
  Option 2. The parser tightening surfaced a real fixture defect; backing it out
  would keep the suite green for the wrong reason. Fixing the shared helpers
  removes the repeated editor noise and aligns tests with current contracts.
- Rejected alternatives:
  Option 1 would leave invalid plan fixtures in place. Option 3 would re-hide
  contract drift behind test-only casts.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Normalize Temporal adapter test helpers and the time-skipping integration
  slice so they produce and consume canonical `ExecutionPlan` artifacts,
  branded task-queue values, and branded control-signal ids.
- Touched files or paths:
  `packages/@dvt/adapter-temporal/src/WorkflowMapper.ts`,
  `packages/@dvt/adapter-temporal/test/helpers/contractFixtures.ts`,
  `packages/@dvt/adapter-temporal/test/helpers/integration/testActivities.ts`,
  `packages/@dvt/adapter-temporal/test/helpers/integration/testPlans.ts`,
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.shared.ts`,
  `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`,
  `packages/@dvt/adapter-temporal/test/dbtRuntimeFixtures.test.ts`,
  `packages/@dvt/adapter-temporal/test/TemporalAdapter.startRun.test.ts`,
  `packages/@dvt/adapter-temporal/test/workflow-execution-segment.test.ts`,
  `packages/@dvt/adapter-temporal/test/workflowMapper.typecheck.ts`,
  `docs/planning/closeouts/20260420-adapter-temporal-test-fixture-alignment-closeout.md`.
- Risks and mitigations:
  Tightening fixture validation could expose more invalid test data. Mitigation:
  change the shared builders first, rerun the package suite, and only keep the
  parser hardening once all failing fixtures are corrected.
- Out-of-scope:
  Production workflow execution changes, contract schema changes, ARC evidence /
  risk artifacts for a PR, and unrelated worktree edits already present outside
  this slice.

## Implementation

- Changed `toTemporalTaskQueue()` to return the branded
  `TemporalTaskQueueName`, which aligns the mapper with the config contract and
  removes the shared source of queue-type drift.
- Reworked the shared test `createExecutionPlan()` helper so it derives
  canonical content-addressed `planId` values from the actual plan core instead
  of accepting arbitrary friendly strings.
- Updated integration plan builders and `createPlanRef()` so `PlanRef` metadata
  is derived from validated plan bytes, not duplicated magic literals.
- Replaced the shallow JSON cast in the integration `fetchAndValidate` test
  helper with the real `parseExecutionPlan()` contract validator.
- Tightened the integration test slice to send branded `signalId` values and
  kept the gateway fixture valid by using a real hex `inputHashSha256`.
- Added a typecheck-only regression file to keep the helper typings visible to
  the CLI typecheck surface, not just the editor.

## Validation Evidence

- `pnpm --filter @dvt/adapter-temporal build` — passed
- `pnpm --filter @dvt/adapter-temporal typecheck:test` — passed
- `pnpm --filter @dvt/adapter-temporal test` — passed
- `pnpm --filter @dvt/adapter-temporal test:integration` — passed

## No-Debt / No-Stub Evidence

- No stubs, placeholders, fake adapters, or TODO markers were added.
- No hooks or checks were bypassed.
- The fixture/parser mismatch was corrected at the helper boundary instead of
  being masked by looser typing or a restored shallow cast.
