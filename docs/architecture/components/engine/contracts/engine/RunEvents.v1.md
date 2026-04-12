# Run Events Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line
**Version**: 1.0
**Consumers**: Append authority, projectors, UI, audit systems, runtime workers
**Parent Contract**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md)
**Related Contracts**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md), [State Store Contract](../state-store/README.md)
**Related ADRs**: [ADR-0007](../../../../../adr/ADR-0007_RunCancellation.md), [ADR-0047](../../../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md)

---

## Scope

This contract governs run and step lifecycle events emitted by the engine
runtime and adapter-owned runtime execution contexts.

Signal decision events remain defined by [SignalsAndAuth.v1.md](./SignalsAndAuth.v1.md).

## Known lifecycle events

- `RunQueued`
- `RunStarted`
- `StepStarted`
- `StepCompleted`
- `StepFailed`
- `StepSkipped`
- `RunPaused`
- `RunResumed`
- `RunCancelRequested`
- `RunCompleted`
- `RunFailed`
- `RunCancelled`

For signal-driven realized lifecycle facts, the runtime execution context is the
realized-event owner. The engine MAY validate and dispatch a command, but it
MUST NOT append the same realized lifecycle event on submission.

## Envelope requirements

All lifecycle events MUST include:

- `eventId`
- `eventType`
- `runId`
- `tenantId`, `projectId`, `environmentId`
- `planId`, `planVersion`
- `engineAttemptId`
- `logicalAttemptId`
- `idempotencyKey`
- `emittedAt`

`RunEventRecord` MUST additionally include:

- `runSeq`
- `persistedAt`

### `stepId` rule

- step-level events MUST include `stepId`
- run-level events MUST NOT include `stepId`

## Idempotency and duplicate handling

`idempotencyKey` MUST be derived exactly as:

```text
SHA256(runId | stepIdNormalized | logicalAttemptId | eventType | planId | planVersion)
```

Rules:

- `stepIdNormalized = 'RUN'` for run-level events
- `engineAttemptId` MUST NOT participate in derivation
- duplicate `(runId, idempotencyKey)` writes MUST return existing metadata and MUST NOT insert a duplicate record

## Two-phase shapes

```ts
interface RunEventWrite {
  eventId: string;
  eventType: string;
  emittedAt: string;
  runId: string;
  tenantId: string;
  projectId: string;
  environmentId: string;
  planId: string;
  planVersion: string;
  engineAttemptId: number;
  logicalAttemptId: number;
  idempotencyKey: string;
  stepId?: string;
  payload?: Record<string, unknown>;
}

interface RunEventRecord extends RunEventWrite {
  runSeq: number;
  persistedAt: string;
}
```

## Known payload rules

- `RunCancelRequested` MAY include `{ reason }`
- `StepCompleted` MAY include `{ gatewayDecision }`, `{ resultEvidence }`, or both
- `StepFailed` MAY include `{ reason, message }`
- `RunCompleted` MAY include `{ executor, resultEvidence }`
- `RunFailed` MUST include `{ reason }` and MAY include `{ executor, message }`

`resultEvidence` is the canonical payload key for caller-visible runtime
outcome evidence.

## State transition mapping

| Event                | Canonical effect                             |
| -------------------- | -------------------------------------------- |
| `RunStarted`         | `status = RUNNING`                           |
| `RunPaused`          | `status = PAUSED`                            |
| `RunResumed`         | `status = RUNNING`                           |
| `RunCancelRequested` | `status = RUNNING`, `substatus = CANCELLING` |
| `RunCompleted`       | `status = COMPLETED`                         |
| `RunFailed`          | `status = FAILED`                            |
| `RunCancelled`       | `status = CANCELLED`                         |
| `StepStarted`        | step `PENDING -> RUNNING`                    |
| `StepCompleted`      | step `RUNNING -> SUCCESS`                    |
| `StepFailed`         | step `RUNNING -> FAILED`                     |
| `StepSkipped`        | step `PENDING -> SKIPPED`                    |

## Projection enforcement

Projectors MUST:

- validate transitions while reducing the append-only stream
- refuse to corrupt derived state on invalid transitions
- alert on invalid transition detection with deterministic metadata
- treat duplicate persisted events as no-op reductions

## Change log

- **1.0 (2026-04-10)**: Reset the active lifecycle-event contract to one canonical pre-stable `v1` line with runtime-owned cancellation ordering and current payload rules.
