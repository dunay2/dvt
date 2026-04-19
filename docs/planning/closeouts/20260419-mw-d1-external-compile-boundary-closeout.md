---
title: Closeout - MW-D1 external compile boundary implementation
status: Review
owner: API / Contracts / Planner / Docs
last_reviewed: 2026-04-19
planning_type: closeout
slice: MW-D1-external-compile-boundary
---

# Closeout: MW-D1 external compile boundary implementation

## Think-First Analysis

### Problem summary

`MW-D1` had already frozen the target architecture, but the shipped code still
left the compile boundary in an in-between state: the route was doing
application orchestration, the external catalog was still a hardcoded
transformation-first list, and the product claim of non-dbt compile acceptance
was not yet proven end to end.

### Root cause

The repository had the right concepts but the wrong ownership line.
`apps/api` was still carrying compile orchestration and schema construction that
belong either to the application service layer or to the shared contracts
kernel. That drift became visible when the new `spark` family used an app-local
`zod` schema runtime that was not the same runtime consumed by
`@dvt/contracts` and `StepTypeRegistry`.

### Governing constraints

- `AGENTS.md`: inventory-first, no hidden debt, no stubs, full validation, and
  evidence-backed closeout.
- `docs/guides/ai-work-protocol.md`: think-first, implementation brief,
  validation, and closeout requirements.
- `docs/adr/ADR-0005-contract-formalization-tooling.md`: contract-owned schema
  formalization and validation.
- `docs/adr/ADR-0012-plan-integrity-ownership.md`: planner boundary owns plan
  derivation integrity.
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`: shared-kernel
  artifacts must remain owned by their canonical package.
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`:
  boundary ownership must stay explicit.
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`:
  planner-facing contracts evolve through the canonical contracts boundary, not
  through app-local shadow types.
- `docs/planning/reviews/architecture-and-governance/20260418-mw-d1-external-compile-boundary-review.md`:
  the next acceptable slice was route-to-use-case split plus catalog-first
  composition plus one non-dbt acceptance vector.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `apps/api/src/application/services/**`
  - `apps/api/src/entrypoints/http/**`
  - `apps/api/src/modules/**`
  - `apps/api/test/**`
  - `packages/@dvt/contracts/src/**`
  - `packages/@dvt/contracts/test/**`
  - planning lane and review status docs
- Out of scope:
  - worker routing by step kind (`MW-D2`)
  - target-adapter selection inside compile
  - preview/import lifecycle redesign
- Risks and mitigations:
  - Risk: app-local schema runtime diverges from shared-kernel validation.
    Mitigation: move `spark` step schema ownership into `@dvt/contracts`.
  - Risk: route keeps orchestration responsibility.
    Mitigation: introduce a dedicated compile use case and response mapper.

## Implementation Summary

1. `compilePlanRoute` now behaves as a remote facade instead of an orchestration
   service. It handles transport, authn/authz, and delegation only.
2. `CompileExternalPlanUseCase` became the compile-only application service.
   `externalCompilePlannerEnvelopeMapper` moved under application services, and
   `externalPlanCompileResponseMapper` now owns response shaping.
3. External compile composition is now catalog-first. `apps/api` resolves
   canonical families and kinds through `externalCompileCatalog` and enforces
   typed profile policy in `externalCompilePlannerProfile`.
4. `SparkJobStepTypeConfigSchema` is now owned by `@dvt/contracts`, which
   removes schema-runtime drift and keeps step-config validation inside the
   shared kernel instead of `apps/api`.
5. Non-dbt acceptance is now proven at two levels:
   - contract-level validation of a `spark-job-graph` compile request
   - API/module-level tests that compile a `SPARK_JOB` graph through the
     external compile boundary without reintroducing legacy ingress

## DDD / Fowler / SRP outcome

What was corrected:

- route responsibility is now aligned with Fowler remote-facade semantics
- compile orchestration has a dedicated application service
- response shaping is separated from transport and planning
- schema ownership moved back to the contracts shared kernel
- `apps/api` is now composition-first for external step families and kinds

Residual drift that remains but is no longer blocking `MW-D1`:

- the compile parser still reuses some low-level normalization helpers from a
  neighboring ingress path; this is a cleanup follow-up, not a blocker for the
  external compile boundary itself

## Validation Run

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter dvt-api test -- test/modules.test.ts test/entrypoints/http/planRoutes.test.ts`
- `pnpm --filter @dvt/contracts build`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter dvt-api test`
- `pnpm --filter dvt-api test:arch`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No rule was disabled or relaxed.
- No compatibility bridge for legacy compile ingress was reopened.
- No stub, placeholder, fake adapter, or fake success path was introduced.
- The non-dbt vector is exercised by real contract and API tests.
