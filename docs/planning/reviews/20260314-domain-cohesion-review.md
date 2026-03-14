---
title: 20260314 Domain Cohesion Review
status: Approved
owner: docs
last_reviewed: 2026-03-14
planning_type: review
---

# 20260314 Domain Cohesion Review

## Scope

Review focused on the current high-impact execution path:

- `packages/@dvt/engine/src/core/WorkflowEngine.ts`
- `packages/@dvt/engine/src/core/SnapshotProjector.ts`
- `packages/@dvt/engine/src/services/RunMaintenanceService.ts`
- `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts`
- `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts`
- `apps/api/src/app.ts`
- `apps/api/src/application/services/startRunAuthorizedFacade.ts`
- `apps/api/src/application/ports/auth.ts`
- `apps/api/src/entrypoints/http/startRunRoute.ts`

This is not a full-repo review. The purpose is to identify current problems of cohesion,
domain ownership, missing aggregate boundaries, coupling, SRP/SOLID violations, complex
functions, DDD gaps, and missing negative-path coverage.

## Findings By Priority

### P1. No existe un aggregate root claro para `Run`; las invariantes estan repartidas entre engine, projector y activities

**Evidence**

- `WorkflowEngine.startRun()` decide bootstrap, intent log, compensacion, emision de
  `RunQueued` y `RunFailed` en `packages/@dvt/engine/src/core/WorkflowEngine.ts:167-227`
  y `packages/@dvt/engine/src/core/WorkflowEngine.ts:311-343`.
- `SnapshotProjector.applyRunEvent()` contiene reglas de transicion de estado del run y
  de los steps en `packages/@dvt/engine/src/core/SnapshotProjector.ts:50-154`.
- Las activities de Temporal siguen emitiendo eventos del mismo stream por otro camino en
  `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:189-229`.
- Las activities tambien intentan bootstrap de metadatos de forma defensiva en
  `packages/@dvt/adapter-temporal/src/activities/stepActivities.ts:232-248`.

**Why this matters**

El agregado de negocio real es el `Run`, pero hoy no tiene un owner unico. La politica de
creacion vive en el engine, las invariantes de transicion viven en el projector, y parte de
la escritura del stream vive en las activities. Eso deja la semantica del agregado
fragmentada.

Esto no es solo un problema estetico:

- obliga a tocar varios sitios para cambiar una sola regla de lifecycle
- dificulta razonar sobre orden y atomicidad
- mezcla reglas de dominio con mecanismos de proyeccion
- debilita la idea de aggregate root propia de DDD

**Impact**

Alta probabilidad de regresiones al extender lifecycle, retries o reconciliacion. Cada nueva
transicion o evento requiere coordinar al menos tres owners lógicos.

**Recommendation**

Extraer un `RunLifecycle` o `RunAggregate` explicito que sea el owner de:

- decisiones de transicion validas
- eventos de dominio permitidos
- bootstrap / compensacion del lifecycle

Las activities deberian limitarse a informar hechos tecnicos o resultados de ejecucion, no a
redefinir ownership del agregado.

### P1. `WorkflowEngine` sigue siendo un god service y mezcla dominio, aplicacion e infraestructura

**Evidence**

- `packages/@dvt/engine/src/core/WorkflowEngine.ts` tiene 851 lineas.
- El constructor depende de `stateStore`, `projector`, `idempotency`, `clock`,
  `authorizer`, `planRefPolicy`, `intentStore`, `adapters`, `observability` y varias
  opciones en `packages/@dvt/engine/src/core/WorkflowEngine.ts:53-82`.
- La misma clase hace start/cancel/status/enrich/signal/health, timeouts,
  validacion de dependencias, telemetria, compensaciones e intent-log reconciliation hooks
  en `packages/@dvt/engine/src/core/WorkflowEngine.ts:105-706`.

**Why this matters**

La clase ya no tiene una responsabilidad unica. Mezcla:

- reglas de dominio de lifecycle
- coordinacion de casos de uso
- adaptacion a infraestructura
- observabilidad
- health reporting
- policy enforcement

Esto viola SRP y hace mas dificil aplicar Open/Closed. Cada feature nueva tiende a entrar en
esta clase porque ya es el centro de todo.

**Impact**

El coste de cambio es alto. La superficie de pruebas unitarias tambien crece de forma
desproporcionada porque un mismo servicio concentra muchas ramas y dependencias.

**Recommendation**

Separar al menos estas responsabilidades:

- `StartRunCoordinator`
- `RunStatusReader`
- `RunSignalService`
- `EngineHealthReporter`

El `WorkflowEngine` deberia quedar como facade delgada o incluso desaparecer a favor de casos
de uso explicitos.

### P1. El camino pre-bootstrap deja un invariante abierto: `providerRunId` puede quedar persistido con un valor aproximado

**Evidence**

- `TemporalAdapter.estimateRunRef()` devuelve un `runId` estimado basado en el caller en
  `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:84-97`.
- `TemporalAdapter.startRun()` cambia al `firstExecutionRunId` real si Temporal lo devuelve
  en `packages/@dvt/adapter-temporal/src/TemporalAdapter.ts:119-130`.
- `WorkflowEngine` construye `RunMetadata` con el ref estimado antes de `startRun()` y
  despues no reconcilia el `providerRunId` persistido en
  `packages/@dvt/engine/src/core/WorkflowEngine.ts:182-203` y
  `packages/@dvt/engine/src/core/WorkflowEngine.ts:762-787`.

**Why this matters**

El sistema queda con una metadata parcialmente correcta: `workflowId`, `namespace` y
`taskQueue` pueden ser estables, pero `providerRunId` puede no representar la ejecucion real.
Eso deteriora trazabilidad, correlacion operativa y diagnostico.

**Missing negative-path coverage**

La suite cubre el orden del pre-bootstrap y el fallo despues de bootstrap en
`packages/@dvt/engine/test/core/WorkflowEngine.test.ts:313-383`, pero no encontre una prueba
que cubra el caso no happy path donde `estimateRunRef().runId !== startRun().runId`.

**Recommendation**

Decidir uno de estos caminos y hacerlo explicito:

1. persistir `requestedRunId` y `providerExecutionRunId` como campos distintos
2. introducir una actualizacion post-dispatch de metadata
3. declarar formalmente que `providerRunId` es aproximado para providers con execution id tardio

Ahora mismo esta ambiguo y el codigo favorece drift silencioso.

### P2. `buildApp()` hace demasiado y acopla la API al runtime concreto

**Evidence**

- `apps/api/src/app.ts` tiene 234 lineas.
- `buildApp()` carga env, crea observabilidad, registra hooks HTTP, decide si hay rutas
  protegidas, abre pool PG, construye auth, importa engine/adapters dinamicamente, registra
  Temporal, define migraciones `onReady`, registra rutas runtime y admin, y gestiona `onClose`
  en `apps/api/src/app.ts:46-233`.

**Why this matters**

El composition root ya no es solo composition root. Tambien contiene politica de despliegue,
bootstrap operacional y detalles de infraestructura concreta. Esto genera un acoplamiento muy
alto entre API, auth, storage y providers.

**Impact**

- la extension a nuevos providers o nuevas rutas obliga a tocar `buildApp()`
- los fallos de bootstrap quedan concentrados en un solo metodo grande
- las pruebas se vuelven frágiles y basadas en monkey-patching de prototipos

**Missing negative-path coverage**

`apps/api/test/app.test.ts:11-91` solo cubre:

- health happy path
- migracion happy path
- `DATABASE_URL` ausente con OIDC habilitado

No encontre cobertura para:

- fallo de `TemporalClientManager.close()`
- fallo de migraciones parciales
- ramas `TEMPORAL_ADDRESS` habilitadas
- fallos de imports dinamicos

**Recommendation**

Extraer al menos:

- `buildProtectedRuntimeModule()`
- `registerOperationalHooks()`
- `buildProviderAdapters()`

`buildApp()` deberia quedarse en orquestacion de alto nivel, no en wiring detallado.

### P2. El contrato compartido de provider adapter no refleja lo que el engine usa de verdad

**Evidence**

- El contrato local de engine añade `ping`, `capabilities`, `estimateRunRef` y `lookupRunRef`
  en `packages/@dvt/engine/src/adapters/IProviderAdapter.ts:21-75`.
- El contrato publicado en `@dvt/contracts` solo declara `startRun`, `cancelRun`,
  `getRunStatus`, `signal` y `estimateRunRef` en
  `packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts:18-31`.

**Why this matters**

Hay una divergencia real entre el contrato “estable” y el contrato que el runtime necesita.
Eso rompe sustituibilidad y hace que parte del comportamiento sea “extraoficial”.

Ejemplos:

- el reconciler depende de `lookupRunRef`
- `healthCheck()` depende de `ping`
- la validacion de capacidades depende de `capabilities`

Nada de eso pertenece hoy al contrato publicado.

**Impact**

Agregar un nuevo provider no es solo implementar la interfaz compartida. Tambien hay que saber
que extensiones privadas espera el engine. Eso es coupling oculto.

**Recommendation**

Formalizar una de estas dos opciones:

1. un `IProviderAdapterVNext` canonico que incluya estas capacidades
2. interfaces segregadas (`IHealthCheckableProvider`, `ICapabilityAwareProvider`,
   `IIntentReconcilableProvider`)

Lo que no conviene es seguir con una interfaz publica y otra real.

### P2. La API endurece detalles de infraestructura en su boundary de aplicacion

**Evidence**

- `StartRunCommand` fija `targetAdapter` a `'temporal' | 'mock'` en
  `apps/api/src/application/ports/auth.ts:57-62`.
- `startRunRoute` duplica ese catalogo en `parseTargetAdapter()` en
  `apps/api/src/entrypoints/http/startRunRoute.ts:83-91`.
- `StartRunAuthorizedFacade` hace branching por `error.name === 'AdapterNotRegisteredError'`
  en `apps/api/src/application/services/startRunAuthorizedFacade.ts:40-47`.

**Why this matters**

La capa API conoce demasiado sobre providers concretos. Eso mete detalles de infraestructura en
el boundary de aplicacion y obliga a tocar rutas, puertos y mapping de errores cada vez que
entra un provider nuevo.

Tambien es una señal de falta de Open/Closed: el catalogo de adapters no esta modelado como
dato o capacidad, sino como union hardcodeada.

**Missing negative-path coverage**

`apps/api/test/application/services/startRunAuthorizedFacade.test.ts:54-127` cubre:

- accepted
- adapter not configured
- error inesperado

No encontre tests para dos ramas negativas importantes que existen en produccion:

- `unauthenticated` (`apps/api/src/application/services/startRunAuthorizedFacade.ts:26-29`)
- `unauthorized` (`apps/api/src/application/services/startRunAuthorizedFacade.ts:31-38`)

**Recommendation**

Mover el catalogo de providers y sus capacidades a un puerto dedicado o a configuracion
inyectable, y evitar branching por `error.name` en la fachada.

### P3. `SnapshotProjector` no es completamente puro porque hace I/O directo por `console.warn`

**Evidence**

- `handleUnknownEvent()` escribe a consola en
  `packages/@dvt/engine/src/core/SnapshotProjector.ts:156-163`.

**Why this matters**

El archivo se documenta como transformacion pura, pero en la rama de unknown events introduce
un side effect de infraestructura. Eso degrada cohesión y hace que observabilidad y dominio se
mezclen de forma implícita.

**Impact**

- logging inconsistente respecto al resto del sistema, que usa `IObservability`
- tests menos deterministas si alguna suite decide interceptar consola
- mayor dificultad para reutilizar el projector en procesos batch o tooling

**Recommendation**

Mantener `applyRunEvent()` totalmente puro y mover el warning al caller o a una capa de
observabilidad que envuelva la reconstruccion.

## Overall Assessment

El repo no va “hacia atras” en arquitectura base, pero sigue teniendo dos deudas de diseño muy
centrales:

1. el agregado `Run` no tiene ownership unico
2. `WorkflowEngine` y `buildApp()` siguen cargando demasiada responsabilidad

El riesgo principal no es que el sistema no funcione hoy; es que cada nueva capacidad de
execution, retry, provider o reconciliacion siga entrando en los mismos puntos calientes y
aumente el acoplamiento.

## Recommended Next Moves

1. Diseñar explicitamente el owner del agregado `Run` antes de seguir expandiendo lifecycle.
2. Resolver la semantica de `providerRunId` en pre-bootstrap.
3. Extraer el wiring runtime de `buildApp()` en módulos mas pequeños y testeables.
4. Formalizar el contrato real de `IProviderAdapter`.
5. Añadir tests negativos para `StartRunAuthorizedFacade` y para el mismatch entre
   `estimateRunRef` y `startRun`.
