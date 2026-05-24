---
title: GHAS Gated Security Workflows Plan
status: Review
owner: Governance / CI
last_reviewed: 2026-05-24
planning_type: proposal
---

# GHAS Gated Security Workflows Plan

## Purpose

Keep the repository security workflows aligned with the actual GitHub security
features available to the repository. The immediate failure mode is that
`CodeQL` and `Dependency Review` fail before evaluating the pull request diff
when this private repository does not have GitHub Advanced Security enabled.

## Scope

- Keep `CodeQL` and `Dependency Review` as the security workflow owners.
- Run both workflows by default for public repositories.
- Run both workflows for private repositories only when the repository variable
  `GH_ADVANCED_SECURITY_ENABLED=true` declares that GitHub Advanced Security
  and the required dependency/security analysis features are available.
- Preserve pinned action references and high-severity dependency failure
  policy.
- Do not weaken product, test, docs, contract, or PR quality gates.

## Command And Query Rail

This slice changes CI workflow execution policy. It does not add product
commands or queries.

| Behavior                                     | Rail                  | Type  | Owner                        |
| -------------------------------------------- | --------------------- | ----- | ---------------------------- |
| Decide whether CodeQL can run in this repo   | `EvaluateWorkflowRun` | query | `SecurityWorkflowCapability` |
| Decide whether dependency review can run     | `EvaluateWorkflowRun` | query | `SecurityWorkflowCapability` |
| Preserve workflow pattern parity in CI tests | `ValidateWorkflow`    | query | `WorkflowPatternParityGuard` |

## Fowler Analysis

- Environmental coupling: the workflows assumed a repo capability that is not
  present in all supported repository configurations. Make the capability
  explicit.
- Feature envy: product PRs should not absorb repository entitlement failures.
  Keep the check in CI governance instead of product code.
- Test-only confidence: add workflow parity coverage so future workflow edits
  preserve the GHAS gate and pinned security actions together.

```feature-mechanization
version: 1
featureId: GHAS-GATED-SECURITY-WORKFLOWS-20260524
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/ghas-gated-security-workflows-plan-20260524.md
componentGuides:
  - docs/guides/testing-and-ci-capabilities.md
userStories:
  - docs/guides/testing-and-ci-capabilities.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/guides/ai-work-protocol.md
  - docs/guides/testing-and-ci-capabilities.md
allowedImplementationSurfaces:
  - .github/workflows/codeql.yml
  - .github/workflows/dependency-review.yml
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/proposals/mandatory/governance-and-docs/ghas-gated-security-workflows-plan-20260524.md
  - tools/ci/workflow-pattern-parity.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: EvaluateWorkflowRun
    type: query
    dddOwner: SecurityWorkflowCapability
  - name: ValidateWorkflow
    type: query
    dddOwner: WorkflowPatternParityGuard
domainObjects:
  - name: SecurityWorkflowCapability
    type: CI capability policy
    owner: Governance / CI
  - name: WorkflowPatternParityGuard
    type: CI architecture guard
    owner: Governance / CI
  - name: GitHubAdvancedSecurityAvailability
    type: repository capability flag
    owner: Governance / CI
fowlerSignals:
  - Environmental coupling
  - Feature envy
  - Test-only confidence
  - Hidden repository capability
architectureGuards:
  - pnpm test:ci-tools
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - repository CI workflow gating only
completionGate:
  - pnpm test:ci-tools
  - pnpm lint:md:changed
  - pnpm docs:sync
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: ghas-security-workflow-gate
    redTest: gh pr view 1369 --json statusCheckRollup
    expectedFailure: CodeQL and Dependency Review fail before diff analysis because GHAS-backed repository features are unavailable.
    patchSurfaces:
      - .github/workflows/codeql.yml
      - .github/workflows/dependency-review.yml
      - docs/guides/testing-and-ci-capabilities.md
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: pnpm test:ci-tools
  - id: feature-mechanization-closeout
    redTest: pnpm docs:feature-mechanization:implementation
    expectedFailure: Workflow and CI documentation surfaces are outside allowedImplementationSurfaces before this plan declares them.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/ghas-gated-security-workflows-plan-20260524.md
    greenTest: pnpm docs:feature-mechanization:implementation
symbols:
  - &securityWorkflowSymbol
    name: CodeQL analyze
    path: .github/workflows/codeql.yml
    dddOwner: SecurityWorkflowCapability
    cqRails:
      - EvaluateWorkflowRun
    fowlerSignals:
      - Environmental coupling
      - Hidden repository capability
    architectureGuard: tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - repository CI workflow gating only
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - <<: *securityWorkflowSymbol
    name: Dependency Review
    path: .github/workflows/dependency-review.yml
  - <<: *securityWorkflowSymbol
    name: security and nightly workflows stay wired to pinned actions and failure notification
    path: tools/ci/workflow-pattern-parity.test.mjs
    dddOwner: WorkflowPatternParityGuard
    cqRails:
      - ValidateWorkflow
  - <<: *securityWorkflowSymbol
    name: GH_ADVANCED_SECURITY_ENABLED
    path: docs/guides/testing-and-ci-capabilities.md
    dddOwner: GitHubAdvancedSecurityAvailability
tests:
  - pnpm test:ci-tools
  - pnpm lint:md:changed
  - pnpm docs:sync
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:changed
risks:
  - Private repositories without GHAS intentionally skip CodeQL and Dependency Review instead of reporting false CI failures.
```
