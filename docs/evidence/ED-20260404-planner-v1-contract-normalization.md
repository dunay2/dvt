---
title: Planner contract V1 normalization across contracts, planner, and adapters
status: Accepted
date: 2026-04-04
owners:
  - '@dvt/contracts'
  - '@dvt/planner'
  - '@dvt/adapter-postgres'
  - 'dvt-api'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/IExecutionPlanner.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV1.schema.json
  - packages/@dvt/contracts/src/validation.ts
  - packages/@dvt/planner/src/application/PlannerFacade.ts
  - packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts
  - packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts
  - apps/api/src/application/services/PlannerBackedStartRunUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/planner build
    - pnpm --filter @dvt/planner test
    - pnpm verify:prepush
---

# Summary

This slice removes planner-facing `V2` naming drift from active runtime
contracts and consumer paths, and aligns public parsing/schema symbols to the
`V1` canonical line.

# What changed

1. Replaced active planner contract filenames and exports to `V1` variants.
2. Updated parser and schema exports to `parsePlannerInputEnvelopeV1`,
   `parsePlannerBuildResultV1`, and matching schema symbols.
3. Propagated type/import updates across planner, API bridge, artifacts helper,
   and adapter-postgres plan-store mapping paths.
4. Updated touched active docs to reference the canonical `V1` contract paths.

# Validation notes

- Contract and planner package builds/tests pass after normalization.
- Repository pre-push gate (`pnpm verify:prepush`) passes with changed-file
  lint, format, markdown, and type-check checks.
