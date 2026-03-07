---
title: ADR-012 Self-Evaluation Guide (for authors and reviewers)
status: Guide
---

# ADR-012 Self-Evaluation Guide (for authors and reviewers)

This is a **guide**, not a CI-validated checklist.  
Use it to prepare changes and to structure review discussions.

## How to use (fast)

1. Identify which areas your change touches:

- Design/architecture
- Contracts/schemas
- Persistence/ordering/idempotency
- Security/compliance
- Operations/observability/deployability
- Performance/scalability

1. For touched areas, answer only the relevant questions below (N/A everything else).

## A) Design & Architecture

- Is the change consistent with layering and boundaries?
- Are new abstractions justified (not pattern-for-pattern)?
- Does it preserve extensibility (Open/Closed) without modifying stable cores?
- Is the module cohesion improved or degraded?

## B) Contracts & Schemas

- Is the change backward compatible? If not, is it ARC-3?
- Are examples/golden vectors updated?
- Are versioning rules followed?

## C) Persistence / Ordering / Idempotency

- Any ordering or idempotency invariant impacted?
- Are replay/dedup tests updated?

## D) Security & Compliance

- Any new data exposure? authz/tenancy impact?
- Any audit-log / PII considerations?

## E) Operations

- Are errors observable and actionable?
- Are logs safe (no secrets/PII) and useful?

## F) Performance

- Any hot path changes? Evidence of no regression?

References:

- ADR-012 (criteria)
