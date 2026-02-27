# Plan ejecutable de remediación y completitud para DVT+

Fecha de referencia: 2026-02-26 (Atlantic/Canary)

## Research plan (ejecutable)

| ID    | Goal                                                                                                      | Checks                                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| RP-01 | Inventariar contratos/ADRs afectados por el review y determinar invariantes a congelar                    | Lista de contratos/ADRs tocados; invariantes frozen (idempotency key, bootstrapRunTx, adapter-first ordering) |
| RP-02 | Revisar documentación oficial de Temporal en determinismo, continueAsNew, replay tests y safe deployments | Notas de implementación; checklist de no-determinismo; plantilla de replay-gate en CI                         |
| RP-03 | Auditar modelo outbox y escoger relay (polling vs CDC) con fuentes OSS                                    | Decisión ADR outbox relay; PoC mínimo polling; plan CDC Debezium                                              |
| RP-04 | Seleccionar DSL para gateways (CEL) y comprobar librerías OSS en TS + límites de seguridad                | Spec DSL; PoC evaluator; determinism gate en CI para plans con gateways                                       |
| RP-05 | Revisar docs dbt sobre manifest.json y node selection para especificar IPlanner + fixtures reales         | Spec IPlanner; fixtures manifest (10/100/500); golden tests                                                   |
| RP-06 | Revisar escalabilidad de Postgres (ON CONFLICT, partitioning) y pooling (PgBouncer)                       | DDL partitioned run_events; plan pg_partman; config PgBouncer en staging                                      |
| RP-07 | Revisar guías OWASP para multitenancy e IDOR para endurecer tenant scoping y authz mínimo viable          | TenantId required; tests cross-tenant negativos; runbook de seguridad mínimo                                  |
| RP-08 | Investigar aislamiento de plugins: gVisor/isolated-vm y estado de vm2                                     | Documento de decisión de sandbox; PoC untrusted; restricción plugins solo en Activities                       |
| RP-09 | Cost attribution: investigar recomendación de Snowflake sobre query tags y metering                       | PoC query-tagging; consulta de metering; criterio de viabilidad                                               |

## Fuentes priorizadas

- Temporal testing/replay: https://docs.temporal.io/develop/typescript/testing-suite
- Temporal safe deployments: https://docs.temporal.io/develop/safe-deployments
- Temporal continue-as-new: https://docs.temporal.io/develop/typescript/continue-as-new
- Temporal workflow ID conflict: https://typescript.temporal.io/api/enums/proto.temporal.api.enums.v1.WorkflowIdConflictPolicy
- Outbox pattern: https://microservices.io/patterns/data/transactional-outbox.html
- Debezium outbox router: https://debezium.io/documentation/reference/stable/transformations/outbox-event-router.html
- CEL + cel-es: https://cel.dev/ · https://github.com/bufbuild/cel-es
- dbt manifest + selection: https://docs.getdbt.com/reference/artifacts/manifest-json · https://docs.getdbt.com/reference/node-selection/graph-operators
- PostgreSQL ON CONFLICT + partitioning: https://www.postgresql.org/docs/current/sql-insert.html · https://www.postgresql.org/docs/current/ddl-partitioning.html
- PgBouncer: https://www.pgbouncer.org/config.html
- OWASP multi-tenant + IDOR: https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
- Sandbox security: https://gvisor.dev/docs/ · https://github.com/laverdet/isolated-vm · https://ccb.belgium.be/advisories/warning-2-critical-vulnerabilities-discontinued-vm2-javascript-library-could-lead-remote
- Snowflake cost attribution: https://docs.snowflake.com/en/user-guide/cost-attributing · https://docs.snowflake.com/en/sql-reference/functions/warehouse_metering_history
- OSS samples: https://github.com/temporalio/samples-typescript · https://github.com/conductor-oss/javascript-sdk · https://github.com/dbt-labs/jaffle-shop

## Backlog priorizado (P0/P1/P2)

| ID    | Prioridad | Tarea                                                      | DoD                                     |
| ----- | --------- | ---------------------------------------------------------- | --------------------------------------- |
| P0-01 | P0        | Consolidar ADRs clave                                      | ADRs actualizados + aprobados           |
| P0-02 | P0        | Unificar `IRunStateStore` en contracts                     | Una interfaz canónica                   |
| P0-03 | P0        | Eliminar drift de tipos + validación runtime en boundaries | Tests de payload inválido               |
| P0-04 | P0        | Implementar SnapshotProjector Layer-3 con FSM              | Matriz de secuencias válidas/ inválidas |
| P0-05 | P0        | Forzar `tenantId` en reads/lists/cancel/signal             | Tests negativos cross-tenant            |
| P0-06 | P0        | Definir `IPlanner` + ownership de `ExecutionPlan`          | Spec + schema + fixtures                |
| P0-07 | P0        | Planner MVP (`manifest.json` + DAG + stages)               | Golden tests 10/100/500                 |
| P0-08 | P0        | Plan cache por hash                                        | Cache hit metrics                       |
| P0-09 | P0        | Gateway DSL con CEL                                        | Determinism gate CI                     |
| P0-10 | P0        | Persistir `gatewayDecisions` en continueAsNew              | Estado preservado                       |
| P0-11 | P0        | Outbox relay MVP (polling) + DLQ                           | Outbox drena en operación               |
| P0-12 | P0        | Concurrency fix en `startRun` (`workflowId=runId`)         | Test de carrera con 1 workflow activo   |
| P0-13 | P0        | Extraer `detectStuckRuns` a maintenance service            | Fuera de IWorkflowEngine                |
| P0-14 | P0        | Suite no-gaps (replay/idempotencia/chaos)                  | Gates activos en CI                     |
| P1-01 | P1        | Tooling migración de contratos (dual-read)                 | Migración reversible                    |
| P1-02 | P1        | Partitioning `run_events`                                  | Plan + mantenimiento activo             |
| P1-03 | P1        | PgBouncer en staging                                       | Pool monitorizado                       |
| P1-04 | P1        | PoC Snowflake query-tagging                                | Viabilidad medida                       |
| P1-05 | P1        | Sandbox de plugins                                         | Decisión formal y PoC                   |
| P1-06 | P1        | Estrategia Conductor “state-equivalent”                    | Terminología y límites claros           |
| P2-01 | P2        | Retención hot/cold y GDPR delete                           | Política + runbook                      |
| P2-02 | P2        | Señales extensibles/versionables                           | Compatibilidad hacia atrás              |
| P2-03 | P2        | Capacity planning workers Temporal                         | Límites documentados                    |

## Checklist final de ejecución

| ID    | Task                              | Priority | Estado    |
| ----- | --------------------------------- | -------- | --------- |
| P0-01 | ADRs clave actualizados           | P0       | HECHO     |
| P0-02 | IRunStateStore unificado          | P0       | PARCIAL   |
| P0-03 | Tipos únicos + validación runtime | P0       | PARCIAL   |
| P0-04 | Projector Layer-3 FSM             | P0       | PARCIAL   |
| P0-05 | tenantId obligatorio              | P0       | PARCIAL   |
| P0-06 | IPlanner spec + schema            | P0       | PARCIAL   |
| P0-07 | Planner MVP                       | P0       | PENDIENTE |
| P0-08 | Plan cache                        | P0       | PENDIENTE |
| P0-09 | Gateway CEL                       | P0       | PARCIAL   |
| P0-10 | continueAsNew + gatewayDecisions  | P0       | HECHO     |
| P0-11 | Outbox relay                      | P0       | PARCIAL   |
| P0-12 | startRun concurrency              | P0       | PARCIAL   |
| P0-13 | Maintenance service               | P0       | PENDIENTE |
| P0-14 | CI no-gaps suite                  | P0       | PARCIAL   |
| P1-01 | Contract migration tooling        | P1       | PENDIENTE |
| P1-02 | Postgres partitioning             | P1       | PENDIENTE |
| P1-03 | PgBouncer pooling                 | P1       | PENDIENTE |
| P1-04 | Snowflake tagging PoC             | P1       | PENDIENTE |
| P1-05 | Plugin sandbox                    | P1       | PENDIENTE |
| P1-06 | Conductor strategy                | P1       | HECHO     |
| P2-01 | Retención + GDPR                  | P2       | PENDIENTE |
| P2-02 | Señales extensibles               | P2       | PENDIENTE |
| P2-03 | Capacity planning Temporal        | P2       | PENDIENTE |

DVT+ Architectural Review — Principal/Staff Engineer Assessment
Date: 2026-02-26 | Branch: feat/ddd-cqrs-structure | Basis: Blueprint v0.6, Phase 2 Contracts, Architecture Diagram (dvt_v2_architecture.mmd), 19 ADRs, Remediation Plan

1. Conceptual Soundness
   What Is Solid
   The core triad — "UI does not execute. Engine does not decide. Planner does not persist state" — is a defensible and clean separation. It maps directly to established CQRS + event sourcing patterns and is appropriately supported by ADR-0012 (plan integrity), ADR-0013/0014 (bootstrapRunTx ordering), and ADR-0015 (getRunStatus as pure read).

The event envelope model is well-structured. Assigning seq ownership to RunStateStore at append time is correct — it prevents the engine from generating ordering information it cannot guarantee. (runId, seq) as the dedup key is appropriate and simple.

The dual-read schema migration protocol in Blueprint §10 is mature and realistic. Most teams skip this and pay for it later. Having it specified upfront is an asset.

ADR-0007's cancellation model (engine emits RunCancelRequested as intent; adapter emits RunCancelled as terminal fact) is the only correct approach for async workflow engines. It is properly specified.

ADR-0019's redefinition of adapter equivalence from "execution-equivalent" to "state-equivalent" is a realistic correction. The original framing (Temporal and Conductor behave the same internally) was false and would have caused contract failures when Conductor was implemented.

What Is Fragile
ApiStateSvc is a God Service. The architecture diagram routes everything through it: dbt artifact ingestion, run state, UI subscriptions, planner inputs, live updates. A single TypeScript class mediating read models, write state, WebSocket subscriptions, and dbt artifact parsing is not a "state service" — it is an unmaintained monolith in 18 months. The diagram does not show any decomposition. The Blueprint does not call this out as a risk. It is one.

IPlanner does not exist. P0-06 (define IPlanner spec) and P0-07 (Planner MVP) are both TODO. The architecture posits an entire planning layer — DAGAnalyzer, CostEstimator, PartialExec, RetryPolicy, EnvResolver — without a stable interface contract. The diagram draws these as if they exist. They do not. The entire "Planner (pure)" box in the architecture overview is aspirational, not implemented.

IRunStateStore has two versions in flight. P0-02 ("Unify IRunStateStore in contracts") is TODO. Git status confirms packages/@dvt/contracts/src/engine/IRunStateStore.v1.d.ts and .js are untracked new files. This means engine tests are currently running against one interface while the contracts package is defining another. Type drift between packages at this stage propagates silently.

Gateway decisions across continueAsNew are not persisted. P0-10 is TODO. In Temporal, continueAsNew truncates event history. Any in-memory gateway decision state built up during a long run is lost unless explicitly serialized into the new workflow's input. For a 1000-node dbt DAG requiring multiple continueAsNew cycles, this is a data loss bug, not a feature gap.

Multi-tenant IDOR is unresolved. P0-05 (force tenantId in reads/lists/cancel/signal) is TODO. The ADR-0019 review flagged this. This is not a performance concern — it is a security defect. Cross-tenant data exposure via direct runId access is not theoretical in a multi-tenant API.

What Is Missing
IPlanner contract — its absence makes the entire planning section of the architecture untestable.
Rollback semantics — dbt models execute DDL in Snowflake. A partial run produces real side effects (tables created/modified). The architecture has no rollback story for partial execution failure.
Backpressure model — what happens when the Temporal task queue is saturated? The engine has no defined behavior for queue-full scenarios.
SLA definitions — the Observability layer includes SLA Alerts but no actual thresholds are defined anywhere in the Blueprint. 2. Architectural Risk Map
Risk Severity Likelihood Why Mitigation
ApiStateSvc God Service HIGH CERTAIN It mediates dbt artifacts, run state, WebSocket, planner input, and read models. Will not scale and will become undecomposable. Split into: ArtifactIngestionService, RunStateQueryService, LiveUpdateHub. Define contracts now.
IPlanner absent, planning layer is stub HIGH CERTAIN P0-06/07 TODO. Cannot test planning, cannot validate DAG analysis, no golden path for planner. Define IPlanner contract before building DAGAnalyzer.
Gateway decisions lost on continueAsNew HIGH CERTAIN (for long runs) P0-10 TODO. Temporal event history truncation destroys in-memory state. Serialize gatewayDecisions into continueAsNew input payload. Must be fixed before production.
IRunStateStore dual-version type drift HIGH CERTAIN P0-02 TODO. Engine and contracts package define different versions. Freeze one canonical source. Delete the other. Today.
Cross-tenant IDOR via runId HIGH LIKELY P0-05 TODO. No tenantId enforcement on reads/lists/signal/cancel. Mandatory tenantId scoping on every store query. Negative cross-tenant tests in CI.
Plugin sandbox: vm2 is EOL with CVEs HIGH CERTAIN vm2 is discontinued. The remediation plan lists it. isolated-vm PoC not done (P1-05 TODO). vm2 must not ship. Use isolated-vm or Node.js worker_threads with restricted API surface. Decision cannot be deferred if plugins are in scope.
Outbox relay not implemented HIGH CERTAIN P0-11 TODO. Events are written to outbox but never delivered to event bus. Projectors receive nothing. UI shows nothing. Polling relay MVP minimum. CDC (Debezium) for production volume.
Race condition in startRun MEDIUM LIKELY P0-12 TODO. No workflowId=runId deduplication. Concurrent start requests can create duplicate workflows. Temporal: use WorkflowIdReusePolicy with workflowId=runId. Test with concurrent starts.
run_events table without partitioning MEDIUM CERTAIN at scale P1-02 is P1 (not P0). Without partitioning, sequential scan on run_events degrades at 1M+ events. This is a P1 but must be designed now. DDL migrations on large tables are painful.
Planner: no plan cache MEDIUM CERTAIN P0-08 TODO. Every run triggers full DAG computation from manifest. For 1000-node projects, this is 100ms+ per request. SHA-256 hash of (manifest + selection) as cache key. LRU in-process or Redis-backed.
Cost estimator Snowflake coupling MEDIUM CERTAIN CostEstimator is listed as "pluggable" but description says "Snowflake + heuristics". Pre-run cost is necessarily speculative. Separate pre-run cost estimation (heuristic) from post-run attribution (real data). Do not block planning on Snowflake queries.
detectStuckRuns still in engine MEDIUM CURRENT ADR-0019 mandates extraction to IRunMaintenanceService. P0-13 is TODO. Mixing operational batch jobs with execution contract creates coupling. Extract per ADR-0019. The maintenance service has its own scheduling and failure domain.
Conductor parity complexity MEDIUM LIKELY ADR-0019 narrows to state-equivalent. But Conductor's lifecycle APIs differ significantly (no replay concept, different cancellation model). Adapter parity tests will be expensive. Define conformance matrix now. Do not build Conductor adapter until Temporal is stable.
Plugin hooks into IWorkflowEngine HIGH LIKELY Architecture shows PluginSandbox → "Execution hooks" → IWorkflowEngine. Plugins injecting into the execution path can break determinism and introduce non-deterministic side effects. Plugins MUST only hook into Activities (Temporal's isolation boundary), never into workflow code.
Schema evolution without tooling MEDIUM CERTAIN P1-01 (contract migration tooling) is TODO. Dual-read protocol is specified but unenforceable without migration runner. Build migration scaffolding before shipping v2 of any event schema.
State explosion on snapshot rebuild MEDIUM LIKELY at scale rebuildProjection() on a projector for a large run replays the entire event log. Without snapshot checkpointing, this is O(n) on event count. Require snapshots at fixed intervals (e.g., every 100 events). Define snapshot format now.
Observability before core is built LOW CERTAIN Architecture diagram shows 7+ observability components (OTel, Prom, Grafana, Loki, ELK, Jaeger, Tempo, Sentry). Core contracts are not stable. Wire OTel spans now. Everything else is premature. 3. Engine Abstraction Critique
Is IWorkflowEngine minimal and correct?
No. detectStuckRuns is still in the contract. ADR-0019 explicitly mandates moving it to IRunMaintenanceService (P0-13 TODO). Until this happens, the engine interface conflates execution lifecycle with operational maintenance. These have different SLAs, different failure modes, and different call patterns.

The existing ADR-backed invariants (bootstrapRunTx, adapter-first ordering, SHA-256 plan ownership, pure-read getRunStatus) are correctly specified and enforced in tests. That is the strongest part of the engine layer.

Is Temporal-first wise?
Yes. Temporal's TypeScript SDK is mature. Its determinism guarantees (replay, workflow history, workflow.now(), workflow.sideEffect()) are exactly what deterministic execution needs. continueAsNew for long event histories is the right primitive for large DAGs. The replay testing model is also directly compatible with the golden-path test strategy.

The alternative (building a custom scheduler in Postgres sagas) would cost 6+ months and produce inferior guarantees.

Is Conductor parity realistic?
At the "state-equivalent" level defined by ADR-0019: yes, with significant effort. Conductor's API surface (REST-based task polling, no native replay concept, different cancellation flow) requires more adapter code than Temporal. The conformance test suite will be the expensive part.

The architecture diagram still shows 9 engine options (Argo, Airflow, Prefect, Dagster, Flyte, Kestra). Three of these are Python-first and cannot be meaningfully wrapped with a TypeScript IWorkflowEngineAdapter. Listing them pollutes the architecture with noise. Remove them.

Where determinism assumptions could fail
CEL gateway evaluation: CEL is deterministic but its evaluation must happen inside a Temporal Activity, not inline in workflow code. If CEL is called directly inside the workflow function with external inputs, replay breaks. Blueprint does not specify this boundary.

Non-Temporal adapters: The PHASE2 contract says "Use injected Clock" and "Use seeded PRNG". But the contract does not enforce how the seed is derived deterministically. For non-Temporal adapters, there is no replay mechanism — determinism is therefore unverifiable for Conductor or BullMQ.

Plugin execution hooks: Any plugin that introduces non-deterministic behavior (network call, Date.now()) in a workflow hook violates Temporal's replay safety. The sandbox does not prevent this unless plugins are strictly constrained to Activities.

continueAsNew without persisted gateway state: If a workflow calls continueAsNew and the new workflow instance reconstructs gateway decisions from replay (which won't exist since history was truncated), the routing logic will produce different results than the original run.

4. Execution Planning Layer Analysis
   Is this layer over-engineered?
   Yes, partially. The diagram shows five concurrent sub-components of IExecutionPlanner (DAGAnalyzer, CostEstimator, PartialExec, RetryPolicy, EnvResolver), each feeding into a single ExecutionPlan. None of them exist in code yet. The interface contract (IPlanner/IExecutionPlanner) is not defined (P0-06 TODO). Building five components toward an undefined interface is guaranteed rework.

The correct approach: define IPlanner first, implement DAGAnalyzer as the sole P0 deliverable, treat everything else as P1.

Is it under-specified?
Yes. Specifically:

RetryPolicy ownership: Where does retry state live during execution? If it lives in the ExecutionPlan (static config), who tracks attempt count? If the engine tracks it, does it survive continueAsNew? This is not addressed.
Partial execution guarantees: "PartialExec (selection/skip)" is listed but the semantics of skipping a dbt model that has downstream dependencies are undefined. Does skip propagate? Does it mark downstream as SKIPPED? The dbt --select flag has specific semantics that must be encoded here.
Plan versioning on in-flight runs: If a plan is updated while a run is executing, which version governs the in-flight run? ADR-0017 covers schema versioning but not runtime plan immutability enforcement.
Does it introduce hidden Snowflake coupling?
Yes. CostEstimator is described as "Snowflake + heuristics". Even labeled "pluggable," the heuristics are necessarily Snowflake-specific (warehouse size, credit cost, query history patterns). This component cannot be generalized without stripping its domain knowledge. Call it what it is: SnowflakeCostEstimator. Don't pretend it's adapter-agnostic.

5. State & Metadata Layer Review
   Is Postgres sufficient?
   For transactional state at the scale described (1000 tenants, thousands of concurrent runs), Postgres is sufficient with partitioning. Without it (P1-02 TODO), run_events will have sequential scan degradation before 18 months. The fact that partitioning is P1 and not P0 is an underestimation of this risk.

Connection pooling (PgBouncer) is also P1-03 TODO. Without pooling, each concurrent run establishes its own connection. At high concurrency, Postgres connection exhaustion is a hard failure mode.

Is Snowflake for analytics appropriate?
Analytically yes, operationally problematic. The architecture has SnowCostAdapter ingesting from Snowflake to feed CostDash. This means cost data flows: Snowflake → DVT+ → Snowflake analytics tier. The roundtrip adds latency. More importantly, Snowflake WAREHOUSE_METERING_HISTORY is post-hoc (available after query completion with a lag). Pre-run cost attribution from this source is impossible. The architecture conflates pre-run estimation with post-run attribution.

Is lineage snapshotting scalable?
Unknown. ArtifactRepo stores "immutable bundles" but the storage backend is unspecified. If this is object storage (S3/GCS), snapshotting is cheap. If it's Postgres BYTEA, large dbt manifest.json files (50-500MB for large projects) will cause write amplification and query degradation.

Write amplification risk
A single run event triggers:

Write to run_events (RunStateStore)
Write to outbox (within same transaction — correct)
Outbox relay reads and publishes to event bus
Projector writes to read model (materialized view)
For a 1000-node DAG completing every step, this is 1000+ step-completion events, each causing 4 writes. Without batching in the projector (projectBatch() is defined but usage is unspecified), this creates read model write contention.

6. Plugin System Evaluation
   Isolation strategy is broken
   vm2 is EOL. This is not a risk — it is a fact. The Belgian Centre for Cyber Security issued an advisory on critical vm2 vulnerabilities. Using vm2 in production for untrusted code is indefensible. The Remediation Plan lists this under RP-08 but places the sandbox decision at P1-05. This cannot be P1 if plugins are a product feature.

isolated-vm is the correct replacement. It provides true V8 isolate sandboxing with proper memory limits and API surface control. The PoC needs to happen before plugin architecture is finalized.

gVisor is irrelevant here. It is a kernel-level sandbox for containers, not JavaScript. It does not apply to Node.js plugin isolation.

Can plugins compromise deterministic execution?
Yes. The architecture shows PluginSandbox → "Execution hooks" → IWorkflowEngine. If execution hooks are called from within Temporal workflow code, any non-deterministic behavior in the plugin (I/O, time, randomness) breaks replay. This is not speculative — it is a Temporal hard constraint.

Correct model: Plugins must only execute within Temporal Activities. Workflow code calls activities; activities can invoke sandboxed plugin code. Workflow code must never directly call plugin sandbox.

Is capability-based security sufficient?
No. The PluginManifest declares capabilities, perms, UI modules but there is no enforcement mechanism described. Who validates that the sandbox cannot exceed declared capabilities at runtime? API surface control in isolated-vm is manual and error-prone without a formal capability verification step. This needs a defined capability enforcement contract, not just a manifest field.

Mixed execution/UI concerns in plugin types
Plugin types include both Nodes (execution) and Panels (UI modules). These have different security profiles. Execution plugins run in a backend sandbox with access to execution context. UI plugins run in a browser renderer. Conflating them in a single PluginManifest model creates a category error. Separate the contracts.

7. What Is Overbuilt
   Nine workflow engine candidates in the architecture diagram. Temporal + Conductor is the stated strategy. BullMQ is a queue, not a workflow engine (no replay, no history, no saga). Argo/Airflow/Prefect/Dagster/Flyte are Python-native. Kestra is JVM. Listing them as "candidates" adds no value and misleads future contributors about the portability guarantee.

Seven observability stack components before core contracts exist. OTel spans should be wired in core adapters now. Prometheus scraping, Grafana dashboards, Loki log aggregation, Jaeger/Tempo traces, ELK — these are operational decisions for when there's something running. Building adapter stubs for all of them before the outbox relay is implemented (P0-11 TODO) is misallocation.

Snowflake cost attribution depth. Pre-run cost estimation from Snowflake heuristics requires production query history. The system has no production query history. This entire sub-system is speculative and will not produce accurate estimates until real data exists. Build post-run attribution first, pre-run estimation later.

D&D lore as normative onboarding material (Annex 20). It's in docs/lore.md and flagged as "a supported artifact" in the Blueprint. The Blueprint's canonical status means lore changes need to reflect in MASTER. This adds maintenance overhead to flavor text.

8. What Is Underbuilt
   Migration strategy for run_events schema evolution. Events are immutable by design, but the schema of the event payload (e.g., RunStarted.v1 → v2) requires migration handling. The dual-read protocol is specified but there is no migration runner, no version-tagged query path in the store, and no tooling (P1-01 TODO). Schema evolution without tooling means manual, error-prone migrations.

Rollback guarantees for partial execution. dbt models execute DDL in Snowflake (CREATE TABLE, CREATE VIEW, MERGE). A run that fails at step 347 of 1000 has already mutated the warehouse. There is no rollback story. The architecture assumes idempotency of dbt runs but does not address the case where a model creates a table on run N and fails on run N+1 after a partial overwrite.

Distributed consistency model between Temporal and Postgres. Temporal has its own internal state store (Cassandra/PostgreSQL). DVT+ also writes to its own Postgres for RunStateStore. If adapter.startRun() succeeds (Temporal workflow created) but bootstrapRunTx fails (DVT+ Postgres write fails), the compensation is adapter.cancelRun(). What happens if cancelRun() also fails? The double-failure recovery path is not documented or tested.

Backpressure strategy. If Temporal task queue is saturated, startRun() will block or fail. The engine has no defined behavior for queue-full scenarios — no circuit breaker (intentionally removed per memory), no rate limiting, no queuing at the DVT+ layer. High-volume tenants can starve other tenants by saturating the worker pool.

Signal versioning. SignalRequest has type: 'PAUSE'|'RESUME'|'CANCEL'|.... P2-02 (extensible/versionable signals) is TODO. When a new signal type is added, in-flight workflows started with an older version of the signal handler will not recognize the new type. The evolution path for signals in long-running Temporal workflows is non-trivial.

Run retention and GDPR delete. P2-01 is TODO. run_events is immutable by design. If a customer requests GDPR deletion of their data, immutable event logs with PII (e.g., triggeredBy user identifiers) create a legal problem. The architecture needs a tenant-scoped deletion strategy that is compatible with immutable event sourcing (cryptographic erasure or tombstone events).

9. Scalability Outlook (3-Year Horizon)
   1000+ tenants, thousands of concurrent runs
   ApiStateSvc becomes the primary bottleneck. It is the read/write hub for everything. Without horizontal sharding by tenantId and explicit read replica routing, this single service will be the failure point for all tenants simultaneously.

Temporal worker pool capacity. P2-03 (capacity planning) is TODO. Temporal workers execute activities. At 1000 concurrent runs with 10 parallel steps each, you need workers to handle 10,000 concurrent activity executions. The current architecture has no defined worker provisioning model. Temporal's task queue model requires explicit worker capacity planning.

Large dbt projects (1000+ nodes)
DAG computation cost is O(nodes + edges). For a 1000-node project with complex upstream/downstream relationships, a full DAG analysis on every run request is expensive. Without plan caching (P0-08 TODO), this becomes a per-request bottleneck. With continueAsNew every N steps, the workflow history stays manageable, but the planning phase compounds the latency.

run_events growth. A 1000-node run with per-step events (NodeStarted, NodeCompleted, NodeFailed) generates 2000-3000 events per run. At 1000 concurrent runs, that is 2M-3M events per run cycle. Without partitioning and archival, run_events becomes unmaintainable in 6-12 months of production operation.

Cross-environment diffs
The DiffView component is in the UI but there is no IDiffService in the architecture. Who computes environment diffs (dev vs prod manifest changes)? This requires diffing two versions of manifest.json — potentially large JSON documents — and rendering the delta. The architecture shows this as a UI concern but the computation must happen server-side. No service owns this.

Cost dashboards
Snowflake cost data latency. WAREHOUSE_METERING_HISTORY has a 3-hour data freshness SLA. The architecture implies near-real-time cost dashboards via CostDash. These are incompatible. Cost data will always lag execution by hours, which must be communicated clearly to users.

Projector gap detection under load
At high event volume, the gap detection policy (Tshort=10s, Tmax=10min) will trigger backfill frequently. Backfill requires a read from RunStateStore for missing sequences. At 1000 concurrent runs, multiple projectors simultaneously triggering backfill creates read amplification on the primary Postgres. This is not analyzed in the Blueprint.

10. Architectural Scorecard
    Dimension Score Justification
    Conceptual clarity 7/10 Core triad (Planner/Engine/State) is clear. ApiStateSvc is a conceptual hole. IPlanner doesn't exist.
    Separation of concerns 5/10 Good in theory. In practice: ApiStateSvc God service, detectStuckRuns still in engine, plugins hooking into workflow code, mixed execution/UI plugin types.
    Replaceability of engine 6/10 ADR-0019 "state-equivalent" is realistic. But no conformance test suite exists. Conductor adapter is stub. Determinism verification only works for Temporal.
    Determinism 6/10 Temporal path is properly specified. Non-Temporal adapters have no replay mechanism. continueAsNew + gateway state is an open bug. CEL boundary with Temporal is unspecified.
    Extensibility 5/10 Plugin system design is promising but sandbox is broken (vm2 EOL), capability enforcement is declarative-only, execution/UI plugin boundary is wrong.
    Operational realism 4/10 14 P0 items TODO. No outbox relay. No plan cache. No IPlanner. No tenantId enforcement. No partitioning. This is a pre-alpha system presented as a working architecture.
    Long-term maintainability 5/10 Event model and ADR governance are solid foundations. But type drift between packages, absent schema migration tooling, God service, and no retention policy will compound over time.
11. Strategic Recommendations
    3 Structural Changes
12. Decompose ApiStateSvc immediately.
    Split into three bounded services:

ArtifactIngestionService (owns dbt artifact parsing and storage)
RunQueryService (owns read model queries, backed by projector output)
LiveUpdateHub (owns WebSocket/SSE, consumes from event bus directly)
Each gets its own interface contract in @dvt/contracts. ApiStateSvc as a single class mediating all of these will not survive production.

2. Define IPlanner before building any planning sub-component.
   The entire planning layer (DAGAnalyzer, CostEstimator, PartialExec, RetryPolicy, EnvResolver) is being designed bottom-up without a stable top-level interface. P0-06 must ship first. The contract must specify: inputs (manifest + selection + environment), outputs (ExecutionPlan + stages + metadata), failure modes (invalid selection, cyclic DAG, missing model), and versioning policy. Only then build DAGAnalyzer as the first concrete implementation.

3. Enforce the plugin execution boundary at the contract level.
   The architecture currently allows PluginSandbox → "Execution hooks" → IWorkflowEngine. This must be blocked. The contract for IPluginRuntime must explicitly state: plugins MUST NOT be invoked from workflow code (Temporal or otherwise). Plugins are invoked exclusively within Activities. Separate IExecutionPlugin (backend, Activity-scoped) from IUIPlugin (frontend, renderer-scoped) with distinct sandbox models and capability sets.

3 Clarifications Needed

1. What is the consistency guarantee when Temporal and Postgres diverge?
   Define the double-failure recovery procedure: adapter.startRun() succeeds → bootstrapRunTx fails → adapter.cancelRun() fails. What is the operator runbook? What is the observable state? This must be in an ADR before production.

2. What is the rollback story for partial dbt execution?
   Is idempotency of dbt models assumed (incremental models with --full-refresh on retry)? Is a "clean state" run strategy required before retry? This is domain-critical and must be specified in IPlanner's failure contract and in the retry policy semantics.

3. What does "plan cache hit" mean for security?
   If tenantA and tenantB both have the same manifest SHA-256 and same selection, do they share a cached plan? Plans may contain environment-specific variables (secrets references, warehouse names). Cache key must include tenantId at minimum. The plan cache design (P0-08) must address this.

3 Things to Freeze Immediately

1. Freeze the event envelope schema. RunEventEnvelope.v1 as specified in Blueprint §8.1 is correct and complete. Do not add fields without an ADR. The envelope is the protocol boundary between subsystems — instability here breaks outbox, projectors, and consumers simultaneously.

2. Freeze the bootstrapRunTx + adapter-first sequencing invariants. ADR-0013/0014 invariants are correct and tested. Any proposal to change the ordering of adapter.startRun() relative to bootstrapRunTx must be rejected unless the proposer can demonstrate why the compensation path (adapter.cancelRun() on tx failure) is incorrect.

3. Freeze the cancellation event ownership (ADR-0007). Engine emits RunCancelRequested (intent). Adapter emits RunCancelled (terminal). This is correct and well-specified. Any shortcut that has the engine synthesize RunCancelled without adapter confirmation must be rejected — it violates the fundamental separation between request and confirmation in async systems.

3 Things to Delay

1. Delay Conductor adapter implementation. Do not write a line of Conductor adapter code until the Temporal adapter is stable, the conformance test suite exists, and at least one production run completes end-to-end. Building two engine adapters in parallel before either is validated doubles the specification surface and the maintenance burden.

2. Delay cost estimation (pre-run). Post-run attribution is feasible with real Snowflake query data. Pre-run estimation requires production history you don't have. Build the attribution pipeline first. Estimation can be added later as a heuristic layer once you understand real query cost patterns.

3. Delay UI plugin injection. The IUIHost contract, UI plugin sandboxing, and plugin panel rendering are non-trivial to build securely. They depend on a stable plugin capability model that does not yet exist. Build the execution plugin path (backend Activities) first. UI extensibility is a phase-3 concern.

Summary judgment: The architectural intent is sound and the ADR discipline is above average for a system at this maturity. The core triad principle is defensible and, if enforced, produces a maintainable system. However, the gap between architecture documentation and implemented reality is wide: 14 P0 items are TODO, the God service risk in ApiStateSvc is unaddressed, the plugin isolation model is broken, and tenantId scoping is a live security defect. The system is not production-ready by a significant margin. Prioritize: (1) outbox relay, (2) IPlanner spec + DAGAnalyzer MVP, (3) ApiStateSvc decomposition, (4) tenantId enforcement, (5) isolated-vm PoC — in that order.
