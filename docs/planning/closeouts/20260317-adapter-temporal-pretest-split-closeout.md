---
slice: adapter-temporal-pretest-split
date: 2026-03-17
gap: maintenance
author: AI (Codex)
---

# Closeout: Adapter Temporal Pretest Split

## Think-First

### Problem summary

`@dvt/adapter-temporal` still uses the same pre-step for both unit tests and
integration tests: build dependency closure and then build the package itself.

### Root cause

The package historically treated all tests as if they needed compiled
`dist/**` artifacts, but only the time-skipping integration suite reads from
`../dist/workflows/RunPlanWorkflow.js`.

### Constraints and invariants

- `AGENTS.md` requires think-first before edits, real validation, and no hidden
  debt.
- `docs/guides/ai-work-protocol.md` requires documenting options considered
  before implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs which local commands
  count as evidence.
- The script-dedup slices already established that prereq steps should reflect
  real package/runtime needs instead of broad copied chains.

### Options considered

- Keep `pnpm build` in both `pretest` and `pretest:integration`.
- Remove `pnpm build` from both.
- Keep `pnpm build` only in `pretest:integration`.

Libraries evaluated:

- None added. This is package script hygiene, not missing library behavior.

### Selected option and rationale

Keep `pnpm build` only in `pretest:integration`.

The normal Vitest suite does not reference `dist/**`, while the integration
suite still does. This reduces unnecessary self-build work without weakening the
integration setup.

### Rejected alternatives

- Keep both as-is: rejected because it keeps unnecessary work in the common test
  path.
- Remove both: rejected because the integration suite still uses compiled
  workflow output under `dist/workflows/**`.

## Changes made

| File                                                                          | Change                                                                             | Why                                                                       |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/@dvt/adapter-temporal/package.json`                                 | Remove package self-build from `pretest` while keeping it in `pretest:integration` | Split unit-test and integration-test prerequisites by actual runtime need |
| `docs/planning/closeouts/20260317-adapter-temporal-pretest-split-closeout.md` | Added think-first analysis and validation evidence for the slice                   | Governance requires closeout evidence                                     |

## Libraries evaluated

None added.

## Docs synced

- [x] `docs/planning/closeouts/20260317-adapter-temporal-pretest-split-closeout.md` - think-first and evidence for this slice
- [x] `docs/planning/index.md` - verified by `pnpm docs:sync` as already up to date
- [x] `docs/planning/status/index.md` - verified by `pnpm docs:sync` as already up to date

## Test evidence

| Command                                                                                                                                                                         | Result                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm --filter @dvt/adapter-temporal test`                                                                                                                                      | Passed outside sandbox (`10` files, `87` tests)                 |
| `pnpm --filter @dvt/adapter-temporal test:integration`                                                                                                                          | Passed outside sandbox (`11` files, `93` tests)                 |
| `pnpm docs:sync`                                                                                                                                                                | Passed                                                          |
| `pnpm docs:quality:check`                                                                                                                                                       | Passed with pre-existing repository warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                     | Passed                                                          |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260317-adapter-temporal-pretest-split-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Passed                                                          |

## Debt introduced

None.
