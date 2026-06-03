---
title: Governance Refresh DB Import Order Plan
status: Implemented
owner: Governance / CI
last_reviewed: 2026-05-10
planning_type: mandatory
---

# Governance Refresh DB Import Order Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:test-driven-development for code steps. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Make `pnpm governance:refresh` import the governance query store after
DB-backed governance reports are regenerated, before running
`governance:db:check`.

**Architecture:** The refresh command is a generated-surface pipeline. Any stage
that writes governance report source files can change the source hash that
`governance:db:check` compares against, so the governance DB import must happen
after those reports stabilize and before governance DB checks.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `scripts/governance-refresh.cjs`
- `scripts/governance-refresh.test.cjs`

## Feature Mechanization

```feature-mechanization
version: 1
featureId: GOVERNANCE-REFRESH-DB-IMPORT-ORDER-20260510
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/governance-refresh-db-import-order-plan-20260510.md
componentGuides:
  - docs/planning/proposals/mandatory/governance-and-docs/governance-refresh-db-import-order-plan-20260510.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/governance-refresh-db-import-order-plan-20260510.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/governance-and-docs/governance-refresh-db-import-order-plan-20260510.md
  - scripts/governance-refresh.cjs
  - scripts/governance-refresh.test.cjs
  - scripts/planning-db-import.cjs
  - scripts/planning-db-import.test.cjs
  - docs/planning/status/**
  - docs/.manifest.json
  - docs/**/index.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/contracts/**
commandQueryRails:
  - name: GovernanceRefresh
    type: command
    dddOwner: Governance generated-surface pipeline
domainObjects:
  - name: Governance refresh stages
    type: workflow
    owner: Governance / CI
fowlerSignals:
  - Temporal Coupling between generated reports and governance DB checks
  - Pipeline Drift from missing post-generation DB import
architectureGuards:
  - node --test scripts/governance-refresh.test.cjs
  - node --test scripts/planning-db-import.test.cjs
cypressFlows:
  - N/A - governance command pipeline only
completionGate:
  - node --test scripts/governance-refresh.test.cjs
  - node --test scripts/planning-db-import.test.cjs
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: governance-db-import-before-check
    redTest: node --test scripts/governance-refresh.test.cjs
    expectedFailure: database stages do not include governance:db:import before governance:db:check.
    patchSurfaces:
      - scripts/governance-refresh.test.cjs
      - scripts/governance-refresh.cjs
    greenTest: node --test scripts/governance-refresh.test.cjs
  - id: governance-import-clears-repopulated-tables
    redTest: node --test scripts/planning-db-import.test.cjs
    expectedFailure: governance import deletes only governance_sources and can leave stale coverage or remediation rows in older local databases.
    patchSurfaces:
      - scripts/planning-db-import.test.cjs
      - scripts/planning-db-import.cjs
    greenTest: node --test scripts/planning-db-import.test.cjs
  - id: generated-write-settle-before-db-validation
    redTest: node --test scripts/governance-refresh.test.cjs
    expectedFailure: asynchronous generated writes can land after the DB import and make governance:db:check observe stale coverage rows.
    patchSurfaces:
      - scripts/governance-refresh.test.cjs
      - scripts/governance-refresh.cjs
    greenTest: node --test scripts/governance-refresh.test.cjs
symbols:
  - name: buildRefreshStages
    path: scripts/governance-refresh.cjs
    dddOwner: Governance generated-surface pipeline
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Make governance DB import an explicit post-generation stage
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: governanceImportDeleteTables
    path: scripts/planning-db-import.cjs
    dddOwner: Governance query-store import
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Make governance import idempotent across repeated generated-surface refreshes
    architectureGuard: node --test scripts/planning-db-import.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-import.test.cjs
  - name: sleepMs
    path: scripts/governance-refresh.cjs
    dddOwner: Governance generated-surface pipeline
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Wait for generated write fingerprints to settle before DB validation
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: waitForStableWorktreeFingerprint
    path: scripts/governance-refresh.cjs
    dddOwner: Governance generated-surface pipeline
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Wait for generated write fingerprints to settle before DB validation
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: clearGovernanceSnapshotTables
    path: scripts/planning-db-import.cjs
    dddOwner: Governance query-store import
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Clear repopulated governance read-model tables explicitly instead of relying on cascade behavior
    architectureGuard: node --test scripts/planning-db-import.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-import.test.cjs
```

## User Stories

- As a contributor, I can run `pnpm governance:refresh` once after docs/code
  changes and expect DB-backed generated reports and governance DB checks to
  agree.
- As CI, I reject stale governance DB rows after generated reports change.
- As an agent, I do not need an undocumented manual `governance:db:import`
  workaround after the refresh command.

## Implementation Steps

- [x] Add a test expectation that `governance:db:import` runs before
      `governance:db:check`.
- [x] Add the missing database stage to `governance:refresh`.
- [x] Make governance imports clear every repopulated governance table before
      inserting current rows.
- [x] Run governance refresh and prepush closeout.
