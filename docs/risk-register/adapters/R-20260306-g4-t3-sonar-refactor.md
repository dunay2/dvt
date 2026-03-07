---
id: R-20260306-G4-T3-01
title: Temporal adapter lint gate drift on workspace aliases
status: Mitigated
date: 2026-03-06
owners:
  - adapter-temporal
severity: Medium
probability: Medium
---

# R-20260306-G4-T3-01 - Temporal adapter lint gate drift on workspace aliases

## Context

The changed-file CI lint job resolves imports from the root TypeScript configuration.
When `@dvt/plan-interpreter` was missing from root `tsconfig.json` paths, lint results
depended on whether workspace package `dist` artifacts had been built before lint.

## Risk

PRs touching Temporal workflow files can fail in CI for configuration reasons unrelated
to source correctness, increasing merge latency and hiding real regressions.

## Mitigation

- Added root path aliases for `@dvt/plan-interpreter` and `@dvt/plan-interpreter/*`.
- Verified resolver output maps to `packages/@dvt/plan-interpreter/src/index.ts`.
- Verified `@dvt/adapter-temporal` test suite passes after the configuration fix.

## Evidence

- `tsconfig.json`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- GitHub Actions run `22770527589` (`ESLint + Prettier (changed files)`)

## Closure

Mitigated and closed on 2026-03-07 after validation with adapter-temporal package tests.
