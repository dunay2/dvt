---
title: Close AR-A12-C5 read-boundary purity hardening
status: Accepted
date: 2026-04-12
owners:
  - packages/@dvt/engine
  - apps/api
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/core/WorkflowEngine.ts
  - packages/@dvt/engine/src/core/buildWorkflowEngineFacade.ts
  - apps/api/src/application/services/WorkflowEngineFactory.ts
  - packages/@dvt/engine/test/core/WorkflowEngine.test.ts
  - apps/api/test/application/services/WorkflowEngineFactory.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine build
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm docs:sync
    - pnpm docs:workboard:generate
    - pnpm docs:planning:generated:check
    - pnpm exec markdownlint-cli2 "docs/architecture/system-delivery-status.md" "docs/architecture/system/subsystems/read/index.md" "docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md" "docs/architecture/components/engine/contracts/engine/IProviderAdapter.v1.md" "docs/planning/proposals/mandatory/runtime-and-contracts/ar-a12-c-read-boundary-purity-plan-20260411.md" "docs/evidence/ED-20260412-ar-a12-c5-read-boundary-purity-closeout.md" "docs/risk-register/quality/R-20260412-AR-A12-C-READ-BOUNDARY-PURITY-REGRESSION.yaml"
    - pnpm verify:prepush
---

## Summary

`AR-A12-C5` closes the read-boundary purity wave by turning the narrowed
engine facade into an enforced boundary rather than a doc-only agreement.

The closeout adds executable guards at the engine and API seams so
`IWorkflowEngine` cannot silently regrow:

1. provider-backed enrichment
2. health probing on the public facade
3. low-level collaborator construction inside `WorkflowEngine`

## What changed

1. Engine runtime tests now assert that the public facade exposes only the
   narrowed `IWorkflowEngine` surface and not `getRunEnrichment()` or
   `healthCheck()`.
2. Engine architecture guards now inspect `WorkflowEngine.ts` directly to keep
   low-level collaborator construction and local facade-width regrowth out of
   the implementation file.
3. API factory tests now assert that enrichment and health remain on explicit
   non-facade service boundaries.
4. Active current-status and contract docs now describe the shipped boundary as
   closed rather than as a follow-up still in progress.
5. Lane state and planning closeout now record `AR-A12-C5` as delivered.

## Residual risk posture

The structural risk is now closed for the shipped facade boundary because:

- `IWorkflowEngine` remains commands plus canonical read only
- `IRunEnrichmentService` remains the only enrichment boundary
- `IRunHealthService` remains a non-facade operational boundary
- current docs, lane state, and tests all converge on the same surface

Any future attempt to widen the facade now has to break an explicit regression
guard instead of drifting in silently.
