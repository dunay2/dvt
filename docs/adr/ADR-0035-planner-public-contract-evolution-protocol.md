---
title: ADR-0035 - Planner Public Contract Evolution Protocol
status: Accepted
owner: Architecture / Planner / Contracts
last_reviewed: 2026-03-18
---

# ADR-0035 - Planner Public Contract Evolution Protocol

## Status

Accepted.

## Context

Stage 1.1 already fixes canonical ownership for the public planner contracts:

- `ExecutionPlanV2`
- `PlannerInputEnvelopeV2`
- `IExecutionPlanner`

Those types must live in `@dvt/contracts`, but their package location does not
resolve who initiates semantic changes or what the contracts owner is allowed to
block. Without an explicit protocol, package ownership turns into an implicit
semantic veto and the planner owner becomes dependent on undefined review scope.

The repository therefore needs one canonical protocol that answers:

- who initiates semantic changes to public planner contracts;
- what the contracts owner reviews;
- what the contracts owner does not review;
- where contributors look when asking how to change one of these contracts.

## Decision

This ADR is the single canonical protocol-of-record for changing the public
planner contracts `ExecutionPlanV2`, `PlannerInputEnvelopeV2`, and
`IExecutionPlanner`.

### 1. Initiation and semantic authorship

- The planner owner is the semantic author for those three public planner
  contracts.
- Any proposal that changes planning meaning, planner-produced behavior,
  planner boundary semantics, or planner-facing lifecycle semantics MUST be
  initiated by the planner owner.
- The planner owner is therefore the default PR author or sponsoring owner for
  such changes, even though the physical files live in `@dvt/contracts`.

### 2. Contracts owner review scope

- The contracts owner is the backward-compatibility and package-coherence gate
  for those three public planner contracts.
- The contracts owner reviews only for shared-kernel compatibility, package
  coherence, schema alignment, publication discipline, and cross-consumer
  safety.
- The contracts owner is not the semantic arbiter of planning behavior merely
  because the canonical type lives in `@dvt/contracts`.

### 3. Review scope table

| Contracts owner reviews                                                  | Contracts owner does not review                        |
| ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Whether existing imports or consumers break                              | Whether the planning decision is the right one         |
| Whether the change requires a major version bump                         | Whether the field or concept should exist semantically |
| Whether other `@dvt/contracts` consumers are impacted                    | Whether the planner semantics are desirable            |
| Whether compatibility notes or changelog updates are present             | Planner-domain design preference disputes              |
| Whether schemas, fixtures, and published contract surfaces stay coherent | Planner implementation strategy choices                |

### 4. Rejection rule

The contracts owner may reject a proposed change to these contracts only for
compatibility, package-coherence, schema/publication, or cross-consumer impact
reasons.

The contracts owner may not reject solely because they disagree with the
underlying planner semantics when the planner owner is the semantic author and
the change remains within established repository architecture.

### 5. Required change package

Any approved change to these contracts MUST include, as applicable:

- the planner-owner proposal or sponsoring change;
- updated schemas and fixtures;
- compatibility note or versioning note when consumer impact exists;
- evidence that planner and engine assumptions remain aligned.

### 6. Worked example

If the planner needs to add a field `planVersion` to `ExecutionPlanV2`, the
expected flow is:

1. The planner owner opens or sponsors the PR against the canonical contract in
   `@dvt/contracts`.
2. The planner owner explains the semantic reason for `planVersion` and updates
   the planning proposal or linked design source as needed.
3. The contracts owner reviews the PR only for questions such as:
   - Does this break existing consumers or imports?
   - Does this require a major version bump or compatibility note?
   - Are schemas, fixtures, and published surfaces still coherent?
4. If those compatibility and package checks pass, the contracts owner approves
   and the planner owner remains the semantic authority for the change.

## Consequences

- `@dvt/contracts` remains the canonical publication home for public planner
  contracts.
- The planner owner remains the semantic author for those contracts.
- The contracts owner becomes a compatibility gatekeeper, not a hidden planning
  design veto.
- Contributors now have exactly one canonical place to answer: "How do I
  propose a change to `ExecutionPlanV2`, `PlannerInputEnvelopeV2`, or
  `IExecutionPlanner`?"
