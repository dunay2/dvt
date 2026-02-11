# Golden Path: plan-cancel-and-resume

**Purpose**: Validate PAUSE and RESUME signal handling

**Status**: Contract test fixture for Phase 1 MVP

---

## Overview

This plan validates the engine's ability to pause a running workflow and resume it later.

**What it does**:
- Executes 5 sequential steps
- After step 3 completes, a PAUSE signal is sent
- The workflow enters PAUSED state
- A RESUME signal is sent
- Steps 4 and 5 execute after resumption
- The workflow completes successfully

**Use case**: Verify engine correctly handles workflow lifecycle signals (PAUSE/RESUME).

---

## Plan Structure

```json
{
  "planId": "plan-cancel-and-resume",
  "schemaVersion": "v1.1",
  "steps": [
    { "stepId": "step-1", "dependencies": [] },
    { "stepId": "step-2", "dependencies": ["step-1"] },
    { "stepId": "step-3", "dependencies": ["step-2"] },
    { "stepId": "step-4", "dependencies": ["step-3"] },
    { "stepId": "step-5", "dependencies": ["step-4"] }
  ]
}
```

**Dependency graph** (sequential):

```
step-1 → step-2 → step-3 → [PAUSE] → [RESUME] → step-4 → step-5
```

---

## Expected Behavior

### Execution Flow

1. **RUN_CREATED** - Engine receives plan submission
2. **RUN_STARTED** - Execution begins
3. **STEP_STARTED** (step-1) → **STEP_COMPLETED** (step-1)
4. **STEP_STARTED** (step-2) → **STEP_COMPLETED** (step-2)
5. **STEP_STARTED** (step-3) → **STEP_COMPLETED** (step-3)
6. **SIGNAL_ACCEPTED** (PAUSE) - PAUSE signal received
7. **RUN_PAUSED** - Workflow enters PAUSED state
8. **SIGNAL_ACCEPTED** (RESUME) - RESUME signal received
9. **RUN_RESUMED** - Workflow resumes execution
10. **STEP_STARTED** (step-4) → **STEP_COMPLETED** (step-4)
11. **STEP_STARTED** (step-5) → **STEP_COMPLETED** (step-5)
12. **RUN_COMPLETED** - Execution completes

### Signal Timing

**PAUSE signal** is sent **after** step-3 completes but **before** step-4 starts.

**RESUME signal** is sent **while** the workflow is in PAUSED state.

### Key Assertions

- Steps 1-3 execute **before** PAUSE
- Steps 4-5 execute **after** RESUME
- No steps execute while workflow is PAUSED
- Final status is COMPLETED (not PAUSED or FAILED)
- All events have sequential `runSeq` values (0-16)

See [`expected-events.jsonl`](./expected-events.jsonl) for the complete event log.

---

## Validation Report

The plan validates successfully against the Temporal adapter.

**Capabilities required**: `["basic-execution", "signal.pause.native"]`

**Validation status**: `VALID`

See [`validation-report.json`](./validation-report.json) for details.

---

## Running This Path

### Prerequisites

- DVT Engine running with Temporal adapter (supports native pause/resume signals)
- (Optional) PostgreSQL for state persistence

### Execution

```bash
# From repository root
cd examples/plan-cancel-and-resume

# Validate plan against schema
npm run test:contracts:validate

# Submit plan to engine
dvt-cli submit plan.v1.1.json

# Wait for step-3 to complete
dvt-cli wait-for-step <runId> step-3

# Send PAUSE signal
dvt-cli signal <runId> PAUSE

# Verify workflow is paused
dvt-cli status <runId>  # Should show: PAUSED

# Send RESUME signal
dvt-cli signal <runId> RESUME

# Wait for completion
dvt-cli wait <runId>

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
✅ STEP_STARTED (step-2)
✅ STEP_COMPLETED (step-2)
✅ STEP_STARTED (step-3)
✅ STEP_COMPLETED (step-3)
✅ SIGNAL_ACCEPTED (PAUSE)
✅ RUN_PAUSED
--- Workflow paused ---
✅ SIGNAL_ACCEPTED (RESUME)
✅ RUN_RESUMED
✅ STEP_STARTED (step-4)
✅ STEP_COMPLETED (step-4)
✅ STEP_STARTED (step-5)
✅ STEP_COMPLETED (step-5)
✅ RUN_COMPLETED

Total duration: Variable (depends on pause duration)
Status: COMPLETED
```

---

## Contract Test Usage

This plan is used in CI/CD pipelines to validate:
- Engine correctly handles PAUSE signal
- Workflow stops executing new steps while PAUSED
- Engine correctly handles RESUME signal
- Workflow resumes from correct state after RESUME
- Event sequencing is correct through pause/resume cycle
- StateStore projections correctly reflect PAUSED and RUNNING states

**CI Workflow**: `.github/workflows/golden-paths.yml`

---

## Adapter Compatibility

**Temporal**: ✅ Native support via workflow signals

**Conductor**: ⚠️ Requires emulation (polling-based pause)

See [adapters.capabilities.json](../../docs/architecture/engine/contracts/capabilities/adapters.capabilities.json) for full adapter comparison.

---

## References

- [IWorkflowEngine.v1.md](../../docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) - Signal catalog (Section 2.3)
- [ExecutionSemantics.v1.md](../../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md) - Pause/resume semantics
- [TemporalAdapter.spec.md](../../docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md) - Temporal signal implementation
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths tracking
