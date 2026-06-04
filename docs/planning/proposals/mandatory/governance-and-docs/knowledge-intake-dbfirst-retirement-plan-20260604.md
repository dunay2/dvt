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

| Scenario                                                    | Opportunity          | Fowler pattern             | DDD owner                            | Command/query rail              | Implementation surfaces                                    | Tests                                                                                 | Out of scope                            |
| ----------------------------------------------------------- | -------------------- | -------------------------- | ------------------------------------ | ------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| Agents need to know which intake files can be retired       | Hidden authority     | Explicit Read Model        | `KnowledgeIntakeRetirementReadModel` | `ListKnowledgeIntakeRetirement` | Planning DB migration, query module, CLI router            | `node --test scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs` | Deleting `buzon/`                       |
| Analysis literature exists in prose and DB at the same time | Duplicate semantics  | Repository / Query Service | Knowledge intake read model          | `ListKnowledgeIntakeRetirement` | DB view over `knowledge_documents`, links, and action rows | Migration test for view columns and query test for DB view usage                      | Full literature generator               |
| Tests directly read raw `buzon` files as semantic proof     | Test-only confidence | Semantic fitness function  | CI governance                        | existing canon query rails      | Later guard migration                                      | Later tests must assert DB-backed dispositions instead of raw file strings            | Rewriting every existing canon test now |

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
  - docs/planning/status/system-governance-*
  - scripts/planning-db/knowledge-intake-retirement-query.cjs
  - scripts/planning-db-query.cjs
  - scripts/planning-db-query.test.cjs
  - scripts/planning-db-migrate.test.cjs
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
domainObjects:
  - name: KnowledgeIntakeRetirementReadModel
    type: query-store read model
    owner: scripts/planning-db
fowlerSignals:
  - Hidden authority
  - Duplicate semantics
  - Test-only confidence
architectureGuards:
  - node --test scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs
cypressFlows:
  - N/A - Planning DB governance query only; no browser runtime behavior changes.
completionGate:
  - node --test scripts/planning-db-query.test.cjs scripts/planning-db-migrate.test.cjs
  - pnpm planning:db:import -- --governance-only
  - pnpm planning:db:query knowledge-intake --limit 10
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
symbols:
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
  - name: documentLinks
    path: tools/planning-db/knowledge/documentLinks.cjs
    dddOwner: KnowledgeIntakeRetirementReadModel
    cqRails: [ListKnowledgeIntakeRetirement]
    fowlerSignals: [Hidden authority]
    architectureGuard: node --test tools/planning-db/knowledge/documentSnapshot.test.cjs
    cypressCoverage: N/A - DB import projection.
    unitTests: [node --test tools/planning-db/knowledge/documentSnapshot.test.cjs]
```

## Next Slices

1. Replace canon tests that read `buzon/*.md` directly with DB-backed
   disposition fixtures.
2. Add a generated literature page from `knowledge_intake_retirement_query`.
3. Block new active docs from requiring new `buzon/` analysis files.
4. Remove or archive only the intake files whose DB state is `canonized` and
   whose raw-file references have been removed.
