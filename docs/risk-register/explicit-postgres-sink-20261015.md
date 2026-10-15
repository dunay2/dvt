---
id: R-20261015-EXPLICIT-POSTGRES-SINK
title: Explicit Sink identity across authoring and publication admission
status: Mitigating
date: 2026-10-15
owners:
  - API
  - Contracts
  - PostgreSQL publication
severity: High
probability: Medium
---

# Explicit Sink Identity Across Authoring And Publication Admission

## Risk

A duplicated destination policy could publish both a durable Transform result and
a Sink, silently select an inherited connection, or dispatch the semantic node
instead of the publication boundary. A producer-only rollout could emit a new
Run shape to an old worker. TypeScript-only validation can also hide a divergent
PostgreSQL draft constraint and prevent saving an otherwise admitted graph.

## Mitigation

- Admit exactly one of terminal table result or ephemeral result plus one Sink.
  Keep the semantic Transform ID separate from the publication step ID and bind
  both to the immutable workload hash and selected graph.
- Require explicit destination confirmation. Resolve the same PostgreSQL
  connection in the authorized tenant/project/environment; do not infer runtime
  permission from UI provenance or accept cross-connection transfer.
- Reuse one publication selector in context admission and execution, one physical
  target contract, and the existing ADR-0066 publisher. Preserve schema identity,
  compare-and-swap, idempotency, stable table identity and unmanaged-target fences.
- Reject unsupported Sink modes, missing/extra dependencies, multiple Sinks,
  stale projection identity and double publication before derived SQL publication.
- Project the canonical Transform disposition catalog into the existing draft
  constraint; retain malformed-value and ephemeral-target conflict rejection.
  Existing migration replaces the function without deleting draft data.
- Deploy API/contracts/worker together. Old consumers reject the added V1 shape;
  rollback restores the matching producer/consumer set and recreates affected
  plans. Integration does not authorize a shared worker restart or data reset.

## Evidence And Limits

[Explicit Sink evidence](../evidence/ED-20261015-explicit-postgres-sink.md) records
the executed checks and their boundaries. One Sink still lowers to one workload;
plural native workloads, view/incremental execution and federated transfer are
not established by this cut. #3115, #2524 and #2599 retain their broader acceptance.
This rollout risk remains open until coordinated activation is recorded.
