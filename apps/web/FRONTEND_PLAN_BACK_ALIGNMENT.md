# DVT+ Frontend — Clean Interface Plan Focused on Backend

## 1. Objective

Define a practical plan to evolve the `apps/web` UI from a broad prototype to an interface that is:

- cleaner (less visual noise),
- more organized (clear work hierarchy),
- more focused (main flow Plan → Run → Monitor),
- and aligned with the real evolution of the backend.

## 2. Current Diagnosis

### 2.1 Frontend Today

The current frontend is a high-fidelity prototype with broad coverage of views and components:

- Multiple routes (`/canvas`, `/runs`, `/artifacts`, `/diff`, `/lineage`, `/cost`, `/plugins`, `/admin`).
- Unified local state with Zustand.
- Simulation based on mock data (`mockDbtData.ts`) and local plan/run actions.
- Complex shell with top bar, icon sidebar, explorer panel, inspector panel, and console.

Conclusion: visually powerful, but still a “demo-first product” (mock UI-centric) rather than “workflow-first” (backend integration-centric).

### 2.2 Backend Today (Available Evolution)

The backend in `apps/api` is a solid but minimal operational base, focused on infrastructure and service health:

- `GET /healthz` and `GET /readyz`.
- `GET /version`.
- `GET /db/ready` with real PostgreSQL check if `DATABASE_URL` exists.
- Configurable CORS, environment validation with Zod, and strict Fastify startup.

Conclusion: there are still no domain endpoints for `plan`, `run`, `lineage`, `artifacts`, `cost`, or `plugins`; therefore, the frontend should prioritize gradual integration and avoid over-promising UX on mock data.

## 3. Product Guiding Principle (New Focus)

Move from **“UI with many views”** to **“Operational UI to execute with real backend”**.

Rule:

1. First, shell reliability + connectivity + network states.
2. Then, core flow (Plan / Run / Monitor) with real data.
3. Then, secondary views (diff, lineage, cost, plugins, admin).

## 4. Visual Cleanup and Order Plan

### 4.1 Navigation Simplification (UI-1 Phase)

**Changes:**

- Keep left sidebar with icons only + tooltip (no permanent texts).
- Remove redundant headers in sidebars (`Projects`, `dbt explorer`) to gain vertical focus.
- Keep fixed IDE-like width (no ambiguous double collapse system).
- Reduce top bar density: move secondary “View” controls to a single contextual menu.

**Expected UX Result:**

- Less visual noise.
- More useful canvas area.
- Fewer decisions per screen.

### 4.2 View Hierarchy by Priority (UI-2 Phase)

Define views by levels:

- **Level A (Core):** Canvas, Runs.
- **Level B (Operation):** Artifacts, Diff.
- **Level C (Advanced/Admin):** Lineage, Cost, Plugins, Admin.

Apply “progressive disclosure”:

- Level C hidden by default in basic mode.
- Activatable by feature flags or role.

**Expected UX Result:**

- Interface more focused on daily work.
- Lower cognitive load for new users.

### 4.3 Task-oriented Layout (UI-3 Phase)

Standardize layout by context:

- **Build Mode (default):** Explorer + Canvas + Inspector.
- **Run Mode:** Runs + prioritized Console.
- **Focus Mode:** Almost full Canvas.

Avoid making the user manage too many panels manually; layout should respond to route context.

## 5. Backend Alignment Plan

### 5.1 Minimum Connectivity Contract (Immediate)

Create a typed API client for existing endpoints:

- `GET /healthz`
- `GET /readyz`
- `GET /version`
- `GET /db/ready`

Frontend usage:

- Global platform state indicator in top bar.
- Real degraded/offline banner (not mock).
- “Service diagnostics” in status panel.

### 5.2 Anti-mock Strategy (Short Term)

Explicitly separate data sources:

- `mock` (development/demo)
- `api` (real)

Switch via environment variable (`VITE_DATA_SOURCE=mock|api`).

Goal: keep demo useful without blocking real integration.

### 5.3 Backend Contracts Needed by Frontend (Next Evolution)

Prioritized proposal for backend:

1. `POST /plans/preview` (subgraph/selection → immutable plan).
2. `POST /runs` (start run from plan).
3. `GET /runs/:id` + `GET /runs` (state and list).
4. `GET /runs/:id/events` (SSE or equivalent polling).
5. `GET /artifacts/:runId/*` (minimal manifest/run_results/catalog).

Frontend should prepare with TypeScript interfaces for these contracts now, even if backend delivers them incrementally.

## 6. Recommended Frontend Architecture

### 6.1 Stores by Responsibility

Progressive refactor of current global store towards:

- `shellStore`: layout, panels, focus, navigation.
- `sessionStore`: tenant/project/env/git/ref.
- `graphStore`: nodes/edges/selection.
- `runStore`: current plan, current run, timeline.
- `statusStore`: backend health and connectivity.

### 6.2 Data Layer

Standardize with TanStack Query:

- State queries (`health`, `version`, `dbReady`),
- Action mutations (`plan`, `run`),
- Predictable invalidation by domain.

### 6.3 UI Principle

View components do not consume mock directly; they use services (`app/services/*`) and typed view-models.

## 7. Proposed Roadmap (4 Sprints)

### Sprint 1 — “Clean and Connected Base”

- Visual shell cleanup (navigation and redundant headers).
- Minimal API client (`health`, `ready`, `version`, `db/ready`).
- Real network state in top bar + global banner.
- Document `mock` vs `api` mode.

### Sprint 2 — “Real Core Flow (v1)”

- Integrate real plan preview (if backend available; if not, temporary adapter).
- Integrate run start.
- Reinforce Runs view as operational focus.

### Sprint 3 — “Monitor and Traceability”

- Run timeline with real/polling events.
- Unified events and logs console.
- Empty states, errors, retry, and degradation.

### Sprint 4 — “Controlled Expansion”

- Artifacts and Diff on real data.
- Gradual activation of Lineage/Cost/Plugins/Admin by feature flag.
- UX hardening (accessibility + performance).

## 8. Success Criteria

1. A user can complete the main flow without relying on mock data.
2. The UI always shows real backend state.
3. Navigation prioritizes core tasks and reduces noise.
4. The technical base allows scaling to future contracts without redoing the shell.

## 9. Frontend Documentation Deliverables

This document is complemented by:

- Update of `apps/web/README.md` to reflect real state.
- Phase-based integration roadmap for frontend/backend team.

Status: Initial operational proposal.
Date: 2026-02-19.
