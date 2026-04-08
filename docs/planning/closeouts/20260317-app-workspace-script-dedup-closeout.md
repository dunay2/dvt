---
slice: app-workspace-script-dedup
date: 2026-03-17
last_reviewed: 2026-03-17
gap: maintenance
author: AI (Codex)
---

# Closeout: App Workspace Script Dedup

## Think-First

### Problem summary

The app and worker workspaces still maintain manual `prebuild`,
`pretypecheck`, and `pretest` chains even though the package graph below them
has already been aligned and partially deduplicated in earlier slices.

This leaves the same maintenance problem in the composition roots:

- repeated package lists across multiple scripts
- script drift when transitive dependencies change
- duplicated graph knowledge in `package.json` instead of in the workspace graph

### Root cause

The repo repaired baseline build failures incrementally, starting from package
prerequisites and then adapter graph alignment, but did not yet switch the app
and worker workspaces from hand-maintained dependency lists to graph-derived
selectors.

### Constraints and invariants

- `AGENTS.md` requires think-first before edits, no hidden debt, and real
  validation evidence.
- `docs/guides/ai-work-protocol.md` requires documenting options considered
  before implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs the local validation
  commands that count as evidence.
- `docs/planning/closeouts/20260316-workspace-script-graph-dedup-closeout.md`
  and `docs/planning/closeouts/20260317-adapter-dependency-graph-alignment-closeout.md`
  established that selector-based dedup is only safe after the declared graph
  matches the actual prerequisites.

### Options considered

- Leave the current manual chains in apps and workers.
- Replace the app and worker chains with `pnpm --filter "<workspace>^..." build`
  selectors that resolve the declared dependency closure.
- Introduce a custom helper script to compute and run the closure.

Libraries evaluated:

- None added. `pnpm` already provides the needed graph-selection capability.

### Selected option and rationale

Replace the manual app and worker chains with native `pnpm` dependency
selectors, starting with the workspaces that can be updated cleanly in this
slice.

That keeps the current build model intact, removes repeated hardcoded package
lists, and uses the workspace dependency graph as the source of truth.

### Rejected alternatives

- Leave the chains as-is: rejected because the graph duplication is the problem.
- Custom helper script: rejected because it would duplicate functionality that
  `pnpm` already provides.
- Force `outbox-worker` into the same edit pass despite the current Windows
  sandbox editor fault: rejected for this slice because the operational failure
  is unrelated to the graph change and should not be hidden inside the commit.

## Changes made

| File                                                                      | Change                                                                                       | Why                                                                             |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `docs/planning/closeouts/20260317-app-workspace-script-dedup-closeout.md` | Added think-first analysis for the slice                                                     | Governance requires think-first before config edits                             |
| `apps/api/package.json`                                                   | Replaced repeated manual prereq chains with `pnpm --filter "dvt-api^..." build`              | Uses the declared workspace dependency closure instead of a copied package list |
| `apps/lineage-worker/package.json`                                        | Replaced repeated manual prereq chains with `pnpm --filter "dvt-lineage-worker^..." build`   | Keeps the dependency closure in `pnpm`, not in a hand-maintained script         |
| `apps/projector-worker/package.json`                                      | Replaced repeated manual prereq chains with `pnpm --filter "dvt-projector-worker^..." build` | Same behavior, less drift risk and less duplicated config                       |

## Libraries evaluated

None added.

## Docs synced

- [x] `docs/planning/closeouts/20260317-app-workspace-script-dedup-closeout.md` - think-first for this slice
- [x] `docs/planning/index.md` - checked via `docs:sync`; no generated content change was required
- [x] `docs/planning/status/index.md` - checked via `docs:sync`; no generated content change was required

## Test evidence

| Command                                        | Result                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm --filter dvt-api typecheck`              | Passed                                                                               |
| `pnpm --filter dvt-api build`                  | Passed                                                                               |
| `pnpm --filter dvt-api test`                   | Passed (`44` tests)                                                                  |
| `pnpm --filter dvt-lineage-worker typecheck`   | Passed                                                                               |
| `pnpm --filter dvt-lineage-worker build`       | Passed                                                                               |
| `pnpm --filter dvt-projector-worker typecheck` | Passed outside the sandbox after Windows `spawn EPERM` during the in-sandbox attempt |
| `pnpm --filter dvt-projector-worker build`     | Passed outside the sandbox for the same Windows process-spawn reason                 |
| `pnpm --filter dvt-projector-worker test`      | Passed (`2` tests)                                                                   |
| `pnpm docs:sync`                               | Passed                                                                               |
| `pnpm docs:quality:check`                      | Passed with pre-existing non-English-content warnings outside this slice             |
| `pnpm docs:canonical:check`                    | Passed                                                                               |

Additional scope note:

- `apps/outbox-worker/package.json` was intentionally left untouched in this
  slice because the Windows sandbox editor repeatedly failed on that file with
  a setup-refresh error unrelated to the graph change itself. It should be
  handled in the next pass, not hidden inside this commit.

## Debt introduced

None.
