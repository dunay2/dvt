---
title: ADR-0064 - Substrait as the semantic reference and bounded logical profile for DVT transformations
status: Accepted
date: 2026-08-24
last_reviewed: 2026-09-01
owners:
  - architecture
  - contracts
  - canvas
  - planner
arc_level: ARC-1
---

# ADR-0064 - Substrait as the Semantic Reference and Bounded Logical Profile for DVT Transformations

## Status

Accepted. Clarified on 2026-09-01 to state the single-authority consequence
without defining each projection's implementation here.

## Context

VTX1 proved deterministic visual-to-PostgreSQL generation. VTX2 needs
transformation meaning that is independent of its authoring, display, target,
or execution representation. A private DVT relational algebra, or one DVT type
per operator, would duplicate an existing standard.

The study in #2638 and PR #2637 examined Substrait relations, expressions,
types, extensions, field references, validators, consumers, and TypeScript
integration. It concluded `ADOPT-BOUNDED`. DVT still needs stable interactive
relation and field identities through rename, reorder, reload, and lineage.

## Decision

### One canonical semantic model

DVT persists and mutates exactly one transformation model:

```text
typed, version-pinned Substrait Plan
+ stable DVT RelationId / FieldId / provenance sidecar
```

The sidecar maps product identities to the plan. It is not a second IR and must
not duplicate relation, expression, type, or function semantics.

Canvas cards, dbt artifacts, provider code, workloads, ExecutionPlans,
lineage, and evidence are projections of the same semantic revision. A stored
projection must bind its canonical semantic SHA/profile and required
projection, tool, or target identity. A projection cannot overwrite canonical
semantics.

### Bounded Substrait admission

DVT admits capabilities in this order:

```text
product need
 -> Substrait core
 -> Substrait standard extension
 -> documented upstream gap
 -> bounded DVT extension only with gap evidence
```

The production profile pins exact specification, protobuf, validator, and tool
versions. An upstream capability is not a DVT product capability until semantic,
projection, provider, and UI support are independently admitted.

DVT must not add parallel types such as `DvtJoin`, `DvtSet`, or `DvtWindow`, a
second portable function/type catalog, or a private relational IR.

### Projection boundaries

- The UI noun is **Transform** and `dvt:transform` is its graph projection kind.
- Generated dbt files are non-authoritative. External dbt authoring, if kept,
  is an explicitly named compatibility workflow with an exit condition.
- SQL/AST is a provider target projection, not semantic input authority.
- Provider-native validation owns execution readiness after target projection.
- Planner and Engine consume governed workload/artifact references; they do not
  parse Substrait operators, card presentation, dbt files, or SQL clauses.
- Importing external SQL/dbt into canonical semantics is a separate capability,
  not part of the current Canvas-first cutover.

### Semantic, visual, and operational scale are independent

```text
Substrait operator count
!= Canvas card count
!= ExecutionPlan workload/step count
```

An operator, card, generated file, session setup, evidence collection, or log
does not create a workload without an independent lifecycle responsibility.

## Pre-1.0 Risk Posture

Pre-1.0 change is controlled by exact version pins, deterministic serialization
fixtures, upgrade fixtures, explicit migration or fail-closed behavior, and
provider-native validation. Unsupported or version-skewed semantics fail
closed. Cardinality-changing table functions remain outside the profile until
a concrete product slice admits them.

## Consequences

- DVT reuses one standard semantic dictionary and one canonical revision.
- Stable DVT identity remains available without forking Substrait semantics.
- Projections can be cached, diffed, audited, and reproduced without becoming
  editable authority.
- Every stored projection needs explicit identity and provenance binding.
- Compatibility surfaces need an explicit owner and retirement condition.
- Logical transformation and workflow execution remain separate bounded
  contexts.

## Rejected Alternatives

- **Private DVT relational IR:** duplicates standard semantics.
- **Separate DVT/dbt canonical models:** creates reconciliation and lineage
  ambiguity.
- **Card or Graph Draft as semantic model:** couples topology/presentation to
  relational meaning.
- **Raw Substrait without sidecar:** lacks stable interactive identity.
- **SQL AST or generated dbt as authority:** promotes target syntax/artifacts to
  a second model.
- **Mandatory reverse SQL/dbt import:** is unnecessary for the current direct
  authoring path.
- **Substrait physical plans as DVT ExecutionPlan:** collapses semantic and
  workflow responsibilities.

## Validation

Delivery slices must prove:

- pinned profile identity and deterministic canonical serialization;
- stable RelationId/FieldId through rename, reorder, and reload;
- canonical commands mutate one semantic revision;
- stored projections bind the same SHA/profile and cannot write back;
- provider validation follows deterministic target projection;
- multi-input semantics create no fake cards or workloads;
- Planner/Engine do not acquire relational semantics; and
- unsupported capability, topology, provider, or version combinations fail
  closed.

## Related Work

- #2594 and #2650 - canonical-model strategy and cutover
- #2595 and #2655 - pinned profile, sidecar, and durable document
- #2639 - semantic capability catalog
- #2737 - dbt projection/compatibility classification
- #2597 and #2652 - PostgreSQL target projection
- #2524 and #2723 - operational projection and runtime execution
- [ADR-0034](./ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0035](./ADR-0035-planner-public-contract-evolution-protocol.md)
- [ADR-0018](./ADR-0018_Shared_Kernel_Ownership_Governance.md)
