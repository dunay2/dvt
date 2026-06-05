---
title: Frontend And UX Mandatory Proposal Classification
status: Active
owner: Web / Product / Architecture
last_reviewed: 2026-06-05
planning_type: status
lane: E
task_id: E-PROP-DISP-1
---

# Frontend And UX Mandatory Proposal Classification

## Purpose

This page is the human navigation surface for the mandatory frontend proposal
pile. It classifies proposal files by current operational state so implemented
plans do not compete with real pending work.

The original proposal files remain in this directory for now. Many active
feature-mechanization manifests, closeouts, component docs, and tests reference
their exact paths. The state folders below are classification views; physical
movement into archive or superseded paths must be done as a separate
link-migration slice.

## Governing Sources

- [Governance document and rule inventory](../../../status/governance-document-rule-inventory.md)
- [Planning control tower](../../../state/planning-control-tower.md)
- [Proposal portfolio map](../../portfolio-map-20260403.md)
- [Frontend mature-system gap status](../../../status/frontend-mature-system-gap-status-20260602.md)
- [Command and query rail governance](../../../../architecture/command-query-rail-governance.md)
- [Fowler opportunity planning governance](../../../../architecture/fowler-opportunity-planning-governance.md)

## State Folders

| Folder                                                          | Meaning                                                                                                                                         | Count |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----: |
| [Implemented capabilities](./implemented-capabilities/index.md) | Product-facing capabilities, features, route surfaces, visual-system work, and workflow affordances that have implementation evidence.          |    50 |
| [Implemented technical](./implemented-technical/index.md)       | Boundary, test-governance, port, API-mode, query, documentation, and mechanical-truth implementation work that is already complete or accepted. |    17 |
| [Pending work](./pending-work/index.md)                         | Real frontend work that should remain executable Planning DB work, ordered by importance and dependency.                                        |    13 |
| [Superseded](./superseded/index.md)                             | Plans closed, replaced, or reduced to rationale by later accepted work.                                                                         |    20 |
| [Archive candidates](./archive-candidates/index.md)             | Drafts or historical story packs that should move to archive only after active references are migrated.                                         |     9 |

## Classification Rule

Use this order when classifying a proposal:

1. If it has `mechanizationStatus: implemented` or `status: Implemented`, put
   it in implemented capability or implemented technical.
2. If it has `mechanizationStatus: closed`, a closeout, or a successor plan
   that owns the behavior, put it in superseded.
3. If it describes missing product behavior that is still not implemented,
   create or update a Planning DB task and list it in pending work.
4. If it is a draft story pack or historical design input with active
   references, keep it as an archive candidate until those references move to
   canonical component, feature, closeout, or task docs.
5. Do not infer implementation from a proposal title. Use status, feature
   mechanization, closeout evidence, code/test references, and Planning DB.

## Immediate Frontend Priority

The next real work is not another proposal archaeology pass. The highest-value
frontend sequence is:

1. `E-MS-GAP-010-SCOPE-1`: make active tenant/project/environment scope explicit.
2. `E-MS-GAP-002-WAREHOUSE-CONNECTION-1`: create and test user-owned warehouse connections.
3. `E-MS-GAP-003-GRAPH-CODE-AUTHORITY-1`: close graph/code save and projection authority.
4. `E-MS-GAP-004-READINESS-1`: expose execution readiness before preview or run.
5. `E-MS-GAP-011-STRICT-BROWSER-PROOF-1`: prove the mature first-user path without mocked success.
6. `E-MS-GAP-005-RUN-CONTROL-1`: expose cancel and recover commands in the frontend.
7. `E-MS-GAP-006-NODE-EVIDENCE-1`: provide a node-scoped execution-evidence read model.
8. `E-MS-GAP-007-RUN-SOURCE-NAV-1`: navigate from a run back to its source canvas, code, and artifacts.
9. `E-MS-GAP-001-WORKFLOW-ASSET-CATALOG-1`: add unified workflow and asset discovery.
10. `E-MS-GAP-008-LINEAGE-SEMANTICS-1`: define authoritative lineage and column semantics.
11. `E-MS-GAP-009-RUN-EVIDENCE-EXPORT-1`: expose retention and evidence export.
12. `E-DBT-PROJECT-ROUNDTRIP-DISP-1`: decompose dbt project roundtrip into concrete rails.
13. `E-MAND-FRONTEND-PROPOSAL-LINK-MIGRATION-1`: physically move or archive proposals after exact references are updated.

## Movement Policy

Do not move original proposal files just because this index classifies them.
Move files only when:

- all exact links have been migrated;
- feature-mechanization manifests no longer name the old path;
- tests do not read the old path as canonical proof;
- `docs:sync`, `governance:refresh`, and `verify:prepush` pass after the move.
