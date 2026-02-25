# TD-0012 — PR-1 P0 Conformance Checklist

Status: Active  
Date: 2026-02-20

## Scope

PR-1 must guarantee correctness of the event model and the first-write path.

Out of scope for PR-1 unless explicitly pulled in:

- EngineRunRef → runHandle public API change (recommended to align with bootstrap refactor; otherwise defer to PR-3 and track explicitly).

## Acceptance Criteria (P0)

### Event model conformance

1. IdempotencyKeyBuilder matches contract formula exactly (SHA-256, field order, normalization).
2. Golden vectors for idempotencyKey derivation run in CI and are a required gate.
3. RunEventInput includes required fields:
   - eventId (stable across retries)
   - planId, planVersion
   - engineAttemptId (required; default=1 when not exposed)
   - idempotencyKey (producer-derived)
4. stepId compile-time enforcement uses the two-variant union:
   - RunLevelEventInput uses `stepId?: never`
   - StepLevelEventInput uses `stepId: string`
5. Append API returns AppendResult {appended, deduped}; only appended are eligible for outbox enqueue.

### Run bootstrap correctness

1. RunMetadata includes planId + planVersion.
2. Initial write is atomic: RunMetadata + first events + outbox enqueue in one transaction via `bootstrapRunTx`.
3. Engine emits RunQueued only; RunStarted is adapter-owned (ADR-0011).
4. Projectors MUST treat RunQueued→RunFailed / RunQueued→RunCancelled as valid terminal sequences.

### Plan metadata fields (Phase 1)

1. If plan.metadata.requiresCapabilities is non-empty, startRun hard-fails with CAPABILITIES_NOT_SUPPORTED.
2. If plan.metadata.targetAdapter conflicts with context.targetAdapter, startRun hard-fails with a field-specific error.
3. ADR-0012: Remove `planFetcher` and `planIntegrity` from `WorkflowEngineDeps`; engine validates PlanRef metadata only; adapters fetch+validate bytes.

### Forward compatibility

1. Projector unknown event policy: **Policy A** (no-op + alert, continue projection).

## Deployment constraint

Schema migrations required by this PR MUST ship in the same PR (run_events + run_metadata changes).
