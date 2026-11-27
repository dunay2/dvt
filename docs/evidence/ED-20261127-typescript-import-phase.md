---
title: Preserve import classification with TypeScript import phases
status: draft
date: 2026-11-27
owners:
  - Architecture
  - Web
  - API
arc_level: ARC-2
breaking: false
code_refs:
  - tools/ci/check-architecture-dependencies.mjs
  - apps/web/src/testing/vitestSuites.browserRouting.moduleGraph.ts
  - apps/api/test/architecture/duckDbLocalDataRuntime.architecture.test.ts
  - packages/@dvt/engine/test/architecture/StartRunConcernBoundaries.arch.test.ts
evidence:
  tests:
    - pnpm arch:deps
    - pnpm --filter @dvt/web test:architecture:run
    - pnpm --filter dvt-api test:unit duckDbLocalDataRuntime.architecture localDataCaptureComposition.architecture
    - pnpm --filter @dvt/engine test StartRunConcernBoundaries.arch
    - pnpm verify:prepush
---

# Preserve import classification with TypeScript import phases

[Issue #4010](https://github.com/dunay2/dvt/issues/4010) records the migration
and its validation. The Engine architecture test participates in the ARC-2
scope because the policy covers the entire Engine package.

TypeScript 5.9 exposes import phases on the declaration's import clause. The
architecture checks compare that phase with `TypeKeyword` so that only
explicit whole-clause type imports are excluded by that decision. Per-binding
type modifiers and export declarations keep their existing classifications.
The browser routing test exercises type, value, deferred and side-effect
imports against the existing TypeScript parser and runtime dependency reader.

[Import classification risk](../risk-register/typescript-import-phase-20261127.md).
