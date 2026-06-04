---
title: Knowledge Intake DB-First Retirement Plan
status: Accepted
owner: Architecture / Planning DB
date: 2026-06-04
last_reviewed: 2026-06-04
planning_type: proposal
---

# Knowledge Intake DB-First Retirement Plan

## Problem Summary

`buzon/` should disappear as an authority surface. Keeping analysis prose in
tracked intake files while Planning DB also imports the same material creates a
two-system cost for agents: every improvement can require manual archaeology,
direct file reads, generated docs refreshes, and query-store checks.

## Root Cause

The repository already imports `buzon/*.md` into `knowledge_documents`, but
several active docs and semantic guards still treat physical `buzon/` files as
proof. The DB model can list documents and action rows, yet it does not expose a
retirement read model that answers the operational question:

> Which intake files are safe to canonize, regenerate, archive, or remove next?

Deleting the directory before that answer is queryable would hide work, break
tests, and create silent governance debt.

## Governing Sources

- `AGENTS.md`
- [Governance document and rule inventory](../../../status/governance-document-rule-inventory.md)
- [AI work protocol](../../../../guides/ai-work-protocol.md)
- [Command and query rail governance](../../../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../../../architecture/fowler-opportunity-planning-governance.md)
- [Buzon Fowler canonization inventory](../../../reviews/architecture-and-governance/20260525-buzon-fowler-canonization-inventory.md)
- [Knowledge intake retirement component](../../../../architecture/components/ci-governance/knowledge-intake-retirement-component.md)

## Selected Option

Add a DB-first retirement query for knowledge intake before any physical
deletion:

```bash
pnpm planning:db:query knowledge-intake --state unclassified --limit 30
pnpm planning:db:query knowledge-intake --state open-actions --limit 30
pnpm planning:db:query knowledge-intake --path buzon/example.md --limit 5
```

The query classifies `buzon/` intake rows by canonical disposition, inbound
governed references, and extracted action counts. Later slices can regenerate
literature from this read model and replace direct file-based tests with
DB-backed fixtures.

## Rejected Alternatives

- Delete `buzon/` immediately. Rejected because active docs and tests still
  reference raw files.
- Move `buzon/` to `docs/archive/` immediately. Rejected because it preserves a
  second physical authority and adds docs-index churn without solving queryable
  disposition.
- Generate prose directly from `git ls-files buzon/*.md`. Rejected because it
  repeats the current directory-as-authority problem.

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                                    | Opportunity          | Fowler pattern             | DDD owner                            | Command/query rail              | Implementation surfaces                                     | Tests                                                                                 | Out of scope                          |
| ----------------------------------------------------------- | -------------------- | -------------------------- | ------------------------------------ | ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Agents need to know which intake files can be retired       | Hidden authority     | Explicit Read Model        | `KnowledgeIntakeRetirementReadModel` | `ListKnowledgeIntakeRetirement` | Planning DB migration, query module, CLI router             | `node --test scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs` | Deleting `buzon/`                     |
| Analysis literature exists in prose and DB at the same time | Duplicate semantics  | Repository / Query Service | Knowledge intake read model          | `ListKnowledgeIntakeRetirement` | DB view over `knowledge_documents`, links, and action rows  | Migration test for view columns and query test for DB view usage                      | Full literature generator             |
| Agents need to retire active `buzon` backrefs without `rg`  | Hidden coupling      | Explicit Read Model        | `KnowledgeIntakeRetirementReadModel` | `ListKnowledgeIntakeRetirement` | Query module and CLI router over `knowledge_document_links` | `node --test scripts/planning-db-query.test.cjs`                                      | Automatic physical deletion           |
| Tests directly read raw `buzon` files as semantic proof     | Test-only confidence | Semantic fitness function  | CI governance                        | existing canon query rails      | Shared canonization guard plus `tools/ci/*canon.test.mjs`   | Canon tests assert canonical plan mechanization instead of raw file strings           | Rewriting non-canon package tests now |

<!-- markdownlint-enable MD060 -->

## Feature Mechanization

```feature-mechanization
version: 1
featureId: KNOWLEDGE-INTAKE-DBFIRST-RETIREMENT-20260604
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/knowledge-intake-dbfirst-retirement-plan-20260604.md
componentGuides:
  - docs/architecture/components/ci-governance/knowledge-intake-retirement-component.md
userStories:
  - docs/architecture/components/ci-governance/knowledge-intake-retirement-component.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/architecture-and-governance/20260525-buzon-fowler-canonization-inventory.md
allowedImplementationSurfaces:
  - docs/architecture/components/ci-governance/knowledge-intake-retirement-component.md
  - docs/architecture/components/ci-governance/index.md
  - docs/**/index.md
  - docs/.manifest.json
  - docs/planning/closeouts/20260604-knowledge-intake-dbfirst-retirement-closeout.md
  - docs/planning/proposals/mandatory/governance-and-docs/knowledge-intake-dbfirst-retirement-plan-20260604.md
  - docs/planning/reviews/architecture-and-governance/20260525-buzon-fowler-canonization-inventory.md
  - docs/planning/status/db-surface-inventory.md
  - docs/planning/status/system-governance-*
  - package.json
  - scripts/local-validation-plan.cjs
  - scripts/planning-db/knowledge-intake-retirement-guard.cjs
  - scripts/planning-db/knowledge-intake-retirement-query.cjs
  - scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - scripts/planning-db-migrate.test.cjs
  - scripts/planning-db-surface-inventory-check.cjs
  - scripts/verify-changed.test.cjs
  - tools/ci/*canon.test.mjs
  - tools/ci/canonization-guard.mjs
  - tools/ci/canonization-guard.test.mjs
  - tools/planning-db/knowledge/documentLinks.cjs
  - tools/planning-db/knowledge/documentSnapshot.test.cjs
  - tools/planning-db/migrations/057_knowledge_intake_retirement_query.sql
forbiddenImplementationSurfaces:
  - buzon/**
  - apps/**
  - packages/**
commandQueryRails:
  - name: ListKnowledgeIntakeRetirement
    type: query
    dddOwner: KnowledgeIntakeRetirementReadModel
    status: implemented
  - name: CheckBuzonIntakeRetirement
    type: command
    dddOwner: KnowledgeIntakeRetirementGuard
    status: implemented
domainObjects:
  - name: KnowledgeIntakeRetirementReadModel
    type: query-store read model
    owner: scripts/planning-db
  - name: KnowledgeIntakeRetirementGuard
    type: changed-slice command guard
    owner: scripts/planning-db
fowlerSignals:
  - Hidden authority
  - Duplicate semantics
  - Test-only confidence
architectureGuards:
  - node --test scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs
  - node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs scripts/verify-changed.test.cjs
  - node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
cypressFlows:
  - N/A - Planning DB governance query only; no browser runtime behavior changes.
completionGate:
  - node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs scripts/verify-changed.test.cjs
  - node --test scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs
  - node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
  - pnpm planning:db:import -- --governance-only
  - pnpm planning:db:query knowledge-intake --limit 10
  - pnpm planning:db:query knowledge-intake --references --limit 10
  - pnpm planning:db:knowledge-intake:retirement:check
  - pnpm docs:sync
  - pnpm docs:feature-mechanization:implementation
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: knowledge-intake-retirement-query
    redTest: node --test scripts/planning-db-query.test.cjs
    expectedFailure: knowledge-intake is an unknown planning DB query and has no focused read-model module.
    patchSurfaces:
      - scripts/planning-db/knowledge-intake-retirement-query.cjs
      - scripts/planning-db-query.cjs
      - scripts/planning-db-query.test.cjs
    greenTest: node --test scripts/planning-db-query.test.cjs
  - id: knowledge-intake-retirement-migration
    redTest: node --test scripts/planning-db-migrate.test.cjs
    expectedFailure: knowledge_intake_retirement_query migration does not exist.
    patchSurfaces:
      - tools/planning-db/migrations/057_knowledge_intake_retirement_query.sql
      - scripts/planning-db-migrate.test.cjs
    greenTest: node --test scripts/planning-db-migrate.test.cjs
  - id: knowledge-intake-direct-path-backrefs
    redTest: node --test tools/planning-db/knowledge/documentSnapshot.test.cjs
    expectedFailure: knowledge document links ignore direct governed path references outside Markdown links.
    patchSurfaces:
      - tools/planning-db/knowledge/documentLinks.cjs
      - tools/planning-db/knowledge/documentSnapshot.test.cjs
    greenTest: node --test tools/planning-db/knowledge/documentSnapshot.test.cjs
  - id: knowledge-intake-write-retirement-guard
    redTest: node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs scripts/verify-changed.test.cjs
    expectedFailure: changed-slice validation permits new buzon Markdown intake files after the DB-first read model exists.
    patchSurfaces:
      - package.json
      - scripts/local-validation-plan.cjs
      - scripts/planning-db/knowledge-intake-retirement-guard.cjs
      - scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
      - scripts/verify-changed.test.cjs
    greenTest: node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs scripts/verify-changed.test.cjs
  - id: knowledge-intake-reference-query
    redTest: node --test scripts/planning-db-query.test.cjs
    expectedFailure: knowledge-intake cannot list active DB-backed references to intake documents.
    patchSurfaces:
      - docs/architecture/components/ci-governance/knowledge-intake-retirement-component.md
      - docs/planning/status/db-surface-inventory.md
      - scripts/planning-db/knowledge-intake-retirement-query.cjs
      - scripts/planning-db-query.cjs
      - scripts/planning-db-query.test.cjs
      - scripts/planning-db-surface-inventory-check.cjs
    greenTest: node --test scripts/planning-db-query.test.cjs
  - id: knowledge-intake-canon-test-decoupling
    redTest: node --test tools/ci/canonization-guard.test.mjs
    expectedFailure: canonization tests have no shared guard for canonical plans and still depend on raw buzon analysis files.
    patchSurfaces:
      - docs/architecture/components/ci-governance/**
      - docs/architecture/components/api/runtime-review-canon-component.md
      - docs/architecture/components/web/graph/canvas-fowler-canon-component.md
      - docs/architecture/components/web/workbench-ux-canon-component.md
      - tools/ci/*canon.test.mjs
      - tools/ci/canonization-guard.mjs
      - tools/ci/canonization-guard.test.mjs
    greenTest: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
symbols:
  - name: createKnowledgeIntakeRetirementGuardComponent
    path: scripts/planning-db/knowledge-intake-retirement-guard.cjs
    dddOwner: KnowledgeIntakeRetirementGuard
    cqRails: [CheckBuzonIntakeRetirement]
    fowlerSignals: [Hidden authority]
    architectureGuard: node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    cypressCoverage: N/A - local changed-slice guard.
    unitTests: [node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs]
  - name: createKnowledgeIntakeRetirementReadModelComponent
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Hidden authority]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: buildKnowledgeIntakeRetirementRows
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: knowledgeIntakeRetirementSelect
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: readKnowledgeIntakeRetirementRows
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: buildKnowledgeIntakeReferenceRows
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: knowledgeIntakeReferenceSelect
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: readKnowledgeIntakeReferenceRows
    path: scripts/planning-db/knowledge-intake-retirement-query.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Explicit Read Model]
    architectureGuard: node --test scripts/planning-db-query.test.cjs
    cypressCoverage: N/A - DB query only.
    unitTests: [node --test scripts/planning-db-query.test.cjs]
  - name: documentLinks
    path: tools/planning-db/knowledge/documentLinks.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Hidden authority]
    architectureGuard: node --test tools/planning-db/knowledge/documentSnapshot.test.cjs
    cypressCoverage: N/A - DB import projection.
    unitTests: [node --test tools/planning-db/knowledge/documentSnapshot.test.cjs]
  - name: assert
    path: scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    dddOwner: KnowledgeIntakeRetirementGuard
    cqRails: [CheckBuzonIntakeRetirement]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    cypressCoverage: N/A - unit test dependency.
    unitTests: [node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs]
  - name: createComponent
    path: scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    dddOwner: KnowledgeIntakeRetirementGuard
    cqRails: [CheckBuzonIntakeRetirement]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    cypressCoverage: N/A - unit test helper.
    unitTests: [node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs]
  - name: test
    path: scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    dddOwner: KnowledgeIntakeRetirementGuard
    cqRails: [CheckBuzonIntakeRetirement]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs
    cypressCoverage: N/A - unit test dependency.
    unitTests: [node --test scripts/planning-db-knowledge-intake-retirement-guard.test.cjs]
  - name: createCanonizationGuard
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: defaultCanonizationGuard
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Test-only confidence]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: requiredCanonPlanTokens
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: requiredComponentGuideHeadings
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: assertCanonPlan
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: assertComponentGuide
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: assertContains
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: assertFilesExist
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: assertTextContains
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: readRepoFile
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
  - name: escapeRegExp
    path: tools/ci/canonization-guard.mjs
    dddOwner: CI canonization semantic guard
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: node --test tools/ci/canonization-guard.test.mjs tools/ci/*canon.test.mjs
    cypressCoverage: N/A - CI governance tests.
    unitTests: [node --test tools/ci/canonization-guard.test.mjs]
```

## Next Slices

1. Replace non-canon package and app architecture tests that read `buzon/*.md`
   directly with DB-backed disposition fixtures or canonical plan assertions.
2. Add a generated literature page from `knowledge_intake_retirement_query`.
3. Block new active docs from requiring new `buzon/` analysis files.
4. Remove or archive only the intake files whose DB state is `canonized` and
   whose raw-file references have been removed.
