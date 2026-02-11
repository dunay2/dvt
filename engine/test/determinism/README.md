# Determinism Test Suite (engine)

Purpose: provide a reproducible, automated suite that verifies Temporal workflow determinism for
interpreter changes, dynamic fan-out, and artifact-derived expansion.

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

## Static Determinism Linting

The project includes automated static analysis to catch non-deterministic patterns in Temporal workflows.

### Running the linter

```bash
npm run lint:determinism
```

This command uses ESLint with a dedicated configuration (`.eslintrc.temporal.json`) to analyze workflow code in `engine/src/**/*.ts`.

### Rules enforced

The determinism linter enforces the following rules to ensure Temporal workflow determinism:

#### Restricted Globals

- **`Date` constructor**: Use `workflow.now()` instead of `new Date()` or accessing the `Date` global
- **`Date.now()`**: Use `workflow.now()` instead
- **`setTimeout`**: Use `workflow.sleep()` instead
- **`setInterval`**: Not allowed in workflows (non-deterministic)
- **`setImmediate`**: Not allowed in workflows (non-deterministic)

#### Restricted Properties

- **`Math.random()`**: Use workflow-seeded random number generation instead
- **`crypto.randomBytes()`**: Use workflow-seeded UUID generation instead
- **`crypto.randomUUID()`**: Use `workflow.uuid4()` or workflow-seeded UUID generation instead

#### Restricted Syntax

- **`new Date()` without arguments**: Use `workflow.now()` instead

### Exclusions

The following directories are excluded from determinism checks as they contain non-workflow code:

- `**/test/**/*.ts` - Test files
- `**/tests/**/*.ts` - Test files
- `**/*.test.ts` - Test files
- `**/*.spec.ts` - Test files
- `**/workers/**/*.ts` - Worker implementations (not Temporal workflows)
- `**/adapters/**/*.ts` - Adapter implementations (not Temporal workflows)

### Example violations

❌ **Bad** (will fail lint):
```typescript
export async function myWorkflow() {
  const now = Date.now(); // Non-deterministic
  const date = new Date(); // Non-deterministic
  const random = Math.random(); // Non-deterministic
  
  setTimeout(() => { /* ... */ }, 1000); // Non-deterministic
}
```

✅ **Good** (will pass lint):
```typescript
import * as workflow from '@temporalio/workflow';

export async function myWorkflow() {
  const now = workflow.now(); // Deterministic
  await workflow.sleep('1 second'); // Deterministic
  
  // Use workflow.uuid4() for deterministic UUID generation
  const id = workflow.uuid4();
}
```

### Integration with CI

The determinism linter runs automatically in CI via the `.github/workflows/replay_suite.yml` workflow. The build will fail if any violations are detected.

To run locally before committing:
```bash
npm run lint:determinism
```

Notes:

- This README is a template. Implement concrete tests using your project test framework (Jest/Mocha) and Temporal test harness.

