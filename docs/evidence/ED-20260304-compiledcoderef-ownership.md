---
title: ED-20260304 - compiledCodeRef ownership (ADR-0032)
status: Final
date: 2026-03-07
owners: Engine / Planner / Traceability
arc_level: ARC-2
breaking: false
policy_version: 1
code_refs:
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts
  - packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts
  - packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts
  - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
  - packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts
  - packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts
  - packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts
  - packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts
contracts_touched:
  - id: IRunStateStore.v1
    version: 1.x (optional extension, non-breaking)
    path: packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - id: EventInput.payload (StepStarted)
    version: optional field extension
    path: packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
evidence:
  pr:
    - https://github.com/dunay2/dvt/pull/362
    - https://github.com/dunay2/dvt/pull/371
    - https://github.com/dunay2/dvt/pull/374
  tests:
    - packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts
    - packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts
    - packages/@dvt/adapter-temporal/test/activities.test.ts
    - packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts
    - packages/@dvt/planner/test/compiledCode/attachCompiledCodeRefs.test.ts
    - packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts
    - packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts
    - packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts
  code:
    - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
    - packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts
    - packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts
    - packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts
    - packages/@dvt/traceability-service/src/lineage/contracts.ts
    - packages/@dvt/traceability-service/src/lineage/readers/CompositeCompiledCodeReader.ts
    - packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts
    - packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts
    - packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts
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
- `@dvt/contracts` now includes golden fixtures/tests for StepStarted with/without `compiledCodeRef`.
- `@dvt/traceability-service` resolves compiled code via reader+cache+retry and builds SQL facets in fail-open mapping.

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

## Delivery Status by Task

- T4-1 Contracts: closed.
- T4-2 Planner: closed.
- T4-3 Adapter Temporal propagation: closed.
- T4-4 Traceability reader/cache/facet mapping: closed.

## Verification Snapshot

- `pnpm --filter @dvt/contracts test`
- `pnpm --filter @dvt/planner test`
- `pnpm --filter @dvt/adapter-temporal test`
- `pnpm --filter @dvt/traceability-service test`
- Result (2026-03-07): all commands passed.
- Note: `test/integration.time-skipping.test.ts` requires Temporal ephemeral server privileges and failed in this local environment (`os error 5`), so it is tracked as environment-gated integration evidence.

## Closure Decision

G4 (`compiledCodeRef ownership`, ADR-0032) is formally closed as of 2026-03-07.
