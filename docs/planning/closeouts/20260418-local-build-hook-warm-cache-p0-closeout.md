---
slice: local-build-hook-warm-cache-p0
date: 2026-04-18
last_reviewed: 2026-04-18
gap: maintenance
author: AI (Codex)
---

# Closeout: Local Build Hook Warm-Cache P0

## Think-First

### Problem summary

Warm local recursive builds still spend most of their time re-running lifecycle
hook dependency builds that the workspace graph has already compiled.

The current hot spots are:

- four worker apps still run unconditional dependency-closure builds in
  `prebuild` and `pretypecheck`, even when `DVT_CI=1`
- `@dvt/contracts` still uses `tsc -b --force`, which disables TypeScript
  incremental reuse on every invocation
- local operator guidance explains the hook helper but does not yet tell
  contributors when `DVT_CI=1` is safe for repeated warm builds

### Root cause

The repository already introduced `scripts/skip-pretest-if-ci.cjs` for CI and
selected package hooks, but adoption remained partial. The worker apps still
carry unconditional prebuild cascades, and the contracts package still forces a
full project rebuild even on a warm worktree.

### Constraints and invariants

- `AGENTS.md` requires inventory-first startup, governed closeout evidence, no
  hidden debt, and no fake completion.
- `docs/guides/ai-work-protocol.md` requires think-first analysis and the
  pre-implementation brief before the implementation changes land.
- `docs/guides/testing-and-ci-capabilities.md` governs the validation baseline
  and requires `pnpm verify:prepush` before the slice is presented as ready.
- `docs/planning/state/planning-control-tower.md` requires the closeout and the
  relevant lane registry to stay aligned for planning-affecting work.
- `docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md`
  and `docs/planning/reviews/ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md`
  govern the CI-efficiency and operational-friction context for this slice.
- `docs/planning/closeouts/20260316-workspace-script-graph-dedup-closeout.md`,
  `docs/planning/closeouts/20260317-app-workspace-script-dedup-closeout.md`,
  and `docs/evidence/ED-20260409-ci-rebuild-dedupe-and-adapter-postgres-consolidation.md`
  establish the existing hook-short-circuit model that this slice must extend
  rather than replace.

### Options considered

- Leave the current scripts unchanged and rely on manual `DVT_CI=1` usage only
  where it already works.
- Apply a narrow P0 patch: remove `--force` from `@dvt/contracts`, wire the
  four worker apps into the existing hook helper, and document safe local
  warm-build usage.
- Jump directly to a larger build-orchestration refactor (`turbo`, TS project
  references, or alternate transpilers).

Libraries evaluated:

- None added. This slice intentionally reuses the existing `pnpm` graph and the
  existing `skip-pretest-if-ci.cjs` hook helper.

### Selected option and rationale

Apply the narrow P0 patch first.

It is small, measurable, and reversible. It addresses the measured repeated
warm-build cost without widening the slice into a larger build-system
rearchitecture, and it keeps the existing dependency-build safety model in
place for non-`DVT_CI` local execution.

### Rejected alternatives

- Leave the scripts unchanged: rejected because the measured cost is mechanical
  and avoidable.
- Jump straight to `turbo` or a project-reference migration: rejected for this
  slice because those are larger architectural changes and are not necessary to
  capture the immediate P0 savings.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - make `apps/lineage-worker`, `apps/outbox-worker`,
    `apps/projector-worker`, and `apps/temporal-worker` honor `DVT_CI` in
    `prebuild` and `pretypecheck`
  - remove `--force` from `packages/@dvt/contracts/package.json`
  - document safe local warm-build usage for `DVT_CI=1`
  - align the relevant planning/evidence surfaces for the contracts-path touch
- Touched files or paths:
  - `apps/lineage-worker/package.json`
  - `apps/outbox-worker/package.json`
  - `apps/projector-worker/package.json`
  - `apps/temporal-worker/package.json`
  - `packages/@dvt/contracts/package.json`
  - `scripts/README.md`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `docs/planning/closeouts/20260418-local-build-hook-warm-cache-p0-closeout.md`
- Expected outcome:
  - repeated warm local builds can skip the redundant worker dependency-hook
    cascades under `DVT_CI=1`
  - `@dvt/contracts` can reuse normal TypeScript build incrementality instead
    of forcing a rebuild on every invocation
  - contributors have one canonical statement of when `DVT_CI=1` is safe for
    local warm builds
- Risks and mitigations:
  - risk: `DVT_CI=1` could be applied on a fresh or stale worktree and hide
    missing dependency builds
  - mitigation: docs must explicitly limit the shortcut to already-built
    worktrees or flows that ran an explicit workspace-graph build first
  - risk: worker typecheck/build hooks could diverge from the other workspaces
  - mitigation: reuse the existing `skip-pretest-if-ci.cjs` helper instead of
    inventing a second policy path
- Out-of-scope items:
  - introducing `turbo`, `nx`, or `moon`
  - populating TypeScript project `references`
  - swapping heavy packages to `tsup`/`swc`
  - broader CI workflow or cache redesign beyond the local hook/config slice
- Validation plan:
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter dvt-lineage-worker build`
  - `pnpm --filter dvt-lineage-worker typecheck`
  - `pnpm --filter dvt-lineage-worker test`
  - `pnpm --filter dvt-projector-worker build`
  - `pnpm --filter dvt-projector-worker typecheck`
  - `pnpm --filter dvt-projector-worker test`
  - `pnpm --filter dvt-temporal-worker build`
  - `pnpm --filter dvt-temporal-worker typecheck`
  - `pnpm --filter dvt-temporal-worker test`
  - `pnpm --filter dvt-outbox-worker build`
  - `pnpm --filter dvt-outbox-worker typecheck`
  - `pnpm --filter dvt-outbox-worker test`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`
- Test coverage plan:
  - config-only slice; reuse the touched package build/typecheck/test commands
    to prove both normal and hook-guarded entrypoints still resolve
  - record any pre-existing baseline failure explicitly instead of masking it
- Libraries evaluated:
  - None added.

## Changes made

| File                                                                          | Change                                                                              | Why                                                                                             |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/planning/closeouts/20260418-local-build-hook-warm-cache-p0-closeout.md` | Added the governed think-first analysis and final closeout evidence for this slice. | `AGENTS.md` and the AI work protocol require doc-first closeout traceability.                   |
| `packages/@dvt/contracts/package.json`                                        | Removed `--force` from the `build` script.                                          | Allow normal TypeScript incremental reuse during repeated warm builds.                          |
| `apps/lineage-worker/package.json`                                            | Wrapped `prebuild` and `pretypecheck` with `skip-pretest-if-ci.cjs`.                | Make the worker honor `DVT_CI` the same way its `pretest` already did.                          |
| `apps/outbox-worker/package.json`                                             | Wrapped `prebuild` and `pretypecheck` with `skip-pretest-if-ci.cjs`.                | Remove the last unconditional worker-app dependency cascade in warm-build mode.                 |
| `apps/projector-worker/package.json`                                          | Wrapped `prebuild` and `pretypecheck` with `skip-pretest-if-ci.cjs`.                | Keep worker build hooks consistent with the repo-wide `DVT_CI` policy.                          |
| `apps/temporal-worker/package.json`                                           | Wrapped `prebuild` and `pretypecheck` with `skip-pretest-if-ci.cjs`.                | Avoid repeated warm-build dependency closure rebuilds when an explicit graph build already ran. |
| `scripts/README.md`                                                           | Added safe local warm-build examples and guardrails for `DVT_CI=1`.                 | The hook helper existed but the local operator usage rule was not explicit.                     |
| `docs/guides/testing-and-ci-capabilities.md`                                  | Added the warm-build note and guardrail to the canonical testing/CI guide.          | Put the local shortcut on a canonical operator surface instead of leaving it implicit.          |
| `docs/evidence/ED-20260418-local-build-hook-warm-cache-p0.md`                 | Added ARC-2 evidence for the contracts-path touch.                                  | `packages/@dvt/contracts/**` changes require evidence-backed closure.                           |
| `docs/risk-register/quality/R-20260418-LOCAL-BUILD-HOOK-WARM-CACHE-P0.yaml`   | Added the residual risk entry for `DVT_CI` misuse on stale worktrees.               | Record the real operator risk created by the shortcut posture.                                  |
| `docs/planning/state/agent-lane-c.yaml`                                       | Added the new closeout/evidence/risk refs to `RC-C2` and refreshed its progress.    | Keep the planning registry aligned with the shipped efficiency slice.                           |
| `docs/evidence/index.md` and `docs/risk-register/quality/index.md`            | Regenerated indexes via `docs:sync`.                                                | Keep generated docs surfaces aligned after adding evidence and risk files.                      |

QA follow-up:

- narrowed the documented local warm-build examples to shell-scoped one-shot
  forms so `DVT_CI` does not leak into later commands from the same shell
- refreshed the Lane C `verification_summary` bookkeeping after review caught
  the stale `verified_on` and weighted-progress values

## Docs synced

- `pnpm docs:sync` regenerated:
  - `docs/planning/index.md`
  - `docs/planning/reviews/index.md`
  - `docs/evidence/index.md`
  - `docs/risk-register/quality/index.md`
  - `docs/planning/state/agent-lane-c.md`
  - `docs/planning/state/agent-lane-d.md`
  - `docs/planning/state/agent-lane-e.md`
- `pnpm docs:workboard:generate` regenerated:
  - `docs/planning/state/execution-workboard.md`
  - `docs/planning/state/open-task-route.md`

## Validation evidence

| Command                                                                                                                                                                                                                                                                                    | Result                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                           | PASS                                                                                                                                                                                 |
| `pnpm docs:workboard:generate`                                                                                                                                                                                                                                                             | PASS                                                                                                                                                                                 |
| `pnpm --filter @dvt/contracts build`                                                                                                                                                                                                                                                       | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-lineage-worker build`                                                                                                                                                                                                                                                   | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-lineage-worker typecheck`                                                                                                                                                                                                                                               | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-lineage-worker test`                                                                                                                                                                                                                                                    | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-projector-worker build`                                                                                                                                                                                                                                                 | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-projector-worker typecheck`                                                                                                                                                                                                                                             | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-projector-worker test`                                                                                                                                                                                                                                                  | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-temporal-worker build`                                                                                                                                                                                                                                                  | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-temporal-worker typecheck`                                                                                                                                                                                                                                              | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-temporal-worker test`                                                                                                                                                                                                                                                   | PASS                                                                                                                                                                                 |
| `pnpm --filter dvt-outbox-worker build`                                                                                                                                                                                                                                                    | FAIL with the pre-existing `TS2532` at `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts:382`                                                                                       |
| `pnpm --filter dvt-outbox-worker typecheck`                                                                                                                                                                                                                                                | FAIL with the same pre-existing `TS2532` at `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts:382`                                                                                  |
| `pnpm --filter dvt-outbox-worker test`                                                                                                                                                                                                                                                     | PASS (`140` tests passed, `3` skipped)                                                                                                                                               |
| `$env:DVT_CI='1'; pnpm -r build`                                                                                                                                                                                                                                                           | FAIL at the same pre-existing `dvt-outbox-worker` `TS2532` after `21.93s`; the new warm-build path reached the same baseline failure instead of introducing a new blocker            |
| `pnpm docs:arc:evidence:check`                                                                                                                                                                                                                                                             | PASS                                                                                                                                                                                 |
| `pnpm exec markdownlint-cli2 "docs/planning/closeouts/20260418-local-build-hook-warm-cache-p0-closeout.md" "docs/evidence/ED-20260418-local-build-hook-warm-cache-p0.md" "docs/guides/testing-and-ci-capabilities.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | PASS                                                                                                                                                                                 |
| `pnpm verify:prepush`                                                                                                                                                                                                                                                                      | PASS; note that its changed-only subchecks skipped because those scripts diff against committed ranges, so direct markdown and ARC evidence checks were run explicitly in this slice |

## Debt introduced

None.

The `dvt-outbox-worker` `TS2532` failure remains a pre-existing baseline issue
outside this slice. This work did not suppress it, bypass it, or present it as
resolved.

## Stub check

No stubs, placeholders, fake success paths, or unfinished fallback branches
were introduced.
