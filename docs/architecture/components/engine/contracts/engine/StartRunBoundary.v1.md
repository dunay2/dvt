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

## Boundary rules

### MUST

- live in `@dvt/contracts`, not in app-local API types
- provide one canonical `StartRunCommand` shape and one canonical
  `StartRunResult` vocabulary
- stay aligned with runtime validation via shared schemas and parse helpers
- enforce exactly one command branch:
  - persisted `planRef` ingress
  - planner-backed `graphSource` ingress
- remain distinct from the narrower `IWorkflowEngine.startRun()` contract

### MUST NOT

- redefine `PlanRef` or `RunExecutionContextRef` in app-local form
- publish API-only shadow result enums outside the shared contract package
- allow planner-backed fields to accompany persisted `planRef` ingress
- collapse API orchestration input and engine facade input into one misleading
  type

## Contract surface

```ts
interface StartRunCommand {
  planRef?: StartRunPlanRef;
  runExecutionContextRef?: RunExecutionContextRef;
  graphSource?: GenericGraphSourceV1;
  policies?: PlannerPolicyClassSet;
  environment?: StartRunPlannerEnvironmentInput;
  observability?: ExecutionPlan['observability'];
  runId: string;
  targetAdapter: 'temporal' | 'mock';
  selection: readonly string[];
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
      code: 'SYSTEM_BACKPRESSURE' | 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE';
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
  `planRef` is present and `graphSource`, `policies`, `environment`, and
  `observability` are absent
- planner-backed branch:
  `graphSource` is present and `planRef` is absent

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

## Validation line

The canonical contract validation entry points are:

- `parseStartRunCommand(...)`
- `parseStartRunResult(...)`

These helpers are owned by `@dvt/contracts` and are the canonical reusable
protection against API-local drift in the shape or result vocabulary.

## Current implementation note

`apps/api` may keep thin local re-export files for import stability, but the
source of truth for the start-run command/result contract is now the shared
contract package, not the API app. The API runtime still performs route-local
HTTP parsing, but the route policy now enforces the same plan-source branch
rule before handing off the canonical `StartRunCommand` shape.
