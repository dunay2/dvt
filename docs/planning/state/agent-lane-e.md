---
title: Agent Lane E - Frontend And UI
status: Active
owner: Product / UX / Frontend
last_reviewed: 2026-03-27
<!-- tasks synced from agent-lane-e.yaml on 2026-03-27 -->
planning_type: status
---

Eres Eva, una ingeniero frontend experta en React, TypeScript y sistemas de diseño, y te identificarás como tal.

## Principios obligatorios

- Arquitectura: componentes de presentación desacoplados de datos
- Contracts-first: nunca asumir shape de API — siempre tipar antes de integrar
- Separación de capas: Views → Services → API Client (nunca fetch directo en un componente)
- Tipado estricto: prohibido `any`
- UX primero: cada feature debe tener estado vacío, estado de carga, estado de error y estado de éxito
- Alineación con backend: coordinar interfaces con los lane owners de A, C y D antes de integrar

## Forma de trabajo

- Contratos antes que implementación:
  1. Definir tipos TypeScript del contrato API
  2. Implementar el servicio/query
  3. Conectar la vista

- Microcommits obligatorios:
  - 1 cambio = 1 commit
  - formato Conventional Commits

## Formato de respuesta (obligatorio)

Siempre responde con:

### 1. Task

Descripción clara del objetivo y la vista o capa afectada

### 2. Plan

Pasos pequeños y secuenciales

### 3. Tipos y Contrato

Interfaces TypeScript relevantes y shape del API

### 4. Implementation

Código mínimo necesario (componente, servicio, query)

### 5. Estados UX

Empty / Loading / Error / Success para la feature

### 6. Commit

Mensaje en formato:
feat(web): descripción

## Reglas de calidad

- Views no consumen mock directamente
- Servicios encapsulan lógica de fetch y error handling
- Queries TanStack Query con invalidación explícita
- Feature flags para views de nivel C (Lineage, Cost, Plugins, Admin)
- Sin CSS inline — usar clases utilitarias o módulos CSS

## Restricciones

- No usar `any`
- No fetch directo en componentes
- No mock en producción (VITE_DATA_SOURCE controla el modo)
- No activar views de nivel C sin feature flag aprobado

## Objetivo

Producir una UI operacional, limpia y alineada con el backend real — no un prototipo extendido.

## Anexo

Al terminar la tarea informarás de posibles campos de mejora detectados: fricción UX, deuda de tipos, desalineación con contratos backend, o cualquier otro aspecto que pueda mejorarse en futuras iteraciones.

# Agent Lane E - Frontend And UI

Unassigned lane for parallel work. Use this file when assigning Agent E.

## Goal

Evolve apps/web from a high-fidelity mock prototype to an operational UI backed by real API contracts.

## Tasks

> Source of truth: `agent-lane-e.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [~] `P0` `F-01`: clean up the shell - remove redundant sidebar headers, keep nav icon-only with tooltips, unify secondary controls into a contextual menu. _(in progress — LeftNavigation icon-only done; TopAppBar contextual menu pending)_
- [x] `P0` `F-02`: implement a typed API client covering the existing health endpoints (healthz, readyz, version, db/ready). _(done — `services/platform/platformClient.ts` + `services/api/createApiClient.ts`)_
- [x] `P0` `F-03`: wire real backend health state into the top bar and a global degraded/offline banner. _(done — `GlobalStatusBanner.tsx` + `usePlatformHealthQuery.ts` polling 15s)_
- [x] `P1` `F-04`: introduce a VITE*DATA_SOURCE=mock|api environment flag and separate data layers so views do not consume mock data directly. *(done — `services/config/dataSource.ts` + `runsService` + `plansService` con factory mock/api)\_
- [~] `P1` `F-05`: decompose the global Zustand store into domain-scoped stores (shellStore, sessionStore, graphStore, runStore, statusStore). _(in progress — `sessionStore.ts` extraído; shellStore/graphStore/runStore/statusStore aún en appStore.ts)_
- [~] `P1` `F-06`: introduce TanStack Query as the data-fetching layer and define query/mutation patterns for health, plan, and run domains. _(in progress — installed + QueryClientProvider configured, `usePlatformHealthQuery` wired; plan/run mutations pending)_
- [~] `P2` `F-07`: define TypeScript interfaces for the Plan Preview and Run Start API contracts so the frontend is ready before backend endpoints land. _(in progress — `types/engine.ts` re-exporta de `@dvt/contracts`; input types completos; respuestas `Run`/`ExecutionPlan` aún son tipos dbt — falta capa de mapeo DTO)_
- [ ] `P2` `F-08`: integrate the Plan -> Run core flow from canvas selection through to run start using real API when available, with a typed adapter for mock when not.
- [ ] `P2` `F-09`: wire RunsView to real GET /runs and GET /runs/:id data - list, detail, and status polling.
- [ ] `P2` `F-10`: implement a run event timeline using GET /runs/:id/events (polling or SSE) and unify the Console with real log output.
- [ ] `P3` `F-11`: wire ArtifactsView and DiffView to real backend data and activate Lineage, Cost, Plugins, and Admin views progressively via feature flags.
- [ ] `P1` `F-12`: define canonical frontend contracts for plugin capabilities including workspace.import, workspace.prepare, plan.preview, run.start, run.observe, artifact.sync, and node.adapt.
- [ ] `P2` `F-13`: implement dbt explorer plugin baseline with source/model/test/exposure navigation plus project import/export and contextual node actions.
- [ ] `P2` `F-14`: deliver dbt plan lifecycle end-to-end with create plan, import existing plan/project state, preview immutable plan, and execute through run.start.
- [ ] `P2` `F-15`: implement Snowflake runtime plugin with two modes with direct task/procedure execution and repository DDL generation for external apply workflows.
- [ ] `P2` `F-16`: persist and expose project deltas with immutable snapshots, timeline messages, and Git linkage to support before/after auditability.

## Dependencies

- F-01, F-02, F-04 are independent and can start in parallel.
- F-03 depends on F-02.
- F-05 depends on F-04.
- F-06 depends on F-05.
- F-07 depends on F-06.
- F-08 depends on F-07 and is blocked until backend delivers POST /plans/preview and POST /runs.
- F-09 depends on F-08 and is blocked until backend delivers GET /runs and GET /runs/:id.
- F-10 depends on F-09 and is blocked until backend delivers GET /runs/:id/events.
- F-11 depends on F-10 and requires artifact and lineage endpoints from backend.
- F-12 depends on F-06 and defines plugin capability contracts for all tool adapters.
- F-13 depends on F-12 and introduces the dbt explorer plugin baseline.
- F-14 depends on F-13 and delivers create/import/execute dbt plan lifecycle.
- F-15 depends on F-12 and introduces Snowflake runtime modes (direct or DDL-to-repo).
- F-16 depends on F-14 and captures deltas/snapshots with Git-linked auditability.
- F-08 through F-11 coordinate with Lane C (admission) and Lane D (scale/GTM) for API surface readiness.

## Expected Outcome

- shell is clean and low-noise
- real backend health state is always visible
- mock and API modes are explicitly separated
- store responsibilities are decomposed by domain
- core flow (Plan -> Run -> Monitor) works with real data
- secondary views activate progressively via feature flags
- dbt plan lifecycle (create, import, execute) is available through typed contracts
- plugin-driven execution supports dbt explorer and Snowflake runtime modes
- project deltas are persisted with snapshots and Git-linked audit history

---

## Changelog

### 2026-03-27

**Completados descubiertos en revisión de código:**

- **F-02 → done**: `services/platform/platformClient.ts` completamente implementado.
  Envuelve `services/api/createApiClient.ts` (base HTTP con session headers).
  Maneja `/healthz` (requerido) + `/readyz`, `/version`, `/db/ready` (opcionales con
  graceful 403/404/405). Tipos completos en `services/platform/types.ts`.

- **F-03 → done**: `components/GlobalStatusBanner.tsx` renderiza ok/degraded/offline
  desde `PlatformHealthSnapshot` real. `TopAppBar.tsx` muestra indicador de conexión
  real. `queries/usePlatformHealthQuery.ts` hace polling cada 15s vía TanStack Query.

**En progreso:**

- **F-01 → in_progress**: `LeftNavigation.tsx` ya es icon-only con tooltips.
  Pendiente: consolidar controles secundarios del TopAppBar (view toggles, grid spacing,
  etc.) en un menú contextual único.

- **F-06 → in_progress**: TanStack Query instalado y `QueryClientProvider` configurado
  en `Root.tsx`. `usePlatformHealthQuery` operativo. Pendiente: queries/mutations para
  dominios plan y run, estrategia de invalidación documentada.

**Documentación mejorada (sin código):**

- `apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md` reescrito (v2): estado actual real,
  alineación de tipos frontend con contratos del engine (`PlanRef`, `RunContext`,
  `RunStatusSnapshot`), estrategia SSE → polling fallback, propagación multi-tenant,
  path `?enriched=true` per ADR-0015, fases de autenticación, topología de lectura
  del backend.

- `apps/web/FRONTEND_SPRINT_PLAN_TASKS_RISKS.md` reescrito (v2): Sprint 1 separado
  en completado/pendiente, criterios de aceptación concretos por tarea, dependencias
  como grafo explícito, métricas con KPI de `?enriched` queries.

**Corrección — gap de tipos parcialmente resuelto:**
El doc de alineación documentaba "tipos frontend vs contratos del engine" como pendiente.
En realidad `types/engine.ts` ya re-exporta de `@dvt/contracts` directamente. El gap
real y restante es más acotado: los tipos de _respuesta_ de `listRuns` (`Run[]`) y
`previewPlan` (`ExecutionPlan`) son tipos dbt frontend, no contratos del engine.
Necesitan una capa de mapeo DTO cuando aterricen los endpoints reales. Registrado en F-07.

**Hallazgos técnicos (bugs / deuda):**

- **Canvas.tsx — anti-pattern crítico**: `(window as any).__pendingConnection` usado para
  pasar estado de drag-and-drop entre handlers de React Flow. Estado global implícito
  fuera de React — puede causar race conditions y es imposible de testear.

- **Canvas.tsx — cycle detection incompleto**: solo verifica el arco inverso inmediato
  (`source === target.source && target === source.source`), no recorre el DAG completo.
  Un ciclo de longitud 3+ no será detectado.

- **Console.tsx — mock logs hardcodeados sin indicación**: muestra logs falsos con
  timestamps reales aunque esté en modo `mock`. No hay badge ni aviso al usuario.
  Riesgo de confusión en demos.

- **appStore.ts — `highlightedNodes` dead state**: campo definido en la interfaz y store
  pero nunca leído en ningún componente. Candidato a eliminar o mover al futuro graphStore.

- **RunsView.tsx — mensaje de error en español**: `"Run no encontrado"` en código
  otherwise en inglés. Inconsistencia de localización.

- **plansService / runsService — DTO mismatch latente**: `previewPlan` retorna
  `ExecutionPlan` (tipo dbt) y `listRuns` retorna `Run[]` (tipo dbt). Cuando el backend
  real responda, la shape será diferente. No hay mapper — la integración romperá
  en tiempo de ejecución sin errores de compilación porque los tipos son `any`-compatible.
