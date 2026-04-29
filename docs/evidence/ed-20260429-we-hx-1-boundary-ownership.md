---
title: WE-HX-1 boundary ownership
status: Accepted
date: 2026-04-29
owners:
  - packages/@dvt/engine
  - docs/architecture/components/engine
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/ports/IPlanArtifactReader.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/engine/src/security/planIntegrity.ts
  - packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
    - pnpm --filter @dvt/engine test
    - pnpm --filter @dvt/engine typecheck
    - pnpm --filter dvt-api typecheck
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm verify:prepush
---

# WE-HX-1 Boundary Ownership Evidence

## Decision captured

This evidence records the `WE-HX-1` boundary ownership slice. The slice separates
the engine-owned plan artifact reader port from run-state persistence, removes a
duplicate adapter-local `IPlanFetcher` contract, and adds a semantic
architecture guard plus component documentation for the `WorkflowEngine`
external seams.

## What this evidence proves

1. `IRunStateStore` no longer owns or publishes plan artifact reader concerns.
2. `IPlanFetcher`, `StoredPlanArtifact`, and `IPlanIntegrityValidator` live in a
   dedicated engine-owned port module.
3. The unused duplicate adapter-local `IPlanFetcher` contract is removed.
4. The component guide documents public API, invariants, transitions,
   consumers, diagrams, and drift guards for `PlanRef`,
   `runExecutionContextRef`, engine resolver ports, and artifacts readers.

## Validation results

- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts`
  - Passed after the red failure proved the missing port, duplicate adapter file,
    and missing component guide.
- `pnpm --filter @dvt/engine typecheck`
  - Passed.
- `pnpm --filter @dvt/engine test`
  - Passed: 47 files, 378 tests.
- `pnpm --filter dvt-api typecheck`
  - Passed.
- `pnpm docs:workboard:generate`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm docs:sync`
  - Passed.

Final `pnpm verify:prepush` result is recorded in the closeout.
