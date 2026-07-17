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
- Scheduled adapter-postgres smoke coverage uses the governed Turbo workspace
  wrapper for dependency graph builds, so nightly proof jobs share the same
  cacheable build orchestration as pull-request test lanes.
- `pnpm verify:changed` routes CI-tooling edits to adjacent `node --test`
  suites when available, so one-file agent iterations under `tools/ci` do not
  require the broad `pnpm test:ci-tools` contract run.
- Draft pull requests keep heavy Test Suite lanes closed, but `ready_for_review`
  re-runs the Test Suite detector so the affected test matrix is restored before
  merge; `converted_to_draft` re-evaluates the draft guard and cancels stale
  ready-PR work.
- Draft-aware quality, contracts, and security workflows share the same posture:
  drafts avoid non-reviewable runner spend, and `ready_for_review` reopens the
  merge gates automatically. `converted_to_draft` closes them again when a ready
  PR returns to draft.

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
  - As an engineer, scheduled adapter-postgres smoke coverage uses the same Turbo dependency build wrapper as PR test lanes.
  - As an AI agent, changed CI-tooling files can prove the local slice through direct adjacent tests instead of the full CI tools suite.
  - As an engineer, Planning DB migrations retain append-only applied identities, reject parallel ordinals, and report the next safe ordinal before integration.
  - As an engineer, moving a draft PR to ready reopens affected Test Suite coverage without restoring duplicate Code Quality tests.
  - As an engineer, draft-aware quality, contracts, and security gates reopen on ready-for-review without spending draft runners.
  - As an engineer, converting a ready PR back to draft cancels stale ready-PR gate work and records skipped draft posture.
  - As an engineer, files introduced by pull, merge, or branch checkout are Prettier-normalized even when editor save hooks did not run.
  - As an engineer, DB-first CI gates prepare the planning query store before running generated-doc and feature mechanization checks.
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
  - .github/actions/prepare-planning-db/action.yml
  - .github/workflows/adapter-postgres-integration-nightly.yml
  - .github/workflows/codeql.yml
  - .github/workflows/ci.yml
  - .github/workflows/contracts.yml
  - .github/workflows/dependency-review.yml
  - .github/workflows/pr-quality-gate.yml
  - .github/workflows/test.yml
  - .gitattributes
  - .husky/post-checkout
  - .husky/post-merge
  - .vscode/extensions.json
  - .vscode/settings.json
  - package.json
  - docs/architecture/components/ci-governance/engine-coverage-scope-gate-component.md
  - docs/guides/testing-and-ci-capabilities.md
  - docs/planning/closeouts/20260603-ci-draft-ready-workflow-gates-closeout.md
  - docs/planning/proposals/mandatory/governance-and-docs/ai-ci-preflight-automation-plan-20260602.md
  - docs/.manifest.json
  - docs/**/index.md
  - scripts/ai-preflight.cjs
  - scripts/ai-preflight.test.cjs
  - scripts/format-git-operation-changes.cjs
  - scripts/format-git-operation-changes.test.cjs
  - scripts/check-governance-changed-files.cjs
  - scripts/check-governance-changed-files.test.cjs
  - scripts/local-validation-plan.cjs
  - scripts/planning-db-migrate.cjs
  - scripts/planning-db-migrate.test.cjs
  - scripts/verify-changed.test.cjs
  - tools/planning-db/migrations/722_planning_db_migration_ordinal_uniqueness.sql
  - tools/planning-db/migrations/723_planning_db_migration_ordinal_mechanization.sql
  - tools/planning-db/migrations/724_planning_db_migration_ordinal_governance_alignment.sql
  - tools/planning-db/migrations/725_retire_parallel_planning_db_preflight_rail.sql
  - tools/ci/policy/workflow-scope.json
  - tools/ci/pr-check-triage.mjs
  - tools/ci/pr-check-triage.test.mjs
  - tools/ci/repository-change-scope.mjs
  - tools/ci/repository-change-scope.test.mjs
  - tools/ci/repository-command-catalog.mjs
  - tools/ci/repository-command-catalog.test.mjs
  - tools/ci/arc-check.mjs
  - tools/ci/doc-check.mjs
  - tools/ci/git-diff-files.mjs
  - tools/ci/git-diff-files.test.mjs
  - tools/ci/scope-config-git.test.mjs
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
  - name: FormatPostGitOperationChanges
    type: command
    dddOwner: DeveloperWorkflow
  - name: QueryPrCheckFirstFailure
    type: query
    dddOwner: CiCheckTriage
  - name: EmitWorkflowCapabilityScopes
    type: query
    dddOwner: Repository CI scope policy
  - name: PreparePlanningDbForCiGate
    type: command
    dddOwner: Repository CI governance baseline
  - name: RunFullCiCodeBaseline
    type: command
    dddOwner: RepositoryCiBaseline
domainObjects:
  - name: AgentPreflightPlan
    type: developer workflow command plan
    owner: Engineering / CI
  - name: WorkspaceFormatOnSavePolicy
    type: editor automation contract
    owner: Engineering / CI
  - name: PostGitFormatPlan
    type: developer workflow command plan
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
  - name: PlanningDbCiBootstrap
    type: CI DB-first bootstrap command
    owner: Engineering / CI
  - name: MigrationOrdinalPolicy
    type: migration identity policy
    owner: Repository CI governance baseline
  - name: MigrationOrdinalReport
    type: migration sequence read model
    owner: Repository CI governance baseline
  - name: RepositoryCiBaseline
    type: CI code baseline command
    owner: Engineering / CI
fowlerSignals:
  - Automation Gap when agents must manually discover and run formatting before validation.
  - Hidden Failure Mode when GitHub Actions reports a failure without assigning a runner or producing logs.
  - Duplicate Work when pre-push validation and push hooks repeat the same checks.
  - Duplicate Work when Test Suite jobs repeat semantic scope detection after the detector already computed the same read model.
  - Over-eager Resource Use when PR scope detectors fetch full repository history before deciding whether heavy lanes apply.
  - Duplicate Work when scheduled smoke jobs use raw package filters instead of the governed Turbo workspace wrapper.
  - Duplicate Work when a one-file CI-tooling edit pushes agents to rerun the full CI tools suite.
  - Hidden Coverage Gap when draft PR test lanes stay skipped after the PR becomes ready for review.
  - Hidden Coverage Gap when draft-skipped quality or security workflows do not reopen on ready-for-review.
  - Over-eager Resource Use when Contracts scope detection spends a runner for non-reviewable draft PRs.
  - Cancellation Gap when ready-to-draft transitions do not retrigger draft-aware workflows.
  - Shallow Checkout Fragility when PR merge refs cannot provide a local merge base for raw triple-dot diffs.
  - Automation Gap when files arrive through Git operations without editor save hooks firing.
  - Hidden Authority when CI-generated documentation or mechanization gates expect DB-first projections but the workflow does not prepare the planning query store.
  - Parallel Change when independently authored migrations reuse an ordinal or rename an already-applied identity.
architectureGuards:
  - node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/pr-check-triage.test.mjs tools/ci/repository-command-catalog.test.mjs tools/ci/repository-change-scope.test.mjs
  - node --test scripts/format-git-operation-changes.test.cjs
  - node --test tools/ci/workflow-pattern-parity.test.mjs
  - node --test tools/ci/turbo-workspace-task-contract.test.mjs
  - node --test scripts/planning-db-migrate.test.cjs
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - developer workflow and CI tooling only
completionGate:
  - pnpm governance:refresh
  - node --test scripts/ai-preflight.test.cjs scripts/verify-changed.test.cjs tools/ci/pr-check-triage.test.mjs tools/ci/repository-command-catalog.test.mjs tools/ci/repository-change-scope.test.mjs
  - node --test scripts/format-git-operation-changes.test.cjs
  - node --test tools/ci/workflow-pattern-parity.test.mjs
  - node --test tools/ci/turbo-workspace-task-contract.test.mjs
  - pnpm test:planning:db:migrations
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
  - id: nightly-adapter-postgres-turbo-wrapper
    redTest: node --test tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: Adapter Postgres Integration Nightly builds its dependency graph through a raw pnpm workspace filter instead of the governed Turbo wrapper.
    patchSurfaces:
      - .github/workflows/adapter-postgres-integration-nightly.yml
      - docs/guides/testing-and-ci-capabilities.md
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/workflow-pattern-parity.test.mjs
  - id: ci-tooling-changed-test-router
    redTest: node --test scripts/verify-changed.test.cjs
    expectedFailure: tools/ci source changes have no adjacent-test changed-slice route, so agents escalate to the broad CI tools suite for one-file edits.
    patchSurfaces:
      - scripts/local-validation-plan.cjs
      - scripts/verify-changed.test.cjs
      - docs/guides/testing-and-ci-capabilities.md
    greenTest: node --test scripts/verify-changed.test.cjs
  - id: draft-pr-ready-review-test-coverage
    redTest: node --test tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: Test Suite skips draft PRs but does not listen for ready_for_review, so affected package test coverage may not reopen when the PR leaves draft.
    patchSurfaces:
      - .github/workflows/test.yml
      - docs/guides/testing-and-ci-capabilities.md
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/workflow-pattern-parity.test.mjs
  - id: draft-aware-quality-security-gates
    redTest: node --test tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: PR Quality, CodeQL, Dependency Review, and Contracts do not share the draft reviewability workflow posture, so drafts either spend runners, skipped gates may not reopen on ready_for_review, or ready-PR runs may not cancel on converted_to_draft.
    patchSurfaces:
      - .github/workflows/codeql.yml
      - .github/workflows/contracts.yml
      - .github/workflows/dependency-review.yml
      - .github/workflows/pr-quality-gate.yml
      - docs/guides/testing-and-ci-capabilities.md
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/workflow-pattern-parity.test.mjs
  - id: shallow-merge-arc-diff
    redTest: node --test tools/ci/git-diff-files.test.mjs
    expectedFailure: ARC and ARC-doc changed-file checks use raw triple-dot diffs, so a shallow pull-request merge checkout can fail with no merge base.
    patchSurfaces:
      - tools/ci/git-diff-files.mjs
      - tools/ci/git-diff-files.test.mjs
      - tools/ci/arc-check.mjs
      - tools/ci/doc-check.mjs
      - scripts/check-governance-changed-files.cjs
      - scripts/check-governance-changed-files.test.cjs
      - docs/guides/testing-and-ci-capabilities.md
    greenTest: node --test tools/ci/git-diff-files.test.mjs scripts/check-governance-changed-files.test.cjs
  - id: post-git-prettier-format
    redTest: node --test scripts/format-git-operation-changes.test.cjs
    expectedFailure: files introduced by pull, merge, or branch checkout are not formatted unless an editor save hook fires.
    patchSurfaces:
      - .husky/post-checkout
      - .husky/post-merge
      - .gitattributes
      - package.json
      - scripts/format-git-operation-changes.cjs
      - scripts/format-git-operation-changes.test.cjs
      - docs/guides/testing-and-ci-capabilities.md
    greenTest: node --test scripts/format-git-operation-changes.test.cjs
  - id: db-first-main-ci-planning-db-prep
    redTest: node --test tools/ci/workflow-pattern-parity.test.mjs
    expectedFailure: main full CI and PR quality feature mechanization gates run DB-first checks without preparing the planning query store.
    patchSurfaces:
      - .github/actions/prepare-planning-db/action.yml
      - .github/workflows/ci.yml
      - .github/workflows/pr-quality-gate.yml
      - tools/ci/workflow-pattern-parity.test.mjs
    greenTest: node --test tools/ci/workflow-pattern-parity.test.mjs
  - id: main-ci-turbo-test-baseline
    redTest: node --test tools/ci/turbo-workspace-task-contract.test.mjs
    expectedFailure: main full CI runs package tests through pnpm recursive execution while DVT_CI disables package pretest dependency builds, so clean Linux runners miss upstream workspace dist exports.
    patchSurfaces:
      - package.json
      - docs/guides/testing-and-ci-capabilities.md
      - tools/ci/turbo-workspace-task-contract.test.mjs
    greenTest: node --test tools/ci/turbo-workspace-task-contract.test.mjs
  - id: planning-db-migration-ordinal-identity
    redTest: node --test --test-name-pattern "migration files sort|applied strict migration identities|migration runner rejects" scripts/planning-db-migrate.test.cjs
    expectedFailure: strict migration filenames can be renamed after application and four-digit ordinals sort before their predecessors.
    patchSurfaces:
      - scripts/planning-db-migrate.cjs
      - scripts/planning-db-migrate.test.cjs
      - tools/planning-db/migrations/722_planning_db_migration_ordinal_uniqueness.sql
      - tools/planning-db/migrations/725_retire_parallel_planning_db_preflight_rail.sql
    greenTest: pnpm test:planning:db:migrations
symbols:
  - name: ci:code
    path: package.json
    dddOwner: RepositoryCiBaseline
    cqRails: [RunFullCiCodeBaseline]
    fowlerSignals: [Duplicate Work, Hidden Coverage Gap]
    architectureGuard: node --test tools/ci/turbo-workspace-task-contract.test.mjs
    cypressCoverage: N/A - root CI package test baseline
    unitTests:
      - tools/ci/turbo-workspace-task-contract.test.mjs
  - name: prepare-planning-db
    path: .github/actions/prepare-planning-db/action.yml
    dddOwner: PlanningDbCiBootstrap
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Hidden Authority, Automation Gap]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI governance action
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: migrationOrdinalPolicy
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Single Source of Truth, Fail Closed]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: buildMigrationFileNameFingerprint
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Pure Function, Append Only Identity]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: parseMigrationOrdinal
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Pure Function]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: compareMigrationFileNamesByOrdinal
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Pure Function, Deterministic Ordering]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: analyzeMigrationOrdinals
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Query Model, Pure Function]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: formatMigrationOrdinal
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Pure Function]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: assertMigrationOrdinalPolicy
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Policy, Fail Closed]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: migrationOrdinalPolicyForDirectory
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Policy]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: assertAppliedMigrationIdentities
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Policy, Fail Closed, Append Only Identity]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: readMigrationFiles
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Repository, Deterministic Ordering]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
  - name: runMigrations
    path: scripts/planning-db-migrate.cjs
    dddOwner: Repository CI governance baseline
    cqRails: [PreparePlanningDbForCiGate]
    fowlerSignals: [Service Layer, Unit of Work, Fail Closed]
    architectureGuard: scripts/planning-db-migrate.test.cjs
    cypressCoverage: N/A - repository migration policy
    unitTests:
      - scripts/planning-db-migrate.test.cjs
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
  - name: DRAFT_AWARE_PR_TYPES
    path: tools/ci/workflow-pattern-parity.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use, Cancellation Gap]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI workflow architecture test
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: listChangedFilesBetween
    path: tools/ci/git-diff-files.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: normalizePath
    path: tools/ci/git-diff-files.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: parseChangedFiles
    path: tools/ci/git-diff-files.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: errorText
    path: tools/ci/git-diff-files.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: isNoMergeBaseError
    path: tools/ci/git-diff-files.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: defaultRunGitDiff
    path: tools/ci/git-diff-files.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: noMergeBaseError
    path: tools/ci/git-diff-files.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - CI changed-file utility test
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: changedFiles
    path: tools/ci/arc-check.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - ARC policy evaluator
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: changed
    path: tools/ci/doc-check.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test tools/ci/git-diff-files.test.mjs
    cypressCoverage: N/A - ARC docs validator
    unitTests:
      - tools/ci/git-diff-files.test.mjs
  - name: readNameStatusRangeDiff
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - governed changed-files gate
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: gitErrorText
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - governed changed-files gate
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
  - name: isNoMergeBaseError
    path: scripts/check-governance-changed-files.cjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Shallow Checkout Fragility]
    architectureGuard: node --test scripts/check-governance-changed-files.test.cjs
    cypressCoverage: N/A - governed changed-files gate
    unitTests:
      - scripts/check-governance-changed-files.test.cjs
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
  - name: FEATURE_MECHANIZATION_WORKFLOW_POLICY_INPUTS
    path: tools/ci/repository-change-scope.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use, Hidden Coverage Gap]
    architectureGuard: node --test tools/ci/repository-change-scope.test.mjs
    cypressCoverage: N/A - CI scope policy constant
    unitTests:
      - tools/ci/repository-change-scope.test.mjs
  - name: scope diff consumers use shallow checkout instead of full PR history
    path: tools/ci/workflow-pattern-parity.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/workflow-pattern-parity.test.mjs
    cypressCoverage: N/A - CI workflow architecture test
    unitTests:
      - tools/ci/workflow-pattern-parity.test.mjs
  - name: classifies feature-mechanized CI composite actions without workspace fan-out
    path: tools/ci/repository-change-scope.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use]
    architectureGuard: node --test tools/ci/repository-change-scope.test.mjs
    cypressCoverage: N/A - CI scope classification test
    unitTests:
      - tools/ci/repository-change-scope.test.mjs
  - name: routes feature-mechanized action-only changes through DB-backed mechanization checks
    path: tools/ci/repository-change-scope.test.mjs
    dddOwner: Repository CI scope policy
    cqRails: [EmitWorkflowCapabilityScopes]
    fowlerSignals: [Over-eager Resource Use, Hidden Coverage Gap]
    architectureGuard: node --test tools/ci/repository-change-scope.test.mjs
    cypressCoverage: N/A - CI scope classification test
    unitTests:
      - tools/ci/repository-change-scope.test.mjs
  - name: ciToolingTestPathFor
    path: scripts/local-validation-plan.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Duplicate Work]
    architectureGuard: node --test scripts/verify-changed.test.cjs
    cypressCoverage: N/A - local validation planner
    unitTests:
      - scripts/verify-changed.test.cjs
  - name: ciToolingTestSteps
    path: scripts/local-validation-plan.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Duplicate Work]
    architectureGuard: node --test scripts/verify-changed.test.cjs
    cypressCoverage: N/A - local validation planner
    unitTests:
      - scripts/verify-changed.test.cjs
  - name: fs
    path: scripts/local-validation-plan.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [RunAgentPreflight]
    fowlerSignals: [Duplicate Work]
    architectureGuard: node --test scripts/verify-changed.test.cjs
    cypressCoverage: N/A - local validation planner adjacent-test lookup
    unitTests:
      - scripts/verify-changed.test.cjs
  - name: DEFAULT_BATCH_SIZE
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: chunk
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: formatGitOperationChanges
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: fs
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: ignoredPrettierPaths
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: isPrettierCandidate
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: isSkippedByEnvironment
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: listGitOperationChangedFiles
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: main
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: parseArgs
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: path
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: prettierPattern
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: repoRoot
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: resolveCliPath
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: resolvePackageBin
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: resolvePrettierCli
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: runPrettierOnFiles
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: selectExistingPrettierFiles
    path: scripts/format-git-operation-changes.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - local Git hook automation
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: assert
    path: scripts/format-git-operation-changes.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - Node test assertion dependency
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
  - name: test
    path: scripts/format-git-operation-changes.test.cjs
    dddOwner: DeveloperWorkflow
    cqRails: [FormatPostGitOperationChanges]
    fowlerSignals: [Automation Gap]
    architectureGuard: node --test scripts/format-git-operation-changes.test.cjs
    cypressCoverage: N/A - Node test harness dependency
    unitTests:
      - scripts/format-git-operation-changes.test.cjs
```
