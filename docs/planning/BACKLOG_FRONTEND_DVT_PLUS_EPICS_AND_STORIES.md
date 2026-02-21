# DVT+ Frontend Backlog — Epics & User Stories

<!--
Status: canonical
Last-updated: 2026-02-21
Owner: dunay2
Source-of-truth: docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md
-->

> Objective: Convert the DVT+ frontend technical specification into an actionable backlog using the same `EPIC-*` + `US-*` system as the project.

## Table of Contents

- [Execution Status (GitHub)](#execution-status-github)
- [GitHub Convention](#github-convention)
- [Epics & User Stories](#epics--user-stories)
  - [EPIC F1 — UI Shell & Navigation Foundation](#epic-f1--ui-shell--navigation-foundation)
  - [EPIC F2 — Graph Workspace (React Flow + Layout)](#epic-f2--graph-workspace-react-flow--layout)
  - [EPIC F3 — Execution Plan UX (Explainable Read-only)](#epic-f3--execution-plan-ux-explainable-read-only)
  - [EPIC F4 — Run Monitoring & Live Status](#epic-f4--run-monitoring--live-status)
  - [EPIC F5 — Diff, Lineage & Impact Analysis UX](#epic-f5--diff-lineage--impact-analysis-ux)
  - [EPIC F6 — Cost, Guardrails & FinOps UX](#epic-f6--cost-guardrails--finops-ux)
  - [EPIC F7 — Plugins & UI Extensibility](#epic-f7--plugins--ui-extensibility)
  - [EPIC F8 — Security, RBAC & Admin UX](#epic-f8--security-rbac--admin-ux)
  - [EPIC F9 — Frontend Observability, A11y & Performance](#epic-f9--frontend-observability-a11y--performance)
- [Recommended Implementation Order](#recommended-implementation-order)
- [Definition of Ready (DoR) per Story](#definition-of-ready-dor-per-story)
- [Definition of Done (DoD) per Story](#definition-of-done-dod-per-story)

---

## Execution Status (GitHub)

- Created milestones: `EPIC-F1` to `EPIC-F9`.
- Created epic issues: `#160` to `#168`.
- Created user story issues: `#169` to `#188`.
- Detailed evidence and log: `BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md`.

## GitHub Convention

- 1 milestone per epic (`EPIC-F1 ...`, `EPIC-F2 ...`).
- 1 issue per user story (`US-F1.1 ...`, `US-F1.2 ...`).
- Recommended labels: `epic`, `story`, `frontend`, `ui`, `ux`, `security`, `observability`, `testing`.

---

## Epics & User Stories

### EPIC F1 — UI Shell & Navigation Foundation

#### US-F1.1 — Define Main Shell and Side Navigation

As a technical user, I want a consistent shell to navigate Graph, Plan, Run, Diff, and Admin without losing context.

**Deliverables**

- Base layout with fixed areas (sidebar, topbar, workspace, contextual panel).
- Routing for main views.
- Persistent navigation state per session.

#### US-F1.2 — Global Panels and Modals System

As a user, I want predictable overlays for inspection, confirmations, and configuration.

**Deliverables**

- Overlay/modal manager.
- Focus and close rules (keyboard-first).
- Homogeneous `loading/success/error` states.

### EPIC F2 — Graph Workspace (React Flow + Layout)

#### US-F2.1 — Render DAG with Basic Interaction

As an analyst, I want to visualize the DAG and navigate it smoothly.

**Deliverables**

- Node/edge rendering in React Flow.
- Zoom, pan, fitView, minimap.
- Simple/multi selection and context highlighting.

#### US-F2.2 — Auto-layout with ELK/dagre and Pinned Nodes

As a user, I want to organize large graphs without losing critical positions.

**Deliverables**

- Auto-layout by graph type.
- Support for pinned nodes.
- Incremental re-layout (no total viewport reset).

#### US-F2.3 — Graph Search and Filtering

As a user, I want to quickly locate nodes by name, type, or state.

**Deliverables**

- Frontend search index.
- Filters by domain/state/impact.
- Result navigation (next/prev match).

### EPIC F3 — Execution Plan UX (Explainable Read-only)

#### US-F3.1 — Plan Preview with RUN/SKIP/PARTIAL Actions

As a user, I want to see the resulting plan before executing.

**Deliverables**

- Table/view of actions per node.
- Status badges and grouping by action type.
- Export/share plan snapshot.

#### US-F3.2 — Explainability by Plan Decision

As a user, I want to understand why a node is RUN/SKIP/PARTIAL.

**Deliverables**

- "Why" panel per node.
- Rule/policy trace.
- Readable troubleshooting messages.

### EPIC F4 — Run Monitoring & Live Status

#### US-F4.1 — Execution Timeline with Step States

As an operator, I want real-time run tracking.

**Deliverables**

- Chronological timeline.
- Run-level and step-level state.
- Sync with engine event contract.

#### US-F4.2 — Logs, Progress, and Resilient Reconnection

As an operator, I want monitoring continuity even with unstable network.

**Deliverables**

- Polling/streaming with fallback.
- `reconnecting/degraded/offline` banner.
- Retry with backoff and visual circuit-breaker.

### EPIC F5 — Diff, Lineage & Impact Analysis UX

#### US-F5.1 — Diff View of Relevant Changes

As a user, I want to compare states to decide execution.

**Deliverables**

- Previous vs current diff view.
- Semantic change highlighting.
- Filters by severity/type.

#### US-F5.2 — Upstream/Downstream Lineage

As a user, I want to understand dependencies and impact.

**Deliverables**

- Lineage navigation in both directions.
- Impact mode with configurable depth.
- Contextual focus actions.

### EPIC F6 — Cost, Guardrails & FinOps UX

#### US-F6.1 — Cost Snapshot in Frontend

As an owner, I want to see estimated/observed cost per plan/run.

**Deliverables**

- Cost panel by relevant unit.
- Indicators per node/stage.
- Minimal snapshot history.

#### US-F6.2 — Guardrail Signals and Recommendations

As an operator, I want actionable alerts when a plan exceeds policies.

**Deliverables**

- Threshold alerts.
- Mitigation/recommendation messages.
- Visible "blocked by policy" states.

### EPIC F7 — Plugins & UI Extensibility

#### US-F7.1 — Plugin Catalog with State/Compatibility

As an admin, I want to manage plugins from the UI with clear visibility.

**Deliverables**

- List of installed/available plugins.
- State (active, incompatible, error).
- Compatibility by `apiVersion`.

#### US-F7.2 — Safe Handling of Plugin Failures in UI

As a user, I want a plugin failure not to degrade the whole app.

**Deliverables**

- Error boundaries per plugin surface.
- Isolated fallback UI.
- Auditable failure/recovery events.

### EPIC F8 — Security, RBAC & Admin UX

#### US-F8.1 — Visual RBAC Rules (hide/disable/read-only)

As an organization, I want the UI to explicitly respect backend permissions.

**Deliverables**

- Conditional render engine by permission.
- Behavior matrix by view/action.
- Coherent access denied messaging.

#### US-F8.2 — Restricted and Audited Admin Surface

As an admin, I want to operate critical configurations with traceability.

**Deliverables**

- Protected admin views.
- Log of privileged actions.
- Reinforced confirmations for sensitive actions.

### EPIC F9 — Frontend Observability, A11y & Performance

#### US-F9.1 — Frontend Telemetry with Key Events

As a platform team, I want UX health metrics and errors per view.

**Deliverables**

- OTel instrumentation of critical interactions.
- Metrics: TTFMP, error-rate, plan preview latency.
- Session/trace correlation with backend.

#### US-F9.2 — Operational Accessibility of Critical Views

As a user, I want to operate via keyboard and screen reader in main flows.

**Deliverables**

- Keyboard-first navigation in shell/canvas/modals.
- ARIA in critical components.
- Validation in golden accessibility paths.

#### US-F9.3 — Performance Budget for Large Graphs

As a user, I want a smooth experience with high-cardinality graphs.

**Deliverables**

- UI budget definition and enforcement.
- Virtualization/lazy rendering strategies.
- Benchmarks and regression alerts.

---

## Recommended Implementation Order

1. EPIC F1
2. EPIC F2
3. EPICs F3 and F4 in controlled parallel
4. EPICs F5 and F6
5. EPICs F7 and F8
6. EPIC F9 as a transversal quality gate

---

## Definition of Ready (DoR) per Story

- Reference contract/view-model identified.
- Verifiable acceptance criteria.
- Declared security/RBAC risks.
- Minimum UX/observability metrics defined.

## Definition of Done (DoD) per Story

- Documentation updated and linked in index.
- Associated tests (unit/integration/e2e or UI contract).
- Evidence in corresponding issue + milestone.
- Spec ↔ story traceability status updated.
