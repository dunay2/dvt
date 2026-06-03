---
slice: rc-c2-wave-2c-prepush-affected-typecheck
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 2C scope-aware pre-push typecheck

## Think-First

### Problem summary

Wave 2A made package-level `typecheck` ownership explicit and Wave 2B routed
affected workspace tasks through governed Turbo commands, but the repository's
strict pre-push gate still falls back to the full root `pnpm type-check`
whenever it sees any TypeScript-affecting file.

That leaves a visible cost gap:

- small workspace-local code changes still trigger the full root type-check
  path
- the repo already has a governed affected-workspace typecheck command
  (`pnpm ci:affected:typecheck`) that the strict pre-push gate does not reuse
- the integrated RC-C2 plan explicitly calls out this remaining friction under
  `CDG-W2-2`

### Root cause

The current `scripts/type-check-prepush.cjs` only answers one question:
"should type-check run at all?"

It does not answer the second question that Wave 2 made possible:
"should this diff run full-root type-check or only the affected workspace
graph?"

That older binary decision was reasonable before Wave 2A and 2B:

- package-level `typecheck` ownership was incomplete
- the affected typecheck path was not yet Turbo-governed

Now that those prerequisites are in place, the script is conservative beyond
what the repo actually needs for ordinary workspace-local changes.

### Constraints and invariants

- `AGENTS.md` requires truthful evidence, no hidden debt, and
  `pnpm verify:prepush` before presenting the slice as ready.
- `docs/guides/ai-work-protocol.md` requires think-first and a
  pre-implementation brief before code/config/docs changes land.
- `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  defines `CDG-W2-2` as making `verify:prepush` scope-aware while preserving
  strictness for governance-sensitive files.
- `docs/planning/closeouts/20260422-rc-c2-wave-2a-typecheck-contract-closeout.md`
  made package-level `typecheck` ownership explicit for the current buildable
  workspaces.
- `docs/planning/closeouts/20260423-rc-c2-wave-2b-turbo-affected-task-routing-closeout.md`
  established `pnpm ci:affected:typecheck` as the governed affected-workspace
  path and intentionally left the broader root `type-check` contract in place
  for global changes.
- The slice should stay outside ARC-triggering package paths if the gain can be
  achieved through root tooling, tests, and governed docs only.

### Options considered

- Keep the current `type-check-prepush` behavior and accept the extra root cost.
- Replace root `pnpm type-check` entirely with `pnpm ci:affected:typecheck`.
- Add a scope classifier so workspace-local diffs use
  `pnpm ci:affected:typecheck`, while global TypeScript graph changes still use
  full-root `pnpm type-check`.

### Selected option and rationale

Add a scope classifier that chooses between affected and full-root type-check.

This is the narrowest truthful improvement:

- it reuses the governed Wave 2A and 2B contracts instead of inventing new
  scope logic
- it preserves the stricter full-root path for root config and other
  cross-workspace changes
- it reduces local cost for ordinary package and app changes without claiming
  that the root `type-check` contract is obsolete

### Rejected alternatives

- keep the current behavior: rejected because it leaves a known and already
  solvable local-cost problem open
- replace full-root type-check everywhere: rejected because root config and
  other governance-sensitive changes still need the broader contract

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add a governed pre-push typecheck scope classifier that decides between
    `skip`, affected-workspace typecheck, and full-root typecheck
  - rewire `scripts/type-check-prepush.cjs` to use that classifier and print a
    truthful reason for the selected path
  - add CI-tool regression coverage for the classifier and pre-push command
    contract
  - update the canonical CI/testing guide, scripts README, active RC-C2 plan
    surface, Lane C state, and this closeout
- Touched files or paths:
  - `scripts/type-check-prepush.cjs`
  - new or updated helpers/tests under `tools/ci/`
  - `scripts/README.md`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - this closeout file
- Expected outcome:
  - workspace-local TS changes use `pnpm ci:affected:typecheck`
  - root config and other global TypeScript graph changes still use
    `pnpm type-check`
  - `type-check-prepush` explains which path it selected and why
  - CI-tool tests fail if the pre-push routing contract regresses
- Risks and mitigations:
  - risk: a global change is misclassified as workspace-local and loses the
    broader root guard
  - mitigation: drive classification from the existing shared CI scope policy
    and keep a conservative fallback to full-root typecheck
  - risk: the affected route fails to cover a workspace change because the
    matrix logic drifts
  - mitigation: add explicit CI-tool tests for representative workspace and
    global cases
  - risk: local validation is confusing because the repo's diff-based scripts
    compare against committed ranges
  - mitigation: keep direct validation commands in the closeout evidence
    alongside the repo pre-push baseline
- Out of scope:
  - changing `.husky/pre-push` command selection
  - adding tests to `verify:prepush`
  - rewriting root `type-check`
  - changing the GitHub workflow merge gates beyond the already-open Wave 4A
    slice
- Validation plan:
  - CI-tool regression test for the pre-push typecheck classifier
  - `pnpm test:ci-tools`
  - representative affected typecheck execution
  - representative full-root classification coverage via the CI-tool suite
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm lint:md`
  - `pnpm docs:gov:locations`
  - `pnpm docs:quality:check`
  - `pnpm verify:prepush`
- Test coverage plan:
  - skip when the diff has no TypeScript-affecting files
  - choose affected-workspace typecheck for a package-local TS file
  - choose full-root typecheck for root config such as `package.json` or
    `tsconfig*.json`
- keep a conservative full-root fallback when a relevant file does not map to
  a workspace-specific scope
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Added `tools/ci/prepush-typecheck-scope.mjs` as the governed classifier for
  strict pre-push type-check routing. The helper:
  - identifies the existing TypeScript graph trigger set
  - reuses the shared CI workspace scope policy from `tools/ci/scope-config.mjs`
  - returns one of three outcomes: `skip`, affected-workspace typecheck, or
    full-root typecheck
- Rewired `scripts/type-check-prepush.cjs` to consume that classifier instead
  of using a binary "run or skip" decision. The script now prints:
  - which command it selected
  - why that command was selected
  - the relevant files
  - the affected package list when the diff stays workspace-scoped
- Added `tools/ci/prepush-typecheck-scope.test.mjs` so CI-tool coverage fails
  if the strict pre-push selector stops:
  - skipping docs-only diffs
  - routing package-local TypeScript changes to `pnpm ci:affected:typecheck`
  - reserving full-root `pnpm type-check` for global graph inputs
  - falling back conservatively when a relevant file does not map cleanly to a
    workspace scope
- Updated `docs/guides/testing-and-ci-capabilities.md` so the canonical guide
  now documents both `pnpm verify:changed` and the new three-way
  `verify:prepush` type-check behavior.
- Updated `scripts/README.md`, the consolidated RC-C2 action plan, Lane C
  state, and this closeout so the scope-aware pre-push contract is discoverable
  from the canonical planning and operator surfaces.

## Validation Evidence

- `node --test tools/ci/prepush-typecheck-scope.test.mjs`
  - passed with `5/5` tests green
- `pnpm test:ci-tools`
  - passed with `50/50` tests green after adding the new pre-push classifier
    coverage
- `pnpm exec eslint --max-warnings 0 tools/ci/prepush-typecheck-scope.test.mjs tools/ci/prepush-typecheck-scope.mjs scripts/type-check-prepush.cjs`
  - passed
- `pnpm exec prettier --check .github/workflows/ci.yml docs/guides/testing-and-ci-capabilities.md docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md docs/planning/state/agent-lane-c.yaml docs/planning/closeouts/20260423-rc-c2-wave-4a-ci-tools-merge-gate-closeout.md docs/planning/closeouts/20260423-rc-c2-wave-2c-prepush-affected-typecheck-closeout.md scripts/README.md scripts/type-check-prepush.cjs tools/ci/prepush-typecheck-scope.mjs tools/ci/prepush-typecheck-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs`
  - first run: failed because `docs/planning/state/agent-lane-c.yaml` needed
    formatting
  - corrective action: `pnpm exec prettier --write docs/planning/state/agent-lane-c.yaml`
  - second run: passed
- `node scripts/run-turbo-workspace-task.cjs typecheck --filter=@dvt/engine`
  - passed
  - verified the affected-workspace typecheck path remains callable through the
    governed Turbo wrapper and completed from cache on the current worktree
- `node scripts/type-check-prepush.cjs`
  - passed
  - selected full-root `pnpm type-check` on this worktree because the committed
    diff against `origin/main` still contains root and package manifest changes
    from earlier local RC-C2 slices, which is the expected conservative path
    for global TypeScript graph inputs
- `pnpm docs:sync`
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm lint:md`
  - passed with `0` markdownlint errors across `1272` files
- `pnpm docs:gov:locations`
  - passed with `OK`
- `pnpm docs:quality:check`
  - passed with `OK`
  - emitted only inherited non-blocking warnings for pre-existing non-English
    docs outside this slice
- `pnpm verify:prepush`
  - passed with exit `0`
  - on the current committed branch state, the strict pre-push selector chose
    full-root `pnpm type-check` because the repo still has committed root and
    package manifest drift ahead of `origin/main`

## Gain Evidence

- The strict pre-push gate now has an explicit routing contract instead of a
  binary "skip or run full root type-check" rule.
- Workspace-local TypeScript changes can now reuse the already-governed
  `pnpm ci:affected:typecheck` path instead of always paying the full-root
  `pnpm type-check` cost.
- Global TypeScript graph inputs still fail closed through full-root
  `pnpm type-check`, so the slice reduces unnecessary work without weakening
  the broader safety path.
- The routing logic now lives in `tools/ci/` with contract tests, so any future
  drift between the strict pre-push selector and the shared CI scope model
  becomes merge-visible.

## No-Debt / No-Stub Evidence

- No ARC-triggering package paths were modified; the slice stayed in root
  tooling, tests, docs, and planning surfaces.
- No hook, workflow, lint, type-check, or verification rule was removed or
  relaxed.
- No stub, placeholder, or fake pass path was introduced.
- The slice does not claim that full-root `pnpm type-check` is obsolete; it
  remains the conservative path for global TypeScript graph changes.
- No hooks were bypassed.
