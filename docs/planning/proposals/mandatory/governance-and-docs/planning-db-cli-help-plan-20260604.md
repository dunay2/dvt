---
title: Planning DB CLI help plan
status: Proposed
date: 2026-06-04
last_reviewed: 2026-06-04
owners:
  - docs
planning_type: proposal
lane: G
---

# Planning DB CLI Help Plan

## Think-First Analysis

Problem summary: planning DB `--help` requests were parsed as normal commands
or query flags, so operators received validation errors instead of help.

Root cause: help detection was not modeled at the planning DB CLI adapter
boundary. The parsers resolved operations and required flag values before
classifying help as a non-DB read.

Selected option: classify help at parser entry, return a non-DB help read
model, and let `main` print it without opening a database connection.

Rejected alternatives:

- Add ad hoc `--help` branches to each command parser. Rejected because it
  duplicates CLI policy across command-specific parsing.
- Change only the package script wrapper. Rejected because direct node
  execution is also a supported adapter path for tests and diagnostics.

## Fowler Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                | Opportunity          | Fowler pattern                   | DDD owner                 | Command/query rail           | Implementation surfaces                                   | Unit or package test                               | Architecture test | Out of scope                    |
| --------------------------------------- | -------------------- | -------------------------------- | ------------------------- | ---------------------------- | --------------------------------------------------------- | -------------------------------------------------- | ----------------- | ------------------------------- |
| Planning DB operation help parses work. | Boundary drift       | Command Gateway                  | Planning DB CLI adapter   | `RunPlanningDbOperationHelp` | `planning-db-operate.cjs`, `planning-db-operate.test.cjs` | `node --test scripts/planning-db-operate.test.cjs` | N/A               | Full manual-page generation     |
| Planning DB query help requires values. | Primitive obsession  | Replace Flag Parsing with Policy | Planning DB query adapter | `RunPlanningDbQueryHelp`     | `planning-db-query.cjs`, `planning-db-query.test.cjs`     | `node --test scripts/planning-db-query.test.cjs`   | N/A               | Changing query filter semantics |
| Help tests could freeze copy.           | Test-only confidence | Semantic Fitness Function        | Planning DB CLI tests     | both help rails              | parser tests                                              | semantic assertions                                | N/A               | Snapshot testing help output    |

<!-- markdownlint-enable MD060 -->

```feature-mechanization
version: 1
featureId: PLANNING-DB-CLI-HELP-20260604
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/planning-db-cli-help-plan-20260604.md
componentGuides:
  - docs/planning/status/db-surface-inventory.md
userStories:
  - docs/planning/proposals/mandatory/governance-and-docs/planning-db-cli-help-plan-20260604.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
allowedImplementationSurfaces:
  - scripts/planning-db-operate.cjs
  - scripts/planning-db-operate.test.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - docs/planning/proposals/mandatory/governance-and-docs/planning-db-cli-help-plan-20260604.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: RunPlanningDbOperationHelp
    type: query
    dddOwner: PlanningDbOperationCliHelp
  - name: RunPlanningDbQueryHelp
    type: query
    dddOwner: PlanningDbQueryCliHelp
domainObjects:
  - name: PlanningDbOperationCliHelp
    type: CLI adapter read model
    owner: Planning DB command adapter
  - name: PlanningDbQueryCliHelp
    type: CLI adapter read model
    owner: Planning DB query adapter
fowlerSignals:
  - Boundary drift
  - Primitive obsession
  - Test-only confidence
architectureGuards:
  - node --test scripts/planning-db-operate.test.cjs
  - node --test scripts/planning-db-query.test.cjs
cypressFlows:
  - N/A - CLI-only behavior
completionGate:
  - node --test scripts/planning-db-operate.test.cjs
  - node --test scripts/planning-db-query.test.cjs
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: planning-db-operate-help
    redTest: node --test scripts/planning-db-operate.test.cjs
    expectedFailure: operate --help is parsed as an unknown operation.
    patchSurfaces:
      - scripts/planning-db-operate.cjs
      - scripts/planning-db-operate.test.cjs
    greenTest: node --test scripts/planning-db-operate.test.cjs
  - id: planning-db-query-help
    redTest: node --test scripts/planning-db-query.test.cjs
    expectedFailure: query --help is parsed as a missing flag value.
    patchSurfaces:
      - scripts/planning-db-query.cjs
      - scripts/planning-db-query.test.cjs
    greenTest: node --test scripts/planning-db-query.test.cjs
symbols:
  - { name: operationHelp, path: scripts/planning-db-operate.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Primitive obsession], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: isHelpCommand, path: scripts/planning-db-operate.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Replace Flag Parsing with Policy], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: isHelpFlag, path: scripts/planning-db-operate.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Replace Flag Parsing with Policy], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: unknownOperationMessage, path: scripts/planning-db-operate.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Command Gateway], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: resolveOperateHelpRequest, path: scripts/planning-db-operate.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Replace Flag Parsing with Policy], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: buildPlanningDbOperateHelpText, path: scripts/planning-db-operate.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Command Gateway], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: path, path: scripts/planning-db-operate.test.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Semantic Fitness Function], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: runPlanningDbOperateCli, path: scripts/planning-db-operate.test.cjs, dddOwner: PlanningDbOperationCliHelp, cqRails: [RunPlanningDbOperationHelp], fowlerSignals: [Semantic Fitness Function], architectureGuard: node --test scripts/planning-db-operate.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-operate.test.cjs] }
  - { name: isHelpCommand, path: scripts/planning-db-query.cjs, dddOwner: PlanningDbQueryCliHelp, cqRails: [RunPlanningDbQueryHelp], fowlerSignals: [Replace Flag Parsing with Policy], architectureGuard: node --test scripts/planning-db-query.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-query.test.cjs] }
  - { name: isHelpFlag, path: scripts/planning-db-query.cjs, dddOwner: PlanningDbQueryCliHelp, cqRails: [RunPlanningDbQueryHelp], fowlerSignals: [Replace Flag Parsing with Policy], architectureGuard: node --test scripts/planning-db-query.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-query.test.cjs] }
  - { name: resolveQueryHelpRequest, path: scripts/planning-db-query.cjs, dddOwner: PlanningDbQueryCliHelp, cqRails: [RunPlanningDbQueryHelp], fowlerSignals: [Replace Flag Parsing with Policy], architectureGuard: node --test scripts/planning-db-query.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-query.test.cjs] }
  - { name: buildPlanningDbQueryHelpText, path: scripts/planning-db-query.cjs, dddOwner: PlanningDbQueryCliHelp, cqRails: [RunPlanningDbQueryHelp], fowlerSignals: [Command Gateway], architectureGuard: node --test scripts/planning-db-query.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-query.test.cjs] }
  - { name: path, path: scripts/planning-db-query.test.cjs, dddOwner: PlanningDbQueryCliHelp, cqRails: [RunPlanningDbQueryHelp], fowlerSignals: [Semantic Fitness Function], architectureGuard: node --test scripts/planning-db-query.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-query.test.cjs] }
  - { name: runPlanningDbQueryCli, path: scripts/planning-db-query.test.cjs, dddOwner: PlanningDbQueryCliHelp, cqRails: [RunPlanningDbQueryHelp], fowlerSignals: [Semantic Fitness Function], architectureGuard: node --test scripts/planning-db-query.test.cjs, cypressCoverage: N/A, unitTests: [node --test scripts/planning-db-query.test.cjs] }
```
