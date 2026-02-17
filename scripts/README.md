# Contract Testing Scripts

This directory contains scripts for validating contract tests and golden paths as part of the CI pipeline.

## Scripts

### `validate-contracts.cjs`

Validates contract fixtures and core runtime envelopes used by the base-contract workstream.

Current checks include:

- plan fixtures under `packages/engine/test/contracts/plans/*.json`,
- contract envelope parsers (`PlanRef`, `RunContext`, `SignalRequest`, `EngineRunRef`, `RunStatusSnapshot`, `CanonicalEngineEvent`, `RunSnapshot`, `ExecuteStepRequest`, `ExecuteStepResult`),
- result artifact structure at `packages/engine/test/contracts/results/golden-paths-run.json` (if present).

**Usage:**

```bash
pnpm validate:contracts
```

**Status:** Functional for US-1.1 base-contract validation bundle.

### `run-golden-paths.cjs`

Executes the 3 required golden paths from ROADMAP.md:

1. **Hello-world plan**: 3 steps linear → completes in < 30s
2. **Pause/resume plan**: pause after step 1 → resume → same final snapshot hash
3. **Retry plan**: fail step 2 once → retry → same snapshot hash

**Usage:**

```bash
pnpm test:contracts:hashes
```

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string (optional until issue #6)

**Output:** Saves execution results to `packages/engine/test/contracts/results/golden-paths-run.json`

**Status:** Stub implementation until issue #10 (Golden Paths) provides actual implementations.

### `compare-hashes.cjs`

Compares current execution hashes against baseline in `.golden/hashes.json`.
Fails if hashes mismatch (indicates non-determinism).

**Usage:**

```bash
pnpm test:contracts:hash-compare
```

**Prerequisites:** Must run `pnpm test:contracts:hashes` first.

**Status:** Functional - lenient for 'pending' hashes until implementations are complete.

### `db-migrate.cjs`

Runs database migrations for contract testing.

**Usage:**

```bash
pnpm db:migrate
```

**Environment Variables:**

- `DATABASE_URL`: PostgreSQL connection string (required)

**Status:** Stub implementation until issue #6 (PostgresStateStoreAdapter) provides schema.

## CI Integration

These scripts are used by the `.github/workflows/contracts.yml` GitHub Actions workflow.

**Workflow Jobs:**

1. `contract-compile`: Validates types compile (`tsc --noEmit`)
2. `contract-validate`: Validates golden JSON fixtures against schemas
3. `contract-hashes`: Runs golden paths, compares snapshot hashes

**Required Checks:** All jobs must pass before merge to main branch.

## Development Notes

- **Blocked by issue #10**: Golden Paths examples must exist before full functionality
- **Blocked by issue #6**: PostgresStateStoreAdapter schema needed for migrations
- **Blocked by issue #2**: TypeScript types needed for schema validation

Scripts currently run in "stub mode" and will pass CI while awaiting dependencies.
Once dependencies are resolved, scripts will perform full validation.

## References

- [ROADMAP.md](../ROADMAP.md) - Phase 1 Success Criteria
- [Issue #17](https://github.com/dunay2/dvt/issues/17) - CI contract testing pipeline (this implementation)
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths examples (blocking)
- [Issue #6](https://github.com/dunay2/dvt/issues/6) - PostgresStateStoreAdapter MVP (blocking)
- [Issue #2](https://github.com/dunay2/dvt/issues/2) - TypeScript types (blocking)
