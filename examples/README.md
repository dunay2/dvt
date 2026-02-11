# DVT Engine - Golden Paths Examples

**Purpose**: Reproducible, executable examples that serve as "golden paths" for validating the DVT workflow engine.

**Status**: v1.0 - Contract test fixtures for Phase 1 MVP

---

## Overview

This directory contains minimal, executable plan examples that:
- **Validate core engine semantics** (parallel execution, pause/resume, etc.)
- **Serve as contract test fixtures** in CI/CD pipelines
- **Document the happy path** for plan authors
- **Enable reproducible testing** against any compliant engine implementation

Each golden path includes:
- `plan.v1.1.json` - A valid execution plan conforming to plan schema v1.1
- `validation-report.json` - Expected validation output from the engine
- `expected-events.jsonl` - Expected event log (order-independent where applicable)
- `README.md` - Purpose and execution instructions for the specific path

---

## Golden Paths

### 1. plan-minimal

**Purpose**: "Hello World" for the DVT engine

**What it does**:
- Single step that executes a simple echo task
- Minimal dependencies and configuration
- Completes in < 5 seconds

**Use case**: Verify basic engine execution without complexity

**Directory**: [`plan-minimal/`](./plan-minimal/)

---

### 2. plan-parallel

**Purpose**: Validate parallel scheduling semantics

**What it does**:
- 3 independent steps execute in parallel
- 1 final step merges results (fan-in pattern)
- Tests concurrent execution and dependency resolution

**Use case**: Verify engine correctly schedules parallel tasks

**Directory**: [`plan-parallel/`](./plan-parallel/)

---

### 3. plan-cancel-and-resume

**Purpose**: Validate pause/resume signal semantics

**What it does**:
- 5 sequential steps
- PAUSE signal sent after step 3 completes
- RESUME signal sent to continue execution
- Steps 4-5 complete after resume

**Use case**: Verify engine correctly handles workflow suspension and resumption

**Directory**: [`plan-cancel-and-resume/`](./plan-cancel-and-resume/)

---

## Running Golden Paths

### Prerequisites

1. **Node.js >= 18.0.0**
2. **DVT Engine** running locally or accessible via network
3. **(Optional) PostgreSQL** for state persistence

### Quick Start

Execute all golden paths:

```bash
# From repository root
bash examples/test-runner.sh
```

This script will:
1. Validate each plan against the schema
2. Execute the plan using the engine
3. Compare actual events against expected events
4. Report success/failure for each path

### Running Individual Paths

```bash
# Run plan-minimal
cd examples/plan-minimal
# Submit plan to engine (implementation-specific)
# Compare output events against expected-events.jsonl

# Run plan-parallel
cd examples/plan-parallel
# Submit plan to engine
# Verify parallel execution

# Run plan-cancel-and-resume
cd examples/plan-cancel-and-resume
# Submit plan to engine
# Send PAUSE signal after step 3
# Send RESUME signal
# Verify completion
```

### Environment Variables

- `ENGINE_URL` - Engine API endpoint (default: `http://localhost:8080`)
- `DATABASE_URL` - PostgreSQL connection string (optional)
- `TIMEOUT_MS` - Maximum execution time per plan (default: `60000`)

---

## Validation

### Plan Schema Validation

All plans MUST validate against the plan schema v1.1:

```bash
npm run test:contracts:validate
```

### Event Log Validation

Expected events are specified in `expected-events.jsonl`. The validation compares:
- Event types
- Event ordering (strict for sequential steps, order-independent for parallel)
- Critical fields (runId, stepId, status)

**Note**: Timestamps, UUIDs, and other generated values are NOT compared.

---

## CI Integration

Golden paths are executed on every pull request via GitHub Actions.

**Workflow**: [`.github/workflows/golden-paths.yml`](../.github/workflows/golden-paths.yml)

**Jobs**:
1. **validate-plans**: Validate JSON against schema
2. **execute-plans**: Run all golden paths
3. **compare-events**: Compare actual vs expected events

**Required Check**: All jobs must pass before merge

---

## Adding New Golden Paths

To add a new golden path:

1. **Create directory**: `examples/plan-{name}/`
2. **Add plan**: `plan.v1.1.json` (valid against schema)
3. **Add validation report**: `validation-report.json`
4. **Add expected events**: `expected-events.jsonl`
5. **Add documentation**: `README.md`
6. **Update test runner**: Add to `test-runner.sh`
7. **Update this README**: Document the new path

---

## References

- [IWorkflowEngine.v1.md](../docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md) - Engine interface contract
- [ExecutionSemantics.v1.md](../docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md) - Execution semantics
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths implementation tracking

---

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Initial golden paths: minimal, parallel, cancel-and-resume |
