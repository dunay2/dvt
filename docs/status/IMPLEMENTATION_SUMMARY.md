# Contract Testing Pipeline - Implementation Status

## Overview

This document tracks implementation progress for contract validation and golden-path determinism checks.

The baseline infrastructure is in place and aligned with the monorepo layout.

## Implemented Foundation

### Root Scripts

- `validate:contracts`
- `golden:validate`
- `node scripts/compare-hashes.cjs`

### Package/Test Paths

- Plans and fixtures: `packages/engine/test/contracts/`
- Results: `packages/engine/test/contracts/results/`
- Baseline hashes: `.golden/hashes.json`

### CI Alignment

- `.github/workflows/contracts.yml`
- `.github/workflows/golden-paths.yml`
- `.github/workflows/test.yml`

## Current State

- Core contract/golden-path tooling is functional.
- Scripts and workflows reference package-scoped paths.
- Determinism hash comparison is wired into CI checks.

## Open Issues Summary

### Functional Work Still Open

- Adapter completion and parity validation (Temporal/Conductor tracks).
- Full runtime boundary validation coverage across all entry points.
- Golden-path matrix expansion and fixture hardening.

### Quality Debt Still Open

- Workspace lint debt in legacy/adapter areas (import order, unresolved imports, parser project boundaries).
- Remaining docs/path normalization across long-tail markdown files.

## Next Work Focus

1. Stabilize lint/type boundaries package-by-package.
2. Complete runtime boundary validation for adapter-facing entry points.
3. Expand deterministic golden-path coverage and keep baseline hashes synchronized.
4. Continue documentation normalization until all repository docs are fully consistent and English-only.

## Operational Notes

When behavior changes affect deterministic execution:

1. Regenerate golden-path results.
2. Compare against `.golden/hashes.json`.
3. Update baseline hashes intentionally.
4. Document changes in `CHANGELOG.md`.

---

**Status**: Active and usable
**Last updated**: 2026-02-13
