---
title: DB-First Governance Refresh Write Rail Plan
status: Implementing
owner: Governance / CI
last_reviewed: 2026-06-11
planning_type: mandatory
---

# DB-First Governance Refresh Write Rail Plan

## Think-First Analysis

### Problem Summary

`pnpm governance:refresh` currently coordinates generated documentation,
Planning DB imports, governance DB imports, DB checks, exported snapshots, and
DB-backed report generation in one opaque command. Operators can see console
logs, but the command itself does not write an authoritative run ledger before
it mutates generated surfaces.

### Root Cause

The workflow grew as a script pipeline. The script owns orchestration and
stabilization, while the Planning DB owns other operational state. That creates
hidden authority: run state and stage outcomes are transient console output
instead of DB facts.

### Constraints And Invariants

- ADR-0055 makes Planning DB the canonical operational source.
- `governance:refresh` must not be run as a no-op substitute for real work.
- Generated files remain snapshots; they must not become command authority.
- Existing rails `GovernanceRefresh` and `RefreshGovernanceDerivedSurfaces`
  must be reused.
- The first slice must not change product code, app packages, contracts, or
  runtime adapters.

### Selected Option

Add a DB-first governance refresh run ledger:

- record a refresh run as accepted in Planning DB before generation stages run;
- record final run state and planned stage rows after completion or failure;
- expose the ledger through a Planning DB query;
- keep `governance:refresh` as the workflow command while moving run facts to a
  DB-owned write rail.

### Rejected Alternatives

- Running `governance:refresh` more often: rejected because it hides the root
  issue and increases cost.
- Rewriting all generated-surface writers in one slice: rejected as too wide.
- Creating a new command synonym for refresh: rejected because the existing
  `GovernanceRefresh` rail already owns the workflow intent.

## Fowler Opportunity Matrix

| Scenario                                | Opportunity         | Fowler pattern                | DDD owner                  | Command/query rail           | Implementation surfaces                                                | Unit or package test                               | Architecture test                                  | User-flow test | Out of scope                           |
| --------------------------------------- | ------------------- | ----------------------------- | -------------------------- | ---------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------- | -------------- | -------------------------------------- |
| Operator runs `pnpm governance:refresh` | Hidden authority    | Unit of Work + Audit Log      | GovernanceRefreshWorkflow  | `GovernanceRefresh`          | `scripts/governance-refresh.cjs`, Planning DB migration, writer module | `node --test scripts/governance-refresh.test.cjs`  | `node --test scripts/planning-db-migrate.test.cjs` | N/A            | Replacing every generator              |
| Operator queries recent refresh state   | Missing read model  | Read Model                    | GovernanceRefreshRunLedger | `QueryGovernanceRefreshRuns` | `scripts/planning-db-query.cjs`, query module                          | `node --test scripts/planning-db-query.test.cjs`   | migration test                                     | N/A            | Rich UI/report panel                   |
| Agent executes command through DB rail  | Duplicate semantics | Service Layer command adapter | GovernanceRefreshWorkflow  | `GovernanceRefresh`          | `scripts/planning-db-operate.cjs`, writer module                       | `node --test scripts/planning-db-operate.test.cjs` | migration test                                     | N/A            | Full refresh execution through operate |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: D-DBFIRST-GOV-REFRESH-WRITE-RAIL-1
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/dbfirst-governance-refresh-write-rail-plan-20260611.md
componentGuides:
  - docs/planning/proposals/mandatory/governance-and-docs/dbfirst-governance-refresh-write-rail-plan-20260611.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/dbfirst-governance-refresh-write-rail-plan-20260611.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/governance-and-docs/dbfirst-governance-refresh-write-rail-plan-20260611.md
  - scripts/governance-refresh.cjs
  - scripts/governance-refresh.test.cjs
  - scripts/planning-db-operate.cjs
  - scripts/planning-db-operate.test.cjs
  - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - scripts/planning-db/commands/governance-refresh-command.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - scripts/planning-db/queries/governance-refresh-run-query.cjs
  - scripts/planning-db/governance-refresh-write-rail.cjs
  - tools/planning-db/migrations/080_governance_refresh_run_ledger.sql
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/contracts/**
commandQueryRails:
  - name: GovernanceRefresh
    type: command
    dddOwner: GovernanceRefreshWorkflow
  - name: QueryGovernanceRefreshRuns
    type: query
    dddOwner: GovernanceRefreshRunLedger
domainObjects:
  - name: GovernanceRefreshRun
    type: aggregate
    owner: Governance / CI
  - name: GovernanceRefreshStageRun
    type: entity
    owner: Governance / CI
  - name: GovernanceRefreshRunLedger
    type: read_model
    owner: Governance / CI
fowlerSignals:
  - Hidden authority in console-only refresh state
  - Responsibility overload in generated-surface pipeline
  - Duplicate semantics between generated snapshots and DB operational state
architectureGuards:
  - node --test scripts/governance-refresh.test.cjs
  - node --test scripts/planning-db-operate.test.cjs
  - node --test scripts/planning-db-query.test.cjs
  - node --test scripts/planning-db-migrate.test.cjs
cypressFlows:
  - N/A - governance CLI/DB rail only
completionGate:
  - node --test scripts/governance-refresh.test.cjs scripts/planning-db-operate.test.cjs scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:changed
  - pnpm verify:prepush
redGreenCycles:
  - id: refresh-run-recorded-before-generation
    redTest: node --test scripts/governance-refresh.test.cjs
    expectedFailure: governance refresh starts generation before writing an accepted run record.
    patchSurfaces:
      - scripts/governance-refresh.test.cjs
      - scripts/governance-refresh.cjs
      - scripts/planning-db/governance-refresh-write-rail.cjs
    greenTest: node --test scripts/governance-refresh.test.cjs
  - id: refresh-run-ledger-operation
    redTest: node --test scripts/planning-db-operate.test.cjs
    expectedFailure: planning DB operate has no governance-refresh record-run command.
    patchSurfaces:
      - scripts/planning-db-operate.test.cjs
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
      - scripts/planning-db-operate.cjs
      - scripts/planning-db/commands/governance-refresh-command.cjs
      - scripts/planning-db/governance-refresh-write-rail.cjs
    greenTest: node --test scripts/planning-db-operate.test.cjs
  - id: refresh-run-query
    redTest: node --test scripts/planning-db-query.test.cjs
    expectedFailure: planning DB query has no governance-refresh-runs read model.
    patchSurfaces:
      - scripts/planning-db-query.test.cjs
      - scripts/planning-db-query.cjs
      - scripts/planning-db/queries/governance-refresh-run-query.cjs
    greenTest: node --test scripts/planning-db-query.test.cjs
symbols:
  - name: buildGovernanceRefreshRunRecordCommand
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Build a DB command payload instead of leaking script state
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: defaultRefreshActor
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Preserve operator identity in the DB ledger
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: defaultRefreshRunId
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Give each refresh execution a stable DB identity
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: readGovernanceRefreshSourceContentSha256
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Hash the command source used for the run ledger
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: recordGovernanceRefreshRun
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Write run state through the Planning DB command rail
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: runGovernanceRefreshCommand
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Write accepted run state before generated-surface side effects
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: toIsoLike
    path: scripts/governance-refresh.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Normalize run timestamps before DB writes
    architectureGuard: node --test scripts/governance-refresh.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/governance-refresh.test.cjs
  - name: parseGovernanceRefreshCommand
    path: scripts/planning-db-operate.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Bind the focused command parser into the operate router
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: parseGovernanceRefreshCommand
    path: scripts/planning-db/commands/governance-refresh-command.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Keep operator writes behind a named command rail
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: validateGovernanceRefreshRunState
    path: scripts/planning-db/commands/governance-refresh-command.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Reject invalid run-state writes before DB mutation
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: createGovernanceRefreshCommandParser
    path: scripts/planning-db/commands/governance-refresh-command.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Keep CLI parsing for the rail outside the monolithic operate entrypoint
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: allowedRunStates
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Define the published run-state language for the rail
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: applyGovernanceRefreshRunRecordOperation
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Execute run recording as one audited unit of work
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: assertGovernanceRefreshRunIdempotentReplayMatches
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Prevent idempotency keys from hiding divergent writes
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: assertSha256
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Guard source-hash integrity before persistence
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: buildGovernanceRefreshStageRunRows
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Normalize stage logs into DB rows
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: buildOperationPayload
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Keep audit payloads deterministic
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: buildStageRow
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Materialize stage facts as DB entities
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: buildStageRunId
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Give each stage row a deterministic identity
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: crypto
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Support deterministic hashes for operation identity
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: databaseUrl
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Use the existing Planning DB connection policy
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: defaultCommandName
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Publish the canonical command name in DB facts
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: defaultGovernanceRefreshRunIdempotencyKey
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Generate replay-safe operation keys
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: normalizeExistingRun
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Keep revision checks explicit
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: normalizeOptionalText
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Normalize nullable command fields before persistence
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: parseNonNegativeInteger
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Reject invalid counter values before DB mutation
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: parsePositiveInteger
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Reject invalid max-pass values before DB mutation
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: planGovernanceRefreshRunRecordOperation
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Plan a deterministic unit of work before writing
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: readExistingGovernanceRefreshRunOperation
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Detect idempotent replays from DB audit facts
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: readGovernanceRefreshRun
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Read current run revision before mutation
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: stableHash
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Derive stable identities without filesystem decisions
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: stageScriptWasObserved
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Convert observed stage execution into explicit DB state
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: toIso
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Normalize timestamps for deterministic writes
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: toJson
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Persist JSON payloads through typed DB columns
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: validateRunState
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Keep run status language finite
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: writePlannedGovernanceRefreshRunRecordOperation
    path: scripts/planning-db/governance-refresh-write-rail.cjs
    dddOwner: GovernanceRefreshWorkflow
    cqRails:
      - GovernanceRefresh
    fowlerSignals:
      - Commit planned run and stage facts atomically
    architectureGuard: node --test scripts/planning-db-operate.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-operate-tests/governance-refresh.test.cjs
  - name: createGovernanceRefreshRunReadModelComponent
    path: scripts/planning-db/queries/governance-refresh-run-query.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - QueryGovernanceRefreshRuns
    fowlerSignals:
      - Keep refresh state reads in a focused query component
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-query.test.cjs
  - name: readGovernanceRefreshRunRows
    path: scripts/planning-db/queries/governance-refresh-run-query.cjs
    dddOwner: GovernanceRefreshRunLedger
    cqRails:
      - QueryGovernanceRefreshRuns
    fowlerSignals:
      - Query DB ledger instead of parsing logs
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-query.test.cjs
```

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add governance refresh run/stage ledger tables and views.
- Add a small DB writer module.
- Wire `governance:refresh` to record accepted/final run state.
- Add `planning:db:operate governance-refresh record-run`.
- Add `planning:db:query governance-refresh-runs`.

Out of scope:

- Rewriting each generator to write directly to DB.
- Removing generated files.
- Running full `governance:refresh` as a development shortcut.
