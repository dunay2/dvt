---
title: ADR-0064 - Substrait as the semantic reference and bounded logical profile for DVT transformations
status: Accepted
date: 2026-08-24
owners:
  - architecture
  - contracts
  - canvas
  - planner
arc_level: ARC-1
---

# ADR-0064 - Substrait as the Semantic Reference and Bounded Logical Profile for DVT Transformations

## Status

Accepted.

## Context

DVT VTX1 proved deterministic visual-to-PostgreSQL SQL generation and reuse of
the existing validation, Preview, PlanRef, and Run rails. VTX2 requires a
stronger boundary: a card must represent transformation meaning independently
of the language used to author or render it.

Growing `VisualTransformRecipeV1` with SQL-shaped clauses or one DVT class per
SQL operation would make DVT own a private relational algebra, type system, and
function vocabulary.

The Substrait study in Issue #2638 and PR #2637 examined logical relations,
expressions, types, extensions, field references, validator maturity,
independent consumers, and TypeScript integration. It closed with
`ADOPT-BOUNDED`.

The study established that the logical core required by VTX2 already exists in
Substrait, while DVT has one important product-specific need that Substrait does
not own safely: stable interactive relation/field identity through rename,
reorder, reload, and lineage.

## Decision

### Substrait is the normative semantic reference

For relational, algebraic, set, expression, type, and function semantics, DVT
MUST consult and reuse Substrait before defining DVT-owned semantics.

The required admission order is:

```text
product capability need
 -> Substrait core semantic if available
 -> Substrait standard extension if required
 -> explicit upstream gap if neither is sufficient
 -> bounded DVT extension only with gap evidence
```

DVT MUST NOT create a parallel hierarchy such as `DvtJoin`, `DvtAggregate`,
`DvtSet`, `DvtWindow`, or a second portable type/function system merely because
the UI or a target language needs a label.

### DVT uses an exact pinned logical profile

DVT MUST NOT treat `latest Substrait` as a floating product contract.

Each production semantic profile identifies the exact Substrait
specification/protobuf/tool compatibility boundary it supports. The first VTX2
profile is limited to capabilities justified by accepted product fixtures.

The logical core is expected to draw from:

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

and the scalar, aggregate, window, cast, conditional, type, and function
semantics required by the accepted profile.

A capability present upstream does not become a DVT capability automatically.
Semantic admission, renderer/provider support, and visual exposure remain
separate decisions.

### DVT owns stable authoring identity and provenance

Raw Substrait ordinals or structural paths MUST NOT become DVT authoring
identity.

DVT owns only the product-specific identity/provenance needed for interactive
authoring, including stable concepts equivalent to:

```text
RelationId
FieldId
source/provenance binding
lineage binding
card/user-facing identity
governance metadata when required
```

This sidecar resolves stable DVT identities to the pinned Substrait plan. It is
not a second IR and MUST NOT duplicate relation, expression, type, or function
semantics.

Rename, reorder, Canvas movement, or reload MUST NOT silently change field or
relation identity.

### Cards project semantics; they do not expose Substrait syntax

The DVT visual language MAY use product vocabulary different from SQL or
Substrait. Labels, icons, gestures, field actions, and relation-composition
wording are presentation metadata projected from admitted semantic
capabilities.

The UI MUST NOT persist a second semantic model solely to obtain friendlier
terminology.

### SQL and future languages are source/target adapters

The supported architecture is:

```text
SQL / visual / future DataFrame source
 -> syntax/source adapter
 -> pinned Substrait logical profile + DVT identity sidecar
 -> governed target renderer/adapter
 -> provider-native validation
```

A SQL parser AST is syntax/dialect representation, not DVT semantic authority.
Project query governance owns canonical SQL architecture and formatting.
Semantic round-trip is required for supported constructs; arbitrary handwritten
format preservation is not.

Future PySpark or other renderers consume the same admitted semantic profile
rather than translate rendered SQL text as the primary architecture.

### Semantic validity is not provider readiness

A valid Substrait plan does not prove that PostgreSQL, Snowflake, or another
target provider accepts equivalent rendered code under its real catalog, type,
function, permission, and version semantics.

Provider-native validation/preflight remains authoritative for execution
readiness. Substrait validation, SQL parsing, and target rendering diagnose only
their own boundaries.

### Logical operators are not runtime steps

These counts are independent:

```text
Substrait logical operator count
!= Canvas card count
!= ExecutionPlan step count
```

A join, set operation, scalar function, aggregate, window, or projection inside
one semantic card MUST NOT create a runtime step merely because it exists in
the logical plan.

Runtime steps exist only at real execution responsibilities or boundaries.

### Substrait is the reference dictionary for future operations

DVT maintains one governed semantic capability catalog for the pinned profile
and candidate upstream capabilities.

The catalog distinguishes at least:

```text
supported-profile
candidate-standard
candidate-extension
gap
out-of-scope
```

Provider support and visual exposure are separate projections from semantic
availability.

Epic #2639 owns capability-dictionary expansion. Its first delivery cuts are
Issues #2640, #2641, #2642, and #2643.

## Pre-1.0 Risk Posture

The Substrait pre-1.0 status is not a blanket blocker. The study identified
bounded moving areas:

- protobuf/message normalization;
- function signatures and extension identifiers;
- timestamp, interval, and UDT details;
- ordering, decimal, and null portability;
- validator version lag;
- producer/consumer version skew; and
- generated TypeScript binding compatibility.

The required mitigation is:

```text
exact version pin
+ profile/version identity
+ serialization golden fixtures
+ upgrade compatibility fixtures
+ explicit migrations or fail-closed behavior
+ provider-native validation
```

Cardinality-changing table-function semantics such as `UNNEST` / `EXPLODE`
remain a known moving/gap area and fail closed until a concrete product slice
admits them.

## Consequences

Positive consequences:

- DVT reuses an existing standard rather than maintaining a private relational
  algebra;
- SQL, PySpark, and future language adapters can converge on one semantic model;
- DVT retains stable identities required for visual authoring without forking
  Substrait semantics;
- the UI can expose a deliberately small product vocabulary while using a much
  larger standard semantic reference dictionary;
- new operations have one standard-first admission path; and
- logical transformation and workflow execution planning remain separate.

Costs and constraints:

- semantic profile and tooling versions must be pinned;
- upgrades require compatibility fixtures and explicit migration/fail-closed
  behavior;
- generated TypeScript bindings/adapters may be required;
- stable DVT identity bindings must resolve against a structurally addressed
  semantic plan; and
- provider-native validation remains necessary after semantic validation.

## Rejected Alternatives

### Build a private DVT relational IR and map it to Substrait later

Rejected because the proposed DVT relation, expression, type, and function
families substantially duplicate standard semantics. A DVT semantic extension
is allowed only for a demonstrated gap.

### Persist raw Substrait as the entire DVT authoring model

Rejected because structural/positional field references do not satisfy DVT's
stable interactive identity, provenance, rename, reload, and lineage needs.

### Use SQL AST as the semantic model

Rejected because SQL ASTs preserve language/dialect syntax and would couple the
card model to SQL.

### Reject Substrait until 1.0

Rejected because the relevant logical core is usable under an exact pinned
profile. Version pins, conformance fixtures, explicit migrations, and provider
validation control the bounded risk.

### Adopt Substrait physical plans as DVT ExecutionPlan

Rejected because DVT already has planner/engine boundaries with different
responsibilities. Logical transformation semantics must not absorb workflow
execution planning.

## Validation

Architecture and implementation slices MUST prove:

- exact Substrait profile/version identity;
- deterministic semantic serialization fixtures;
- stable DVT `RelationId` / `FieldId` through rename, reorder, and reload;
- SQL -> semantic profile -> Card and Card -> semantic profile -> governed SQL
  round-trips for the accepted VTX2 fixture;
- multi-input/multi-join semantics without fake intermediate runtime steps;
- explicit diagnostics for unsupported profile features and version skew;
- provider-native validation after rendering;
- one semantic capability catalog without compiler/UI duplicate operation lists;
  and
- no private duplicate relation/type/function hierarchy without documented gap
  evidence.

## Related Work

- Issue #2638 - closed Substrait study (`ADOPT-BOUNDED`)
- Issue #2594 - VTX2 semantic-card epic
- Issue #2595 - pinned Substrait profile and stable identity sidecar
- Issue #2597 - SQL AST bridge and governed renderer
- Issue #2524 - semantic workload lowering and rigid-topology retirement
- Epic #2639 - Substrait semantic capability dictionary
- [ADR-0034](./ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0035](./ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0018](./ADR-0018_Shared_Kernel_Ownership_Governance.md)

## External References

- https://substrait.io/spec/specification/
- https://substrait.io/relations/logical_relations/
- https://substrait.io/expressions/field_references/
- https://substrait.io/types/type_system/
- https://substrait.io/extensions/
- https://github.com/substrait-io/substrait
- https://github.com/substrait-io/substrait-validator
