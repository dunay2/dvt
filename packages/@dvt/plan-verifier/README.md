# @dvt/plan-verifier

Shared, deterministic plan verification helpers.

## Scope

This package provides _enforcement_ primitives adapters MUST share:

- Verify `planId` matches `sha256(canonicalPlanCoreJson)` (canonical JSON already produced by the planner).
- Verify planner `planVersion` admission using an explicit runtime admission matrix.
- Verify `ExecutionPlan.steps[].stepTypeConfig` per `StepKind` with `IStepTypeRegistry`
  and fail-closed rejection of unregistered kinds by default.
- Provide consistent error codes across active runtime adapters.

## Non-goals

- No canonicalization (the planner is the source of truth for `canonicalPlanCoreJson`).
- No IO: adapters fetch plan bytes/string and call these functions.
- No Node-only crypto: uses WebCrypto (`globalThis.crypto.subtle`).

## Notes

`verifyPlanOrThrow()` validates version first, then hashes the canonical JSON. This avoids
hashing work when a plan is not admitted. If you want combined diagnostics, call
`verifyPlanVersionOrThrow()` and `verifyPlanIdOrThrow()` separately and aggregate errors.

Preferred mode:

- `verifyPlanVersionOrThrow({ planVersion, runtime })`
- `parseAndVerifyStepTypeConfigsOrThrow({ input, stepTypeRegistry? })`

Admission is looked up in `PLAN_RUNTIME_ADMISSION_MATRIX`. There is no legacy
major/minor fallback in active development.

## References

- RFC 8785 (JCS): https://www.rfc-editor.org/rfc/rfc8785
- SHA-256 (FIPS 180-4): https://csrc.nist.gov/publications/detail/fips/180/4/final
- SemVer: https://semver.org/
