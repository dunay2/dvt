---
title: Runtime Root Subdivision Component Guide
status: Active
owner: Architecture / Runtime
last_reviewed: 2026-05-13
planning_type: architecture
---

# Runtime Root Subdivision Component Guide

## Purpose

`SYS-RUNTIME-ROOT` exists to group runtime components, not to own runtime files.
The contract is: every tracked runtime package file must belong to exactly one
runtime subcomponent, except plan-store engine-fetch files that remain owned by
`SYS-PLANSTORE-ENGINE-FETCH`.

## Why This Exists

The previous runtime root mixed engine orchestration, run-domain invariants,
state-store lifecycle, event delivery, plan interpretation, plan verification,
DSL parsing, deterministic utilities, and CLI validation. That shape made the
component registry answer "runtime owns this" instead of answering the useful
question: "which component owns this API, invariant, consumer, and test?"

## Public API And Consumers

| Component                           | Public API                                                                            | Main consumers                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `SYS-RUNTIME-ENGINE-CORE`           | `@dvt/engine` entrypoint, `IWorkflowEngine`, run use cases, runtime services          | API composition, workers, Temporal adapter, tests          |
| `SYS-RUNTIME-RUN-DOMAIN`            | `applyRunEvent`, transition policy exports, projectable event mapper                  | Engine projector, state-store tests, lifecycle projections |
| `SYS-RUNTIME-STATE-STORE`           | `RunStateCommandPort`, archive lifecycle services, object-store adapters              | Engine/state adapters, retention jobs, archive workflows   |
| `SYS-RUNTIME-DELIVERY`              | `OutboxWorkerRuntime`, `ProjectorWorkerRuntime`, shard assignment, backpressure guard | outbox/projector workers, API admission support            |
| `SYS-RUNTIME-PLAN-INTERPRETATION`   | DAG validation and execution layer calculation                                        | Temporal adapter, planner/runtime validation paths         |
| `SYS-RUNTIME-PLAN-VERIFICATION`     | plan version admission, verification, hash and step-type checks                       | API, CLI validation, CI contract checks                    |
| `SYS-RUNTIME-DSL`                   | DSL v1 parse/evaluate API                                                             | planner/runtime expression handling                        |
| `SYS-RUNTIME-DETERMINISM-UTILITIES` | JCS canonicalization and SHA-256 digest helpers                                       | contract hashing, artifact hashing, verifier paths         |
| `SYS-RUNTIME-CLI-VALIDATION`        | script-backed validation metadata plus contract/golden-path scripts                   | contributors, CI, release checks                           |

## Invariants

- `SYS-RUNTIME-ROOT` is a `module` and must not own files.
- Runtime file ownership belongs to component units only.
- `packages/@dvt/engine/src/security/planRefPolicy.ts` and related plan-ref
  files remain owned by `SYS-PLANSTORE-ENGINE-FETCH`.
- Component entrypoints must state their `@ownedConcern`.
- No runtime package should reintroduce a placeholder export to satisfy build
  tooling.
- Semantic architecture tests must use real tracked files, not only synthetic
  manifest fixtures.

## State And Transition Model

```mermaid
stateDiagram-v2
  [*] --> BroadRoot: previous manifest
  BroadRoot --> RuntimeModule: root becomes module
  RuntimeModule --> ComponentOwned: package files move to component owners
  ComponentOwned --> SemanticGuarded: real-manifest architecture test passes
  SemanticGuarded --> GeneratedViewsFresh: governance refresh regenerates views
```

## Dependency Direction

```mermaid
flowchart LR
  Api["apps/api"] --> Engine["@dvt/engine"]
  Worker["workers"] --> Delivery["@dvt/delivery"]
  Engine --> RunDomain["@dvt/run-domain"]
  Engine --> StatePort["@dvt/state-store ports"]
  Delivery --> StatePort
  Engine --> Interpreter["@dvt/plan-interpreter"]
  Api --> Verifier["@dvt/plan-verifier"]
  Interpreter --> Dsl["@dvt/dsl"]
  Verifier --> Canonical["@dvt/crypto"]
  Cli["@dvt/cli"] --> Verifier
  Engine -. plan-ref exception .-> PlanStore["SYS-PLANSTORE-ENGINE-FETCH"]
```

## Error Model

This slice does not add runtime errors. Its error model is governance failure:

- manifest coverage fails when a tracked file has zero or multiple owners;
- semantic architecture test fails when runtime root owns files again;
- CLI test fails if `@dvt/cli` falls back to an unnamed placeholder export;
- generated docs checks fail when component/file indexes are stale.

## Security Rules

- Engine plan-ref policy stays in the plan-store component boundary because it
  protects scoped plan artifact access.
- Runtime component splitting must not grant a package authority over another
  package's data path.
- CLI validation metadata is descriptive; it does not authorize commands.

## Configuration

The manifest source is:

- `docs/planning/status/system-governance-unit-index.units.yaml`

Generated projections are refreshed by:

- `pnpm governance:refresh`
- `pnpm docs:governance:unit-coverage`

## Observability And Runtime Evidence

This is an architecture/governance slice. Runtime observability is unchanged.
Evidence is provided by:

- semantic architecture test:
  `node --test scripts/check-governance-unit-coverage.test.cjs`;
- manifest coverage:
  `pnpm docs:governance:unit-coverage`;
- generated governance views after refresh;
- package-level CLI test:
  `pnpm --filter @dvt/cli test`.

## Traceability

```text
Requirement
  Runtime components must answer ownership, API, invariant, consumer, and test questions.
Decision
  Runtime root is a module; runtime files move to component units.
Design
  Runtime subsystem guide plus component manifest split.
Contract
  Real tracked runtime files must resolve to exact runtime component IDs.
Code
  system-governance-unit-index.units.yaml
Test
  check-governance-unit-coverage.test.cjs
Runtime evidence
  docs:governance:unit-coverage and governance refresh outputs
```

## Tests

- `node --test scripts/check-governance-unit-coverage.test.cjs`
- `pnpm docs:governance:unit-coverage`
- `pnpm --filter @dvt/cli test`

## Lifecycle Policy

Runtime subcomponents may be split further only when the planning surface names
the parent chain, DDD owner, command/query posture, owned paths, dependency
rules, negative tests, and drift removed. Broad runtime roots must not regain
file ownership.

<a id="section-runtime-root-subdivision-user-stories"></a>

## Runtime Root Subdivision User Stories

### Stories

| ID         | Story                                                                                                                  | Acceptance criteria                                                                                                                                                                                          | Test evidence                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| RT-SUB-001 | As an architect, I can query a runtime file and see the exact component that owns it.                                  | `@dvt/engine`, `@dvt/state-store`, `@dvt/delivery`, `@dvt/run-domain`, `@dvt/plan-interpreter`, `@dvt/plan-verifier`, `@dvt/crypto`, `@dvt/dsl`, and `@dvt/cli` files map to specific runtime component IDs. | `node --test scripts/check-governance-unit-coverage.test.cjs`                  |
| RT-SUB-002 | As a reviewer, I can verify that `SYS-RUNTIME-ROOT` is only a grouping module.                                         | Runtime root has `level: module` and `owns: []`.                                                                                                                                                             | `real manifest subdivides runtime package files below the runtime root module` |
| RT-SUB-003 | As a plan-store maintainer, I can confirm plan-ref policy ownership was not swallowed by engine core.                  | Plan-ref policy files still map to `SYS-PLANSTORE-ENGINE-FETCH`.                                                                                                                                             | Same semantic architecture test                                                |
| RT-SUB-004 | As a contributor, I can open a runtime package entrypoint and see its owned concern.                                   | Runtime package entrypoints contain `@ownedConcern` docblocks.                                                                                                                                               | review plus package tests                                                      |
| RT-SUB-005 | As a CLI maintainer, I can see that `@dvt/cli` is script-oriented and not a fake user-facing CLI.                      | `cliPackageSurface` names the commands and `userFacingCli: false`.                                                                                                                                           | `pnpm --filter @dvt/cli test`                                                  |
| RT-SUB-006 | As a docs reader, I can understand the runtime grouping without confusing subsystem docs with package component homes. | Runtime subsystem page links canonical component homes and explains the grouping role.                                                                                                                       | `pnpm docs:sync` and `pnpm verify:prepush`                                     |
| RT-SUB-007 | As a future agent, I cannot close runtime coverage by reintroducing a broad root owner.                                | Architecture test fails if root owns files again.                                                                                                                                                            | semantic manifest test                                                         |

### Red/Green Cycles

| Cycle                      | Red command                                                   | Red result                                | Green patch                                                | Green command                                                 |
| -------------------------- | ------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------- |
| Runtime semantic ownership | `node --test scripts/check-governance-unit-coverage.test.cjs` | `SYS-RUNTIME-ROOT` was still `component`. | Convert root to module and add runtime component owners.   | `node --test scripts/check-governance-unit-coverage.test.cjs` |
| CLI placeholder removal    | `pnpm --filter @dvt/cli test`                                 | `cliPackageSurface` was undefined.        | Replace placeholder with script-oriented package metadata. | `pnpm --filter @dvt/cli test`                                 |

### Out Of Scope

- Splitting `@dvt/engine` internals into source-level governance units.
- Moving `.cjs` CLI behavior into typed command modules.
- Changing runtime behavior, command handlers, adapters, or persistence.
- Creating a new ADR; existing governance rules are sufficient.

> Acceptance scope status: Active. Owner: Architecture / Runtime.
