# StartRun Boundary Contract (Normative v1)

[<- Back to Contracts Registry](../README.md)

**Status**: NORMATIVE - active pre-stable line  
**Version**: 1.0  
**Scope**: API-to-engine start-run orchestration boundary  
**Consumers**: API runtime routes, command application services, planner-backed admission flow, engine reviewers  
**Canonical source**: [`packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts`](../../../../../../packages/@dvt/contracts/src/contracts/engine/StartRunBoundary.v1.ts)  
**Related contracts**: [IWorkflowEngine.v1.md](./IWorkflowEngine.v1.md), [StartRunProtocol.v1.md](./StartRunProtocol.v1.md), [ExecutionSemantics.v1.md](./ExecutionSemantics.v1.md)  
**Related ADRs**: [ADR-0005](../../../../../adr/ADR-0005-contract-formalization-tooling.md), [ADR-0006](../../../../../adr/ADR-0006-contract-tooling-governance.md), [ADR-0012](../../../../../adr/ADR-0012-plan-integrity-ownership.md), [ADR-0014](../../../../../adr/ADR-0014-run-driven-adapter-model.md)

---

## Purpose

Define the shared command/result contract between `apps/api` start-run
application services and the engine-facing orchestration path.

This contract is intentionally wider than `IWorkflowEngine.startRun(planRef,
context)`.

It covers the API-owned orchestration concerns that happen before the narrow
engine facade is called:

- planner-backed graph input
- optional persisted `PlanRef` ingress
- target-adapter selection
- admission result vocabulary

Use the local component guide for public API, invariants, transitions, and
consumers:

- [Start-run boundary component](./start-run-boundary-component.md)

## Boundary rules

### MUST

- live in `@dvt/contracts`, not in app-local API types
- provide one canonical `StartRunCommand` shape and one canonical
  `StartRunResult` vocabulary
- stay aligned with runtime validation via shared schemas and parse helpers
- enforce exactly one command branch:
  - persisted `planRef` ingress
  - planner-backed `graphSource` ingress
- resolve environment-dependent values upstream into explicit planner graph,
  policy, ownership, or step configuration before planner-backed admission
- remain distinct from the narrower `IWorkflowEngine.startRun()` contract

### MUST NOT

- redefine `PlanRef` or `RunExecutionContextRef` in app-local form
- publish API-only shadow result enums outside the shared contract package
- allow planner-backed fields to accompany persisted `planRef` ingress
- accept a generic planner `environment` bag that has no deterministic planner
  consumer
- collapse API orchestration input and engine facade input into one misleading
  type

## Contract surface

```ts
interface StartRunCommand {
  planRef?: StartRunPlanRef;
  runExecutionContextRef?: RunExecutionContextRef;
  graphSource?: GenericGraphSourceV1;
  policies?: PlannerPolicyClassSet;
  observability?: ExecutionPlan['observability'];
  runId: string;
  targetAdapter: 'temporal';
  selection: ExecutionSelection;
}

type StartRunResult =
  | { kind: 'accepted'; runId: string; accepted: true }
  | {
      kind: 'duplicate';
      runId: string;
      accepted: true;
      duplicateOf: 'run' | 'intent';
    }
  | {
      kind: 'tenant_backpressure';
      accepted: false;
      code: 'TENANT_BACKPRESSURE';
      retryAfterSeconds: number;
    }
  | {
      kind: 'system_backpressure';
      accepted: false;
      code:
        | 'SYSTEM_BACKPRESSURE'
        | 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE'
        | 'EXECUTION_CAPACITY_EXHAUSTED'
        | 'EXECUTOR_UNAVAILABLE'
        | 'CAPACITY_SIGNAL_UNAVAILABLE';
      retryAfterSeconds: number;
    }
  | {
      kind: 'rate_limited';
      accepted: false;
      code: 'OUTBOX_RATE_LIMIT_EXCEEDED';
      retryAfterSeconds?: number;
    }
  | {
      kind: 'plan_rejected';
      accepted: false;
      code: ExecutabilityRejectionCode;
      reason: string;
      cause?: string;
      supportedVersions?: readonly string[];
    };
```

Branch rule:

- `planRef` branch:
  `planRef` is present and `graphSource`, `policies`, and `observability` are
  absent
- planner-backed branch:
  `graphSource` is present and `planRef` is absent

Environment-dependent configuration is not a StartRun planner field. It must be
resolved before this boundary into explicit graph, policy, ownership, or
step-kind configuration with deterministic semantics.

## Ownership split

- `StartRunCommand` / `StartRunResult`:
  API-to-engine orchestration boundary
- `IWorkflowEngine.startRun(planRef, context)`:
  narrow engine facade
- `StartRunProtocol.v1.md`:
  engine-internal execution protocol after orchestration hands off to the
  engine

This split is deliberate. The API boundary models planner-backed admission and
result classification. The engine boundary models verified execution start.

## Supported adapters

`startRun` accepts only `temporal` as the canonical target adapter. This is an
adapter identifier, not a domain semantic. Temporal construction stays behind
the API provider-adapter factory seam and the engine `IProviderAdapter` port.

## Validation line

The canonical contract validation entry points are:

- `parseStartRunCommand(...)`
- `parseStartRunResult(...)`

These helpers are owned by `@dvt/contracts` and are the canonical reusable
protection against API-local drift in the shape or result vocabulary.

## Current implementation note

`apps/api` imports the start-run command/result boundary directly from
`@dvt/contracts`. The API runtime still performs route-local HTTP parsing, but
the route policy enforces the same plan-source branch rule before handing off
the canonical `StartRunCommand` shape. Planner `environment` ingress is
rejected rather than accepted and discarded. App-local command/result
re-export shims are not part of the governed state for this boundary.

## System backpressure codes

The `system_backpressure` branch covers two classes of system-owned denial:

- delivery/backpressure infrastructure pressure:
  `SYSTEM_BACKPRESSURE`, `BACKPRESSURE_SNAPSHOT_UNAVAILABLE`
- execution-capacity admission pressure:
  `EXECUTION_CAPACITY_EXHAUSTED`, `EXECUTOR_UNAVAILABLE`,
  `CAPACITY_SIGNAL_UNAVAILABLE`

The caller-visible kind remains `system_backpressure`. More specific denial
reasons are encoded in `code` so the contract can distinguish infrastructure
pressure from execution-capacity pressure without creating a second
parallel top-level result kind.
