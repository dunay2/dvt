---
title: Restore ADR-0000 traceability gate on main
status: Accepted
date: 2026-04-23
owners:
  - packages/@dvt/traceability-service
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/traceability-service/package.json
  - tools/ci/workspace-typecheck-contract.test.mjs
  - traceability.manifest.json
  - docs/risk-register/quality/R-20260423-ADR0-TRACEABILITY-GATE-DRIFT.yaml
evidence:
  tests:
    - pnpm traceability:adr0
    - pnpm test:ci-tools
    - pnpm --filter @dvt/contracts --filter @dvt/engine --filter @dvt/adapter-temporal --filter @dvt/adapter-postgres --filter @dvt/traceability-service typecheck
    - pnpm --filter @dvt/contracts --filter @dvt/engine --filter @dvt/adapter-temporal --filter @dvt/adapter-postgres --filter @dvt/traceability-service test
    - pnpm docs:sync
    - GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Restore ADR-0000 Traceability Gate On Main

## Summary

The default branch `CI - Code Quality` failure was rooted in the ADR-0000
traceability gate. `@dvt/traceability-service` built only `@dvt/contracts`
before running the manifest validator, but the service now imports
`@dvt/artifacts` and `@dvt/delivery`. A clean CI runner therefore failed before
the validator could execute.

The fix changes the traceability service `prebuild` hook to build the full
workspace dependency closure for `@dvt/traceability-service` and adds a CI-tool
regression test for that command. After the build root cause was fixed, the
validator exposed real missing ADR-0000 headers in newly governed code; those
headers were added to the affected contract, engine, adapter, Temporal workflow,
and lineage files, and the generated manifest was refreshed.

## Validation Intent

This evidence supports the ARC-2 governed paths touched by the slice:

- `packages/@dvt/contracts/**`
- `packages/@dvt/engine/**`
- `packages/@dvt/adapter-temporal/**`
- `packages/@dvt/adapter-postgres/**`

The primary proof is `pnpm traceability:adr0`, which verifies both the restored
build closure and the ADR-0000 manifest output.

## Residual Risk

The residual risk is future drift between traceability service imports,
workspace prebuild closure, and governed header coverage. That risk is tracked
in `R-20260423-ADR0-TRACEABILITY-GATE-DRIFT`.
