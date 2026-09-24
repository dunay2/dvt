---
title: Close TF-A2-C2 planner executable-subgraph derivation
status: Accepted
date: 2026-04-23
owners:
  - packages/@dvt/planner
  - docs
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/planner/src/application/ExecutableSubgraphDeriver.ts
  - packages/@dvt/planner/test/unit/executable-subgraph-deriver.test.ts
  - packages/@dvt/planner/test/unit/executable-subgraph-deriver.architecture.test.ts
  - docs/architecture/components/planner/executable-subgraph-derivation-component.md
  - docs/planning/status/canonical-doc-code-matrix.md
evidence:
  tests:
    - pnpm --filter @dvt/planner test -- executable-subgraph-deriver.test.ts executable-subgraph-deriver.architecture.test.ts
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/planner build
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm docs:gov:manifest
    - pnpm verify:prepush
---

# Summary

This evidence records the ARC-2 validation for the `TF-A2-C2`
planner-owned selected-closure derivation slice.

# What changed

- Added `PlannerFacade#deriveExecutableSubgraph` as the planner public-boundary
  entry point for selected-closure derivation.
- Added `ExecutableSubgraphDeriver` to resolve selected closure from
  `WorkspaceGraphAuthoringDraft` plus `ExecutionSelection`.
- Added semantic coverage for visible-only traversal, dependency gaps, cycle
  detection, downstream closure failures, and architectural ownership.
- Added the planner-local component guide for the derivation seam and updated
  the canonical traceability matrix.

# Validation

- `pnpm --filter @dvt/planner test -- executable-subgraph-deriver.test.ts executable-subgraph-deriver.architecture.test.ts`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter @dvt/planner build`
- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:status:generate`
- `pnpm docs:gov:manifest`
- `pnpm verify:prepush`
