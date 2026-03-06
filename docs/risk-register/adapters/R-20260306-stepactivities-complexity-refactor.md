---
id: R-20260306-G4-T4-02
title: Step activity behavior drift after complexity refactor
status: Mitigating
date: 2026-03-06
owners:
  - adapter-temporal
severity: Medium
probability: Low
---

# R-20260306-G4-T4-02 - Step activity behavior drift after complexity refactor

## Context

`@dvt/adapter-temporal` refactors `stepActivities.executeStep` and
`isExecutionPlan` into smaller helper methods to reduce cyclomatic complexity
and static-analysis noise.

## Risk

Behavior can drift during method extraction, especially around:

- simulated transient/permanent step failures,
- gateway DSL evaluation and error wrapping,
- execution plan shape validation and metadata guards.

A drift in any of these paths can produce incorrect event flow or mismatched
error semantics.

## Mitigation

- Kept error types/messages unchanged while extracting helpers.
- Preserved gateway evaluation boundary and non-retryable failure semantics.
- Verified package tests pass after refactor (`pnpm --filter @dvt/adapter-temporal test`).

## Evidence

- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `packages/@dvt/adapter-temporal/test/activities.test.ts`
