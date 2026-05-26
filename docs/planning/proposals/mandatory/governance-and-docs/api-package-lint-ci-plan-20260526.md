---
title: API Package Lint CI Plan
status: Review
owner: Engineering
last_reviewed: 2026-05-26
planning_type: mandatory-proposal
---

# API Package Lint CI Plan

## Intent

`dvt-api` needs the same package-owned lint maturity as the web app. The root
repository lint remains useful, but it is not a package-local validation rail
and it is too easy for API changes to rely on root behavior without a package
command that CI can route through the affected workspace matrix.

This slice adds the package command and makes `CI - Code Quality` execute the
governed Turbo `lint` task for each affected workspace before build and
type-check.

## Decision

- `apps/api/package.json` owns `pnpm --filter dvt-api lint`.
- The affected-workspace wrapper accepts `lint` as a governed Turbo task.
- `CI - Code Quality` runs affected workspace lint before build/type-check.
- Workspaces without a package `lint` script remain valid: Turbo executes zero
  tasks for that package and exits successfully.
- `scripts/verify-prepush.test.cjs` keeps a regression guard for the API package
  lint command so the package cannot silently lose its local validation rail.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: D-API-LINT-CI-20260526
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/api-package-lint-ci-plan-20260526.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/components/ci-governance/local-changed-files-gate-component.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/api-package-lint-ci-plan-20260526.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - .github/workflows/ci.yml
  - .gitignore
  - apps/api/package.json
  - docs/.manifest.json
  - docs/**/index.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/api-package-lint-ci-plan-20260526.md
  - package.json
  - scripts/README.md
  - scripts/run-dev-stack.auth.cjs
  - scripts/run-dev-stack.auth.test.cjs
  - scripts/run-dev-stack.cjs
  - scripts/run-dev-stack.temporal.cjs
  - scripts/run-dev-stack.test.cjs
  - scripts/run-turbo-workspace-task.cjs
  - scripts/verify-prepush.test.cjs
  - tools/ci/turbo-workspace-task-contract.test.mjs
  - turbo.json
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - specs/**
commandQueryRails:
  - name: RunApiPackageLint
    type: command
    dddOwner: API package validation rail
  - name: CheckAffectedWorkspaceLint
    type: query
    dddOwner: CI workspace quality gate
domainObjects:
  - API package lint command
  - Affected workspace lint task
  - CI quality gate contract
fowlerSignals:
  - Explicit Gate
  - Package validation ownership
  - CI routing boundary
architectureGuards:
  - node --test scripts/verify-prepush.test.cjs
  - node --test tools/ci/turbo-workspace-task-contract.test.mjs
  - pnpm test:ci-tools
cypressFlows:
  - N/A - CI validation rail, no browser flow
completionGate:
  - pnpm --filter dvt-api lint
  - node scripts/run-turbo-workspace-task.cjs lint --filter=dvt-api
  - node scripts/run-turbo-workspace-task.cjs lint --filter=@dvt/contracts
  - node --test scripts/verify-prepush.test.cjs
  - node --test tools/ci/turbo-workspace-task-contract.test.mjs
  - pnpm test:ci-tools
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: api-owned-lint-command
    redTest: node --test scripts/verify-prepush.test.cjs
    expectedFailure: dvt-api does not expose an owned lint command for local package validation.
    patchSurfaces:
      - apps/api/package.json
      - scripts/verify-prepush.test.cjs
    greenTest: node --test scripts/verify-prepush.test.cjs
  - id: affected-workspace-lint-ci
    redTest: node --test tools/ci/turbo-workspace-task-contract.test.mjs
    expectedFailure: The Turbo workspace wrapper rejects lint and CI does not route affected workspace lint.
    patchSurfaces:
      - .github/workflows/ci.yml
      - package.json
      - scripts/README.md
      - scripts/run-turbo-workspace-task.cjs
      - tools/ci/turbo-workspace-task-contract.test.mjs
      - turbo.json
    greenTest: node --test tools/ci/turbo-workspace-task-contract.test.mjs
symbols:
  - name: SUPPORTED_TASKS
    path: scripts/run-turbo-workspace-task.cjs
    dddOwner: CI workspace quality gate
    cqRails:
      - CheckAffectedWorkspaceLint
    fowlerSignals:
      - Explicit Gate
      - CI routing boundary
    architectureGuard: node --test tools/ci/turbo-workspace-task-contract.test.mjs
    cypressCoverage: N/A - CI validation rail, no browser flow
    unitTests:
      - node --test tools/ci/turbo-workspace-task-contract.test.mjs
  - name: DEFAULT_LOCAL_DBT_BUNDLE_FILE_ROOT
    path: scripts/run-dev-stack.cjs
    dddOwner: Local protected-runtime dev stack
    cqRails:
      - RunApiPackageLint
    fowlerSignals:
      - Explicit Gate
      - Package validation ownership
    architectureGuard: node --test scripts/run-dev-stack.test.cjs
    cypressCoverage: N/A - local dev-stack validation rail, no browser flow
    unitTests:
      - node --test scripts/run-dev-stack.test.cjs
  - name: DEFAULT_LOCAL_WORKSPACE_FILES_ROOT
    path: scripts/run-dev-stack.cjs
    dddOwner: Local protected-runtime dev stack
    cqRails:
      - RunApiPackageLint
    fowlerSignals:
      - Explicit Gate
      - Package validation ownership
    architectureGuard: node --test scripts/run-dev-stack.test.cjs
    cypressCoverage: N/A - local dev-stack validation rail, no browser flow
    unitTests:
      - node --test scripts/run-dev-stack.test.cjs
  - name: buildLocalDbtArtifactEnv
    path: scripts/run-dev-stack.cjs
    dddOwner: Local protected-runtime dev stack
    cqRails:
      - RunApiPackageLint
    fowlerSignals:
      - Explicit Gate
      - Package validation ownership
    architectureGuard: node --test scripts/run-dev-stack.test.cjs
    cypressCoverage: N/A - local dev-stack validation rail, no browser flow
    unitTests:
      - node --test scripts/run-dev-stack.test.cjs
```
