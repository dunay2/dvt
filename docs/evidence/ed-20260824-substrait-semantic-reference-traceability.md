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
evidence:
  tests:
    - pnpm traceability:adr0
    - pnpm --filter @dvt/contracts typecheck
    - pnpm lint:md:changed
    - pnpm docs:gov:frontmatter:changed
    - pnpm docs:gov:links:changed
---

## Summary

This evidence records the normative traceability added for ADR-0064 while the
full Substrait-backed semantic transformation subsystem remains target VTX2
architecture.

No runtime, planner, provider, persistence, or transformation behavior changes
in this slice.

## Implemented Consequence

`ExecutionPlan.v1.ts` already models generic runtime steps independently from
SQL or relational operator taxonomy. ADR-0064 makes that existing separation an
explicit architectural invariant:

```text
Substrait logical operator count
!= Canvas card count
!= ExecutionPlan step count
```

The source change in this PR is therefore comment-only traceability:

- `@baseline ADR-0064` binds the existing `ExecutionPlan` contract to the
  decision that logical transformation semantics stay outside runtime planning;
- no Substrait plan, relation, expression, type, or function is added to
  `ExecutionPlan`;
- no step kinds, schemas, planner inputs, retries, dependencies, or runtime
  behavior are changed.

## Target Architecture Evidence

The same PR adds target-only architecture documentation for the future semantic
transformation subsystem:

- ADR-0064 - bounded Substrait semantic reference/profile;
- VTX2 Substrait semantic reference design;
- target semantic-transformation subsystem entry in system architecture.

Those documents are explicitly marked as target architecture and are not used
as evidence that the Substrait production profile/sidecar is already
implemented.

## Validation

Required gates for this slice are:

- changed-file Prettier/ESLint and Markdown lint;
- ARC policy/document evidence validation;
- ADR-0000 forward/reverse traceability;
- contracts typecheck/tests selected by CI;
- documentation filename/frontmatter/link/governance checks;
- repository PR quality, contracts/determinism, test, CodeQL, and dependency
  review workflows.

The PR is merged only after required checks complete successfully.
