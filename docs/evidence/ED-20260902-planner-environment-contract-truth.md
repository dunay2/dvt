---
title: Planner environment input removal evidence
status: Accepted
date: 2026-09-02
owners:
  - contracts
  - planner
  - api
planning_type: evidence
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
  - packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts
  - packages/@dvt/contracts/src/schema-packs/planner-build.ts
  - packages/@dvt/contracts/src/schema-packs/start-run.ts
  - packages/@dvt/planner/src/domain/types.ts
  - apps/api/src/entrypoints/http/planRoutePlannerEnvelopeParser.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/planner test
    - pnpm --filter @dvt/planner typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm contracts:validate
    - pnpm verify:prepush
---

# Planner environment input removal evidence

## Scope

Issue #2691 removes the optional generic `environment` bag from the public
Planner and planner-backed StartRun inputs. The field was accepted at the
boundary but deliberately absent from the Planner domain input, so its values
could not affect planning and were silently discarded.

The pre-stable contract now makes the existing ownership rule explicit:
environment-dependent values are resolved before Planner admission into typed
graph, policy, ownership, or step configuration. Planner receives only inputs
with deterministic consumers.

## Boundary proof

The same hard cut is applied across the TypeScript contracts, strict schemas,
JSON schema, validation exports, API normalization helpers, HTTP ingress, and
the normative StartRun boundary document. HTTP and shared schema parsing reject
the retired field instead of accepting a compatibility alias.

The change preserves `PlanOwnership.environmentId`, which is an authorization
and ownership scope rather than a generic Planner configuration bag. No
environment resolver, shadow DTO, secondary planner command, database lookup,
provider lookup, process-environment access, or compatibility reader is added.

## Negative behavior

Contract tests prove that planner-backed StartRun and Planner inputs containing
`environment` fail strict parsing. Existing valid graph, policy, selection,
ownership, observability, and persisted-plan branches retain their canonical
paths.
