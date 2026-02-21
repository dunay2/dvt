```markdown
# ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)

- **Status**: Accepted
- **Date**: 2026-02-14
- **Owners**: Engine/Adapters maintainers
- **Related files**:
  - [`packages/adapter-temporal/package.json`](../../packages/adapter-temporal/package.json)
  - [`packages/adapter-temporal/test/integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts)

---

## Context

Temporal integration tests in the adapter showed two recurring failure modes:

1. Missing compiled workflow artifact before test run (`MODULE_NOT_FOUND` for `dist/workflows/RunPlanWorkflow.js`).
2. Teardown/lifecycle races in time-skipping mode (double shutdown or wrong shutdown order).

The adapter test suite depends on compiled workflow output in `dist/workflows/` and predictable worker/client teardown behavior.

---

## Decision

### 1) Build precondition is mandatory and explicit

Integration tests MUST be executed via [`test:integration`](../../packages/adapter-temporal/package.json), and this script MUST run build explicitly before the test runner.

Integration tests MUST fail fast with a clear error message when `dist/workflows/RunPlanWorkflow.js` is missing.

### 2) Single teardown owner

Worker shutdown + `runPromise` await MUST be centralized in `afterAll` in [`integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts).

Test body MUST NOT trigger additional shutdown calls.

### 3) Prefer environment-provided client in time-skipping tests

When available, tests MUST use `env.workflowClient` / `env.client` before manual `new WorkflowClient(...)` fallback.

### 4) Clarification on bundling

This ADR does **not** reject Temporal workflow bundles. It states only that we do **not** add a separate new bundling toolchain step right now.

- Current test/dev path: compiled workflows from `dist/` + `workflowsPath`.
- Future option: dedicated production workflow bundling can be adopted later if needed.

### 5) Time-skipping behavior note

In time-skipping environment, prefer `execute()/result()` style where tests rely on automatic time advancement semantics.

---

## Consequences

### Positive

- Deterministic startup precondition for integration tests.
- Lower probability of intermittent teardown races.
- Clear contributor contract for running Temporal integration tests.

### Trade-offs

- Slightly longer integration startup due to explicit build step.
- Requires maintaining teardown discipline in test changes.

---

## Acceptance Criteria

1. [`test:integration`](../../packages/adapter-temporal/package.json) includes explicit build before test execution.
2. [`integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts) has a single teardown owner (`afterAll`) with no duplicate shutdown in test body.
3. [`integration.time-skipping.test.ts`](../../packages/adapter-temporal/test/integration.time-skipping.test.ts) fails fast with a targeted message if the workflow artifact is missing.
4. `pnpm --filter @dvt/adapter-temporal test:integration` passes in CI/local with compiled workflow resolution.

---

## References

- Temporal TypeScript Testing Suite: <https://docs.temporal.io/develop/typescript/testing-suite>
- Temporal `TestWorkflowEnvironment` API: <https://typescript.temporal.io/api/classes/testing.TestWorkflowEnvironment>
- Temporal `Worker` API (`runUntil`): <https://typescript.temporal.io/api/classes/worker.Worker>
- npm scripts lifecycle: <https://docs.npmjs.com/cli/v10/using-npm/scripts/>
- pnpm test command: <https://pnpm.io/cli/test>
```
