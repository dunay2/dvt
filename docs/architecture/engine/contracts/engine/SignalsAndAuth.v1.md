# Signals and Authorization Contract (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT  
**Version**: v1
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: Engine, Authorization Service, Audit Systems, UI  
**Parent Contract**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)  
**References**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)

**Version alignment**: Contract v1 aligns with parent IWorkflowEngine.v1 and ExecutionSemantics.v1.

---

## 1) Supported Signals Catalog (Complete)

Signals are **operator actions** routed to the engine and **ALWAYS enforced by `IAuthorization`** (RBAC + tenant scoping).

### 1.1 Signal Types and Requirements

**Destructive signals** (require justification and trigger P1 alerts):

- `UPDATE_PARAMS`
- `INJECT_OVERRIDE`
- `UPDATE_TARGET`
- `EMERGENCY_STOP`

| SignalType        | Payload                                   | RBAC Role | Destructive? | Effect                                   | Status     |
| ----------------- | ----------------------------------------- | --------- | ------------ | ---------------------------------------- | ---------- |
| `PAUSE`           | `{ reason?: string }`                     | Operator  | No           | Pauses future step scheduling            | ✅ Phase 1 |
| `RESUME`          | `{}`                                      | Operator  | No           | Resumes paused run                       | ✅ Phase 1 |
| `CANCEL`          | `{ reason?: string }`                     | Operator  | No           | Cancels run → terminal state `CANCELLED` | ✅ Phase 1 |
| `RETRY_STEP`      | `{ stepId, force?: boolean }`             | Engineer  | No           | Retries failed step                      | ✅ Phase 1 |
| `RETRY_RUN`       | `{ reason?: string, force?: boolean }`    | Engineer  | No           | Re-executes run as a new run             | ✅ Phase 1 |
| `UPDATE_PARAMS`   | `{ params: object }`                      | Admin     | **YES**      | Updates runtime parameters               | ✅ Phase 1 |
| `INJECT_OVERRIDE` | `{ stepId, override: object }`            | Admin     | **YES**      | Injects override for next step           | ✅ Phase 1 |
| `ESCALATE_ALERT`  | `{ level: AlertLevel, note?: string }`    | System    | No           | Emits escalation audit event             | ✅ Phase 1 |
| `SKIP_STEP`       | `{ stepId, reason?: string }`             | Engineer  | No           | Skips a step                             | ⏳ Phase 2 |
| `UPDATE_TARGET`   | `{ stepId, newTarget: object }`           | Admin     | **YES**      | Changes target schema/db                 | ✅ Phase 1 |
| `EMERGENCY_STOP`  | `{ reason: string, forceKill?: boolean }` | Admin     | **YES**      | Immediate termination                    | ⏳ Phase 3 |

#### 1.1.1 CANCEL vs EMERGENCY_STOP (NORMATIVE)

- `CANCEL` is **cooperative**: the engine MUST attempt to terminate safely, preserving invariants, and MUST transition to terminal state `CANCELLED`.
- `EMERGENCY_STOP` is **non-cooperative**: intended for emergencies; MAY terminate immediately and MAY leave in-flight side effects. It is destructive and triggers P1 alerts.
- `forceKill` is ONLY valid for `EMERGENCY_STOP`.

#### 1.1.2 RETRY_RUN semantics (NORMATIVE)

- `RETRY_RUN` MUST create a **new run** with a **new `runId`**.
- The original failed run remains **immutable** for audit.
- Correlation MUST be preserved via `originalRunId` (stored in run context/metadata of the new run).

#### 1.1.3 Alert levels (NORMATIVE)

```ts
type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL' | 'P1';
```

`ESCALATE_ALERT` is **System-only**: external callers MUST NOT invoke it. Engine behavior MUST be:

1. persist decision record (even if rejected)
2. emit a `RunEvent::ALERT_ESCALATED` to the run event stream / EventBus (adapter-defined)

---

### 1.2 Signal Ordering Constraints (NORMATIVE)

Signals are processed in the order they are received (best-effort). The engine MUST enforce step-state constraints:

- `RETRY_STEP` sent to a step in `RUNNING` MUST be rejected with `STEP_NOT_TERMINAL`.
- `SKIP_STEP` sent to a step in `COMPLETED` or `FAILED` MUST be rejected with `STEP_TERMINAL`.
- Signals sent to a **terminal run** MUST be rejected with `RUN_TERMINAL`, except `ESCALATE_ALERT` which MAY be allowed if it does not mutate run state (adapter MUST document behavior).

---

## 1.3 Signal Payload Schemas (NORMATIVE)

Each signal payload MUST conform to its schema. Invalid payloads MUST be rejected with `SIGNAL_INVALID_PAYLOAD` **before** authorization evaluation.

| SignalType        | Schema Reference                                                                     |
| ----------------- | ------------------------------------------------------------------------------------ |
| `PAUSE`           | [schemas/signal/Pause.v1.json](../../schemas/signal/Pause.v1.json)                   |
| `RESUME`          | [schemas/signal/Resume.v1.json](../../schemas/signal/Resume.v1.json)                 |
| `CANCEL`          | [schemas/signal/Cancel.v1.json](../../schemas/signal/Cancel.v1.json)                 |
| `RETRY_STEP`      | [schemas/signal/RetryStep.v1.json](../../schemas/signal/RetryStep.v1.json)           |
| `RETRY_RUN`       | [schemas/signal/RetryRun.v1.json](../../schemas/signal/RetryRun.v1.json)             |
| `UPDATE_PARAMS`   | [schemas/signal/UpdateParams.v1.json](../../schemas/signal/UpdateParams.v1.json)     |
| `INJECT_OVERRIDE` | [schemas/signal/InjectOverride.v1.json](../../schemas/signal/InjectOverride.v1.json) |
| `ESCALATE_ALERT`  | [schemas/signal/EscalateAlert.v1.json](../../schemas/signal/EscalateAlert.v1.json)   |
| `SKIP_STEP`       | [schemas/signal/SkipStep.v1.json](../../schemas/signal/SkipStep.v1.json)             |
| `UPDATE_TARGET`   | [schemas/signal/UpdateTarget.v1.json](../../schemas/signal/UpdateTarget.v1.json)     |
| `EMERGENCY_STOP`  | [schemas/signal/EmergencyStop.v1.json](../../schemas/signal/EmergencyStop.v1.json)   |

---

## 2) SignalRequest Schema (REQUIRED for Idempotency)

```ts
interface SignalRequest {
  signalId: string; // Client-supplied UUID v4 (idempotency key)
  signalType: SignalType;
  payload: Record<string, unknown>; // Signal-specific payload (validated against schema)
}
```

### 2.1 Idempotency Rule (NORMATIVE)

- `signalId` is client-supplied UUID v4
- Engine stores handling result via StateStore upsert
- Repeated `signalId` delivery is a no-op (engine performs no further action; decision record is retrievable)
- Prevents duplicate signal processing (network retries, client bugs)

**Idempotency key** (normative):

```
(tenantId, runId, signalId)
```

**Resolution**:

- `tenantId`: resolved from stored run metadata in StateStore using `engineRunRef.runId`
- `runId`: from `engineRunRef.runId` (REQUIRED in all EngineRunRef instances)
- `signalId`: from `SignalRequest.signalId`

**Decision record retrieval**:
Clients can query `SignalDecisionRecord` by `(tenantId, runId, signalId)` or `policyDecisionId` via StateStore.

**Method signature** (see parent contract):

```ts
signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>
```

> **Future consideration (non-normative, v1.2 candidate)**: return `SignalResult` with references to decision record ids to avoid out-of-band querying.

---

## 3) Authorization & Signal Decision Records (MANDATORY)

Every signal MUST generate a `SignalDecisionRecord` **BEFORE** the engine applies it.

### 3.1 SignalDecisionRecord Schema

```ts
interface SignalDecisionRecord {
  signalDecisionId: string; // UUID v4
  signalId: string; // Client-supplied (from SignalRequest)
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED';
  reason?: string; // Decision/policy explanation (e.g., why rejected)
  policyDecisionId: string; // IAuthorization ref

  audit: {
    actorId: string;
    actorRole: string; // Effective role used for this decision
    tenantId: string;
    timestamp: string; // ISO 8601 UTC
    reason?: string; // Operator-provided justification (REQUIRED for destructive signals)
    sourceIp?: string;
  };

  signalType: SignalType;
  signalPayload: Record<string, unknown>; // Validated by schema + policy/runtime

  engineProcessedAt?: string;
  engineResult?: { status: 'success' | 'failure'; errorCode?: string };

  approvalRequired?: boolean;
  approvedBy?: string;
  approvalTimestamp?: string;
}
```

### 3.2 Decision Flow

1. Signal received → payload validated (schema)
2. `IAuthorization.evaluateSignal()` called
3. Decision made → `SignalDecisionRecord` persisted (MANDATORY)
4. If ACCEPTED → engine applies signal
5. If REJECTED → client receives error with `policyDecisionId`
6. If REVISION_REQUIRED → requires approval workflow (out of scope)

**Approval workflow scope**:
When `requiresApproval=true`, engine MUST NOT apply the signal until an external approval service updates the decision record to `ACCEPTED`. Approval workflow contract is pending publication (Draft).

---

## 4) IAuthorization Contract

```ts
interface IAuthorization {
  evaluateSignal(request: {
    actor: { userId: string; roles: string[] };
    signal: { type: SignalType; payload: Record<string, unknown> };
    tenantId: string;
    runId: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    requiresApproval?: boolean;
    policyDecisionId: string;
  }>;
}
```

### 4.1 Actor field mapping + effective role resolution (NORMATIVE)

- `actor.userId`: unique user identifier (maps to `audit.actorId`)
- `actor.roles[]`: user's assigned roles
- Authorization MUST compute an **effectiveRole** used to satisfy policy for the requested signal.
- `audit.actorRole` MUST equal this **effectiveRole**.

**Effective role resolution rule (NORMATIVE)**:

1. Authorization policy MUST determine the set of roles possessed by the actor that individually satisfy the signal RBAC requirement.
2. From this set, the **least permissive role** MUST be selected according to role hierarchy:  
   `Admin > Engineer > Operator > System`
3. `audit.actorRole` MUST be set to the selected role.

### 4.2 RBAC Role Requirements

| Role       | Allowed Signals                                                                       |
| ---------- | ------------------------------------------------------------------------------------- |
| `Operator` | `PAUSE`, `RESUME`, `CANCEL`                                                           |
| `Engineer` | `RETRY_STEP`, `RETRY_RUN`, `SKIP_STEP` (+ all Operator signals)                       |
| `Admin`    | `UPDATE_PARAMS`, `INJECT_OVERRIDE`, `UPDATE_TARGET`, `EMERGENCY_STOP` (+ all signals) |
| `System`   | `ESCALATE_ALERT` (automated escalation only)                                          |

### 4.3 Reason Requirements (Destructive Signals)

**Destructive signals** (formal definition):

```ts
type DestructiveSignalType =
  | 'UPDATE_PARAMS'
  | 'INJECT_OVERRIDE'
  | 'UPDATE_TARGET'
  | 'EMERGENCY_STOP';
```

Destructive signals MUST include `audit.reason` (non-empty string).

If missing/empty, authorization MUST reject with:

```
AUTHZ_REASON_REQUIRED: Destructive signal requires justification
```

### 4.4 policyDecisionId generation (NORMATIVE)

`policyDecisionId` MUST be a UUID v4 generated by the Authorization service. It MUST be globally unique and stable for audit correlation.

---

## 5) Storage Requirements

### 5.1 Persistence (MANDATORY)

`SignalDecisionRecord` MUST be persisted:

- Storage: same database as StateStore
- Transaction: same transaction if possible (atomicity)
- Retention: minimum 7 years (compliance)

**Transactionality (NORMATIVE)**:

- If persistence of the `SignalDecisionRecord` fails, the engine MUST treat this as a hard failure and MUST NOT apply the signal.

**GDPR stance (NORMATIVE)**:

- Audit records are security/compliance logs and MUST be retained for the retention period.
- PII fields MUST be minimized and MAY be pseudonymized/anonymized according to policy/legal basis.

### 5.2 Indexing

Index by:

- `(tenantId, runId, timestamp)` — for audit queries
- `signalId` — for idempotency lookups
- `policyDecisionId` — for audit trail correlation

---

## 6) Security & Lifecycle Considerations

### 6.1 Tenant Isolation

- Authorization MUST validate `tenantId` matches actor's tenant
- Cross-tenant signal delivery MUST be rejected with `AUTHZ_TENANT_FORBIDDEN`
- Audit logs MUST record attempted cross-tenant access

### 6.2 Audit Trail

- All signals (accepted, rejected, pending) MUST be logged
- Destructive signals trigger P1 alerts
- Failed authorization attempts trigger security monitoring

### 6.3 Replay Protection

- `signalId` prevents duplicate processing
- StateStore upsert ensures idempotency via key `(tenantId, runId, signalId)`
- Replay of old `signalId` is a no-op

### 6.4 Error Codes (Normative)

The following error codes MUST be used for signal failures (transport mapping is adapter-specific):

| Error Code               | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `AUTHZ_DENIED`           | Authorization denied (generic)                                 |
| `AUTHZ_REASON_REQUIRED`  | Destructive signal missing required justification              |
| `AUTHZ_TENANT_FORBIDDEN` | Cross-tenant access attempt                                    |
| `SIGNAL_DUPLICATE`       | Signal already processed (idempotency key collision)           |
| `SIGNAL_NOT_FOUND`       | Decision record not found for query                            |
| `SIGNAL_INVALID_PAYLOAD` | Payload failed schema validation (reject before authorization) |
| `RUN_TERMINAL`           | Signal rejected because run is already in terminal state       |
| `STEP_NOT_TERMINAL`      | Step is not in a terminal state (e.g., cannot retry RUNNING)   |
| `STEP_TERMINAL`          | Step is already terminal where signal requires non-terminal    |

### 6.5 Rate limiting (RECOMMENDED)

Implementations SHOULD enforce per-tenant/per-run signal rate limits to prevent signal storms. Exceeded limits SHOULD return a transport-specific "rate limited" error.

---

## 7) References

- Parent Contract: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md)
- Run Events: [RunEvents.v1.md](./RunEvents.v1.md)
- Execution Semantics: [ExecutionSemantics.v1.1.md](./ExecutionSemantics.v1.md)
- Approval Workflow (Draft): pending publication
- UUID v4 (RFC 4122): https://www.rfc-editor.org/rfc/rfc4122

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1.1   | 2026-02-12 | **PATCH**: Align with ExecutionSemantics v1.1.1 and IWorkflowEngine v1.1.1. Add `CANCEL`, `RETRY_RUN` to Phase 1; clarify `CANCEL` vs `EMERGENCY_STOP` semantics (§1.1.1); move `UPDATE_TARGET` to Phase 1; define `RETRY_RUN` immutability semantics (§1.1.2); add `AlertLevel` enum and System-only enforcement for `ESCALATE_ALERT` (§1.1.3); add signal ordering constraints (§1.2); add payload schema validation table (§1.3) with 11 JSON Schemas; define effective role resolution rule (§4.1); add `policyDecisionId` UUID v4 requirement (§4.4); add transactionality rule for decision record persistence (§5.1); add GDPR stance (§5.1); expand error codes: `SIGNAL_INVALID_PAYLOAD`, `RUN_TERMINAL`, `STEP_NOT_TERMINAL`, `STEP_TERMINAL` (§6.4); remove HTTP status codes (moved to ErrorMapping.v1.md); add rate limiting recommendation (§6.5); update references to v1.1.1; fix RBAC table to include `CANCEL` in Operator role (§4.2). |
| 1.1     | 2026-02-12 | Extracted from IWorkflowEngine.reference.v1.md to reduce churn. Added RBAC table. **Critical fixes**: Declare signal idempotency key (tenantId, runId, signalId), clarify no-op behavior, scope approval workflow, normalize actor fields, define DestructiveSignalType enum, formalize error codes (AUTHZ_DENIED, AUTHZ_TENANT_FORBIDDEN).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
