---
title: G4 - compiledCodeRef Task Specification
status: Review
owner: docs
last_reviewed: 2026-03-06
planning_type: proposal
---

# G4 - compiledCodeRef Task Specification

Status snapshot aligned with current repository state.

- Original start: 2026-03-04
- Current review: 2026-03-06
- ADR: [`ADR-0032`](../../adr/ADR-0032-compiledcoderef-ownership.md)
- Master plan: [`GAP_EXECUTION_PLANS.md`](GAP_EXECUTION_PLANS.md)

## Goal

Attach `compiledCodeRef` to execution flow to enable traceability/lineage without storing SQL text in the event log.

## Work Breakdown Status

| Task | Scope                                                     | Current state |
| ---- | --------------------------------------------------------- | ------------- |
| T4-1 | `@dvt/contracts`: type + package export + fixtures        | Partial       |
| T4-2 | `@dvt/planner`: storage adapters + attachCompiledCodeRefs | Implemented   |
| T4-3 | `@dvt/adapter-temporal`: propagate ref to `StepStarted`   | Implemented   |
| T4-4 | `@dvt/traceability-service`: reader/cache/SqlJobFacet     | Pending       |

## T4-1 - Contracts

### Done

1. `CompiledCodeRef` type exists.
   - [`packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts`](../../../packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts)
2. Type is exported from package index.
   - [`packages/@dvt/contracts/src/index.ts`](../../../packages/@dvt/contracts/src/index.ts)

### Pending

1. Golden fixtures for `StepStarted` with/without `compiledCodeRef`.
2. Evidence doc update with real fixture paths.

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

### Delivered

1. Added `compiledCodeRef` extraction/type guard in workflow path.
   - [`packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`](../../../packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts)
2. Propagated valid `compiledCodeRef` from `stepTypeConfig` to `StepStarted.payload`.
3. Added unit tests for valid/invalid/absent payload patterns.
   - [`packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts`](../../../packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts)
4. Allowed planner `stepTypeConfig` metadata in step activity schema validation.
   - [`packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`](../../../packages/@dvt/adapter-temporal/src/activities/stepActivities.ts)

## T4-4 - Traceability Service

### Pending Scope

1. Create `ICompiledCodeReader` port and concrete readers.
2. Implement cache + retry wrapper for blob resolution.
3. Build `SqlJobFacet` from resolved SQL.
4. Integrate fail-open behavior in lineage mapping path.
5. Add unit/integration tests and metrics assertions.

## Closure Criteria For G4

- [ ] T4-1 fixtures completed and validated.
- [x] T4-2 planner implementation completed.
- [x] T4-3 adapter propagation implemented and tested.
- [ ] T4-4 traceability implementation and tests completed.
- [ ] End-to-end path verified in CI for involved packages.
- [ ] Evidence doc updated to Final with real PR/test/code references.

## References

- Evidence draft: [`docs/evidence/ED-20260304-compiledcoderef-ownership.md`](../../evidence/ED-20260304-compiledcoderef-ownership.md)
- ADR detail: [`docs/adr/ADR-0032-compiledcoderef-ownership.md`](../../adr/ADR-0032-compiledcoderef-ownership.md)
