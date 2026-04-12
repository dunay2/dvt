---
title: Enforce success-only materialization reads across projector, API, and web
status: Accepted
date: 2026-04-12
owners:
  - packages/@dvt/run-domain
  - packages/@dvt/engine
  - apps/api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/run-domain/src/applyRunEvent.ts
  - packages/@dvt/engine/src/core/SnapshotProjector.ts
  - apps/api/src/application/services/getRunStatusUseCase.ts
  - apps/api/src/application/services/runReadEvidenceModel.ts
  - apps/web/src/app/views/runs/RunWorkspaceStateView.tsx
  - apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/run-domain test
    - pnpm --filter @dvt/engine test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api test:arch
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test
    - pnpm docs:workboard:generate
    - pnpm docs:planning:generated:check
    - pnpm exec markdownlint-cli2 "docs/architecture/components/engine/contracts/engine/ExecutionSemantics.v1.md" "docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md" "docs/planning/reviews/execution-runtime/20260409-tf-c2-b-read-surface-hard-qa-review.md"
    - pnpm verify:prepush
---

## Summary

This slice closes the remaining TF-C2-B contradiction where caller-visible run
reads could present `execution.materialization` alongside failure or cancel
state.

The governing runtime rule is now enforced at every caller-visible layer:
materialization evidence is success-only and may be rendered only for
`status = COMPLETED`.

## What changed

1. The shared run-domain projector clears stale materialization evidence on
   failure and cancel paths.
2. The engine snapshot projector omits `execution.materialization` unless the
   canonical snapshot status is `COMPLETED`.
3. The API read surface keeps materialization nested and top-level evidence
   `COMPLETED`-only.
4. The web run workspace hides the materialization panel entirely outside the
   completed state.
5. Risk, planning, and QA-review artifacts now record the closure with the
   actual validation baseline used for the slice.

## Architectural intent

1. Preserve the execution semantics contract so failed and cancelled runs never
   imply sink-success claims.
2. Keep the engine projector as the canonical source of caller-visible truth
   instead of relying on API-only sanitization.
3. Keep UI behavior aligned with the canonical read contract and the updated
   operator-facing Cypress expectation.

## Validation notes

1. Package tests and type-checks passed for the changed runtime and web
   surfaces.
2. The repository `verify:prepush` gate passed after the closeout updates.
3. Targeted local Cypress execution of
   `apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts` remained
   blocked by the local Cypress launcher environment, not by a spec assertion
   failure.
