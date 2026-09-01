---
title: VTX2 Single Canonical Model and Governed Projections Cutover Plan
status: Accepted
owner: Architecture / Product / Web / dbt / Planner / Runtime / PostgreSQL
last_reviewed: 2026-09-01
planning_type: mandatory-proposal
feature_id: VTX2-SINGLE-MODEL-PROJECTIONS
parent_issue: 2650
---

# VTX2 Single Canonical Model and Governed Projections Cutover Plan

## Product outcome

DVT authors one canonical transformation revision and derives every product,
target, operational, lineage, and evidence representation from it:

```text
typed pinned Substrait Plan + DVT identity/provenance sidecar
        ├── Transform/card projection
        ├── dbt compatibility or generated projection
        ├── provider AST/code projection
        ├── workload / ExecutionPlan projection
        └── lineage/read/evidence projection
```

ADR-0064 owns the decision. Epic #2594 owns strategy; epic #2650 owns cutover.
This plan coordinates bounded issues and does not duplicate their acceptance
criteria.

## Current boundary

Canonical Substrait authoring, stable identity, capability catalog, card
projection, and a bounded PostgreSQL projection exist. SQL/VTX1/dbt
compatibility and technical runtime activities still coexist. No compatibility
surface may become a second semantic authority or silently write back.

The current programme has no SQL/dbt-to-Substrait import path. External dbt
authoring, if retained, is explicitly classified compatibility.

## Owned delivery cuts

| Outcome                                                 | Owners                     |
| ------------------------------------------------------- | -------------------------- |
| durable canonical document and field identity           | #2655, #2596               |
| Transform language, kind, and capability projection     | #2635, #2721, #2642        |
| multi-input canonical composition                       | #2634                      |
| dbt and PostgreSQL target projections/readiness         | #2737, #2652, #2657, #2333 |
| operational projection and runtime execution            | #2524, #2723               |
| materialization/publication decision and implementation | #2523, #2724, #2725        |
| fail-closed acceptance and legacy deletion              | #2722, #2599, #2600        |

Delivery order is canonical persistence, product projection, composition and
targets, operational projection, runtime, acceptance, then deletion. Each issue
ships independently green; no omnibus implementation PR is required.

## Invariants

- Cards, files, SQL, workloads, and ExecutionPlans are projections, not models.
- Stored projections bind canonical SHA/profile and required target/tool identity.
- Semantic operator count, card count, and workload count remain independent.
- Planner and Engine do not parse Substrait, dbt, card, or SQL semantics.
- Unsupported semantics, topology, provider, or stale identity fail closed.
- No private relational IR, operator node taxonomy, hidden child graph, second
  graph/store/planner/runtime, or permanent compatibility alias is introduced.

## Completion

- product edits mutate only the canonical semantic revision;
- Transform, target, operational, and lineage projections agree on identity;
- multi-input composition creates no fake cards, materializations, or workloads;
- provider-native readiness validates the selected target projection;
- exact selected graph lowers without silent truncation;
- superseded SQL/VTX1/dbt compatibility is deleted or version-confined; and
- focused package, service, browser, live, and prepush evidence is green.

## Mechanization authority

Planning DB owns the current mechanization for
`VTX2-SINGLE-MODEL-PROJECTIONS`; this document does not duplicate its rail,
symbol, validation, or task state. Inspect it with the DB-first
`feature-mechanization*` and `command-query-rails` queries. GitHub issues own
delivery state and acceptance.
