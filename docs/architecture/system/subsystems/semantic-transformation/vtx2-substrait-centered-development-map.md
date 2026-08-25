---
title: VTX2 Substrait-centered development map
status: Target
owner: Architecture / VTX2
last_reviewed: 2026-08-25
---

# VTX2 Substrait-centered development map

## Purpose

This document is the **development pattern for the VTX2 pilot** while Substrait replaces SQL as the central transformation-semantic authority.

It is intentionally small. It is not a complete future platform design and it must not be used to justify speculative services, builders, registries, repositories, visitors, command buses, or helper frameworks.

When Planning DB / broader repository validation is available again, this map must be reconciled against current source and planning state. Until then, implementation must stay inside this bounded component map. If source evidence proves the map wrong, update this document first and then change code.

## Product invariant

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

`typed Substrait.Plan` is the semantic transformation authority. SQL, visual presentation, Python/PySpark, JSON/debug and generated artifacts are projections/views of that authority.

The existing DVT sidecar remains limited to stable product identity/provenance that Substrait does not safely own for interactive authoring (`RelationId`, `FieldId`, source/provenance binding, display identity and lineage identity where required).

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

Inside one transformation card, the semantic recipe is:

```text
typed Substrait.Plan
+ DVT stable identity/provenance sidecar
```

Do not introduce `DvtRelationalIR`, `VisualTransformRecipeV2`, operation-specific node kinds, or private copies of Substrait relation/expression/type/function semantics.

## Minimal component map

The names below describe responsibilities. Existing files/components should be reused whenever they already provide the responsibility. A new public class/module is not authorized merely because a box exists in the diagram.

| Component / responsibility | Status | Pilot role | Rule |
|---|---|---|---|
| `@dvt/contracts/substrait` profile + sidecar + capability catalog | EXISTING | exact profile, stable IDs, semantic capability identities | reuse; do not duplicate |
| generated Substrait v0.101.0 TypeScript bindings | MINIMUM REQUIRED | typed `Plan`, `ReadRel`, `ProjectRel`, field references and scalar functions needed by pilot | generate/reuse only required runtime surface |
| existing DVT Card / Node Properties | EXISTING | first editable visual projection | reuse current surface |
| existing Graph Draft Apply / Cancel / reload path | EXISTING | draft lifecycle | reuse; no new state authority |
| existing persistence path | EXISTING / VERIFY | persist serialized recipe | reuse if source inspection proves compatible |
| protobuf encode/decode + SHA integrity | EXISTING CONCERN / BOUNDARY | serialize typed Plan for storage/transport | infrastructure only; not semantic authority |
| SQL projection adapter | FUTURE AFTER PILOT | map admitted Substrait semantics to SQLGlot AST | bounded adapter, not SQL engine |
| SQLGlot | FUTURE AFTER PILOT | target AST + dialect rendering | reuse library; do not hand-build dialect compiler |
| provider-native SQL readiness / Preview / Run | EXISTING | final target validation/execution readiness | keep |
| generated projection artifact identity/storage | DEFERRED UNTIL FIRST PROJECTION | identify/store/cache derived outputs if evidence requires it | decide after real Substrait -> SQL evidence |

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

## SQL migration pattern

Current VTX1 path:

```text
VisualTransformRecipeV1
 -> canvasVisualTransformSqlCompiler
 -> PostgreSQL SQL
 -> Preview / SQL artifact
```

Target path after the pilot:

```text
typed Substrait.Plan
 -> bounded Substrait-to-SQLGlot projection
 -> SQLGlot AST
 -> target SQL dialect
 -> existing provider-native validation / Preview / Run
```

The old SQL compiler remains compatibility code only until the new path proves equivalent accepted behavior. Do not delete working VTX1 behavior before the replacement is evidenced. Do not allow both recipes to remain long-lived semantic authorities after cutover.

## Visual projection pattern

The card is a view/editor over the same typed Substrait recipe. It must not maintain a second operation/function/type catalog.

Visual wording and interaction metadata may differ from Substrait vocabulary, but semantic identity comes from the admitted Substrait capability catalog.

## Persistence pattern

In-application authority:

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

## Development rules

1. **Reuse before create.** Inspect current source before adding a component.
2. **No speculative abstraction.** No builder/service/repository/framework unless an existing seam cannot satisfy a proven use case.
3. **One semantic authority.** Substrait owns relational/expression/type/function semantics.
4. **No class drift.** A new public class/type/module that represents an architectural responsibility must be added to this map before implementation. Local private code needed only for the pilot does not need architectural promotion.
5. **Second-use-case rule.** Shared abstraction is extracted only after a second concrete use case proves duplication or an existing boundary demands it.
6. **Fail closed.** Unsupported Substrait shapes/capabilities are read-only or rejected; never silently lower through SQL/VTX1 fallback.
7. **Keep provider validation.** A generated SQL string is not proof of provider readiness.
8. **Stop at the slice.** Each issue stops when its stated proof works; do not absorb the next stage.

## Epic delivery map

```text
architecture map (this document)
        ↓
#2651 SQL AS-IS keep/convert/retire inventory
        ↓
#2598 one typed Substrait recipe edited from existing card
        ├──────────────► #2642 general visual projection (only after pilot evidence)
        ↓
#2597 Substrait -> SQLGlot AST -> governed SQL projection
        ↓
Preview/provider cutover task
        ↓
generated identity/destination/storage decision with real evidence
        ↓
#2600 retire superseded VTX1 recipe/SQL authority
```

Parallel bounded concern: recipe persistence must be proven using the existing storage path and only changed when evidence requires it.

## Validation gate

When repository/planning connectivity is available, validate this map against:

- current `main` source seams;
- Planning DB ownership/mechanization;
- active PR overlap;
- actual generated Substrait binding placement;
- actual Graph Draft persistence path;
- current provider-readiness ownership.

Any mismatch updates this document first. The objective is convergence, not preserving a wrong diagram.
