---
title: ADR-0064 Substrait semantic reference traceability evidence
status: Accepted
date: 2026-08-24
owners:
  - architecture
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitProfile.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
  - packages/@dvt/contracts/src/substrait.ts
evidence:
  tests:
    - pnpm traceability:adr0
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts test -- test/dvt-substrait-profile.contract.test.ts test/dvt-substrait-capability-catalog.contract.test.ts
    - pnpm lint:md:changed
    - pnpm docs:gov:frontmatter:changed
    - pnpm docs:gov:links:changed
---

## Summary

This evidence records the production traceability for ADR-0064 across two
separate concerns:

- the exact pinned Substrait semantic Plan/profile plus DVT stable authoring
  sidecar delivered by #2595/#2646;
- the bounded SUB1 semantic capability catalog owned by #2640.

The catalog is product-governance metadata over selected upstream identities. It
does not add another relational IR and it cannot enable provider execution or
visual authoring by entry presence alone.

## Runtime boundary remains unchanged

`ExecutionPlan.v1.ts` models generic runtime steps independently from SQL or
relational operator taxonomy. ADR-0064 keeps this architectural invariant:

```text
Substrait logical operator count
!= Canvas card count
!= ExecutionPlan step count
```

No Substrait relation, expression, type or function becomes a runtime step kind
through the capability catalog.

## Production Substrait profile

`DvtSubstraitProfile.v1.ts` owns the exact semantic profile boundary:

- Substrait `v0.101.0`;
- commit `2653e55516c8c07529cde9bc81c64e4ae3537515`;
- verified serialized Plan envelope;
- stable DVT `RelationId` / `FieldId` authoring sidecar;
- explicit profile/version compatibility diagnostics.

The capability catalog imports that profile reference rather than restating a
second version authority.

## Capability catalog consequence

`DvtSubstraitCapabilityCatalog.v1.ts` adds one deterministic read model with two
structurally distinct entry forms:

1. standard-backed entries whose IDs are derived from exact Substrait core
   selectors or official `extension:io.substrait:*` identities;
2. DVT product needs that are explicitly `candidate-extension` or `gap` and
   cannot pretend to own an upstream semantic identity.

The initial seed is deliberately bounded to VTX2 and VTX1 migration needs. It
records zero `supported-profile` entries because #2641 owns semantic admission
and conformance evidence.

Provider support remains a separate renderer/dialect projection. Visual labels
and actions remain #2642 presentation metadata.

## Current upstream drift review

The #2640 study compared the pinned `v0.101.0` profile with current upstream
`v0.102.0`. The material delta is limited to window-bound evolution and a
decimal `negate` overload; it does not justify silently repinning the product
profile. #2643 remains the only owner of profile upgrade and capability-delta
admission.

## Validation

Required gates for the catalog slice are:

- focused contracts typecheck/tests and deterministic serialization tests;
- ARC policy/document evidence validation;
- ADR-0000 forward/reverse traceability;
- architecture dependency boundaries;
- repository contracts/determinism, test, CodeQL and dependency-review
  workflows.

The PR is merged only after required checks complete successfully.
