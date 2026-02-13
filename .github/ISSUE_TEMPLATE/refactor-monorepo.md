---
name: 'RFC: Convert repository to monorepo (packages/)'
about: 'Move tests and split packages (contracts, engine, adapters) — checklist and steps'
---

## Summary

Move towards a light monorepo layout (packages/) and consolidate tests under their package.

## Scope

- Consolidate remaining root legacy placeholders (e.g. `test/`) after references are removed
- Keep tests inside package folders (e.g. `packages/engine/test`, `packages/*/test`)
- Align CI, CODEOWNERS, and label rules with `packages/*`
- Run monorepo verification with workspace commands

## Checklist

- [ ] Audit and replace legacy path references (`engine/`, `adapters/`, `test/`) in CI/docs/config
- [ ] Ensure contract scripts write/read from `packages/engine/test/contracts/results`
- [ ] Update CI workflows and ownership rules to package paths
- [ ] Remove root legacy placeholders when empty and unreferenced
- [ ] Run full verification: `pnpm -r build && pnpm -r test && pnpm -r lint`

## Acceptance criteria

- All tests run under `pnpm -r test`
- No active CI/script/config path points to root `engine/`, `adapters/`, or `test/`
- Lint/type-check are clean with package-level tsconfigs

## Notes

Assign to core team; low-risk refactor if done in small PRs per step.
