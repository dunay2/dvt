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
