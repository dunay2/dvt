---
title: G4 - compiledCodeRef Task Specification
status: Final
owner: docs
last_reviewed: 2026-03-07
planning_type: proposal
---

# G4 - compiledCodeRef Task Specification

Status snapshot aligned with current repository state.

- Original start: 2026-03-04
- Current review: 2026-03-07
- ADR: [`ADR-0032`](../../adr/ADR-0032-compiledcoderef-ownership.md)
- Master plan: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)

## Goal

Attach `compiledCodeRef` to execution flow to enable traceability/lineage without storing SQL text in the event log.

## Work Breakdown Status

| Task | Scope                                                     | Current state |
| ---- | --------------------------------------------------------- | ------------- |
| T4-1 | `@dvt/contracts`: type + package export + fixtures        | Implemented   |
| T4-2 | `@dvt/planner`: storage adapters + attachCompiledCodeRefs | Implemented   |
| T4-3 | `@dvt/adapter-temporal`: propagate ref to `StepStarted`   | Implemented   |
| T4-4 | `@dvt/traceability-service`: reader/cache/SqlJobFacet     | Implemented   |

## T4-1 - Contracts

### Done

1. `CompiledCodeRef` type exists.
   - [`packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`](../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts)
2. Type is exported from package index.
   - [`packages/@dvt/contracts/src/index.ts`](../../../packages/@dvt/contracts/src/index.ts)
3. Golden fixtures for `StepStarted` with/without `compiledCodeRef` were added.
   - [`packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts`](../../../packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts)
4. Contract validation tests for both event variants were added.
   - [`packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts`](../../../packages/@dvt/contracts/test/compiled-code-ref.contract.test.ts)

## T4-2 - Planner

### Done

1. `ICompiledCodeStorage` port created.
   - [`packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts`](../../../packages/@dvt/planner/src/ports/ICompiledCodeStorage.ts)
2. Implementations created:
   - `S3CompiledCodeStorage`
   - `MinioCompiledCodeStorage`
   - `FileSystemCompiledCodeStorage`
   - `InMemoryCompiledCodeStorage`
   - `NoopCompiledCodeStorage`
3. `attachCompiledCodeRefs()` implemented and exported.
   - [`packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts`](../../../packages/@dvt/planner/src/compiledCode/attachCompiledCodeRefs.ts)
4. Supporting tests exist for adapters and enrichment.
   - [`packages/@dvt/planner/test/compiledCode`](../../../packages/@dvt/planner/test/compiledCode)

### Validation Notes

1. Planner enrichment is kept outside deterministic core build path.
2. File-system storage is guarded for non-production usage.

## T4-3 - Adapter Temporal

### Done

1. Added extraction/type guard for `compiledCodeRef` with fail-open behavior.
   - [`packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
2. Propagated `compiledCodeRef` from `stepTypeConfig` to `StepStarted.payload` only when valid.
   - [`packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
3. Added unit tests for valid/invalid/absent patterns.
   - [`packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`](../../../packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts)
4. Added QA architecture review for static-noise reduction aligned with SOLID/DDD/Hexagonal principles.
   - [`G4-T4-3-QA-ARCH-REVIEW.md`](G4-T4-3-QA-ARCH-REVIEW.md)

### Validation Notes

1. `pnpm --filter @dvt/adapter-temporal test` passes including the new T4-3 tests.
2. Adapter step-shape validation now allows `stepTypeConfig` as object transport channel (rejects non-object values).
3. T4-3 quality hardening is tracked with explicit refactor criteria in QA architecture review.
4. Integration test support was hardened with Value Object/query-object patterns to reduce static-analysis noise without changing behavior.

## T4-4 - Traceability Service

### Done

1. Added compiled-code lineage ports and contracts.
   - [`packages/@dvt/traceability-service/src/lineage/contracts.ts`](../../../packages/@dvt/traceability-service/src/lineage/contracts.ts)
2. Implemented reader composition and cache+retry resolution path.
   - [`packages/@dvt/traceability-service/src/lineage/readers/CompositeCompiledCodeReader.ts`](../../../packages/@dvt/traceability-service/src/lineage/readers/CompositeCompiledCodeReader.ts)
   - [`packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts`](../../../packages/@dvt/traceability-service/src/lineage/resolver/CachedRetryCompiledCodeResolver.ts)
3. Implemented SQL facet builder and StepStarted lineage mapper with fail-open behavior.
   - [`packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts`](../../../packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts)
   - [`packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`](../../../packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts)
4. Added unit tests for guards, resolver, and mapper paths.
   - [`packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts`](../../../packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts)
   - [`packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts`](../../../packages/@dvt/traceability-service/test/lineage/CachedRetryCompiledCodeResolver.test.ts)
   - [`packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts`](../../../packages/@dvt/traceability-service/test/lineage/StepStartedLineageMapper.test.ts)

### Validation Notes

1. Mapper is fail-open by design: no `compiledCodeRef` means empty facets, not failure.
2. Resolver validates SHA-256/size invariants against resolved blob content.
3. Package-level tests cover positive and negative/error paths.

## Closure Criteria For G4

- [x] T4-1 fixtures completed and validated.
- [x] T4-2 planner implementation completed.
- [x] T4-3 adapter propagation implemented and tested.
- [x] T4-4 traceability implementation and tests completed.
- [x] End-to-end path verified in package-level test suites for involved modules.
- [x] Evidence doc updated to Final with real PR/test/code references.

## References

- Evidence draft: [`docs/evidence/ED-20260304-compiledcoderef-ownership.md`](../../evidence/ED-20260304-compiledcoderef-ownership.md)
- ADR detail: [`docs/adr/ADR-0032-compiledcoderef-ownership.md`](../../adr/ADR-0032-compiledcoderef-ownership.md)
