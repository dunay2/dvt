# Run Execution Policy Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: ACTIVE
**Version**: v1
**Stability**: Contracts - breaking changes require version bump
**Consumers**: Engine admission, API start-run orchestration, plan persistence
**References**:
[ADR-0012-plan-integrity-ownership.md](../../../../../adr/ADR-0012-plan-integrity-ownership.md),
[ADR-0014-run-driven-adapter-model.md](../../../../../adr/ADR-0014-run-driven-adapter-model.md),
[ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md](../../../../../adr/ADR-0046-execution-plan-definition-and-run-execution-policy-separation.md)

---

## 1) Purpose

`RunExecutionPolicy` is the engine-owned runtime-compatibility contract that
travels with a verified plan definition without becoming part of the canonical
planner-owned `ExecutionPlan`.

It exists to carry execution-admission requirements such as:

- plugin compatibility fingerprint
- required adapter capabilities

It does not redefine plan topology.

## 2) Contract shape

```ts
interface RunExecutionPolicy {
  pluginCompatibilityFingerprint?: string;
  requiresCapabilities?: string[];
}
```

## 3) Ownership rules

### 3.1 Planner

The planner MAY compute `RunExecutionPolicy` from plan content and step-registry
requirements, but it does not publish it as part of `ExecutionPlan.metadata`.

### 3.2 Engine

The engine MUST use `RunExecutionPolicy` for:

- capability validation
- compatibility checks
- runExecutionContext compatibility checks

The engine MUST NOT recover these rules from ad hoc local metadata copies.

### 3.3 PlanRef

`PlanRef` references:

- plan artifact location
- plan artifact integrity
- plan identity and versioning

`PlanRef` MUST NOT carry `RunExecutionPolicy`.

### 3.4 RunContext

`targetAdapter` remains owned by `RunContext`.

It is not duplicated in `RunExecutionPolicy`.

## 4) Persistence rule

The canonical plan artifact remains singular.

- `ExecutionPlan` is the canonical plan artifact
- `RunExecutionPolicy` is persisted as sidecar execution metadata

This contract MUST NOT be used to justify a second canonical plan payload.

## 5) Validation rule

If `pluginCompatibilityFingerprint` is present:

- compatibility-checked `RunExecutionContext` artifacts MUST align with it

If `requiresCapabilities` is present:

- engine admission MUST fail closed when the selected adapter does not declare
  the required capabilities

## 6) Out of scope

This contract does not own:

- `targetAdapter`
- plan identity
- step graph definition
- workflow topology

`fallbackBehavior` is intentionally out of scope for `v1` because the current
repository does not implement it as a real enforced runtime policy.
