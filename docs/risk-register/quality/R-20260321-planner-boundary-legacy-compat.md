---
id: R-20260321-PLANNER-BOUNDARY-01
title: Planner typed boundary hardening can drift while legacy manifest compatibility remains published
status: Open
date: 2026-03-21
owners:
  - planner
  - contracts
  - docs
severity: Medium
probability: Medium
---

# R-20260321-PLANNER-BOUNDARY-01 - Planner typed boundary hardening can drift while legacy manifest compatibility remains published

## Context

`R2` hardened the planner public input boundary around typed `graphSource`
ingestion and added runtime validation for both direct input and resolver
output.

That closes the specific defect where contract and runtime could disagree about
valid planner envelopes.

The planner still publishes a legacy compatibility path through raw `manifest`
ingestion, and repo-level status/proposal material can still overstate closure
if that compatibility lane is treated as equal to the typed boundary.

## Risk

If future changes treat the legacy `manifest` path as an ungoverned shortcut,
the repository can drift back into one of these states:

- contract schemas and runtime validation no longer enforce the same one-active-source rule;
- adapter/resolver integrations start returning shapes that are type-correct at
  compile time but insufficiently guarded at runtime;
- status and roadmap docs describe the planner boundary as fully closed while
  the published compatibility posture is still mixed.

## Mitigation

- Keep one-active-source enforcement in both the canonical Zod schema and the
  published JSON schema.
- Keep negative tests for no-source, multi-source, malformed direct
  `graphSource`, and malformed resolver output in the planner boundary suite.
- Keep `PlannerFacade` as the sole application boundary and require runtime
  validation before domain hand-off.
- Keep planner status, evidence, and closeout docs aligned until the raw
  `manifest` compatibility lane is either retired or explicitly accepted as a
  permanent public path.

## Evidence

- `packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV2.schema.json`
- `packages/@dvt/contracts/src/schemas.ts`
- `packages/@dvt/contracts/test/schema-sync.test.ts`
- `packages/@dvt/contracts/test/validation.test.ts`
- `packages/@dvt/planner/src/application/PlannerFacade.ts`
- `packages/@dvt/planner/test/unit/planner-facade.test.ts`
- `docs/evidence/critical/ED-20260320-planner-r2-typed-graph-source-boundary.md`
