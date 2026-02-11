# Golden Path: plan-parallel

**Purpose**: Validate parallel task execution and fan-in pattern

**Status**: Contract test fixture for Phase 1 MVP

---

## Overview

This plan validates the engine's ability to execute tasks in parallel and merge results (fan-in pattern).

**What it does**:
- Executes 3 independent steps in parallel (no dependencies between them)
- Waits for all 3 parallel steps to complete
- Executes a final "merge" step that depends on all 3 parallel steps
- Validates correct dependency resolution and scheduling

**Use case**: Verify engine correctly schedules parallel tasks and respects dependencies.

---

## Plan Structure

```json
{
  "planId": "plan-parallel",
  "schemaVersion": "v1.1",
  "steps": [
    { "stepId": "step-parallel-1", "dependencies": [] },
    { "stepId": "step-parallel-2", "dependencies": [] },
    { "stepId": "step-parallel-3", "dependencies": [] },
    { "stepId": "step-merge", "dependencies": ["step-parallel-1", "step-parallel-2", "step-parallel-3"] }
  ]
}
```

**Dependency graph**:

```
step-parallel-1 ─┐
                 │
step-parallel-2 ─┼─> step-merge
                 │
step-parallel-3 ─┘
```

---

## Expected Behavior

### Execution Flow

1. **RUN_CREATED** - Engine receives plan submission
2. **RUN_STARTED** - Execution begins
3. **STEP_STARTED** (step-parallel-1, step-parallel-2, step-parallel-3) - All 3 parallel steps start **simultaneously or near-simultaneously**
4. **STEP_COMPLETED** (step-parallel-1, step-parallel-2, step-parallel-3) - All 3 parallel steps complete (order may vary)
5. **STEP_STARTED** (step-merge) - Merge step starts **only after all 3 parallel steps complete**
6. **STEP_COMPLETED** (step-merge) - Merge step completes
7. **RUN_COMPLETED** - Execution completes

### Event Ordering Constraints

**Order-independent events**:
- The 3 `STEP_STARTED` events for parallel steps may occur in any order
- The 3 `STEP_COMPLETED` events for parallel steps may occur in any order

**Order-dependent events**:
- `STEP_STARTED` (step-merge) MUST occur **after** all 3 parallel steps are `STEP_COMPLETED`
- `STEP_COMPLETED` (step-merge) MUST occur **after** `STEP_STARTED` (step-merge)
- `RUN_COMPLETED` MUST be the final event

**Key assertion**: The merge step cannot start until all parallel steps complete.

See [`expected-events.jsonl`](./expected-events.jsonl) for the complete event log.

---

## Validation Report

The plan validates successfully against the Temporal adapter.

**Capabilities required**: `["basic-execution", "workflow.fan.parallel"]`

**Validation status**: `VALID`

See [`validation-report.json`](./validation-report.json) for details.

---

## Running This Path

### Prerequisites

- DVT Engine running with Temporal adapter (supports native parallel execution)
- (Optional) PostgreSQL for state persistence

### Execution

```bash
# From repository root
cd examples/plan-parallel

# Validate plan against schema
npm run test:contracts:validate

# Submit plan to engine
dvt-cli submit plan.v1.1.json --wait

# Verify events match expected output
dvt-cli events list <runId> > actual-events.jsonl
# Note: Use order-independent comparison for parallel events
```

### Expected Output

```
✅ RUN_CREATED
✅ RUN_STARTED
✅ STEP_STARTED (step-parallel-1)
✅ STEP_STARTED (step-parallel-2)
✅ STEP_STARTED (step-parallel-3)
✅ STEP_COMPLETED (step-parallel-1)
✅ STEP_COMPLETED (step-parallel-2)
✅ STEP_COMPLETED (step-parallel-3)
✅ STEP_STARTED (step-merge) ← AFTER all parallel steps complete
✅ STEP_COMPLETED (step-merge)
✅ RUN_COMPLETED

Total duration: < 15s
Status: COMPLETED
```

---

## Contract Test Usage

This plan is used in CI/CD pipelines to validate:
- Engine correctly schedules parallel tasks
- Dependencies are respected (step-merge waits for all 3 parallel steps)
- Event ordering is correct for parallel vs sequential execution
- StateStore projections handle concurrent events correctly

**CI Workflow**: `.github/workflows/golden-paths.yml`

---

## References

- [IWorkflowEngine.v1.md](../../docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) - Engine interface
- [ExecutionSemantics.v1.md](../../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md) - Event semantics
- [capabilities.schema.json](../../docs/architecture/engine/contracts/capabilities/capabilities.schema.json) - Parallel execution capability
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths tracking
