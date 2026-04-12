---
title: Formalize shared start-run command and result boundary
status: Accepted
date: 2026-04-12
owners:
  - packages/@dvt/contracts
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/contracts/src/validation.ts
  - apps/api/src/entrypoints/http/startRunRoutePlanSourcePolicy.ts
  - apps/api/src/application/ports/startRunCommandContract.ts
  - apps/api/src/application/ports/startRunResultContract.ts
  - apps/api/src/application/services/engineStartRunUseCase.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:planning:generated:check
    - pnpm docs:arc:evidence:check
    - pnpm exec markdownlint-cli2 "docs/architecture/components/api/api-current-to-target-architecture.md" "docs/architecture/components/engine/contracts/engine/IWorkflowEngine.v1.md" "docs/architecture/components/engine/contracts/engine/StartRunProtocol.v1.md" "docs/architecture/components/engine/contracts/engine/StartRunBoundary.v1.md" "docs/architecture/system-delivery-status.md" "docs/planning/state/agent-lane-a.yaml" "docs/evidence/ED-20260412-ar-a10-start-run-boundary-contract.md" "docs/risk-register/quality/R-20260412-AR-A10-START-RUN-BOUNDARY-CONTRACT-DRIFT.yaml"
    - pnpm verify:prepush
---

## Summary

`AR-A10` removes the last app-local ownership of the API start-run transport
shape.

`StartRunCommand` and `StartRunResult` now live in `@dvt/contracts` with shared
schemas, shared parse helpers, and package-level contract tests. `apps/api`
keeps only thin re-export files for import stability while consuming the shared
source of truth.

## What changed

1. Added a canonical start-run boundary contract under
   `packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts`.
2. Added `StartRunCommandSchema`, `StartRunResultSchema`,
   `parseStartRunCommand(...)`, and `parseStartRunResult(...)`.
3. Added shared fixtures and contract tests in `packages/@dvt/contracts/test`.
4. Replaced app-local `startRunCommandContract.ts` and
   `startRunResultContract.ts` definitions with re-exports from
   `@dvt/contracts`.
5. Preserved canonical `PlanRef` metadata (`sizeBytes`, `expiresAt`) through
   the API start-run orchestration boundary before the final bridge into
   `IWorkflowEngine.startRun(planRef, context)`.
6. Published a dedicated reference document for the wider API-to-engine
   start-run boundary and linked it from the active engine contract docs.

## Residual risk posture

The boundary drift risk is now materially reduced because:

- the command/result vocabulary is versioned in the shared contract package
- shared schemas and parse helpers now define the canonical reusable validation line for the boundary
- API route parsing enforces the same persisted-plan vs planner-backed branch rule
- contract tests now cover both command branches and all result kinds
- API code no longer owns semantic copies of the boundary definitions

The remaining risk is regression through future reintroduction of app-local
shadow types, captured as a closed ARC quality entry.
