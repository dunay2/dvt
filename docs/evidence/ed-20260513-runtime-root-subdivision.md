---
title: Runtime root subdivision
status: Accepted
date: 2026-05-13
owners:
  - '@dvt/engine'
  - '@dvt/cli'
  - Architecture / Runtime
arc_level: ARC-2
breaking: false
code_refs:
  - docs/planning/status/system-governance-unit-index.units.yaml
  - scripts/check-governance-unit-coverage.test.cjs
  - packages/@dvt/engine/src/index.ts
  - packages/@dvt/cli/src/index.ts
evidence:
  tests:
    - node --test scripts/check-governance-unit-coverage.test.cjs
    - pnpm docs:governance:unit-coverage
    - pnpm --filter @dvt/cli test
---

# Runtime Root Subdivision Evidence

This evidence records the governance split of `SYS-RUNTIME-ROOT` from broad
file-owning component to grouping module with package-level runtime component
owners.

## Scope

- `SYS-RUNTIME-ROOT` now owns no files.
- Runtime package files are owned by package-level governance components.
- Plan-store engine fetch and plan-ref policy files remain owned by
  `SYS-PLANSTORE-ENGINE-FETCH`.
- Runtime package entrypoints declare short `@ownedConcern` docblocks.
- `@dvt/cli` no longer exports a placeholder symbol; it declares honest
  script-surface metadata.

## Result

The semantic architecture test proves real tracked files resolve to the new
runtime component owners and that the plan-store exception is preserved.
