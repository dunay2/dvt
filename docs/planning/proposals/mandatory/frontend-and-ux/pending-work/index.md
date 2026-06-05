---
title: Frontend Pending Work Priority
status: Active
owner: Web / Product / Architecture
last_reviewed: 2026-06-05
planning_type: status
lane: E
task_id: E-PROP-DISP-1
---

# Frontend Pending Work Priority

This is the executable frontend order after classifying the mandatory proposal
pile. New behavior still requires its owning command/query rail and a focused
plan before implementation.

## Prioritized Work

| Order | Task                                        | Priority | Weight   | Why now                                                                                                                                   |
| ----: | ------------------------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | `E-MS-GAP-010-SCOPE-1`                      | P0       | High     | Scope and deployment identity must be explicit before source import, plan preview, run start, and artifact writes can be trusted.         |
|     2 | `E-MS-GAP-002-WAREHOUSE-CONNECTION-1`       | P0       | Critical | Users can import server-known warehouse tables, but cannot create or test credentialed connections. This blocks mature source onboarding. |
|     3 | `E-MS-GAP-003-GRAPH-CODE-AUTHORITY-1`       | P0       | Critical | Graph node properties, code buffers, generated artifacts, and save semantics still need one authority.                                    |
|     4 | `E-MS-GAP-004-READINESS-1`                  | P0       | Critical | Execution readiness must be readable before preview or run, not discovered late through failed plan/run attempts.                         |
|     5 | `E-MS-GAP-011-STRICT-BROWSER-PROOF-1`       | P0       | Critical | The mature first-user flow needs strict browser evidence with no mocked success paths after scope, source, code, and readiness close.     |
|     6 | `E-MS-GAP-005-RUN-CONTROL-1`                | P1       | High     | Cancel and recover controls are expected in mature run monitoring and must use protected backend commands.                                |
|     7 | `E-MS-GAP-006-NODE-EVIDENCE-1`              | P1       | High     | Inspector history should read one node-scoped evidence model instead of plugin-local fragments.                                           |
|     8 | `E-MS-GAP-007-RUN-SOURCE-NAV-1`             | P1       | High     | Run detail must navigate back to the exact canvas, code, artifacts, and scope that produced the run.                                      |
|     9 | `E-MS-GAP-001-WORKFLOW-ASSET-CATALOG-1`     | P2       | Medium   | Unified discovery should follow source and run provenance so it indexes trustworthy objects.                                              |
|    10 | `E-MS-GAP-008-LINEAGE-SEMANTICS-1`          | P2       | Medium   | Lineage should be computed or imported from authoritative evidence, not guessed from labels.                                              |
|    11 | `E-MS-GAP-009-RUN-EVIDENCE-EXPORT-1`        | P2       | Medium   | Retention and export become useful after run/source provenance and evidence are navigable.                                                |
|    12 | `E-DBT-PROJECT-ROUNDTRIP-DISP-1`            | P2       | Medium   | dbt roundtrip should decompose into source-provider, graph/code, artifact, and archive rails after core authority is explicit.            |
|    13 | `E-MAND-FRONTEND-PROPOSAL-LINK-MIGRATION-1` | P2       | Medium   | Physical doc movement and archive cleanup should happen after active references are migrated.                                             |

## Direct Pending Proposal Inputs

| Source                                                                                   | Disposition                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [dbt project round-trip product plan](../dbt-project-roundtrip-product-plan-20260527.md) | Keep under pending review until dbt project import/roundtrip is either accepted as a concrete source-provider feature or superseded by source-provider roadmap work. |

## Existing Blocked Work To Respect

| Existing task            | Current posture                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `F-08`                   | Plan-to-run core flow from Canvas selection to real run start remains blocked. Do not duplicate it with readiness or browser-proof tasks; make those tasks feed it.           |
| `F-11`                   | Backend-backed Artifacts, Diff, Lineage, Cost, Plugins, and Admin activation remains blocked. Node evidence and run-source navigation should feed this rather than bypass it. |
| `F-17`, `F-17-A`, `F-20` | Monaco/manual/story surfaces are blocked near completion; do not reopen them as broad frontend work.                                                                          |
| `E-PROP-DISP-1`          | Proposal classification is the governing cleanup task for this directory.                                                                                                     |
