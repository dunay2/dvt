---
title: ADR-0064 - Substrait as the semantic reference and bounded logical profile for DVT transformations
status: Accepted
date: 2026-08-24
last_reviewed: 2026-08-29
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

Clarified on 2026-08-29 to make the already accepted single-authority
consequence explicit: DVT persists one canonical Substrait semantic model plus
its bounded DVT identity/provenance sidecar; cards, dbt artifacts, target SQL,
workloads, ExecutionPlans, lineage and read models are projections of that same
semantic revision.

## Context

DVT VTX1 proved deterministic visual-to-PostgreSQL SQL generation and reuse of
the existing validation, Preview, PlanRef, and Run rails. VTX2 requires a
stronger boundary: the product must represent transformation meaning
independently of the language or surface used to display, export, validate or
execute it.

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
the UI, dbt, a target language, or runtime needs a label.

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
Semantic admission, projection/renderer support, provider support, and visual
exposure remain separate decisions.

### DVT persists one canonical transformation model

The canonical DVT transformation model is:

```text
typed pinned Substrait Plan
+ stable DVT RelationId / FieldId / provenance sidecar
```

DVT MUST NOT persist separate canonical models for Canvas, dbt, PostgreSQL,
ExecutionPlan, lineage, or another representation.

The following are governed projections of one canonical semantic revision:

```text
canonical Substrait semantic revision
        ├── Transform/card UI projection
        ├── dbt project/artifact/execution projection
        ├── provider AST/code target projection
        ├── workload / ExecutionPlan operational projection
        ├── lineage/impact projection
        └── read-model/evidence projection
```

A projection MAY be persisted immutably for execution, audit, reproducibility,
diff, cache, or evidence. Every stored projection MUST bind to the exact
canonical semantic SHA/profile and any required projection/tool/target identity.
A projection MUST NOT silently replace or mutate the canonical semantic
revision.

The current VTX2 authoring path mutates the canonical semantic document through
governed domain/Canvas commands and then regenerates or invalidates projections.

Importing an external SQL-only or dbt-owned asset into canonical DVT semantics
is a distinct migration/compatibility capability. It is not implied by this ADR
and is not part of the current Canvas-first cutover unless separately accepted
from source-first evidence.

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

### Cards project semantics; they are not another model

The DVT visual language MAY use product vocabulary different from SQL, dbt, or
Substrait. Labels, icons, gestures, field actions, and relation-composition
wording are presentation metadata projected from admitted semantic
capabilities.

The UI MUST NOT persist a second semantic model solely to obtain friendlier
terminology.

The product noun `Transform` and Graph Draft kind `dvt:transform` identify a UI
and topology projection. They do not define a separate relational algebra.

### dbt is a projection or explicit external compatibility boundary

When DVT generates or executes through dbt, dbt SQL/YAML/manifest/compiled
artifacts are a projection of the canonical semantic revision. They MUST bind to
the exact semantic SHA/profile and required dbt/tool/target identity.

Generated dbt artifacts MUST NOT become a parallel editable semantic authority.
Planner and Engine MUST consume governed artifact/workload references rather
than parse dbt semantics.

Existing imported or externally owned dbt-project authoring may survive only as
an explicitly named compatibility workflow with separate product language,
ownership, and an exit/review condition. It MUST NOT be described as a second
canonical DVT model or silently overwrite the canonical semantic revision.

This ADR does not require a reverse dbt/SQL-to-Substrait mapper.

### Provider code is a target projection

The current PostgreSQL target architecture is:

```text
canonical Substrait semantic revision
 -> bounded PostgreSQL AST
 -> deterministic rendered PostgreSQL SQL artifact
 -> PostgreSQL provider-native validation
 -> execution/publication
```

A SQL parser AST or rendered SQL is syntax/dialect representation, not DVT
semantic authority. Target projection, formatting, readiness, and execution
diagnose or own only their boundaries.

Future PySpark or other target projections consume the same admitted semantic
profile rather than translate previously rendered SQL as the primary
architecture.

### Operational workloads and ExecutionPlan are projections

The selected Graph Draft, canonical semantic revision, provider projections,
policies, and explicit runtime boundaries are lowered into generic workload
descriptors and immutable ExecutionPlan steps.

Workloads and ExecutionPlans MUST reference and correlate to the canonical
semantic revision. They MUST NOT copy or redefine the Substrait relation,
expression, type, or function model inside Planner/Engine-owned structures.

Planner and Engine do not parse Substrait operators, card presentation, dbt
files, or SQL clauses.

### Semantic validity is not provider readiness

A valid Substrait plan does not prove that PostgreSQL, Snowflake, or another
target provider accepts equivalent rendered code under its real catalog, type,
function, permission, and version semantics.

Provider-native validation/preflight remains authoritative for execution
readiness. Substrait validation and target projection diagnose only their own
boundaries.

### Logical operators are not runtime steps

These counts are independent:

```text
Substrait logical operator count
!= Canvas card projection count
!= ExecutionPlan step count
```

A join, set operation, scalar function, aggregate, window, or projection inside
one canonical semantic revision MUST NOT create a runtime step merely because it
exists in the logical plan.

Runtime steps exist only at real execution responsibilities or boundaries.
Connection/session setup, evidence collection, cleanup, logging, and tracing do
not become steps without an independent lifecycle requirement.

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

Provider support, target/dbt projection support, and visual exposure are
separate projections from semantic availability.

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
- one semantic revision can generate multiple UI, dbt, provider, operational,
  lineage, and evidence projections;
- DVT retains stable identities required for visual authoring without forking
  Substrait semantics;
- projection artifacts can be cached, audited, diffed, and reproduced without
  becoming semantic authority;
- the UI can expose a deliberately small product vocabulary while using a much
  larger standard semantic reference dictionary;
- new operations have one standard-first admission path; and
- logical transformation and workflow execution planning remain separate.

Costs and constraints:

- semantic profile and tooling versions must be pinned;
- every stored projection needs explicit identity/provenance binding;
- upgrades require compatibility fixtures and explicit migration/fail-closed
  behavior;
- generated TypeScript bindings/adapters may be required;
- stable DVT identity bindings must resolve against a structurally addressed
  semantic plan;
- imported/external compatibility surfaces need explicit isolation from the
  canonical model; and
- provider-native validation remains necessary after semantic validation.

## Rejected Alternatives

### Build a private DVT relational IR and map it to Substrait later

Rejected because the proposed DVT relation, expression, type, and function
families substantially duplicate standard semantics. A DVT semantic extension
is allowed only for a demonstrated gap.

### Maintain separate DVT and dbt canonical models

Rejected because it creates authority reconciliation, divergent identity,
round-trip ambiguity, and duplicate lineage/planning semantics. dbt is a
projection/integration path or explicit external compatibility workflow.

### Treat the card or Graph Draft metadata as the semantic model

Rejected because product topology and presentation need different identities
and lifecycles from relational meaning. Cards project the canonical model.

### Persist raw Substrait as the entire DVT authoring model

Rejected because structural/positional field references do not satisfy DVT's
stable interactive identity, provenance, rename, reload, and lineage needs. The
bounded DVT sidecar remains required.

### Use SQL AST or generated dbt files as the semantic model

Rejected because syntax/project artifacts preserve representation-specific
structure and would create parallel authority.

### Require SQL/dbt-to-Substrait round-trip in the current path

Rejected because direct canonical authoring already exists and current VTX2 does
not need a reverse importer. A future migration capability requires a separate
user story and source-first contract.

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
- deterministic canonical semantic serialization fixtures;
- stable DVT `RelationId` / `FieldId` through rename, reorder, and reload;
- product/Canvas commands mutate one canonical semantic revision;
- card projection reprojects the same canonical semantic SHA without duplicate
  relation/expression semantics;
- deterministic PostgreSQL projection binds to the exact semantic SHA/profile;
- dbt projection, when admitted, binds to the exact semantic SHA/profile and is
  non-authoritative;
- workload/ExecutionPlan projection references canonical semantics and derived
  artifacts without copying the relational model;
- multi-input/multi-join semantics without fake intermediate runtime steps;
- explicit diagnostics for unsupported profile, projection, provider, topology,
  and version-skew cases;
- provider-native validation after target projection;
- one semantic capability catalog without compiler/UI duplicate operation lists;
- generated projections cannot silently mutate the canonical semantic revision;
  and
- no private duplicate relation/type/function hierarchy or second model store
  without documented gap evidence.

## Related Work

- Issue #2638 - closed Substrait study (`ADOPT-BOUNDED`)
- Issue #2594 - single canonical Substrait model and projection epic
- Issue #2595 - pinned Substrait profile and stable identity sidecar
- Issue #2655 - durable canonical semantic document
- Issue #2597 - PostgreSQL AST bridge and governed target projection
- Issue #2737 - source-first dbt projection/compatibility contract study
- Issue #2524 - operational workload projection and rigid-topology retirement
- Issue #2723 - runtime execution of operational projections
- Epic #2650 - projection/cutover programme
- Epic #2639 - Substrait semantic capability dictionary
- [ADR-0034](./ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0035](./ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0018](./ADR-0018_Shared_Kernel_Ownership_Governance.md)
