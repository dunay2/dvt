# ADR-0017 — State Write Boundary for Engine Adapters

Status: Proposed  
Date: 2026-02-25

## Context

The architecture target is explicitly hexagonal, domain-driven by ports/adapters, CQRS-oriented, and engine-agnostic.

Current guidance in [`ADR-0014 — Run-Driven Adapter Model`](./ADR-0014-run-driven-adapter-model.md) states that adapter internals may write step lifecycle events directly to `IRunStateStore`.

That approach accelerates initial delivery, but it also introduces a structural risk:

- runtime adapter logic can become coupled to persistence details,
- state invariants can drift outside the domain boundary,
- multi-engine parity becomes harder to guarantee,
- replacing infrastructure or adapter runtimes becomes costlier.

This risk has been repeatedly highlighted in architecture reviews, including [`review_20260223_architectural_review.md`](../planning/review_20260223_architectural_review.md).

## Decision

1. Engine adapters (Temporal/Conductor/others) **MUST NOT** write infrastructure state directly (SQL/table/ORM/repository concrete types).
2. Engine adapters **MUST** emit canonical run-transition commands through a domain port boundary.
3. DVT introduces the write-side boundary contract `RunStateCommandPort` (name may vary, responsibility is normative):
   - apply validated transitions,
   - enforce idempotency keys,
   - persist authoritative write model,
   - append domain/audit events.
4. CQRS ownership is clarified:
   - write-side invariants belong to domain/application write services,
   - read-side projections consume persisted events/state, never adapter internals.
5. Adapter metadata (engine-specific envelope fields) is permitted as non-authoritative context only; it cannot define business invariants.
6. This ADR **updates** the direct-write wording in [`ADR-0014 — Run-Driven Adapter Model`](./ADR-0014-run-driven-adapter-model.md).

## Consequences

### Positive

- Stronger hexagonal boundary integrity from the start.
- Better engine interchangeability and lower lock-in risk.
- Centralized invariants and idempotency enforcement.
- Cleaner contract testing across adapters.

### Trade-offs

- Additional write-path component(s) and operational complexity.
- Potential latency increase due to one extra boundary hop.
- Migration effort from direct adapter writes to command-port calls.

## Impact

- Adapter implementations must be refactored to remove direct store writes.
- Domain/application write service contracts become first-class integration surface.
- Test strategy must include:
  - adapter-to-command-port contract tests,
  - idempotency conformance tests,
  - transition validation tests on write-side.

## Acceptance Criteria

1. No adapter package contains direct writes to `IRunStateStore` concrete infrastructure from workflow/activity runtime paths.
2. A canonical run-transition command contract is documented and versioned.
3. Write-side transition validation is enforced in a centralized domain boundary.
4. Idempotency key enforcement is verified in automated tests.
5. At least one adapter path (Temporal) is migrated to the new boundary without behavior regression.

## Traceability

- Baseline: [`ADR-0014 — Run-Driven Adapter Model`](./ADR-0014-run-driven-adapter-model.md)
- Decision: Adapter write-path moves from direct persistence to domain command boundary.
- Implements:
  - write-side boundary contract (RunStateCommandPort),
  - adapter refactor to command emission,
  - conformance tests for transition + idempotency.
