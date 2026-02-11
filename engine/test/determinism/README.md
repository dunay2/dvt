# Determinism Test Suite (engine)

Purpose: provide a reproducible, automated suite that verifies Temporal workflow determinism for interpreter changes, dynamic fan-out, and artifact-derived expansion.

Goals:

- Replay tests for representative plans (linear, parallel, dynamic expansion)
- Fuzz tests that vary artifact-derived expansion inputs
- Versioning tests that exercise `workflow.getVersion` guards

Local run (recommended):

- Start Temporal dev server (or use the included docker-compose if available)
- Run tests with `npm test` or `pnpm test` in the project root

Files:

- `sample_determinism.test.ts` — example Jest test skeleton using Temporal test env
- `fuzz_cases/` — place to store generated artifact snapshots for fuzz inputs

CI integration:

- Add a pipeline job that runs determinism tests in an isolated environment and fails the PR on regressions.

Notes:

- This README is a template. Implement concrete tests using your project test framework (Jest/Mocha) and Temporal test harness.
