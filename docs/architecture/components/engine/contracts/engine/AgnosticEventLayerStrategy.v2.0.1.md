# Agnostic Event Layer Strategy (v2.0.1)

The Run Events Contract acts as a standardized "interface" or "language" that decouples high-level business logic and monitoring from the specific execution engine (for example, Temporal, Conductor, Airflow, or Step Functions).

## 1) Engine Decoupling (Portability)

By defining its own lifecycle states and attempt counters (`logicalAttemptId` vs. `engineAttemptId`), the architecture ensures that switching the underlying orchestrator does not break downstream systems.

- Business logic remains pure.
- Engine-specific behaviors are isolated within adapters.

## 2) Event Sourcing as the Source of Truth

Instead of querying an orchestrator internal database (often proprietary and complex), the system treats this event log as the authoritative record.

- **Agnostic Projectors**: UI and Audit systems consume standardized events to build their own projections (current state views).
- **Operational Freedom**: Entire system state can be rebuilt by replaying the event log, regardless of which engine originally produced the events.

## 3) Unified Idempotency & Resiliency

The strict SHA-256 `idempotencyKey` derivation (Section 3.1) acts as a universal bridge. It guarantees that, regardless of event origin (cloud worker, local script, or legacy adapter), Append Authority applies consistent duplicate handling and prevents data duplication in distributed environments.

## 4) Three-Layer Integrity Guard

The agnostic layer does not only pass data; it protects data integrity.

- Transition validation at Projector Layer 3 detects malformed sequences.
- If an engine or adapter emits invalid order (for example, `RunCompleted` before `RunStarted`), the system can flag the run as `INCONSISTENT` without corrupting business projections.

## 5) Implementation Tip for the Agnostic Layer

To keep this layer clean, adapters should perform strict mapping:

- **Input**: engine-specific signals (for example, Temporal `ActivityTaskStarted`).
- **Output**: normative contract events (for example, `StepStarted` v2.0.1).
- **Constraint**: never leak engine-specific metadata into root event fields; place engine-specific diagnostics only inside `payload` (or dedicated metadata fields if strictly needed for debugging).
