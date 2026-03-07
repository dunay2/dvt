---
id: R-20260307-STEP-EXECUTOR-REGISTRY-01
title: Step executor injection can drift from production activity behavior
status: Mitigating
date: 2026-03-07
owners:
  - adapter-temporal
severity: Medium
probability: Medium
---

# R-20260307-STEP-EXECUTOR-REGISTRY-01 - Step executor injection can drift from production activity behavior

## Context

`createActivities` now supports an injected step executor registry so tests can simulate
retryable and non-retryable step failures without mutating execution plan fixtures through
the `simulateError` field.

## Risk

If test-only executors diverge from the default registry semantics, integration coverage can
report green while production activity dispatch follows a different failure path.

## Mitigation

- Keep the default executor registry explicit and exported from the production module.
- Compose test executors in front of the production defaults instead of replacing the full chain.
- Wire the executor override through `TemporalWorkerHost` so integration tests exercise the same activity factory path used in production worker startup.

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts`
- `packages/@dvt/adapter-temporal/test/helpers/testExecutors.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
- `packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts`
