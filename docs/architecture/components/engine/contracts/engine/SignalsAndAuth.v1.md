# Signals and Authorization Contract (Normative v1)

> Historical note: this draft no longer treats `RETRY_STEP` as part of the
> canonical signal boundary. See
> [ADR-0048](../../../../../adr/ADR-0048-retry-step-as-separate-engine-use-case.md).
> Business run recovery is also outside the generic `signal(...)` contract; see
> [ADR-0049](../../../../../adr/ADR-0049-retry-run-as-separate-recovery-use-case.md).
> Realized lifecycle events triggered by signals are runtime-owned per
> [ADR-0047](../../../../../adr/ADR-0047-runtime-owned-realized-lifecycle-for-signal-driven-transitions.md).

[Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line  
**Version**: v1  
**Stability**: Active pre-stable line - rewrite in place  
**Consumers**: Engine, Authorization Service, Audit Systems, UI  
**Parent Contract**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md)  
**References**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md), [ADR-0040](../../../../../adr/ADR-0040-retry-ownership-and-attempt-authority.md), [ADR-0048](../../../../../adr/ADR-0048-retry-step-as-separate-engine-use-case.md), [ADR-0049](../../../../../adr/ADR-0049-retry-run-as-separate-recovery-use-case.md)

---

## 1) Scope

This contract governs the canonical engine signal boundary and the minimum
authorization/idempotency rules for those signals.

It does not govern speculative admin/operator commands that are not present in
`@dvt/contracts`.

It also does not define business run recovery. Any future recover-run command
must use a dedicated engine or application use case rather than
`signal(..., { type: 'RETRY_RUN' })`.

It also does not define a step-retry command surface. Any future step-scoped
retry must be introduced as a dedicated engine or application use case rather
than as `signal(..., { type: 'RETRY_STEP' })`.

## 2) Canonical signal set

Canonical `SignalType` is:

- `PAUSE`
- `RESUME`
- `CANCEL`

Transport note:

- the canonical engine contract is limited to `PAUSE`, `RESUME`, and `CANCEL`;
- business run recovery is governed separately by
  [ADR-0040](../../../../../adr/ADR-0040-retry-ownership-and-attempt-authority.md)
  and [ADR-0049](../../../../../adr/ADR-0049-retry-run-as-separate-recovery-use-case.md);
- the shipped HTTP/API runtime surface is aligned with this canonical signal set.

### 2.1 Signal intent summary

| SignalType | Canonical? | Intent                           | Notes                                                           |
| ---------- | ---------- | -------------------------------- | --------------------------------------------------------------- |
| `PAUSE`    | yes        | stop scheduling new work         | realized lifecycle fact is `RunPaused`, runtime-owned           |
| `RESUME`   | yes        | resume scheduling work           | realized lifecycle fact is `RunResumed`, runtime-owned          |
| `CANCEL`   | yes        | request cooperative cancellation | runtime-owned lifecycle is `RunCancelRequested -> RunCancelled` |

Business run recovery is intentionally outside this table. It is not a generic
signal and must be governed by a dedicated recovery contract.

### 2.2 RETRY_STEP boundary

- `RETRY_STEP` is NOT part of canonical `SignalType`.
- Step retry requires a dedicated engine or application use case.
- Active docs MUST NOT widen the generic signal boundary by reintroducing
  `RETRY_STEP` as a signal.

---

## 3) SignalRequest schema

```ts
interface SignalRequest {
  signalId: string; // caller-provided idempotency identifier
  type: SignalType;
  reason?: string;
  requestedAt?: string; // ISO 8601 UTC
}
```

### 3.1 Idempotency rule (NORMATIVE)

- `signalId` is caller-supplied.
- The signal idempotency key is `(tenantId, runId, signalId)`.
- Repeated delivery of the same tuple MUST be treated as the same logical
  signal request.

### 3.2 Authorization baseline (NORMATIVE)

- Signals MUST be tenant-authorized before execution.
- Authorization MUST run before the engine dispatches the command to the
  adapter/runtime.
- Authorization MAY record a decision/audit artifact, but this draft does not
  require a specific persisted decision-record schema.

### 3.3 Role baseline (DRAFT)

| Role       | Allowed canonical signals   |
| ---------- | --------------------------- |
| `Operator` | `PAUSE`, `RESUME`, `CANCEL` |
| `Engineer` | `PAUSE`, `RESUME`, `CANCEL` |

This role table is intentionally narrow. It does not define permissions for
non-canonical commands or for dedicated recovery use cases.

---

## 4) Runtime-owned lifecycle consequence

For signal-driven realized lifecycle events:

- the engine validates and dispatches the signal;
- the runtime execution context emits the realized lifecycle event when the
  state is actually reached;
- the engine core MUST NOT append the same realized lifecycle `EventType` on
  submission.

This applies to `RunPaused`, `RunResumed`, `RunCancelRequested`, and
`RunCancelled`.

---

## 5) Error posture

The exact transport error mapping is out of scope for this draft, but canonical
signal handling MUST preserve these distinctions:

- invalid signal request shape -> validation failure before dispatch;
- unauthorized signal -> authorization failure before dispatch;
- unsupported runtime capability -> fail closed;
- duplicate redelivery of the same `(tenantId, runId, signalId)` -> idempotent
  handling, not a second logical signal.

---

## 6) Out of scope for this contract

- speculative admin-only commands such as `UPDATE_PARAMS`, `INJECT_OVERRIDE`,
  `UPDATE_TARGET`, or `EMERGENCY_STOP`;
- step-scoped retry as a signal;
- approval-workflow schemas;
- transport-specific HTTP status mapping.

---

## 7) Change log

- **v1 (2026-02-12)**: Draft signal and authorization baseline.
- **v1 (2026-04-08)**: Narrowed to the real canonical signal boundary, removed
  speculative commands from active guidance, and aligned the request shape with
  `@dvt/contracts`.
