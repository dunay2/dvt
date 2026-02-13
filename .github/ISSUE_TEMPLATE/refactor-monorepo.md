---
name: 'RFC: Convert repository to monorepo (packages/)'
about: 'Move tests and split packages (contracts, engine, adapters) — checklist and steps'
---

## Summary

Move towards a light monorepo layout (packages/) and consolidate tests under their package.

## Scope

- Move tests from root `test/` and `engine/test/` into `packages/engine/test`
- Move adapter tests under their adapter folder (e.g. `adapters/postgres/test`)
- Add package-level tsconfigs and ESLint overrides (already partly added)
- Update CI to run per-package tests

## Checklist

- [ ] Move tests into package folders
- [ ] Update imports/paths if needed
- [ ] Add `packages/*/tsconfig.*.json` for lint/test
- [ ] Update ESLint overrides
- [ ] Update CI workflows (test filters)
- [ ] Run full test suite and fix regressions

## Acceptance criteria

- All tests run under `pnpm -w test`
- No tests remain in root `test/` or `engine/test/`
- Lint is clean with package-level tsconfigs

## Notes

Assign to core team; low-risk refactor if done in small PRs per step.
