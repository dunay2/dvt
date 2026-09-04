---
title: Issue 2899 Post-Git Clean Tree And Web Latency Closeout
status: Active
date: 2026-09-04
owners:
  - Governance / CI / Web
issue: https://github.com/dunay2/dvt/issues/2899
featureId: POST-GIT-CLEAN-WEB-LATENCY-2899
---

# Issue 2899 Post-Git Clean Tree And Web Latency Closeout

## Think-First reconciliation

The repository was intentionally running `prettier --write` after merge and
branch checkout. The operation could therefore finish successfully and then
have its committed result rewritten by a Husky hook. The selected solution
removes that late writer and enforces the absence of both post-Git hooks through
the existing static CI-tool test rail. Automatic formatting remains available
before a commit and through explicit developer commands; no replacement writer
was introduced.

The web delay is independent of the hook defect. A measured full hosted route
took about 845 seconds, of which only about 35 seconds were setup and dependency
build. The remaining time came from three sequential Vitest suites covering 591
files. Environment construction and module collection dominated assertion time
because the current memory-safe policy uses one isolated `jsdom` fork per file.
The repository explicitly chose that topology after an unbounded shared fork
exceeded the 4 GB worker limit. Issue
[#2900](https://github.com/dunay2/dvt/issues/2900) owns bounded-batch and non-DOM
partition benchmarks before any runtime topology change.

## Governing sources used

- `AGENTS.md`.
- `docs/planning/status/governance-document-rule-inventory.md`.
- `docs/planning/state/github-mvp-issue-workflow.md`.
- `docs/guides/ai-work-protocol.md`.
- `docs/architecture/command-query-rail-governance.md`.
- `docs/architecture/fowler-opportunity-planning-governance.md`.
- `docs/architecture/components/web/frontend-test-governance-component.md`.
- `docs/guides/testing-and-ci-capabilities.md`.
- `docs/planning/proposals/mandatory/governance-and-docs/post-git-clean-tree-and-web-latency-plan-20260904.md`.

The Planning DB architecture-design query was consulted before the component
documents. It returned no hook-specific authority, so the repository developer
workflow catalog and existing Web Vitest governance component remained the
owners.

## Real work performed

- Deleted `.husky/post-merge` and `.husky/post-checkout`.
- Deleted `scripts/format-git-operation-changes.cjs` and its dedicated tests.
- Removed `postgit:format` and `test:postgit:format` from `package.json`.
- Removed the retired command and file rule from
  `tools/ci/repository-command-catalog.mjs`.
- Added `tools/ci/post-git-hook-purity.test.mjs`. The static CI-tool discovery
  automatically executes this guard and rejects reintroduction of any retired
  surface.
- Updated `docs/guides/testing-and-ci-capabilities.md` with the clean-tree
  invariant, surviving format rails, measured web timing, and memory constraint.
- Opened GitHub issue #2900 for the separately governed Web Vitest benchmark.

No product application, API, contract, adapter, or Web Vitest execution surface
changed.

## Acceptance and evidence

| Acceptance                                                  | Evidence                                                                                               | Result |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------ |
| Post-Git operations cannot be rewritten by repository hooks | Both post-Git hooks and their writer are absent; `PostGitHookPurityPolicy` asserts the hard cut        | Passed |
| Regression test fails on the old behavior                   | Initial `node --test tools/ci/post-git-hook-purity.test.mjs` failed 2/2 while hooks and writer existed | Passed |
| Regression test passes on the new behavior                  | The same command passed 2/2 after removal                                                              | Passed |
| Canonical CI test rail owns the guard                       | `pnpm test:ci-tools:static` passed 230/230                                                             | Passed |
| Command catalog remains coherent                            | Direct CI-tool and command-catalog suite passed 15/15                                                  | Passed |
| Web delay has a measured dominant cause                     | 845 s full route: about 35 s setup; 320 s unit; 379 s presentation; 101 s architecture                 | Passed |
| Material web bottleneck has a sequenced next issue          | #2900 records alternatives, memory/coverage constraints, and acceptance                                | Passed |
| Markdown changes are valid                                  | `pnpm lint:md:changed` passed                                                                          | Passed |
| Feature mechanization is coherent                           | Feature-specific check and implementation check passed                                                 | Passed |

## Obsolete and rejected behavior

- Post-Git automatic formatting and its environment opt-out are removed.
- The post-Git `agent-lane` workboard warning is removed because GitHub Issues
  replaced local task-lane authority.
- Auto-committing, restoring, or hiding formatter output after Git is rejected.
- Increasing Web Vitest concurrency or enabling one unlimited shared fork is
  rejected until #2900 proves memory safety with peak-RSS evidence.

## Validation closeout

The final governance refresh and pre-push results are recorded in the governing
issue and commit history. No checks were bypassed, and the pre-commit hook ran on
both commits made before this closeout.

## No-debt and no-stub evidence

- No debt entry was created; the distinct performance optimization has a
  fully-scoped GitHub issue rather than a TODO or placeholder.
- No lint, type, test, formatting, memory, or coverage rule was relaxed.
- No hook or validation was bypassed.
- No stub, fake adapter, placeholder, TODO, FIXME, or unfinished production
  branch was added.
