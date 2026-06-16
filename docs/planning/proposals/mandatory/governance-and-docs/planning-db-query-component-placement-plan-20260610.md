---
title: Planning DB Query Component Placement Plan
status: Accepted
owner: Architecture / Planning DB / CI
last_reviewed: 2026-06-10
planning_type: mandatory
lane: D
---

# Planning DB Query Component Placement Plan

## Purpose

Normalize Planning DB read-model query components under
`scripts/planning-db/queries/` so DB-first operator queries are discoverable by
component type instead of by historical root-level script placement.

## Fowler Analysis

| scenario                                                           | opportunity         | Fowler pattern                | DDD owner                                 | command/query rail               | implementation surfaces                                                                                    | unit or package test                             | architecture test                                | user-flow test               | out of scope                |
| ------------------------------------------------------------------ | ------------------- | ----------------------------- | ----------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ | ---------------------------- | --------------------------- |
| Planning DB read-model query modules live in two script locations. | Duplicate semantics | Move Method / Module Boundary | Planning DB query component layout policy | Existing planning DB query rails | `scripts/planning-db/queries/*.cjs`, `scripts/planning-db-query.cjs`, `scripts/planning-db-query.test.cjs` | `node --test scripts/planning-db-query.test.cjs` | `pnpm docs:feature-mechanization:implementation` | N/A - CLI governance surface | Renaming query CLI commands |

```feature-mechanization
version: 1
featureId: PLANNING-DB-QUERY-COMPONENT-PLACEMENT-20260610
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/planning-db-query-component-placement-plan-20260610.md
componentGuides:
  - docs/architecture/command-query-rail-governance.md
userStories:
  - docs/architecture/components/ci-governance/component-engineering-record-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/adr/adr-0055-planning-db-canonical-operational-source.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/guides/ai-work-protocol.md
allowedImplementationSurfaces:
  - docs/generated-docs-policy.json
  - docs/planning/closeouts/20260604-knowledge-intake-dbfirst-retirement-closeout.md
  - docs/planning/proposals/mandatory/governance-and-docs/planning-db-query-component-placement-plan-20260610.md
  - docs/planning/proposals/mandatory/governance-and-docs/command-query-rail-catalog-db-first-plan-20260602.md
  - docs/planning/proposals/mandatory/governance-and-docs/feature-mechanization-db-first-read-model-plan-20260605.md
  - docs/planning/proposals/mandatory/governance-and-docs/knowledge-intake-dbfirst-retirement-plan-20260604.md
  - docs/planning/proposals/mandatory/governance-and-docs/knowledge-intake-generated-literature-plan-20260604.md
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - scripts/planning-db/queries/command-query-rail-query.cjs
  - scripts/planning-db/queries/feature-mechanization-query.cjs
  - scripts/planning-db/queries/knowledge-intake-retirement-query.cjs
  - scripts/planning-db-query-tests/helpers.cjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/contracts/**
  - tools/planning-db/migrations/**
commandQueryRails:
  - name: QueryCommandQueryRailCatalog
    type: query
    dddOwner: CommandQueryRailCatalogReadModel
  - name: AssessCreationIntentQuery
    type: query
    dddOwner: CreationIntentAssessment
  - name: ListFeatureMechanizationFeatures
    type: query
    dddOwner: FeatureMechanizationOperatorReadModel
  - name: ListFeatureMechanizationSymbols
    type: query
    dddOwner: FeatureMechanizationOperatorReadModel
  - name: QueryKnowledgeIntakeRetirement
    type: query
    dddOwner: KnowledgeIntakeRetirementReadModel
domainObjects:
  - name: PlanningDbQueryComponentLayoutPolicy
    type: policy
    owner: Architecture / Planning DB / CI
  - name: CommandQueryRailCatalogReadModel
    type: read model
    owner: Planning DB governance read model
  - name: FeatureMechanizationOperatorReadModel
    type: read model
    owner: Planning DB governance read model
  - name: KnowledgeIntakeRetirementReadModel
    type: read model
    owner: Planning DB governance read model
fowlerSignals:
  - read-model query components split between root scripts and query component folder
  - stale feature manifests reference historical file locations
architectureGuards:
  - node --test scripts/planning-db-query.test.cjs
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - repository governance CLI surface
completionGate:
  - node --test scripts/planning-db-query.test.cjs
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: planning-db-query-component-placement
    redTest: node --test scripts/planning-db-query.test.cjs
    expectedFailure: root-level scripts/planning-db/*-query.cjs files are accepted as focused read-model components.
    patchSurfaces:
      - scripts/planning-db-query.test.cjs
      - scripts/planning-db-query.cjs
      - scripts/planning-db/queries/command-query-rail-query.cjs
      - scripts/planning-db/queries/feature-mechanization-query.cjs
      - scripts/planning-db/queries/knowledge-intake-retirement-query.cjs
    greenTest: node --test scripts/planning-db-query.test.cjs
symbols:
  - name: createCommandQueryRailReadModelComponent
    path: scripts/planning-db/queries/command-query-rail-query.cjs
    dddOwner: CommandQueryRailCatalogReadModel
    cqRails:
      - QueryCommandQueryRailCatalog
      - AssessCreationIntentQuery
    fowlerSignals:
      - command/query rail read model lives in query component folder
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-query.test.cjs
  - name: createFeatureMechanizationReadModelComponent
    path: scripts/planning-db/queries/feature-mechanization-query.cjs
    dddOwner: FeatureMechanizationOperatorReadModel
    cqRails:
      - ListFeatureMechanizationFeatures
      - ListFeatureMechanizationSymbols
    fowlerSignals:
      - feature mechanization read model lives in query component folder
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-query.test.cjs
  - name: createKnowledgeIntakeRetirementReadModelComponent
    path: scripts/planning-db/queries/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails:
      - QueryKnowledgeIntakeRetirement
    fowlerSignals:
      - knowledge intake retirement read model lives in query component folder
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-query.test.cjs
  - name: runPlanningDbQueryCli
    path: scripts/planning-db-query-tests/helpers.cjs
    dddOwner: PlanningDbQueryComponentLayoutPolicy
    cqRails:
      - QueryCommandQueryRailCatalog
      - ListFeatureMechanizationFeatures
      - QueryKnowledgeIntakeRetirement
    fowlerSignals:
      - query CLI test helper lives under the query test folder instead of the root harness
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A
    unitTests:
      - scripts/planning-db-query.test.cjs
```
