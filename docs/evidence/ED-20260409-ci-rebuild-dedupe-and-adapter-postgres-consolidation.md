---
title: CI rebuild dedupe and adapter-postgres job consolidation
status: Accepted
date: 2026-04-09
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - .github/workflows/ci.yml
  - .github/workflows/contracts.yml
  - .github/workflows/test.yml
  - .github/workflows/pr-quality-gate.yml
  - apps/api/package.json
  - packages/@dvt/adapter-postgres/package.json
  - packages/@dvt/adapter-temporal/package.json
  - packages/@dvt/delivery/package.json
  - packages/@dvt/engine/package.json
  - packages/@dvt/run-domain/package.json
  - scripts/skip-pretest-if-ci.cjs
  - tools/ci/policy/adapter-postgres-relevance.json
  - tools/ci/workflow-pattern-parity.test.mjs
evidence:
  tests:
    - DVT_CI=1 pnpm --workspace-concurrency=4 --filter "@dvt/adapter-postgres..." --if-present run build
    - DVT_CI=1 pnpm test:adapter-postgres
    - DVT_CI=1 DVT_PG_INTEGRATION=1 DATABASE_URL=postgresql://dvt_test:dvt_test@localhost:5432/dvt_test pnpm test:adapter-postgres
    - pnpm test:ci-tools
    - pnpm verify:prepush
---

## Summary

This slice removes redundant dependency-graph rebuilds from CI package hooks,
removes the contracts artifact shuttle, consolidates the two
`adapter-postgres` jobs into one Postgres-backed test job, and reduces the
timeout of `PR Quality Checks` to better match the actual runtime profile.

The implementation preserves correctness by keeping explicit workspace-graph
build steps in the workflows and gating hook shortcuts behind `DVT_CI`.

## What changed

- Added `scripts/skip-pretest-if-ci.cjs` and wired it into `prebuild`,
  `pretypecheck`, and `pretest` for the affected workspace packages so CI can
  skip redundant rebuilds after an explicit graph build.
- Updated `workspace-ci` to build with `--workspace-concurrency=4` and run
  package typecheck under `DVT_CI=1`.
- Removed the `contract-compile` artifact upload/download cycle from
  `contracts.yml` and compile contracts inline where needed.
- Consolidated `adapter-postgres` smoke and integration execution into one
  Postgres-backed job with one setup, one import-alias guard, one dependency
  graph build, and one full test run.
- Aligned CI policy tooling and parity tests with the consolidated workflow.
- Reduced `PR Quality Checks` timeout from 30 minutes to 10 minutes.

## Expected effect

- Lower wall-clock time on the `workspace-ci` critical path by eliminating
  repeated build-hook work after explicit CI builds.
- Lower compute cost in the `adapter-postgres` lane by removing duplicated
  setup/build/container work.
- No loss of `adapter-postgres` coverage because the consolidated job still
  executes the full suite with `DVT_PG_INTEGRATION=1`.
- Faster failure surfacing when `PR Quality Checks` hangs or stalls.
