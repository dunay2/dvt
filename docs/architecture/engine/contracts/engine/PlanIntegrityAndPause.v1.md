# Plan Integrity & Conductor Pause Semantics (Normative v1)

[← Back to Contracts Registry](../README.md)

**Status**: DRAFT
**Version**: v1
**Stability**: Contracts — breaking changes require version bump
**Consumers**: Engine adapters, Planner, UI, Operations
**References**: [IWorkflowEngine.reference.v1.md](./IWorkflowEngine.reference.v1.md), [TemporalAdapter.spec.md](../../adapters/temporal/TemporalAdapter.spec.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)

---

## 1) Plan Integrity Validation

### 1.1 Hash Verification (MUST)

When an adapter fetches an `ExecutionPlan` through `PlanRef`:

1. Download the artifact located at `PlanRef.uri`.
2. Compute the SHA256 hash of the downloaded payload.
3. If the computed hash differs from `PlanRef.sha256`, the adapter MUST:
   - Fail the fetch Activity immediately with error code `PLAN_INTEGRITY_VALIDATION_FAILED`.
   - Abort workflow execution (no steps may start).
   - Emit a critical alert (P1) to operations and security teams.
   - Log both expected and actual hashes for audit and incident response.

**Rationale**: Prevent execution of tampered or corrupted plans (cache poisoning, malicious overrides, storage bugs).

### 1.2 Allowlist Enforcement (MUST)

Adapters MUST reject any `PlanRef.uri` that is outside the configured allowlist of approved schemes, hosts, and buckets. Disallowed URIs MUST produce error code `PLAN_URI_NOT_ALLOWED` without attempting a download.

**Security note**: Explicitly block `file://`, `ftp://`, metadata endpoints, and other local-network schemes to avoid SSRF and exfiltration.

---

## 2) Conductor PAUSE Behaviour

### 2.1 Scheduling Semantics (MUST)

- Conductor's `PAUSE` signal only stops new task scheduling.
- In-flight tasks **MUST be allowed to complete** because Conductor does not expose cancellation tokens for active tasks.
- While draining, adapters MUST surface `status = 'PAUSED'` with `substatus = 'DRAINING'`.
- UI/API layers MUST render both indicators so operators understand that work is still finishing.

### 2.2 Completion Semantics (MUST)

- Once all running tasks settle (success/fail), the adapter MUST clear the `DRAINING` substatus.
- Additional operator actions (e.g., `RESUME`, `CANCEL`) MUST honour the resolved state of in-flight tasks to avoid double execution.

**Rationale**: Provides deterministic operator visibility and avoids false assumptions about immediate halting.

---

## 3) Implementation Checklist

- [ ] `PlanRef` fetch Activities enforce SHA256 comparison and halt runs on mismatch.
- [ ] Conductor adapter emits `DRAINING` during pause drain windows.
- [ ] UI displays pause status + substatus alignment with [RunStatusSnapshot](./IWorkflowEngine.reference.v1.md#212-runstatussnapshot-status-query-result).
- [ ] Observability dashboards monitor `PLAN_INTEGRITY_VALIDATION_FAILED` alerts and Conductor drain durations.
