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

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AI-CI-PREFLIGHT-AUTOMATION-20260602
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/ai-ci-preflight-automation-plan-20260602.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - As an AI agent, I can run one local preflight command that fixes changed files before validation.
  - As an AI agent, I can classify remote CI failures that never started a runner as infrastructure blocks.
  - As an engineer, I can rely on tracked workspace settings to run Prettier when files are saved.
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/guides/test-architecture.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - .vscode/extensions.json
  - .vscode/settings.json
  - package.json
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/ai-ci-preflight-automation-plan-20260602.md
  - docs/.manifest.json
  - docs/**/index.md
  - scripts/ai-preflight.cjs
  - scripts/ai-preflight.test.cjs
  - scripts/local-validation-plan.cjs
  - scripts/verify-changed.test.cjs
  - tools/ci/pr-check-triage.mjs
  - tools/ci/pr-check-triage.test.mjs
  - tools/ci/repository-command-catalog.mjs
  - tools/ci/repository-command-catalog.test.mjs
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
fowlerSignals:
  - Automation Gap when agents must manually discover and run formatting before validation.
  - Hidden Failure Mode when GitHub Actions reports a failure without assigning a runner or producing logs.
  - Duplicate Work when pre-push validation and push hooks repeat the same checks.
architectureGuards:
  - node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/pr-check-triage.test.mjs tools/ci/repository-command-catalog.test.mjs
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - developer workflow and CI tooling only
completionGate:
  - pnpm governance:refresh
  - node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/pr-check-triage.test.mjs tools/ci/repository-command-catalog.test.mjs
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
```
