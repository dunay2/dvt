---
title: Typed plan-preview rejection outcomes
status: Accepted
date: 2026-07-31
owners:
  - '@dvt/contracts'
  - dvt-api
  - dvt-web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/TransformationFlowPreview.v1.ts
  - packages/@dvt/contracts/src/schema-packs/plan-preview-response.ts
  - packages/@dvt/contracts/src/validation/planner.ts
  - apps/api/src/application/services/PreviewPlanUseCase.ts
  - apps/api/src/entrypoints/http/previewPlanRouteResponseMapper.ts
  - apps/web/src/app/ports/plans.ts
  - apps/web/src/app/services/plans/plansService.api.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test:ci
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:canvas-unit:run
    - pnpm --filter @dvt/web typecheck
    - pnpm verify:prepush
---

# Summary

The existing `PreviewExecutionPlan` rail now publishes a versioned,
discriminated rejection outcome instead of collapsing selection refusal and
post-build executability failure into one ambiguous result.

# Decision

- `selection-rejected` carries only the authoritative selection refusal and
  never fabricates plan identity or storage evidence.
- `plan-invalid` carries the exact built plan, persisted `planRef`, validation
  result, and preview evidence needed to explain why execution is blocked.
- Accepted preview responses retain their existing contract shape.
- HTTP maps both rejection variants to the existing typed `422` envelope.
- Web recognizes a rejection only after strict contract parsing; malformed,
  authorization, and transport failures remain errors.
- The slice reuses `PreviewExecutionPlan`; it adds no parallel command, query,
  endpoint, persistence path, or compatibility branch.

# Failure semantics

- Selection refusal occurs before plan identity or persistence exists.
- Plan invalidity occurs only after the concrete plan has been built and stored.
- Unknown or malformed `422` payloads fail closed at the Web adapter boundary.
- Neither rejection variant is reported as a successful preview.

# Scope boundary

This contract publishes rejection phase and evidence only. Findings,
remediation actions, persistence changes, and new UI treatment remain outside
this MVP issue.
