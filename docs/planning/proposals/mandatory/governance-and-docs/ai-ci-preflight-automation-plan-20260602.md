---
title: AI CI Preflight Automation Plan
status: Review
owner: Engineering / CI
last_reviewed: 2026-06-02
planning_type: mandatory-proposal
---

# AI CI Preflight Automation Plan

## Current State

The repository already enforces Prettier through `lint-staged`, `fix:changed`,
`check-changed`, `verify:changed`, and `verify:prepush`. Workspace VS Code
settings also enable Prettier-on-save, but that posture is not tested as a
repository contract.

AI agents still lose cycles when they run validation, hit a format-only failure,
then run a separate fix command and repeat the same gate. Remote CI can also
fail before a runner starts; those failures need deterministic triage so agents
stop polling or re-running local checks for an external infrastructure block.
Several pull-request scope jobs also fetched full Git history before computing
whether expensive lanes should run. That preserved correctness, but it spent
remote time and network before the scope read model could close unrelated lanes.

## Target State

- Workspace save formatting is a tested contract: Prettier and ESLint extensions
  are recommended, Prettier is the default formatter, `formatOnSave` is enabled,
  and Prettier requires the repo config.
- `pnpm ai:preflight` is the agent-facing local command. It runs
  `pnpm fix:changed` once, then runs `pnpm verify:prepush`; with `-- --full`,
  it delegates to full pre-push validation.
- `pnpm pr:checks:first-failure` exposes the first remote failure payload. When
  GitHub Actions exposes no job log, the payload returns
  `unstarted_actions_failure` so agents can stop repeating local validation and
  report the external block.
- The Test Suite workflow emits test-scope outputs once from
  `detect_test_matrix`. Heavy pull-request lanes consume those outputs at job
  level, so irrelevant PRs do not spend a runner on checkout, dependency setup,
  or repeated scope detection.
- Pull-request scope-diff consumers use shallow checkout and
  `.github/actions/fetch-scope-base` to fetch only the base ref needed for
  changed-file comparisons. This keeps GitHub as a merge gate, but removes
  full-history checkout from the CI, Test Suite, Contracts, and PR Quality
  scope routes.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AI-CI-PREFLIGHT-AUTOMATION-20260602
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/ai-ci-preflight-automation-plan-20260602.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
  - docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md
userStories:
  - As an AI agent, I can run one local preflight command that fixes changed files before validation.
  - As an AI agent, I can classify remote CI failures that never started a runner as infrastructure blocks.
  - As an engineer, I can rely on tracked workspace settings to run Prettier when files are saved.
  - As an AI agent, I can rely on GitHub skipping heavy Test Suite PR lanes before runner setup when the semantic scope is false.
  - As an engineer, PR scope detectors avoid full-history checkout before deciding whether expensive lanes apply.
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/guides/test-architecture.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - .github/actions/fetch-scope-base/action.yml
  - .github/workflows/ci.yml
  - .github/workflows/contracts.yml
  - .github/workflows/pr-quality-gate.yml
  - .github/workflows/test.yml
  - .vscode/extensions.json
  - .vscode/settings.json
  - package.json
  - docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/ai-ci-preflight-automation-plan-20260602.md
  - docs/.manifest.json
  - docs/**/index.md
  - scripts/ai-preflight.cjs
  - scripts/ai-preflight.test.cjs
  - scripts/local-validation-plan.cjs
  - scripts/verify-changed.test.cjs
  - tools/ci/policy/workflow-scope.json
  - tools/ci/pr-check-triage.mjs
  - tools/ci/pr-check-triage.test.mjs
  - tools/ci/repository-change-scope.mjs
  - tools/ci/repository-change-scope.test.mjs
  - tools/ci/repository-command-catalog.mjs
  - tools/ci/repository-command-catalog.test.mjs
  - tools/ci/scope-config.mjs
  - tools/ci/workflow-pattern-parity.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/contracts/**
commandQueryRails:
  - name: RunAgentPreflight
    type: command
    dddOwner: DeveloperWorkflow
  - name: QueryPrCheckFirstFailure
    type: query
    dddOwner: CiCheckTriage
  - name: EmitWorkflowCapabilityScopes
    type: query
    dddOwner: Repository CI scope policy
domainObjects:
  - name: AgentPreflightPlan
    type: developer workflow command plan
    owner: Engineering / CI
  - name: WorkspaceFormatOnSavePolicy
    type: editor automation contract
    owner: Engineering / CI
  - name: PrCheckFailureTriage
    type: CI read model
    owner: Engineering / CI
  - name: TestSuiteScopeReadModel
    type: CI scope read model
    owner: Engineering / CI
  - name: ScopeDiffCheckoutPolicy
    type: CI scope checkout policy
    owner: Engineering / CI
fowlerSignals:
  - Automation Gap when agents must manually discover and run formatting before validation.
  - Hidden Failure Mode when GitHub Actions reports a failure without assigning a runner or producing logs.
  - Duplicate Work when pre-push validation and push hooks repeat the same checks.
  - Duplicate Work when Test Suite jobs repeat semantic scope detection after the detector already computed the same read model.
  - Over-eager Resource Use when PR scope detectors fetch full repository history before deciding whether heavy lanes apply.
architectureGuards:
  - node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/pr-check-triage.test.mjs tools/ci/repository-command-catalog.test.mjs tools/ci/repository-change-scope.test.mjs
  - node --test tools/ci/workflow-pattern-parity.test.mjs
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - developer workflow and CI tooling only
completionGate:
  - pnpm governance:refresh
  - node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/pr-check-triage.test.mjs tools/ci/repository-command-catalog.test.mjs tools/ci/repository-change-scope.test.mjs
  - node --test tools/ci/workflow-pattern-parity.test.mjs
  - pnpm verify:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: agent-preflight-command
    redTest: node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/repository-command-catalog.test.mjs
    expectedFailure: ai:preflight package script and scripts/ai-preflight.cjs are missing.
    patchSurfaces:
      - package.json
      - scripts/ai-preflight.cjs
      - scripts/local-validation-plan.cjs
      - tools/ci/repository-command-catalog.mjs
    greenTest: node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/repository-command-catalog.test.mjs
  - id: remote-ci-unstarted-failure-triage
    redTest: node --test tools/ci/pr-check-triage.test.mjs
    expectedFailure: missing job logs are treated as generic command failures instead of unstarted CI failures.
    patchSurfaces:
      - package.json
      - tools/ci/pr-check-triage.mjs
      - tools/ci/pr-check-triage.test.mjs
    greenTest: node --test tools/ci/pr-check-triage.test.mjs
  - id: test-suite-job-level-scope-gating
    redTest: node --test tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: Test Suite repeats emit-scope --mode test six times across heavy PR lanes.
    patchSurfaces:
      - .github/workflows/test.yml
      - docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md
      - docs/guides/testing-and-ci-capabilities.md
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/workflow-pattern-parity.test.mjs
  - id: scope-diff-shallow-checkout
    redTest: node --test tools/ci/repository-change-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: composite CI actions are not workflow policy inputs, and scope-diff workflows still use full-history PR checkout.
    patchSurfaces:
      - .github/actions/fetch-scope-base/action.yml
      - .github/workflows/ci.yml
      - .github/workflows/contracts.yml
      - .github/workflows/pr-quality-gate.yml
      - .github/workflows/test.yml
      - tools/ci/policy/workflow-scope.json
      - tools/ci/repository-change-scope.mjs
      - tools/ci/repository-change-scope.test.mjs
      - tools/ci/scope-config.mjs
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/repository-change-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
symbols:
  - name: assert
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - Node test assertion dependency
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: fs
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - Node test fixture reader
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: path
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - Node test path helper
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: test
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - Node test harness dependency
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: repoRoot
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - test fixture root
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: step
    path: scripts/ai-preflight.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - developer workflow command plan
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: parseArgs
    path: scripts/ai-preflight.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - developer workflow command plan
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: buildAgentPreflightPlan
    path: scripts/ai-preflight.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap, Duplicate Work]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - developer workflow command plan
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: printAgentPreflightPlan
    path: scripts/ai-preflight.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - developer workflow command plan
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: executeAgentPreflightPlan
    path: scripts/ai-preflight.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap, Duplicate Work]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - developer workflow command plan
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: main
    path: scripts/ai-preflight.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - developer workflow command plan
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: readJson
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - test helper
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: commandLabels
    path: scripts/ai-preflight.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Duplicate Work]
    architectureGuard: node --test scripts/ai-preflight.test.cjs
    cypressCoverage: N/A - test helper
    unitTests:
      - scripts/ai-preflight.test.cjs
  - name: isMissingActionsJobLog
    path: tools/ci/pr-check-triage.mjs
    dddOwner: CiCheckTriage
    cqRails: [QueryPrCheckFirstFailure]
    fowlerSignals: [Hidden Failure Mode]
    architectureGuard: node --test tools/ci/pr-check-triage.test.mjs
    cypressCoverage: N/A - CI tooling query
    unitTests:
      - tools/ci/pr-check-triage.test.mjs
  - name: buildFirstFailurePayload
    path: tools/ci/pr-check-triage.mjs
    dddOwner: CiCheckTriage
    cqRails: [QueryPrCheckFirstFailure]
    fowlerSignals: [Hidden Failure Mode]
    architectureGuard: node --test tools/ci/pr-check-triage.test.mjs
    cypressCoverage: N/A - CI tooling query
    unitTests:
      - tools/ci/pr-check-triage.test.mjs
  - name: detect_test_matrix
    path: .github/workflows/test.yml
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Duplicate Work]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - GitHub Actions workflow query
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: Test Suite heavy PR lanes are gated at job level by one detector
    path: tools/ci/workflow-pattern-parity.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Duplicate Work]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI workflow architecture test
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: fetch-scope-base
    path: .github/actions/fetch-scope-base/action.yml
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - GitHub Actions scope preparation
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: SHARED_CI_ACTION_PATTERNS
    path: tools/ci/scope-config.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/emit-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI scope policy constant
    unitTests:
      - tools/ci/emit-scope.test.mjs
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: CI_SCOPE_FETCH_ACTION_PATTERNS
    path: tools/ci/scope-config.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/emit-scope.test.mjs tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI scope policy constant
    unitTests:
      - tools/ci/emit-scope.test.mjs
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: scope diff consumers use shallow checkout instead of full PR history
    path: tools/ci/workflow-pattern-parity.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI workflow architecture test
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: classifies CI composite actions as workflow policy inputs without workspace fan-out
    path: tools/ci/repository-change-scope.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/repository-change-scope.test.mjs
    cypressCoverage: N/A - CI scope classification test
    unitTests:
      - tools/ci/repository-change-scope.test.mjs
```
