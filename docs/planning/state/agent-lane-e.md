---
title: Agent Lane E - Frontend And UI
status: Active
owner: Product / UX / Frontend
last_reviewed: 2026-03-31
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

Generated from the verified lane registry `agent-lane-e.yaml`. Use this file when assigning Agent E.

## Goal

Evolve apps/web from a high-fidelity mock prototype to an operational UI backed by real API contracts.

## Verification Summary

- Status model: `evidence-backed lane registry`
- Done rule: `done only with accepted evidence or equivalent verifiable closure`
- Verified on: `2026-03-31`
- Total tasks: `12`
- Total effort points: `62`
- Completed weighted points: `4.75`
- Lane progress: `8%`
- Notes: Weighted progress uses effort_points. Parent umbrella tasks with subtasks carry coordination-only effort.

## Tasks

> Verified registry source: `agent-lane-e.yaml`. Edit the YAML and run `pnpm docs:planning:lanes:generate` plus `pnpm docs:workboard:generate`.

- [ ] `P0` `MVP-E1` `queued` `M` `5pt` `0%`: define the frontend consumption contract for the backend MVP surface that exists today, without promising non-implemented behavior.
- [ ] `P0` `F-01` `queued` `M` `5pt` `0%`: clean up the shell - remove redundant sidebar headers, keep nav icon-only with tooltips, unify secondary controls into a contextual menu.
- [x] `P0` `F-02` `done` `S` `3pt` `100%`: implement a typed API client covering the existing health endpoints (healthz, readyz, version, db/ready).
- [ ] `P0` `F-03` `in_progress` `M` `5pt` `35%`: wire real backend health state into the top bar and a global degraded/offline banner.
- [ ] `P0` `F-03-A` `queued` `M` `3pt` `0%`: extract a dedicated shell-health presenter so Root consumes one explicit health view-model instead of recomputing and orchestrating policy inline.
- [ ] `P0` `F-03-B` `queued` `M` `3pt` `0%`: normalize health retry cadence ownership so there is exactly one policy owner for polling, degraded/offline backoff, and manual retry reset.
- [ ] `P0` `F-03-C` `queued` `M` `3pt` `0%`: add Root seam tests for pending, degraded, offline, recovery, and banner-topbar coherence.
- [ ] `P1` `F-03-D` `queued` `S` `2pt` `0%`: contract shell status semantics to real observed signals and remove synthetic live-events truth leakage from health surfaces.
- [ ] `P1` `F-03-E` `queued` `S` `2pt` `0%`: align active frontend status docs with shipped reality after F-03 hardening.
- [ ] `P1` `F-04` `queued` `M` `5pt` `0%`: introduce a VITE_DATA_SOURCE mock-or-api environment flag and separate data layers so views do not consume mock data directly.
- [ ] `P1` `F-05` `blocked` `M` `5pt` `0%`: decompose the global Zustand store into domain-scoped stores (shellStore, sessionStore, graphStore, runStore, statusStore).
- [ ] `P1` `F-06` `blocked` `M` `5pt` `0%`: introduce TanStack Query as the data-fetching layer and define query/mutation patterns for health, plan, and run domains.
- [ ] `P2` `F-07` `blocked` `M` `3pt` `0%`: define TypeScript interfaces for the Plan Preview and Run Start API contracts so the frontend is ready before backend endpoints land.
- [ ] `P2` `F-08` `blocked` `L` `8pt` `0%`: integrate the Plan -> Run core flow from canvas selection through to run start using real API when available, with a typed adapter for mock when not.
- [ ] `P2` `F-09` `blocked` `M` `5pt` `0%`: wire RunsView to real GET /runs and GET /runs/:id data - list, detail, and status polling.
- [ ] `P2` `F-10` `blocked` `M` `5pt` `0%`: implement a run event timeline using GET /runs/:id/events (polling or SSE) and unify the Console with real log output.
- [ ] `P3` `F-11` `blocked` `L` `8pt` `0%`: wire ArtifactsView and DiffView to real backend data and activate Lineage, Cost, Plugins, and Admin views progressively via feature flags.

## Dependencies

- `MVP-E1` is now unblocked by the closed `MVP-A1`/`MVP-B1` backend baseline and remains queued until the frontend contract artifact is written.
- `F-01` and `F-04` remain independent queued slices; `F-03` is now unblocked by `F-02`.
- `F-08` through `F-11` remain blocked by backend endpoint delivery and must stay contracts-first.
- `F-02` now has accepted implementation evidence and establishes the first capability-module pattern for Lane E; `F-03` is partially advanced but not yet complete.

## Expected Outcome

- shell is clean and low-noise
- real backend health state is always visible
- mock and API modes are explicitly separated
- store responsibilities are decomposed by domain
- core flow (Plan -> Run -> Monitor) works with real data
- secondary views activate progressively via feature flags
