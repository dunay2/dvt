# DVT+ Frontend — Technical Specification (V1)

> Objetivo: definir el marco técnico y operativo del frontend DVT+ para implementación incremental, pruebas y trazabilidad de backlog en GitHub.

## 1) Alcance

Este documento define:

- Arquitectura frontend objetivo (capas, estado, contratos y observabilidad).
- Semántica funcional de la experiencia principal (grafo, planificación, ejecución y monitoreo).
- Reglas UX de seguridad y resiliencia (RBAC, estados de red, errores, fallback).
- Base de trazabilidad para backlog de épicas e historias (mismo sistema ya usado en Backlog V2).

No define contratos backend normativos nuevos; referencia y operacionaliza contratos ya existentes.

## 2) Principios de diseño

1. **Contracts-first**: la UI renderiza view-models estables y tipados; no “descubre” estructura en runtime.
2. **Determinismo visible**: el usuario debe entender por qué una acción queda en `RUN / SKIP / PARTIAL`.
3. **Read-only by default en plan**: la planificación es explicable antes de ejecutar.
4. **Resiliencia operativa**: degradación controlada en fallos de red, polling y eventos.
5. **Seguridad por intención**: el frontend refleja RBAC, no lo sustituye.

## 3) Stack acordado

- **UI framework**: React + TypeScript.
- **Canvas DAG**: React Flow.
- **Layout**: ELK/dagre (auto-layout + preservación de nodos fijados).
- **Estado cliente**: Zustand (stores por responsabilidad).
- **Estado servidor**: TanStack Query (cache/polling/invalidation).
- **Telemetría**: OpenTelemetry (eventos UX y trazas de interacción crítica).

## 4) Arquitectura frontend (capas)

### 4.1 Presentation Layer

- Shell principal, navegación lateral, toolbar contextual.
- Vistas: Graph Workspace, Plan Preview, Run Monitor, Diff, Lineage, Cost, Plugins, Admin.

### 4.2 State Layer

- `graphStore`: nodos, edges, layout, selección.
- `planStore`: selección activa, preview de plan, explainability.
- `runMonitorStore`: estado de run, timeline, logs agregados, KPIs de progreso.
- `uiShellStore`: paneles/modales/toasts/shortcuts.

### 4.3 Data Access Layer

- Queries/mutations aisladas por dominio (`graph`, `plan`, `runs`, `cost`, `plugins`, `admin`).
- Invalidación dirigida por claves de consulta.
- Polling configurable + estrategia de backoff en error.

### 4.4 Integration Layer

- Adaptadores REST/event-stream hacia backend.
- Normalización de payloads a view-models frontend.
- Mapeo de errores técnicos a errores UX (reintento, degradado, bloqueo).

## 5) Mapa de vistas obligatorias

## 5.1 Graph Workspace (DAG)

- Render de nodos/edges y metadatos críticos.
- Selección de subgrafo/target.
- Modo principal: análisis y preparación.
- Soporte de zoom, fit, mini-map y foco contextual.

## 5.2 Plan Preview (Read-only)

- Vista de acciones (`RUN`, `SKIP`, `PARTIAL`) por nodo.
- Explainability legible por usuario técnico.
- Sin ejecución directa implícita al editar selección.

## 5.3 Run Monitor

- Progreso global y por step.
- Timeline de eventos con correlación de run.
- Estados transitorios y terminales consistentes con contratos engine.

## 5.4 Diff View

- Comparación entre versión/estado anterior y actual del grafo o plan.
- Realce de cambios relevantes para decisión de ejecución.

## 5.5 Lineage View

- Navegación upstream/downstream.
- Impact analysis básico visual.

## 5.6 Cost View

- Snapshot de coste estimado/observado.
- Señales de guardrails y recomendaciones.

## 5.7 Plugins View

- Catálogo de plugins, estado de carga, compatibilidad y versión.
- Superficie de error segura para plugins no válidos.

## 5.8 Admin View

- Configuración operativa y estado de integraciones.
- Exposición restringida por RBAC.

## 6) Reglas de estado y sincronización

### 6.1 Separación de estado

- Estado de interacción local en Zustand.
- Estado remoto/caché en TanStack Query.
- Prohibido acoplar respuesta HTTP cruda dentro de componentes de presentación.

### 6.2 Estrategias de carga

- Skeletons para primera carga de cada vista.
- Revalidación en foco/intervalo sólo en vistas sensibles (monitor/cost).
- Cancelación de requests obsoletos al cambiar de contexto.

### 6.3 Consistencia visual

- Fuente única de verdad por entidad UI.
- Reconciliación explícita al recibir eventos fuera de orden.

## 7) Estados de red, error y fallback

### 7.1 Estados de red obligatorios

- `online`, `degraded`, `offline`, `reconnecting`.
- Banner persistente en estado degradado/offline.

### 7.2 Manejo de errores UX

- Error recuperable: toast + acción de retry.
- Error no recuperable: panel de bloqueo con diagnóstico mínimo.
- Timeouts: feedback explícito + opción de refresco parcial.

### 7.3 Políticas de retry

- Exponencial con jitter para polling.
- Límite de intentos por operación crítica.
- Circuit-break visual en servicios inestables.

## 8) Seguridad y RBAC (frontend)

- RBAC definido por backend; frontend aplica visibilidad/habilitación coherente.
- Patrones permitidos: `hide`, `disable`, `read-only` según permiso retornado.
- Nunca renderizar datos sensibles si backend no autoriza payload.
- Eventos auditables para acciones administrativas/privilegiadas.

## 9) Accesibilidad y calidad UX

- Navegación por teclado en canvas, paneles y modales.
- Gestión estricta de foco al abrir/cerrar overlays.
- Etiquetado ARIA en componentes interactivos críticos.
- Contraste, tamaños de click targets y feedback no exclusivamente cromático.

## 10) Observabilidad frontend

- Telemetría de interacción: abrir plan, aplicar filtros, iniciar monitor, error de plugin.
- Métricas mínimas:
  - TTFMP (first meaningful paint de workspace)
  - Latencia de carga de plan preview
  - Error rate por vista
  - Tiempo de recuperación en reconexión

## 11) Criterios de aceptación globales

1. El usuario puede recorrer Graph Workspace → Plan Preview → Run Monitor sin pérdida de contexto.
2. Las acciones de plan son explicables y coherentes con backend.
3. RBAC limita correctamente visibilidad/acción en vistas sensibles.
4. La UI degrada de forma controlada ante fallos de red o servicios parciales.
5. Existe trazabilidad directa entre este spec y backlog frontend (épicas/historias).

## 12) Dependencias y referencias internas

- `docs/architecture/frontend/INDEX.md`
- `docs/architecture/frontend/contracts/UI_API_CONTRACT.v1.md`
- `docs/architecture/frontend/contracts/VIEW_MODELS.v1.md`
- `docs/architecture/engine/contracts/engine/RunEvents.v1.1.md`
- `docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md`

## 13) Estado del documento

- Estado: Draft operativo.
- Uso: base para backlog frontend + ejecución GitHub.
- Última actualización: 2026-02-15.
