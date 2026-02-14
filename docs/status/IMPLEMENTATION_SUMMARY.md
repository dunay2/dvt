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

## Issue Audit Snapshot (2026-02-14)

Repository audit was reconciled against active package paths (`packages/*`) and issue comments were updated with concrete evidence.

### Closures applied during this audit pass

- #92 **Closed**: documentation corrected in [`docs/guides/QUALITY.md`](../guides/QUALITY.md) to reflect real Vitest configs in package scope and current watch command usage.
- #91 **Closed**: [`eslint.config.cjs`](../../eslint.config.cjs) normalized to a single active flat-config export.

### Tracker comments updated (state refinement without closure)

- #68: evidence posted for active Temporal adapter implementation in [`packages/adapter-temporal/src/TemporalAdapter.ts`](../../packages/adapter-temporal/src/TemporalAdapter.ts), workflows/activities, and tests; left as near-closure pending checklist alignment.
- #14: evidence posted for engine core and projector implementation in [`packages/engine/src/core/WorkflowEngine.ts`](../../packages/engine/src/core/WorkflowEngine.ts) and [`packages/engine/src/core/SnapshotProjector.ts`](../../packages/engine/src/core/SnapshotProjector.ts); left open pending checklist/API wording refresh.

### Updated in GitHub

- #67: **Partial** (validation helpers exist mainly in legacy path; active path boundary wiring still pending).
- #68: **In progress / near-closure** (Temporal adapter is implemented on active `packages/*` paths with workflow, activities, provider selection, and integration test harness; pending final CI workflow closure + tracker publication alignment).
- #69: **Not started** (Conductor adapter package not present; engine Conductor adapter stub only).
- #70: **Partial** (`.golden/hashes.json` exists, but `examples/` fixtures missing in current workspace and hashes still pending).
- #71: **Blocked / not started** (depends on non-stub Conductor foundation).
- #72: **Not started on active path** (version-binding enforcement currently visible in legacy area, not active runtime path).
- #73: **Partial** (determinism tests for engine + mock exist; cross-adapter determinism still blocked mainly by Conductor gaps).
- #14: **Mostly implemented** in active engine path; issue checklist should be refreshed to current API names and remaining deltas.
- #15: **In progress** (Temporal interpreter workflow exists in active package implementation; issue tracking/checklist requires refresh to match current code evidence).
- #5: **Superseded scope** by #68 for active monorepo implementation tracking.
- #6: **Not started** in active adapter package (Postgres package currently placeholder).
- #76 and #79: active repository-governance tracking for monorepo/path normalization and stale local reference cleanup.

### Suggested canonical execution order

1. Finalize #68 closure track (CI workflow update + publication of canonical tracker status).
2. Complete #6 foundation (Postgres active implementation).
3. Resolve #67 on active API boundaries.
4. Complete #70 fixtures and executable golden-path runs.
5. Progress #69 and #71 (Conductor + draining policies), then finalize #72 and expand #73 cross-adapter determinism.

### Quality Debt Still Open

- Workspace lint debt in legacy/adapter areas (import order, unresolved imports, parser project boundaries).
- Remaining docs/path normalization across long-tail markdown files.

## Next Work Focus

1. Stabilize lint/type boundaries package-by-package.
2. Complete runtime boundary validation for adapter-facing entry points.
3. Expand deterministic golden-path coverage and keep baseline hashes synchronized.
4. Continue documentation normalization until all repository docs are fully consistent and English-only.

## Recent Low-Priority Completed Task (2026-02-14)

- Issue [#82](https://github.com/dunay2/dvt/issues/82) closed.
- Change applied in [`validateStepShape()`](packages/adapter-temporal/src/activities/stepActivities.ts:172): hoisted allowed step fields to module-level constant to avoid per-call `Set` allocation.
- Validation evidence: `pnpm --filter @dvt/adapter-temporal test` passed (19 tests).

## Operational Notes

When behavior changes affect deterministic execution:

1. Regenerate golden-path results.
2. Compare against `.golden/hashes.json`.
3. Update baseline hashes intentionally.
4. Document changes in `CHANGELOG.md`.

---

**Status**: Active and usable (with audited gaps tracked)
**Last updated**: 2026-02-14
