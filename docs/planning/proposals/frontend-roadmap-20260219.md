---
title: Frontend Roadmap — Prototype To Operational UI
status: Active
owner: Product / UX / Frontend
last_reviewed: 2026-03-27
planning_type: proposal
---

# Frontend Roadmap — Prototype To Operational UI

## Context

The execution of this roadmap is tracked in
[Agent Lane E](../state/agent-lane-e.md) (`docs/planning/state/agent-lane-e.md`).
Lane E tasks (F-01 through F-11) are the canonical work units; this document
provides the strategic rationale, architecture decisions, and API surface
requirements that inform them.

Original analysis: 2026-02-19. Updated to reflect active state: 2026-03-27.

---

## Diagnosis

### Frontend today

`apps/web` is a high-fidelity prototype with broad surface coverage:

- 9 routes: `/canvas`, `/runs`, `/artifacts`, `/diff`, `/lineage`, `/cost`,
  `/plugins`, `/admin`.
- Unified global Zustand store with mock data (`mockDbtData.ts`, `mockData.ts`).
- Full Shadcn/Radix UI component library installed.
- No real API integration — all data is simulated.

State: visually complete, operationally inert. A demo-first product, not a
workflow-first product.

### Backend today

`apps/api` exposes health infrastructure only:

- `GET /healthz`, `GET /readyz`, `GET /version`, `GET /db/ready`.

No domain endpoints exist yet for `plan`, `run`, `lineage`, `artifacts`,
`cost`, or `plugins`.

Implication: the frontend can deliver Phase 0 and Phase 1 work without waiting
for the backend. Phases 2–4 are gated on backend API surface.

---

## Guiding Principle

Move from **"UI with many views"** to **"Operational UI backed by real contracts"**.

Sequence:

1. Shell reliability + real connectivity state (no backend domain deps).
2. Architecture cleanup — store decomposition, service layer, data-source flag.
3. Core flow (Plan → Run → Monitor) with real data as backend endpoints land.
4. Secondary views (Artifacts, Diff, Lineage, Cost, Plugins, Admin) activated
   progressively via feature flags.

---

## View Hierarchy

| Level         | Views                         | Mode                                       |
| ------------- | ----------------------------- | ------------------------------------------ |
| A — Core      | Canvas, Runs                  | Always active                              |
| B — Operation | Artifacts, Diff               | Active when backend delivers artifacts API |
| C — Advanced  | Lineage, Cost, Plugins, Admin | Hidden by default; feature-flag activated  |

---

## Architecture Decisions

### Store decomposition

Replace the current single global store with domain-scoped stores:

- `shellStore` — layout, panels, focus, navigation.
- `sessionStore` — tenant, project, environment, git ref.
- `graphStore` — nodes, edges, selection.
- `runStore` — current plan, current run, event timeline.
- `statusStore` — backend health, connectivity, retry state.

### Data layer

TanStack Query for all remote state:

- Health queries: `health`, `version`, `dbReady`.
- Core mutations: `plan` (POST /plans/preview), `run` (POST /runs).
- Predictable invalidation by domain.

### Data source separation

`VITE_DATA_SOURCE=mock|api` controls the data layer. Views never import mock
data directly — they consume `app/services/*` and typed view-models. Mock mode
remains usable for development and demo without code changes.

### Service layer

```
View → useQuery/useMutation (TanStack Query)
     → app/services/<domain>-service.ts
     → app/services/platform-client.ts
     → real API
```

No direct `fetch` calls in components.

---

## Backend API Surface Required

The frontend will pre-define TypeScript interfaces for these contracts so it is
ready before backend delivery:

| Endpoint                                           | Phase | Blocks                         |
| -------------------------------------------------- | ----- | ------------------------------ |
| `GET /healthz`, `/readyz`, `/version`, `/db/ready` | 0     | F-02, F-03 (already available) |
| `POST /plans/preview`                              | 2     | F-08                           |
| `POST /runs`                                       | 2     | F-08                           |
| `GET /runs`                                        | 2     | F-09                           |
| `GET /runs/:id`                                    | 2     | F-09                           |
| `GET /runs/:id/events` (SSE or polling)            | 3     | F-10                           |
| `GET /artifacts/:runId/*`                          | 4     | F-11                           |

Coordinate timing of Phase 2 endpoints with Lane C (admission) and Lane D
(GTM/scale).

---

## Roadmap Phases

### Phase 0 — Foundation (no backend domain deps)

Tasks: F-01, F-02, F-03, F-04

- Shell cleanup: icon-only nav with tooltips, no redundant sidebar headers,
  topbar secondary controls collapsed.
- Typed API client for health endpoints.
- Real platform state (ok/degraded/offline) in top bar and global banner.
- `VITE_DATA_SOURCE` flag documented and functional.

### Phase 1 — Architecture

Tasks: F-05, F-06, F-07

- Store decomposition into domain-scoped stores.
- TanStack Query introduced and configured.
- TypeScript interfaces pre-defined for Plan and Run API contracts.

### Phase 2 — Core Flow

Tasks: F-08, F-09 — **blocked on backend delivering POST /plans/preview, POST
/runs, GET /runs, GET /runs/:id**

- Canvas selection → Plan Preview → Run Start → RunsView.
- Real run list and detail with polling.
- Error and permission UX (401/403/409/5xx) with actionable messages.

### Phase 3 — Monitoring

Task: F-10 — **blocked on backend delivering GET /runs/:id/events**

- Run event timeline via SSE or polling.
- Console with ordered, real-time event stream.

### Phase 4 — Controlled Expansion

Task: F-11 — **blocked on artifact and lineage endpoints**

- ArtifactsView and DiffView on real data.
- Level-C views activated by role or feature flag.

---

## Success Criteria

1. A user can complete the main flow (Plan → Run → Monitor) without mock data.
2. The UI always reflects real backend state.
3. Navigation focuses on core tasks; Level-C views are not visible by default.
4. The technical base supports future contracts without shell redesign.
5. Both `mock` and `api` modes remain runnable without code changes.

---

## Related Files

- [Agent Lane E](../state/agent-lane-e.md) — execution tracking
- [`apps/web/src/`](../../../apps/web/src/) — frontend source
- [`apps/api/`](../../../apps/api/) — backend source
- [`apps/web/FRONTEND_SPRINT_PLAN_TASKS_RISKS.md`](../../../apps/web/FRONTEND_SPRINT_PLAN_TASKS_RISKS.md) — original sprint breakdown (retained as implementation notes)
