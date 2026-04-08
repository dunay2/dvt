---
title: Component Map
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-08
---

# DVT Component Map

This page is the supporting architecture map for the components that exist in
the repository today.

It is grounded in current code and the active workboard, but it still does not
replace topic-specific specs or the current status surface. Use it to answer
three practical questions:

- which deployable app, package, or worker owns a responsibility today;
- how the component families interact at runtime;
- which queued deltas are already accepted into planning.

## Read This With

1. [Reference Architecture](reference-architecture.md)
2. [System Delivery Status](system-delivery-status.md)
3. [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
4. [Planning Control Tower](../planning/state/planning-control-tower.md)

## Current Topology

```mermaid
flowchart TB
  subgraph UIAndEntry["UI and entry"]
    web["apps/web (`@dvt/web`)"]
    api["apps/api (`dvt-api`)"]
  end

  subgraph Planning["Planning and artifacts"]
    planner["@dvt/planner"]
    verifier["@dvt/plan-verifier"]
    interpreter["@dvt/plan-interpreter"]
    dsl["@dvt/dsl"]
    artifacts["@dvt/artifacts"]
    plannerContracts["@dvt/planner-contracts"]
  end

  subgraph Execution["Execution and persistence"]
    engine["@dvt/engine"]
    runDomain["@dvt/run-domain"]
    state["@dvt/state-store"]
    temporal["@dvt/adapter-temporal"]
    postgres["@dvt/adapter-postgres"]
  end

  subgraph Delivery["Delivery and read models"]
    delivery["@dvt/delivery"]
    outbox["apps/outbox-worker (`dvt-outbox-worker`)"]
    projector["apps/projector-worker (`dvt-projector-worker`)"]
    lineage["apps/lineage-worker (`dvt-lineage-worker`)"]
  end

  subgraph Shared["Contracts and cross-cutting"]
    contracts["@dvt/contracts"]
    observability["@dvt/observability"]
    otel["@dvt/observability-otel"]
    traceability["@dvt/traceability-service"]
    crypto["@dvt/crypto"]
  end

  web --> api
  web --> contracts
  api --> planner
  api --> engine
  api --> delivery
  api --> observability
  planner --> plannerContracts
  planner --> artifacts
  planner --> verifier
  planner --> interpreter
  planner --> dsl
  planner --> contracts
  planner --> crypto
  engine --> runDomain
  engine --> contracts
  engine --> state
  engine --> temporal
  engine --> postgres
  delivery --> contracts
  delivery --> outbox
  delivery --> projector
  delivery --> lineage
  outbox --> postgres
  outbox --> state
  projector --> postgres
  lineage --> postgres
  lineage --> traceability
  observability --> otel
  traceability --> contracts
```

## Entry And UI Surfaces

- `apps/api`: HTTP composition root for auth, admission, runtime commands,
  queries, health, readiness, and reconciler bootstrap.
  Code anchors: [app.ts](../../apps/api/src/app.ts),
  [server.ts](../../apps/api/src/server.ts),
  [buildProtectedRuntimeModule.ts](../../apps/api/src/modules/buildProtectedRuntimeModule.ts).
  Planned delta: keep frontend-facing contract and admission/runtime health
  alignment explicit; related active work includes `MVP-E1` and residual Lane
  C hardening.
- `apps/web` (`@dvt/web`): browser application shell, plugin-routed views,
  platform-health probes, and operator-facing UX.
  Code anchors: [main.tsx](../../apps/web/src/main.tsx),
  [routes.ts](../../apps/web/src/app/routes.ts),
  [httpPlatformHealthClient.ts](../../apps/web/src/capabilities/platform-health/infrastructure/httpPlatformHealthClient.ts).
  Planned delta: retire direct mock-driven view wiring and finish backend-backed
  shell behavior; related active work includes `F-01`, `F-03`, `F-04`, and
  `MVP-E1`.

## Planning And Artifact Surfaces

- `@dvt/planner`: planner facade, graph-source derivation, manifest handling,
  and execution-plan assembly.
  Code anchors: [PlannerFacade.ts](../../packages/@dvt/planner/src/application/PlannerFacade.ts),
  [derivePlannerGraphSourceFromManifest.ts](../../packages/@dvt/planner/src/application/derivePlannerGraphSourceFromManifest.ts).
  Planned delta: formalize the plan-record and plan-store model without widening
  shared-kernel drift; active work centers on `S08` and ownership cleanup under
  `RC-G1-D`.
- `@dvt/planner-contracts`: thin contract-export package used to publish
  planner contract entrypoints for consumers.
  Code anchors: [index.ts](../../packages/@dvt/planner-contracts/index.ts),
  [ExecutionPlan.v1.ts](../../packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts).
  Planned delta: keep it narrow and derivative of canonical planner contracts
  rather than growing parallel planner semantics.
- `@dvt/plan-verifier`, `@dvt/plan-interpreter`, `@dvt/dsl`: verification, DAG
  interpretation, and deterministic DSL evaluation around planner output.
  Code anchors: [verify.ts](../../packages/@dvt/plan-verifier/src/verify.ts),
  [dagAnalyzer.ts](../../packages/@dvt/plan-interpreter/src/dagAnalyzer.ts),
  [index.ts](../../packages/@dvt/dsl/src/index.ts).
  Planned delta: stay narrow and verifiable; changes should track planner
  compatibility work rather than grow into parallel policy engines.
- `@dvt/artifacts`: compiled-code attachment and storage adapters used by
  planner output and traceability flows.
  Code anchors: [index.ts](../../packages/@dvt/artifacts/src/index.ts),
  [attachCompiledCodeRefs.ts](../../packages/@dvt/artifacts/src/compiledCode/attachCompiledCodeRefs.ts).
  Planned delta: absorb storage behavior that should not remain planner-private
  as `S08` lands.

## Execution And State Surfaces

- `@dvt/engine`: owns run lifecycle semantics, access policy, start-run
  coordination, snapshot projection, and maintenance services.
  Code anchors: [WorkflowEngine.ts](../../packages/@dvt/engine/src/core/WorkflowEngine.ts),
  [StartRunApplicationService.ts](../../packages/@dvt/engine/src/application/StartRunApplicationService.ts),
  [RunAccessPolicy.ts](../../packages/@dvt/engine/src/security/RunAccessPolicy.ts).
  Planned delta: continue hardening and modularization without moving authority
  out of the engine; active work includes `S02`, `S03`, `S04`, `DHM`, and
  `RC-G1`.
- `@dvt/run-domain`: pure run-event transition and illegal-state policy library
  consumed below the engine boundary.
  Code anchors: [applyRunEvent.ts](../../packages/@dvt/run-domain/src/applyRunEvent.ts),
  [transitionPolicy.ts](../../packages/@dvt/run-domain/src/transitionPolicy.ts).
  Planned delta: keep transition rules explicit and domain-pure instead of
  duplicating lifecycle policy across engine or adapters.
- `@dvt/state-store` plus `@dvt/adapter-postgres`: state-store boundary,
  snapshot/query persistence, intent logging, outbox persistence, and plan-store
  implementation.
  Code anchors: [index.ts](../../packages/@dvt/state-store/src/index.ts),
  [PostgresStateStoreRuntime.ts](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreRuntime.ts),
  [PostgresPlanStore.ts](../../packages/@dvt/adapter-postgres/src/PostgresPlanStore.ts).
  Planned delta: keep ownership explicit while plan-store and state-store
  responsibilities are separated cleanly under `S02` and `S08`.
- `@dvt/adapter-temporal`: Temporal provider implementation and worker-host
  integration behind engine/provider contracts.
  Code anchors: [index.ts](../../packages/@dvt/adapter-temporal/src/index.ts),
  [TemporalAdapter.ts](../../packages/@dvt/adapter-temporal/src/TemporalAdapter.ts).
  Planned delta: preserve equivalence and provider isolation while engine
  hardening continues; new behavior must stay behind the provider contract.

## Delivery, Projection, And Traceability Surfaces

- `@dvt/delivery`: delivery-runtime library for outbox draining,
  projection, lineage bridging, and admission guarding helpers.
  Code anchors: [OutboxWorkerRuntime.ts](../../packages/@dvt/delivery/src/application/OutboxWorkerRuntime.ts),
  [ProjectorWorkerRuntime.ts](../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts),
  [LineageWorkerRuntime.ts](../../packages/@dvt/delivery/src/application/LineageWorkerRuntime.ts).
  Planned delta: tighten remaining contract seams and event-envelope policy;
  active work includes `S05`, `S07`, and `S11`.
- `apps/outbox-worker` (`dvt-outbox-worker`): delivery composition root with
  shard ownership, ops endpoints, retention, and purge runtime wiring.
  Code anchors: [server.ts](../../apps/outbox-worker/src/server.ts),
  [runOutboxWorkerHost.ts](../../apps/outbox-worker/src/host/runOutboxWorkerHost.ts),
  [DeliveryBufferPurgeRuntime.ts](../../apps/outbox-worker/src/runtime/DeliveryBufferPurgeRuntime.ts).
  Planned delta: keep operational ownership explicit while retention and purge
  policy continue to harden.
- `apps/projector-worker` (`dvt-projector-worker`): dedicated read-model worker
  that rebuilds stale snapshots through the shared delivery runtime.
  Code anchors: [server.ts](../../apps/projector-worker/src/server.ts),
  [ProjectorWorkerRuntime.ts](../../packages/@dvt/delivery/src/application/ProjectorWorkerRuntime.ts),
  [PostgresStateStoreAdapter.ts](../../packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts).
  Planned delta: keep read-model rebuild downstream-only and avoid pushing
  snapshot ownership back into API or engine composition roots.
- `apps/lineage-worker` (`dvt-lineage-worker`): dedicated lineage worker that
  drains lineage outbox records and ships OpenLineage-compatible payloads.
  Code anchors: [server.ts](../../apps/lineage-worker/src/server.ts),
  [bootstrap.ts](../../apps/lineage-worker/src/bootstrap.ts),
  [compiledCodeResolver.ts](../../apps/lineage-worker/src/compiledCodeResolver.ts).
  Planned delta: keep lineage as a downstream consumer with explicit
  mapper/sink seams rather than a second owner of runtime lifecycle facts.
- `@dvt/contracts`, `@dvt/observability`, `@dvt/observability-otel`,
  `@dvt/traceability-service`, `@dvt/crypto`: shared transport contracts,
  telemetry ports, OTel binding, lineage mapping, and hashing/canonicalization
  helpers.
  Code anchors: [contracts index](../../packages/@dvt/contracts/src/index.ts),
  [observability index](../../packages/@dvt/observability/src/index.ts),
  [traceability service](../../packages/@dvt/traceability-service/src/service.ts),
  [crypto index](../../packages/@dvt/canonical/src/index.ts).
  Planned delta: keep shared-kernel scope tight and explicit; related deltas
  include `RC-G1` ownership cleanup and production OTel validation.

## Relationship Rules

- `apps/web` talks to the product backend through `apps/api`; it is not a
  second orchestration authority and it should not couple directly to execution
  adapters.
- `apps/api` composes planner, engine, and delivery surfaces, but it should not
  redefine lifecycle or contract invariants that already belong to the engine
  and shared contracts.
- `@dvt/delivery` owns downstream publication and projection behavior; worker
  apps are composition roots and operational shells around that runtime.
- Shared packages stay small on purpose. When ownership is ambiguous, the fix is
  to narrow the shared surface, not to hide the ambiguity in a generic "common"
  bucket.

## Related Pages

- [DVT Domain Map](domain-map.md)
- [Architecture Component Surfaces](components/index.md)
- [System Delivery Status](system-delivery-status.md)
- [Planning Control Tower](../planning/state/planning-control-tower.md)
