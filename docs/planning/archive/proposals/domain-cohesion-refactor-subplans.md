---
title: Domain Cohesion Refactor Subplans
status: Archived
owner: docs
last_reviewed: 2026-04-08
planning_type: proposal
---

# Domain Cohesion Refactor Subplans

Archived on 2026-04-08. These subplans remain historical rationale only; live
execution ownership moved to the lane registry and current workflow-engine
architecture work.

## Source

- Review of record:
  [20260314 Domain Cohesion Review](../reviews/architecture-and-governance/20260314-domain-cohesion-review.md)
- Parent plan: [Domain Cohesion Refactor Plan](./domain-cohesion-refactor-plan.md)

## P1. Run Aggregate Root

### Problem Summary

Lifecycle invariants for `Run` are currently split across `WorkflowEngine`,
`SnapshotProjector`, and runtime activity paths.

### Root Cause

No explicit aggregate root owns valid transitions, bootstrap semantics, and
domain-level lifecycle decisions.

### Constraints And Invariants

- `ADR-0003`
- `ADR-0004`
- `ADR-0012`
- `ADR-0015`

### Options Considered

- Extract `RunAggregate` and move transition rules there.
- Keep projector and engine as shared owners.
- Push more lifecycle logic into runtime activities.

### Selected Option

Extract a single aggregate owner for lifecycle rules and keep projector logic
focused on replay/application rather than domain ownership.

### Rejected Alternatives

- Shared ownership between engine and projector
- Activity-driven domain ownership

### Proposed Tasks

1. Define the aggregate boundary and the set of lifecycle invariants it owns.
2. Move run transition validation out of scattered helpers into the aggregate.
3. Keep runtime activities limited to technical facts and execution outcomes.
4. Add negative-path tests for invalid run and step transitions.

### Evidence Needed Before Closeout

- passing unit tests for valid and invalid transitions
- no remaining duplicate lifecycle rules spread across multiple owners

## P1. WorkflowEngine Responsibility Split

### Problem Summary

`WorkflowEngine` remains a god service that mixes domain coordination,
observability, health checks, and policy enforcement.

### Root Cause

Responsibilities accumulated feature by feature without being split into
use-case-specific collaborators.

### Constraints And Invariants

- `ADR-0003`
- `ADR-0004`
- `AGENTS.md` no-stub and evidence requirements

### Options Considered

- Extract smaller coordinators and readers.
- Keep a single large engine service.

### Selected Option

Separate start, status, signal, and health responsibilities into narrower
services and reduce `WorkflowEngine` to a thinner facade.

### Proposed Tasks

1. Extract a start-run coordinator.
2. Extract a status/read service.
3. Extract a signal service.
4. Extract a health/reporting service.
5. Update tests to target each smaller responsibility directly.

### Evidence Needed Before Closeout

- reduced constructor surface or dependency surface for `WorkflowEngine`
- targeted tests for each extracted responsibility

## P1. providerRunId Semantics In Pre-Bootstrap

### Problem Summary

Pre-bootstrap flow can persist a run identifier before the provider exposes the
final execution identifier.

### Root Cause

Estimated refs are committed early but not fully reconciled when the provider
returns a different execution-level identifier.

### Constraints And Invariants

- `ADR-0004`
- crash consistency and replay ordering must remain intact

### Options Considered

- persist separate requested and provider execution IDs
- reconcile metadata after dispatch
- declare the stored provider ID explicitly approximate

### Selected Option

Decision pending. The slice must choose one semantics model and document it
explicitly before implementation.

### Proposed Tasks

1. Decide the canonical meaning of the persisted provider-facing run ID.
2. Update metadata shape or reconciliation path accordingly.
3. Add a negative-path test where estimated and final IDs differ.

### Evidence Needed Before Closeout

- explicit contract/documented semantics
- negative-path coverage for identifier mismatch

## P2. buildApp Refactor

### Problem Summary

`buildApp()` wires HTTP hooks, auth, database access, runtime assembly, and
provider registration in one place.

### Root Cause

The API composition root grew without being broken into smaller assembly
functions.

### Selected Option

Extract smaller runtime assembly helpers while keeping `buildApp()` as a
high-level orchestrator.

### Proposed Tasks

1. Extract protected runtime assembly.
2. Extract provider adapter construction.
3. Extract operational hook registration.
4. Add negative-path tests for missing env and failed bootstrap paths.

## P2. Provider Adapter Contract Alignment

### Problem Summary

The real adapter contract used by the engine is broader than the documented
contract surface.

### Root Cause

Optional engine-only extensions were added without a fully aligned canonical
contract.

### Selected Option

Formalize the real adapter capability surface and segregate optional
capabilities where appropriate.

### Proposed Tasks

1. Define which adapter capabilities are core, optional, or runtime-specific.
2. Align engine-facing and contract-facing interfaces.
3. Document any optional capabilities such as lookup or pre-bootstrap helpers.

## P2. API Decoupled From Infrastructure

### Problem Summary

API behavior still depends on concrete provider and infrastructure details too
close to the HTTP boundary.

### Root Cause

Provider catalog and error interpretation are still partly hardcoded in the API
assembly layer.

### Selected Option

Move provider/runtime catalog decisions behind explicit configuration or ports
and reduce HTTP-layer coupling to concrete infrastructure details.

### Proposed Tasks

1. Move provider catalog and capability selection behind configuration.
2. Avoid name-based error branching when a typed result can be returned.
3. Add negative-path tests for auth and provider configuration failures.

## P3. SnapshotProjector Purity

### Problem Summary

The projector still carries behavior that looks more like domain ownership or
side-effect handling than pure replay logic.

### Root Cause

Replay responsibilities and domain concerns were not separated early enough.

### Selected Option

Keep the projector focused on replay/application and push domain ownership and
side effects out to the correct layers.

### Proposed Tasks

1. Remove remaining side effects from replay helpers.
2. Keep unknown-event handling explicit and observable without embedding domain
   logging into the pure replay path.
3. Add tests for unknown or future event handling semantics.
