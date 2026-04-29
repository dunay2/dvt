---
title: Plan Admission Matrix
status: Active
owner: Architecture / Contracts / Engine
last_reviewed: 2026-04-29
---

# Plan Admission Matrix

This component note defines how start-run admission binds `planVersion` and
`schemaVersion` before the engine fetches plan bytes or dispatches to a
provider.

## Owned Concern

The admission matrix owns the executable answer to this question:

> Can this runtime admit the `PlanRef` pair
> `(planVersion, schemaVersion)`?

It is a current-admission surface. It does not own plan hashing, plan storage,
adapter execution, or planner emission policy. Those remain governed by
ADR-0012, ADR-0017, ADR-0036, and the planner contract pack.

## Public API

Code surface:

- `packages/@dvt/contracts/src/contracts/planner/PlanAdmission.v1.ts`
- `packages/@dvt/engine/src/contracts/PlanAdmissionPolicy.ts`

Exports:

- `SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS`
- `EXECUTION_PLAN_ADMISSION_MATRIX`
- `EXECUTION_PLAN_ADMISSION_REGISTRY`
- `isAdmittedExecutionPlanPair(planVersion, schemaVersion)`
- `assertAdmittedPlanPair({ planVersion, schemaVersion })`

Current admitted pair:

| `planVersion` | `schemaVersion` | Status    |
| ------------- | --------------- | --------- |
| `1.0`         | `v1.2`          | `current` |

## Component Map

```mermaid
flowchart LR
  PlanRef["PlanRef\nplanVersion + schemaVersion"]
  Contract["PlanAdmission.v1.ts\nexecutable admission truth"]
  Policy["PlanAdmissionPolicy.ts\nengine ingress assertion"]
  StartRun["StartRunValidationPolicy\npre-bootstrap gate"]
  Provider["Provider adapter\nreceives only admitted refs"]

  PlanRef --> Policy
  Policy --> Contract
  Policy --> StartRun
  StartRun --> Provider
```

| Component                  | Owned concern                                      |
| -------------------------- | -------------------------------------------------- |
| `PlanAdmission.v1.ts`      | Publish the executable admitted pair registry.     |
| `PlanAdmissionPolicy.ts`   | Convert undeclared pairs into engine ingress fail. |
| `StartRunValidationPolicy` | Invoke admission before run creation or dispatch.  |
| Contract tests             | Prove positive and negative pair behavior.         |
| Architecture fitness tests | Guard semantic documentation and naming drift.     |

## Invariants

- Start-run admission MUST reject any undeclared
  `(planVersion, schemaVersion)` pair before adapter dispatch.
- A valid `planVersion` does not make an unknown `schemaVersion` executable.
- A valid `schemaVersion` does not make an unknown `planVersion` executable.
- `schemaVersion = v1.future` is unsupported.
- The engine MUST NOT use a broad `v1.*` prefix rule as runtime admission
  truth.
- Older plan/schema pairs remain undeclared unless they are the active pair.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> PlanRefParsed
  PlanRefParsed --> Rejected: pair not in admission matrix
  PlanRefParsed --> Admitted: pair in admission matrix
  Rejected --> [*]: typed InvalidSchemaVersionError or unsupported planVersion
  Admitted --> FetchPlanBytes
  FetchPlanBytes --> ProviderDispatch
```

## Runtime Sequence

```mermaid
sequenceDiagram
  participant Caller
  participant Engine as StartRun admission
  participant Matrix as Plan admission matrix
  participant Fetcher as Plan fetcher
  participant Adapter as Provider adapter

  Caller->>Engine: startRun(PlanRef)
  Engine->>Matrix: assertAdmittedPlanPair(pair)
  alt unsupported pair
    Matrix-->>Caller: reject before fetch/dispatch
  else supported pair
    Engine->>Fetcher: fetch immutable plan bytes
    Engine->>Adapter: startRun(verified PlanRef)
  end
```

## Diagrams

The component map shows ownership boundaries. The transition and sequence
diagrams show the runtime order: parse the `PlanRef`, assert the pair, then
fetch plan bytes and dispatch only after admission succeeds.

## Consumers

- `StartRunValidationPolicy` uses the engine policy before run creation.
- `@dvt/contracts` tests guard the canonical matrix surface.
- Engine start-run tests guard negative admission and no-dispatch behavior.

## User Stories

The executable story set lives in
[Plan admission user stories](./plan-admission-user-stories.md). The stories
cover the current admitted pair, unsupported future schema, older schema,
unknown plan version, blank inputs, no-dispatch behavior, and documentation
drift.

## Drift Guards

- `plan-admission-matrix.contract.test.ts` validates admitted and rejected
  pair behavior.
- `plan-admission-matrix.architecture.test.ts` validates local component
  documentation, owned-concern docblocks, user stories, mailbox analysis, and
  retired naming.
- `WorkflowEngine.test.ts` validates unsupported schema rejection before
  provider dispatch.
- ARC-2 evidence and risk records must change with any contract or engine
  admission change.

## Hard-Cut Change Rule

Replacing the active pair requires a deliberate bounded change:

1. Extend the plan-version registry if `planVersion` changes.
2. Extend the schema/contract definition if `schemaVersion` changes.
3. Replace the admitted pair in `EXECUTION_PLAN_ADMISSION_MATRIX`.
4. Add negative and positive tests proving old, future, and malformed pairs
   reject.
5. Update ARC-2 evidence and risk entries for contract or engine changes.
