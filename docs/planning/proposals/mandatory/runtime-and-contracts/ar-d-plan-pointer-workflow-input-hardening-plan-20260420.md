---
title: AR-D plan-pointer workflow input hardening plan 2026-04-20
status: Active
owner: Architecture / Engine / Temporal / Contracts / Docs
last_reviewed: 2026-04-20
planning_type: proposal
lane: D
task_id: AR-D-PLAN-POINTER
---

# AR-D plan-pointer workflow input hardening plan 2026-04-20

## Purpose

Define the first serious scale-hardening cut for durable execution by removing
the full `ExecutionPlan` payload from Temporal workflow start and
`continueAsNew` handoff.

This slice is not a cosmetic optimization. It replaces a structurally weak
runtime shape:

- full plan serialized into workflow input
- growing `completedStepResults` map carried across rollovers
- growing `gatewayDecisions` and control-state payload

with a governed target:

- plan pointer at workflow ingress
- compact execution-state handoff
- bounded segment resolution instead of durable whole-plan carriage

## Governing sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/planning/execution-model/dvt-execution-model.md`
- `docs/adr/ADR-0003-execution-model.md`
- `docs/adr/ADR-0012-plan-integrity-ownership.md`
- `docs/adr/ADR-0014-run-driven-adapter-model.md`
- `docs/adr/ADR-0015-getRunStatus-read-model-separation.md`
- `docs/adr/ADR-0030-pre-dispatch-intent-log.md`
- `docs/adr/ADR-0036-execution-plan-planversion-registry-and-runtime-matrix.md`
- `docs/architecture/components/engine/contracts/VERSIONING.md`
- `packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts`
- `packages/@dvt/contracts/src/types/contracts.ts`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts`
- `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`
- `docs/planning/reviews/architecture-and-governance/20260414-principal-architect-review-dvtplus.md`
- `docs/planning/reviews/architecture-and-governance/20260420-dvt-plus-system-architecture-review.md`

## Problem

The active Temporal path still starts workflows with the full executable plan:

```ts
const workflowInput = {
  plan,
  planRef,
  ctx,
  continueAsNewAfterLayerCount,
};
```

The workflow then carries rollover state shaped around:

- `completedStepResults`
- `gatewayDecisions`
- `skippedStepIds`
- `processedControlSignalIds`

That creates four architectural problems:

1. workflow input size scales with plan size, not with current execution need
2. `continueAsNew` handoff grows with completed execution history
3. workflow-state schema becomes harder to evolve safely across deployments
4. the current design blocks honest claims about scale and runtime maturity

This is the main scale and determinism ceiling for large DAG execution.

## Decision

The active target boundary moves to **plan pointer + compact execution-state
handoff**.

### Core decision

- workflow start input must carry `PlanRef`, not the full `ExecutionPlan`
- `continueAsNew` input must carry a compact execution cursor, not a cloned
  completed-step fact map
- current execution segments must be resolved on demand through a bounded
  adapter-owned resolution seam
- the workflow must not reintroduce the same problem by loading and carrying the
  full plan object as durable workflow state after start

### Exact negative rules

The target line MUST NOT:

- include `plan: ExecutionPlan` in workflow start input
- include `completedStepResults` in `continueAsNew` input as an unbounded map
- clone the whole prior execution fact map into every rollover payload
- duplicate `stepTypeConfig` or full step lists into durable workflow input as
  a convenience cache
- mutate the active workflow input shape in place while in-flight workflows may
  still replay the older shape

### Exact positive rules

The target line MUST:

- keep `PlanRef` as the workflow's plan authority pointer
- preserve plan-integrity ownership outside the workflow boundary
- externalize only the minimum execution progress needed to resume
- resolve the current execution segment through a bounded seam owned by the
  runtime adapter path
- ship an explicit cutover strategy for in-flight workflows

## Required invariants

The slice must preserve these invariants:

1. **The UI does not execute.**
2. **The engine remains the semantic authority.**
3. **The planner does not persist state.**
4. **The workflow remains deterministic.**
5. **Canonical run truth remains in the event/state path, not in provider memory.**
6. **Plan integrity remains verified before provider dispatch.**
7. **`continueAsNew` cutovers remain replay-safe.**

## Target boundary shape

This proposal freezes the semantic shape, not yet the final TypeScript filenames.

### Workflow input

Current branch shape:

```ts
type WorkflowExecutionCursor = {
  nextLayerIndex: number;
  continuedAsNewCount: number;
  gatewayDecisions: Record<string, boolean>;
  gatewayDependencyFacts: Record<string, Record<string, unknown>>;
  skippedStepIds: string[];
  processedControlSignalIds: string[];
  latestResultEvidence?: MaterializationEvidence;
};

type RunPlanWorkflowInput = {
  planRef: PlanRef;
  ctx: ResolvedRunContext;
  continueAsNewAfterLayerCount?: number;
  cursor?: WorkflowExecutionCursor;
};
```

Rules:

- `planRef` is the only plan authority pointer in workflow input
- `cursor.nextLayerIndex` is the only mandatory resume position token
- current branch keeps the compact facts inline and bounded to gateway
  dependencies plus terminal result evidence
- external fact references remain a follow-up hardening step, not the active
  shipped shape

### Segment-resolution seam

The workflow needs a bounded way to resolve only the execution material needed
for the current layer or safe checkpoint.

Illustrative boundary:

```ts
type ResolvedExecutionSegmentV1 = {
  layerIndex: number;
  steps: readonly ExecutionStep[];
  runtimeExecutor?: 'postgres' | 'dbt';
};
```

Rules:

- this seam resolves a bounded segment, not the full plan
- the workflow may consume the returned segment during the current execution
  slice, but must not persist the whole plan object into rollover state
- gateway evaluation inputs needed after rollover must come from compact facts,
  not from re-serialized whole-plan state

### Compact execution facts

The current `completedStepResults` map is too broad to keep as-is.

The replacement must carry only what future layers actually need:

- gateway dependency facts
- latest materialization evidence when required for terminal payloads
- control-signal de-dup state
- current resume cursor

Rules:

- completed-step facts must be stored or derivable in a compact, versioned shape
- the workflow must not depend on an unbounded object keyed by every completed
  step unless that state is externalized behind a compact reference

## Cutover strategy

This branch is executing a **drained deploy / no-retrocompatibility** cut.

Chosen rule for this implementation:

1. explicitly stop or drain any in-flight `runPlanWorkflow` executions that use
   the old payload shape before deployment
2. ship a single canonical `runPlanWorkflow` entrypoint with the new pointer
   input shape
3. do not retain a parallel legacy workflow line in the adapter or workflow
   module just to preserve historical payload replay

This is a valid option only under an explicit operational drain assumption.
Without that assumption, the branch would need a dual-line cutover.

## Non-goals

This slice does not:

- introduce a second production orchestrator
- solve read-side contract maturity
- redesign step-kind contracts wholesale
- build cost attribution
- redefine `ExecutionPlan` ownership

## Risks

| Risk                           | Why it matters                                                        | Mitigation                                                        |
| ------------------------------ | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Fake fix via `planRef` only    | The workflow could still resolve and retain the whole plan durably    | Explicit negative rule: no durable full-plan carriage after start |
| Cutover replay break           | Old workflows may replay against a new incompatible input shape       | Require versioned workflow type or drained deploy                 |
| Gateway facts under-specified  | Future gateway layers need prior dependency facts                     | Freeze a compact fact seam before code implementation             |
| Activity chatter               | Over-fragmented segment resolution can create too many activity calls | Resolve by bounded segment or layer, not per field                |
| Artifact availability coupling | Pointer-based runtime increases dependence on artifact fetch success  | Make artifact availability contract and failure behavior explicit |

## Slice plan

### AR-D-PLAN-POINTER-A

Freeze the target workflow input semantics and the cutover rule.

Outputs:

- proposal accepted as plan of record
- lane task linked
- review truth updated from "proposed" to queued execution work

### AR-D-PLAN-POINTER-B

Define the compact execution-facts seam and the bounded segment-resolution seam.

Outputs:

- typed contract shape for compact execution facts
- typed contract shape for resolved execution segments
- explicit ownership of where those facts live

### AR-D-PLAN-POINTER-C

Implement the canonical workflow input line and adapter dispatch cutover.

Outputs:

- Temporal adapter starts `runPlanWorkflow` with `planRef`
- the old full-plan payload line is removed instead of preserved as a legacy
  branch

### AR-D-PLAN-POINTER-D

Replace rollover state with compact cursor and fact references.

Outputs:

- no full plan in workflow input
- no unbounded `completedStepResults` rollover payload
- replay and continue-as-new tests cover the new shape

### AR-D-PLAN-POINTER-E

Truth-sync docs, diagrams, and closeout.

Outputs:

- architecture docs reflect the shipped runtime truth
- review and status surfaces stop describing full-plan workflow input as active

## Acceptance

- `TemporalAdapter.startRun()` no longer sends `plan: ExecutionPlan` into
  workflow args
- the active workflow line carries `PlanRef` plus compact cursor state only
- the workflow does not durably carry the full plan object after start
- `continueAsNew` handoff is bounded and explicit
- cutover strategy for in-flight workflows is explicit
- docs, planning, and review surfaces describe the same truth

## Current implementation note

Runtime code is now active on this branch.

Implemented branch truth:

- `TemporalAdapter.startRun()` sends `planRef` plus canonical cursor-only input
- `runPlanWorkflow` is the single active workflow entrypoint
- workflow rollover carries compact gateway dependency facts instead of the full
  completed-step map
- execution layers are resolved through a bounded segment seam backed by plan
  fetch plus integrity validation
- `CANCEL` now transports `signalId` through the workflow signal seam and
  deduplicates through the shared control-signal registry instead of using a
  reason-only special case
- the continue-as-new payload budget is now a governed Temporal runtime
  parameter frozen into workflow input instead of a helper-local constant
- pre-layer pause/cancel lifecycle is evaluated before skipped-step side effects
  are emitted for the layer
- continue-as-new cursor construction now fails closed when the serialized
  rollover input exceeds the bounded payload guard

Not yet implemented in this slice:

- externalized compact-facts reference instead of inline bounded facts
- a multi-line replay compatibility strategy
