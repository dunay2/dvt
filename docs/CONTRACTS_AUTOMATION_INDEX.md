# Contract Schemas Automation Index

This document tracks the contract automation strategy and current implementation status for DVT.

---

## Scope

- Runtime contract validation at boundaries
- Contract type generation and consistency guarantees
- Golden-path fixture validation and hash comparison
- CI gates for deterministic contract behavior

---

## Current Status

| Area                                | Status         | Notes                                                              |
| ----------------------------------- | -------------- | ------------------------------------------------------------------ |
| Contract package structure          | ✅ Implemented | Canonical source under `packages/contracts`                        |
| Engine contract tests               | ✅ Implemented | Contract and type tests in `packages/engine/test/contracts`        |
| Golden-path execution scripts       | ✅ Implemented | CLI/scripts and CI aligned to package paths                        |
| Hash baseline and comparison        | ✅ Implemented | Baseline in `.golden/hashes.json`, comparison script in `scripts/` |
| Runtime boundary validation rollout | ⏳ In progress | Final integration per adapter/API boundary                         |
| Documentation normalization         | ⏳ In progress | Links and references being normalized repo-wide                    |

---

## Canonical Locations

### Contracts and Types

- `packages/contracts/src/adapters/`
- `packages/contracts/src/types/`

### Engine Tests and Golden Paths

- `packages/engine/test/contracts/plans/`
- `packages/engine/test/contracts/fixtures/`
- `packages/engine/test/contracts/results/`

### Scripts and Tooling

- `scripts/validate-contracts.cjs`
- `scripts/run-golden-paths.cjs`
- `scripts/compare-hashes.cjs`

---

## Standard Validation Flow

```bash
pnpm validate:contracts
pnpm golden:validate
node scripts/compare-hashes.cjs
```

---

## CI Integration

Validation and golden-path checks are enforced by workflow gates in `.github/workflows/`:

- `contracts.yml`
- `golden-paths.yml`
- `test.yml` (determinism/hash related checks)

---

## Open Items

1. Complete boundary-level runtime validation coverage for all adapters.
2. Keep fixtures and baseline hashes synchronized with behavior changes.
3. Continue link/path normalization after documentation relocation.

---

## References

- `docs/architecture/engine/INDEX.md`
- `docs/architecture/engine/contracts/`
- `docs/architecture/engine/VERSIONING.md`
- `docs/status/IMPLEMENTATION_SUMMARY.md`

---

**Last updated**: 2026-02-13
