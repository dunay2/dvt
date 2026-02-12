# Signals and Authorization Contract (Normative v1.1)

**Status**: Normative (MUST / MUST NOT)  
**Version**: 1.1  
**Stability**: Contracts — breaking changes require version bump  
**Consumers**: Engine, Authorization Service, Audit Systems, UI  
**Parent Contract**: [IWorkflowEngine.v1.1.md](./IWorkflowEngine.v1.1.md)  
**References**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)

---

## 1) Supported Signals Catalog (Complete)

Signals are **operator actions** routed to the engine, **ALWAYS enforced by `IAuthorization`** (RBAC + tenant scoping).

### 1.1 Signal Types and Requirements

**Destructive signals** (require justification and trigger P1 alerts):

- `UPDATE_PARAMS`
- `INJECT_OVERRIDE`
- `UPDATE_TARGET`
- `EMERGENCY_STOP`

| SignalType        | Payload                                   | RBAC Role | Destructive? | Effect                         | Status     |
| ----------------- | ----------------------------------------- | --------- | ------------ | ------------------------------ | ---------- |
| `PAUSE`           | `{ reason?: string }`                     | Operator  | No           | Pauses future step scheduling  | ✅ Phase 1 |
| `RESUME`          | `{}`                                      | Operator  | No           | Resumes paused run             | ✅ Phase 1 |
| `RETRY_STEP`      | `{ stepId, force?: boolean }`             | Engineer  | No           | Retries failed step            | ✅ Phase 1 |
| `UPDATE_PARAMS`   | `{ params: object }`                      | Admin     | **YES**      | Updates runtime parameters     | ✅ Phase 1 |
| `INJECT_OVERRIDE` | `{ stepId, override: object }`            | Admin     | **YES**      | Injects override for next step | ✅ Phase 1 |
| `ESCALATE_ALERT`  | `{ level: string, note?: string }`        | System    | No           | Triggers escalation            | ✅ Phase 1 |
| `SKIP_STEP`       | `{ stepId, reason?: string }`             | Engineer  | No           | Skips a step                   | ⏳ Phase 2 |
| `UPDATE_TARGET`   | `{ stepId, newTarget: object }`           | Admin     | **YES**      | Changes target schema/db       | ⏳ Phase 2 |
| `EMERGENCY_STOP`  | `{ reason: string, forceKill?: boolean }` | Admin     | **YES**      | Immediate termination          | ⏳ Phase 3 |

---

## 2) SignalRequest Schema (REQUIRED for Idempotency)

```ts
interface SignalRequest {
  signalId: string; // Client-supplied UUID v4 (idempotency key)
  signalType: SignalType;
  payload: Record<string, unknown>; // Signal-specific payload (varies by type)
}
```

### 2.1 Idempotency Rule

- **`signalId`** is **client-supplied UUID v4**
- Engine stores handling result via StateStore upsert
- Repeated `signalId` delivery is a **no-op** (engine performs no further action; decision record is retrievable via StateStore)
- Prevents duplicate signal processing (network retries, client bugs)

**Idempotency key** (normative):

```
(tenantId, runId, signalId)
```

**Resolution**:

- `tenantId`: Resolved from stored run metadata in StateStore using `engineRunRef.runId`
- `runId`: From `engineRunRef.runId` (REQUIRED in all EngineRunRef instances)
- `signalId`: From `SignalRequest.signalId`

**Decision record retrieval**:
Clients can query `SignalDecisionRecord` by `(tenantId, runId, signalId)` or `policyDecisionId` via StateStore.

**Method signature** (see parent contract):

```ts
signal(engineRunRef: EngineRunRef, request: SignalRequest): Promise<void>
```

---

## 3) Authorization & Signal Decision Records (MANDATORY)

Every signal **MUST** generate a `SignalDecisionRecord` **BEFORE** engine processes it.

### 3.1 SignalDecisionRecord Schema

```ts
interface SignalDecisionRecord {
  signalDecisionId: string; // UUID v4
  signalId: string; // Client-supplied (from SignalRequest)
  decision: 'ACCEPTED' | 'REJECTED' | 'REVISION_REQUIRED';
  reason?: string;
  policyDecisionId: string; // IAuthorization ref

  audit: {
    actorId: string;
    actorRole: string; // "Operator", "Engineer", "Admin", "System"
    tenantId: string;
    timestamp: string; // ISO 8601 UTC
    reason?: string; // REQUIRED for destructive signals
    sourceIp?: string;
  };

  signalType: SignalType;
  signalPayload: Record<string, unknown>; // Validated by policy/runtime

  engineProcessedAt?: string;
  engineResult?: { status: 'success' | 'failure'; errorCode?: string };

  approvalRequired?: boolean;
  approvedBy?: string;
  approvalTimestamp?: string;
}
```

### 3.2 Decision Flow

1. **Signal received** → `IAuthorization.evaluateSignal()` called
2. **Decision made** → `SignalDecisionRecord` persisted (MANDATORY)
3. **If ACCEPTED** → Engine processes signal
4. **If REJECTED** → Client receives error with `policyDecisionId`
5. **If REVISION_REQUIRED** → Requires approval workflow (out of scope)

**Approval workflow scope**:
When `requiresApproval=true`, engine MUST NOT apply the signal until an external approval service updates the decision record to `ACCEPTED`. Approval workflow contract is defined in `ApprovalWorkflow.v1.md` (future spec, TBD).

---

## 4) IAuthorization Contract

```ts
interface IAuthorization {
  evaluateSignal(request: {
    actor: { userId: string; roles: string[] };
    signal: { type: SignalType; payload: Record<string, unknown> }; // Validated by policy
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

**Actor field mapping**:

- `actor.userId`: Unique user identifier (maps to `audit.actorId` in decision record)
- `actor.roles[]`: User's assigned roles (authorization resolves effective `audit.actorRole` from this list)
- `audit.actorRole`: **Effective role** used for this decision (single role string, derived from `roles[]` by policy)

### 4.1 RBAC Role Requirements

| Role       | Allowed Signals                                                                       |
| ---------- | ------------------------------------------------------------------------------------- |
| `Operator` | `PAUSE`, `RESUME`                                                                     |
| `Engineer` | `RETRY_STEP`, `SKIP_STEP` (+ all Operator signals)                                    |
| `Admin`    | `UPDATE_PARAMS`, `INJECT_OVERRIDE`, `UPDATE_TARGET`, `EMERGENCY_STOP` (+ all signals) |
| `System`   | `ESCALATE_ALERT` (automated escalation only)                                          |

### 4.2 Reason Requirements (Destructive Signals)

**Destructive signals** (formal definition):

```typescript
type DestructiveSignalType =
  | 'UPDATE_PARAMS'
  | 'INJECT_OVERRIDE'
  | 'UPDATE_TARGET'
  | 'EMERGENCY_STOP';
```

Destructive signals MUST include `audit.reason` field (non-empty string).

If `reason` is missing or empty, authorization MUST reject with error code:

```
AUTHZ_REASON_REQUIRED: Destructive signal requires justification
```

---

## 5) Storage Requirements

### 5.1 Persistence (MANDATORY)

`SignalDecisionRecord` MUST be persisted:

- **Storage**: Same database as StateStore
- **Transaction**: Same transaction if possible (atomicity)
- **Retention**: **Minimum 7 years** (SOC2/GDPR compliance)

### 5.2 Indexing

Index by:

- `(tenantId, runId, timestamp)` — for audit queries
- `signalId` — for idempotency lookups
- `policyDecisionId` — for audit trail correlation

---

## 6) Security Considerations

### 6.1 Tenant Isolation

- Authorization MUST validate `tenantId` matches actor's tenant
- Cross-tenant signal delivery MUST be rejected with error code `AUTHZ_TENANT_FORBIDDEN`
- Audit logs MUST record attempted cross-tenant access

### 6.2 Audit Trail

- All signals (accepted, rejected, pending) MUST be logged
- **Destructive signals** (`UPDATE_PARAMS`, `INJECT_OVERRIDE`, `UPDATE_TARGET`, `EMERGENCY_STOP`) trigger P1 alerts
- Failed authorization attempts trigger security monitoring

### 6.3 Replay Protection

- `signalId` prevents duplicate processing
- StateStore upsert ensures idempotency via key `(tenantId, runId, signalId)`
- Replay of old `signalId` is a no-op (existing decision record returned)

### 6.4 Error Codes (Normative)

The following error codes MUST be used for signal authorization failures:

| Error Code               | Description                                          | HTTP Status |
| ------------------------ | ---------------------------------------------------- | ----------- |
| `AUTHZ_DENIED`           | Authorization denied (generic)                       | 403         |
| `AUTHZ_REASON_REQUIRED`  | Destructive signal missing required justification    | 400         |
| `AUTHZ_TENANT_FORBIDDEN` | Cross-tenant access attempt                          | 403         |
| `SIGNAL_DUPLICATE`       | Signal already processed (idempotency key collision) | 409         |
| `SIGNAL_NOT_FOUND`       | Decision record not found for query                  | 404         |

---

## 7) References

- **Parent Contract**: [IWorkflowEngine.v1.1.md](./IWorkflowEngine.v1.1.md)
- **Run Events**: [RunEvents.v1.1.md](./RunEvents.v1.1.md)
- **Execution Semantics**: [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)

---

## Change Log

| Version | Date       | Change                                                                                                                                                                                                                                                                                                                            |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1     | 2026-02-12 | Extracted from IWorkflowEngine.v1.md to reduce churn. Added RBAC table. **Critical fixes**: Declare signal idempotency key (tenantId, runId, signalId), clarify no-op behavior, scope approval workflow, normalize actor fields, define DestructiveSignalType enum, formalize error codes (AUTHZ_DENIED, AUTHZ_TENANT_FORBIDDEN). |
