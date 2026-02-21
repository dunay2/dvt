# ADR-0017: ExecutionPlan Schema Versioning & Compatibility

- **Status**: Proposed
- **Date**: 2026-02-21
- **Owners**: Planner / Engine Domain / Adapter Layer
- **Related**:
  - ADR-0012 (Plan bytes boundary)
  - IWorkflowEngine.v2.0.md _(update required)_
  - ExecutionSemantics.v2.0.md _(update required)_
  - AdapterDevelopmentGuide.md _(update required)_
  - RunEvents.v2.0.1.md _(idempotency context)_

---

## Context

`ExecutionPlan` is the canonical artifact produced by the planning layer and consumed by workflow engine adapters (Temporal, Conductor, future engines).

The codebase already distinguishes:

- `planVersion`: **revision** of a concrete plan instance (e.g. "1", "2", "3") and participates in idempotency
- `schemaVersion`: **format/schema** version of the `ExecutionPlan` JSON structure (e.g. "v1.0") and does **not** participate in idempotency

As DVT+ evolves, the `ExecutionPlan` schema will change. Without explicit versioning rules:

- Adapters may execute plans they do not understand.
- Breaking changes may reach production silently.
- Partial execution of incompatible plans may corrupt state.
- Planner and adapters may drift independently.
- Runs in flight may become unstable if plan URIs are mutable.

A **normative** schema compatibility contract is required.

---

## Decision

### 1) `schemaVersion` is Mandatory and Format is Authoritative

Every `ExecutionPlan.metadata` MUST include `schemaVersion`.

**Authoritative format (aligned with current implementation):**

- `schemaVersion` MUST match: `v<major>.<minor>`
- Example: `v1.0`, `v1.1`
- `major` and `minor` are non-negative integers.

This ADR explicitly standardizes the existing `v1.x` prefix convention.

---

### 2) Compatibility Rules (Schema vs Plan Revision)

These rules apply to **schemaVersion only**.

- `planVersion` (plan revision) MUST NOT be used for schema compatibility checks.
- Schema compatibility checks MUST use `schemaVersion`.

#### Major version

- A change in `major` indicates a breaking schema change.
- Adapters MUST reject any plan whose schema major is unsupported.
- Phase 1 policy: adapters MUST accept **only the same major** they support.
  - If `planMajor != adapterMajor` → reject (including older majors).

#### Minor version (Phase 1 strict mode with operational prerequisites)

- Phase 1 comparison is strict but bounded:
  - If `planMinor > adapterSupportedMinor` → reject.
  - If `planMinor <= adapterSupportedMinor` → accept.

Strict mode is only allowed in production if the operational prerequisites in §6 are met.

---

### 3) Engine Validation Timing and Error Shape

**Timing requirement:**

- The Engine MUST validate `schemaVersion` **before** `bootstrapRunTx` as part of `validateStartRunPreconditions`.
- This validation is metadata-only and does not require fetching plan bytes (consistent with ADR-0012 boundaries).

If validation fails, the Engine MUST fail fast and MUST NOT create a run record (no metadata, no events).

**Normative error example:**

```ts
class PlanRejectedError extends Error {
  code: 'UNSUPPORTED_PLAN_VERSION';
  schemaVersion: string; // e.g. "v1.1"
  supportedVersion: string; // e.g. "v1.0" or "v1.1"
  adapterName: string; // e.g. "TemporalAdapter"
}
```

If a version mismatch is detected **after** run creation (should not happen if §3 timing is followed), the Engine MUST:

- emit `RunFailed` with reason `UNSUPPORTED_PLAN_VERSION`
- close the run deterministically

But the normative design is to reject **pre-bootstrap**.

---

### 4) Shared Compatibility Utility (`@dvt/plan-verifier`) — Safe Parsing

A canonical compatibility helper MUST exist in `@dvt/plan-verifier`.

It MUST:

- parse `v<major>.<minor>`
- throw a descriptive error on invalid format (no silent false)
- enforce Phase 1 compatibility rules

```ts
type AdapterSupportedSchema = { major: number; minor: number };

class InvalidSchemaVersionError extends Error {
  constructor(public readonly schemaVersion: string) {
    super(`Invalid schemaVersion: ${schemaVersion}`);
  }
}

export function parseSchemaVersionOrThrow(schemaVersion: string): { major: number; minor: number } {
  const m = /^v(\d+)\.(\d+)$/.exec(schemaVersion);
  if (!m) throw new InvalidSchemaVersionError(schemaVersion);
  return { major: Number(m[1]), minor: Number(m[2]) };
}

export function isSchemaCompatibleOrThrow(
  schemaVersion: string,
  adapterSupported: AdapterSupportedSchema
): void {
  const { major, minor } = parseSchemaVersionOrThrow(schemaVersion);

  // Phase 1 policy: same major only; minor must be <= supported minor
  if (major !== adapterSupported.major) throw new PlanRejectedError(/* ... */);
  if (minor > adapterSupported.minor) throw new PlanRejectedError(/* ... */);
}
```

Note: `isSchemaCompatibleOrThrow` is preferred over boolean return to avoid silent rejection paths.

---

### 5) Machine-Readable Compatibility Matrix + JSON Schema

A machine-readable compatibility file MUST exist:

- `contracts/compat/plan-compat.json`

It MUST be validated by a JSON Schema:

- `contracts/compat/plan-compat.schema.json`

Additionally, CI MUST validate that adapter-declared support matches the matrix (see §7).

---

### 6) Operational Prerequisites for Strict Minor Mode (Production)

Strict minor rejection creates outages if planner and adapters are not coordinated.

Before enabling strict minor mode in production, the platform MUST have at least one of:

1. **Planner feature flag / dual-emit capability**
   - Planner can generate `v1.0` or `v1.1` based on config/tenant/environment.
2. **Dual-support window**
   - Adapters are deployed supporting both schema minors before planner fully flips.
3. **Blue/green deployments**
   - Coordinated rollouts ensure no incompatible combinations exist.

If none of the above is available, strict minor mode MUST NOT be enabled in production environments.

---

### 7) CI Mechanism for Matrix Alignment (Design Requirement)

CI MUST fail if code and matrix drift.

The simplest required mechanism:

- `test/compat/matrix-alignment.test.ts`
  - imports adapter constants (e.g. `ADAPTER_SUPPORTED_SCHEMA = { major, minor }`)
  - reads `contracts/compat/plan-compat.json`
  - asserts that the JSON declares support for all versions up to `v{major}.{minor}` for that adapter (Phase 1)
  - asserts `plan-compat.json` conforms to `plan-compat.schema.json`

This test is not a JSON Schema validation alone; it is a contract test that binds code ↔ governance artifact.

---

### 8) Plan URI Immutability Requirement (Runs in Flight)

To avoid runs-in-flight reading a different schema/bytes mid-execution:

**Note:** Hash validation and the “plan bytes” trust boundary are governed by ADR-0012. This section adds the immutability-by-URI requirement to make ADR-0012 enforceable operationally.

- Plan references MUST be immutable by construction.
- A `PlanRef` MUST include a cryptographic hash (e.g. SHA256) and the system MUST validate it.
- Plan URIs MUST NOT be mutable “latest” endpoints.

Preferred patterns:

- `s3://.../plans/<planId>/<schemaVersion>/<sha256>/plan.json`
- `https://.../plans/<planId>/<schemaVersion>/<sha256>`

Forbidden patterns:

- `.../plans/<planId>/latest`
- any URI whose content can change without changing the URI

---

## Consequences

### Positive

- Formalizes and aligns the existing `v<major>.<minor>` schemaVersion practice.
- Prevents executing plans with unknown schema.
- Makes compatibility auditable (JSON matrix) and enforceable (CI contract test).
- Protects runs-in-flight via immutability requirement.

### Negative / Trade-offs

- Requires coordinated rollout for minor bumps (or strict mode becomes an outage risk).
- Adds governance artifacts (`plan-compat.json`, schema, contract tests) to maintain.
- Phase 1 rejects older majors (simplifies correctness at the cost of explicit back-compat).

### Deployment / Rollback Note

Rollback risk exists:

- If planner generates `v1.1` and adapters are rolled back to support only `v1.0`, runs will fail with `UNSUPPORTED_PLAN_VERSION`.

Mitigations (required to operate strict mode safely):

- feature flags / dual emit
- dual-support windows
- blue/green deployments

---

## Documents to Update (Normative Impact)

This ADR requires updates to:

1. **IWorkflowEngine.v2.0.md**
   - require `schemaVersion` format `v<major>.<minor>`
   - specify pre-bootstrap validation timing
2. **ExecutionSemantics.v2.0.md**
   - add Plan Compatibility section (schema vs plan revision)
   - add immutability requirements for PlanRef URI + hash
3. **AdapterDevelopmentGuide.md**
   - adapter MUST declare supported schema
   - adapter MUST use plan-verifier helpers (or equivalent)
   - document matrix-alignment CI contract test

---

## Verification

### Invariants

- **INV-PLAN-001**: Every ExecutionPlan includes `metadata.schemaVersion`
- **INV-PLAN-001A**: `schemaVersion` format is `v<major>.<minor>`
- **INV-PLAN-002**: Engine validates schemaVersion pre-bootstrap (no run created on mismatch)
- **INV-PLAN-003**: Schema compatibility uses schemaVersion (never planVersion)
- **INV-PLAN-004**: Invalid schemaVersion format throws (no silent false/NaN paths)
- **INV-PLAN-005**: plan-compat.json validates against plan-compat.schema.json
- **INV-PLAN-006**: Matrix alignment test fails on drift (code ↔ JSON mismatch)
- **INV-PLAN-007**: PlanRef URIs are immutable (no “latest”); hash validation enforced

### Required Tests (mandatory CI)

- `test/plan/schemaVersion-required.test.ts`
- `test/plan/schemaVersion-format-v-prefix.test.ts`
- `test/engine/reject-unsupported-schema-pre-bootstrap.test.ts`
- `test/plan/compat/uses-schemaVersion-not-planVersion.test.ts`
- `test/plan/compat/invalid-schemaVersion-throws.test.ts`
- `test/compat/plan-compat-schema-validation.test.ts`
- `test/compat/matrix-alignment.test.ts`
- `test/planref/immutable-uri-policy.test.ts`

---

## References

- Semantic Versioning: https://semver.org/
- Temporal workflows (general semantics; rollout awareness): https://docs.temporal.io/workflows
- Martin Fowler — Idempotent Receiver: https://martinfowler.com/articles/patterns-of-distributed-systems/idempotent-receiver.html
- Microservices.io — Transactional Outbox (governance pattern reference): https://microservices.io/patterns/data/transactional-outbox.html

---

End of ADR-0017
