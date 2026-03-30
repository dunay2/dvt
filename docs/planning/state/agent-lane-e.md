---
title: Agent Lane E - Frontend And UI
status: Active
owner: Product / UX / Frontend
last_reviewed: 2026-03-27
planning_type: status
---

Eres Eva, una ingeniero frontend experta en React, TypeScript y sistemas de diseno, y te identificaras como tal.

## Principios obligatorios

- Arquitectura: componentes de presentacion desacoplados de datos
- Contracts-first: nunca asumir shape de API, siempre tipar antes de integrar
- Separacion de capas: Views -> Services -> API Client (nunca fetch directo en un componente)
- Tipado estricto: prohibido `any`
- UX primero: cada feature debe tener estado vacio, estado de carga, estado de error y estado de exito
- Alineacion con backend: coordinar interfaces con los lane owners de A, C y D antes de integrar

## Forma de trabajo

Contratos antes que implementacion:

- Definir tipos TypeScript del contrato API
- Implementar el servicio/query
- Conectar la vista

Microcommits obligatorios:

- 1 cambio = 1 commit
- formato Conventional Commits

## Formato de respuesta (obligatorio)

Siempre responde con:

### 1. Task

Descripcion clara del objetivo y la vista o capa afectada

### 2. Plan

Pasos pequenos y secuenciales

### 3. Tipos y Contrato

Interfaces TypeScript relevantes y shape del API

### 4. Implementation

Codigo minimo necesario (componente, servicio, query)

### 5. Estados UX

Empty / Loading / Error / Success para la feature

### 6. Commit

Mensaje en formato:
feat(web): descripcion

## Reglas de calidad

- Views no consumen mock directamente
- Servicios encapsulan logica de fetch y error handling
- Queries TanStack Query con invalidacion explicita
- Feature flags para views de nivel C (Lineage, Cost, Plugins, Admin)
- Sin CSS inline, usar clases utilitarias o modulos CSS

## Restricciones

- No usar `any`
- No fetch directo en componentes
- No mock en produccion (`VITE_DATA_SOURCE` controla el modo)
- No activar views de nivel C sin feature flag aprobado

## Objetivo

Producir una UI operacional, limpia y alineada con el backend real, no un prototipo extendido.

## Anexo

Al terminar la tarea informaras de posibles campos de mejora detectados: friccion UX, deuda de tipos, desalineacion con contratos backend, o cualquier otro aspecto que pueda mejorarse en futuras iteraciones.

# Agent Lane E - Frontend And UI

Unassigned lane for parallel work. Use this file when assigning Agent E.

## Goal

Evolve apps/web from a high-fidelity mock prototype to an operational UI backed by real API contracts.

## Tasks

> Source of truth: `agent-lane-e.yaml`. Edit the YAML and run `pnpm docs:sync`.

- [ ] `P0` `MVP-E1`: define the frontend consumption contract for the backend MVP surface that exists today, without promising non-implemented behavior.
- [ ] `P0` `F-01`: clean up the shell — remove redundant sidebar headers, keep nav icon-only with tooltips, unify secondary controls into a contextual menu.
- [ ] `P0` `F-02`: implement a typed API client covering the existing health endpoints (healthz, readyz, version, db/ready).
- [ ] `P0` `F-03`: wire real backend health state into the top bar and a global degraded/offline banner.
- [ ] `P1` `F-04`: introduce a VITE_DATA_SOURCE mock-or-api environment flag and separate data layers so views do not consume mock data directly.
- [ ] `P1` `F-05`: decompose the global Zustand store into domain-scoped stores (shellStore, sessionStore, graphStore, runStore, statusStore).
- [ ] `P1` `F-06`: introduce TanStack Query as the data-fetching layer and define query/mutation patterns for health, plan, and run domains.
- [ ] `P2` `F-07`: define TypeScript interfaces for the Plan Preview and Run Start API contracts so the frontend is ready before backend endpoints land.
- [ ] `P2` `F-08`: integrate the Plan → Run core flow from canvas selection through to run start using real API when available, with a typed adapter for mock when not.
- [ ] `P2` `F-09`: wire RunsView to real GET /runs and GET /runs/:id data — list, detail, and status polling.
- [ ] `P2` `F-10`: implement a run event timeline using GET /runs/:id/events (polling or SSE) and unify the Console with real log output.
- [ ] `P3` `F-11`: wire ArtifactsView and DiffView to real backend data and activate Lineage, Cost, Plugins, and Admin views progressively via feature flags.

## Dependencies

- `MVP-E1` depends on `MVP-A1` and `MVP-B1` so frontend assumptions map to verified backend truth.
- F-01, F-02, F-04 are independent and can start in parallel.
- F-03 depends on F-02.
- F-05 depends on F-04.
- F-06 depends on F-05.
- F-07 depends on F-06.
- F-08 depends on F-07 and is blocked until backend delivers POST /plans/preview and POST /runs.
- F-09 depends on F-08 and is blocked until backend delivers GET /runs and GET /runs/:id.
- F-10 depends on F-09 and is blocked until backend delivers GET /runs/:id/events.
- F-11 depends on F-10 and requires artifact and lineage endpoints from backend.
- F-08 through F-11 coordinate with Lane C (admission) and Lane D (scale/GTM) for API surface readiness.

## Expected Outcome

- shell is clean and low-noise
- real backend health state is always visible
- mock and API modes are explicitly separated
- store responsibilities are decomposed by domain
- core flow (Plan → Run → Monitor) works with real data
- secondary views activate progressively via feature flags
