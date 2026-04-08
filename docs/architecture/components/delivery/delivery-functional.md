---
title: Delivery Functionalities
status: Active
owner: Delivery / Docs
last_reviewed: 2026-04-07
topics:
  - Functionalities
  - Runtime Responsibilities
  - Key Files & References
---

# Delivery Functionalities

## Active capabilities

- drain outbox records for downstream delivery
- rebuild read models through projector workers
- emit lineage payloads from delivery-side observers and workers
- provide explicit admission helper logic used by API/runtime orchestration

## Code anchors

- [OutboxWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts)
- [ProjectorWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts)
- [LineageOutboxObserver.ts](../../../../packages/@dvt/delivery/src/application/LineageOutboxObserver.ts)
- [LineageWorkerRuntime.ts](../../../../packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts)
- [StartRunAdmissionGuard.ts](../../../../packages/@dvt/delivery/src/backpressure/StartRunAdmissionGuard.ts)
