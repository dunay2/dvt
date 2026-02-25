# Migration: v2.1 -> v2.3.1

## Summary

- RFC 8785 JCS canonicalization (json-canonicalize)
- Deterministic sorting (binary compare; no localeCompare)
- Typed error taxonomy (PlannerError + codes)
- Limits enforced (maxNodes/maxEdges/maxDepth/maxPlanSizeBytes/timeoutMs)
- Extensibility: StepKind is string; StepFactory injection
- Post-review patch (v2.3.1):
  - canonicalPlanJson = JCS(planCore), not JCS(plan)
  - sha256(canonicalPlanJson) must equal planId

## Breaking behavior changes

- `canonicalPlanJson` now corresponds to `planCore` only.
- Fixed vector test requires bootstrap once to set expected hash.

## What stays backward compatible

- Default dbt behavior via dbtStepFactory
- Same selection semantics
- Same planVersion "2.3" in planCore metadata
