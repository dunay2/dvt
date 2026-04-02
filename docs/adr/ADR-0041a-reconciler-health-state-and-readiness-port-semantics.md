---
title: ADR-0041A - Reconciler Health State and Readiness Port Semantics
status: Accepted
owner: API / Runtime / Architecture
last_reviewed: 2026-03-26
---

# ADR-0041A - Reconciler Health State and Readiness Port Semantics

## Status

Accepted.

Subordinate decision under [ADR-0041 - Global Domain State Model and Boundary Contracts](ADR-0041-global-domain-state-model-and-boundary-contracts.md).

## Context

The reconciler health and readiness slice has been hardened in recent refactors,
but two design risks remain:

1. The health model still allows loosely-coupled status and reason values.
2. Readiness-by-ports can blur "dependency not configured" and "dependency
   healthy" if the state is not explicit.

These risks create drift pressure across runtime, readiness policy, and HTTP
contract mapping, and they increase the chance of false positives in `/readyz`.

## Decision

### 1. Contract-First boundary for reconciler health/readiness

The health/readiness boundary follows Contract-First governance:

- published health and readiness shapes MUST be defined as versioned JSON
  Schema;
- runtime boundary validation MUST align with those schemas;
- runtime domain model is mapped explicitly to contract payloads.

### 2. Runtime health model must use a discriminated union

The runtime health state is modeled as a discriminated union where
`reasonCode` is only valid for degraded states.

Canonical shape:

```ts
type ReconcilerHealthState =
  | { status: 'starting' }
  | { status: 'healthy' }
  | { status: 'disabled' }
  | {
      status: 'degraded';
      reasonCode: 'bootstrap_failed' | 'runtime_unavailable';
    };
```

### 3. Readiness dependency outcomes must be explicit

Readiness ports must not treat "dependency not configured" as "healthy".
Each dependency check must return an explicit semantic outcome that policy can
interpret deterministically.

Minimum outcome categories:

- configured and healthy
- configured and unhealthy
- not configured

### 4. Runtime and HTTP contract remain separate, with explicit mapping

Runtime health semantics are internal domain vocabulary.
HTTP health contract is external vocabulary.
Mapping between both lives in presenter/policy modules and must be explicit.

## Invariants

- `INV-RECHEALTH-001`: Runtime `reasonCode` is only legal when
  `status === 'degraded'`.
- `INV-RECHEALTH-002`: Health/readiness boundary contracts MUST be backed by
  JSON Schema.
- `INV-RECHEALTH-003`: Readiness policy must model "not configured" as a
  first-class outcome, never as implicit healthy.
- `INV-RECHEALTH-004`: Runtime modules must not import route contract modules.
- `INV-RECHEALTH-005`: Route contract modules must not import runtime internals
  to derive schemas.

## Consequences

### Positive

- Stronger compile-time guarantees for health transitions.
- Lower probability of readiness false positives.
- Clearer hexagonal boundary between domain state and HTTP contract.

### Trade-offs

- Some additional mapping code is required at the boundary.
- Existing tests may need updates to assert explicit dependency outcomes.

## References

- [ADR-0005 - Contract Formalization Tooling](ADR-0005-contract-formalization-tooling.md)
- [ADR-0006 - Contract Tooling Governance](ADR-0006-contract-tooling-governance.md)
- [ADR-0018 - Shared Kernel Ownership Governance](ADR-0018_Shared_Kernel_Ownership_Governance.md)
- [Reconciler Runtime SOLID QA Review](../planning/reviews/event-contract-and-traceability/20260326-reconciler-runtime-solid-qa-review.md)
- [ADR-0034 - Bounded Context Boundaries And Communication Rules](ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0039 - Hexagonal Port Hardening and SOLID Remediation](ADR-0039-hexagonal-port-hardening-and-solid-remediation.md)
