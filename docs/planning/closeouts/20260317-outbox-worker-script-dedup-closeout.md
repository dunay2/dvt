---
slice: outbox-worker-script-dedup
date: 2026-03-17
gap: maintenance
author: AI (Codex)
---

# Closeout: Outbox Worker Script Dedup

## Think-First

### Problem summary

`apps/outbox-worker` is the last remaining workspace in this cleanup track that
still keeps repeated manual `prebuild`, `pretypecheck`, and `pretest` chains.

### Root cause

The app/workspace dedup work was completed incrementally. `outbox-worker` was
left behind because the Windows sandbox editor failed on that file in the prior
attempt, not because its dependency graph differs from the expected closure.

### Constraints and invariants

- `AGENTS.md` requires think-first before edits, no hidden debt, and real
  validation evidence.
- `docs/guides/ai-work-protocol.md` requires documenting options considered
  before implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs the local validation
  commands that count as evidence.
- The previous monorepo closeouts established that selector-based script dedup
  is only safe where declared dependencies already match the real prerequisite
  graph; `dvt-outbox-worker^...` now resolves the expected closure.

### Options considered

- Keep the manual chains in place.
- Replace them with `pnpm --filter "dvt-outbox-worker^..." build`.
- Introduce a helper script.

Libraries evaluated:

- None added. `pnpm` already provides the graph selector needed here.

### Selected option and rationale

Replace the manual chains with `pnpm --filter "dvt-outbox-worker^..." build`.

This matches the actual declared closure while removing repeated package lists.

### Rejected alternatives

- Keep manual chains: rejected because this workspace is the exact leftover
  duplication we are closing.
- Helper script: rejected because it would duplicate built-in `pnpm`
  functionality.

## Changes made

| File                                                                      | Change                                                                                    | Why                                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/outbox-worker/package.json`                                         | Replaced repeated manual prereq chains with `pnpm --filter "dvt-outbox-worker^..." build` | Uses the declared workspace dependency closure instead of a copied package list |
| `docs/planning/closeouts/20260317-outbox-worker-script-dedup-closeout.md` | Added think-first analysis and evidence for the slice                                     | Governance requires closeout evidence                                           |

## Libraries evaluated

None added.

## Docs synced

- [x] `docs/planning/closeouts/20260317-outbox-worker-script-dedup-closeout.md` - think-first and evidence for this slice
- [x] `docs/planning/index.md` - verified by `pnpm docs:sync` as already up to date
- [x] `docs/planning/status/index.md` - verified by `pnpm docs:sync` as already up to date

## Test evidence

| Command                                                                                                                                                                     | Result                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm --filter dvt-outbox-worker typecheck`                                                                                                                                 | Passed outside sandbox                                          |
| `pnpm --filter dvt-outbox-worker build`                                                                                                                                     | Passed outside sandbox                                          |
| `pnpm --filter dvt-outbox-worker test`                                                                                                                                      | Passed outside sandbox (`115` tests, `112` pass, `3` skipped)   |
| `pnpm docs:sync`                                                                                                                                                            | Passed                                                          |
| `pnpm docs:quality:check`                                                                                                                                                   | Passed with pre-existing repository warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                 | Passed                                                          |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260317-outbox-worker-script-dedup-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Passed                                                          |

## Debt introduced

None.
