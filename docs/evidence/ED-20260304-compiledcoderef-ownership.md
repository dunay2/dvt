---
title: ED-20260304 - compiledCodeRef ownership (ADR-0032)
status: Review
date: 2026-03-06
owners: Engine / Planner / Traceability
arc_level: ARC-2
breaking: false
policy_version: 1
code_refs:
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
  - packages/@dvt/traceability-service/src/
contracts_touched:
  - id: IRunStateStore.v1
    version: 1.x (optional extension, non-breaking)
    path: packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - id: EventInput.payload (StepStarted)
    version: optional field extension
    path: packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
evidence:
  pr: https://github.com/dunay2/dvt/pull/374
  tests:
    - '[TEST PATHS PENDING] packages/@dvt/contracts/test/compiledCodeRef.test.ts'
    - '[TEST PATHS PENDING] packages/@dvt/planner/test/compiledCodeRef.test.ts'
    - packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts
    - packages/@dvt/adapter-temporal/test/activities.test.ts
    - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
    - '[TEST PATHS PENDING] packages/@dvt/traceability-service/test/sqlJobFacet.test.ts'
    - '[TEST PATHS PENDING] packages/@dvt/traceability-service/test/integration/compiledCodeRef.integration.test.ts'
  code:
    - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
    - packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts
    - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
    - packages/@dvt/adapter-temporal/src/activities/stepActivities.ts
    - '[CODE PENDING] packages/@dvt/traceability-service/src/facets/SqlJobFacet.ts'
risk_update:
  required: true
  file: docs/adr/ADR-0032-compiledcoderef-ownership.md (Risk Register section 7)
rollout:
  required: false
  notes: 'Optional field - existing consumers remain compatible.'
compatibility:
  required: false
  matrix: 'Backward compatible: compiledCodeRef remains optional in StepStarted payload.'
---

## Evidence Doc: compiledCodeRef Ownership (ADR-0032)

## What changed

- New `CompiledCodeRef { sha256, storageUri, sizeBytes, encoding? }` type in `@dvt/contracts`.
- Optional `compiledCodeRef` in `StepStarted.payload` (non-breaking).
- `@dvt/planner` computes SHA-256 for compiled SQL, uploads to object storage, and attaches the reference in `stepTypeConfig` (opaque transport field).
- `@dvt/adapter-temporal` extracts `compiledCodeRef` with a type guard and propagates it to `StepStarted.payload`.
- `@dvt/traceability-service` remains pending (reader/cache + SqlJobFacet build path).

## Flow

```mermaid
flowchart LR
  RR["dbt run_results.json\n(compiled_code by node)"]
  PLAN["@dvt/planner\nsha256 + upload -> storageUri"]
  STYPE["ExecutionPlan.steps[i]\n.stepTypeConfig.compiledCodeRef"]
  EVENT["StepStarted.payload.compiledCodeRef"]
  STORE["run_events\n(reference only)"]
  TRACE["@dvt/traceability-service\n(resolve + facet build)"]

  RR --> PLAN
  PLAN --> STYPE
  STYPE --> EVENT
  EVENT --> STORE
  STORE --> TRACE
```

## T4-3 status

- Implemented in adapter-temporal.
- Unit tests added for valid/invalid/absent reference extraction and payload propagation.
- Adapter tests pass: `pnpm --filter @dvt/adapter-temporal test`.
- Post-implementation QA hardening documented in
  [`docs/planning/gaps/G4-T4-3-QA-ARCH-REVIEW.md`](../planning/gaps/G4-T4-3-QA-ARCH-REVIEW.md).

## Remaining items for ED closure

- [ ] PR number when created
- [ ] Contracts golden fixtures for StepStarted with/without compiledCodeRef
- [ ] Traceability service reader/cache/facet implementation and tests
- [ ] Final CI evidence including end-to-end path
