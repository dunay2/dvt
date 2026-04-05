# @dvt/plan-verifier

Shared, deterministic plan verification helpers.

## Scope

This package provides _enforcement_ primitives adapters MUST share:

- Verify `planId` matches `sha256(canonicalPlanJson)` (canonical JSON already produced by the planner).
- Verify planner `planVersion` compatibility using an explicit runtime compatibility matrix.
- Verify `ExecutionPlan.steps[].stepTypeConfig` per `StepKind` with `IStepTypeRegistry`
  and fail-closed rejection of unregistered kinds by default.
- Provide consistent error codes across adapters (Temporal, Conductor, BullMQ, etc.).

## Non-goals

- No canonicalization (the planner is the source of truth for `canonicalPlanJson`).
- No IO: adapters fetch plan bytes/string and call these functions.
- No Node-only crypto: uses WebCrypto (`globalThis.crypto.subtle`).

## Notes

`verifyPlanOrThrow()` validates version first, then hashes the canonical JSON. This avoids
hashing work when a plan is clearly incompatible. If you want combined diagnostics, call
`verifyPlanVersionOrThrow()` and `verifyPlanIdOrThrow()` separately and aggregate errors.

Preferred mode:

- `verifyPlanVersionOrThrow({ planVersion, runtime })`
- `parseAndVerifyStepTypeConfigsOrThrow({ input, stepTypeRegistry? })`

Compatibility is looked up in `PLAN_RUNTIME_COMPATIBILITY_MATRIX`. Legacy
major/minor gating remains available for older call sites.

## References

- RFC 8785 (JCS): https://www.rfc-editor.org/rfc/rfc8785
- SHA-256 (FIPS 180-4): https://csrc.nist.gov/publications/detail/fips/180/4/final
- SemVer: https://semver.org/
