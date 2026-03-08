---
id: R-20260307-GOLDEN-PATH-01
title: Golden-path coverage debt can hide engine and adapter regressions
status: Open
date: 2026-03-07
owners:
  - engine
  - contracts
  - ci
severity: High
probability: Medium
---

# R-20260307-GOLDEN-PATH-01 - Golden-path coverage debt can hide engine and adapter regressions

## Context

The repository already enforces contract and determinism checks in CI, but the
current golden-path set is still narrow. The active baseline mainly covers:

- `plan-minimal`
- `plan-parallel`
- `plan-cancel-and-resume`

This leaves several high-risk execution scenarios either weakly covered or
uncovered in end-to-end deterministic validation.

## Risk

If golden-path coverage stays thin, regressions can land in engine behavior,
adapter behavior, retry flow, multi-tenant isolation, or replay/dead-letter
paths without a strong CI signal.

## Mitigation

- Add a `retry` golden path with controlled failure injection.
- Add at least one deterministic terminal-error golden path.
- Add a multi-tenant isolation golden path.
- Add a dead-letter plus replay golden path that exercises the full contract
  path.
- Keep the `Contracts & Determinism` workflow as the blocking enforcement lane.

## Evidence

- `.github/workflows/contracts.yml`
- `.github/workflows/golden-paths.yml`
- `package.json` (`pnpm golden:validate`)
- `docs/guides/testing-and-ci-capabilities.md`
- `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
- `docs/archive/GOLDEN_PATH_COVERAGE_DEBT_ASSESSMENT_20260307.md`
