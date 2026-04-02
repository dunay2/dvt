---
title: ED-20260314 - G9 Step Type Registry Closeout
gap: G9
status: accepted
date: 2026-03-14
owners: Planning / Contracts / Engine
arc_level: ARC-1
breaking: false
evidence_class: critical
author: AI-assisted delivery
code_refs:
  - packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts
  - packages/@dvt/contracts/src/schemas.ts
  - packages/@dvt/planner/src/domain/Planner.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts
evidence:
  tests: []
  notes:
    - Built-in DBT step kinds validate through shared registry-backed schemas.
    - Planner rejects invalid known step configs with INVALID_STEP_CONFIG.
    - Temporal adapter consumes DBT config through the shared schema path.
    - Contracts, planner, and adapter-temporal validation lanes passed.
---

# ED-20260314 - G9 Step Type Registry Closeout

## Purpose

This evidence doc records the clean closeout of `G9`: registry-backed
`stepTypeConfig` validation for built-in step kinds, planner enforcement at
build-time, and adapter consumption-time validation without promoting
`ExecutionPlan.stepTypeConfig` into a closed discriminated union.

## Closure Criteria

| Criterion                                                                                              | Result |
| ------------------------------------------------------------------------------------------------------ | ------ |
| `IStepTypeRegistry` and default built-in registry exist in `@dvt/contracts`                            | Pass   |
| Built-in DBT step kinds validate through Zod schemas                                                   | Pass   |
| Planner validates known step kinds at build-time and rejects invalid config with `INVALID_STEP_CONFIG` | Pass   |
| Unknown step kinds remain fail-open per ADR-0006                                                       | Pass   |
| Temporal adapter consumes DBT config through the shared schema path                                    | Pass   |
| Contract stays extensible with `stepTypeConfig: Record<string, unknown>` by design                     | Pass   |
| Package validation lanes pass for contracts, planner, and adapter-temporal                             | Pass   |

## Implemented Surfaces

### Contracts

- `packages/@dvt/contracts/src/step-registry/StepTypeRegistry.ts`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts`
- `packages/@dvt/contracts/src/schemas.ts`

Delivered:

- `IStepTypeRegistry`, `StepTypeRegistry`, `createDefaultStepTypeRegistry`
- `DbtStepTypeConfigSchema` and built-in DBT registrations
- contract annotations documenting that the open `stepTypeConfig` shape is
  intentional and enforced outside the shared kernel type

### Planner

- `packages/@dvt/planner/src/domain/Planner.ts`
- `packages/@dvt/planner/src/domain/errors.ts`
- `packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts`

Delivered:

- typed DBT step factory output
- `PlannerOptions.stepTypeRegistry`
- `validateStepConfigs()` between step build and plan assembly
- `PlannerErrorCode.INVALID_STEP_CONFIG` for known-kind invalid configs

### Adapter Consumption

- `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`

Delivered:

- shared-schema validation path for DBT `compiledCodeRef`
- removal of duplicated manual guards in favor of `DbtStepTypeConfigSchema`

## Design Decision

`ExecutionPlan.stepTypeConfig` remains `Record<string, unknown>` by design.
This keeps the signed/shared contract extensible while pushing strict
per-kind validation to the planner and to adapters that understand a specific
kind. Moving to a discriminated union would be a contract-level ADR change,
not residual `G9` work.

## Validation Run

Executed on 2026-03-14:

```text
pnpm --filter @dvt/contracts test
  pass 32/32

pnpm --filter @dvt/planner test
  pass 37/37

pnpm --filter @dvt/adapter-temporal test
  pass 87/87
```

Key tests:

- `packages/@dvt/contracts/test/step-registry.test.ts` - 19 tests
- `packages/@dvt/planner/test/unit/step-registry-integration.test.ts` - 8 tests
- `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`

## Traceability

- Canonical status: `docs/planning/gaps/GAP_EXECUTION_PLANS.md`
- System status: `docs/architecture/system-delivery-status.md`
- Code map: `docs/planning/status/canonical-doc-code-matrix.md`
- Governing ADR for current opaque transport boundary:
  `docs/adr/ADR-0032-compiledcoderef-ownership.md`
