---
title: Post-Git Clean Tree And Web Validation Latency Plan
status: Active
owner: Governance / CI / Web
last_reviewed: 2026-09-04
planning_type: mandatory
featureId: POST-GIT-CLEAN-WEB-LATENCY-2899
issue: https://github.com/dunay2/dvt/issues/2899
---

# Post-Git Clean Tree And Web Validation Latency Plan

## Think-First analysis

### Problem summary

A successful merge or branch checkout can leave tracked files modified because
the repository runs Prettier after Git has materialized the target revision.
The same developer loop also reports a web validation duration of roughly ten
minutes, so the work must distinguish accidental local mutation from deliberate
CI runtime trade-offs.

### Root cause

The `post-merge` and branch-level `post-checkout` hooks invoke
`pnpm postgit:format`. That command resolves the changed ref range and executes
`prettier --write` over matching files. A post-Git hook runs after Git has
completed the operation, so it cannot protect the operation; it can only mutate
its committed result. On Windows, the repository LF policy makes the resulting
worktree rewrite especially visible.

The full Web Frontend Tests route is slow for a separate reason. It runs the
unit, presentation, and architecture suites sequentially. The governed CI
topology deliberately uses one isolated fork per test file because a shared
fork previously exceeded the 4 GB worker limit. A measured main run processed
591 files in about 800 seconds of Vitest time; environment creation and module
collection dominated assertion time.

### Constraints and invariants

- The checked-out revision is the canonical postcondition of merge and checkout;
  post-Git hooks must not change tracked files.
- Formatting remains enforced by the pre-commit `lint-staged` rail, explicit
  `fix:changed` / `ai:preflight` commands, and `verify:prepush` checks.
- Current GitHub Issues planning makes the old `agent-lane` hook warning
  obsolete; no local workboard behavior is retained.
- Web primary-suite coverage, isolated memory safety, and the 4 GB worker limit
  remain unchanged in this slice.
- The command/query rail rule applies to the existing developer-workflow command
  catalog and the existing `SelectWebVitestChangedSuites` query. No product rail
  is added.
- ADR-0000 traceability applies to this governed workflow change. ADR-0004 and
  ADR-0005 do not govern Git hooks or frontend test execution.

### Current state

```mermaid
flowchart LR
  Git[Git merge or checkout] --> Hook[post-merge / post-checkout]
  Hook --> Formatter[pnpm postgit:format]
  Formatter --> Write[Prettier --write]
  Write --> Dirty[Committed tree may become dirty]

  Full[Full web route] --> Unit[Unit: 273 files]
  Unit --> Presentation[Presentation: 217 files]
  Presentation --> Architecture[Architecture: 101 files]
  Architecture --> Complete[About 845 seconds total]
```

### Options considered

1. Retain post-Git formatting and automatically restore or commit its output.
   Rejected because it hides the mutation instead of removing it and can discard
   or manufacture changes.
2. Convert the formatter to `prettier --check` in the post-Git hooks. Rejected
   because the operation is already complete, duplicates the explicit validation
   rails, and adds checkout latency without an enforcement point.
3. Remove post-Git hooks and their dedicated writer, then add a CI architecture
   guard that rejects their reintroduction. Selected because it establishes an
   unambiguous no-side-effect invariant while preserving all pre-commit and
   pre-push enforcement.
4. Increase Web Vitest workers or enable `singleFork` immediately. Rejected for
   this slice because the current single-worker isolated topology is an explicit
   OOM mitigation and no new memory benchmark authorizes relaxing it.
5. Benchmark bounded batches and node-only test partitions in a sequenced issue.
   Selected as the safe next step for web latency: it targets the measured
   environment/fork cost while preserving periodic memory release and coverage.

No external library is needed; the change removes a custom post-Git writer and
keeps the existing command catalog and positive validation rails.

### Selected option and rationale

Delete the two post-Git hooks and retire `postgit:format`. Do not retain their
names in an executable rejection test: that would turn removed implementation
details into permanent negative API. Prevention remains attached to the
positive workflow boundaries that contributors actually use: the command
catalog contains only live commands, pre-commit owns formatting, and
pre-push verifies the resulting changes.

Keep the current Web Vitest topology unchanged until a dedicated benchmark
proves a lower-latency configuration within the same memory and coverage
constraints. Record the observed timing decomposition and create the follow-up
before closing this issue. GitHub issue
[#2900](https://github.com/dunay2/dvt/issues/2900) owns that benchmark and any
subsequent implementation.

### Fowler opportunity matrix

| Scenario                                                       | Opportunity                                            | Fowler pattern                                              | DDD owner / rail                                                | Allowed surfaces                                                                      | Test evidence                                         | Out of scope                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| Post-Git hooks rewrite committed files                         | Hidden side effect and duplicated formatting semantics | Remove Dead Code / Replace Command with Explicit Validation | Repository developer workflow; retired `postgit:format` command | `.husky/**`, `scripts/format-git-operation-changes*`, `package.json`, command catalog | Reproduction evidence plus live command-catalog tests | Changing pre-commit formatting                                           |
| Obsolete agent-lane warning remains in hooks                   | Obsolete planning authority                            | Remove Dead Code                                            | GitHub issue workflow                                           | `.husky/post-merge`, `.husky/post-checkout`                                           | Repository diff and issue journal                     | Reintroducing local workboards                                           |
| Web full route spends most time creating isolated environments | Repeated setup constrained by memory safety            | Introduce Bounded Batch / Separate Query from Modifier      | Web CI governance; `SelectWebVitestChangedSuites`               | Documentation and follow-up issue only                                                | Measured GitHub job timings                           | Relaxing coverage, memory limits, or worker isolation without benchmarks |

## Pre-Implementation Brief

- **Mode:** Full, because the slice changes a governed developer workflow and
  removes published command surfaces.
- **Scope:** hard-cut mutating post-Git automation, align the command catalog
  and testing guide, avoid executable tombstones for deleted symbols, and
  publish the measured Web Frontend Tests diagnosis.
- **Expected outcome:** merge and branch checkout end at the exact committed
  tree without a repository hook writing afterward; the web delay has a
  traceable cause and a separately governed optimization path.
- **Risks:** a future contributor may expect automatic formatting after branch
  switches. Mitigation: retain and document the existing explicit formatting
  rails and make the obsolete behavior clear.
- **Test posture:** validate the live command catalog and formatting rails; do
  not keep a test whose only responsibility is naming deleted hooks or scripts.
- **Out of scope:** changing Web Vitest worker count, suite coverage, test
  classification, or production application behavior.
- **Command/query impact:** retire the `postgit:format` developer-workflow
  command from `tools/ci/repository-command-catalog.mjs`; reuse
  `SelectWebVitestChangedSuites` unchanged for web PR routing.
- **Fowler impact:** remove hidden mutation, duplicate formatting semantics, and
  obsolete agent-lane workflow. The bounded-batch web opportunity remains for
  the linked follow-up issue.

## Target state

```mermaid
flowchart LR
  Git[Git merge or checkout] --> Clean[Exact committed tree remains checked out]
  Edit[Intentional edits] --> PreCommit[lint-staged / pre-commit]
  PreCommit --> Commit[Normalized commit]
  Commit --> PrePush[verify:prepush check]

  Full[Full web route] --> Safe[Current isolated memory-safe suites]
  Safe --> Evidence[Measured latency evidence]
  Evidence --> FollowUp[Bounded optimization issue]
```

## Feature mechanization

```feature-mechanization
version: 1
featureId: POST-GIT-CLEAN-WEB-LATENCY-2899
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/post-git-clean-tree-and-web-latency-plan-20260904.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/planning/state/github-mvp-issue-workflow.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/frontend-test-governance-component.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - .husky/post-merge
  - .husky/post-checkout
  - scripts/format-git-operation-changes.cjs
  - scripts/format-git-operation-changes.test.cjs
  - tools/ci/repository-command-catalog.mjs
  - package.json
  - docs/guides/testing-and-ci-capabilities.md
  - docs/**/index.md
  - docs/.governance/**
  - docs/planning/proposals/mandatory/governance-and-docs/post-git-clean-tree-and-web-latency-plan-20260904.md
  - docs/planning/closeouts/20260904-2899-post-git-clean-tree-and-web-latency-closeout.md
forbiddenImplementationSurfaces:
  - apps/web/src/**
  - apps/api/**
  - packages/@dvt/**
  - specs/contracts/**
commandQueryRails:
  - name: postgit:format
    type: command
    dddOwner: Repository developer workflow
    status: retired
domainObjects:
  - name: RepositoryCommandCatalog
    type: catalog
    owner: Repository CI governance
fowlerSignals:
  - Remove Dead Code
  - Replace Command with Explicit Validation
  - Separate Query from Modifier
architectureGuards:
  - node --test tools/ci/repository-command-catalog.test.mjs
cypressFlows:
  - N/A - repository workflow and CI test topology only
completionGate:
  - pnpm test:ci-tools:static
  - pnpm lint:md
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: post-git-command-removal
    redTest: Reproduce a branch checkout from a clean worktree and inspect git status --short.
    expectedFailure: The completed checkout rewrites tracked files and leaves the worktree dirty.
    patchSurfaces:
      - .husky/post-merge
      - .husky/post-checkout
      - scripts/format-git-operation-changes.cjs
      - scripts/format-git-operation-changes.test.cjs
      - package.json
      - tools/ci/repository-command-catalog.mjs
    greenTest: Inspect the committed tree after removing post-Git writers; no repository hook runs after checkout.
symbols: []
```
