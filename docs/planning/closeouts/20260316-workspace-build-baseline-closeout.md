---
slice: workspace-build-baseline
date: 2026-03-16
last_reviewed: 2026-03-16
gap: maintenance
author: AI (Codex)
---

# Closeout: Workspace Build Baseline

## Think-First

### Problem summary

Fresh worktrees on `main` do not provide a stable local validation baseline for
several active workspaces. `apps/outbox-worker`, `apps/api`, `apps/lineage-worker`,
`@dvt/adapter-postgres`, and `@dvt/traceability-service` fail typecheck or build
because their TypeScript/package setup assumes internal workspace `dist` artifacts
already exist.

### Root cause

The current repo model consumes internal packages through built `dist` entrypoints in
app and package tsconfigs, but several packages only build those transitive deps in
`pretest` or not at all. A fresh worktree therefore reaches `tsc` before the required
workspace artifacts have been emitted.

### Constraints and invariants

- `ADR-0034` - composition roots such as `apps/api`, `apps/outbox-worker`, and
  `apps/lineage-worker` can wire multiple bounded contexts, but they still depend on
  bounded-context package outputs rather than package-local hacks.
- `AGENTS.md` - think-first before edits, no hidden debt, no stubs, and mandatory
  closeout evidence.
- `docs/guides/ai-work-protocol.md` - this is a `Slim` maintenance slice with focused
  validation on the touched workspaces.

### Options considered

- Convert the affected workspaces to source-path compilation against internal package
  sources.
- Add the missing `prebuild` / `pretypecheck` steps so the existing `dist`-based
  contract model is satisfied consistently.
- Introduce TypeScript project references across the workspace graph.

Libraries evaluated:

- None evaluated - this is workspace build orchestration drift, not a missing
  third-party capability.

### Selected option and rationale

Add the missing `prebuild` / `pretypecheck` chains to the affected packages and apps.
That is the smallest fix that respects the repository’s current `dist`-artifact
consumption model and repairs the commands that are red on clean `main`.

### Rejected alternatives

- Source-path compilation: rejected for this slice because it collides with the current
  `rootDir` / file-list project layout and would expand scope into a broader tsconfig
  architecture change.
- Full project references rollout: rejected because it is wider than this maintenance
  slice and would change build orchestration repository-wide.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope: make the currently failing build/typecheck commands on fresh `main` work by
  building the exact transitive workspace dependencies they assume.
- Touched files or paths:
  - `apps/api/package.json`
  - `apps/outbox-worker/package.json`
  - `packages/@dvt/run-domain/package.json`
  - `packages/@dvt/engine/package.json`
  - `packages/@dvt/adapter-postgres/package.json`
  - `packages/@dvt/delivery/package.json`
  - `packages/@dvt/traceability-service/package.json`
  - `docs/planning/closeouts/20260316-workspace-build-baseline-closeout.md`
- Expected outcome:
  - `@dvt/adapter-postgres build` runs from a fresh worktree
  - `@dvt/traceability-service build` runs from a fresh worktree
  - `dvt-outbox-worker typecheck/test` and `dvt-api typecheck` stop failing on missing
    internal package artifacts
  - `dvt-lineage-worker typecheck/build` stops failing on the same dependency gap
- Risks and mitigations:
  - Risk: the commands may reveal a second-order baseline issue after the missing-build
    failures are removed.
  - Mitigation: run the exact previously failing commands and record any remaining
    non-slice baseline blockers explicitly.
- Out-of-scope items:
  - tsconfig architecture redesign
  - pnpm bin-link warnings for unbuilt CLI binaries during install
  - full project references rollout
- Validation plan:
  - `pnpm --filter @dvt/adapter-postgres build`
  - `pnpm --filter @dvt/delivery build`
  - `pnpm --filter @dvt/traceability-service build`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `pnpm --filter dvt-outbox-worker test`
  - `pnpm --filter dvt-api typecheck`
  - `pnpm --filter dvt-lineage-worker typecheck`
  - `pnpm --filter dvt-lineage-worker build`
  - docs checks for the closeout
- Test coverage plan:
  - this slice changes build/typecheck orchestration, not runtime behavior; validation is
    command-level regression coverage on the exact failing paths
- Libraries evaluated:
  - None evaluated - no new library decision is part of this slice

## Changes made

| File                                                                    | Change                                                                                                  | Why                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/@dvt/run-domain/package.json`                                 | Added `prebuild` for `@dvt/contracts`                                                                   | `@dvt/run-domain build` depends on `@dvt/contracts` `dist` artifacts on a fresh worktree                                      |
| `packages/@dvt/engine/package.json`                                     | Added `prebuild` matching the existing engine build prerequisites                                       | `@dvt/engine build` was already assuming contracts, run-domain, observability, and crypto had been built                      |
| `packages/@dvt/adapter-postgres/package.json`                           | Added `prebuild` and `pretypecheck` for contracts, run-domain, and engine                               | `@dvt/adapter-postgres build/typecheck` was red on fresh `main` because it consumes those package outputs                     |
| `packages/@dvt/delivery/package.json`                                   | Added `prebuild` for `@dvt/contracts`                                                                   | `@dvt/delivery build` was red on fresh `main` because contracts had not been built yet                                        |
| `packages/@dvt/traceability-service/package.json`                       | Added `prebuild` and `pretypecheck` rooted at the workspace for `@dvt/contracts`                        | `@dvt/traceability-service build/typecheck` was red and its package-local filter resolution needed an explicit workspace root |
| `packages/@dvt/adapter-temporal/package.json`                           | Replaced the placeholder `prebuild` with the real contracts/observability/crypto/plan-interpreter chain | `@dvt/adapter-temporal build` was the remaining blocker for `dvt-api typecheck/build`                                         |
| `apps/outbox-worker/package.json`                                       | Added `prebuild` and `pretypecheck` matching the package’s existing `pretest` dependency chain          | `dvt-outbox-worker typecheck/build` depended on unbuilt local `adapter-postgres` and `delivery` outputs                       |
| `apps/api/package.json`                                                 | Added `prebuild` and `pretypecheck` matching the package’s existing `pretest` dependency chain          | `dvt-api typecheck/build` depended on unbuilt internal package outputs on fresh `main`                                        |
| `docs/planning/closeouts/20260316-workspace-build-baseline-closeout.md` | Added think-first analysis, implementation brief, and validation evidence                               | Required governance closeout for the slice                                                                                    |

## Libraries evaluated

None evaluated - workspace build orchestration maintenance only.

## Docs synced

- [x] `docs/planning/closeouts/20260316-workspace-build-baseline-closeout.md` - think-first, implementation brief, and validation evidence for this slice

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                                      | Result                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                                                                                                                                                                                             | Passed                                                                   |
| `pnpm --filter @dvt/adapter-postgres build`                                                                                                                                                                                                                                                                                                                                                                  | Passed                                                                   |
| `pnpm --filter @dvt/adapter-postgres typecheck`                                                                                                                                                                                                                                                                                                                                                              | Passed                                                                   |
| `pnpm --filter @dvt/delivery build`                                                                                                                                                                                                                                                                                                                                                                          | Passed                                                                   |
| `pnpm --filter @dvt/traceability-service build`                                                                                                                                                                                                                                                                                                                                                              | Passed                                                                   |
| `pnpm --filter @dvt/traceability-service typecheck`                                                                                                                                                                                                                                                                                                                                                          | Passed                                                                   |
| `pnpm --filter dvt-outbox-worker typecheck`                                                                                                                                                                                                                                                                                                                                                                  | Passed                                                                   |
| `pnpm --filter dvt-outbox-worker build`                                                                                                                                                                                                                                                                                                                                                                      | Passed                                                                   |
| `pnpm --filter dvt-outbox-worker test`                                                                                                                                                                                                                                                                                                                                                                       | Passed (`111` pass, `3` skipped by env gating)                           |
| `pnpm --filter dvt-api typecheck`                                                                                                                                                                                                                                                                                                                                                                            | Passed                                                                   |
| `pnpm --filter dvt-api build`                                                                                                                                                                                                                                                                                                                                                                                | Passed                                                                   |
| `pnpm --filter dvt-lineage-worker typecheck`                                                                                                                                                                                                                                                                                                                                                                 | Passed                                                                   |
| `pnpm --filter dvt-lineage-worker build`                                                                                                                                                                                                                                                                                                                                                                     | Passed                                                                   |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                                             | Passed                                                                   |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260316-workspace-build-baseline-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`                                                                                                                                                                                                                                    | Passed                                                                   |
| `pnpm docs:quality:check`                                                                                                                                                                                                                                                                                                                                                                                    | Passed with pre-existing non-English-content warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                                                                                                                                                                                                  | Passed                                                                   |
| `pnpm exec prettier --check apps/api/package.json apps/outbox-worker/package.json packages/@dvt/run-domain/package.json packages/@dvt/engine/package.json packages/@dvt/adapter-postgres/package.json packages/@dvt/delivery/package.json packages/@dvt/traceability-service/package.json packages/@dvt/adapter-temporal/package.json docs/planning/closeouts/20260316-workspace-build-baseline-closeout.md` | Passed after formatting                                                  |

Additional baseline note:

- `pnpm install --frozen-lockfile` still prints the pre-existing `dvt-trace` bin-link
  warning because `@dvt/traceability-service/dist/cli.js` does not exist before that
  package is built. This slice does not change pnpm install-time bin linking.

## Debt introduced

None.
