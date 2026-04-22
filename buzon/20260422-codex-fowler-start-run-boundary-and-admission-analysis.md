---
review_by: Codex
review_date: 2026-04-22
branch: main
slice: start-run boundary contract + execution-capacity admission seam
status: remediation_in_progress
---

# Fowler architecture analysis — start-run boundary and admission seam

## Scope

This review covers the work now present in:

- `packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts`
- `packages/@dvt/contracts/src/schema-packs/start-run.ts`
- `packages/@dvt/contracts/test/**`
- `apps/api/src/application/services/BackpressureAwareStartRunUseCase.ts`
- `apps/api/src/application/ports/IStartRunExecutionCapacityPort.ts`
- `apps/api/src/application/services/defaultStartRunExecutionCapacityPort.ts`
- `apps/api/src/application/services/startRunAdmissionDecisions.ts`
- related API and contract documentation

## Context in the system

The system is moving in the right Fowler-style direction:

- `@dvt/contracts` owns the canonical shared boundary
- `apps/api` owns orchestration and composition, not provider truth
- the admission path now has an explicit execution-capacity port instead of
  leaking Temporal semantics into the application layer

That is materially closer to a mature architecture than the previous state.
The new seam is a proper port, the default binding is fail-closed, and the
caller-visible result still routes through one canonical contract instead of a
parallel API-local vocabulary.

## Comparison with mature systems

Compared with mature systems, the slice now resembles the safer half of the
pattern used by systems such as workflow-control planes and queue-backed
admission front doors:

- one canonical caller-visible contract
- one application admission orchestrator
- provider-specific saturation hidden behind a port
- fail-closed behavior when capacity truth is unavailable

Where it still lags mature systems is not in the main direction, but in
semantic packaging:

- the contract vocabulary is still spread across boundary, schema, fixtures,
  tests, and docs
- the normative contract doc exists, but there is no equally explicit local
  component guide on the contracts side
- the existing architecture guard on the API side protects seam ownership, but
  the contracts side does not yet protect derivation of schema/fixtures from
  canonical truth

## Patterns improved

- **Composition root discipline**
  `buildProtectedRuntimeModule.ts` owns the default binding instead of routes
  or use cases.
- **Port and adapter separation**
  `IStartRunExecutionCapacityPort` creates an application-facing seam instead of
  encoding Temporal queue semantics in `apps/api`.
- **Fail-closed admission**
  Missing capacity signal becomes explicit system backpressure, not silent
  permissive behavior.
- **Canonical contract reuse**
  `StartRunBoundary.v1` remains the one caller-visible command/result surface.
- **Focused orchestration**
  `startRunAdmissionDecisions.ts` reduced translation/telemetry spillover from
  `BackpressureAwareStartRunUseCase.ts`.

## Antipatterns still visible

- **Semantic scatter**
  The same system-backpressure vocabulary is defined once in the canonical
  contract, then re-spelled in schema packs, fixtures, tests, and docs.
- **Normative-without-component-guide**
  The canonical doc explains the contract, but not the component shape
  (public API, invariants, transitions, consumers) with the same clarity now
  expected elsewhere in the repository.
- **Architecture test too local**
  The API architecture test checks seam ownership, but there is no peer test on
  the contracts side proving that schema and fixtures derive from canonical
  contract truth rather than ad hoc literals.

## Repetitions

- backpressure-code grouping repeated across:
  `StartRunBoundary.v1.ts`,
  `schema-packs/start-run.ts`,
  fixtures,
  tests,
  docs
- target-adapter enumeration repeated in boundary and schema pack
- execution-capacity-specific codes explained in both the normative doc and API
  docs, but without a contract-local component guide to absorb the explanatory
  material

## Opportunities

- centralize `system_backpressure` code sets in the canonical boundary module
- derive schema packs from canonical contract arrays instead of hand-written
  repeated enums
- derive fixtures from canonical constants instead of raw literals
- add a contract-local component guide with API, invariants, transitions,
  consumers, and diagrams
- add a semantic architecture test that enforces derivation, not just presence

## Drift detected before remediation

- `docs/architecture/components/engine/contracts/engine/index.md` does not list
  `StartRunBoundary.v1.md` in the active pack even though it is a real
  first-class contract
- the contracts side lacks a local component guide while adjacent API slices
  already have them
- schema and fixtures still rely on duplicated literal truth instead of
  explicit canonical sets

## Selected remediation for this pass

1. Introduce canonical grouped sets for start-run system-backpressure codes in
   `StartRunBoundary.v1.ts`.
2. Make `schema-packs/start-run.ts` consume canonical sets for target adapters
   and system-backpressure codes.
3. Replace raw contract literals in fixtures with canonical exports.
4. Add short owned-concern docblocks to the touched contract modules.
5. Add a contract-local component guide with diagrams:
   public API, invariants, transitions, consumers.
6. Add a semantic architecture test that proves schema and fixtures derive from
   canonical contract truth.

## Why this is the right next move

This keeps the architecture moving toward mature-system traits:

- fewer parallel truths
- stronger semantic encapsulation
- better component discoverability
- documentation that explains ownership as well as shape
- tests that defend architecture decisions mechanically

It also stays inside the current slice. It does not introduce a second adapter
binding, a second public boundary, or a speculative general platform-capacity
service.
