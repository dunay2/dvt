## Summary

This PR packages two aligned improvements:

1. Postgres adapter schema hardening follow-up.
2. Parallel Issue #226 implementation: glossary terminology validator.

## What changed

### A) Postgres schema hardening follow-up

- Updated `ensureSchema()` in `PostgresStateStoreAdapter` to remove redundant uniqueness and perform safe backward-compat cleanup.
- Kept `claimed_at` migration-safe handling while ensuring old schema/index states are normalized.
- Added deterministic index/constraint cleanup for legacy deployments.

### B) Issue #226: `validate-glossary-usage`

- Added `scripts/validate-glossary-usage.cjs`.
- Script parses glossary canonical terms and prohibited synonyms from `GlossaryContract.v1.md`.
- Script scans contracts markdown and reports deterministic `file:line:column` findings.
- Added warning/error modes (`--mode warn|error`, env flags).
- Wired into:
  - root scripts (`contracts:glossary:validate`, `validate:glossary`)
  - `@dvt/cli` contract bundle (`validate-contracts.cjs`) in warning mode.
  - contracts CI workflow warning step.

### C) CI integration refinement

- In contracts workflow, adapter-postgres integration step now executes Vitest smoke file directly with integration env, ensuring real execution path under Postgres service.

## Validation

- `pnpm contracts:glossary:validate` ✅ (warning mode, findings reported, non-blocking)
- `pnpm validate:contracts` ✅ (bundle passes, glossary included in warning mode)
- `pnpm --filter @dvt/engine build` ✅
- `pnpm --filter @dvt/adapter-postgres build` ✅
- `pnpm --filter @dvt/adapter-postgres exec vitest run test/smoke.test.ts --config vitest.config.cjs` with integration env ✅ (3/3)

## Notes

- Glossary validator is intentionally warning-first for CI to avoid mass-doc churn in one PR.
- Blocking mode is exposed via `pnpm validate:glossary` for progressive hardening.
