---
title: VTX2 Substrait semantic reference design
status: Approved direction
owner: Architecture / VTX2
last_reviewed: 2026-08-28
planning_type: proposal
baseline_sha: 03cbc1f8a287dcde65e278919d3802898da2d89c
---

# VTX2 Substrait Semantic Reference Design

## Purpose

This design applies ADR-0064 to VTX2 and records the current source-first delivery direction after the typed Substrait authoring pilot landed on `main`.

The semantic center is:

```text
typed Substrait.Plan
+ DVT stable RelationId / FieldId / provenance sidecar
```

Visual authoring, generated SQL and future target representations are projections of that semantic authority. They are not competing recipes.

## Decisions That Are Closed

1. Substrait is the normative semantic reference for admitted relational, expression, type and function meaning.
2. DVT does not create a private relational IR beside Substrait unless a demonstrated upstream gap requires a bounded extension.
3. DVT owns stable interactive identity/provenance through the existing sidecar; the sidecar is not a second IR.
4. `Substrait logical operators != Canvas cards != ExecutionPlan steps`.
5. Provider-native validation remains the final execution-readiness authority.
6. Generated SQL is a derived target projection, not semantic authority.
7. The first typed Canvas/Substrait authoring pilot is delivered by #2598 / PR #2658.
8. #2618 decided `SUBSTRAIT_TO_SQLGLOT = REFERENCE-ONLY` for VTX2 V0.

## Current V0 SQL Target Decision

For the first and currently only concrete SQL target, PostgreSQL, use the smallest existing stack:

```text
typed Substrait.Plan + DVT sidecar
        ↓
bounded Substrait -> PostgreSQL AST mapping
        ↓
existing pgsql-deparser
        ↓
deterministic PostgreSQL SQL
        ↓
existing provider-native PostgreSQL readiness / EXPLAIN
```

This is owned by #2597 / PR #2659.

SQLGlot is **not** introduced into the V0 runtime or Web path merely to create an abstraction in advance. DVT already has a Node/TypeScript PostgreSQL path and an existing PostgreSQL AST/deparser capability; adding a Python/process boundary for one consumer would add mechanism without current product value.

The V0 rule is therefore:

> One real SQL consumer/target -> use the smallest target-specific projection that reuses the current stack.

## SQLGlot Re-entry Gate

SQLGlot remains valuable prior art and a future candidate. Re-evaluate it when there is a **second real SQL consumer/dialect** that creates demonstrated duplicated target syntax/dialect work or when another concrete consumer proves a shared SQL AST layer reduces total mechanism.

A re-evaluation requires evidence for all of the following:

```text
at least two real consumers/targets
+ duplicated dialect/syntax responsibility in DVT
+ measurable reduction from one shared layer
+ acceptable runtime/deployment boundary
+ no replacement of provider-native readiness
```

Typical trigger examples are a second supported SQL dialect/provider or two production consumers that need the same cross-dialect AST semantics.

A hypothetical future target is not enough. A desire for architectural symmetry is not enough.

If the gate is met, the preferred direction is still bounded:

```text
Substrait semantic authority
        ↓
shared SQL target AST layer (candidate: SQLGlot)
        ↓
dialect projections
```

SQLGlot MUST NOT become:

- the persisted DVT recipe;
- a public DVT semantic contract;
- the Planner or execution model;
- provider-readiness authority;
- a reason to introduce a renderer framework before multiple real consumers exist.

## Source / Import Direction

A future reverse path is a separate capability:

```text
SQL
 -> selected dialect parser AST
 -> admitted Substrait semantics
 -> DVT stable bindings
```

It is not required by the first outbound PostgreSQL projection and does not justify adding SQLGlot to V0 by itself.

When SQL import is implemented, unsupported semantics fail closed. Arbitrary source formatting is not semantic authority.

## Visual Authoring

The existing product path remains:

```text
card / field command
 -> admitted capability lookup
 -> typed Substrait Plan mutation
 -> stable identity binding mutation when required
 -> card projection
```

The UI does not maintain a second Web-only function/operator model. Visual labels and gestures are presentation metadata over admitted semantic identities.

## dbt / Jinja

When dbt/Jinja participates in semantic transformation, dbt-native compilation/macro resolution occurs before mapping supported resulting semantics. Unresolved arbitrary macros are not silently interpreted as relational meaning.

DBT execution remains outside the generic Temporal adapter and does not change the VTX2 semantic authority.

## Persistence

In-memory authoring authority is the generated typed `Substrait.Plan` plus the DVT sidecar.

The durable representation remains the existing semantic document boundary proven by the pilot unless #2655 finds concrete evidence that a minimal change is required:

```text
exact profile coordinates
+ serialized protobuf bytes
+ SHA-256 integrity
+ DVT sidecar bound to the Plan digest
```

Do not create another recipe store, repository abstraction or semantic document merely for this programme.

## Provider Readiness

Semantic validity and target rendering are not execution readiness.

For PostgreSQL the existing provider-native path remains authoritative:

```text
generated PostgreSQL SQL
+ governed ConnectionRef
 -> structural policy / parser
 -> real read-only PostgreSQL EXPLAIN
 -> ready | invalid | unavailable
```

SQLGlot, if introduced later, still cannot replace this boundary.

## Planner And Runtime Handoff

Substrait is not `ExecutionPlan`.

```text
semantic card / typed Plan
 -> governed target projection and provider admission
 -> semantic workload boundary
 -> existing generic Planner
 -> ExecutionPlan
 -> Engine / provider runtime
```

A relation operator becomes a runtime step only when there is a real operational responsibility such as materialization, transfer, independent retry/cancel semantics, control/check behavior or another explicit execution boundary.

## Current Delivery Map

```text
#2638 Substrait study                         CLOSED
#2595 exact profile + identity sidecar        DELIVERED
#2640 capability catalog                     DELIVERED
#2598 typed Canvas/Substrait pilot            DELIVERED / PR #2658 merged
#2618 SQLGlot study                          CLOSED: REFERENCE-ONLY for V0
#2597 PostgreSQL target projection            ACTIVE / PR #2659
#2652 Preview cutover                         NEXT after #2597
#2655 durable recipe freeze                   OPEN
#2642 broader visual capability projection    OPEN
#2657 generated projection identity/storage   EVIDENCE-GATED
#2600 VTX1 authority reduction                AFTER replacement proof
```

## Reduction Rules

- Reuse an existing target-specific AST/deparser while only one real target needs it.
- Do not introduce a shared renderer abstraction before a second concrete consumer proves duplication.
- Do not preserve both VTX1 and VTX2 editable semantic authorities indefinitely.
- Do not create SQLGlot service/daemon/process infrastructure until an accepted use case earns it.
- Do not create a generic generated-artifact registry or naming service before projection evidence requires one.
- Provider readiness, Planner, Engine, State and Artifacts retain their existing authorities.

## Acceptance

The next V0 proof is intentionally narrow:

```text
accepted typed Substrait pilot recipe
 -> bounded PostgreSQL AST
 -> pgsql-deparser
 -> deterministic SQL
 -> existing PostgreSQL readiness
 -> Preview
```

Only after that path exists should DVT decide generated projection identity/storage and retire superseded VTX1 SQL-authority mechanics.

A future second SQL dialect reopens the SQLGlot decision; it does not retroactively make SQLGlot necessary for the first consumer.

## References

Repository work:

- ADR-0064 — Substrait semantic reference and bounded logical profile
- #2594 — VTX2 parent epic
- #2650 — Substrait-centered projection/cutover epic
- #2598 / PR #2658 — typed Substrait Canvas pilot
- #2618 — SQLGlot study; final V0 decision `REFERENCE-ONLY`
- #2597 / PR #2659 — first PostgreSQL target projection
- #2652 — Preview cutover
- #2655 — durable recipe document
- #2657 — generated projection identity/destination/storage decision
- #2600 — VTX1 reduction
- #2333 — PostgreSQL provider-native readiness

External references remain prior art, not runtime commitments:

- https://github.com/tobymao/sqlglot
- https://substrait.io/spec/specification/
- https://substrait.io/relations/logical_relations/
- https://substrait.io/expressions/field_references/
- https://substrait.io/types/type_system/
- https://substrait.io/extensions/
