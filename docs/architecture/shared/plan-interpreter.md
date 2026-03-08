---
title: Plan Interpreter Package
status: Active
owner: Architecture / Adapter Runtime
last_reviewed: 2026-03-08
---

# Plan Interpreter Package

This page is the canonical package reference for `@dvt/plan-interpreter`.

## Current Reality

`@dvt/plan-interpreter` is the shared deterministic DAG-analysis package used by
workflow runtimes to interpret plan structure consistently.

It currently provides three key behaviors:

- `planExecutionLayers()`
- `validateDag()`
- `collectDownstreamStepIds()`

These functions are small, but they are structurally important because adapter
behavior diverges if each runtime computes order or downstream reachability in a
different way.

## Primary Code Anchors

- Public package entrypoint:
  [packages/@dvt/plan-interpreter/src/index.ts](../../../packages/@dvt/plan-interpreter/src/index.ts)
- DAG analysis:
  [packages/@dvt/plan-interpreter/src/dagAnalyzer.ts](../../../packages/@dvt/plan-interpreter/src/dagAnalyzer.ts)
- Structured errors:
  [packages/@dvt/plan-interpreter/src/errors.ts](../../../packages/@dvt/plan-interpreter/src/errors.ts)
- Shared types:
  [packages/@dvt/plan-interpreter/src/types.ts](../../../packages/@dvt/plan-interpreter/src/types.ts)
- Package tests:
  [packages/@dvt/plan-interpreter/test/dagAnalyzer.test.ts](../../../packages/@dvt/plan-interpreter/test/dagAnalyzer.test.ts)
- Runtime consumer:
  [packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)

## Verification

- `pnpm --filter @dvt/plan-interpreter test`

## Open Gaps

- The package is now visible, but its governing contract still lives mostly in
  code plus ADR context rather than a dedicated normative spec.
- Any adapter that bypasses this package reintroduces scheduling drift risk.

## Related Docs

- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
- [Repository Map](../../knowledge/REPOSITORY_MAP.md)
