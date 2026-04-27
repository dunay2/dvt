---
title: Temporal continue payload env propagation closeout
status: Accepted
owner: Runtime
last_reviewed: 2026-04-27
planning_type: closeout
---

# Temporal Continue Payload Env Propagation Closeout

**Plan-driven. Outcome-agnostic.**

## Think-First Analysis

### Problem Summary

`TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` is implemented in
`@dvt/adapter-temporal` and covered by adapter config tests, but the API and
temporal-worker composition roots do not expose or pass the env var. The runtime
cannot configure the continue-as-new payload guard from the real deployable
processes.

### Root Cause

The adapter-level config grew a governed continue-as-new payload budget after
the PlanRef/cursor hardening work, but the downstream env schemas and factories
were not updated in the same slice. That left a partial seam: package-level code
accepts the setting, while production-facing composition roots silently rely on
the derived default.

### Constraints And Invariants

- ADR-0012: plan integrity remains PlanRef-owned; runtime fetches must validate
  immutable plan bytes.
- ADR-0014: adapters start runs from `PlanRef` plus context, not from full
  `ExecutionPlan` payloads.
- `AR-D-PLAN-POINTER`: workflow start and rollover input must stay bounded.
- The fix must not touch adapter contract shape, engine contract shape, or ARC-2
  paths.
- No hook, lint, type, test, or prepush rule may be relaxed.

### Options Considered

| Option                                     | Result   | Rationale                                                                                       |
| ------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| Add env propagation in API and worker only | Selected | Closes the real deployability gap without changing adapter behavior.                            |
| Change adapter defaults                    | Rejected | Does not expose explicit runtime governance and would blur the `AR-D2` threshold decision.      |
| Add a new config abstraction               | Rejected | The existing `loadTemporalAdapterConfig` env-shaped seam is already established and sufficient. |

### Selected Option

Add `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` to both process env schemas,
pass it through to `loadTemporalAdapterConfig`, and add tests that fail before
implementation in API and temporal-worker.

## Pre-Implementation Brief

- mode: `Slim`
- scope:
  - `apps/api/src/plugins/env.ts`
  - `apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts`
  - `apps/api/test/plugins/env.test.ts`
  - `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
  - `apps/temporal-worker/src/plugins/env.ts`
  - `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`
  - `apps/temporal-worker/test/plugins/env.test.ts`
  - `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts`
- expected outcome: deployable API and worker processes can set
  `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES` and the value reaches
  `TemporalAdapterConfig.workflowBudget.maxContinueAsNewPayloadBytes`.
- risks and mitigations:
  - risk: factory tests couple to dynamic imports; mitigation: use the existing
    provider factory seam and assert observable config on the adapter instance.
  - risk: over-expanding the slice into `AR-D2`; mitigation: do not change
    `continueAsNewAfterLayerCount` defaults or semantics.
- out of scope:
  - Temporal integration test for actual `continueAsNew`.
  - Rewriting `temporal-adapter-spec.md`.
  - DBT adapter decoupling.
- validation plan:
  - `pnpm --filter dvt-api test -- test/plugins/env.test.ts test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
  - `pnpm --filter dvt-temporal-worker test -- test/plugins/env.test.ts test/runtime/createTemporalWorkerRuntime.test.ts`
  - `pnpm test:api`
  - `pnpm --filter dvt-temporal-worker test`
  - `pnpm test:adapter-temporal`
  - `pnpm lint`
  - `pnpm type-check`
  - `pnpm verify:prepush`
- test coverage plan:
  - API env schema accepts the new variable.
  - API Temporal factory passes the variable into adapter config.
  - Worker env schema accepts the new variable.
  - Worker runtime passes the variable into host config.
- libraries evaluated: none; this is propagation through existing config seams.

## Implementation Summary

The slice closes the composition-root gap identified in the 2026-04-27
`AR-D-PLAN-POINTER` Fowler hard QA:

- API env loading now preserves `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.
- API Temporal provider factory passes the env value into
  `loadTemporalAdapterConfig`.
- Temporal worker env loading now preserves
  `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.
- Temporal worker runtime passes the env value into `loadTemporalAdapterConfig`,
  so `TemporalWorkerHostConfig.temporalConfig.workflowBudget` receives the
  operator-configured budget.

No adapter contract shape, engine contract shape, Temporal workflow input shape,
or `continueAsNewAfterLayerCount` default changed.

## TDD Evidence

Tests were written and run before implementation.

Red failures observed:

- API env test returned `undefined` for
  `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.
- API factory test showed `loadTemporalAdapterConfig` was called without
  `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.
- Worker env test returned `undefined` for
  `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.
- Worker runtime test received the derived default `500000` instead of the
  configured `64000`.

Green result after implementation:

- API targeted tests passed: 2 files, 6 tests.
- Worker targeted tests passed: 2 files, 13 tests.

## Files Changed

- `apps/api/src/plugins/env.ts`
- `apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts`
- `apps/api/test/plugins/env.test.ts`
- `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `apps/temporal-worker/src/plugins/env.ts`
- `apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts`
- `apps/temporal-worker/test/plugins/env.test.ts`
- `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts`
- `docs/planning/closeouts/20260427-temporal-continue-payload-env-propagation-closeout.md`
- `docs/planning/reviews/architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md`
- `docs/planning/state/agent-lane-d.yaml`

## Validation Evidence

- `pnpm --filter dvt-api test -- test/plugins/env.test.ts test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
  - Passed: 2 files, 6 tests.
- `pnpm --filter dvt-temporal-worker test -- test/plugins/env.test.ts test/runtime/createTemporalWorkerRuntime.test.ts`
  - Passed: 2 files, 13 tests.
- `pnpm exec prettier --check apps/api/src/modules/providerAdapters/createTemporalProviderAdapterFactory.ts apps/api/src/plugins/env.ts apps/api/test/plugins/env.test.ts apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts apps/temporal-worker/src/plugins/env.ts apps/temporal-worker/src/runtime/createTemporalWorkerRuntime.ts apps/temporal-worker/test/plugins/env.test.ts apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.test.ts docs/planning/closeouts/20260427-temporal-continue-payload-env-propagation-closeout.md docs/planning/reviews/architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md docs/planning/reviews/review-status-board.md docs/planning/state/agent-lane-d.yaml`
  - Passed.
- `pnpm lint:md`
  - Passed: 1370 files, 0 errors.
- `pnpm docs:sync:check`
  - Passed.
- `pnpm docs:workboard:check`
  - Passed.
- `pnpm test:api`
  - Passed: 110 files, 560 tests, 19 skipped.
- `pnpm --filter dvt-temporal-worker test`
  - Passed: 4 files, 16 tests.
- `pnpm test:adapter-temporal`
  - Passed: 22 files, 179 tests.
- `pnpm lint`
  - Passed.
- `pnpm docs:quality:check`
  - Passed with pre-existing repository warnings.
- `pnpm docs:doctor`
  - Passed with pre-existing repository warnings.
- `pnpm type-check`
  - Passed.
- `pnpm docs:gov:locations`
  - Passed.
- `pnpm docs:gov:frontmatter`
  - Passed with pre-existing repository warnings.
- `pnpm verify:prepush`
  - Passed. The changed-only detectors reported no changed files because this
    workspace has unstaged/untracked changes; full scope validation above is the
    operative evidence for this closeout.

## Residual Scope

This slice closes only the configuration propagation finding. These items remain
open under `AR-D-PLAN-POINTER`:

- rewrite or supersede the normative Temporal adapter spec;
- add actual Temporal `continueAsNew` integration coverage;
- define replay/cutover posture beyond the drained-deploy line;
- address missing branch-critical gateway-fact negative tests;
- keep the DBT built-in adapter coupling risk explicit until remediated.

## No-Debt And No-Stub Evidence

- No stubs, placeholders, fake adapters, or fake success paths were introduced.
- No hooks, lint, type, test, or prepush rules were disabled.
- No runtime budget default was weakened.
- No adapter, engine, or contract boundary was widened.
