Mapa de cobertura por sección del spec
✅ Completado (~Sprint 1 + extras)
Sección spec Componente Estado Desviación
§2 Architectural Stance Hexagonal, DDD, CQRS, Event-sourced ✅ Completo —
§4 Core Principles (10) Todos los invariantes ✅ Completo —
§5–6 Hexagonal/C4 model Todos los ports definidos ✅ Completo —
§7 Domain model ExecutionPlan, RunMetadata, RunEvent, value objects ✅ Completo healthCheck y lookupRunRef extra en impl
§8.1 IWorkflowEngine startRun, cancelRun, getRunStatus, enrichRunStatus, signal ✅ Completo + healthCheck (extensión ok)
§8.2 IRunStateStore bootstrapRunTx, appendAndEnqueueTx, listEvents, listRuns, getSnapshot ✅ Completo —
§8.3 IProviderAdapter startRun, cancelRun, signal, getRunStatus, capabilities ✅ Completo + lookupRunRef (extensión ADR-0030)
§9 ExecutionPlan planId, planVersion, schemaVersion, uri, sha256, requiresCapabilities, steps ✅ v1.1.0 Añade contractVersion, plannerVersion, plannerGitSha
§10 Run Identity tenantId, projectId, environmentId, runId, logicalAttemptId ✅ Completo —
§11 Start-run lifecycle Intent → Adapter → bootstrapRunTx → markResolved ✅ Completo + ADR-0030 Intent reconciler añadido (mejora)
§12 Run Event Model 8 run-events + 4 step-events + envelope completo ✅ Completo —
§13 State Machine QUEUED→RUNNING→PAUSED/CANCEL_REQUESTED→CANCELLED/COMPLETED/FAILED ✅ Completo —
§14 Ordering (runSeq) Monotónico, autoritativo ✅ Completo —
§15 Idempotency (runId, idempotencyKey) boundary ✅ Completo —
§16 Retry Semantics logicalAttemptId business retry vs Temporal infra retry ✅ Completo —
§17 Status Read Model getRunStatus (no adapter call) / enrichRunStatus (opt-in) ✅ Completo ADR-0015 —
§18 Snapshot model SnapshotProjector, null→replay fallback ✅ Completo —
§19 Outbox model atomicidad, DLQ, rate-limiting, OutboxWorker ✅ Completo + extras Token bucket rate limiter añadido
§20 Authz (IAuthorizer) IAuthorizer interface ✅ Interface ⚠️ Solo AllowAllAuthorizer
§22 Testing (Sprint 1 scope) Engine, state store, idempotency, intent, outbox ✅ 78 tests green Replay/determinism pendiente
⚠️ Parcial
Sección spec Componente Estado Gap
§20 Authz real OIDC/JWT/tenancy enforcement 20% AllowAll es el único impl
§22 Adapter tests No duplicate events on retry, crash-recovery 60% Temporal smoke tests existen, falta failure injection
§23 Sprint 2 — dbt runner stepActivities.ts existe 40% Step result mapping + failure/retry mapping incompleto
§23 Sprint 2 — Audit hook Placeholder exists 30% Sin envelope de auditoría formal
❌ No implementado
Sección spec Componente Coste estimado
§3 Artifacts context / §25 IArtifactStore Interface + implementación 2–3 semanas
§20 Production Authorizer OIDC / JWT / tenant-scoped 2–3 semanas
§21 Plugin runtime Sandbox, capability model, deny-by-default 4–6 semanas
§23 Sprint 4 — SSE/WS streaming Status updates en tiempo real 2 semanas
§23 Sprint 4 — Replay certification suite Determinism + failure injection 1 semana
§23 Sprint 4 — Snapshot rebuild tooling Operational maintenance 1 semana
§23 Sprint 2 — Parser→Graph pipeline UX lineage / runtime overlay 4–6 semanas (fuera scope engine)
§24 ADRs nuevos recomendados 10 ADRs pendientes de los propuestos 1–2 semanas (docs)
CLI Comando completo (dvt run, dvt status, etc.) 1–2 semanas
Conductor Adapter Solo stub 6–8 semanas
Porcentaje de desarrollo por capa
Capa % Notas
Engine Core (contratos, lifecycle, eventos) 95% Production-ready
State Store (Postgres + InMemory) 85% Falta snapshot rebuild tooling
Temporal Adapter 75% Step result mapping incompleto
Observability (IObservability + OTel real) 80% No dashboards ni métricas de cola
Idempotencia y ordering 95% Completo
Security / AuthZ 20% Solo AllowAll
Outbox 80% Rate limiting ok; delivery lag metrics faltan
Artifact Store 5% Solo tipos en artifacts.ts
Testing (scope Sprint 1) 85% Replay/determinism certification pendiente
SSE/WS Streaming 0% —
Plugin runtime 0% —
CLI 10% Stub mínimo
Conductor Adapter 5% Stub
Overall: ~62–65% del spec completo
El núcleo ejecutable (engine + state + Temporal + observability) está entre 80–95%. La brecha está en las capas de productización.

Coste de adopción hacia producción
Alta prioridad / bloquea producción
Item Esfuerzo Sprint spec
Real IAuthorizer (OIDC/JWT) ~2–3 semanas Sprint 3
IArtifactStore + implementación básica ~2–3 semanas Sprint 2
dbt step activity → result mapping completo ~1–2 semanas Sprint 2
Tenant isolation E2E tests ~1 semana Sprint 3
Media prioridad / habilita extensibilidad
Item Esfuerzo Sprint spec
SSE/WS streaming para status ~2 semanas Sprint 4
Replay + failure injection tests ~1 semana Sprint 4
Snapshot rebuild tooling ~1 semana Sprint 4
ADRs recomendados (10) ~1–2 semanas ongoing
Baja prioridad / roadmap
Item Esfuerzo Sprint spec
Plugin runtime sandbox ~4–6 semanas Sprint 4
Conductor Adapter ~6–8 semanas post-MVP
Parser→Graph pipeline (UX) ~4–6 semanas Sprint 2–3
CLI completo ~1–2 semanas —
Conclusión
El spec y el código están muy alineados en el dominio nuclear. Los 10 principios de ejecución (§4), el modelo de eventos (§12), la máquina de estados (§13), idempotencia (§15), retry semántico (§16) y la separación status/enrichment (§17) están fielmente implementados y testeados.

Las dos desviaciones reales son:

AuthZ — el spec §20 exige enforcement real antes de producción; hoy solo hay AllowAll con un guard de entorno
ArtifactStore — mencionado en §3/§25, no existe la interface ni el storage
El camino crítico para ir a producción es: AuthZ real → ArtifactStore → dbt step mapping → tenant isolation E2E. Eso representa ~6–9 semanas de trabajo focalizado en el core antes de abordar streaming y plugin runtime.
