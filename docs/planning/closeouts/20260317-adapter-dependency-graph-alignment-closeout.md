---
slice: adapter-dependency-graph-alignment
date: 2026-03-17
last_reviewed: 2026-03-17
gap: maintenance
author: AI (Codex)
---

# Closeout: Adapter Dependency Graph Alignment

## Think-First

### Problem summary

Two adapter packages still have drift between their declared workspace
dependencies and the build prerequisites encoded in scripts or tsconfig path
maps:

- `@dvt/adapter-postgres` builds against `@dvt/engine` dist artifacts but does
  not declare `@dvt/engine` as a dependency.
- `@dvt/adapter-temporal` scripts force-build `@dvt/crypto`, but the package
  does not declare or import it.

This makes the workspace graph harder to trust and blocks safe expansion of the
script-graph dedup pattern used in the previous slice.

### Root cause

The repo repaired build baselines incrementally by adding explicit `prebuild`
chains, but some package manifests were not brought back into alignment with the
actual dependency surfaces implied by tsconfig path resolution or script
prerequisites.

### Constraints and invariants

- `AGENTS.md` requires think-first before config edits, no hidden debt, and real
  validation evidence.
- `docs/guides/ai-work-protocol.md` requires documenting options considered
  before implementation.
- `docs/guides/testing-and-ci-capabilities.md` governs the local validation
  commands that count as evidence.
- `docs/planning/closeouts/20260316-workspace-script-graph-dedup-closeout.md`
  established that selector-based script dedup is only safe where declared
  dependencies already match real prerequisites.

### Options considered

- Leave the drift in place and keep relying on manual prebuild chains.
- Add the missing declared dependency and remove the undeclared phantom
  prerequisite, but keep the rest of the scripts unchanged.
- Replace the scripts immediately with selector-based `pnpm` filters at the same
  time.

Libraries evaluated:

- None added. This is package-manifest alignment, not a missing library problem.

### Selected option and rationale

Align the manifests first:

- add `@dvt/engine` to `@dvt/adapter-postgres` dependencies
- remove `@dvt/crypto` from `@dvt/adapter-temporal` script prerequisites

Then, if validation stays green, switch the affected scripts to selector-based
closure only where the declared graph now matches reality.

### Rejected alternatives

- Leave the drift: rejected because it keeps the graph untrustworthy and blocks
  future cleanup.
- Script-only rewrite without manifest alignment: rejected because it would hide
  the real source of drift instead of fixing it.

## Changes made

| File                                                                              | Change                                                                                   | Why                                                                                                                    |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `docs/planning/closeouts/20260317-adapter-dependency-graph-alignment-closeout.md` | Added think-first analysis for the slice                                                 | Governance requires think-first before config edits                                                                    |
| `packages/@dvt/adapter-postgres/package.json`                                     | Declared `@dvt/engine` and replaced manual prereq chains with a dependency selector      | The package already consumed engine dist artifacts through tsconfig paths, so the manifest had to match the real graph |
| `packages/@dvt/adapter-temporal/package.json`                                     | Removed the undeclared `@dvt/crypto` prereq by switching scripts to dependency selectors | The package does not import `@dvt/crypto`; the manual script had drifted past the real graph                           |
| `pnpm-lock.yaml`                                                                  | Regenerated the lockfile after adding `@dvt/engine` to `@dvt/adapter-postgres`           | CI uses `--frozen-lockfile`, so the importer specifiers had to match the package manifest exactly                      |

## Libraries evaluated

None added.

## Docs synced

- [x] `docs/planning/closeouts/20260317-adapter-dependency-graph-alignment-closeout.md` - think-first for this slice
- [x] `docs/planning/index.md` - checked via `docs:sync`; no generated content change was required
- [x] `docs/planning/status/index.md` - checked via `docs:sync`; no generated content change was required

## Test evidence

| Command                                                                                                                                                                                              | Result                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/adapter-postgres build`                                                                                                                                                          | Passed                                                                                |
| `pnpm --filter @dvt/adapter-postgres test`                                                                                                                                                           | Passed (`14` tests), with integration-gated suites skipped as pre-existing behavior   |
| `pnpm --filter @dvt/adapter-temporal build`                                                                                                                                                          | Passed                                                                                |
| `pnpm --filter @dvt/adapter-temporal exec vitest run test/ObservedTemporalAdapter.test.ts test/activities.test.ts`                                                                                   | Passed outside sandbox (`30` tests) after in-sandbox `esbuild spawn EPERM` on Windows |
| `pnpm install --no-frozen-lockfile`                                                                                                                                                                  | Passed and updated `pnpm-lock.yaml`                                                   |
| `pnpm install --frozen-lockfile`                                                                                                                                                                     | Passed after the lockfile regeneration                                                |
| `pnpm exec prettier --check packages/@dvt/adapter-postgres/package.json packages/@dvt/adapter-temporal/package.json docs/planning/closeouts/20260317-adapter-dependency-graph-alignment-closeout.md` | Passed                                                                                |
| `pnpm docs:sync`                                                                                                                                                                                     | Passed                                                                                |
| `pnpm docs:quality:check`                                                                                                                                                                            | Passed with pre-existing non-English-content warnings outside this slice              |
| `pnpm docs:canonical:check`                                                                                                                                                                          | Passed                                                                                |

## Debt introduced

None.
