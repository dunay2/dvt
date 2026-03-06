Informe Revisado: DVT+ God Diagram — Análisis Extensivo y Recomendaciones
Fecha: 2026-03-05

Corrección vs informe anterior: Planner subestimado (~30% → ~75%), UI Layer no es 0%, API Layer tiene servidor funcional. El overall sube de ~55% a ~68%.

1. Estado real por capa
   1.1 State Platform — 90% (sin cambios)
   Lo que existe: PostgresStateStoreAdapter, InMemoryRunStateStore, IStartRunIntentStore + Postgres implementation, IOutboxStorage + DLQ + TokenBucketRateLimiter, SnapshotProjector, OutboxWorker.

Lo que falta:

Snapshot rebuild tooling operacional
dvt_outbox_delivery_lag_ms no se mide
listEvents paginada existe pero ningún consumer la usa end-to-end
Recomendación: SnapshotRebuildService antes de producción. Esfuerzo: 3–5 días.

1.2 Domain Core — Engine — 90% (sin cambios)
Lo que existe: WorkflowEngine completo con todos los métodos normativos + detectStuckRuns, RunMaintenanceService, PlanRefPolicy, planIntegrity, IdempotencyKeyBuilder.

Lo que falta: IRetryPolicy para business reruns. logicalAttemptId hardcoded a 1.

Recomendación: Definir IRetryPolicy port antes de Sprint 3. Esfuerzo: 1 semana.

1.3 Domain Core — Planner — 75% (era 30% — subestimado)
Lo que existe en packages/@dvt/planner/:

GraphBuilder.ts — construye y valida el DAG, detecta duplicados, valida dependsOn references, enforces maxNodes/maxEdges
TopoSort.ts — topological sort del DAG
Depth.ts — análisis de profundidad
Planner.ts — lógica principal de planificación
stepFactory/ — dbtStepFactory, StepFactory — generación de steps
manifest.ts — parsing de dbt manifest
hashing.ts — content-addressing de planes
policies.ts, limits.ts, metrics.ts, sorting.ts — políticas y validaciones
IExecutionPlanner.v2 + ExecutionPlan.v2
compiledCode adapters: InMemoryCompiledCodeStorage, FileSystemCompiledCodeStorage, S3CompiledCodeStorage, MinioCompiledCodeStorage, NoopCompiledCodeStorage
Y en paquetes relacionados:

@dvt/plan-interpreter — dagAnalyzer.ts, tipos de interpretación
@dvt/plan-verifier — verificación criptográfica, planVersion.ts, verify.ts
@dvt/dsl — ast.ts, parser.ts, evaluator.ts (DSL para condiciones de gateway / selección dinámica)
@dvt/canonical — JCS + SHA256 para hashing determinístico
@dvt/planner-contracts — PlannerInputStep, PlannerInputEnvelope
Lo que falta:

Parser de run_results.json y catalog.json (solo manifest.json confirmado)
Conexión formal entre @dvt/planner y el engine via PlanRef en un flujo integrado
Tests del planner (no confirmados)
Recomendación: El planner tiene masa crítica. El gap principal es la integración end-to-end con el engine a través del ArtifactStore. Ver sección 1.6.

1.4 Execution Adapters — 70% (sin cambios)
Lo que existe: TemporalAdapter completo, RunPlanWorkflow determinístico, stepActivities.ts, TemporalClientManager, TemporalWorkerHost.

Lo que falta: mapping estructurado de resultado dbt → StepCompleted/StepFailed(reason), StepSkipped emission, normalización de RunSubstatus.

Recomendación: Definir DbtExecutionResult type y mapear salidas de dbt CLI. Esfuerzo: 1–2 semanas.

1.5 Observability — 60% (+5%)
Lo que existe: IObservability + OtelObservability real, ObservabilityContext, cardinalityPolicy. El intentReconcilerRuntime.ts de la API ya emite métricas (counter, histogram, gauge) — lo que confirma que el port se está usando en la capa de infra.

Lo que falta: puntos de instrumentación sistemáticos en WorkflowEngine.ts (las 5 métricas de run/step), warehouse_cost, audit envelope formal, dashboards.

Recomendación: Instrumentar WorkflowEngine.ts siguiendo el mismo patrón de intentReconcilerRuntime.ts que ya existe. Esfuerzo: 2–3 días (el patrón está establecido).

1.6 Artifact System — 55% (era 10% — subestimado)
Lo que existe:

compiledCode adapters en @dvt/planner: S3CompiledCodeStorage, MinioCompiledCodeStorage, FileSystemCompiledCodeStorage, InMemoryCompiledCodeStorage — esto es la base del ArtifactStore para planes
manifest.ts en el planner — parsing de dbt manifest
@dvt/plan-verifier — verificación criptográfica de planes
hashing.ts — content-addressing
Lo que falta:

IArtifactStore como port formal en el hexagonal diagram (los compiledCode adapters son internos al planner, no un port del dominio)
Parser de run_results.json (resultados de ejecución) y catalog.json
Conexión entre el compiledCode storage y el engine (el engine recibe PlanRef pero no sabe cómo resolverlo a bytes — ese es el adapter)
Recomendación: Elevar los compiledCode adapters a un IArtifactStore port formal que el engine pueda referenciar como parte del hexagonal boundary. El código ya existe, falta el contrato y el wiring. Esfuerzo: 1 semana (refactor + port definition).

1.7 API Layer — 35% (era 15% — subestimado)
Lo que existe en apps/api/:

Fastify 5 server con estructura completa: app.ts, server.ts, plugins (env, logger, observability)
db/pool.ts — PostgreSQL connection pool
Endpoints: GET /health, GET /db-ready, GET /version
intentReconcilerRuntime.ts — background worker con métricas, backoff exponencial, configuración via env vars
OTel integration completa, Pino logging
@dvt/engine y @dvt/adapter-postgres como dependencias declaradas — el engine está importado
Lo que falta:

Endpoints de dominio: POST /runs, GET /runs/:runId, DELETE /runs/:runId (cancel), POST /runs/:runId/signal
AuthMiddleware / JWT validation
Tenant context injection en requests
Tests de los endpoints de dominio (solo app.test.ts y observability.test.ts existen)
Recomendación: El servidor existe y el engine está importado. Añadir las 4 rutas de dominio sobre el WorkflowEngine existente es el paso más cercano a tener una API funcional. Sin AuthZ real, exponer solo en red interna. Esfuerzo: 1 semana para las rutas + 2–3 semanas para AuthZ completo.

1.8 UI Layer — 30% (era 0% — completamente incorrecto)
Lo que existe en apps/web/:

React 18 + Vite + TailwindCSS + React Router 7
@xyflow/react (React Flow) + dagre — visualización de DAGs interactiva
recharts — gráficos de coste
@tanstack/react-query — server state
Zustand — estado global
Vistas implementadas (con mock data):

Canvas.tsx — visualización de DAG / grafo de modelos dbt
RunsView.tsx — historial de runs + detalle por runId
ArtifactsView.tsx — artifacts de build
DiffView.tsx — diff de planes/runs
LineageView.tsx — lineage a nivel de modelo y columna con search y pin-to-canvas
CostView.tsx — análisis de costes con recharts
PluginsView.tsx — gestión de extensiones
AdminView.tsx — administración
Componentes:

GraphCanvas.tsx — canvas principal de React Flow
DbtNodeComponent.tsx — nodo dbt en el grafo
InspectorPanel.tsx, LeftNavigation.tsx, TopAppBar.tsx
55+ componentes shadcn/ui
Lo que falta:

Conexión a la API real — todo funciona con mockData.ts y mockDbtData.ts
Cero tests en el frontend
SSE/WS para updates en tiempo real (actualmente estático)
AuthZ / sesión de usuario
Recomendación: La UI tiene forma completa. El paso crítico es conectar RunsView y Canvas a los endpoints reales de la API. Hacerlo incrementalmente: primero GET /runs y GET /runs/:runId, luego POST /runs. Esfuerzo: 2–3 semanas (después de tener los endpoints API).

1. Desvíos respecto al God Diagram — revisados
   Desvío Original Realidad Impacto
   IArtifactStore como port formal ❌ en hexagonal diagram compiledCode adapters existen internos al planner Bajo — refactor de wiring
   ArtifactStore → ObjectStorage Diagrama lo muestra S3/MinIO adapters existen ✅ Existe, falta exposición como port
   Planner → ArtifactStore Diagrama correcto Planner tiene compiledCode adapters ✅ Sustancialmente implementado
   GraphBuilder en UI Diagrama muestra UI separado Planner tiene GraphBuilder.ts (dominio); UI tiene GraphCanvas.tsx ✅ Ambos existen
   Projector → UIRead: streaming Diagrama lo muestra No existe SSE/WS Gap real
   Auth → Planner/Engine API con AuthZ API server existe, AuthZ no Gap real
   Snowflake → Cost En observability subgraph CostView.tsx existe con mock data UI existe, backend no
   EventLog → Audit Audit hooks formales Eventos son el trail; no hay IAuditSink Gap medio
   startRun(plan) Diagrama original startRun(planRef, context) — corregido Corregido en doc
2. Porcentaje de desarrollo revisado
   Capa % anterior % real Notas
   State Platform 90% 90% —
   Engine Core 90% 90% —
   Planner (domain + graph + storage) 30% 75% GraphBuilder, TopoSort, Planner.ts, compiledCode adapters
   plan-interpreter + plan-verifier + dsl — 60% Paquetes no detectados antes
   Execution Adapters (Temporal) 70% 70% dbt result mapping pendiente
   Observability 55% 60% Pattern en uso en API
   Artifact System 10% 55% compiledCode adapters + manifest.ts
   API Layer 15% 35% Fastify server + worker, faltan engine routes
   UI Layer 0% 30% Todas las vistas con mock data
   CQRS write path 75% 90% —
   CQRS read surface (API→UI) 0% 15% Vistas existen, no conectadas
   Hexagonal ports 65% 70% IArtifactStore falta como port formal
   Tests (engine) 85% 85% —
   Tests (API) — 20% Solo health/observability
   Tests (web) — 0% Cero tests en frontend
   Overall: ~68% (era ~55%)
3. Riesgos revisados
   Riesgo Severidad Probabilidad Mitigación
   AuthZ real ausente — API + engine sin enforcement Alta Alta en producción JwtAuthorizer antes de exponer endpoints
   UI desconectada de API — riesgo de drift de contrato Alta Certeza actual Conectar RunsView a API en Sprint 2
   Sin tests en frontend — regresiones invisibles Media Alta Añadir Vitest + Testing Library mínimo
   IArtifactStore no es port formal — planner no reemplazable Media Media Elevar compiledCode a port con interface
   dbt error mapping informal — RunFailed sin reason Media Alta DbtExecutionResult type + mapper
   Sin métricas en WorkflowEngine — inobservable Media Alta 5 calls de instrumentación, patrón ya existe
   Snapshot rebuild ausente — incidents manuales Alta Media SnapshotRebuildService
   Cero endpoints de dominio en API — nada es callable Alta Certeza actual 4 rutas sobre engine existente
4. Recomendaciones ordenadas por impacto / esfuerzo
   Prioridad 1 — Baja esfuerzo, alto impacto inmediato
   A. Instrumentar WorkflowEngine con métricas

El patrón ya existe en intentReconcilerRuntime.ts. Copiar y adaptar.
5 métricas: dvt_run_started_total, dvt_run_duration_ms, dvt_run_failed_total, dvt_step_duration_ms, dvt_outbox_delivery_lag_ms
Esfuerzo: 2–3 días
B. SnapshotRebuildService

Iterar listRuns, listEvents, proyectar, guardar snapshot
Esfuerzo: 3–5 días
C. Elevar compiledCode adapters a IArtifactStore port

Define el interface en @dvt/contracts, wiring en engine/planner
Cierra el último hueco del hexagonal diagram
Esfuerzo: 4–5 días
Prioridad 2 — Desbloquea el loop planner→engine→API→UI
D. 4 endpoints de dominio en apps/api

POST /runs, GET /runs/:runId, DELETE /runs/:runId, POST /runs/:runId/signal
El engine ya está importado en el API package. Es wiring.
Esfuerzo: 1 semana
E. JwtAuthorizer real

IAuthorizer implementation que valide JWT claims con tenantId scope
Prerequisito para exponer la API externamente
Esfuerzo: 2–3 semanas
F. Conectar RunsView y GraphCanvas a API real

Reemplazar mockData.ts con @tanstack/react-query calls a /runs y /runs/:runId
Prerequisito D
Esfuerzo: 1–2 semanas (después de D)
G. dbt step result mapping

DbtExecutionResult type + mapper en stepActivities.ts
Esfuerzo: 1–2 semanas
Prioridad 3 — Cierra el modelo de dominio
H. IRetryPolicy port

Esfuerzo: 1 semana
I. Tests para apps/web

Vitest + Testing Library para las vistas críticas
Esfuerzo: 1–2 semanas
J. SSE/WS streaming

Real-time status updates desde Projector → UI
Prerequisito D + F
Esfuerzo: 2 semanas
K. Parser run_results.json + catalog.json

Completar el planner para ingerir resultados de ejecución
Esfuerzo: 1–2 semanas
Prioridad 4 — Post-MVP
L. Plugin runtime sandbox — Esfuerzo: 4–6 semanas

M. Conductor Adapter — Esfuerzo: 6–8 semanas

N. warehouse_cost desde Snowflake query history — Esfuerzo: 2–3 semanas

O. Replay/determinism certification suite — Esfuerzo: 1 semana

1. Secuencia recomendada de sprints (revisada)

Sprint actual
├── A: Instrumentar métricas WorkflowEngine [2-3 días]
├── B: SnapshotRebuildService [3-5 días]
└── C: IArtifactStore port formal [4-5 días]

Sprint 2
├── D: 4 endpoints dominio en apps/api [1 sem]
├── E: JwtAuthorizer real [2-3 sem]
└── G: dbt step result mapping [1-2 sem]

Sprint 3
├── F: Conectar UI a API real (sobre D) [1-2 sem]
├── H: IRetryPolicy port [1 sem]
├── I: Tests frontend mínimos [1-2 sem]
└── Tenant isolation E2E tests [1 sem]

Sprint 4
├── J: SSE/WS streaming (sobre D+F) [2 sem]
├── K: Parser run_results + catalog [1-2 sem]
└── O: Replay certification suite [1 sem]

Post-MVP
├── L: Plugin runtime sandbox [4-6 sem]
├── M: Conductor adapter [6-8 sem]
└── N: warehouse_cost [2-3 sem] 7. Correcciones al informe anterior
Afirmación anterior Realidad
"UI Layer: 0% — no existe" UI Layer: 30% — React app completa con 8 vistas, mock data
"API Layer: 15% — solo interface IAuthorizer" API Layer: 35% — Fastify server, worker, OTel, faltan engine routes
"Planner: 30% — solo interface" Planner: 75% — GraphBuilder, TopoSort, Planner.ts, stepFactory, compiledCode adapters completos
"IArtifactStore no existe en absoluto" compiledCode adapters (S3/MinIO/FS) existen en el planner — falta port formal
"GraphBuilder no existe" GraphBuilder.ts existe en @dvt/planner/src/domain/graph/
"Métricas no se usan" intentReconcilerRuntime.ts ya usa el pattern en la API
"Overall ~55%" Overall ~68% 8. Conclusión
El sistema está más avanzado de lo que el God Diagram original comunicaba. Las tres correcciones más importantes al análisis anterior: el planner es sustancialmente real (no un stub), la UI tiene forma completa aunque desconectada, y la API tiene servidor y worker aunque sin endpoints de dominio.

El gap principal no es de diseño arquitectural — es de wiring: el engine existe, el API server existe, la UI existe, pero los tres no están conectados todavía. Las 4 rutas de dominio en la API y la sustitución de mock data en la UI son los dos pasos que más aceleran el progreso visible.

El riesgo más crítico sigue siendo AuthZ real: construir el wiring engine↔API↔UI sin enforcement de tenancy es deuda de seguridad que escala mal. La secuencia correcta es AuthZ primero, rutas después.
