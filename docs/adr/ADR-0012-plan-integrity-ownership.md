# ADR-0012 — Plan Integrity Ownership

Status: Proposed  
Date: 2026-02-20

## Context

The current engine start path performs `planIntegrity.fetchAndValidate(...)` before calling the provider adapter, while adapters may also fetch/validate. This causes double fetches and ambiguous ownership.

In a run-driven model, adapters execute the plan and therefore must validate plan bytes in their own execution context (e.g., Temporal worker).

## Decision

- The **engine** validates **PlanRef metadata only**:
  - URI scheme/host allowlist
  - declared schema version compatibility
  - presence/format checks (planId/planVersion/sha256 fields)
- The **adapter** owns **plan byte fetch and integrity validation**:
  - fetch plan bytes using PlanRef.uri
  - verify SHA-256 matches PlanRef.sha256
  - validate plan schema/body for adapter execution

The engine MUST NOT fetch plan bytes as part of `startRun()`.

The engine uses `PlanRef.planId` and `PlanRef.planVersion` directly for:

- RunMetadata persistence
- initial RunQueued emission
  without fetching the plan body.

## Consequences

- Removes a network call from engine hot path.
- Eliminates double fetch behavior.
- Makes Temporal worker topology consistent: worker fetches plan bytes where execution happens.
- `planFetcher` and `planIntegrity` are **removed from `WorkflowEngineDeps`** (engine no longer depends on them).

## Security note

This shifts integrity enforcement of plan bytes to adapters; adapter implementations MUST be treated as part of the trusted computing base for plan execution.
