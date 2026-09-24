---
title: Harden start-run boundary and protected runtime composition seams
status: Accepted
date: 2026-04-22
owners:
  - apps/api
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts
  - packages/@dvt/contracts/src/schema-packs/start-run.ts
  - apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
  - apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts
  - apps/api/src/modules/buildProtectedRuntimeModule.ts
  - apps/api/test/modules/protectedRuntimeDependencyBuilders.cases.ts
  - apps/api/test/modules/startRunRuntimeComposition.cases.ts
  - apps/api/docs/start-run-application-component.md
  - apps/api/docs/protected-runtime-dependency-builders-component.md
  - docs/risk-register/quality/R-20260422-START-RUN-BOUNDARY-ADOPTION-DRIFT.yaml
evidence:
  tests:
    - pnpm --filter dvt-api test -- test/modules.test.ts
    - pnpm test:contracts
    - pnpm --filter @dvt/contracts run schema:verify
    - pnpm golden:validate
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - pnpm docs:status:generate
    - pnpm verify:prepush
---

# Summary

This ARC-2 slice hardens the canonical start-run boundary and the API runtime
composition around it in one governed change set.

The contracts layer now owns the canonical `StartRunBoundary.v1` surface, while
`apps/api` consumes that boundary through explicit application ports and named
components instead of app-local command/result shim modules. In parallel, the
protected runtime composition root is decomposed into dedicated builders for
admission, execution, storage, start-run orchestration, and workspace-graph
draft runtime assembly.

# What this evidence closes

1. `@dvt/contracts` is the single canonical source for the shared start-run
   command and result vocabulary used by the API application layer.
2. `apps/api` start-run orchestration is now split into named components with
   local guides, owned-concern docblocks, and semantic architecture tests.
3. The protected runtime root remains an assembler and no longer owns every
   constructor cluster directly.
4. Contract schema sync, contracts package tests, golden validation, and the
   repository pre-push gate all pass against the branch state.

# What remains open

1. Start-run adoption now spans contracts, HTTP entrypoints, application
   services, and protected runtime builders; future changes can still drift if
   consumers reintroduce app-local shims or alternate boundary types.
2. The runtime composition root is materially thinner, but additional
   cross-cutting builder clusters may still deserve promotion into explicit
   components in later Fowler-driven passes.
