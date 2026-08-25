---
title: VTX2 Substrait-centered development map
status: Review
owner: Architecture / VTX2
last_reviewed: 2026-08-25
---

# VTX2 Substrait-centered development map

## Purpose

This document is the **working component map for the VTX2 pilot** while Substrait replaces SQL as the central transformation-semantic authority.

It is intentionally small. It is not a complete future platform design and it is **not yet architecture authority**: `AGENTS.md` and ADR-0061 require Planning DB reconciliation for component ownership, capabilities, relations, rails and mechanization before a new architectural responsibility is accepted.

Until that reconciliation is available, this map is useful for two things only:

1. making the intended product direction and likely reuse points visible;
2. preventing speculative expansion during the pilot.

The pilot may reuse source-owned components already proven on `main`. If implementation appears to require a new public architectural responsibility, stop that expansion until Planning DB can be queried and the responsibility is reconciled with its canonical owner. Local private code needed only to prove the bounded fixture is not promoted to architecture by this document.

## Product direction

```text
                    DVT CARD / UI
                         ⇅
          typed Substrait.Plan + DVT sidecar
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      SQL view       future Python   other views
          │
          ▼
     SQLGlot AST
          │
          ▼
    target SQL dialect
          │
          ▼
provider-native validation / Preview / Run
```

The intended semantic center is `typed Substrait.Plan`. SQL, visual presentation, future Python/PySpark, JSON/debug and generated artifacts are projections/views of that same transformation meaning.

The existing DVT sidecar remains limited to stable product identity/provenance that Substrait does not safely own for interactive authoring (`RelationId`, `FieldId`, source/provenance binding, display identity and lineage identity where required).

This direction is governed by ADR-0064. Exact component ownership remains subject to the Planning DB reconciliation gate below.

## Two architecture levels remain separate

### Flow / execution level

Keep the existing DVT graph/planner/runtime boundary for cards, dependencies, controls, outputs, materialization and execution.

Substrait logical operators are not Canvas nodes and are not runtime steps.

```text
Substrait operator count
!= Canvas card count
!= ExecutionPlan step count
```

### Transformation recipe level

Inside one transformation card, the intended semantic recipe is:

```text
typed Substrait.Plan
+ DVT stable identity/provenance sidecar
```

Do not introduce `DvtRelationalIR`, `VisualTransformRecipeV2`, operation-specific node kinds, or private copies of Substrait relation/expression/type/function semantics for the pilot.

## Working component inventory

The names below describe responsibilities observed or required by the current pilot direction. They do **not** authorize a new class/module. Existing owners must be reused where present, and any missing public responsibility requires Planning DB reconciliation before architectural promotion.

| Component / responsibility                                        | Current posture                 | Pilot use                                                                                    | Rule                                                                                         |
| ----------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `@dvt/contracts/substrait` profile + sidecar + capability catalog | EXISTING                        | exact profile, stable IDs, semantic capability identities                                    | reuse; do not duplicate                                                                      |
| generated Substrait v0.101.0 TypeScript bindings                  | VERIFY / MINIMUM NEED           | typed `Plan`, `ReadRel`, `ProjectRel`, field references and scalar functions needed by pilot | reuse generated ownership if present; otherwise add only after owner/relation reconciliation |
| existing DVT Card / Node Properties                               | EXISTING                        | first editable visual projection                                                             | reuse current surface                                                                        |
| existing Graph Draft Apply / Cancel / reload path                 | EXISTING                        | draft lifecycle                                                                              | reuse; no new state authority                                                                |
| existing persistence path                                        | EXISTING / VERIFY               | persist serialized recipe                                                                    | reuse if source inspection proves compatible                                                 |
| protobuf encode/decode + SHA integrity                            | EXISTING CONCERN / VERIFY OWNER | serialize typed Plan for storage/transport                                                    | infrastructure only; not semantic authority                                                  |
| SQL projection responsibility                                    | FUTURE AFTER PILOT / OWNER TBD  | map admitted Substrait semantics to SQLGlot AST                                               | no framework or public component until Planning DB/source ownership is reconciled            |
| SQLGlot                                                          | EXTERNAL CANDIDATE              | target AST + dialect rendering                                                               | #2618 decides bounded outbound role                                                          |
| provider-native SQL readiness / Preview / Run                    | EXISTING                        | final target validation/execution readiness                                                   | keep                                                                                         |
| generated projection artifact identity/storage                   | DEFERRED                        | identify/store/cache derived outputs if evidence requires it                                  | decide after real Substrait -> SQL evidence                                                  |

## Pilot implementation pattern

First proof only:

```text
customers.name
    -> trim
    -> upper
    -> customer_name
```

Represented by a real typed Substrait plan equivalent to:

```text
ReadRel(customers)
  ↓
ProjectRel
  customer_name := upper(trim(field(name)))
  email         := field(email)
  country       := field(country)
```

Required lifecycle:

```text
open -> edit typed Plan -> Apply -> existing persistence -> reload -> same semantics
                    \-> Cancel -> no persisted change
```

Stop when this fixture works end to end. Do not generalize joins, aggregates, windows, sets, multi-input or multiple renderers in the same cut.

The pilot is allowed to proceed before Planning DB connectivity only when it can stay entirely on existing source-owned seams plus local private code. It must not create a new public architectural owner while the architecture authority is unavailable.

## SQL migration pattern

Current VTX1 path:

```text
VisualTransformRecipeV1
 -> canvasVisualTransformSqlCompiler
 -> PostgreSQL SQL
 -> Preview / SQL artifact
```

Target direction after the pilot:

```text
typed Substrait.Plan
 -> bounded Substrait-to-SQLGlot projection
 -> SQLGlot AST
 -> target SQL dialect
 -> existing provider-native validation / Preview / Run
```

The old SQL compiler remains compatibility code until the new path proves equivalent accepted behavior. Do not delete working VTX1 behavior before replacement evidence exists. Do not retain two semantic centers after cutover.

## Visual projection pattern

The card is intended to be a view/editor over the same typed Substrait recipe. It must not maintain a second operation/function/type catalog.

Visual wording and interaction metadata may differ from Substrait vocabulary, but semantic identity comes from the admitted Substrait capability catalog.

## Persistence pattern

In-application direction:

```text
typed Substrait.Plan + DVT sidecar
```

Persisted/wire representation may remain:

```text
Substrait protobuf bytes
+ SHA-256 integrity
+ serialized sidecar
```

The exact storage location, versioning and artifact policy must reuse the current persistence path first. Do not add a new store for the pilot.

Generated SQL/Python outputs are derived artifacts, not recipe authority. Whether they are regenerated, cached, versioned or persisted is deliberately deferred until the first real target projection exists.

## Pilot development rules

1. **Reuse before create.** Inspect current source before adding code.
2. **No speculative abstraction.** No builder/service/repository/framework for comfort or future flexibility.
3. **No duplicate semantic authority.** Do not create a private DVT relation/expression/type/function model beside Substrait.
4. **No unvalidated public architecture.** If a pilot change needs a new public architectural responsibility, stop that expansion until Planning DB reconciliation can name the canonical owner/relations/rails.
5. **Local code stays local.** Small private functions needed for the single fixture are acceptable and do not become a new framework.
6. **Second-use-case rule.** Shared abstraction is extracted only after a second concrete use case proves duplication or an existing canonical boundary requires it.
7. **Fail closed.** Unsupported Substrait shapes/capabilities are read-only or rejected; never silently lower through SQL/VTX1 fallback.
8. **Keep provider validation.** A generated SQL string is not proof of provider readiness.
9. **Stop at the slice.** Each issue stops when its stated proof works; do not absorb the next stage.

## Epic delivery map

```text
working architecture map + Planning DB reconciliation gate
        ↓
#2651 SQL AS-IS keep/convert/retire inventory
        ↓
#2598 one typed Substrait recipe edited from existing card
        ├──────────────► #2655 persistence freeze after pilot evidence
        ├──────────────► #2642 general visual projection after pilot evidence
        ↓
#2597 Substrait -> SQLGlot AST -> governed SQL projection
        ↓
#2652 Preview/provider cutover
        ↓
#2657 generated identity/destination/storage decision with real evidence
        ↓
#2600 retire superseded VTX1 recipe/SQL authority
```

## Planning DB reconciliation gate

Before this document can move from `Review` to an accepted architecture/development authority, execute the repository-mandated query flow:

```text
pnpm planning:db:import --if-stale
pnpm planning:db:query architecture-designs --limit 100
```

Then reconcile this map against the returned:

- component identities and source owners;
- component relationships;
- capabilities;
- command/query rails and ports/adapters;
- feature mechanization;
- canonical evidence paths;
- active implementation overlap.

Source inspection is still required for implementation, but it cannot replace this architecture-authority check.

If the Planning DB result contradicts this working map, update the map and the affected GitHub issues before implementation follows the incorrect boundary.

## Acceptance status

Until the reconciliation gate above has passed:

- this document may guide **scope reduction and duplicate avoidance**;
- it may not declare a new public architectural owner;
- the PO may approve the product sequence and pilot scope;
- final architecture approval remains explicitly pending.
