---
title: Plan compile language alignment and normalization ownership ARC-2 evidence
status: Accepted
date: 2026-04-19
owners:
  - apps/api
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/services/CompilePlanUseCase.ts
  - apps/api/src/application/services/planCompilePlannerEnvelopeMapper.ts
  - apps/api/src/entrypoints/http/planCompileRouteInputParser.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanCompileStepTypeConfigs.v1.ts
  - packages/@dvt/contracts/src/index.ts
evidence:
  tests:
    - pnpm docs:workboard:generate
    - pnpm docs:status:generate
    - pnpm docs:sync
    - pnpm exec markdownlint-cli2 "docs/architecture/components/api/index.md" "docs/contracts/planner/index.md" "docs/guides/how-to-add-step-kind-20260406.md" "docs/guides/index.md" "docs/guides/plan-compile-target-architecture-technical-manual-20260417.md" "docs/guides/plan-compile-catalog-extension-technical-manual-20260417.md" "docs/planning/reviews/architecture-and-governance/20260419-plan-route-boundary-remediation-review.md" "docs/planning/reviews/review-status-board.md" "docs/planning/state/agent-lane-a.md" "docs/planning/state/execution-workboard.md" "docs/planning/state/open-task-route.md" "docs/planning/closeouts/20260419-tf-a1-c14-plan-compile-language-alignment-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc
    - pnpm exec eslint --max-warnings 0 apps/api/src/app.ts apps/api/src/application/services/CompilePlanUseCase.ts apps/api/src/application/services/planCompilePlannerEnvelopeMapper.ts apps/api/src/entrypoints/http/compilePlanRoute.ts apps/api/src/entrypoints/http/compilePlanRouteResponseMapper.ts apps/api/src/entrypoints/http/planCompileResponseMapper.ts apps/api/src/entrypoints/http/planCompileRouteInputParser.ts apps/api/src/modules/buildProtectedRuntimeModule.ts apps/api/src/modules/planCompileCatalog.ts apps/api/src/modules/planCompilePlannerProfile.ts apps/api/src/modules/planCompileProfileSpec.ts apps/api/src/modules/types.ts apps/api/test/application/services/CompilePlanUseCase.test.ts apps/api/test/modules.test.ts packages/@dvt/contracts/src/contracts/planner/PlanCompileStepTypeConfigs.v1.ts packages/@dvt/contracts/src/index.ts
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm golden:validate
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test -- test/application/services/CompilePlanUseCase.test.ts test/entrypoints/http/compilePlanRoute.test.ts test/modules.test.ts
    - pnpm verify:prepush
---

# Summary

This slice closes the remaining active compile-boundary vocabulary drift and
removes duplicate ownership of compile input normalization.

Active API code and living docs now use `plan compile` as the current
ubiquitous language, while the route parser is the single owner of
graph-source and selection normalization before the application mapper enriches
the planner envelope.

# Key checks

- The last live contract export using the retired `ExternalCompile*` name was
  renamed to `PlanCompileStepTypeConfigs`.
- The API compile route continues to normalize request shape at the transport
  boundary instead of duplicating that work inside the application mapper.
- Active docs now describe the plan-route family as one standardized
  remote-facade pattern and treat older `external compile` wording as
  historical only.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260419-PLAN-COMPILE-LANGUAGE-DRIFT.yaml`.
