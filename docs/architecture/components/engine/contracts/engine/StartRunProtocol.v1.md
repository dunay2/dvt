# StartRun Protocol (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: ACTIVE  
**Version**: v1  
**Stability**: Single supported hard cut; consumers deploy in lockstep, no parallel protocol  
**Consumers**: Engine reviewers, API orchestration, adapter implementers, state-store reviewers  
**References**:
[ADR-0012-plan-integrity-ownership.md](../../../../../adr/ADR-0012-plan-integrity-ownership.md),
[ADR-0013-run-state-store-bootstrapRunTx.md](../../../../../adr/ADR-0013-run-state-store-bootstrapRunTx.md),
[ADR-0014-run-driven-adapter-model.md](../../../../../adr/ADR-0014-run-driven-adapter-model.md),
[ADR-0030-pre-dispatch-intent-log.md](../../../../../adr/ADR-0030-pre-dispatch-intent-log.md)

---

## 1) Purpose

This artifact codifies the `startRun()` protocol already implemented in the
repository.

It does not introduce a new execution path.

The shared API orchestration boundary that feeds this protocol is now governed
separately in [StartRunBoundary.v1.md](./StartRunBoundary.v1.md). This document
starts at the narrower engine-facing `IWorkflowEngine.startRun(planRef,
context)` handoff after API orchestration has already classified planner-backed
or persisted-plan ingress.

Its job is to make the existing protocol reviewable without forcing readers to
reconstruct it from `WorkflowEngine`, `WorkflowStartRunUseCase`,
`StartRunApplicationService`, `StartRunAdmissionService`,
`StartRunIntentService`, `StartRunExecutionService`, and
`StartRunFailurePolicy`.

---

## 2) Entry Point And Owning Units

The public entry point remains:

```ts
interface IWorkflowEngine {
  startRun(planRef: PlanRef, context: RunContext): Promise<EngineRunRef>;
}
```

The current implementation units are:

| Role                    | Unit                                                                                                                                       | Responsibility                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Public facade           | [`WorkflowEngine`](../../../../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)                                                      | Parses `PlanRef` and `RunContext`, then delegates to facade-facing use cases                                                  |
| Facade start use case   | [`WorkflowStartRunUseCase`](../../../../../../packages/@dvt/engine/src/application/workflow-engine-use-cases/WorkflowStartRunUseCase.ts)   | Resolves initial run lineage, builds trace context, and delegates to the start-run application service                        |
| Application coordinator | [`StartRunApplicationService`](../../../../../../packages/@dvt/engine/src/application/StartRunApplicationService.ts)                       | Sequences admission, exclusive intent acquisition, dispatch, success metrics, and failure policy                              |
| Admission service       | [`StartRunAdmissionService`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts)                     | Coordinates admission, provider resolution, scoped integrity verification, and capability/run-execution-context checks        |
| Admission boundary      | [`StartRunAdmissionGuard`](../../../../../../packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts)                               | Runs preconditions, adapter resolution, capability checks, and runExecutionContext admission                                  |
| Validation policy       | [`StartRunValidationPolicy`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts)                     | Tenant access, `PlanRef` policy, schema/version validation, run-id validation, duplicate-run rejection, capability validation |
| Context admission       | [`RunExecutionContextAdmissionPolicy`](../../../../../../packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts) | Validates `runExecutionContextRef` alignment and compatibility fingerprints                                                   |
| Intent acquisition      | [`StartRunIntentService`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunIntentService.ts)                           | Derives deterministic intent identity and acquires an exclusive claim                                                         |
| Dispatch + bootstrap    | [`StartRunExecutionService`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts)                     | Calls provider adapter, marks intent dispatched, bootstraps run state, compensates on bootstrap failure                       |
| Failure handling        | [`StartRunFailurePolicy`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunFailurePolicy.ts)                           | Owns guarded failure writes; diagnostics and durable compensation have separate collaborators                                 |
| Metadata/event factory  | [`StartRunEventFactory`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunEventFactory.ts)                             | Constructs `RunMetadata`, `RunQueued`, provider-ref updates, and failure events                                               |

---

## 3) End-To-End Protocol

```mermaid
sequenceDiagram
    participant Caller
    participant App as StartRunApplicationService
    participant Intent as IStartRunIntentStore
    participant Exec as StartRunExecutionService
    participant Adapter as IProviderAdapter
    participant State as IStartRunStateStoreWrite
    participant Worker as Existing maintenance worker
    Caller->>App: admitted start request
    App->>Intent: claimIntent(deterministic identity)
    alt existing intent
        App-->>Caller: reject without acquisition or dispatch
    else acquired receipt
        App->>Exec: execute with receipt
        opt estimated reference
            Exec->>State: applyStartRunWrite(receipt, bootstrap)
        end
        Exec->>Intent: authorizeDispatch(receipt), persist unknown
        Exec->>Adapter: one startRun request
        alt positive response
            Exec->>Intent: markDispatched(receipt, validated runRef)
            Exec->>State: fenced bootstrap or provider binding
            Exec->>Intent: markResolved(receipt)
            Exec-->>Caller: confirmed reference
        else timeout or response unavailable
            Exec-->>Caller: error, outcome remains unknown
        end
        opt bootstrap or binding failure
            Exec->>Intent: record required compensation
            Exec-->>Caller: original error
        end
    end
    Worker->>Intent: reclaim aged, due revision with rotated receipt
    Worker->>State: observe metadata and canonical status
    Worker->>Adapter: observeStartRun(logical run, tenant)
    Note over Worker,Adapter: No automatic startRun call from reconciliation
    Worker->>Intent: defer, escalate, adopt or record exact cancel target
    opt compensation required
        Worker->>Adapter: cancelRun(runRef, exact executionId)
        Note over Worker,Intent: Acknowledgement remains unresolved; later terminal observation confirms
    end
```

---

## 4) Phase-By-Phase Specification

### 4.1 Admission

The admission phase is already implemented by:

- [`WorkflowEngine.startRun()`](../../../../../../packages/@dvt/engine/src/core/WorkflowEngine.ts)
- [`WorkflowStartRunUseCase.startRun()`](../../../../../../packages/@dvt/engine/src/application/workflow-engine-use-cases/WorkflowStartRunUseCase.ts)
- [`StartRunApplicationService.startRunCore()`](../../../../../../packages/@dvt/engine/src/application/StartRunApplicationService.ts)
- [`StartRunAdmissionService.admit()`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts)
- [`StartRunAdmissionGuard.assertStartRunAllowed()`](../../../../../../packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts)
- [`StartRunValidationPolicy.validateStartRunPreconditions()`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunValidationPolicy.ts)
- [`StartRunAdmissionGuard.resolveAdapter()`](../../../../../../packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts)
- [`StartRunAdmissionGuard.assertExecutionPolicyAllowed()`](../../../../../../packages/@dvt/engine/src/application/StartRunAdmissionGuard.ts)
- [`RunExecutionContextAdmissionPolicy.assertAllowed()`](../../../../../../packages/@dvt/engine/src/services/startRun/RunExecutionContextAdmissionPolicy.ts)

The admission phase currently performs:

1. parse and normalize `PlanRef`
2. parse and normalize `RunContext`
3. resolve initial lineage fields in `WorkflowStartRunUseCase`:
   - `logicalAttemptId = 1`
   - `originRunId = runId`
4. tenant access check
5. `PlanRef` policy validation
6. `schemaVersion` validation
7. supported `planVersion` validation
8. `runId` format validation
9. duplicate-run rejection through `getRunMetadataByRunId()`
10. rate-limit check
11. adapter lookup in `StartRunAdmissionService`
12. scoped plan artifact integrity verification in `StartRunAdmissionService`
13. execution-policy capability checks
14. `runExecutionContextRef` alignment and compatibility checks when present
15. plugin-bearing plans reject before queueing when:

- `runExecutionContextRef` is missing
- the engine resolver is not configured for a supplied
  `runExecutionContextRef`
- the resolved context omits `pluginContexts`
- resolved plugin context is missing for a required plugin
- the resolved context metadata mismatches the admitted `PlanRef`,
  `RunExecutionPolicy`, or run tenant
- the plugin binding policy rejects a plugin-specific invariant such as
  artifact tenant ownership or canonical locator shape

This phase rejects before any provider side effect.

### 4.2 Integrity Verification

The integrity phase is already implemented by:

- [`PlanIntegrityValidator.fetchAndValidate()`](../../../../../../packages/@dvt/engine/src/security/planIntegrity.ts)
- invoked from [`StartRunAdmissionService.admit()`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunAdmissionService.ts)

The integrity phase currently performs:

1. fetch executable plan material from the configured `planFetcher`
2. parse the executable `ExecutionPlan`
3. validate plan metadata against `PlanRef`
4. recompute plan identity from plan core
5. reject before adapter dispatch if integrity fails

This is the authoritative integrity gate mandated by ADR-0012.

### 4.3 Intent acquisition

`StartRunIntentService.claimIntent()` derives the deterministic identity from
tenant, logical run, logical attempt and provider, then calls the existing store.
Only an atomic winner receives a `StartRunIntentClaimReceipt`. Existing-intent
queries do not return its token. A duplicate caller does not continue dispatch.

Reclaim is a distinct maintenance operation: revision compare-and-set, store
time, minimum age and persisted next-attempt time must all permit it. Reclaim
rotates the token and invalidates every older receipt. The same intent fence
must be held across canonical writes, not just checked before a transaction.

### 4.4 Dispatch

Before the provider request, `authorizeDispatch(receipt)` atomically changes
`not_requested` to `unknown`. Repeating authorization cannot issue another
request. After a positive result, validate the discriminated EngineRunRef before
persisting `started` through `markDispatched(receipt, runRef)`.

Timeout, lost response, malformed result or post-start persistence failure
preserves uncertainty. Such evidence cannot authorize expiry, RunFailed,
synthetic success or automatic resend. Late completion cannot give a stale
caller canonical-write authority.

The adapter receives the approved immutable PlanRef and resolved context.
Providers that fetch plans at runtime must revalidate PlanRef.sha256.

### 4.5 Bootstrap and binding

The two existing branches remain:

- Estimated reference: fenced bootstrap of metadata, RunQueued and outbox;
  authorize and dispatch; persist started; fenced provider binding; resolve.
- No estimate: authorize and dispatch; persist started; fenced bootstrap;
  resolve.

`applyStartRunWrite(receipt, command)` owns the transaction boundary for
`bootstrap | bind_provider | fail`. PostgreSQL retains the intent lock until
canonical commit and observes the current event-derived status even if its
snapshot is stale. In-memory adapters share the same acquisition authority and
run lock. Cross-scope, stale, terminal or escalated writes fail closed.

Provider binding runs even when estimated and returned references are equal.
A compensation-required intent cannot bootstrap or adopt the provider.
There is no path that turns a rejected fence into successful completion.

### 4.6 Failure handling and compensation

`StartRunFailurePolicy` preserves the original error. It may emit RunFailed only
with this invocation's created preparation, an eligible phase, successful
metadata/intent reads, a started outcome and a valid receipt at commit.
Admission, intent and completion failures do not grant failure authority.
A reused recovery child never becomes the caller's created preparation.

`StartRunCompensation` records sticky required compensation after bootstrap or
binding failure. It neither calls cancelRun nor marks the intent resolved.
A failed compensation write is reported without masking the original error.
The existing maintenance rail subsequently observes the provider.

Completion is not best-effort success: a rejected or failed markResolved rejects
the call, preserves the canonical run and leaves reconciliation available.

### 4.7 Observation-only maintenance

One observation/decision/effect policy applies to PENDING and DISPATCHED:

1. Read metadata and canonical status. Failed reads are not absence.
2. Observe the provider through `observeStartRun`: point-in-time missing,
   active exact execution or terminal exact execution with disposition.
3. Decide using canonical status, provider evidence, sticky compensation and
   remaining retry budget. The pure decision admits only shared value constants,
   not I/O or runtime collaborators.
4. Apply fenced effects without re-reading decision evidence.
5. Record bounded diagnostics outside decision and effect ownership.

An active compatible provider can be adopted only into a nonterminal run without
required compensation. An orphan or terminal canonical run requires compensation.
Record its exact execution ID and next due time before cancelRun. Success of that
RPC does not resolve the intent. Only subsequent cancelled/terminated evidence for
that exact execution confirms compensation; another execution or incompatible
terminal result escalates.

A missing observation after authorization never means safe redispatch. Persist
bounded retry/backoff or escalation. Escalated records are excluded from further
automatic sweeps and never reported as confirmed by the API. The approved budget,
state invariants and hard-cut rules are normative in
[ADR-0030](../../../../../adr/ADR-0030-pre-dispatch-intent-log.md).

`reconcileStartRunIntent` remains tenant-authorized.
`reconcileOrphanedIntents` remains a bounded service-context batch, with
read-only dry run and separate expired/resolved/cancelled/cancelFailed/deferred/
escalated buckets. This adds no worker or public operator-remediation command.

### 4.8 Conformance and remaining boundary

Tests must compare canonical metadata, ordered events, snapshots and intent
state after duplicate or stale-owner rejection. Receipt rotation must be tested
with deterministic barriers, including estimated, non-estimated and prepared
recovery paths. Failed observation tests allow only acquisition/retry metadata
updates; they forbid canonical mutation and provider commands.

Real PostgreSQL proofs require independent connections, a non-owner application
role, RLS, conflict visibility and a fence held until canonical commit. A failed
bootstrap preserves the canonical Engine RunAlreadyExistsError and rolls back
the losing recovery reservation.

Real Temporal proofs must distinguish logical workflow ID from exact execution
ID, cancellation acknowledgement from terminal observation, and retained history
deduplication from durable absence. History removal permits a new execution with
the same workflow identity. Therefore #2679's positive safe-redispatch acceptance
remains open; observation-only completion does not close it.

Planning DB acceptance evidence must bind the actual tested Git base/head and
committed governing document hashes. Local passing tests alone are not
integration approval.

---

## 5) Existing ADR-Governed Invariants

### 5.1 ADR-0012: Plan Integrity Ownership

This protocol MUST preserve:

- engine-side fetch and verification before adapter dispatch
- centralized `planId` verification from plan core
- adapter execution from the engine-approved immutable `PlanRef`, with runtime
  plan-material fetches revalidating `PlanRef.sha256`
- fail-closed rejection before any adapter execution if integrity fails

Implemented today by:

- [`StartRunApplicationService.startRunCore()`](../../../../../../packages/@dvt/engine/src/application/StartRunApplicationService.ts)
- [`PlanIntegrityValidator.fetchAndValidate()`](../../../../../../packages/@dvt/engine/src/security/planIntegrity.ts)

### 5.2 ADR-0013: `bootstrapRunTx` Atomicity

This protocol MUST preserve:

- atomic persistence of:
  - `run_metadata`
  - first events
  - outbox rows
- use of `bootstrapRunTx(...)` for the first run write
- no mid-run metadata creation via non-bootstrap paths

Implemented today by:

- [`StartRunExecutionService.startRunWithEstimatedRef()`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts)
- [`StartRunExecutionService.bootstrapRunTxWithCompensation()`](../../../../../../packages/@dvt/engine/src/services/startRun/StartRunExecutionService.ts)
- [`IRunStateStore.bootstrapRunTx`](../../../../../../packages/@dvt/engine/src/ports/IRunStateStore.ts)

### 5.3 ADR-0030: ownership and uncertainty

The normative lifecycle and failure rules are those of
[ADR-0030](../../../../../adr/ADR-0030-pre-dispatch-intent-log.md). In particular:
exclusive claim before dispatch; unknown before RPC; fenced canonical writes;
durable compensation; confirmation only from positive execution evidence;
bounded defer/escalation; no automatic redispatch.

## 6) Review checklist

1. Existing public entry, admission, integrity and authorization boundaries remain.
2. Only a claim winner sends a provider start, and durable unknown precedes it.
3. Every bootstrap/bind/fail commit is fenced with the current receipt.
4. Equal references do not bypass fencing.
5. An RPC timeout or missing lookup never creates confirmed absence.
6. Compensation remains required after cancellation acknowledgement.
7. Exact execution identity prevents cancelling a replacement execution.
8. Unknown and compensated intents are not API-confirmed dispatch.
9. Tests cover storage, Engine, provider, worker and API consumers.
10. One hard-cut schema is deployed in lockstep, with explicit rejection of old
    state and no conversion, hidden fallback or compatibility branch.
