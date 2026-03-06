Aquí el informe actualizado, ahora contra el handbook corregido:

DVT+ Architecture Handbook — Informe de alineación (post-actualización)
Fecha: 2026-03-05

Handbook versión: actualizada hoy

Base de comparación: código real auditado en sesión anterior

Mapa de cobertura por sección
✅ Completado y alineado
Sección Componente Estado código Notas
§2 Hexagonal Architecture Ports y adapters ✅ WorkflowEngine, IRunStateStore, IProviderAdapter
§3 DDD — Execution BC WorkflowEngine, lifecycle ✅
§3 DDD — State BC IRunStateStore, Postgres, InMemory ✅
§3 Aggregate root (Run) Event log + RunMetadata + snapshot ✅ Corregido en handbook
§3 Value objects PlanRef, EngineRunRef, RunContext, SignalRequest, RunStatusSnapshot ✅
§5 Component diagram IProviderAdapter, IStartRunIntentStore, IOutboxStorage, SnapshotProjector, IAuthorizer, PlanRefPolicy, IObservability ✅ Corregido en handbook
§6 Execution lifecycle startRun(planRef, context), intent → adapter → bootstrapRunTx, event-sourced async ✅ Corregido en handbook
§7 State model — 12 eventos RunQueued/Started/CancelRequested/Cancelled/Paused/Resumed/Completed/Failed + 4 step events ✅ Corregido en handbook
§7 State machine QUEUED→RUNNING→PAUSED/CANCEL_REQUESTED→terminal ✅
§7 Event envelope eventId, runSeq, logicalAttemptId, idempotencyKey, persistedAt... ✅
§8 Observability (IObservability + OTel) OtelObservability real, NoopObservability para tests ✅
§10 Storage tenant isolation Postgres scoped por tenantId (ADR-0031) ✅
§11 Testing — Domain 78+ tests green, ~85–90% ✅
§12 Failure handling Temporal retry, OutboxWorker, RunCancellation, intent reconciliation ADR-0030 ✅
§14 Roadmap Sprint 1 Engine + State + Intent log + OTel ✅
§15 ADRs clave ADR-0012/0013/0014/0015/0030/0031 ✅ 26+ ADRs en repo
⚠️ Parcialmente implementado
Sección Componente % Gap concreto
§3 DDD — Planner BC IExecutionPlanner.v2 existe 30% Solo interface; no hay implementación real del planner
§3 DDD — Platform BC IObservability ✅, IAuthorizer ⚠️ 60% Solo AllowAllAuthorizer; no OIDC/JWT
§6 dbt runner stepActivities.ts existe 40% Step result mapping y failure/retry mapping incompletos
§8 Metrics run_duration, step_duration probablemente en OTel 50% warehouse_cost y queue_latency no implementados
§10 IAuthorizer Interface + AllowAll 25% No hay implementación real; guard de entorno solamente
§11 Testing — Adapters Temporal smoke + Postgres smoke 60% Failure injection, crash-recovery, duplicate-event-on-retry ausentes
§14 Roadmap Sprint 2 dbt runner partial 15% ArtifactStore no existe
§17 dbt execution stepActivities parcial 40% —
§17 Multi-tenant isolation Storage ✅, authz ❌ 50% —
❌ No implementado
Sección Componente Notas
§3 DDD — Artifacts BC IArtifactStore, ArtifactId Solo types/artifacts.ts existe como tipos
§3 DDD — UX BC Graph representation, lineage Fuera del scope del engine
§9 Artifact ingestion pipeline Parser → GraphBuilder → Planner Cero implementación
§10 AuthMiddleware / API layer TenantValidation, API No existe capa API
§11 Testing — API (70% target) — No hay API que testear
§11 Testing — E2E — —
§11 Replay/determinism certification — Planificado Sprint 4
§13 Plugin runtime Sandbox, capability model —
§14 Roadmap Sprint 3 Lineage UI, production authz —
§14 Roadmap Sprint 4 Plugin runtime, replay certification —
§17 lineage visualization — Fuera scope engine
§17 artifact inspection — Depende de ArtifactStore
§17 cost tracking warehouse_cost metric Requiere Snowflake query history
Porcentaje de desarrollo por sección del handbook
Sección % Tendencia
§2 Hexagonal Architecture 95% estable
§3 DDD — Execution BC 95% estable
§3 DDD — State BC 85% falta snapshot rebuild tooling
§3 DDD — Planner BC 30% solo interface
§3 DDD — Artifacts BC 5% tipos únicamente
§3 DDD — Platform BC 60% observability ✅, authz ⚠️
§5 Component diagram (implementación) 85% todo existe excepto ArtifactStore
§6 Execution lifecycle 80% dbt step mapping incompleto
§7 State model completo 95%
§8 Observability 70% warehouse_cost y queue_latency pendientes
§9 Artifact ingestion pipeline 5% ExecutionPlan existe, nada más
§10 Multi-tenant security 45% storage ok, authz real falta
§11 Testing 60% domain ok, adapters parcial, API/E2E ausente
§12 Failure handling 75% dbt error mapping formal pendiente
§13 Plugin architecture 0% —
§14 Roadmap Sprint 1: 100% / Sprint 2: 15% / Sprint 3: 0% / Sprint 4: 0%
§17 Expected capabilities 3/7 operativas workflow ✅, observability ✅, dbt ⚠️
Overall handbook: ~58%
El núcleo ejecutable (engine + Temporal + Postgres + OTel) está entre 80–95%. La brecha real está en Artifacts, AuthZ real, y las capas superiores (API, UI, plugins).

Coste de adopción hacia producción (ordenado por prioridad)
Bloquea producción
Item Esfuerzo Sprint
Real IAuthorizer (OIDC/JWT + tenant enforcement) 2–3 sem Sprint 3
IArtifactStore + implementación básica 2–3 sem Sprint 2
dbt step activity → result/failure mapping completo 1–2 sem Sprint 2
Tenant isolation E2E tests 1 sem Sprint 3
Habilita extensibilidad
Item Esfuerzo Sprint
SSE/WS streaming para status updates 2 sem Sprint 4
Replay + failure injection tests 1 sem Sprint 4
Snapshot rebuild tooling 1 sem Sprint 4
API layer (endpoints + AuthMiddleware) 3–4 sem Sprint 2–3
Roadmap largo plazo
Item Esfuerzo Sprint
Artifact ingestion pipeline (Parser → GraphBuilder) 4–6 sem Sprint 2–3
Plugin runtime sandbox (deny-by-default) 4–6 sem Sprint 4
Lineage UI / Graph representation 4–6 sem Sprint 3
warehouse_cost desde Snowflake query history 2–3 sem Sprint 3–4
Conductor Adapter 6–8 sem post-MVP
Resumen ejecutivo
El handbook ahora refleja fielmente el código. Las desviaciones conceptuales previas (aggregate root, signature de startRun, naming de ports, modelo de eventos) están corregidas.

Lo que está sólido: engine core, event sourcing, Temporal adapter, Postgres state store, outbox, observability OTel, idempotencia, ADR coverage. Todo esto está entre el 80–95% y puede considerarse production-ready dentro de su scope.

El camino crítico a producción pasa por cuatro ítems en orden:

AuthZ real — sin esto no es multi-tenant seguro
ArtifactStore — sin esto el planner no tiene backend
dbt step result mapping — sin esto los runs no tienen visibilidad granular
API layer — sin esto no hay superficie de consumo
Eso representa ~8–12 semanas de trabajo focalizado antes de abordar plugins, streaming y lineage.
