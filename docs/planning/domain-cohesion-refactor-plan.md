---
title: Domain Cohesion Refactor Plan
status: Draft
owner: docs
last_reviewed: 2026-03-14
planning_type: proposal
---

# Domain Cohesion Refactor Plan

## Source

- Review of record: [20260314 Domain Cohesion Review](reviews/architecture-and-governance/20260314-domain-cohesion-review.md)

## Problem Summary

The review identifies fragmented domain ownership, weak aggregate boundaries,
SRP violations, infrastructure coupling, and missing negative-path coverage in
the current execution path.

## Root Cause

- No explicit aggregate root owns the lifecycle of `Run`.
- `WorkflowEngine` accumulated application, domain, policy, and
  observability responsibilities.
- Provider adapter contracts evolved faster than the documented boundary.
- `buildApp()` became a large composition root with runtime-specific wiring.
- Test coverage focuses more heavily on happy paths than on failure and
  mismatch cases.

## Constraints And Invariants

- `ADR-0003`: execution model sovereignty remains inside DVT.
- `ADR-0004`: append-only event sourcing, projection separation, and ordered
  replay remain mandatory.
- `ADR-0012`: plan integrity ownership stays at the adapter boundary.
- `ADR-0015`: status reads continue to use snapshot/read-model semantics.
- `AGENTS.md`: no stubs, no hidden debt, and concrete validation evidence are
  required before any slice is treated as complete.

## Options Considered

- Extract an explicit `RunAggregate` or `RunLifecycle` aggregate root.
- Split `WorkflowEngine` into narrower use-case or service collaborators.
- Formalize the real provider adapter contract instead of relying on implicit
  engine-only extensions.
- Refactor API wiring into smaller composition modules.
- Add dedicated negative-path coverage for transitions, mismatched IDs, auth
  failures, and bootstrap failures.
- Adopt a third-party DDD or DI framework.

## Selected Direction

Use incremental internal refactors instead of introducing a framework:

1. restore a clear aggregate boundary around `Run`
2. reduce `WorkflowEngine` to a thinner orchestration facade
3. align the documented adapter contract with the real engine usage
4. decouple API wiring from concrete runtime assembly
5. raise the negative-path testing baseline alongside each slice

This direction addresses the review findings without introducing an external
framework or redefining the execution model.

## Rejected Alternatives

- Keep the current distributed ownership model.
  Reason: it preserves the same coupling and invariant fragmentation.
- Introduce a DI or DDD framework.
  Reason: it adds infrastructure and conventions without solving the core
  ownership issues by itself.

## Planned Workstreams

### W1. Run Aggregate Boundary

Create an explicit owner for run lifecycle decisions, state transitions, and
replay semantics.

### W2. WorkflowEngine Responsibility Split

Move start, status, signal, and health responsibilities into narrower services
or coordinators and leave `WorkflowEngine` as a thinner facade.

### W3. Provider Contract Alignment

Document and type the real adapter capabilities required by the engine,
including optional lifecycle helpers such as pre-bootstrap or reconciliation
operations.

### W4. API Composition Root Cleanup

Break `buildApp()` into smaller wiring functions so operational bootstrap,
provider assembly, and protected runtime registration are not mixed together.

### W5. Negative-Path Coverage

Add direct tests for failure semantics, invalid transitions, identifier
mismatch, denied access, and bootstrap/runtime errors.

## Evidence Posture

These workstreams are planned, not closed:

- [ ] W1 slice implemented and validated
- [ ] W2 slice implemented and validated
- [ ] W3 slice implemented and validated
- [ ] W4 slice implemented and validated
- [ ] W5 slice implemented and validated

Closeout files should only be added when the corresponding implementation slice
has shipped with passing validation evidence.
