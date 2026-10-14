---
title: Engine public API surface component
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-14
---

# Engine Public API Surface Component

## Purpose

This component owns the semantic package boundary for `@dvt/engine`. It keeps
the root package entrypoint stable for contracts and ports, moves runtime
composition behind a named entrypoint, and keeps in-memory test doubles behind
the testing entrypoint.

## Public API

| Surface                                       | Owner                          | Role                                                                                                       |
| --------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `@dvt/engine`                                 | Engine public API surface      | Stable contracts, errors, role interfaces, ports, and value types.                                         |
| `@dvt/engine/runtime`                         | Engine runtime composition API | Builders, policies, services, workers, provider registries, and runtime helpers used by composition roots. |
| `@dvt/engine/testing`                         | Engine testing API             | In-memory stores and provider test doubles for package and integration tests.                              |
| `enginePublicApiSurface.architecture.test.ts` | Engine architecture tests      | Semantic fitness function that rejects root/runtime/testing drift.                                         |

## Invariants

- The root entrypoint exports stable contracts, errors, ports, domain service
  interfaces, and role interfaces only.
- Runtime implementation classes and builders are exported from
  `@dvt/engine/runtime`, not from the root.
- Test doubles and in-memory stores are exported from `@dvt/engine/testing`,
  not from the root or runtime entrypoints.
- Consumers that compose production runtime infrastructure use
  `@dvt/engine/runtime`.
- Consumers that only need engine contracts or ports use `@dvt/engine`.
- Event contracts use canonical names from `@dvt/contracts`
  (`EventInput`, `EventEnvelope`, `RunEventInput`, `StepEventInput`) without
  engine-local alias names.
- The package `exports` map must contain exactly the governed entrypoints for
  root, runtime, and testing.
- Each entrypoint module must declare an owned-concern header near the top of
  the file.

## Transitions

| Transition                   | From                           | To                            | Rule                                                                                        |
| ---------------------------- | ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------- |
| stable type consumption      | consumer package               | `@dvt/engine`                 | Use the root only for contracts, errors, ports, and role interfaces.                        |
| runtime assembly             | API or worker composition root | `@dvt/engine/runtime`         | Use runtime entrypoint for builders, policies, workers, and implementation services.        |
| test double setup            | integration or package test    | `@dvt/engine/testing`         | Use testing entrypoint for in-memory stores and fake provider adapters.                     |
| future implementation export | engine source module           | runtime or testing entrypoint | Root export is rejected unless the component guide and architecture test are changed first. |

## Consumers

- `apps/api/src/application/services/WorkflowEngineFactory.ts`
- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/temporal-worker/src/runtime/temporalWorkerStores.ts`
- `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`
- `packages/@dvt/adapter-temporal/src/*`
- `packages/@dvt/state-store/src/*`
- API and adapter tests that import engine errors, ports, or testing doubles.

## Diagrams

```mermaid
flowchart TB
  Root["@dvt/engine"]
  Runtime["@dvt/engine/runtime"]
  Testing["@dvt/engine/testing"]
  Contracts["Contracts, errors, ports, role interfaces"]
  Composition["Runtime builders, policies, services, workers"]
  Doubles["In-memory stores and fake provider adapter"]
  API["apps/api composition root"]
  Worker["apps/temporal-worker"]
  Adapters["adapter packages"]
  Tests["integration tests"]

  Root --> Contracts
  Runtime --> Composition
  Testing --> Doubles
  API --> Root
  API --> Runtime
  Worker --> Root
  Worker --> Runtime
  Adapters --> Root
  Adapters --> Runtime
  Tests --> Testing
```

```mermaid
stateDiagram-v2
  [*] --> PublicOnly: root exports stable API
  PublicOnly --> RuntimeGoverned: composition uses runtime entrypoint
  RuntimeGoverned --> TestingGoverned: in-memory helpers use testing entrypoint
  TestingGoverned --> Accepted: architecture guard passes
  PublicOnly --> Drift: root exports implementation class
  RuntimeGoverned --> Drift: runtime exports in-memory test double
  TestingGoverned --> Drift: testing helper leaks into root
  Drift --> Rejected: package-surface guard fails
```

## Drift Guards

- `enginePublicApiSurface.architecture.test.ts` fails if the root barrel exports
  runtime implementation modules, workers, security implementation classes,
  in-memory stores, or provider test doubles.
- The guard fails if the package `exports` map drops `./runtime` or `./testing`.
- The guard fails if engine event contracts reintroduce compatibility aliases
  such as persisted/run-level/step-level legacy names.
- The guard fails if entrypoint modules lose owned-concern headers.
- The guard requires this component guide, the user stories, the implementation
  proposal, and the Fowler mailbox record to stay aligned.

## Related Records

- [Engine public API surface user stories](engine-public-api-surface-component.md#section-engine-public-api-surface-user-stories)
- [EA-20260429-05 implementation plan](../../../planning/proposals/mandatory/runtime-and-contracts/ea-20260429-05-engine-public-api-surface-plan-20260514.md)
- [DVT engine package audit review](https://github.com/dunay2/dvt/blob/5f1cb78d83b467d8b133380d9115d50b10dd14e7/docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md)

<a id="section-engine-public-api-surface-user-stories"></a>

## Engine Public API Surface User Stories

### Stories

#### US-EA-20260429-05-001 - Stable Consumers Import Contracts From Root

As an API or adapter developer, I want `@dvt/engine` to expose stable engine
contracts, errors, ports, and role interfaces only, so that root imports do not
become accidental dependencies on implementation classes.

Acceptance criteria:

- Root exports include engine contracts, errors, ports, and domain role
  interfaces.
- Root exports exclude runtime builders, workers, security implementation
  classes, in-memory stores, and fake provider adapters.
- The architecture test names each forbidden export family.

#### US-EA-20260429-05-002 - Composition Roots Use Runtime Entry Point

As an API composition-root owner, I want runtime builders and policies behind
`@dvt/engine/runtime`, so that production assembly can stay explicit without
polluting the stable root package surface.

Acceptance criteria:

- `@dvt/engine/runtime` exports runtime builders, policies, services, provider
  registry helpers, and workers needed by composition roots.
- API and worker source imports runtime implementation symbols from
  `@dvt/engine/runtime`.
- Typecheck proves the entrypoint is usable by consumers.

#### US-EA-20260429-05-003 - Test Doubles Stay Test-Only

As an integration-test author, I want in-memory stores and fake provider
adapters behind `@dvt/engine/testing`, so that tests can compose engine ports
without treating those doubles as production API.

Acceptance criteria:

- `@dvt/engine/testing` exports in-memory stores and provider test doubles.
- Root and runtime entrypoints do not export in-memory stores or fake provider
  adapters.
- Existing API integration tests continue to import testing doubles through the
  testing entrypoint.

#### US-EA-20260429-05-004 - Future Barrel Drift Fails Fast

As an engine maintainer, I want a semantic architecture guard for the package
surface, so that future broad root exports fail during package tests.

Acceptance criteria:

- The guard validates entrypoint headers, package `exports`, documentation
  coverage, and forbidden root/runtime/testing cross-leaks.
- The guard proves semantics instead of only checking that a barrel is short.
- The component guide and user stories are required by the guard.

### Negative Scenarios

- Given `src/index.ts` exports `RunMaintenanceService`, the architecture guard
  fails because runtime service implementation leaked into the root.
- Given `src/index.ts` exports `IntentReconcilerWorker`, the guard fails because
  worker implementation leaked into the root.
- Given `src/index.ts` exports `InMemoryTxStore`, the guard fails because a test
  double leaked into the stable public API.
- Given `package.json` omits `./runtime`, the guard fails because production
  composition has no governed entrypoint.
- Given `src/runtime.ts` exports `InMemoryProviderAdapter`, the guard fails
  because test doubles leaked into runtime composition.

### Scenario Coverage Matrix

| Story                 | Scenario                   | Required proof                                                            |
| --------------------- | -------------------------- | ------------------------------------------------------------------------- |
| US-EA-20260429-05-001 | Stable root import         | `enginePublicApiSurface.architecture.test.ts`                             |
| US-EA-20260429-05-002 | Runtime composition import | `pnpm --filter @dvt/engine typecheck`                                     |
| US-EA-20260429-05-003 | Test double import         | `enginePublicApiSurface.architecture.test.ts` and API integration imports |
| US-EA-20260429-05-004 | Future drift prevention    | package-surface architecture guard                                        |

### Requirement Trace

- Task: `A/EA-20260429-05`.
- Audit finding: broad public package barrel in
  [Historical source](https://github.com/dunay2/dvt/blob/5f1cb78d83b467d8b133380d9115d50b10dd14e7/docs/planning/reviews/architecture-and-governance/20260429-dvt-engine-package-audit-review.md).
- Component guide:
  `docs/architecture/components/engine/architecture/engine-public-api-surface-component.md`.
- Plan:
  `docs/planning/proposals/mandatory/runtime-and-contracts/ea-20260429-05-engine-public-api-surface-plan-20260514.md`.

> Acceptance scope status: Active. Owner: Architecture / Engine.
