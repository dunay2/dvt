# refactor(monorepo): finalize Option A package-first structure

## Motivation

Complete the remaining cleanup required for a strict package-first architecture under `packages/*`.

## Problem Summary

- Some legacy paths and lint constraints still produce avoidable noise.
- Not all documentation and references are fully normalized.

## Objective

Ensure package boundaries are the only active source of truth and keep CI/tooling/docs aligned.

## Checklist

- [ ] Resolve remaining `parserOptions.project` and import-order debt.
- [ ] Confirm all scripts/workflows target package-scoped paths.
- [ ] Remove/deprecate stale top-level wrappers as needed.
- [ ] Finalize docs normalization and strategic status updates.

## Acceptance Criteria

- `pnpm -r build` succeeds.
- `pnpm -r test` succeeds for packages with tests.
- `pnpm -r lint` succeeds for migrated targets.
- No duplicate active code paths outside canonical packages.

## References

- `docs/ARCHITECTURE_ANALYSIS.md`
- `docs/REPO_STRUCTURE_SUMMARY.md`
- `ROADMAP.md`
