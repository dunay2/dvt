# TemporalAdapter Specification (Normative v1.1)

- **Status**: Normative (Temporal-specific contract)
- **Version**: 1.1
- **Stability**: Adapter specification; breaking changes require version bump
- **Target**: Temporal 1.0+ (TypeScript SDK)
- **References**:
  [IProviderAdapter Contract](../../contracts/engine/IProviderAdapter.v1.md),
  [StartRunProtocol Contract](../../contracts/engine/StartRunProtocol.v1.md),
  [Temporal SDK](https://docs.temporal.io/develop/typescript),
  [Temporal Platform Limits](https://docs.temporal.io/encyclopedia/temporal-platform-limits)

---

## 1) Plan Transport: Engine-Verified PlanRef

The Temporal adapter receives the engine-approved immutable `PlanRef` plus
resolved run context. The full `ExecutionPlan` MUST NOT cross the Temporal
workflow-start or continue-as-new boundary as durable workflow input.

The engine owns the authoritative start-run integrity proof. Temporal runtime
activities that fetch plan material by `PlanRef` MUST revalidate
`PlanRef.sha256` before resolving execution segments, but that runtime
revalidation is not a second start-run approval authority.

```ts
type PlanRef = {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
  sizeBytes?: number;
  compression?: 'gzip' | 'none';
  expiresAt?: string;
};
```

**Versioning rules**:

- `schemaVersion` is MANDATORY on `PlanRef`.
- The engine MUST reject unknown `schemaVersion` values before adapter dispatch.
- Runtime segment resolution MUST reject fetched plan bytes whose hash differs
  from `PlanRef.sha256`.
- Workflow input-shape changes MUST be handled by an explicit replay/cutover
  posture: drained deployment or Temporal workflow versioning. The active
  `AR-D-PLAN-POINTER` task still tracks that proof.

**Integrity validation (normative)**:

The engine MUST fetch the executable plan, validate metadata alignment against
`PlanRef`, and recompute canonical planner identity (`planId`) before it calls
the Temporal adapter. The adapter MUST receive only the verified immutable
`PlanRef` plus resolved run context. Workflow activities MAY fetch plan material
to derive bounded execution segments, and they MUST validate fetched bytes
against `PlanRef.sha256` before execution.

---

## 2) Interpreter Workflow Pattern

Temporal is code-first. The adapter MUST implement a generic interpreter
workflow that:

1. Receives `RunPlanWorkflowInput` containing `PlanRef`, resolved context,
   continue-as-new budget controls, and optional compact cursor state.
2. Resolves bounded execution segments through activities using `PlanRef`.
3. Schedules activities according to dependencies in deterministic layer order.
4. Emits lifecycle events to StateStore.
5. Handles canonical runtime-control signals (`PAUSE`, `RESUME`, `CANCEL`).
6. Calls `continueAsNew()` with compact cursor state when configured rollover
   criteria are met.

Business run recovery is a separate engine or application use case and MUST NOT
be reintroduced through the generic signal boundary.

**Workflow input shape**:

```ts
interface RunPlanWorkflowInput {
  planRef: PlanRef;
  ctx: ResolvedRunContext;
  maxContinueAsNewPayloadBytes: number;
  continueAsNewAfterLayerCount?: number;
  cursor?: WorkflowExecutionCursor;
}
```

**Workflow pattern**:

```ts
export async function runPlanWorkflow(input: RunPlanWorkflowInput): Promise<RunPlanWorkflowResult> {
  const { planRef, ctx } = input;
  const ctrl = parseWorkflowControlInput(input);

  let segment = await activities.resolveExecutionSegment({
    planRef,
    layerIndex: ctrl.nextLayerIndex,
  });

  while (segment.kind === 'layer') {
    await executeLayer(segment, ctx);

    if (shouldTriggerContinueAsNew(ctrl)) {
      return workflow.continueAsNew(buildCompactCursorInput(input, ctrl));
    }

    segment = await activities.resolveExecutionSegment({
      planRef,
      layerIndex: segment.nextLayerIndex,
    });
  }

  return completeRun(ctx, planRef);
}
```

---

## 2.1) Entry-Point Verification Boundary

The authoritative integrity proof is complete before the Temporal adapter is
called.

**Normative requirements**:

1. The engine MUST fetch executable plan bytes using `PlanRef`.
2. The engine MUST validate executable-plan metadata against `PlanRef`.
3. The engine MUST recompute canonical planner identity from the resolved plan
   core and reject dispatch on mismatch.
4. The Temporal adapter MUST accept the verified immutable `PlanRef` plus
   resolved run context.
5. Temporal workflow execution MUST NOT receive the full `ExecutionPlan` as
   start or continue-as-new input.
6. Temporal activity-time segment resolution MUST re-fetch and validate plan
   bytes against `PlanRef.sha256` before executing segment work.

**Operational implications**:

- start-run integrity failures occur before workflow start, at the engine
  boundary
- workflow start and continue-as-new payload size remains bounded by `PlanRef`,
  resolved context, budget controls, and compact cursor state
- runtime monitoring should include payload-size guards, plan-fetch integrity
  failures, start latency, and `continueAsNew` cadence

**Testing requirements**:

- engine tests MUST fail closed when fetched bytes do not match `planId` or
  required metadata
- adapter tests MUST prove workflow start consumes `PlanRef` plus context only
  and does not carry a full `ExecutionPlan`
- adapter tests MUST prove runtime segment resolution validates fetched bytes
  against `PlanRef.sha256`
- integration tests MUST show dispatch does not occur after engine-side
  verification failure

---

## 3) Namespace Strategy

Use few namespaces, not one namespace per tenant.

```yaml
temporal:
  namespaces:
    production: 'prod'
    staging: 'staging'
    development: 'dev'
    production-regulated: 'prod-hipaa'
  retention:
    productionDays: 90
    stagingDays: 30
    developmentDays: 7
  searchAttributes:
    - tenantId
    - projectId
    - environmentId
    - regulatoryTier
```

Rationale:

- Few namespaces reduce quota, retention, and upgrade burden.
- Search attributes support tenant-level queries without namespace sprawl.
- Task queue isolation enforces per-tenant concurrency limits.
- Regulated tenants opt into separate Temporal infrastructure only when the
  regulatory requirement exists.

---

## 4) Worker Topology And Task Queue Routing

Worker topology is deployment-owned. The adapter receives a base task queue and
derives the tenant-scoped task queue for run starts. Executor-specific worker
routing remains an active design concern outside this adapter spec.

| Class     | Task queue                    | Responsibilities                                      |
| --------- | ----------------------------- | ----------------------------------------------------- |
| Control   | `tq-control-{env}`            | StateStore writes, light HTTP steps, signal handling  |
| Data      | `tq-data-{env}`               | transformation executors and heavy computation steps  |
| Isolation | `tq-isolation-{tenant}-{env}` | tenant-isolated work for security or regulatory needs |

---

## 5) Determinism And Workflow Versioning

Workflow code MUST remain deterministic:

- no `Date.now()` or `new Date()` inside workflow code
- no `Math.random()`
- no `process.env`
- no Node.js or DOM APIs
- no side effects outside Temporal activities

Use Temporal workflow versioning or a documented drained-deploy posture for any
change that affects in-flight workflow replay. Changes to control flow,
activity scheduling order, retries, branching, error handling, or workflow input
shape require explicit replay/cutover evidence before the slice is treated as
runtime-ready.

---

## 6) Activity Lifecycle And Error Handling

Activities own provider side effects and StateStore writes. Workflow code only
orchestrates deterministic control flow.

Activity execution MUST:

1. receive a bounded step segment plus resolved run context
2. resolve secrets and execution context outside workflow code
3. execute the step through the configured activity registry
4. emit lifecycle events through the StateStore command port
5. return structured step results containing status, evidence, and retryability

Temporal activity retries are resolved from the engine-verified
`ExecutionStep.retryPolicy` when present. If no explicit policy exists, the
adapter uses the governed default:

- `initialInterval: '1s'`
- `maximumInterval: '60s'`
- `backoffCoefficient: 2`
- `maximumAttempts: 3`

Retry metadata carried under `stepTypeConfig.retries` is not interpreted as a
Temporal activity retry policy; per-step runtime retry ownership is top-level
only.

---

## 7) Signals And Pause Semantics

The adapter supports canonical runtime-control signals:

- `PAUSE`
- `RESUME`
- `CANCEL`

Signal dispatch MUST use the canonical signal idempotency identity from the
engine contract. `CANCEL` transport MUST include both signal id and reason.
Provider-specific retry, pause, or recovery controls MUST NOT be added to the
published signal boundary without a governing contract update.

---

## 8) Continue-As-New Policy

Workflow MUST call `continueAsNew()` when the configured layer threshold is
enabled and reached before all layers are processed:

- `continueAsNewAfterLayerCount > 0`
- `processedLayersInCurrentExecution >= continueAsNewAfterLayerCount`
- `nextLayerIndex < totalLayerCount`

`continueAsNewAfterLayerCount = 0` disables rollover. The threshold and SLA
remain governed by `AR-D2`.

```ts
if (shouldTriggerContinueAsNew(state)) {
  const nextInput = buildContinueAsNewInput({
    input,
    maxContinueAsNewPayloadBytes,
    continueAsNewAfterLayerCount,
    nextLayerIndex,
    continuedAsNewCount,
    gatewayDecisions,
    gatewayDependencyFacts,
    skippedStepIds,
    processedControlSignalIds,
    latestResultEvidence,
  });

  await workflow.continueAsNew(nextInput);
}
```

**State persisted across continuation**:

- `PlanRef` plus resolved run context from the engine-verified dispatch
- budget controls frozen into workflow input
- compact cursor: next layer, gateway decisions, compact dependency facts,
  skipped step IDs, processed control signal IDs, and latest result evidence
- no logs, expanded lists, large errors, or full `ExecutionPlan`

The workflow MUST reject an oversized continue-as-new input before rollover
using `TEMPORAL_MAX_CONTINUE_AS_NEW_PAYLOAD_BYTES`.

---

## Change Log

| Version | Date       | Change                                                                        |
| ------- | ---------- | ----------------------------------------------------------------------------- |
| 1.1     | 2026-04-27 | Align workflow input with ADR-0012/ADR-0014 PlanRef-plus-cursor runtime shape |
| 1.0     | 2026-02-11 | Initial TemporalAdapter specification                                         |
