---
title: ED-20260318 - Stage 1.1 Planner Canonicalization — Boundary Contract Slices
status: accepted
owners: contracts
date: 2026-03-18
gap: planner-stage-1-1
arc: ARC-1
arc_level: ARC-1
breaking: false
evidence_class: critical
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/ExecutionBindingVerification.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PolicyMappingTable.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts
  - packages/@dvt/planner/src/ports/IArtifactResolver.ts
  - packages/@dvt/contracts/src/index.ts
  - packages/@dvt/contracts/test/schema-sync.test.ts
evidence:
  tests: []
  notes:
    - G-01.1 closed — IPlanExecutabilityValidator canonized in @dvt/contracts.
    - G-01.2 closed — IArtifactResolver port defined in @dvt/planner boundary.
    - G-01.3 closed — ICustomPolicyNamespaceRegistry canonized with validation split note.
    - G-01.4 closed — schema-sync.test.ts cross-validates Zod vs JSON schema, wired as schema:verify.
    - G-01.6 closed — IExecutionBindingVerifier and BindingRejectionCode canonized.
    - G-01.7 closed — AdapterPolicyMappingTable + TEMPORAL_POLICY_MAPPING_TABLE + policyErrorToExecutabilityResult + migration compat note.
    - G-01.8 closed — PlanBindingRecord and StepBindingEntry canonized.
    - G-01.9 closed — IPlanValidationLifecycleStore and PlanValidationState canonized.
    - G-01.10 closed — GRAPH_SOURCE_COMPATIBILITY_POLICY with removal rule; nodes optional in PlannerInputEnvelopeV2.
    - G-01.11 closed — KnownStepKind, STEP_KIND_BRIDGE_REGISTRY, isKnownStepKind, isBridgeRegisteredStepKind canonized.
    - Slices 2–4 — planner-local duplicate contract wrappers removed; domain/types.ts converted to re-export barrel.
---

# ED-20260318 — Stage 1.1 Planner Canonicalization: Boundary Contract Slices

## Summary

All high-severity and medium-severity contract gaps from the Stage 1.1
Planner Canonicalization gap register have been closed. G-01.5 (named delivery
owners / dates) is the sole remaining item; it is a tracking artifact, not a
code or contract gap.

The delivered scope covers 10 architectural gaps (G-01.1 through G-01.11,
excluding G-01.5) plus three structural cleanup slices (Slices 2–4) that
eliminated competing planner-local type definitions.

---

## Think-First Analysis

### Problem summary

`@dvt/planner` was the de facto authority for types that belong in
`@dvt/contracts`. Six high-severity contract gaps (`not_canonicalized` or
`underspecified`) had no TypeScript surface in the canonical contracts package.
The two-phase validity model, the `custom` namespace extension seam, and the
adapter policy mapping pattern all had prose decisions but no corresponding code
contracts.

### Root cause

Contracts package was extended incrementally as features landed, without a
systematic sweep to close architectural gaps documented in the Stage 1.1 gap
register. Planner-local convenience created competing type authority.

### Constraints and invariants

- ADR-0005: contracts are the canonical formalization surface
- ADR-0006: contract tooling governance — canonical source is code, not prose
- ADR-0035: planner public contract evolution protocol
- ADR-0032: compiledCodeRef ownership boundaries
- Hexagonal architecture: ports at contract boundaries, not in implementation
  packages
- No runtime behavior may be changed by contract additions alone
- `@dvt/planner` must not host the namespace registry or step-kind allowlist

### Selected approach

One contract file per architectural concern in
`packages/@dvt/contracts/src/contracts/planner/`, exported from
`packages/@dvt/contracts/src/index.ts`, with the gap register manifest updated
atomically in each commit.

---

## Slices and commits

| Slice | Gap             | Commit    | Artifact                                                                                                                                             |
| ----- | --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | (policy vocab)  | `76ea442` | `PlannerPolicyVocabulary.v2.ts` — `PlannerPolicyClassSet` replaces raw-numeric `PlannerPolicies`                                                     |
| 3     | —               | `cb59d2c` | Planner-local `contracts/planner/` wrappers deleted; `index.ts` rewritten to import from `@dvt/contracts`                                            |
| 4     | —               | `f4a1021` | `domain/types.ts` converted to re-export barrel; internal import paths unchanged                                                                     |
| 5     | G-01.2          | `d30d16c` | `IArtifactResolver` port; empty `contracts/` directory removed                                                                                       |
| 6     | G-01.1          | `37901a8` | `PlanExecutabilityValidation.v1.ts` — `ExecutabilityRejectionCode`, `ExecutabilityValidationResult`, `IPlanExecutabilityValidator`                   |
| 7     | G-01.6 + G-01.8 | `9c1e720` | `ExecutionBindingVerification.v1.ts` — `IExecutionBindingVerifier`, `PlanBindingRecord`, `StepBindingEntry`                                          |
| 8     | G-01.9          | `8de3f8e` | `PlanValidationLifecycle.v1.ts` — `PlanValidationState`, `PlanValidationRecord`, `IPlanValidationLifecycleStore`                                     |
| 9     | G-01.3          | `3375963` | `CustomPolicyNamespaceRegistry.v1.ts` — `ICustomPolicyNamespaceRegistry`, `CustomPolicyNamespaceEntry`, rejection codes, validation split note       |
| 10    | G-01.11         | `34ee8b6` | `StepKindRegistry.v1.ts` — `KnownStepKind`, `STEP_KIND_BRIDGE_REGISTRY`, `isKnownStepKind`, `isBridgeRegisteredStepKind`                             |
| 11    | G-01.7          | `6301b3a` | `PolicyMappingTable.v1.ts` — `AdapterPolicyMappingTable`, `TEMPORAL_POLICY_MAPPING_TABLE`; `policyErrorToExecutabilityResult`; migration compat note |
| 12    | G-01.10         | `6a7e1d0` | `GRAPH_SOURCE_COMPATIBILITY_POLICY` in `ExecutionPlan.v2.ts`; `nodes` optional; one-active-source rule in JSDoc                                      |
| 13    | G-01.4          | `a2c7606` | `test/schema-sync.test.ts` — 23 fixtures, Zod × AJV cross-validation; `schema:verify` script                                                         |

---

## Gap register status after this session

| Gap     | Severity | Status                                               |
| ------- | -------- | ---------------------------------------------------- |
| G-01.1  | high     | ✅ canonicalized                                     |
| G-01.2  | high     | ✅ canonicalized                                     |
| G-01.3  | high     | ✅ canonicalized                                     |
| G-01.4  | medium   | ✅ canonicalized                                     |
| G-01.6  | high     | ✅ canonicalized                                     |
| G-01.7  | high     | ✅ canonicalized                                     |
| G-01.8  | high     | ✅ canonicalized                                     |
| G-01.9  | high     | ✅ canonicalized                                     |
| G-01.10 | medium   | ✅ canonicalized                                     |
| G-01.11 | high     | ✅ canonicalized                                     |
| G-01.5  | medium   | ⚠ role_only — tracking artifact, no code deliverable |

---

## Closure criteria

| Criterion                                                                           | Status                                                                                                     |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| All high-severity gaps closed with TypeScript contract artifacts                    | Met                                                                                                        |
| All contracts exported from `@dvt/contracts/src/index.ts`                           | Met                                                                                                        |
| `@dvt/contracts` build passes with no type errors                                   | Met                                                                                                        |
| `@dvt/planner` build passes with no type errors                                     | Met                                                                                                        |
| `@dvt/adapter-temporal` build and lint pass                                         | Met                                                                                                        |
| `@dvt/contracts` tests: 60 pass, 0 fail                                             | Met                                                                                                        |
| `@dvt/planner` tests: 37 pass, 0 fail                                               | Met                                                                                                        |
| Gap register manifest updated with `canonicalized` + `closedBy` for all closed gaps | Met                                                                                                        |
| Companion closeout doc filed                                                        | Met (`docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-companion-boundary-closeout.md`) |
| No runtime behavior changed                                                         | Met — all additions are pure type/contract definitions                                                     |
| No `as any` or unjustified type assertions introduced                               | Met                                                                                                        |

---

## Verification tuple

- Canonical spec: `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
- Human proposal: `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- Governing ADRs: ADR-0005, ADR-0006, ADR-0032, ADR-0035
- Contract paths:
  - `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/ExecutionBindingVerification.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/PlanValidationLifecycle.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/CustomPolicyNamespaceRegistry.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/StepKindRegistry.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/PolicyMappingTable.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/PlannerPolicyVocabulary.v2.ts`
  - `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts`
  - `packages/@dvt/planner/src/ports/IArtifactResolver.ts`
- Tests:
  - `packages/@dvt/contracts/test/schema-sync.test.ts`
  - `packages/@dvt/contracts/test/planner-policy-vocabulary.test.ts`
  - `packages/@dvt/planner/test/unit/determinism.test.ts`
  - `packages/@dvt/planner/test/unit/step-registry-integration.test.ts`

---

## Debt introduced

None. All bridge registries (`STEP_KIND_BRIDGE_REGISTRY`, `GRAPH_SOURCE_COMPATIBILITY_POLICY`)
are explicitly documented as governed staging areas, not permanent structures.

## No-stub evidence

- No placeholder implementations. All ports are pure interfaces with no bodies.
- `STEP_KIND_BRIDGE_REGISTRY` is empty by design — no provisional kinds are
  currently sanctioned at Stage 1.1 canonicalization time.
- `policyErrorToExecutabilityResult` is a fully specified utility function, not
  a TODO stub.
