---
title: MVP-D1 Residual Risk Baseline Review
status: Review
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-03-31
planning_type: review
---

# MVP-D1 Residual Risk Baseline Review

## Purpose

Define the residual-risk baseline accepted for the MVP backend operability reset,
including what is explicitly deferred, who owns each deferred item, and why
those items are non-blocking for the current MVP control-plane definition.

## Scope

Aligned to [MVP Backend Operability Baseline Roadmap](../../proposals/nice-to-have/architecture/mvp-backend-operability-baseline-roadmap-20260329.md):

- `IN` scope remains the currently implemented and testable backend control-plane.
- This review does not add new runtime behavior or expand MVP promises.

## Constraints

- `MVP-A1` and `MVP-B1` are now closed against the frozen backend MVP
  inventory.
- This review now serves as the locked residual-risk baseline for MVP backend
  operability and may only tighten scope, never expand it without roadmap +
  lane + risk-register updates in the same PR.

## Accepted Residual Risks

1. Lifecycle depth beyond baseline operability remains deferred:
   retention completion, deferred deletion, restore automation.
2. Scale optimization remains deferred:
   partitioning, read-replica rollout, deep concurrency tuning.
3. Admission/backpressure maturity remains deferred:
   advanced saturation controls beyond current accepted baseline.
4. GTM/compliance packaging remains deferred:
   pilot enablement, compliance pack, billing integration.

## Deferred Items And Ownership

| Deferred item                                                                                    | Owner lane      | Why non-blocking for MVP                                                                  |
| ------------------------------------------------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------------- |
| Retention completion and deletion/restore automation (`run event log retention + TTL`, `G5-PR2`) | Lane D          | MVP is defined as operability of existing control-plane routes, not lifecycle completion. |
| Event log partitioning and read-replica query path                                               | Lane D          | These are scale programs for post-MVP traffic envelopes.                                  |
| Temporal to API backpressure deepening                                                           | Lane D / Lane C | Current MVP acceptance does not require saturation-hardening depth.                       |
| Cost attribution and billing integration                                                         | Lane D          | Finance/reporting depth is out of MVP backend operability scope.                          |
| Enterprise pilot and compliance onboarding pack                                                  | Lane D          | GTM readiness is sequenced after MVP operability freeze.                                  |

## Guardrails

1. No deferred item can be marketed as MVP capability without roadmap + lane
   scope update in the same PR.
2. Any change to MVP claim language must update:
   roadmap, lane YAML, and risk register together.
3. If `MVP-A1` or `MVP-B1` finds mismatch between claims and evidence, this
   baseline must be revised before closure.

## Closure Confirmation (2026-03-31)

All original `MVP-D1` closure conditions are now satisfied:

1. `MVP-A1` inventory is accepted and stable.
2. `MVP-B1` claim-to-evidence matrix is stable and executable.
3. The residual risk entry is synchronized with deferred ownership and
   blockers.
4. Execution workboard can now reflect `done` while the risk register remains
   open for longer-horizon drift monitoring.
