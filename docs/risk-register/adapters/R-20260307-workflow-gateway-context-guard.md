---
id: R-20260307-G4-T3-01
title: Gateway context fallback behavior drift in workflow guard hardening
status: Mitigating
date: 2026-03-07
owners:
  - adapter-temporal
severity: Low
probability: Low
---

# R-20260307-G4-T3-01 - Gateway context fallback behavior drift in workflow guard hardening

## Context

`@dvt/adapter-temporal` updates `RunPlanWorkflow.buildGatewayContext` to guard
the first dependency key lookup explicitly before reading
`completedStepResults`.

## Risk

The guard change can accidentally alter fallback semantics for gateway context
resolution when dependency data is absent, which may affect deterministic
gateway decisions in edge cases.

## Mitigation

- Kept fallback behavior as empty object when no dependency context exists.
- Scoped change to a single workflow helper.
- Re-ran adapter-temporal checks:
  - `pnpm eslint packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts --max-warnings 0`
  - `pnpm --filter @dvt/adapter-temporal test`

## Evidence

- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
