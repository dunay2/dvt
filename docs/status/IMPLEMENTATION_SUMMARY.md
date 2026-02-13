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

## Issue Audit Snapshot (2026-02-13)

Repository audit was reconciled against active package paths (`packages/*`) and issue comments were updated with concrete evidence.

### Updated in GitHub

- #67: **Partial** (validation helpers exist mainly in legacy path; active path boundary wiring still pending).
- #68: **Not started** (Temporal package is placeholder; engine Temporal adapter still stub).
- #69: **Not started** (Conductor adapter package not present; engine Conductor adapter stub only).
- #70: **Partial** (`.golden/hashes.json` exists, but `examples/` fixtures missing in current workspace and hashes still pending).
- #71: **Blocked / not started** (depends on non-stub Conductor foundation).
- #72: **Not started on active path** (version-binding enforcement currently visible in legacy area, not active runtime path).
- #73: **Partial** (determinism tests for engine + mock exist; cross-adapter determinism blocked by adapter implementation gaps).
- #14: **Mostly implemented** in active engine path; issue checklist should be refreshed to current API names and remaining deltas.
- #15: **Not started** (Temporal interpreter workflow not implemented in active packages).
- #5: Legacy scope likely superseded by #68; kept open with audit note to avoid duplicate tracking confusion.
- #6: **Not started** in active adapter package (Postgres package currently placeholder).
- #76 and #79: active repository-governance tracking for monorepo/path normalization and stale local reference cleanup.

### Suggested canonical execution order

1. Complete #6 and #68 foundations (Postgres + Temporal active implementations).
2. Resolve #67 on active API boundaries.
3. Complete #70 fixtures and executable golden-path runs.
4. Progress #69 and #71 (Conductor + draining policies).
5. Finalize #72 and then expand #73 cross-adapter determinism.

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

**Status**: Active and usable (with audited gaps tracked)
**Last updated**: 2026-02-13
