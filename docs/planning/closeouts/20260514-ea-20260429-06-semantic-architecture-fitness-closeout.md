---
title: EA-20260429-06 Semantic Architecture Fitness Closeout
status: Accepted
date: 2026-05-14
owner: Architecture / Engine
planning_type: closeout
---

# EA-20260429-06 Semantic Architecture Fitness Closeout

## Scope

`EA-20260429-06` replaces one brittle engine facade source-string guard with a
reusable TypeScript AST-backed architecture fitness helper.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md`
- `docs/evidence/ed-20260514-ea-20260429-06-semantic-architecture-fitness.md`
- `docs/risk-register/quality/R-20260514-EA-20260429-06-SEMANTIC-FITNESS.yaml`

## Result

The engine architecture test support now exposes
`getClassConstructorParameterPropertyTypes`, a semantic helper built on the
TypeScript AST. `WorkflowEngine` facade dependency ownership is checked through
that helper instead of by searching for expected field strings in source text.

## TDD Evidence

1. Red:
   `pnpm --filter @dvt/engine test -- test/architecture/engineArchitectureTestSupport.test.ts`
   failed because `getClassConstructorParameterPropertyTypes` did not exist.
2. Green:
   the helper was implemented in `engineArchitectureTestSupport.ts`.
3. Refactor:
   `workflowEngineFacadeUseCases.architecture.test.ts` now uses the helper to
   assert the `WorkflowEngine` constructor parameter-property type.

## Fowler Matrix

| Scenario                                     | Opportunity          | Fowler pattern            | DDD owner              | Command/query rail                        | Implementation surfaces                     | Test proof                                    | Out of scope                                    |
| -------------------------------------------- | -------------------- | ------------------------- | ---------------------- | ----------------------------------------- | ------------------------------------------- | --------------------------------------------- | ----------------------------------------------- |
| `WorkflowEngine` facade dependency ownership | Test-only confidence | Semantic fitness function | Engine facade boundary | none - internal architecture fitness only | `packages/@dvt/engine/test/architecture/**` | AST helper test plus facade architecture test | replacing textual docs and import-policy guards |

## Validation Target

- `pnpm --filter @dvt/engine test -- test/architecture/engineArchitectureTestSupport.test.ts`
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineFacadeUseCases.architecture.test.ts`
- `pnpm --filter @dvt/engine test -- test/architecture/workflowEngineBoundaryFitness.architecture.test.ts`
- `pnpm --filter @dvt/engine typecheck`
- `$env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs`
- `pnpm docs:status:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt And No-Stub Evidence

This slice introduces no stubs, placeholders, fake adapters, fake success
paths, TODO markers, or hidden compatibility branches. It does not relax any
lint, type, docs, ARC, or pre-push rule.
