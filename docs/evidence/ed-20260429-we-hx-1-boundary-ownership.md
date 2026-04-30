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
  - apps/api/src/application/ports/storedPlan.ts
  - packages/@dvt/engine/src/ports/IPlanArtifactReader.ts
  - packages/@dvt/engine/src/ports/IRunStateStore.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/application/RecoverRunApplicationService.ts
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

The follow-up Fowler pass also adds local user stories, stores the architecture
analysis in the governed review mailbox, adds owned-concern module headers to
the touched boundary modules, and removes the API-local redeclaration of
`StoredPlanArtifact`.

## What this evidence proves

1. `IRunStateStore` no longer owns or publishes plan artifact reader concerns.
2. `IPlanFetcher`, `StoredPlanArtifact`, and `IPlanIntegrityValidator` live in a
   dedicated engine-owned port module.
3. The unused duplicate adapter-local `IPlanFetcher` contract is removed.
4. The component guide documents public API, invariants, transitions,
   consumers, user stories, diagrams, and drift guards for `PlanRef`,
   `runExecutionContextRef`, engine resolver ports, and artifacts readers.
5. API validation reuses the engine-owned `StoredPlanArtifact` shape instead of
   publishing an equivalent local DTO.
6. The Fowler review captures mature-system comparison, antipatterns,
   repetitions, drift, applied patterns, opportunities, and future lessons.

## Validation results

- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts`
  - Passed after the red failure proved the missing port, duplicate adapter file,
    and missing component guide.
  - Follow-up red/green proved the missing story/review docs, missing
    owned-concern module docblocks, and API-local `StoredPlanArtifact`
    redeclaration before the branch fixed them.
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
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
  - Passed.
  - Result: `effectiveArcLevel = ARC-2`, `evidenceDoc = true`,
    `riskUpdate = true`.
- `pnpm verify:prepush`
  - Passed after commit.
