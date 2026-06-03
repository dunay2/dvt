---
title: Engine artifacts path resolution
status: Accepted
date: 2026-05-10
owners:
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/tsconfig.json
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter dvt-api test -- test/architecture/workspaceFilesQueryRail.architecture.test.ts
    - pnpm test:ci-tools
    - pnpm governance:refresh
    - pnpm verify:prepush
---

## Summary

The engine package imports `@dvt/artifacts` and declares it as a workspace
dependency. Its package TypeScript config now resolves the artifacts package
through the same dist declaration mapping used by the other artifacts
consumers.

## Outcome

- `@dvt/engine` builds after its dependency closure builds `@dvt/artifacts`.
- The change is configuration-only and does not change runtime behavior.
- The fix preserves the package-owned artifact boundary instead of replacing the
  import with a local copy or alternate contract.
