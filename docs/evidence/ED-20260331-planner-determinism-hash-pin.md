---
title: Planner determinism vector hash re-pin after plan version canonicalization
status: Accepted
date: 2026-03-31
owners:
  - packages/@dvt/planner
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/planner/test/unit/determinism.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/planner test -- --run test/unit/determinism.test.ts
    - DVT_BOOTSTRAP_VECTOR=1 pnpm --filter @dvt/planner test -- --run test/unit/determinism.test.ts
---

## Summary

`determinism.test.ts` pins a SHA-256 `planId` produced from a fixed input vector.
The pin drifted in commit `eb51d94` (#582) when `PlanAssembler.ts` was updated to
use the canonical execution plan version constant — the serialized plan core changed,
producing a different hash. The test was not updated at that time.

## Change

Updated `expectedPlanId` from `0479dbb6f36694f78c48532d3b33bec40d4eae446b81650249c4a97a4ffb7a25`
to `8afb02826ebe1e7c6262d3e35af7e342feb405e40949ad37cdb0e1aa5e26aef1`.

The new hash was captured with `DVT_BOOTSTRAP_VECTOR=1` at HEAD and reflects the
current canonical serialization of the fixed vector with the plan version constant in place.

## No functional change

This is a test fixture update only. No planner logic, contracts, or domain behaviour
was modified. The determinism guarantee is unchanged — same input still produces the
same `planId` across runs.
