---
title: CI, Prepush & PR Process — Observations and Improvement Log
status: Living
owner: docs
last_reviewed: 2026-03-30
planning_type: review
---

# CI, Prepush & PR Process — Observations and Improvement Log

**Context:** Recorded during the CI performance pass + prepush hardening session (2026-03-30).
Covers everything noticed while working on dunay2/dvt#684 — bugs fixed, bugs deferred, and
patterns that will cause friction again if left unaddressed.

---

## 1. Bugs fixed in this session

| ID        | File                                            | Problem                                                                                                                                                          | Fix                                          |
| --------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------- | --- | ----------------------- |
| BUG-2     | `AGENTS.md`                                     | Evidence template used flat `evidence: [...]` list — incompatible with the validator that requires `evidence.tests: [...]`                                       | Template updated to nested form              |
| BUG-3     | `.husky/commit-msg`                             | Used `npx --no -- commitlint` — downloads commitlint on cold runs, ignores project version                                                                       | Changed to `pnpm exec commitlint`            |
| BUG-1     | `scripts/validate-arc-evidence-frontmatter.cjs` | `listChangedFiles()` hardcoded `origin/main...HEAD` with no fallback — crashes on fresh clones or repos without `origin/main`                                    | Added same 3-step fallback chain as the hook |
| QUALITY-1 | `.husky/pre-push`                               | `pnpm -s` flag missing on `docs:arc:evidence:check` call in docs-only path                                                                                       | Made consistent                              |
| BUG-A     | `.husky/pre-push`                               | `set -e` + no `                                                                                                                                                  |                                              | true`at end of`changed=$(...)` — initial push on a single-commit repo aborts the hook entirely | Added ` |     | true` as final fallback |
| BUG-B     | `scripts/validate-arc-evidence-frontmatter.cjs` | `listEvidenceDocs` was not recursive — silently missed evidence docs in any subdirectory                                                                         | Made recursive                               |
| BUG-C     | `scripts/check-changed.cjs`                     | `catch` block repeated `HEAD~1..HEAD` — the same command that just failed. On a single-commit repo the catch also throws, producing an unhandled exception crash | `catch` now returns `[]`                     |
| -         | `scripts/check-changed.cjs`                     | Nested ternary in `gitChangedFiles` triggered IDE/linter warning (S3358)                                                                                         | Extracted to `resolveDiffCommand()`          |

---

## 2. Bugs deferred (known, not yet fixed)

### BUG-4 — Duplicate scope detection in hook vs. `check-changed.cjs`

Both `.husky/pre-push` and `scripts/check-changed.cjs` independently call `git diff` to build
their file lists. The hook decides _which gate_ to run; `check-changed.cjs` decides _which files_
to lint. They serve different purposes and cannot trivially share state without refactoring
`check-changed.cjs`'s API (it is also called directly from CI). Left as-is.

### QUALITY-1 (dot-notation) — Inconsistent 2-dot vs. 3-dot diff

The hook and `check-changed.cjs` use `..` (2-dot); `validate-arc-evidence-frontmatter.cjs` uses
`...` (3-dot / merge-base). On linear history they are equivalent. On non-linear history (e.g.
merge commits in upstream), a file reachable in the 2-dot diff may not appear in the 3-dot diff,
causing silent skip of validation. Low probability but worth making consistent in a future pass.

### QUALITY-2 — No timeout protection in scripts

`pnpm type-check` (TypeScript Language Server) can hang on large monorepos or when tsserver
accumulates memory pressure. None of the scripts or the hook set a timeout. A developer pushing
at end-of-day could block indefinitely. Mitigation: wrap `verify:prepush` with `timeout 300` in
the hook. Deferred because it requires OS-level `timeout` command (not available natively on
macOS without `coreutils`).

---

## 3. Process friction observed during the session

### 3.1 Working directly on `main` locally

All 15 commits were made directly on the local `main` branch. At PR creation time, `main` had
to be manually reset to `origin/main` and a feature branch created retroactively. This is risky:
if `git branch main origin/main --force` is run on the wrong branch it discards local work.

**Improvement:** Always create a feature branch before starting work. A `post-checkout` hook or
CLAUDE.md reminder would prevent this pattern.

### 3.2 `pnpm commit` requires interactive invocation but was called non-interactively

`scripts/commit.cjs` is designed as an interactive wizard but was called with all arguments
inline (`pnpm commit fix ci "message"`). This works but bypasses the wizard's prompts, meaning
scope validation only happens at git commit time (commitlint), not at wizard time. No functional
bug, but the dual-path usage is confusing.

### 3.3 `lint-staged` does not cover `scripts/*.cjs`

The `lint-staged` config in `package.json` covers:

- `packages/@dvt/*/src/**/*.{ts,tsx}`
- `packages/@dvt/*/test/**/*.{ts,tsx}`
- `specs/contracts/**/*.{md,json}`
- `*.{js,json,md,yml,yaml}` (root level only)

`scripts/validate-arc-evidence-frontmatter.cjs` (and other files under `scripts/`) were edited
in this session. They matched `*.{js,...,yaml}` only if at the root level; `scripts/*.cjs` files
do NOT match `*.{js,...}` (no directory prefix). In practice lint-staged said "no staged files
matching configured tasks" for these files, meaning they were committed without pre-commit
ESLint/Prettier enforcement.

**Improvement:** Add `"scripts/**/*.{js,cjs,mjs}": ["eslint --fix", "prettier --write"]` to
`lint-staged` config.

### 3.4 Pre-existing IDE warnings in `check-changed.cjs` not covered by CI lint

The IDE reported 5 diagnostics on `check-changed.cjs`:

- `child_process` → `node:child_process` (3× node: protocol hints)
- `runToolBatched` cognitive complexity 25 > 15 (S3776)
- nested ternary (S3358, fixed)

These are SonarLint hints, not ESLint errors, so they don't block CI. But they indicate the
file has accumulated complexity debt. The `runToolBatched` function is the main offender and
should be refactored (split into `runTool` + `runBatched`) in a follow-up.

### 3.5 `docs/planning/reviews/` document appeared as uncommitted at PR creation

The performance review document (`20260330-ci-performance-review-and-action-plan.md`) was
created early in the session but never staged or committed — it appeared as an untracked file
at `gh pr create` time, producing a warning. Documents created during a task should either be
committed immediately or explicitly staged before opening the PR.

### 3.6 `verify:prepush` runs `type-check` which rebuilds dependent packages

`pnpm type-check` includes:

```
pnpm --filter @dvt/contracts build &&
pnpm --filter @dvt/artifacts build &&
pnpm --filter @dvt/planner build &&
...
tsc --noEmit
```

This rebuilds 6 packages before running `tsc --noEmit`. On a warm machine this takes 15–30s
on every push regardless of what changed. A smarter gate would only rebuild if the package's
source changed, using the same `paths-filter` logic already used in CI.

### 3.7 `scripts/check-markdown-locations.cjs` — no `--changed-only` mode

`docs:gov:locations` (which runs on every push via `verify:prepush` and the docs-only path)
scans the entire `apps/` and `packages/` directory tree for misplaced markdown. This is O(all
files) on every push. Since misplaced markdown is typically introduced by a single commit, a
`--changed-only` mode would reduce this to O(changed files) and is straightforward to add.

---

## 4. CI workflow observations (from implementing the changes)

### 4.1 `paths-filter` outputs are fragile string comparisons

`dorny/paths-filter` emits string `'true'`/`'false'`, not booleans. Conditions like:

```yaml
if: steps.scope.outputs.docs_changed == 'true'
```

are correct, but a typo (`steps.scope.outputs.docs_changed == true`) silently evaluates to
`false` in GitHub Actions expression language. There is no static type-checking.

**Improvement:** Add a dedicated test job (like the existing `test:ci-tools`) that validates
all `paths-filter` output names and condition strings match.

### 4.2 `detect-affected` job emits two code paths with duplicated output logic

The `ci.yml` `detect-affected` job has an early-exit path (non-PR) and a normal path, each
independently echoing outputs. If a new output is added, it must be added in both places.
This happened with `docs_changed` — easy to forget one path. Consider consolidating into a
single output step that always runs.

### 4.3 `node_modules` cache key does not include OS arch

The cache key is `nm-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}`. If the repo ever
runs on both `ubuntu-latest` (x64) and ARM runners in the same workflow, the cache would be
incorrectly shared. Low risk today, worth noting for future ARM migration.

### 4.4 No cache invalidation strategy for `pnpm` store vs. `node_modules`

The composite action now has two cache layers: the pnpm store (existing) and `node_modules`
(new). If the pnpm store cache hits but `node_modules` cache misses, `pnpm install` runs but
uses the warm store — fast. If both miss, full network download. If `node_modules` hits but
pnpm store misses, `pnpm install` is skipped — but the store is missing for future jobs. No
correctness issue (node_modules is self-contained), but the pnpm store then goes cold
unnecessarily. A future improvement: always save the pnpm store regardless of nm-cache hit.

### 4.5 SHA-pinned actions have no automated update mechanism

Six action SHAs were pinned manually in this session by querying the GitHub API. There is no
Dependabot config (`/.github/dependabot.yml`) for GitHub Actions, so these SHAs will silently
drift from the latest patch version. Either:

- Add `github-actions` ecosystem to Dependabot config, or
- Document a manual quarterly review process.

---

## 5. Structural improvement candidates (not urgent)

| Area                                   | Suggestion                                                          |
| -------------------------------------- | ------------------------------------------------------------------- |
| `scripts/`                             | Add `scripts/**/*.{js,cjs,mjs}` to `lint-staged`                    |
| `scripts/check-markdown-locations.cjs` | Add `--changed-only` mode                                           |
| `scripts/check-changed.cjs`            | Refactor `runToolBatched` to reduce cognitive complexity            |
| `.husky/pre-push`                      | Wrap `verify:prepush` with `timeout 300` (Linux/macOS only)         |
| `ci.yml`                               | Consolidate `detect-affected` output emission to single step        |
| `.github/dependabot.yml`               | Add `github-actions` ecosystem entry                                |
| Workflow                               | Establish convention: always branch off `main` before starting work |
