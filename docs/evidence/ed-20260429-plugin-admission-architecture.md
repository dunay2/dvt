---
title: Plugin admission architecture hardening
status: Accepted
date: 2026-04-29
owners:
  - '@dvt/engine'
  - '@dvt/adapter-temporal'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/ports/IRunExecutionContextResolver.ts
  - packages/@dvt/engine/test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/DbtCliPluginRunner.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtCliProjectMaterializer.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine exec vitest run ./test/services/RunExecutionContextAdmissionPolicy.srp.architecture.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Plugin Admission Architecture Hardening

## Summary

This evidence covers the Fowler architecture pass that tightened plugin
admission semantics and local component documentation after the DBT runner was
isolated behind plugin-owned boundaries.

## Scope

- Engine admission semantics now carry source and test ownership guards.
- The admission-policy architecture test verifies semantic ownership, component
  documentation, generic plugin wording, and responsibility-specific suites.
- Temporal DBT runner changes remain isolated under the DBT plugin package
  surface.
- Component documentation records API, invariants, transitions, consumers, user
  stories, and diagrams.

## Boundary Statement

The change does not add a new public contract or runtime provider. It hardens
the existing engine and Temporal adapter boundaries so plugin-specific behavior
does not drift back into engine core semantics.
