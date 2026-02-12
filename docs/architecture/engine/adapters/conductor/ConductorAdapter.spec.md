# ConductorAdapter Specification (DRAFT v0.8 — Phase 2)

**Status**: DRAFT (Phase 2, not production)  
**Version**: 0.8  
**Target**: Conductor 3.0+  
**References**: [IWorkflowEngine Contract](../../contracts/engine/IWorkflowEngine.v1.1.md), [Conductor Docs](https://conductor.netflix.com/), [Parity Matrix](../../contracts/capabilities/adapters.capabilities.json)

---

## 1) Scope: Phase 2 Roadmap

**Why DRAFT?**

ConductorAdapter is scheduled for **Phase 2** (post-MVP Temporal launch).

- MVP (Phase 1): Temporal only. Conductor prep work (POC, task routing).
- Phase 2: Conductor production. Expect breaking changes to this spec.

**Current status:**

- ✅ Task-oriented model documented.
- ✅ Capability gaps vs Temporal identified.
- ⚠️ Determinism strategy OPEN (replay semantics differ from Temporal).
- ⚠️ Multi-language SDK integration IN PROGRESS.
- ❌ Production runbooks NOT YET WRITTEN.

---

## 2) Architecture Differences from Temporal

| Aspect          | Temporal                                 | Conductor                                                    |
| --------------- | ---------------------------------------- | ------------------------------------------------------------ |
| **Model**       | Workflow API (durable execution, replay) | Workflow definition (JSON-DSL, imperative)                   |
| **Tasks**       | Activities (async, cancellable)          | Tasks (webhooks, polls, 30s timeout default)                 |
| **History**     | Full (Temporal storage)                  | Event log + Task history                                     |
| **Signals**     | Workflow signals (native)                | Event callbacks (external events)                            |
| **State**       | Deterministic replay                     | Stateless (external state via input/output)                  |
| **Scaling**     | Scale-out workers (polling)              | Scale-out task executors (dispatch order)                    |
| **Determinism** | **STRONG** (code-based, replay)          | **WEAK** (task execution external, non-deterministic timing) |

**Parity gaps:**

- ❌ No native deterministic replay (task execution is external).
- ❌ No reliable pause/cancel (webhook-based resume is eventual).
- ❌ No parallel subworkflows (PARALLEL_GROUPS cap emulated).
- ❌ 30s default task timeout (strict, no extension).
- ❌ Task output limited to 32KB (vs Temporal 64KB signals).

**Fallback strategy**: Emulate or degrade capabilities (see `capabilities.schema.json`).

---

## 3) Workflow Definition Format (DSL)

Conductor uses JSON-based workflow definitions. The adapter **wraps** plans as Conductor workflows:

```json
{
  "name": "dvt-workflow-{planId}-{planVersion}",
  "description": "Plan: {planName} (schema: {schemaVersion})",
  "version": 1,

  "input": {
    "planRef": "string",
    "runContext": "object",
    "tenantId": "string"
  },

  "output": {
    "runId": "string",
    "status": "SUCCESS|FAILURE|CANCELLED",
    "artifactRefs": "array",
    "metrics": "object"
  },

  "tasks": [
    {
      "taskReferenceName": "fetch_plan",
      "type": "HTTP",
      "inputParameters": { "uri": "${workflow.input.planRef.uri}" },
      "http": {
        "uri": "https://plan-service/fetch",
        "method": "POST"
      }
    },
    {
      "taskReferenceName": "validate_plan",
      "type": "USER_DEFINED",
      "inputParameters": { "plan": "${fetch_plan.output.plan}" },
      "domain": "tq-control"
    },
    {
      "taskReferenceName": "execute_steps",
      "type": "LOOP",
      "loopCondition": "$.status != 'COMPLETED'",
      "loopOver": [
        {
          "taskReferenceName": "step_{stepId}",
          "type": "USER_DEFINED",
          "inputParameters": { "step": "${fetch_plan.output.plan.steps[?(@.stepId=={stepId})]}" }
        }
      ]
    }
  ],

  "workflowStatusListenerAddress": "https://state-store-service/webhooks/workflow-status"
}
```

**Notes**:

- Tasks reference **plan steps** (not inline Activities).
- HTTP/USER_DEFINED tasks dispatch to workers on named domains.
- LOOP construct **not deterministic** (iterations depend on external task results).
- Webhook listener reports completion/failure asynchronously.

---

## 4) Task Routing & Worker Domains

Similar to Temporal but **less flexible**:

```yaml
conductor:
  domains:
    tq-control:
      workers: 10
      pollInterval: 100ms
    tq-data:
      workers: 5
      pollInterval: 500ms
    tq-isolation-{tenant}:
      workers: 2
      pollInterval: 200ms
```

**Worker polling**:

- Worker polls `GET /tasks?domain=tq-control&count=10`.
- Executes task synchronously.
- Reports result via `POST /tasks/{taskId}/result` (≤30s window by default).
- No cancellation support (webhook callback required to trigger abort).

---

## 5) Milestone: Pause/Resume via Events

**Limitation**: Conductor has no native pause signal.

**Workaround** (event-driven):

```json
{
  "taskReferenceName": "signal_handler",
  "type": "WAIT_FOR_EXTERNAL_EVENT",
  "inputParameters": {
    "eventName": "pause_{runId}"
  },
  "timeout": 86400
}
```

When engine needs to pause:

1. Emit event `pause_{runId}` to Conductor via API.
2. If workflow is waiting, event unblocks the task.
3. Workflow checks signal payload for action (PAUSE, RESUME, RETRY).
4. If in-flight task, it completes on own schedule (NOT cancelled).

**State at pause**: In-flight task continues; workflow waits between tasks.

---

## 6) Capability Emulation Strategy

### 6.1 PAUSE (Emulated, not Native)

```typescript
// Workflow: handle event-based pause
async function pauseViaEvent(workflowId: string, signal: PauseSignal) {
  const conductor = new ConductorClient();

  // Send external event (workflow must have WAIT_FOR_EXTERNAL_EVENT)
  await conductor.sengPublishEvent({
    workflow: workflowId,
    task: 'signal-handler',
    event: {
      eventName: `pause_${signal.runId}`,
      data: { action: 'PAUSE', reason: signal.reason },
    },
  });

  // In-flight tasks complete naturally; new tasks don't start
  // until workflow receives RESUME event.
}
```

**Limitation**: In-flight task execution **NOT cancelled**; task runs to completion.

### 6.2 CANCEL (Degraded: Force Completion)

```typescript
async function cancelRun(workflowId: string, signal: CancelSignal) {
  const conductor = new ConductorClient();

  // Terminate workflow forcefully (no graceful shutdown)
  await conductor.terminateWorkflow(workflowId, {
    reason: signal.reason,
    terminationStatus: 'TERMINATED',
  });

  // In-flight tasks receive no signal; they complete independently
  // Artifact cleanup is application's responsibility
}
```

**State after cancel**: Workflow terminated; tasks may still be in-flight.

### 6.3 CONTINUE_AS_NEW (Emulated via Workflow Restart)

```json
{
  "taskReferenceName": "check_history",
  "type": "USER_DEFINED",
  "inputParameters": {
    "historySize": "${workflow.output.historySize}"
  },
  "onFailure": {
    "action": "REST_WORKFLOW",
    "workflowId": "${workflow.workflowId}",
    "version": "${workflow.specification.version + 1}"
  }
}
```

**Limitation**: No automatic history truncation; operator must manage history size.

---

## 7) Determinism & Replay Semantics

**Problem**: Conductor has NO deterministic replay mechanism.

**Current approach** (OPEN):

1. Plan steps reference immutable URIs (same as Temporal).
2. Activities are deterministic (code-based).
3. But **task execution is external** — no replay guarantee.

**Proposed strategy** (Post-Phase-2):

- Option A: Accept non-determinism (activities are deterministic, but scheduling order may vary).
- Option B: Implement custom replay by saving task inputs + outputs per attempt.
- Option C: Restrict to subset of plans that don't depend on history replay.

**Recommendation for Phase 2**: Emit warning in validation report if plan uses dynamic branching (requires history-dependent logic). Mark as `CAPABILITY_DEGRADED: DETERMINISTIC_REPLAY_FULL`.

---

## 8) Secrets & Artifacts (Same as Temporal)

### 8.1 Secrets

Tasks receive secrets via `input.secrets`:

```json
{
  "taskReferenceName": "execute_step",
  "type": "USER_DEFINED",
  "inputParameters": {
    "step": "${execute_plan.step}",
    "secrets": {
      "db_password": "reference:vault:db-secret-{tenantId}"
    }
  }
}
```

**Secrets provider** resolves at task dispatch time (not bundled in task definition).

### 8.2 Artifacts

Tasks store artifacts by **reference**, not binary:

```json
{
  "taskReferenceName": "execute_step",
  "output": {
    "artifactRefs": [
      { "uri": "s3://bucket/artifacts/run-{runId}/step-{stepId}-output.parquet", "sha256": "..." }
    ]
  }
}
```

---

## 9) Multi-Language SDK Support (IN PROGRESS)

Conductor supports task workers in multiple languages (Java, Go, Python, Node.js).

**Task worker skeleton** (Python):

```python
from conductor.conductor_client import ConductorClient

def execute_step_task(input_data):
    """Conductor task worker."""
    step = input_data['step']
    secrets = input_data['secrets']

    # Execute step (plugin/built-in)
    result = step_executor.execute(step, secrets)

    return {
        'status': 'COMPLETED',
        'output': {
            'artifactRefs': result.artifacts,
            'metrics': result.metrics
        }
    }

client = ConductorClient(servers=['http://conductor:8080'])
client.register_task_worker(
    domain='tq-control',
    task_type='execute_step',
    execute_task=execute_step_task,
    poll_interval=0.1
)
client.start()
```

**Status**: ⚠️ SDK bindings partially implemented. Full integration post Phase 2 POC.

---

## 10) Limitations & Workarounds

| Limitation              | Impact                         | Workaround                                              |
| ----------------------- | ------------------------------ | ------------------------------------------------------- |
| 30s task timeout        | Time-intensive steps fail      | Increase timeout via task def; break into sub-tasks     |
| 32KB task output        | Large artifact metadata        | Use references only; store full metadata in external DB |
| No native pause         | Eventual pause (event-driven)  | WAIT_FOR_EXTERNAL_EVENT + polling                       |
| No reliable cancel      | In-flight tasks not terminated | Document on error reporting; operator cleanup script    |
| No deterministic replay | Scheduling non-deterministic   | Restrict plans to avoid history-dependent logic         |
| Eventual consistency    | Workflow status may lag        | Poll via external event loop; 5-10s SLA expected        |

---

## 11) Success Criteria (Phase 2 Roadmap)

**MVP completion**:

- [ ] Workflow definition generation (DSL → JSON).
- [ ] Task routing (control/data/isolation domains).
- [ ] Event listener integration (status callbacks).
- [ ] Pause/cancel emulation (event-driven).
- [ ] Integration tests: 10 end-to-end workflows (simple → complex).

**Beta readiness**:

- [ ] Multi-language SDK task workers working.
- [ ] Determinism strategy decided (Option A/B/C above).
- [ ] Observed SLA ≤5s pause latency (event propagation).
- [ ] Runbooks: incident response, task recovery, history cleanup.

**Production readiness**:

- [ ] Durability testing (failure injection, chaos).
- [ ] Capacity planning (worker scaling, queue management).
- [ ] Upgrade path (zero-downtime workflow version transitions).

---

## Change Log

| Version | Date       | Change                                                                     |
| ------- | ---------- | -------------------------------------------------------------------------- |
| 0.8     | 2026-02-11 | DRAFT: Phase 2 spec, capability emulation strategy, limitations enumerated |
