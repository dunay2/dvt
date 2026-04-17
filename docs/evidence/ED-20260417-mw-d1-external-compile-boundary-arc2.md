---
title: MW-D1 external compile boundary ARC-2 evidence
status: Accepted
date: 2026-04-17
owners:
  - apps/api
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/entrypoints/http/compilePlanRoute.ts
  - apps/api/src/entrypoints/http/externalPlanCompileRouteInputParser.ts
  - apps/api/src/entrypoints/http/externalPlanCompilePlannerEnvelopeMapper.ts
  - apps/api/src/modules/externalCompilePlannerProfile.ts
  - apps/api/src/modules/externalCompileProfileSpec.ts
  - packages/@dvt/contracts/src/schema-packs/external-plan-compile.ts
  - packages/@dvt/contracts/src/validation/planner.ts
  - packages/@dvt/contracts/test/validation/external-plan-compile.ts
evidence:
  tests:
    - pnpm docs:workboard:generate
    - pnpm docs:sync
    - pnpm docs:status:generate
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api test
    - pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md" "docs/planning/closeouts/20260417-mw-d1-planning-closeout.md" "docs/guides/external-compile-target-architecture-technical-manual-20260417.md" "docs/guides/external-compile-catalog-extension-technical-manual-20260417.md" "docs/guides/how-to-add-step-kind-20260406.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc
    - pnpm verify:prepush
---

# Summary

`MW-D1` establishes a protected external compile boundary with compile-only
semantics and no legacy ingress compatibility.

The slice also hardens SRP by splitting compile transport parsing, envelope
mapping, and route orchestration into dedicated modules, and replaces inline
compile-policy literals with a typed profile specification.

# Key checks

- Contracts include canonical external compile request and response schemas and
  parser helpers.
- API route wiring exposes `POST /plans/compile` through a dedicated route
  implementation.
- Compile response remains explicit about non-persistence and no executability
  validation.
- Validation suites for contracts and API pass.
- Baseline pre-push gate passes.

# Risk posture

Residual risk is tracked in
`docs/risk-register/quality/R-20260417-MW-D1-EXTERNAL-COMPILE-BOUNDARY.yaml`.
