# Golden Path: plan-minimal

**Purpose**: "Hello World" for the DVT workflow engine

**Status**: Contract test fixture for Phase 1 MVP

---

## Overview

This is the simplest possible execution plan that validates basic engine functionality without complexity.

**What it does**:
- Executes a single "echo" step
- Outputs "Hello, DVT Engine!"
- Completes in < 5 seconds
- No dependencies, no retries, no complex configuration

**Use case**: Verify engine can start a run, execute a single activity, and complete successfully.

---

## Plan Structure

```json
{
  "planId": "plan-minimal",
  "schemaVersion": "v1.1",
  "steps": [
    {
      "stepId": "step-1",
      "type": "echo",
      "config": { "message": "Hello, DVT Engine!" }
    }
  ]
}
```

---

## Expected Behavior

### Execution Flow

1. **RUN_CREATED** - Engine receives plan submission
2. **RUN_STARTED** - Execution begins
3. **STEP_STARTED** - Step 1 begins
4. **STEP_COMPLETED** - Step 1 completes successfully
5. **RUN_COMPLETED** - Execution completes

### Expected Events

See [`expected-events.jsonl`](./expected-events.jsonl) for the complete event log.

**Key assertions**:
- 5 total events emitted
- `runSeq` values are sequential (0, 1, 2, 3, 4)
- All events have valid `idempotencyKey`
- Final status is `COMPLETED`
- No errors or warnings

---

## Validation Report

The plan validates successfully against the Temporal adapter.

**Capabilities required**: `["basic-execution"]`

**Validation status**: `VALID`

See [`validation-report.json`](./validation-report.json) for details.

---

## Running This Path

### Prerequisites

- DVT Engine running with Temporal adapter
- (Optional) PostgreSQL for state persistence

### Execution

```bash
# From repository root
cd examples/plan-minimal

# Validate plan against schema
npm run test:contracts:validate

# Submit plan to engine (implementation-specific)
# Example using hypothetical CLI:
dvt-cli submit plan.v1.1.json --wait

# Verify events match expected output
dvt-cli events list <runId> > actual-events.jsonl
diff expected-events.jsonl actual-events.jsonl
```

### Expected Output

```
✅ RUN_CREATED
✅ RUN_STARTED
✅ STEP_STARTED (step-1)
✅ STEP_COMPLETED (step-1)
✅ RUN_COMPLETED

Total duration: < 5s
Status: COMPLETED
```

---

## Contract Test Usage

This plan is used in CI/CD pipelines to validate:
- Engine can parse and validate v1.1 plans
- Engine correctly emits lifecycle events
- Event sequencing is correct
- StateStore projections are consistent

**CI Workflow**: `.github/workflows/golden-paths.yml`

---

## References

- [IWorkflowEngine.v1.md](../../docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) - Engine interface
- [ExecutionSemantics.v1.md](../../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md) - Event semantics
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths tracking
