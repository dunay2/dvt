# ADR-0017: ExecutionPlan Schema Versioning & Compatibility

- **Status**: Accepted
- **Date**: 2026-02-21
- **Owners**: Planner / Engine Domain / Adapter Layer
- **Related**:
  - ADR-0012 (Plan bytes boundary)
  - IWorkflowEngine.v1.md _(update required)_
  - ExecutionSemantics.v1.md _(update required)_
  - AdapterDevelopmentGuide.md _(update required)_
  - RunEvents.v1.md _(idempotency context)_

---

## Context

`ExecutionPlan` is the canonical artifact produced by the planning layer and consumed by workflow engine adapters (Temporal, Conductor, future engines).

The codebase already distinguishes:

- `planVersion`: **revision** of a concrete plan instance (e.g. "1", "2", "3") and participates in idempotency
- `schemaVersion`: **format/schema** version of the `ExecutionPlan` JSON structure (for example `v1.2`) and does **not** participate in idempotency

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

**Authoritative format:**

- the only currently executable `schemaVersion` is `v1.2`
- future schema versions MUST be admitted by an explicit matrix update
- `schemaVersion` values such as `v1.future` or any other undeclared string
  MUST be rejected before plan fetch or adapter dispatch

This ADR explicitly rejects the former `v1.x` prefix convention as runtime
admission truth.

---

### 2) Compatibility Rules (Schema vs Plan Revision)

These rules apply to the pair `(planVersion, schemaVersion)`.

- `planVersion` and `schemaVersion` MUST be evaluated together.
- A valid `planVersion` MUST NOT make an unknown `schemaVersion` executable.
- A valid `schemaVersion` MUST NOT make an unknown `planVersion` executable.
- The active runtime admits only the declared current plan/schema pair.

#### Current-only policy

- The only admitted pair is the current pair published by the contracts
  package.
- Older pairs, future pairs, and syntactically plausible but undeclared pairs
  MUST reject.
- Adding a new pair is a hard-cut contract change.

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
  schemaVersion: string; // e.g. "v2.0"
  supportedVersion: string; // e.g. "v1.2"
  adapterName: string; // e.g. "TemporalAdapter"
}
```

If a version mismatch is detected **after** run creation (should not happen if Â§3 timing is followed), the Engine MUST:

- emit `RunFailed` with reason `UNSUPPORTED_PLAN_VERSION`
- close the run deterministically

But the normative design is to reject **pre-bootstrap**.

---

### 4) Shared Admission Matrix - Exact Pair Matching

A canonical compatibility helper MUST exist in the shared contract/runtime
surface.

It MUST:

- publish the current executable `(planVersion, schemaVersion)` pair
- reject every undeclared pair
- avoid prefix, semver, or lower-minor acceptance

```ts
class InvalidSchemaVersionError extends Error {
  constructor(public readonly schemaVersion: string) {
    super(`Invalid schemaVersion: ${schemaVersion}`);
  }
}

export function assertSupportedPlanCompatibility(input: {
  planVersion: string;
  schemaVersion: string;
}): void {
  if (!isSupportedExecutionPlanCompatibility(input.planVersion, input.schemaVersion)) {
    throw new InvalidSchemaVersionError(input.schemaVersion);
  }
}
```

Note: assertion-style use is preferred at runtime to avoid silent rejection
paths.

---

### 5) Machine-Readable Compatibility Matrix + JSON Schema

A machine-readable compatibility file MUST exist:

- `contracts/compat/plan-compat.json`

It MUST be validated by a JSON Schema:

- `contracts/compat/plan-compat.schema.json`

Additionally, CI MUST validate that code and documentation stay aligned.

---

### 6) CI Mechanism for Matrix Alignment (Design Requirement)

CI MUST fail if code and matrix drift.

The simplest required mechanism:

- contract tests assert the current pair and representative negative pairs
- engine tests assert unsupported pairs fail before plan fetch or adapter
  dispatch
- documentation links the matrix as the active admission surface

This test is not a JSON Schema validation alone; it is a contract test that
binds code and governance artifact.

---

### 7) Plan URI Immutability Requirement (Runs in Flight)

To avoid runs-in-flight reading a different schema/bytes mid-execution:

**Note:** Hash validation and the â€œplan bytesâ€ trust boundary are governed by ADR-0012. This section adds the immutability-by-URI requirement to make ADR-0012 enforceable operationally.

- Plan references MUST be immutable by construction.
- A `PlanRef` MUST include a cryptographic hash (e.g. SHA256) and the system MUST validate it.
- Plan URIs MUST NOT be mutable â€œlatestâ€ endpoints.

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

- Adds governance artifacts (`plan-compat.json`, schema, contract tests) to maintain.
- Rejects every undeclared pair, including older and future pairs.

### Deployment Note

Planner and runtime must move as one governed contract line. A planner that
emits an undeclared pair will be rejected at start-run admission.

---

## Documents to Update (Normative Impact)

This ADR requires updates to:

1. **IWorkflowEngine.v1.md**
   - require `schemaVersion` format `v<major>.<minor>`
   - specify pre-bootstrap validation timing
2. **ExecutionSemantics.v1.md**
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
- **INV-PLAN-003**: Runtime admission uses the declared
  `(planVersion, schemaVersion)` pair
- **INV-PLAN-004**: Invalid schemaVersion format throws (no silent false/NaN paths)
- **INV-PLAN-005**: plan-compat.json validates against plan-compat.schema.json
- **INV-PLAN-006**: Matrix alignment test fails on drift (code â†” JSON mismatch)
- **INV-PLAN-007**: PlanRef URIs are immutable (no â€œlatestâ€); hash validation enforced

### Required Tests (mandatory CI)

- `test/plan/schemaVersion-required.test.ts`
- `test/plan/schemaVersion-format-v-prefix.test.ts`
- `test/engine/reject-unsupported-schema-pre-bootstrap.test.ts`
- `test/plan/compat/uses-planVersion-schemaVersion-pair.test.ts`
- `test/plan/compat/invalid-schemaVersion-throws.test.ts`
- `test/compat/plan-compat-schema-validation.test.ts`
- `test/compat/matrix-alignment.test.ts`
- `test/planref/immutable-uri-policy.test.ts`

---

## References

- Semantic Versioning: https://semver.org/
- Temporal workflows (general semantics; rollout awareness): https://docs.temporal.io/workflows
- Martin Fowler â€” Idempotent Receiver: https://martinfowler.com/articles/patterns-of-distributed-systems/idempotent-receiver.html
- Microservices.io â€” Transactional Outbox (governance pattern reference): https://microservices.io/patterns/data/transactional-outbox.html

---

End of ADR-0017
