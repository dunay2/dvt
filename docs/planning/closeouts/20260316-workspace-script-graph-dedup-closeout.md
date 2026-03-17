---
slice: workspace-script-graph-dedup
date: 2026-03-16
gap: maintenance
author: AI (Codex)
---

# Closeout: Workspace Script Graph Dedup

## Think-First

### Problem summary

`main` is now green for the previously broken workspace build and typecheck
commands, but the current package graph is still maintained through repeated
manual `prebuild`, `pretypecheck`, and `pretest` chains across multiple
workspaces.

This creates a maintenance problem:

- the dependency closure is duplicated in many `package.json` files
- the chains already drift from actual transitive dependencies
- every package addition or rename requires touching multiple unrelated scripts

### Root cause

The repository fixed fresh-worktree failures by hardcoding transitive build
chains per workspace, but did not replace that manual model with a graph-aware
mechanism. `pnpm` already supports dependency-closure selectors, yet the current
scripts still enumerate packages by hand.

### Constraints and invariants

- `AGENTS.md` requires think-first before edits, no hidden debt, and real
  validation evidence.
- `docs/guides/ai-work-protocol.md` requires documenting options considered,
  including library or native-tool evaluation, before implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs which local commands must
  be used as real validation evidence.
- `docs/planning/closeouts/20260316-workspace-build-baseline-closeout.md`
  established that the repo currently depends on `dist` outputs for internal
  package consumption on clean worktrees; this slice must preserve that behavior.

### Options considered

- Keep the current explicit chains and accept duplication.
- Introduce a custom Node helper script that computes the workspace dependency
  closure and runs builds.
- Use `pnpm` native dependency selectors such as `<workspace>^...` to target the
  transitive dependency closure directly.

Libraries evaluated:

- None added. The viable existing solution is `pnpm`'s built-in workspace filter
  syntax, which already solves the graph-selection problem.

### Selected option and rationale

Use native `pnpm` dependency selectors first in the core packages whose declared
workspace dependencies already match their manual build chains.

That keeps the current build model intact, removes manual package lists, and
lets the package manager remain the source of truth for transitive workspace
selection. It is smaller and safer than inventing a custom orchestration script,
and it avoids widening this slice into packages whose declared graph is still
misaligned with their build prerequisites.

### Rejected alternatives

- Keep explicit chains: rejected because the current state is already redundant
  and easy to drift.
- Custom helper script: rejected because it would duplicate functionality
  already provided by `pnpm` and would add another maintenance surface.
- Broad all-workspace replacement in one pass: rejected because some packages
  still rely on undeclared build prerequisites, so the first safe slice should
  only cover the packages whose declared graph already matches reality.

## Changes made

| File                                                                        | Change                                                                                         | Why                                                                        |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `docs/planning/closeouts/20260316-workspace-script-graph-dedup-closeout.md` | Added think-first analysis for the slice                                                       | Governance requires think-first before config edits                        |
| `packages/@dvt/run-domain/package.json`                                     | Replaced explicit contract build prerequisite with `pnpm --filter "@dvt/run-domain^..." build` | The package already declares the same dependency in `dependencies`         |
| `packages/@dvt/engine/package.json`                                         | Replaced explicit dependency build list with `pnpm --filter "@dvt/engine^..." build`           | The package already declares the same dependency closure in `dependencies` |

## Libraries evaluated

None added. `pnpm` native dependency selectors were evaluated as the existing
solution.

## Docs synced

- [x] `docs/planning/closeouts/20260316-workspace-script-graph-dedup-closeout.md` - think-first for this slice
- [x] `docs/planning/index.md` - checked via `docs:sync`; no generated content change was required
- [x] `docs/planning/status/index.md` - checked via `docs:sync`; no generated content change was required

## Test evidence

| Command                                                                                                                                     | Result                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm --filter @dvt/run-domain build`                                                                                                       | Passed                                                                   |
| `pnpm --filter @dvt/engine build`                                                                                                           | Passed                                                                   |
| `node .\node_modules\markdownlint-cli2\markdownlint-cli2-bin.mjs docs/planning/closeouts/20260316-workspace-script-graph-dedup-closeout.md` | Passed                                                                   |
| `pnpm docs:sync`                                                                                                                            | Passed                                                                   |
| `pnpm docs:quality:check`                                                                                                                   | Passed with pre-existing non-English-content warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                 | Passed                                                                   |

## Debt introduced

None.
