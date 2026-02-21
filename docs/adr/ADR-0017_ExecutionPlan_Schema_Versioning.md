# ADR-0017: ExecutionPlan Schema Versioning & Compatibility

- **Status**: Proposed\
- **Date**: 2026-02-21T18:11:02.522261Z\
- **Owners**: Planner / Engine Domain / Adapter Layer\
- **Related**:
  - IWorkflowEngine.v2.0.md _(update required)_
  - ExecutionSemantics.v2.0.md _(update required)_
  - AdapterDevelopmentGuide.md _(update required)_
  - RunEvents.v2.0.1.md

---

## Context

`ExecutionPlan` is the canonical artifact produced by the planning layer
and consumed by workflow engine adapters (Temporal, Conductor, future
engines).

As DVT+ evolves, `ExecutionPlan` schema will change (fields
added/removed/changed semantics). Without explicit versioning rules:

- Adapters may execute plans they do not understand.
- Breaking changes may reach production silently.
- Partial execution of incompatible plans may corrupt state.
- Planner and adapters may drift independently.

A **normative** schema compatibility contract is required.

---

## Decision

### 1) `schemaVersion` is Mandatory

Every `ExecutionPlan` MUST include:

```ts
type ExecutionPlan = {
  schemaVersion: string; // format: "major.minor"
  // ...
};
```

Format:

- `<major>.<minor>` (e.g., "1.0", "1.1", "2.0")
- `major` and `minor` are non-negative integers.

---

### 2) Compatibility Rules

#### Major version

- A change in `major` indicates a **breaking change**.
- Adapters MUST reject any plan whose `major` is unsupported.
- Rejection MUST occur before execution begins (no workflow start, no
  step execution).
- Error code MUST be `UNSUPPORTED_PLAN_VERSION`.

#### Minor version (Phase 1 strict mode)

- If plan minor is greater than adapter-supported minor → reject.
- Forward compatibility is NOT assumed in Phase 1.

Future relaxed mode (requires explicit ADR): - Minor versions MAY be
accepted if: - changes are additive - unknown fields are safely
ignored - semantics are unchanged

Until such ADR exists, strict mode applies.

---

### 3) Adapter Responsibility + Explicit Error Shape

Each adapter MUST declare supported versions:

```ts
const ADAPTER_SUPPORTED_PLAN = { major: 1, minor: 1 } as const;
```

Adapters MUST validate `schemaVersion` before execution and throw a
typed error on mismatch.

**Normative error example:**

```ts
class PlanRejectedError extends Error {
  code: 'UNSUPPORTED_PLAN_VERSION';
  planVersion: string;
  supportedVersion: string;
  adapterName: string;
}
```

Engine behavior on `PlanRejectedError`:

- MUST mark the run as `FAILED`
- MUST record reason `UNSUPPORTED_PLAN_VERSION`
- MUST NOT start workflow execution
- MUST NOT emit any step-level events
- MUST emit a terminal run failure event with the reason above

---

### 4) Machine-Readable Compatibility Matrix + JSON Schema

A machine-readable compatibility file MUST exist:

- `contracts/compat/plan-compat.json`

It MUST be validated by a JSON Schema:

- `contracts/compat/plan-compat.schema.json`

Example matrix:

```json
{
  "schema": "ExecutionPlan",
  "versions": [
    {
      "version": "1.0",
      "adapters": {
        "TemporalAdapter": true,
        "ConductorAdapter": false,
        "MockAdapter": true
      }
    },
    {
      "version": "1.1",
      "adapters": {
        "TemporalAdapter": true,
        "ConductorAdapter": false,
        "MockAdapter": true
      }
    }
  ]
}
```

Rules: - The matrix MUST be updated when a new plan schema is
introduced. - The matrix MUST be updated when an adapter adds/removes
support. - CI MUST validate: - `plan-compat.json` conforms to
`plan-compat.schema.json` - adapter declarations match the matrix.

---

### 5) Shared Compatibility Utility (`@dvt/plan-verifier`)

A canonical compatibility helper MUST exist (Phase 1 strict mode) in
`@dvt/plan-verifier`:

```ts
export function isPlanCompatible(
  planVersion: string,
  adapterSupported: { major: number; minor: number }
): boolean {
  const [planMajor, planMinor] = planVersion.split('.').map(Number);
  const { major, minor } = adapterSupported;

  return planMajor === major && planMinor <= minor;
}
```

Adapters SHOULD use this helper (or equivalent) to prevent divergent
logic.

---

## Consequences

### Positive

- Prevents silent execution of incompatible plans.
- Enforces a strict contract between planner and adapters.
- Makes compatibility auditable and testable.
- Enables controlled schema evolution.

### Negative / Trade-offs

- Strict minor rejection slows additive evolution unless planned.
- Requires ongoing maintenance of compatibility matrix and schema.
- Adapter authors must update declared support explicitly.

### Deployment / Rollback Note

Rollback risk exists:

- If planner is deployed generating `1.1`, and you rollback adapters
  that only support `1.0`, then in-flight or newly requested runs may
  fail with `UNSUPPORTED_PLAN_VERSION`.

Mitigations: - Use feature flags to enable new plan versions gradually
(planner-side). - Prefer blue/green deployments to keep planner+adapter
compatibility aligned. - Keep dual-support windows where adapters
support both versions before planner flips fully.

---

## Documents to Update (Normative Impact)

This ADR requires updates to:

1.  **IWorkflowEngine.v2.0.md**\
2.  **ExecutionSemantics.v2.0.md**\
3.  **AdapterDevelopmentGuide.md**

Each must reference schemaVersion requirement and rejection behavior.

---

## Verification

### Invariants

- INV-PLAN-001: Every ExecutionPlan includes `schemaVersion`
- INV-PLAN-002: Adapter rejects unsupported major versions
- INV-PLAN-003: Adapter rejects unsupported minor versions (strict
  mode)
- INV-PLAN-004: `plan-compat.json` validates against
  `plan-compat.schema.json`
- INV-PLAN-005: Compatibility matrix matches adapter implementation
- INV-PLAN-006: On rejection, engine fails run cleanly with reason
  `UNSUPPORTED_PLAN_VERSION`

### Required Tests

- `test/plan/schemaVersion-required.test.ts`
- `test/adapters/compat/reject-unsupported-major.test.ts`
- `test/adapters/compat/reject-unsupported-minor.test.ts`
- `test/compat/plan-compat-schema-validation.test.ts`
- `test/compat/matrix-alignment.test.ts`
- `test/engine/unsupported-plan-fails-cleanly.test.ts`

All tests MUST be part of mandatory CI suite.

---

## References

- Semantic Versioning: https://semver.org/\
- Temporal Workflows: https://docs.temporal.io/workflows\
- Martin Fowler --- Idempotent Receiver:
  https://martinfowler.com/articles/patterns-of-distributed-systems/idempotent-receiver.html\
- Microservices.io --- Transactional Outbox:
  https://microservices.io/patterns/data/transactional-outbox.html

---

Next Steps

This ADR is ready to be marked as "Accepted" as soon as:

The listed normative documents are updated:

IWorkflowEngine.v2.0.md

ExecutionSemantics.v2.0.md

AdapterDevelopmentGuide.md

The matrix files are created:

contracts/compat/plan-compat.schema.json

contracts/compat/plan-compat.json (initial version)

The helper is implemented in @dvt/plan-verifier

The tests (at least the critical ones) are created in the specified paths

End of ADR-0017
