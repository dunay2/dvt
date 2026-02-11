# Determinism Tooling Guide (Developer)

**Audience**: Plan authors, SDK implementers, QA engineers  
**Purpose**: Enforce deterministic execution in plans (Pre-commit gating)  
**Status**: Phase 1 (gating enabled)  
**References**: [ExecutionSemantics](../contracts/engine/ExecutionSemantics.v1.md), [TemporalAdapter](../adapters/temporal/TemporalAdapter.spec.md)

---

## 1) Determinism Requirement (MUST)

All plans MUST be **deterministic** for the interpreter workflow to replay correctly.

**Rule**: A plan is deterministic if replaying the exact same inputs + events produces identical outputs (step-by-step).

```ts
// ✅ Deterministic
const step: Step = {
  stepId: "fetch-users",
  type: "SQL_QUERY",
  query: "SELECT * FROM users WHERE tenant_id = ?",
  params: [tenantId],  // Fixed input
  timeout: 30000
};

// ❌ Non-deterministic (uses Date.now())
const step: Step = {
  stepId: "fetch-recent",
  type: "SQL_QUERY",
  query: `SELECT * FROM users WHERE created_at > '${new Date().toISOString()}'`
};

// ❌ Non-deterministic (uses Math.random())
const parallelism = Math.random() > 0.5 ? 4 : 8;
```

---

## 2) Pre-Commit Hooks (Gating)

**Mandatory**: All plans must pass eslint determinism checks before merge.

### 2.1 Setup

```bash
# Install pre-commit hook (one-time)
npm run setup-hooks

# This installs:
#   .husky/pre-commit → runs eslint + determinism-linter
#   .husky/pre-push → runs integration tests
```

### 2.2 ESLint Determinism Plugin

**Config** (.eslintrc.json in plan repo):

```json
{
  "plugins": ["determinism-rules"],
  "rules": {
    "determinism-rules/no-date-now": "error",
    "determinism-rules/no-math-random": "error",
    "determinism-rules/no-dynamic-strings": "error",
    "determinism-rules/no-non-idempotent-state": "error",
    "determinism-rules/no-external-api-calls": "warn",
    "determinism-rules/no-uuid-generation": "error"
  }
}
```

**Run manually**:

```bash
npm run lint -- plans/plan-dbt-01.json

# Output:
# plans/plan-dbt-01.json
#   [Line 45] error: Non-deterministic Date.now() in step condition
#   [Line 67] error: Math.random() for parallelism (must use fixed value)
#   [Line 89] warn: External API call (may timeout non-deterministically)
#   × 2 errors, ○ 1 warning
```

---

## 3) Determinism Linter Rules

### 3.1 No Date.now() / Current Time

```json
// ❌ FAIL
{
  "stepId": "check-window",
  "condition": "NOW() > '${Date.now()}'"
}

// ✅ PASS
{
  "stepId": "check-window",
  "condition": "NOW() > ?",
  "params": ["${input.runStartTime}"]
}
```

**Rationale**: Each replay would see different "now", breaking determinism.

### 3.2 No Math.random()

```json
// ❌ FAIL
{
  "stepId": "fan-out",
  "parallelism": "Math.random() > 0.5 ? 10 : 1"
}

// ✅ PASS
{
  "stepId": "fan-out",
  "parallelism": 10
}
```

**Rationale**: Random decisions differ on replay.

### 3.3 No Dynamic Strings

```json
// ❌ FAIL (string generated at runtime)
{
  "stepId": "query",
  "query": `SELECT * FROM users WHERE dept = '${tenantDept}'`
}

// ✅ PASS (parameterized)
{
  "stepId": "query",
  "query": "SELECT * FROM users WHERE dept = ?",
  "params": [tenantDept]
}
```

**Rationale**: Avoids SQL injection + ensures parameter binding is deterministic.

### 3.4 No Non-Idempotent State

```json
// ❌ FAIL (reads previous state)
{
  "stepId": "increment-counter",
  "type": "CUSTOM",
  "code": "counter = db.get(key) + 1; db.set(key, counter); return counter;"
}

// ✅ PASS (idempotent, input-driven)
{
  "stepId": "compute-next-id",
  "type": "CUSTOM",
  "code": "return input.currentId + 1;"
}
```

**Rationale**: State mutations are non-deterministic across retries.

### 3.5 External API Calls (Warn Only)

```json
{
  "stepId": "fetch-exchange-rate",
  "type": "HTTP",
  "url": "https://api.example.com/rate?pair=USD-EUR",
  "timeout": 30000
}
```

**Warning** (not error):

```
⚠️ External API calls are non-deterministic (may timeout or vary).
   Consider: inject pre-computed value or use deterministic fallback.
```

**Mitigation**: Cache API result as artifact; reuse on replay.

### 3.6 UUID Generation (Error)

```json
// ❌ FAIL
{
  "stepId": "generate-request-id",
  "type": "CUSTOM",
  "code": "return uuidv4();"
}

// ✅ PASS (derived from deterministic input)
{
  "stepId": "generate-request-id",
  "type": "CUSTOM",
  "code": "return sha256(input.runId + input.stepId);"
}
```

---

## 4) Replay Test Suite

**Purpose**: Verify plan determinism locally before merge.

### 4.1 Single-Run Replay Test

```typescript
import { ReplayTester } from "@dvt/testing";

describe("Plan: plan-dbt-01, determinism", () => {
  let tester: ReplayTester;

  beforeEach(() => {
    tester = new ReplayTester({
      planPath: "./plans/plan-dbt-01.json",
      adapter: "temporal",
      stateStoreUrl: "postgresql://localhost:5432/test_db"
    });
  });

  it("should produce identical snapshots across replays", async () => {
    // 1. First run: execute normally
    const run1 = await tester.executeRun({
      runId: "test-run-001",
      input: {
        datasetId: "dataset-123",
        targetTable: "results"
      }
    });

    const snapshot1 = await tester.getRunSnapshot(run1.runId);

    // 2. Second run: replay with same inputs
    const run2 = await tester.replayRun({
      originalRunId: run1.runId,
      inputOverrides: {} // Use exact same input
    });

    const snapshot2 = await tester.getRunSnapshot(run2.runId);

    // 3. Assert snapshots are identical
    expect(snapshot2).toEqual(snapshot1);
  });

  it("should match artifacts across attempts", async () => {
    // Run once
    const run1 = await tester.executeRun({...});
    const artifacts1 = await tester.getArtifacts(run1.runId);

    // Simulate retry (same attempt ID)
    const artifacts2 = await tester.executeAttempt({
      runId: run1.runId,
      engineAttemptId: "temporal-attempt-42",
      inputOverrides: {}
    });

    // Artifacts (by hash) should be identical
    expect(artifacts2.map(a => a.sha256)).toEqual(artifacts1.map(a => a.sha256));
  });
});
```

### 4.2 Multi-Attempt Determinism Check

```typescript
it("should replay deterministically across 3 retries", async () => {
  const snapshots = [];

  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await tester.replayFromEvent({
      runId: "test-run-determinism",
      fromEventSeq: 1, // Replay from beginning
      engineAttemptId: `temporal-attempt-${attempt}`,
    });

    const snapshot = await tester.getRunSnapshot(result.runId);
    snapshots.push(snapshot);
  }

  // All three snapshots should be byte-for-byte identical
  const [snapshot0, snapshot1, snapshot2] = snapshots;
  expect(snapshot1).toEqual(snapshot0);
  expect(snapshot2).toEqual(snapshot0);
});
```

---

## 5) CI Integration (GitHub Actions)

**File**: `.github/workflows/determinism-gate.yml`

```yaml
name: Determinism Gate

on: [pull_request, push]

jobs:
  determinism-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "18.x"

      - name: Install dependencies
        run: npm ci

      - name: Run determinism ESLint
        run: npm run lint:determinism
        
      - name: Run replay tests
        run: npm run test:determinism
        
      - name: Generate determinism report
        if: always()
        run: npm run report:determinism
        
      - name: Comment PR with report
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('determinism-report.md', 'utf-8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });
```

**Example PR Comment**:

```
✅ Determinism Check: PASSED

| Plan | ESLint | Replay Tests | Status |
|------|--------|--------------|--------|
| plan-dbt-01 | ✅ | ✅ 5/5 passed | 🟢 |
| plan-kafka-sink | ⚠️ 1 warn | ✅ 3/3 passed | 🟡 |

**Warnings**:
- `plan-kafka-sink` step `http-call`: External API (non-deterministic)
  
**Next Steps**:
- [ ] Address ESLint warnings
- [ ] Check PR reviewer approval
```

---

## 6) Local Debugging

### 6.1 Record Execution History

```bash
# Run plan and save full event log (for replay debugging)
dvt-cli run-and-record \
  --plan-path ./plans/plan-dbt-01.json \
  --output-dir ./test-artifacts/run-001 \
  --include-state-snapshots

# Creates:
#   run-001/events.jsonl (canonical event log)
#   run-001/snapshots/ (snapshots per runSeq)
#   run-001/artifacts/ (all stored artifacts)
```

### 6.2 Replay Recorded Run

```bash
# Replay from recorded history (offline)
dvt-cli replay-from-record \
  --plan-path ./plans/plan-dbt-01.json \
  --history-path ./test-artifacts/run-001/events.jsonl \
  --output-dir ./test-artifacts/run-001-replay \
  --compare-snapshots

# Output:
# Comparing snapshots...
# ✅ runSeq 1-50: IDENTICAL
# ⚠️ runSeq 51: DIVERGED (step-xyz output changed)
#   Expected: artifact-hash-abc123
#   Got:      artifact-hash-xyz789
```

### 6.3 Trace Step Divergence

```bash
# Narrow down which step caused divergence
dvt-cli trace-divergence \
  --plan-path ./plans/plan-dbt-01.json \
  --history-path ./test-artifacts/run-001/events.jsonl \
  --divergence-seq 51

# Binary search logs:
# Checking step-49: ✅ identical
# Checking step-50: ❌ diverged
#
# Root cause found at step 50: "dbt-run"
#   Input: {...}
#   Output (expected): {...}
#   Output (got): {...}
#   
#   Likely cause:
#   - Step timeout configuration changed
#   - External data source (API, DB) returned different result
#   - Non-deterministic logic (random, time-based)
```

---

## 7) Writing Deterministic Plans

### 7.1 Template: Deterministic Step

```json
{
  "stepId": "fetch-data",
  "type": "SQL_QUERY",
  
  "description": "Deterministic: fixed query, parameterized inputs",
  
  "query": "SELECT * FROM users WHERE tenant_id = ? AND created_at > ?",
  "params": [
    "${input.tenantId}",
    "${input.cutoffDate}"
  ],
  
  "timeout": 30000,
  "retryPolicy": {
    "maxAttempts": 3,
    "backoff": "exponential",
    "backoffBaseSeconds": 1
  },
  
  "fallback": {
    "type": "SKIP_STEP",
    "reason": "Non-critical; continue if query times out"
  }
}
```

### 7.2 Template: Idempotent Branching

```json
{
  "stepId": "branch-by-count",
  "type": "DECISION",
  
  "description": "Deterministic: branch depends on deterministic input, not random state",
  
  "conditions": [
    {
      "name": "large-dataset",
      "expression": "${steps['fetch-data'].output.rowCount} > 1000000",
      "nextStep": "dbt-run-distributed"
    },
    {
      "name": "small-dataset",
      "expression": "${steps['fetch-data'].output.rowCount} <= 1000000",
      "nextStep": "dbt-run-single"
    }
  ],
  
  "default": "dbt-run-single"
}
```

---

## 8) Common Pitfalls & Fixes

| Pitfall | Problem | Fix |
|---------|---------|-----|
| SQL with `NOW()` | Time varies on replay | Use `${input.runStartTime}` parameter |
| Random parallelism | Retry may differ | Use fixed `parallelism: 10` |
| Conditional on external API | API response may differ | Cache result as artifact; reuse on replay |
| State mutation in loop | Loop counter non-deterministic | Use immutable accumulation + final step |
| plugin UUID generation | UUID differs per run | Use deterministic hash (runId + stepId) |
| Timestamp in artifact name | Artifact path differs | Use runSeq or stepId in name |

---

## 9) Determinism Report (CI Output)

**File generated**: `determinism-report.md`

```markdown
# Determinism Check Report

**Plan**: plan-dbt-01  
**Version**: v2.1  
**Timestamp**: 2026-02-11 14:30:00 UTC

## Summary
✅ **PASSED** (ESLint + Replay tests)

## ESLint Results
- Total issues: 0
- Errors: 0
- Warnings: 0

## Replay Test Results
- Total runs: 5
- Replayed runs: 5
- Divergences: 0
- Artifacts matched: 100% (SHA256)

## Step-by-Step Analysis
| Step | Type | Status | Notes |
|------|------|--------|-------|
| fetch-users | SQL | ✅ | Deterministic, parameterized |
| dbt-run | DBT | ✅ | Fixed transformation |
| store-results | Artifact | ✅ | Idempotent store |

## Recommendations
- None; plan is ready for production.

## Checklist
- [x] All steps ESLint-clean
- [x] Replay tests passed
- [x] Artifacts verified
- [x] No external API dependencies
- [x] Ready to merge
```

---

## 10) Further Learning

- **Temporal Determinism**: [Temporal Workflow Determinism](https://docs.temporal.io/workflows#determinism)
- **Event Sourcing**: [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- **Idempotency**: [Idempotency Guide](https://stripe.com/blog/idempotency)

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-11 | Pre-commit determinism gating for Phase 1 MVP |
