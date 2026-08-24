---
title: VTX2 Substrait semantic reference design
status: Approved direction
owner: Architecture / VTX2
last_reviewed: 2026-08-24
planning_type: proposal
baseline_sha: ffee4ee479b683e3346d5a96749229f798d4ca41
---

# VTX2 Substrait Semantic Reference Design

## Purpose

This design applies ADR-0064 to VTX2 and replaces the earlier model of growing
`VisualTransformRecipeV1` with SQL-shaped clauses.

The target flow is:

```text
SQL / visual / future language frontend
 -> source adapter
 -> pinned Substrait logical profile
 +  DVT stable authoring identity/provenance sidecar
 -> DVT card projection/edit
 -> governed target renderer
 -> provider-native validation
 -> existing planner / ExecutionPlan boundary
```

This is target architecture. It does not claim that current `main` already
implements the complete path.

## Decisions Already Closed

The following are not open research questions:

1. Issue #2638 closed `ADOPT-BOUNDED` for Substrait.
2. Substrait is the semantic reference for relational, algebraic, set,
   expression, type, and function semantics.
3. DVT does not duplicate that vocabulary privately unless a demonstrated
   upstream gap requires a bounded extension.
4. DVT owns stable `RelationId` / `FieldId`, provenance, lineage binding, and
   user-facing card identity where Substrait's structural addressing is
   insufficient for interactive authoring.
5. The DVT identity/provenance sidecar is not a second IR.
6. Cards are the primary product representation of transformation intent.
7. SQL is an input/output representation and governed renderer, not the card
   semantic model.
8. Provider-native preflight remains the final execution-readiness authority.
9. Substrait logical-operator count, Canvas card count, and `ExecutionPlan` step
   count are independent.
10. The full Substrait universe is a reference dictionary; DVT admits only a
    bounded supported profile.

## AS-IS Reuse

### Visual transformation proof

`VisualTransformRecipeV1` already proves useful product invariants:

- stable output IDs;
- explicit input references;
- rename through output name;
- scalar operation chains;
- casts, constants, functions, and simple filters;
- canonical serialization; and
- mutually exclusive `visual | sql` authoring authority.

The current compiler also proves deterministic recipe-to-PostgreSQL SQL. These
are migration assets, not reasons to preserve the current recipe shape as the
future semantic authority.

### Existing boundaries retained

VTX2 reuses:

- `WorkspaceGraphAuthoringDraft` for Canvas semantic persistence;
- `CanonicalNode` / `CanonicalEdge` and generic graph/planner ingress;
- current Node Properties and Canvas authoring lifecycle;
- existing PostgreSQL structural/provider readiness owned by Issue #2333;
- generic Planner / `ExecutionPlan` boundary;
- provider/materialization adapter ownership; and
- existing lineage and field projections where they can derive from the
  semantic plan and stable DVT bindings.

### Legacy topology to retire

The current SQL-first path still contains assumptions equivalent to:

```text
exactly one source
exactly one sql_transform
exactly one sink
exactly two edges
```

Those are vertical-test mechanics, not DVT architecture. Issue #2524 owns their
removal or version confinement.

## Target Semantic Authority

### Pinned Substrait profile

The production implementation MUST pin an exact Substrait semantic profile and
compatible protobuf/tool versions.

The initial VTX2 relation families are drawn from standard Substrait semantics:

```text
Read/Input
Project
Filter
Join
Set
Aggregate
Sort
Fetch
```

The initial expression/type/function profile includes only what accepted VTX2
fixtures require:

```text
field references
literals
scalar functions/operators
casts
conditional expressions
aggregate functions
window functions
required portable types and nullability
```

A capability existing upstream does not automatically enter the supported DVT
profile.

### DVT stable identity/provenance sidecar

Substrait field references are structural/positional. DVT needs stable identity
through rename, reorder, reload, and lineage.

The bounded DVT sidecar therefore owns concepts equivalent to:

```text
profileId
RelationId
FieldId
source/provenance binding
lineage binding
semantic relation/field path or ordinal binding
user-facing/card identity metadata where required
```

The exact contract belongs to Issue #2595.

The sidecar MUST NOT redefine:

```text
Join
Filter
Aggregate
Set
Window
portable type semantics
function semantics
```

Those remain owned by the pinned Substrait profile.

## Source Adapters

### Visual authoring

```text
card / field command
 -> admitted semantic capability lookup
 -> semantic plan mutation
 -> stable identity binding mutation when required
 -> card projection
```

Dragging a function onto a field is one possible gesture. Keyboard and menu
paths must reach the same semantic command.

### SQL authoring

```text
SQL input
 -> dialect parser AST
 -> supported AST-to-Substrait-profile mapping
 -> stable DVT binding resolution
 -> card projection
```

A SQL parser AST is a syntax/dialect representation. It is not persisted as DVT
semantic truth.

Issue #2597 owns the SQL bridge. Issue #2618 evaluates SQLGlot as a bounded AST
adapter while the existing PostgreSQL parser/readiness path remains reusable.

### dbt / Jinja

```text
dbt/Jinja source
 -> dbt-native compile/macro resolution when required
 -> supported SQL/AST
 -> semantic mapping
```

Unresolved arbitrary macros are not silently interpreted as relational
semantics.

## Card Projection

The card projects the semantic plan plus stable DVT bindings.

It communicates:

- participating relations;
- produced fields;
- field transformations and calculations;
- rules that alter rows or grain;
- relation composition; and
- the resulting relation available downstream.

The default card does not need to expose `JoinRel`, `ProjectRel`, SQL keywords,
protobuf structure, or generated aliases such as `A/B/C`.

Issue #2635 owns the visual language. Issue #2598 owns the authoring surface.

## Multi-Input Composition

Issue #2634 owns composition behavior.

When cards A and B are semantically composed, the affected branch may become
one resulting card AB while retaining typed source/provenance references in the
semantic plan and DVT bindings.

The Canvas must not imply:

```text
execute A
execute B
execute Join
```

when the actual target workload is one query/transformation reading A and B.

Multiple joins can remain one card and one semantic workload when no explicit
materialization, provider-transfer, reusable relation, check, or control
boundary exists.

## Target Rendering

A target renderer consumes the admitted semantic profile, DVT bindings, target
capabilities, and project policy.

For SQL:

```text
semantic plan
+ DVT bindings
+ target dialect
+ project SQL policy
 -> deterministic governed SQL
 -> provider-native validation
```

Project policy may govern:

- allowed query categories and forms;
- alias and naming rules;
- CTE style;
- indentation and spacing;
- clause layout; and
- dialect policy.

The acceptance invariant is semantic, not textual:

```text
canonical semantic meaning before render
==
canonical semantic meaning after parsing rendered supported SQL
```

Future PySpark or other renderers lower from the same semantic profile. They do
not translate rendered SQL text as their primary architecture.

## Planner and Runtime Handoff

The Substrait semantic plan is not the DVT `ExecutionPlan`.

The target handoff remains:

```text
semantic card
 -> governed render/admission artifact
 -> semantic workload boundary
 -> existing generic graph/planner
 -> ExecutionPlan
 -> provider/workflow runtime adapter
```

A separate runtime step exists only for a real execution responsibility such as:

- materialization;
- provider transfer;
- control/check boundary;
- independent retry/cancel/output semantics; or
- another explicitly modeled runtime concern.

A `Join`, `Project`, `Aggregate`, `Window`, or scalar function inside one card is
not a runtime step merely because it exists in the logical plan.

## Semantic Capability Dictionary

Epic #2639 owns the standard-first semantic dictionary used to expand DVT.

A capability is classified as:

```text
supported-profile
candidate-standard
candidate-extension
gap
out-of-scope
```

Semantic availability is separate from:

```text
renderer support
provider support
visual exposure
```

### Admission rule

Every new capability follows:

```text
product need
 -> check Substrait core
 -> check standard Substrait extension mechanisms
 -> prove upstream gap if missing
 -> bounded DVT extension only when justified
 -> renderer/provider conformance
 -> visual projection
```

A proposal that starts by creating `DvtJoin`, `DvtPivot`, `DvtWindow`, a new
portable DVT type, or a DVT function identity before checking Substrait fails
architecture admission.

Issue #2640 owns the machine-readable catalog. Issue #2641 owns standard-first
admission and conformance. Issue #2642 owns projection into card/field
authoring. Issue #2643 owns profile upgrade governance.

## Versioning and Compatibility

Substrait remains pre-1.0, but Issue #2638 established that the required logical
core is usable under an exact bounded profile.

Known risk areas include:

- protobuf/message normalization;
- function signature and extension-identifier changes;
- timestamp/interval/UDT evolution;
- ordering, decimal, and null portability nuances;
- validator version lag;
- producer/consumer version skew; and
- generated TypeScript binding changes.

The mitigation is:

```text
exact version pin
profileId
serialization golden fixtures
upgrade compatibility matrix
explicit migration or fail-closed policy
provider-native validation
```

Diagnostics must distinguish:

```text
invalid semantic plan
unsupported semantic profile
validator/tool version mismatch
consumer incompatibility
renderer limitation
provider rejection
```

A version/tool mismatch must not be reported as semantic corruption.

## Known Bounded Gaps

The studied profile identifies cardinality-changing table-function semantics
such as `UNNEST` / `EXPLODE` as moving/incomplete for the current adoption.

VTX2 fails closed for those semantics until a concrete product slice evaluates
the relevant upstream relation/extension behavior.

Substrait physical plans and JSON local-file semantics are not required by the
current semantic-card vertical.

## Authority Ownership

- Relational, expression, type, and function semantics: pinned Substrait profile.
- Stable relation/field authoring identity: DVT sidecar/bindings.
- Semantic capability admission: Epic #2639 and Issues #2640 / #2641.
- Canvas/workflow topology: Workspace Graph Draft / canonical graph.
- Visual terminology and interaction: DVT card projection / Issue #2635.
- SQL syntax parsing: selected SQL parser adapter.
- Canonical SQL style/governance: project query policy + target renderer.
- Provider execution readiness: provider-native preflight / Issue #2333.
- Execution dependency and step planning: generic Planner / `ExecutionPlan`.
- Materialization mechanics: provider/materialization adapter boundary.

No downstream projection may silently replace an upstream authority.

## Delivery Map

```text
#2638 Substrait decision [closed]
      |
      v
#2595 pinned profile + stable DVT sidecar
      |
      +--> #2640 capability catalog
      |      |
      |      +--> #2641 admission / conformance
      |      +--> #2642 visual projection
      |      +--> #2643 profile upgrades
      |
      +--> #2597 SQL bridge / renderer
      +--> #2598 card authoring
      +--> #2634 multi-input composition
      +--> #2635 visual language
                 |
                 v
             #2599 end-to-end proof
                 |
                 v
             #2600 reduction

#2524 proceeds in parallel for real workload lowering and legacy topology removal.
```

The issue-number lines above are inside a code block and describe dependency
shape only; GitHub issues remain the task authority.

## Convergence and Removal

After the semantic path is accepted:

- `VisualTransformRecipeV1` becomes a bounded compatibility input or is retired;
- `selectedColumns` is no longer current field-authoring truth;
- linear recipe operation lists do not compete with the semantic expression
  model;
- compiler/Web/provider layers do not keep duplicate semantic function/type
  catalogs when the supported-profile catalog can project discovery metadata;
- SQL-specific `groupBy/having/join/window` recipe growth is avoided;
- fixed exactly-three-node SQL-first validation no longer governs current
  product admission; and
- no one-node-per-operation taxonomy is introduced.

Compatibility artifacts survive only with a named consumer, version obligation,
and expiry/removal condition.

## Acceptance

VTX2 is accepted when a real fixture proves:

```text
SQL
 -> AST
 -> pinned Substrait profile + stable DVT bindings
 -> Card
 -> visual semantic edits
 -> same semantic authority
 -> governed SQL
 -> provider-native validation
 -> Preview
```

The fixture includes multi-input joins, nested field expressions,
aggregation/grain, post-aggregate filtering, and window semantics admitted by
the pinned profile.

## References

Repository work:

- Issue #2638 / PR #2637 - closed Substrait study
- Issue #2594 - VTX2 parent epic
- Issue #2595 - pinned profile + stable DVT sidecar
- Issue #2597 - SQL bridge / governed renderer
- Issue #2634 - multi-input composition
- Issue #2635 - visual language
- Epic #2639 - semantic capability dictionary
- Issue #2524 - workload lowering / rigid-topology removal

External:

- https://substrait.io/spec/specification/
- https://substrait.io/relations/logical_relations/
- https://substrait.io/expressions/field_references/
- https://substrait.io/types/type_system/
- https://substrait.io/extensions/
- https://github.com/substrait-io/substrait
