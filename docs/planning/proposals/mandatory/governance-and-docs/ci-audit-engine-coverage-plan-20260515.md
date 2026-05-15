---
title: CI Audit Engine Coverage Plan
status: Review
owner: Engineering / CI Governance
last_reviewed: 2026-05-15
planning_type: mandatory-proposal
---

# CI Audit Engine Coverage Plan

**Goal:** Close `CI-AUDIT-ENGINE-COVERAGE` by aligning the Engine Coverage Gate
scope with the governed engine package scope, so engine Vitest configuration
changes cannot bypass coverage threshold enforcement.

**Architecture:** Keep `.github/workflows/test.yml` as a consumer of
`tools/ci/emit-scope.mjs --mode test`. The fix belongs in the CI scope query
model, not in a new inline workflow filter. `coverage_relevant` must become a
semantic output derived from the engine workspace policy plus the existing
contract and root test configuration inputs.

## Owned Concern

This slice owns Engine Coverage Gate routing in the Test Suite workflow.

It does not change engine runtime behavior, coverage thresholds, package test
commands, branch protection settings, adapter behavior, or contract contents.

## Fowler Matrix

| Scenario                                              | Opportunity                               | Fowler pattern                                                | DDD owner                              | Command/query rail                    | Implementation surfaces                                                                                                                                                                                 | Unit or package test                                                  | Architecture test                                                          | User-flow test       | Out of scope                          |
| ----------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------- | ------------------------------------- |
| Engine package config changes must run coverage.      | Duplicate semantics and hidden authority. | Replace duplicated path subset with single source of truth.   | `EngineCoverageScope` policy.          | `ClassifyChangedCiScope` query.       | `tools/ci/scope-config.mjs`, `tools/ci/emit-scope.test.mjs`.                                                                                                                                            | `emit-scope test mode marks engine package config coverage relevant`. | `workflow-pattern-parity` asserts coverage covers engine workspace policy. | Not browser-visible. | Threshold values and engine tests.    |
| Test Suite workflow must consume the semantic output. | Test-only confidence.                     | Preserve adapter boundary, assert semantic contract.          | `WorkflowModeScopeOutputs` read model. | `EmitWorkflowCapabilityScopes` query. | `.github/workflows/test.yml`, `tools/ci/workflow-pattern-parity.test.mjs`.                                                                                                                              | Existing workflow string checks.                                      | Semantic workflow parity test.                                             | Not browser-visible. | Rewriting workflow structure.         |
| Docs must reflect current executable behavior.        | Documentation drift.                      | Component guide with API, invariants, transitions, consumers. | `Repository CI scope policy`.          | none - internal CI docs.              | `docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md`, `docs/guides/testing-and-ci-capabilities.md`, `buzon/20260515-codex-fowler-ci-audit-engine-coverage-analysis.md`. | Markdown/docs gates.                                                  | Feature mechanization guard.                                               | Not browser-visible. | Generated planning DB task lifecycle. |

## Command And Query Rails

| Rail                                  | Type  | Owning bounded context | DDD object or read model     | Application port                  | Adapter surface              | Scope and authorization               | Negative tests                                                           |
| ------------------------------------- | ----- | ---------------------- | ---------------------------- | --------------------------------- | ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `ClassifyChangedCiScope`              | query | CI Governance          | `EngineCoverageScope` policy | `computeWorkflowModeScopeOutputs` | `tools/ci/emit-scope.mjs`    | Repository PR changed-file read only. | Engine package config must not leave `coverage_relevant=false`.          |
| `EmitWorkflowCapabilityScopes`        | query | CI Governance          | `WorkflowModeScopeOutputs`   | `emit-scope.mjs --mode test`      | `.github/workflows/test.yml` | GitHub Actions job output emission.   | Coverage workflow must not use a parallel inline path filter.            |
| `ValidateEngineCoverageScopeContract` | query | CI Governance          | CI tool contract test suite  | `node --test tools/ci/*.test.mjs` | `pnpm test:ci-tools`         | Local and CI validation command.      | Test fails if coverage scope no longer includes engine workspace policy. |

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: CI-AUDIT-ENGINE-COVERAGE-20260515
mechanizationStatus: closed
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/ci-audit-engine-coverage-plan-20260515.md
componentGuides:
  - docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/ci-audit-engine-coverage-plan-20260515.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/ci-and-delivery/20260506-ci-build-audit-review.md
allowedImplementationSurfaces:
  - .github/workflows/test.yml
  - tools/ci/scope-config.mjs
  - tools/ci/emit-scope.test.mjs
  - tools/ci/workflow-pattern-parity.test.mjs
  - docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/ci-audit-engine-coverage-plan-20260515.md
  - docs/planning/proposals/mandatory/governance-and-docs/ci-scope-optimization-plan-20260508.md
  - buzon/20260515-codex-fowler-ci-audit-engine-coverage-analysis.md
  - docs/.manifest.json
  - docs/**/index.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/contracts/**
  - .golden/**
  - docs/archive/**
domainObjects:
  - name: ChangedFileSet
    type: query input
    owner: Repository CI scope policy
  - name: EngineWorkspaceScope
    type: policy
    owner: Repository CI scope policy
  - name: EngineCoverageScope
    type: policy
    owner: Repository CI scope policy
  - name: WorkflowModeScopeOutputs
    type: read model
    owner: Repository CI scope policy
fowlerSignals:
  - Duplicate semantics between engine workspace and coverage paths
  - Primitive path obsession in coverage routing
  - Documentation drift between CI scope docs and executable canary
architectureGuards:
  - node --test tools/ci/emit-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
  - pnpm test:ci-tools
cypressFlows:
  - N/A - CI routing only
commandQueryRails:
  - name: ClassifyChangedCiScope
    type: query
    dddOwner: EngineCoverageScope
  - name: EmitWorkflowCapabilityScopes
    type: query
    dddOwner: WorkflowModeScopeOutputs
  - name: ValidateEngineCoverageScopeContract
    type: query
    dddOwner: CI tool contract test suite
redGreenCycles:
  - id: engine-vitest-config-opens-coverage
    redTest: node --test tools/ci/emit-scope.test.mjs
    expectedFailure: packages/@dvt/engine/vitest.config.ts currently sets engine=true but coverage_relevant=false.
    patchSurfaces:
      - tools/ci/scope-config.mjs
      - tools/ci/emit-scope.test.mjs
    greenTest: node --test tools/ci/emit-scope.test.mjs
  - id: coverage-scope-follows-engine-workspace-policy
    redTest: node --test tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: coverage_relevant does not cover every engine workspace policy pattern.
    patchSurfaces:
      - tools/ci/scope-config.mjs
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/workflow-pattern-parity.test.mjs
symbols:
  - name: ENGINE_WORKSPACE_PATTERNS
    path: tools/ci/scope-config.mjs
    dddOwner: EngineWorkspaceScope
    cqRails:
      - ClassifyChangedCiScope
    fowlerSignals:
      - Duplicate semantics between engine workspace and coverage paths
    architectureGuard: node --test tools/ci/emit-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI routing only
    unitTests:
      - node --test tools/ci/emit-scope.test.mjs
  - name: TEST_SCOPE_PATTERNS
    path: tools/ci/scope-config.mjs
    dddOwner: EngineCoverageScope
    cqRails:
      - ClassifyChangedCiScope
    fowlerSignals:
      - Duplicate semantics between engine workspace and coverage paths
    architectureGuard: node --test tools/ci/emit-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI routing only
    unitTests:
      - node --test tools/ci/emit-scope.test.mjs
completionGate:
  - node --test tools/ci/emit-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
  - pnpm test:ci-tools
  - pnpm docs:sync
  - pnpm docs:feature-mechanization -- --feature CI-AUDIT-ENGINE-COVERAGE-20260515
  - pnpm docs:feature-mechanization:implementation -- --feature CI-AUDIT-ENGINE-COVERAGE-20260515
  - pnpm verify:prepush
```

## User Stories

1. As an engine maintainer changing `packages/@dvt/engine/src/**`, I want the
   Engine Coverage Gate to run, so coverage thresholds protect runtime changes.
2. As an engine maintainer changing `packages/@dvt/engine/vitest.config.ts`, I
   want the Engine Coverage Gate to run, so coverage runner changes cannot
   merge without threshold enforcement.
3. As a contracts maintainer changing `packages/@dvt/contracts/**`, I want
   engine coverage to remain relevant, so engine contract integration coverage
   remains guarded.
4. As a CI maintainer changing `.github/workflows/test.yml`, I want coverage to
   run, so workflow edits cannot silently skip the affected gate.
5. As a docs author changing unrelated docs, I want the coverage job to remain
   closed on PRs, so CI fan-out stays controlled without losing safety.

## TDD Plan

1. Add a failing `emit-scope` test for
   `packages/@dvt/engine/vitest.config.ts`.
2. Add a failing semantic architecture test that every engine workspace policy
   pattern is covered by `coverage_relevant`.
3. Update `tools/ci/scope-config.mjs` so coverage consumes the engine workspace
   policy instead of a source/test-only duplicate subset.
4. Run the focused tests, then `pnpm test:ci-tools`, feature mechanization, docs
   sync, and pre-push validation.

## ADR Decision

No ADR is required. The slice does not introduce a new architectural decision;
it applies the accepted CI scope governance model and the existing
command/query rail for CI scope classification.

## Acceptance Criteria

- `computeWorkflowModeScopeOutputs('test', ['packages/@dvt/engine/vitest.config.ts'])`
  returns `engine=true` and `coverage_relevant=true`.
- `TEST_SCOPE_PATTERNS.coverage_relevant` covers the governed engine workspace
  policy.
- `.github/workflows/test.yml` continues to consume
  `steps.scope.outputs.coverage_relevant` for the Engine Coverage Gate.
- Documentation names the public API, invariants, transitions, consumers, user
  stories, and drift watch for the component.
- No application package, contract, adapter, or runtime behavior changes.
