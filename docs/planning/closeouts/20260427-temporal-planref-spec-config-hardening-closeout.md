---
title: Temporal PlanRef spec and config hardening closeout
status: Accepted
owner: Runtime
last_reviewed: 2026-04-27
planning_type: closeout
---

# Temporal PlanRef Spec And Config Hardening Closeout

**Plan-driven. Outcome-agnostic.**

## Think-First Analysis

### Problem Summary

The follow-up QA found two defects after the continue payload env propagation
slice:

- the active Temporal adapter spec still described retired full-plan workflow
  input even though ADR-0012, ADR-0014, and code now require `PlanRef` plus
  cursor-only workflow input;
- invalid numeric Temporal env overrides fell back to defaults, allowing typos
  in governed payload and rollover settings to silently weaken runtime posture.

### Root Cause

The PlanRef runtime migration closed the code path before the normative adapter
spec was fully rewritten. Separately, `loadTemporalAdapterConfig` treated env
strings as convenience overrides instead of governed deployment controls, so
invalid present values were indistinguishable from absent values.

### Constraints And Invariants

- ADR-0012: the engine owns authoritative start-run plan integrity; Temporal
  runtime fetches revalidate `PlanRef.sha256`.
- ADR-0014: adapters are run-driven and receive `PlanRef` plus resolved context,
  not full execution plans.
- `AR-D-PLAN-POINTER`: workflow start and rollover input must remain bounded.
- ARC-2 applies because `packages/@dvt/adapter-temporal/**` changed.
- No hooks, lint, type, test, prepush, or ARC requirements may be bypassed.

### Options Considered

| Option                                          | Result   | Rationale                                                                 |
| ----------------------------------------------- | -------- | ------------------------------------------------------------------------- |
| Rewrite the active Temporal spec in place       | Selected | Keeps one canonical normative adapter surface aligned to shipped code.    |
| Archive the spec and create a parallel document | Rejected | Would add navigation churn without changing the active truth requirement. |
| Keep invalid env fallback for convenience       | Rejected | Governed runtime budgets must fail closed when explicitly misconfigured.  |

### Selected Option

Rewrite `temporal-adapter-spec.md` to the current PlanRef-plus-cursor contract,
add negative adapter config tests for invalid numeric env values, implement
strict env parsing, strengthen the API factory test evidence, and update
planning/ARC evidence so the branch can be reviewed without hidden drift.

## Pre-Implementation Brief

- mode: `Full`
- scope:
  - `packages/@dvt/adapter-temporal/src/config.ts`
  - `packages/@dvt/adapter-temporal/test/smoke.test.ts`
  - `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
  - `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
  - planning review, Lane D, closeout, ARC evidence, and risk-register
    surfaces
- expected outcome: the active Temporal adapter spec matches ADR-0012 and
  ADR-0014, and explicitly configured invalid numeric Temporal env values fail
  closed instead of silently falling back to defaults.
- risks and mitigations:
  - risk: spec rewrite could overclaim runtime readiness; mitigation: keep
    actual Temporal `continueAsNew` proof, replay/cutover, gateway-fact, scale,
    and DBT separation items open under Lane D.
  - risk: config hardening could change absent-env behavior; mitigation:
    preserve defaults when env values are absent and reject only present invalid
    values.
- out of scope:
  - actual Temporal time-skipping `continueAsNew` integration proof.
  - replay/cutover runbook implementation.
  - gateway-fact negative test implementation.
  - DBT adapter ownership extraction.
- validation plan:
  - adapter Temporal package tests.
  - API package tests.
  - temporal-worker package tests.
  - root lint and type-check.
  - docs, ARC, generated-state, and prepush checks.
- test coverage plan:
  - negative tests for invalid present continue-as-new payload budget env.
  - negative tests for invalid present continue-as-new layer threshold env.
  - factory evidence that API composition passes the resolved budget into the
    Temporal adapter constructor.
- libraries evaluated: none; this slice hardens established configuration and
  documentation boundaries.

## Implementation Summary

- `temporal-adapter-spec.md` now states that workflow start and continue-as-new
  inputs carry `PlanRef`, resolved context, budget controls, and compact cursor
  state only.
- `loadTemporalAdapterConfig` now rejects invalid present numeric env overrides
  instead of falling back to defaults.
- `adapter-temporal` smoke tests cover invalid continue-as-new budget and layer
  threshold env strings.
- The API Temporal provider factory test now verifies that the resolved config
  reaches the `TemporalAdapter` constructor, not only the config loader input.
- The Temporal adapter spec and new evidence doc use kebab-case filenames so
  changed-doc filename governance passes without exceptions.
- The AR-D review, review status board, and Lane D registry now distinguish
  remediated items from the remaining open runtime proof work.

## TDD Evidence

Red failure observed before implementation:

- `pnpm --filter @dvt/adapter-temporal test -- test/smoke.test.ts`
  - Failed as expected because `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES=typo`
    did not throw and silently used the default budget.

Green result after implementation:

- `pnpm --filter @dvt/adapter-temporal test -- test/smoke.test.ts`
  - Passed: 22 files, 180 tests.
- `pnpm --filter dvt-api test -- test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
  - Passed: 1 file, 1 test.

## Validation Evidence

- `pnpm test:adapter-temporal`
  - Passed: 22 files, 180 tests.
- `pnpm test:api`
  - Passed: 110 files, 560 tests, 19 skipped.
- `pnpm --filter dvt-temporal-worker test`
  - Passed: 4 files, 16 tests.
- `pnpm lint`
  - Passed with `--max-warnings 0`.
- `pnpm type-check`
  - Passed.
- `pnpm lint:md`
  - Passed: 1372 files, 0 errors.
- `pnpm exec prettier --check` against the staged diff
  - Passed.
- `pnpm docs:workboard:check`
  - Passed.
- `pnpm docs:status:check`
  - Passed.
- `pnpm docs:sync:check`
  - Passed after the generated evidence and risk-register indexes were staged.
- `pnpm docs:gov:links`
  - Passed: 0 errors, 0 warnings.
- `pnpm docs:arc:evidence:check`
  - Passed.
- `pnpm docs:quality:check`
  - Passed with pre-existing repository warnings.
- `pnpm docs:doctor`
  - Passed with pre-existing repository warnings.
- `pnpm docs:gov:locations`
  - Passed.
- `pnpm docs:gov:frontmatter`
  - Passed with pre-existing repository warnings.
- `pnpm verify:prepush`
  - Passed. Before the filename fix it failed on changed-doc kebab-case
    enforcement for the Temporal spec and evidence doc; the files were renamed,
    references were updated, and the gate passed on rerun.

## Files Changed

- `docs/architecture/components/engine/adapters/temporal/temporal-adapter-spec.md`
- `packages/@dvt/adapter-temporal/src/config.ts`
- `packages/@dvt/adapter-temporal/test/smoke.test.ts`
- `apps/api/test/modules/providerAdapters/createTemporalProviderAdapterFactory.test.ts`
- `docs/planning/reviews/architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md`
- `docs/planning/reviews/review-status-board.md`
- `docs/planning/state/agent-lane-d.yaml`
- `docs/evidence/ed-20260427-temporal-planref-config-hardening.md`
- `docs/risk-register/quality/R-20260427-TEMPORAL-PLANREF-CONFIG-HARDENING.yaml`

## Residual Scope

`AR-D-PLAN-POINTER` remains open for:

- actual Temporal time-skipping `continueAsNew` integration proof;
- replay/cutover runbook or versioned workflow posture;
- missing branch-critical gateway-fact negative tests;
- deep/wide DAG segment-resolution cost and payload boundedness tests;
- DBT built-in adapter coupling extraction.

## No-Debt And No-Stub Evidence

- No stubs, placeholders, fake adapters, fake success paths, or TODO markers
  were added.
- No hooks, lint, type, test, ARC, or prepush rules were disabled.
- No runtime default was weakened.
- No engine or published contract boundary was widened.
