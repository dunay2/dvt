# Temporal / Engine Antipatrones (calidad + eficiencia)

Fecha: 2026-02-14
Ámbito revisado: `packages/adapter-temporal` + selección de provider en engine.

## Hallazgos priorizados

### 1) Reconstrucción completa de estado en cada query (O(n) por consulta)

- Evidencia: [`TemporalAdapter.getRunStatus()`](packages/adapter-temporal/src/TemporalAdapter.ts:88) carga todos los eventos con [`stateStore.listEvents()`](packages/adapter-temporal/src/TemporalAdapter.ts:90) y recalcula snapshot completo con [`projector.rebuild()`](packages/adapter-temporal/src/TemporalAdapter.ts:91).
- Riesgo: en runs largos, polling frecuente degrada latencia y costo CPU (N consultas × N eventos).
- Severidad: **Alta**.
- Recomendación:
  - Leer snapshot materializado del store (si existe) en lugar de replay completo.
  - Si no existe snapshot, añadir cache incremental por `runSeq` para replay parcial.

### 2) Semántica de attempts fija en 1 (riesgo de idempotencia incorrecta)

- Evidencia: en [`emitEvent()`](packages/adapter-temporal/src/activities/stepActivities.ts:87) se fija [`engineAttemptId: 1`](packages/adapter-temporal/src/activities/stepActivities.ts:98) y [`logicalAttemptId: 1`](packages/adapter-temporal/src/activities/stepActivities.ts:99), y también en [`runEventKey()`](packages/adapter-temporal/src/activities/stepActivities.ts:100).
- Riesgo: colisiones semánticas entre reintentos reales y eventos de primer intento; métricas y debugging menos fiables.
- Severidad: **Alta**.
- Recomendación:
  - Propagar `attempt` real desde workflow/activity context.
  - Incluir `attempt` en el envelope y en la generación de idempotency key según contrato.

### 3) `cancelRun()` vs `signal('cancel')`: doble vía de cancelación sin contrato único

- Evidencia: [`cancelRun()`](packages/adapter-temporal/src/TemporalAdapter.ts:83) usa cancelación nativa Temporal (`handle.cancel()`), mientras [`signal()`](packages/adapter-temporal/src/TemporalAdapter.ts:94) para `CANCEL` emite [`workflow.signal('cancel', ...)`](packages/adapter-temporal/src/TemporalAdapter.ts:106).
- Riesgo: caminos de terminación distintos pueden producir diferencias de eventos finales (`RunCancelled`, cleanup, handlers).
- Severidad: **Media-Alta**.
- Recomendación:
  - Definir una sola ruta canónica (señal + transición explícita, o cancel nativo + traducción consistente) y testear paridad.

### 4) Acoplamiento fuerte a string literals de workflow/signal

- Evidencia: [`workflowClient.start('runPlanWorkflow', ...)`](packages/adapter-temporal/src/TemporalAdapter.ts:64), señales por string [`'pause'`](packages/adapter-temporal/src/TemporalAdapter.ts:100), [`'resume'`](packages/adapter-temporal/src/TemporalAdapter.ts:103), [`'cancel'`](packages/adapter-temporal/src/TemporalAdapter.ts:106).
- Riesgo: renombrados silenciosos rompen runtime sin cobertura de tipos extremo-a-extremo.
- Severidad: **Media**.
- Recomendación:
  - Exportar constantes compartidas (workflow name + signal names) desde un módulo único tipado.

### 5) `validateStepShape()` crea `Set` en cada invocación

- Evidencia: [`validateStepShape()`](packages/adapter-temporal/src/activities/stepActivities.ts:158) instancia `new Set(...)` por paso.
- Riesgo: overhead pequeño pero repetitivo en planes grandes.
- Severidad: **Baja**.
- Recomendación:
  - Elevar `Set` a constante módulo (`const ALLOWED_STEP_FIELDS = ...`).

### 6) Test de integración con polling activo y sleeps fijos

- Evidencia: loops con [`setTimeout(..., 25)`](packages/adapter-temporal/test/integration.time-skipping.test.ts:218) y [`setTimeout(..., 25)`](packages/adapter-temporal/test/integration.time-skipping.test.ts:228).
- Riesgo: flakiness y duración variable en CI (aunque exista time-skipping environment).
- Severidad: **Media**.
- Recomendación:
  - Esperar condiciones/eventos de forma determinística (query + backoff controlado o util helper con timeout declarativo).

### 7) `require.resolve()` en host con entorno ESM/TS puede ser frágil

- Evidencia: [`workflowsPath: ... require.resolve('./workflows/RunPlanWorkflow')`](packages/adapter-temporal/src/TemporalWorkerHost.ts:43).
- Riesgo: fragilidad entre CJS/ESM/bundling y rutas compiladas.
- Severidad: **Media**.
- Recomendación:
  - Resolver ruta de workflows con estrategia explícita por entorno build/test y cobertura de smoke test empaquetado.

## Plan sugerido de remediación (orden)

1. Corregir attempts/idempotencia (Hallazgo 2).
2. Unificar estrategia de cancelación (Hallazgo 3).
3. Reducir costo de `getRunStatus` (Hallazgo 1).
4. Eliminar fragilidad de strings/rutas (Hallazgos 4 y 7).
5. Limpieza de micro-eficiencia y estabilidad de tests (Hallazgos 5 y 6).

## Revisión adicional: conformidad con documento de planificación y SDK Temporal

### 8) Configuración declarada pero no aplicada al cliente SDK

- Evidencia: [`loadTemporalAdapterConfig()`](packages/adapter-temporal/src/config.ts:18) y [`TemporalAdapterConfig`](packages/adapter-temporal/src/config.ts:1) exponen `connectTimeoutMs` y `requestTimeoutMs`, pero [`TemporalClientManager.connect()`](packages/adapter-temporal/src/TemporalClient.ts:19) crea [`Connection.connect(...)`](packages/adapter-temporal/src/TemporalClient.ts:24) sin usar esos campos.
- Riesgo: falsa sensación de hardening/timeout controlado; comportamiento real no alineado con la intención operativa documentada.
- Severidad: **Media-Alta**.
- Recomendación:
  - Conectar esos valores al cliente/connection options reales del SDK, o eliminar campos hasta tener implementación efectiva.

### 9) Contrato duplicado del adapter (riesgo de deriva con engine)

- Evidencia: [`TemporalAdapter`](packages/adapter-temporal/src/TemporalAdapter.ts:53) implementa [`IProviderAdapterLike`](packages/adapter-temporal/src/TemporalAdapter.ts:37) local en vez de usar directamente el contrato canónico [`IProviderAdapter`](packages/engine/src/adapters/IProviderAdapter.ts:9).
- Riesgo: divergencia silenciosa entre paquetes y pérdida de garantías de compatibilidad binaria/tipada a medida que evoluciona engine.
- Severidad: **Media**.
- Recomendación:
  - Reutilizar el contrato canónico exportado por engine/contracts compartidos para evitar interfaces "parecidas" pero no idénticas.

### 10) Brecha entre Issue #15 (DAG/parallel/continue-as-new) y alcance implementado

- Evidencia:
  - La issue original exige DAG walker/ramas paralelas/`continueAsNew` (ver descripción de `#15`).
  - La implementación actual en [`runPlanWorkflow()`](packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:90) recorre pasos secuenciales con `for` en [`plan.steps`](packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:143).
- Riesgo: cierre prematuro de tracking con alcance funcional parcial respecto al enunciado histórico; genera deuda de trazabilidad.
- Severidad: **Media**.
- Recomendación:
  - Mantener explícito en tracker que MVP actual es secuencial y abrir sub-issues de paridad funcional (DAG paralelo + continue-as-new).

### 11) Test de integración valida estados amplios (aceptación débil)

- Evidencia: assertions permisivas en [`integration.time-skipping.test.ts`](packages/adapter-temporal/test/integration.time-skipping.test.ts:222) y [`integration.time-skipping.test.ts`](packages/adapter-temporal/test/integration.time-skipping.test.ts:232) aceptan múltiples estados terminales/no terminales.
- Riesgo: test verde con regresiones funcionales reales (señal de calidad insuficiente para CI de gate).
- Severidad: **Media**.
- Recomendación:
  - Definir expectativas más determinísticas por escenario (caso happy path separado de cancel path, con asserts de secuencia de eventos).

## Matriz rápida de alineación

- Determinismo workflow: **Alineado** (sin APIs no deterministas visibles en [`RunPlanWorkflow.ts`](packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts:1)).
- Separación de side-effects en activities: **Alineado parcial** (estructura correcta en [`createActivities()`](packages/adapter-temporal/src/activities/stepActivities.ts:56), pero con gaps de attempts/idempotencia real).
- Tracking PR-6 (CI/docs): **Alineado** con estado "pendiente de cierre"; workflow CI ya incluye integración en [`test.yml`](.github/workflows/test.yml:37), falta normalización final del tracker canónico #68.
