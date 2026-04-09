---
title: ADR-0041 - Global Domain State Model and Boundary Contracts
status: Accepted
owner: Architecture / API / Engine
last_reviewed: 2026-03-26
---

# ADR-0041 - Global Domain State Model and Boundary Contracts

## Status

Accepted.

## Context

Multiple modules are evolving toward stricter SOLID, Hexagonal, and CQRS
boundaries. The repository needs one global rule that standardizes:

- domain state modeling
- boundary contracts
- mapping responsibilities
- readiness semantics across ports

Without a global ADR, each module can drift into local conventions and produce
inconsistent behavior and type safety.

## Decision

### 1. Contract-First with JSON Schema as normative boundary shape

This repository adopts Contract-First governance for boundary contracts.

- Boundary contracts (internal cross-module and external integration contracts)
  MUST be specified as versioned JSON Schema.
- TypeScript types at boundaries MUST be derived from, or validated against, the
  corresponding JSON Schema.
- Runtime boundary validation MUST be aligned with schema definitions.

This rule follows ADR-0005 and ADR-0006, and ownership constraints from
ADR-0018.

### 2. All domain state models must be explicit and type-safe

For state machines and operational health states, modules MUST use explicit
domain models, preferring discriminated unions when state-dependent fields
exist.

### 3. Contract and runtime vocabularies remain separated

Internal runtime vocabulary and external transport contract vocabulary are
different concerns. They MUST be separated and connected only through explicit
mapping adapters/presenters.

### 4. Port outcomes must model semantics explicitly

Ports MUST return explicit semantic outcomes (for example: configured healthy,
configured unhealthy, not configured) instead of implicit assumptions.

### 5. Literal governance

State/reason/status literals used as business vocabulary MUST be centralized in
the corresponding domain contract module and never duplicated ad hoc across
callers.

## Invariants

- `INV-DSM-001`: State-dependent fields are modeled in type space, not by
  optional loose fields only.
- `INV-DSM-002`: Boundary contracts MUST have versioned JSON Schema as
  normative shape.
- `INV-DSM-003`: Runtime modules MUST NOT depend on route/API schema modules.
- `INV-DSM-004`: Route/API schema modules MUST NOT depend on runtime internals.
- `INV-DSM-005`: Boundary mapping is explicit and testable.
- `INV-DSM-006`: Readiness semantics distinguish "not configured" from
  "healthy".

## Module Compliance

All modules MUST align with ADR-0041. Slice-specific implementations are
captured as subordinate decisions (`ADR-0041A`, `ADR-0041B`, etc.).

## Consequences

### Positive

- Uniform modeling discipline across modules.
- Fewer invalid states at compile time.
- Lower semantic drift between runtime and external contracts.

### Trade-offs

- More explicit mapping code at boundaries.
- Refactor cost in legacy slices that still use loose optional fields.

## References

- [ADR-0005 - Contract Formalization Tooling](./ADR-0005-contract-formalization-tooling.md)
- [ADR-0006 - Contract Tooling Governance](./ADR-0006-contract-tooling-governance.md)
- [ADR-0018 - Shared Kernel Ownership Governance](./ADR-0018_Shared_Kernel_Ownership_Governance.md)
- [ADR-0034 - Bounded Context Boundaries And Communication Rules](./ADR-0034-bounded-context-boundaries-and-communication-rules.md)
- [ADR-0039 - Hexagonal Port Hardening and SOLID Remediation](./ADR-0039-hexagonal-port-hardening-and-solid-remediation.md)
- [ADR-0041A - Reconciler Health State and Readiness Port Semantics](./ADR-0041a-reconciler-health-state-and-readiness-port-semantics.md)
