---
title: CLI Package
status: Active
owner: Architecture / Tooling
last_reviewed: 2026-03-08
---

# CLI Package

This page is the canonical documentation entry point for `@dvt/cli`.

## Current Reality

`@dvt/cli` is not yet a real user-facing CLI surface.

Today the workspace is mostly a script bundle:

- the TypeScript entrypoint is a placeholder;
- the useful behavior lives in `validate-contracts.cjs` and
  `run-golden-paths.cjs`;
- the package test is only a smoke test.

That means the workspace matters operationally, but it should not be described
as if it already exposed a stable command interface.

## What It Owns Today

- contract-validation bundle over engine fixtures and contract parsers;
- golden-path hash execution helper;
- package-level script entrypoints used from CI and local validation flows.

## Primary Code Anchors

- Package manifest:
  [packages/@dvt/cli/package.json](../../../packages/@dvt/cli/package.json)
- Placeholder TS entrypoint:
  [packages/@dvt/cli/src/index.ts](../../../packages/@dvt/cli/src/index.ts)
- Contract validation script:
  [packages/@dvt/cli/validate-contracts.cjs](../../../packages/@dvt/cli/validate-contracts.cjs)
- Golden-path execution script:
  [packages/@dvt/cli/run-golden-paths.cjs](../../../packages/@dvt/cli/run-golden-paths.cjs)
- Current smoke test:
  [packages/@dvt/cli/test/smoke.test.ts](../../../packages/@dvt/cli/test/smoke.test.ts)

## Verification

- `pnpm test:cli`
- `pnpm --filter @dvt/cli validate-contracts`

## Open Gaps

- No typed command surface is exported from `src/index.ts`.
- The package name suggests a mature CLI, but the current implementation is
  script-first and still narrow.
- The smoke test proves package wiring, not command-surface behavior.

## Related Docs

- [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Repository Map](../../concepts/repository-map.md)
