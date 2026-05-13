---
title: AR-D6 Triple Versioning Governance Review
status: Accepted
owner: Architecture / Planner / Contracts / Engine
last_reviewed: 2026-05-13
planning_type: review
---

# AR-D6 Triple Versioning Governance Review

**Task:** `AR-D6`  
**Question:** should `planVersion`, `schemaVersion`, and `contractVersion`
remain separate governance dimensions while only one plan-version line is
active?

## Governing Sources

- [Governance Document And Rule Inventory](../../status/governance-document-rule-inventory.md)
- [Deep Technical Architectural Review - DVT+ System](./20260402-deep-architectural-review.md)
- [ADR-0017: ExecutionPlan Schema Versioning & Compatibility](../../../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)
- [ADR-0036 - ExecutionPlan planVersion registry and runtime admission matrix](../../../adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md)
- [ADR-0042 - ExecutionPlan canonical identity unification](../../../adr/ADR-0042-execution-plan-canonical-identity-unification.md)
- [Plan Admission Matrix](../../../architecture/components/engine/contracts/plan-admission-matrix.md)
- `packages/@dvt/contracts/src/contracts/planner/PlanVersion.v1.ts`
- `packages/@dvt/contracts/src/contracts/planner/PlanAdmission.v1.ts`
- `packages/@dvt/contracts/test/plan-admission-matrix.contract.test.ts`
- `packages/@dvt/contracts/test/plan-admission-matrix.architecture.test.ts`

## Current Evidence

The active version surfaces are:

| Surface           | Current value | Current owner                    | Runtime use                                            |
| ----------------- | ------------- | -------------------------------- | ------------------------------------------------------ |
| `planVersion`     | `1.0`         | `PlanVersion.v1.ts` / ADR-0036   | semantic plan grammar and admission key                |
| `schemaVersion`   | `v1.2`        | `ExecutionPlan.v1.ts` / ADR-0017 | encoded payload shape and admission key                |
| `contractVersion` | `1.0.0`       | `ExecutionPlan.v1.ts` / ADR-0042 | shared-kernel contract marker stored with plan records |

Only one `planVersion` line is active. That is intentional in ADR-0036: the
registry exists to avoid scattered literals and to make a future hard-cut
governance change explicit. It does not claim that multiple active plan
versions exist today.

The other two dimensions are not redundant aliases of `planVersion`:

- `schemaVersion` participates in the executable
  `(planVersion, schemaVersion)` admission matrix. The current admitted pair is
  exactly `1.0` / `v1.2`; older, future, blank, and malformed pairs reject.
- `contractVersion` is persisted with canonical plan records and verified
  against `ExecutionPlan.metadata.contractVersion`; it marks the shared-kernel
  contract line independently from the plan grammar.

## Cost Assessment

The governance overhead is real:

- future changes require touching ADRs, component docs, contract constants,
  matrix tests, runtime admission tests, evidence, and risk records;
- every plan-format change carries explicit negative tests for unsupported
  pairs;
- writers must understand three names that sound similar but govern different
  failure modes.

This cost is acceptable at the current stage because the boundaries are already
load-bearing:

- `planVersion` answers whether this runtime understands the semantic plan
  grammar;
- `schemaVersion` answers whether this runtime understands the serialized
  payload shape;
- `contractVersion` answers which shared contract line wrote and stores the
  artifact.

Collapsing them now would remove a tested fail-closed boundary while the system
is still hardening plan storage, runtime admission, and canonical planner-to-
engine identity.

## Decision

Retain the triple versioning model and defer simplification.

The six-month checkpoint named by the 2026-04-02 architectural review has not
elapsed. As of 2026-05-13, only one `planVersion` line remains active, but
`schemaVersion` and `contractVersion` are already used by executable admission,
record validation, and architecture guard tests. Removing them now would
increase drift risk more than it would reduce governance cost.

## ADR Addendum

The decision is recorded in
[ADR-0036](../../../adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md)
as a 2026-05-13 addendum:

- keep `planVersion = 1.0` as the single active development line;
- keep `schemaVersion` and `contractVersion` separate;
- do not add new version lines to justify the machinery;
- revisit simplification only at the later checkpoint or when a real plan
  grammar/schema/contract split requires another line.

## Follow-Up Rule

Future simplification is allowed only if a fresh review proves all of these:

1. no second plan-version line has appeared by the checkpoint;
2. plan admission can remain fail-closed without separate `schemaVersion`;
3. plan records can retain contract provenance without separate
   `contractVersion`;
4. ARC evidence and risk records cover any contract or engine surface changes.

## Validation Target

This review is docs-only. Required closeout validation:

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm verify:prepush`
