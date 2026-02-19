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
- `DVT_PG_SCHEMA`: target schema (optional, defaults to `dvt`)

**Current behavior:**

- Executes ordered SQL files from `packages/adapter-postgres/migrations/*.sql`
- Tracks applied versions in `<schema>.schema_migrations`
- Replaces `__SCHEMA__` placeholders inside migration files

**Status:** Functional (Issue #6 real PostgreSQL persistence enabled).

### `validate-rfc2119.cjs`

Scans contract markdown files under `docs/architecture/engine/contracts/**.md` and detects
lowercase RFC 2119 normative keywords in prose (for example: `must`, `should`, `may`).

The script is intentionally warning-first and deterministic for CI logs.

### `validate-executable-examples.cjs`

Validates TypeScript examples embedded in contract markdown docs.

**Scope:**

- `docs/architecture/engine/contracts/**/*.md`
- fenced code blocks tagged as `ts` / `typescript`

**Usage:**

```bash
pnpm contracts:rfc2119:validate
```

**Modes:**

- Default warning mode: `pnpm contracts:rfc2119:validate`
- Error mode (future strict gate): `RFC2119_MODE=error node scripts/validate-rfc2119.cjs`

**Output:**

- Per-file findings with `line:column`
- Suggested uppercase replacement (`must` -> `MUST`)

**Status:** Functional in warning mode (Issue #229).

### `validate-glossary-usage.cjs`

Validates terminology usage in contract markdown files against the canonical glossary:
`docs/architecture/engine/contracts/engine/GlossaryContract.v1.md`.

**Checks:**

- parses canonical terms (section 2),
- parses prohibited synonyms (section 10),
- reports prohibited synonym usage in contract markdown files with deterministic
  `file:line:column` output.

**Usage:**

```bash
pnpm contracts:glossary:validate
pnpm validate:glossary
```

**Modes:**

- Warning mode (non-blocking): `pnpm contracts:glossary:validate`
- Error mode (blocking): `pnpm validate:glossary`

**Status:** Functional in warning mode for CI (`contracts.yml`) and wired into
`validate:contracts` bundle (Issue #226).

### `validate-references.cjs`

Validates cross-contract markdown references under
`docs/architecture/engine/contracts/**/*.md`.

**Checks:**

- local link targets exist
- label/file version alignment when both include explicit `vX[.Y[.Z]]`
- deprecated-reference heuristics (warning phase)

**Usage:**

```bash
pnpm contracts:references:validate
```

**Modes:**

- Default warning mode: `pnpm contracts:references:validate`
- Error mode (hardened phase): `REFS_MODE=error node scripts/validate-references.cjs`

**Output:**

- grouped findings by category
- `file:line:column` location per finding

**Status:** Functional in warning mode (Issue #228).

**Usage:**

```bash
pnpm contracts:examples:validate
```

**Behavior:**

- Extracts code snippets from markdown fences
- Attempts TypeScript parse/transpile validation with adaptive wrapping strategies
- Fails with actionable diagnostics (`file`, `snippet index`, `line:column`, TS code)

**Status:** Functional for Issue #230 executable examples validation.

## CI Integration

These scripts are used by the `.github/workflows/contracts.yml` GitHub Actions workflow.

**Workflow Jobs:**

1. `contract-compile`: Validates types compile (`tsc --noEmit`)
2. `contract-validate`: Validates golden JSON fixtures against schemas
3. `contract-hashes`: Runs golden paths, compares snapshot hashes

`contract-validate` also runs RFC 2119 scan in warning mode.

`contract-validate` also runs cross-reference validation in warning mode.

**Required Checks:** All jobs must pass before merge to main branch.

## Development Notes

- **Blocked by issue #10**: Golden Paths examples must exist before full functionality
- **Issue #6 implemented**: PostgresStateStoreAdapter now uses real SQL persistence + migration flow
- **Blocked by issue #2**: TypeScript types needed for schema validation

`db-migrate.cjs` is no longer in stub mode. Remaining stubs are limited to flows blocked by unresolved feature issues.

## References

- [ROADMAP.md](../ROADMAP.md) - Phase 1 Success Criteria
- [Issue #17](https://github.com/dunay2/dvt/issues/17) - CI contract testing pipeline (this implementation)
- [Issue #10](https://github.com/dunay2/dvt/issues/10) - Golden Paths examples (blocking)
- [Issue #6](https://github.com/dunay2/dvt/issues/6) - PostgresStateStoreAdapter MVP (blocking)
- [Issue #2](https://github.com/dunay2/dvt/issues/2) - TypeScript types (blocking)
