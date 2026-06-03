---
title: Componentize API plan-route response translation and restore adapter build baseline
status: Accepted
date: 2026-04-21
owners:
  - apps/api
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/entrypoints/http/planRouteResponseTranslation.ts
  - apps/api/src/entrypoints/http/compilePlanRoute.ts
  - apps/api/src/entrypoints/http/importPlanRoute.ts
  - apps/api/src/entrypoints/http/previewPlanRoute.ts
  - apps/api/test/entrypoints/http/planRouteResponseTranslation.architecture.test.ts
  - packages/@dvt/adapter-postgres/tsconfig.json
  - docs/risk-register/quality/R-20260421-ADAPTER-PG-WORKSPACE-PATH-DRIFT.yaml
evidence:
  tests:
    - pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts test/entrypoints/http/planRouteResponseTranslation.architecture.test.ts test/entrypoints/http/planRouteResponseTranslation.test.ts test/entrypoints/http/executePlanRouteFacade.test.ts test/entrypoints/http/compilePlanRoute.test.ts test/entrypoints/http/importPlanRoute.test.ts test/entrypoints/http/previewPlanRoute.auth.test.ts test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts test/entrypoints/http/previewPlanRoute.outcomes.test.ts
    - pnpm exec eslint --max-warnings 0 src/entrypoints/http/planRouteResponseTranslation.ts src/entrypoints/http/compilePlanRoute.ts src/entrypoints/http/importPlanRoute.ts src/entrypoints/http/previewPlanRoute.ts src/entrypoints/http/previewPlanRouteRequestResolver.ts src/entrypoints/http/executePlanRouteFacade.ts src/entrypoints/http/compilePlanRouteResponseMapper.ts src/entrypoints/http/importPlanRouteResponseMapper.ts src/entrypoints/http/previewPlanRouteResponseMapper.ts src/entrypoints/http/planPreviewContractErrorMapper.ts test/entrypoints/http/httpArchitectureAst.support.ts test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts test/entrypoints/http/planRouteResponseTranslation.architecture.test.ts test/entrypoints/http/planRouteResponseTranslation.test.ts
    - pnpm exec markdownlint-cli2 apps/api/docs/http-runtime-error-translation-component.md apps/api/docs/plan-route-response-translation-component.md buzon/20260421-codex-fowler-http-entrypoint-component-analysis-and-remediation.md docs/architecture/components/api/api-current-to-target-architecture.md docs/architecture/components/api/index.md docs/planning/closeouts/20260421-api-http-entrypoint-response-componentization-closeout.md --config .markdownlint-cli2.jsonc --ignore-path .markdownlintignore
    - pnpm --filter dvt-api build
    - cmd /c "set GIT_BASE=origin/main&& set GIT_HEAD=HEAD&& node tools/ci/arc-check.mjs"
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Summary

This slice closes two coupled problems in one governed change set.

First, `apps/api` now exposes one explicit local component seam for
plan-route response translation instead of letting `preview`, `compile`, and
`import` flows call mapper primitives directly. That improves semantic
encapsulation, aligns the HTTP entrypoint stack with the existing runtime error
translation component, and adds a semantic architecture test for the new seam.

Second, the validation baseline for the slice is restored by fixing
`packages/@dvt/adapter-postgres/tsconfig.json`. The adapter already imported
`@dvt/delivery` and `@dvt/traceability-service`, but its explicit workspace
type-path map did not resolve those packages. That drift broke
`pnpm --filter dvt-api build` through recursive prebuild orchestration.

# What this evidence closes

1. Plan-route HTTP response translation now has a named public seam:
   `planRouteResponseTranslation.ts`.
2. API entrypoint documentation, owned-concern markers, and AST-based semantic
   tests are aligned with that seam.
3. The adapter-postgres workspace path map now resolves its real internal
   package imports, so `dvt-api` build is again a usable vertical baseline for
   this slice.

# What remains open

1. `packages/@dvt/adapter-postgres/tsconfig.json` still relies on a manually
   curated internal-package path map. The immediate break is fixed, but the
   pattern can drift again if new imports are added without updating the map.
2. The broader API HTTP entrypoint layer still has additional flat helper
   modules that could be promoted into named components in later Fowler-driven
   passes.
