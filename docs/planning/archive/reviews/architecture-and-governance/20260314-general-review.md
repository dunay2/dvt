---
title: 20260314 Review
status: Historical
owner: docs
last_reviewed: 2026-03-14
planning_type: review
---

# 20260314 Review

Update 2026-03-14 (post-review):

- `SnapshotProjector` ahora rechaza reescrituras sobre estados terminales con
  `InvalidStateTransitionError`; la cobertura esta en
  `packages/@dvt/engine/test/core/SnapshotProjector.transitions.test.ts`.
- `WorkflowEngine.startRun()` ahora soporta un camino pre-bootstrap para
  adapters con `estimateRunRef`, reduciendo la ventana del dual-producer race
  al comprometer `RunQueued` antes de `adapter.startRun()`.
- Residual abierto: si el provider solo conoce el execution-level run id
  despues de arrancar (por ejemplo Temporal `firstExecutionRunId`), la
  reconciliacion del provider run id aproximado sigue pendiente.

DVT+ Deep Architectural Review
Basado en código fuente real: packages/@dvt/_, apps/_, y documentación normativa en docs/architecture/. Fecha del código: 2026-03-13.

1. Conceptual Soundness
   Lo que es sólido
   El contrato IWorkflowEngine es mínimo y correcto. Cinco métodos. Nada más. startRun, cancelRun, getRunStatus, enrichRunStatus, signal. El split ADR-0015 entre getRunStatus (event-log-only) y enrichRunStatus (adapter call) es una de las mejores decisiones del sistema: el estado observable no depende de la disponibilidad del proveedor. Esto es arquitectura correcta.

El modelo de separación Planner/Engine/State existe realmente en código, no solo en diagramas:

El Planner nunca toca IRunStateStore.
El WorkflowEngine nunca toca dbt manifests.
El SnapshotProjector es puro (sin I/O).
PostgresStateStoreAdapter no conoce planner ni engine.
La separación es estructuralmente honesta.

La gestión de idempotencia en el outbox es deliberada. La fórmula SHA256(runId|stepId|logicalAttemptId|eventType|planId|planVersion) + comportamiento de "return existing" en duplicados es correcto para reintentos distribuidos.

PlanRef como transporte (no el plan completo) es la decisión correcta para Temporal (límites de payload). El adapter hace fetchPlan como activity con sha256 de integridad. Esto mantiene el workflow determinístico y el engine fuera del problema de almacenamiento de planes.

Lo que es frágil
~~stepTypeConfig: Record<string, unknown> es un contrato roto disfrazado de extensibilidad.~~ **[CERRADO 2026-03-14 — G9]** `stepTypeConfig` ahora tiene contrato tipado. `DbtStepTypeConfig` en `@dvt/contracts` define la forma exacta que el planner escribe. `DbtStepTypeConfigSchema` (Zod, `.strict()`) valida en el boundary del adapter-temporal. `IStepTypeRegistry` / `StepTypeRegistry` permiten registrar schemas por kind con fail-open para kinds desconocidos. `dbtStepFactory` retorna `DbtStepTypeConfig` en lugar de `Record<string, unknown>`. Los guards manuales en `workflowHelpers.ts` (`isCompiledCodeRef`, `isSha256Hex`, etc.) fueron reemplazados por `DbtStepTypeConfigSchema.safeParse`. 93/93 tests en adapter-temporal pasan.

El WorkflowEngine tiene 11 dependencias constructor (stateStore, outbox, projector, idempotency, clock, authorizer, planRefPolicy, intentStore, adapters, outboxRateLimiter, observability). Esto es una señal de God Object en construcción. Cada feature nueva agrega una dep más. La inyección es correcta, pero la superficie de ensamblaje en apps/api/src/app.ts ya es frágil: si falta un adaptador, no hay un punto de fallo explícito hasta runtime.

El split de responsabilidad de escritura de eventos es confuso. RunQueued es escrito directamente por WorkflowEngine (via bootstrapRunTx). RunStarted, StepStarted, StepCompleted, etc. son escritos por activities del adapter vía emitEvent. Hay dos productores de eventos para el mismo stream. El outbox no garantiza orden entre estos dos caminos si hay latencia. Un RunStarted de una activity puede llegar al outbox antes de que RunQueued haya sido proyectado en el snapshot. El projector usa runSeq para ordenar (correcto), pero el snapshot puede estar temporalmente incoherente si el consumer lee entre los dos writes.

enrichRunStatus no tiene circuit breaker en el engine. El doc dice "circuit breaking is the infrastructure layer's responsibility." Pero la infraestructura no tiene implementación de circuit breaker visible en código. Si Temporal está degradado, todas las llamadas enrichRunStatus bloquean hasta timeout. El engine llama al adapter con withTimeout, pero no hay fallback ni estado de degradación.

Lo que falta
No hay modelo de retención de eventos. El append-only store crece para siempre. No hay política de archival, compaction, ni expiración. R5 está en el risk log pero sin mitigación implementada.
No hay validación de transiciones de estado del projector. applyRunEvent aplica cualquier evento recibido sin verificar si la transición es legal desde el estado actual. Un RunCompleted después de CANCELLED no es rechazado; simplemente sobreescribe. Esto es un bug de correctness.
~~StepTypeRegistry (G9) no existe.~~ **[CERRADO 2026-03-14]** `IStepTypeRegistry` + `StepTypeRegistry` + `createDefaultStepTypeRegistry` exportados desde `@dvt/contracts`. DBT_MODEL, DBT_TEST, DBT_SNAPSHOT registrados con `DbtStepTypeConfigSchema`. Fail-open para kinds desconocidos. Extensible via `createDefaultStepTypeRegistry(extensions?: Map<string, ZodType>)`. `ExecutionStepV2.stepTypeConfig` anotado con referencia al registry (tipo permanece `Record<string, unknown>` por extensibilidad). `ExecutionStepV2Schema` en `schemas.ts` anotado como genérico-por-diseño, con delegación al registry para validación por kind. `Planner.ts` cablea `IStepTypeRegistry` en constructor (`PlannerOptions.stepTypeRegistry`) y valida cada step en `validateStepConfigs()` entre el paso 6 (build steps) y paso 7 (assemble), lanzando `PlannerErrorCode.INVALID_STEP_CONFIG` para known kinds con config inválida. 29/29 planner · 32/32 contracts.
El estado de UI es completamente mock. apps/web no tiene un solo endpoint de producción conectado. No hay GET /runs, no hay GET /runs/:id. La separación "UI no ejecuta" es teóricamente correcta pero irrelevante porque la UI no hace nada real aún. 2. Architectural Risk Map
Risk Severidad Probabilidad Por qué Mitigación
~~stepTypeConfig sin contrato causa divergencia adapter/planner~~ **MITIGADO [2026-03-14]** `DbtStepTypeConfig` + `DbtStepTypeConfigSchema` en `@dvt/contracts`. `dbtStepFactory` tipado. `workflowHelpers.ts` usa schema Zod. IStepTypeRegistry extensible. — — —
Conductor parity es ilusoria Alta Muy Alta Conductor no tiene replay determinístico, pause/cancel es eventual, timeout 30s, payload 32KB. El RunPlanWorkflow usa continueAsNew y signals que Conductor no puede mapear sin emulación degradada Redefinir Conductor como "degraded mode" documentado, no parity
Event ordering entre bootstrapRunTx y activity-emitted events Alta Media Dos productores distintos en el mismo event stream; outbox delivery no garantiza consistencia temporal con direct write Separar claramente qué eventos son domain-emitted vs adapter-emitted; o hacer todo pasar por outbox
State explosion sin retention policy Alta Certeza (tiempo) 4 tablas crecen indefinidamente: run_events, run_snapshots, outbox, outbox_dead_letter Implementar retention tiers antes de producción
Plugin runtime a 4% con acceso a execution path Crítica Alta (si se implementa mal) Sin sandbox implementado, un plugin puede romper determinismo del workflow, leer state cross-tenant, o bloquear el event loop No abrir plugin marketplace hasta sandbox implementado y auditado
@dvt/contracts en CJS en monorepo ESM Media Alta (ya ocurrió) Causa fallos de import en Node ESM nativo; ya causó un workaround en app.ts con dynamic imports Migrar @dvt/contracts a ESM output
No hay endpoints de dominio en API Alta Certeza apps/api solo tiene /healthz, /readyz, /version, /db/ready. No hay GET /runs, POST /runs/:id/signal, GET /runs/:id No es riesgo de diseño pero bloquea todo flujo de usuario
enrichRunStatus sin circuit breaker Media Alta Temporal degradado = todas las calls bloqueadas hasta timeout Circuit breaker en el adapter layer o en WorkflowEngine.enrichRunStatus
Idempotency key con concatenación `\\t` Baja Baja-Media Si runId contiene `
Temporal executeStep es Phase 2 stub Alta Certeza stepActivities.ts:108 marca real dispatch como Phase 2. El workflow corre pero no ejecuta pasos reales Bloqueante para MVP real 3. Engine Abstraction Critique
IWorkflowEngine — mínimo y correcto
El interface tiene exactamente los métodos necesarios. Ninguno de más. El split getRunStatus/enrichRunStatus es correcto y defensivo.

Lo que podría romperse:

El signal method acepta SignalRequest con type: string. No hay enum en el contrato. Si un consumer envía type: 'RETRY_RUN' que el adapter no implementa, el engine devuelve SignalNotImplementedError. Esto es correcto, pero el API caller necesita conocer qué signals están disponibles por provider. No hay un endpoint de capabilities discovery en el contrato. Esto significa que el UI tiene que hardcodear qué signals están disponibles, lo cual es acoplamiento implícito.

Temporal-first strategy — correcta pero subestimada en profundidad
Temporal fue elegida correctamente. El sistema aprovecha replay determinístico, continueAsNew para historia larga, y signals para pause/resume. Todo esto es implementado.

Lo que nadie dice claramente: la implementación actual tiene executeStep como stub. El workflow llama activities.executeStep(...) que, según el código real, devuelve un resultado dummy. El sistema puede hacer "runs" que son eventos vacíos. Esto no es Temporal-first — es Temporal-scaffolded. Phase 2 es bloqueante para cualquier valor real.

Conductor parity — no es realista
La spec de Conductor (v0.8) dice explícitamente: ⚠️ Determinism strategy OPEN. Y lista los gaps:

No deterministic replay
Pause/cancel es webhook-based (eventual)
No native parallel subworkflows
30s task timeout
32KB output limit
El RunPlanWorkflow usa continueAsNew, condition(), signals, y estado durable vía replay. Nada de esto tiene equivalente en Conductor sin construir una capa de emulación completa encima. La estrategia "Temporal-first, Conductor-next" asume que el adapter boundary es suficientemente estable para absorber estas diferencias. No lo es. continueAsNew con gatewayDecisions y skippedStepIds es estado que vive en Temporal history — no hay equivalente en Conductor sin external storage.

Recomendación dura: documentar Conductor como "degraded execution mode" (sin garantías de pause/resume, sin deterministic retry), no como paridad. O descartar Conductor de Phase 2 y evaluarlo en Phase 3 con requirements claros.

Event model — robusto con un hueco
El modelo de EventEnvelope con runSeq, emittedAt/persistedAt, e idempotency key basado en SHA-256 es correcto. La separación de relojes (producer vs store) es explícita.

El hueco: applyRunEvent en SnapshotProjector no valida transiciones. El handlers map simplemente aplica cada evento al snapshot sin verificar estado previo. Ejemplo: handleRunCompleted setea status = 'COMPLETED' sin importar si el estado actual es CANCELLED. En producción, si hay un bug que emite RunCompleted después de RunCancelled, el snapshot queda corrupto sin error.

1. Execution Planning Layer Analysis
   DAG analyzer — correcto y probado
   El planner tiene determinism tests, load tests (1000 nodos), topoSort, y SHA-256 de planCore. El planId = sha256(JCS(planCore)) es content-addressable. Los fixtures existen. Esto está bien construido.

Partial execution guarantees
La selección selectedNodeIds + includeUpstream + includeDownstream funciona via NodeSelector. El plan resultante contiene solo los steps seleccionados. El problema: una vez el plan existe, no hay mecanismo para "resumir desde step N" si un run falla en medio. El continueAsNew del workflow lleva resumeFromLayerIndex — eso es para historia de Temporal, no para business-level retry. Si un run falla en el step 7 de 50, no hay forma de reiniciar desde step 7 sin construir un nuevo plan con selección parcial. Esto es un gap funcional significativo para cualquier usuario real de dbt.

Retry/backoff policy ownership — ambigua
stepTypeConfig contiene retries: { maxAttempts, backoffMs }. Este blob lo lee el adapter-temporal. Pero el WorkflowEngine también tiene lógica de timeout en withTimeout. Y el planner define las policies en ResolvedPolicies. Hay tres lugares que tocan retry policy: el planner (define), el engine (timeout), y el adapter (executes). No hay un único dueño.

Cost estimator — cero en código
El product vision menciona cost attribution. El código tiene exactamente 0 líneas de cost estimation. No hay ICostEstimator en los contratos. No hay port. No hay service. Mencionarlo en el review de architecture sin implementación es irrelevante.

Plan versioning
planVersion está en PlanCore.metadata pero es un string opaco. No hay semver enforcement, no hay compatibility matrix. El spec dice "backward compatibility ≤3 minor versions" pero no hay código que lo enforza. El schemaVersion viene del PlanRef pero el engine solo parsea/valida que exista, no que sea compatible.

Over-engineered o under-specified?
El PlanAssembler + PlanCore + ExecutionPlanV2 con observability post-hash es razonablemente bien diseñado. El uso de JCS canonicalization para hash determinístico cross-platform es correcto y no es over-engineering.

Under-specified:

No hay versionado de plan schema con migration path real
El campo observability en el plan (post-hash, no afecta planId) es correcto conceptualmente pero es una bolsa de basura si no se enforza su schema
Snowflake coupling: No existe en el planner. Los GraphNodes son agnósticos al target. Ningún tipo Snowflake-específico aparece en @dvt/planner. Esto es correcto.

1. State & Metadata Layer Review
   Postgres — suficiente para Phase 1, insuficiente para escala
   El PostgresStateStoreAdapter usa set_config('dvt.tenant_id', ...) como mecanismo de tenant isolation a nivel de sesión. Esto requiere que cada query pase por la misma conexión con el config seteado. Con un pool de conexiones (pg.Pool), hay un riesgo: si una query se ejecuta en una conexión sin el set_config previo (e.g., conexión nueva del pool), la RLS policy podría fallar o pasar sin tenant filtering. No veo el test de este invariante en el código. El integration test verifica tenant isolation pero no verifica qué pasa si set_config no fue llamado antes de una query en una conexión reciclada.

Write amplification: cada StepStarted escribe en run_events + outbox. Cada StepCompleted lo mismo. Para un plan de 1000 steps: 2000 writes a dos tablas distintas en una transacción cada uno. El outbox worker luego lee y escribe a event_bus + mark delivered. Eso es ~6000 operaciones de I/O por run.

Snowflake para analytics — no implementado
El StateStoreAdapter.md para Snowflake existe como spec, pero no hay código. Comentarlo en un review de architecture del sistema actual es ruido.

Lineage snapshotting — mínimamente viable
StepStartedLineageMapper genera OpenLineage job facets a partir de StepStarted events. El compiledCodeRef se resuelve desde object storage (S3/MinIO). El "fail-open" es correcto (sin compiledCodeRef → sin SqlJobFacet, no error). La validación AJV con golden fixtures existe (G6 cerrado).

El gap: outbox_lineage (G10) no existe. El outbox actual solo tiene IEventBus. No hay un consumer de StepStarted que genere lineage events. El mapper existe como biblioteca sin consumer en producción.

Artifact immutability — correcto en diseño, no enforzado en runtime
INV-CCREF-001 requiere que el SHA-256 sea el digest real del blob. La validación existe en fetchPlan del adapter. Pero si alguien sobreescribe el artifact en S3 con un contenido diferente manteniendo la misma URI, el sistema no detecta esto hasta que el adapter hace fetch. No hay lock ni versioning immutable en el object storage por diseño (depende del bucket policy del operator). Esto es un gap de seguridad documentado (§3.5 del ADR-0032) pero es un riesgo real en multi-tenant.

1. Plugin System Evaluation
   Estado real: 4% de completitud. No existe.
   No hay paquete de plugin runtime bajo packages/@dvt. No hay IPluginRuntime, no hay sandbox, no hay capability registration en código. El PluginsView.tsx en el web app corre contra mock data.

Esto significa que toda discusión de plugin architecture es aspiracional. No puedo evaluar isolation strategy porque no hay strategy implementada.

Lo que sí puedo evaluar es el riesgo de lo que viene:

vm2 está abandonado. Si la elección de sandbox fue vm2, hay que cambiarla ya. La alternativa real es node:vm con contextifiedSandbox + Worker threads en node:worker_threads con IPC estructurado. Cualquier cosa que ejecute código de plugin en el mismo proceso que el engine rompe el determinismo del workflow de Temporal si hay side effects globales (timers, globals).

Capability registration. Si el modelo es que un plugin declara { capabilities: ['read_run_state', 'emit_event'] } y el engine enforza, esto requiere que el engine tenga un ICapabilityGrant por tenant. Sin este contrato en código, los plugins tendrán acceso a lo que el runtime les deje, que sin sandbox es todo.

Can plugins compromise deterministic execution? Yes, trivially. Si un plugin puede ser llamado desde dentro de un Temporal workflow activity, cualquier side effect global (Math.random(), Date.now(), process.env write) rompe el determinismo. Esto solo es seguro si los plugins se ejecutan fuera del workflow, en activities aisladas en worker threads separados. La arquitectura no documenta este boundary.

1. Lo que está Over-built
   La capa de observability tiene 3 paquetes (@dvt/observability, @dvt/observability-otel, @dvt/canonical) con interfaces completas, IObservability, ISpan, ITracer. El WorkflowEngine lo usa extensivamente con withContext, withSpan, logs estructurados, counters, histogramas. El OtelObservability es scaffold/noop al 40%. Se construyó el plomero antes de instalar el agua.

El ADR process con ARC tiers tiene evidencia docs, decision logs, risk registers, canonical doc-code matrices. Para un sistema al 57% de completitud con el plugin runtime a 4%, esto es overhead de governance que no escala con el equipo. Los docs son ricos en estructura y pobres en actualización continua.

El planner tiene requestedBy, requestId, requestedAtIso en el input envelope pero los excluye del hash (volatile). Bien que estén excluidos. Mal que existan en el planner — son concerns de la capa API, no del planner domain. El planner no debería saber quién pidió el plan.

1. Lo que está Under-built
1. Validación de transiciones de estado en el projector. Ninguna. applyRunEvent aplica todo. COMPLETED → FAILED es posible si hay un bug en un producer. Esto necesita una máquina de estados explícita.

1. Los endpoints de dominio en la API. GET /runs, GET /runs/:id, POST /runs/:id/signal, GET /runs (list with tenant scope). Sin estos, el sistema no tiene UI funcional ni integración con CLI. Esto es lo más bloqueante para MVP.

1. Retry business-level (re-run desde step N). El sistema tiene logicalAttemptId en el contrato. Pero no hay un flujo de "re-run failed run from step X" implementado ni especificado. El user tiene que crear un nuevo run con una selección parcial manual. Esto no es acceptable para un workflow engine de producción.

1. Backpressure en el outbox worker. OutboxWorkerRuntime hace polling con un interval configurable. Si el backlog crece (e.g., Temporal emite 1000 events/s y el outbox dispatcher despacha 100/s), no hay mecanismo de backpressure hacia el engine. El worker simplemente atrasa. No hay maxPendingCount que rechace nuevos eventos.

1. Schema evolution para ExecutionPlan. planVersion: '2.3' está hardcodeado como string literal en PlanCore. No hay migration path documentado. Si sale la v2.4, los runs en vuelo con v2.3 plans son orphaned a menos que el adapter soporte ambas versiones. El spec de Temporal dice schemaEvolutionPath en PlanRef, pero el código no lo procesa.

1. Distributed consistency model. El engine hace: (1) write intent, (2) call adapter.startRun, (3) write bootstrapRunTx. Si el proceso muere entre (2) y (3), el IntentReconcilerWorker re-despacha. Pero si (3) falla y la compensación adapter.cancelRun también falla, el estado es: run existe en Temporal, no existe en Postgres. Este caso está documentado como riesgo pero la compensación es best-effort con logging. No hay saga pattern, no hay external saga coordinator.

1. SLA definitions. No existen. No hay IRunSLA, no hay policy de max run duration, no hay alerting por run bloqueado. Si un run queda en RUNNING por 24 horas, nadie lo sabe a menos que operaciones mire los logs.

1. Scalability Outlook (3-Year Horizon)
   1000+ tenants, miles de concurrent runs, 1000+ node dbt projects:

Bottleneck 1 — Postgres como single write authority. Todos los events van a una sola instancia Postgres (schema-per-tenant o shared). El outbox pattern ayuda a desacoplar downstream, pero el append de eventos sigue siendo un hotspot. A 1000 tenants × 100 runs × 100 steps = 10M eventos. Con outbox, esto es 20M writes a Postgres. El runSeq es un contador por runId con transaccional assign — a alta concurrencia, esto serializa writes por run (correcto para ordering), pero no hay sharding de eventos por tenant-run partition.

Bottleneck 2 — El planner para 1000-node dbt projects. El test de 1000 nodos existe y pasa. El topoSort es O(V+E). Pero con selección compleja (upstream + downstream expansion), la graph traversal es cuadrática en el peor caso. En memoria, para un plan de 1000 nodos con alta conectividad, el planner puede tardar segundos. Si el planner corre en la API request path (síncrono), esto es un latency spike. Si corre async, necesita una cola de plan building que no existe.

Bottleneck 3 — Read models inexistentes (G7 Partial). getRunStatus re-proyecta desde eventos. Si un run tiene 1000 steps × 3 events = 3000 eventos, el projector los recorre todos para dar el status. El snapshot en Postgres mitiga esto (si el snapshot está actualizado). Pero el snapshot se actualiza solo cuando el outbox worker despacha. En un run activo con alta frecuencia de eventos, el snapshot puede estar N events atrás. El UI polleando verá stale status.

Bottleneck 4 — Temporal History limits. La especificación dice continueAsNew by layer threshold. El workflow implementa esto. Pero el threshold configurable (0 = disabled) sin un default sensible en producción es peligroso. Si un operador no configura continueAsNewAfterLayerCount, el history puede crecer hasta el límite de Temporal (10MB por defecto) y el workflow termina en error, no en continueAsNew. Esto es un operability gap.

Bottleneck 5 — Cost dashboards (no implementados). A 1000+ tenants con cost attribution, las queries de agregación sobre events por tenant/project/environment en Postgres son escaneos costosos sin las particiones correctas. Esto necesitaría una tabla de facts derivada (o Snowflake como analytic store), lo cual no existe.

Single points of failure:

Postgres: el sistema entero depende de una sola instancia. No hay read replica wiring en el adapter.
Temporal cluster: si cae, todos los runs quedan bloqueados en RUNNING. No hay degraded mode.
Object storage (S3/MinIO): si cae al momento de fetchPlan, el workflow falla. No hay local cache de planes. 10. Architectural Scorecard
Dimensión Score Justificación
Conceptual clarity 7/10 La separación Planner/Engine/State es genuinamente clara en código. Pierde puntos por stepTypeConfig opaco, por el dual-write de eventos, y por el split de ownership confuso entre engine y adapter activities.
Separation of concerns 6/10 El projector en-process, el plugin runtime inexistente, el WorkflowEngine con 11 deps, y el emitEvent en activities que escribe directamente al state store (acoplando el adapter a IRunStateStore) son violaciones concretas.
Replaceability of engine 7/10 IWorkflowEngine es minimal y correcto. Pero el WorkflowEngine concreto tiene dependencias de Postgres y Temporal implícitamente (a través de los tipos concretos pasados como deps). Un reemplazo es posible pero requiere reimplementar toda la lógica de intent + bootstrap + idempotency.
Determinism 8/10 El planner tiene SHA-256 content-addressing y JCS canonicalization. El workflow es determinístico. El projector es puro. Pierde puntos por: (1) no hay validación de transiciones, (2) executeStep es stub, (3) Conductor es inherentemente no-determinístico.
Extensibility 5/10 ~~StepTypeRegistry no existe~~ → **cerrado**. `IStepTypeRegistry` + schemas Zod por kind implementados [2026-03-14]. Sube de 4 a 5. Plugin runtime sigue a 4%. StepKind sigue siendo string (sin enum). La extensibilidad de step types ahora es verificable; la extensibilidad de plugins no.
Operational realism 5/10 Sin retention policy, sin circuit breaker implementado, executeStep como stub, sin SLA definitions, sin alerting model, Temporal continueAsNewAfterLayerCount defaulting to 0 (disabled). Operable en dev, no en producción.
Long-term maintainability 6/10 La base de contratos es sólida. El uso de ADRs y evidence docs es bueno en teoría. Pero el CJS/ESM issue en @dvt/contracts ya causó workarounds en producción. La @dvt/contracts CJS en ESM monorepo es deuda estructural activa.
Media: 6.1/10 → **6.3/10** [actualizado 2026-03-14, G9 cerrado: Extensibility 4→5]. Sistema con fundamentos conceptuales sólidos pero sustancial deuda de implementación y operability.

1. Strategic Recommendations
   3 cambios estructurales inmediatos
1. Migrar @dvt/contracts a ESM output.
   El package más crítico del monorepo es CJS en un ecosistema ESM. Esto ya causó un workaround con dynamic imports en app.ts. Cambiar tsconfig.json de @dvt/contracts a "module": "NodeNext" y agregar extensiones .js a los imports internos. Costo: 1-2 días. Beneficio: elimina una clase entera de bugs de interop que se repetirán cada vez que un nuevo consumidor ESM intente importar @dvt/contracts.

1. ~~Cerrar G9 (StepTypeRegistry) antes de cualquier trabajo de plugin.~~ **✅ HECHO [2026-03-14].** `IStepTypeRegistry`, `DbtStepTypeConfig`, `DbtStepTypeConfigSchema`, `StepTypeRegistry`, `createDefaultStepTypeRegistry` en `@dvt/contracts`. `dbtStepFactory` tipado. Guards manuales en `workflowHelpers.ts` reemplazados por schema Zod. `Planner.ts` valida cada step en build-time con `validateStepConfigs()` usando el registry inyectado; lanza `INVALID_STEP_CONFIG` para known kinds con config inválida. `ExecutionPlan.v2.ts` y `schemas.ts` anotados con referencia al registry. `PlannerErrorCode.INVALID_STEP_CONFIG` añadido. 32/32 contracts · 29/29 planner · 93/93 adapter-temporal. G10 y plugin system ya tienen el prerequisito de step registry satisfecho.

1. Agregar validación de transiciones al SnapshotProjector.
   applyRunEvent necesita una state machine explícita. La tabla de transiciones legales es pequeña (12 event types, 7 estados). Sin esto, eventos mal ordenados o duplicados de fuentes distintas pueden corromper el snapshot silenciosamente. Este es un bug de correctness activo, no deuda futura.

3 clarificaciones necesarias

1. ¿Quién produce RunStarted?
   En el código, el adapter-temporal emite RunStarted vía la activity emitEvent. El WorkflowEngine emite RunQueued vía bootstrapRunTx. Esta split ownership no está documentada como decisión explícita. Si en algún momento el engine necesita emitir RunStarted antes de que Temporal lo confirme, hay un conflicto. Necesita un ADR que diga exactamente qué eventos emite cada layer.

2. ¿Cuál es el modelo de business-level retry (re-run from step N)?
   logicalAttemptId existe en el contrato. Pero no hay un endpoint, un flow, ni un spec que diga cómo un usuario reintenta un run fallido desde el step de falla. ¿Se crea un nuevo plan? ¿Se emite un signal? ¿Se usa continueAsNew? Esto necesita especificarse antes de que cualquier usuario real intente usarlo.

3. ¿Cuál es el modelo de Conductor?
   "Temporal-first, Conductor-next" implica parity. El código y el spec de Conductor dicen explícitamente que no hay parity posible (no replay, no native signals, no pause). Necesita una decisión explícita: ¿es Conductor un degraded mode, o se descarta para Phase 2?

3 cosas a freezear inmediatamente

1. La interface IWorkflowEngine. Está correcta. No agregar métodos. Cualquier nueva operación que se sienta como "debería estar en el engine" es una señal de que pertenece a un service separado. El engine tiene exactamente los 5 métodos correctos.

2. El modelo de idempotency key. La fórmula SHA256(runId|stepId|logicalAttemptId|eventType|planId|planVersion) con return-existing semantics es correcto. No cambiarlo. Cualquier cambio en la fórmula invalida el dedup de eventos históricos.

3. El modelo de PlanRef transport. Plan content no va en el workflow input. PlanRef (uri + sha256) sí. El adapter hace fetchPlan. Esta decisión (ADR-0012) es correcta y no debe reversarse para ningún "optimization" que pase el plan completo por el workflow.

3 cosas a delay

1. Cost attribution hasta tener endpoints de dominio básicos funcionando. No tiene sentido construir cost dashboards cuando GET /runs no existe.

2. Conductor adapter hasta que Phase 1 con Temporal esté en producción real y executeStep no sea un stub. El DRAFT v0.8 de Conductor debe permanecer en DRAFT hasta que el equipo entienda exactamente qué semánticas puede garantizar.

3. El observability stack completo (@dvt/observability-otel al 40% scaffold). Tener las interfaces es suficiente para Phase 1. El wiring completo de OTel con exporters reales es trabajo de plataforma que no debe bloquear el MVP de ejecución. El noopObservability actual es suficiente para dev.
