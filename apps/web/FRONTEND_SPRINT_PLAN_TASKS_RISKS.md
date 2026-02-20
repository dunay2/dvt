# DVT+ Frontend — Task, Sprint, and Phase Execution Plan

## 1) Objective

Deliver a cleaner, more organized DVT+ interface focused on real backend operation, maintaining the current architecture (Planner/Engine/State/UI) and a state-driven approach.

## 2) Execution Approach

- Horizon: 4 sprints.
- Suggested duration: 2 weeks per sprint.
- Strategy: start with visual base and connectivity, then core flow, then observability and scaling.

## 3) Clear Phases

### Phase A — UX Foundation + Minimal Integration

Sprints: 1
Goal: Clean up shell and connect to real platform states.

### Phase B — Core Operational Flow

Sprints: 2
Goal: Consolidate Canvas → Plan → Run with real contracts or transitional adapter.

### Phase C — Monitoring and Robustness

Sprints: 3
Goal: Timeline, useful console, network and error resilience.

### Phase D — Scalability and Controlled Expansion

Sprints: 4
Goal: Stable experience with large graphs and gradual activation of advanced views.

---

## 4) Detailed Plan per Sprint (Concrete Tasks)

### Sprint 1 — Clean and Connected Base

**Sprint Objective:**
Reduce visual noise and replace mock connectivity state with real backend state.

**Tasks:**

1. **Consolidate shell navigation and visual hierarchy**
   - Remove redundant headers in sidebars.
   - Keep left navigation icon-only + tooltip.
   - Unify secondary controls in a contextual menu.
2. **Implement platform client (health/version/db)**
   - Endpoints: `/healthz`, `/readyz`, `/version`, `/db/ready`.
   - Typed responses and error handling.
3. **Real network/platform global state**
   - Top bar with real state (ok/degraded/offline).
   - Persistent banner in degraded/offline.
   - Simple retry and backoff policy.
4. **Separation of data sources `mock|api`**
   - Feature flag `VITE_DATA_SOURCE`.
   - Document operation mode.
5. **Define canvas UX baseline (clean Design Mode)**
   - No persistent metrics in design mode.
   - Details only on hover/inspector.

**Risks:**

- Coupling UI to current health endpoint format may require rework later.
- Confusing intermediate states if state matrix (offline/degraded/reconnecting) is not defined.

**Opportunities:**

- Immediate gain in perception of a "real" product.
- Reusable base for any view depending on backend availability.

---

### Sprint 2 — Core Flow: Plan + Run

**Sprint Objective:**
Move the main flow from visual interaction to backend operation (or stable transitional contract).

**Tasks:**

1. **Define frontend contracts for Plan Preview and Run Start**
   - TS interfaces for request/response.
   - Data adapters to view-models.
2. **Integrate Plan action from canvas selection**
   - Plan mutation with states: idle/loading/success/error.
   - Plan Preview modal on real/adapted data.
3. **Integrate Run action from confirmed plan**
   - Start run mutation.
   - Contextual navigation to Runs.
4. **Error and permission UX states**
   - Handle 401/403/409/5xx in plan/run flow.
   - Actionable messages and retry.
5. **Register minimal core flow telemetry**
   - Events: plan_opened, plan_confirmed, run_started, run_failed_ui.

**Risks:**

- Backend contracts for plan/run not yet stable.
- API decisions may block sprint closure.

**Opportunities:**

- First direct business value: execution from UI.
- Reduced gap between visual demo and real operation.

---

### Sprint 3 — Monitor, Console, and Resilience

**Sprint Objective:**
Make execution tracking operable with controlled degradation.

**Tasks:**

1. **Implement state-driven Run Monitor**
   - Run state by polling/SSE as available.
   - Ordered, consistent event timeline.
2. **Unified console (events/logs/metrics)**
   - Filters by step/severity/timestamp.
   - Persistence of basic user preferences.
3. **Fallback and reconnection policies**
   - SSE → automatic polling.
   - Visual circuit-breaker for unstable service.
4. **Runtime and Cost overlays by mode (no mixing)**
   - Runtime Mode: state + duration.
   - Cost Mode: heatmap.
   - Clean Design Mode by default.
5. **Error message hardening**
   - Recoverable errors (toast + retry).
   - Unrecoverable errors (blocking panel with diagnosis).

**Risks:**

- High event frequency may degrade render performance.
- Temporary inconsistencies between run snapshot and event stream.

**Opportunities:**

- Strong product differentiation in daily operation.
- Better traceability for support and functional debugging.

---

### Sprint 4 — Scalability + Controlled Advanced Views

**Sprint Objective:**
Ensure readability and performance in large graphs and activate advanced capabilities without noise.

**Tasks:**

1. **Implement full canvas layering**
   - Core/Validation/Exposure/Runtime/Cost/Impact with toggles.
   - Rule: only one intensive layer at a time.
2. **Non-intrusive representation of tests and exposures**
   - Aggregated tests by badge + inspector.
   - Exposures hidden by default and secondary style.
3. **Scaling strategy for 300+ nodes**
   - Progressive reveal by zoom.
   - Auto-grouping and collapsible clusters.
   - Render optimization in viewport.
4. **Recommended deterministic layout (ELK layered)**
   - Stable order by type/name/dependency.
   - Incremental insertion without "visual chaos".
5. **Gradual activation of advanced views**
   - Diff/Artifacts first.
   - Lineage/Cost/Plugins/Admin by flags and/or role.

**Risks:**

- UX complexity if too many toggles are exposed without guidance.
- Technical cost of migrating layout while maintaining current experience.

**Opportunities:**

- Real scalability for enterprise cases.
- Robust base for advanced observability roadmap.

---

## 5) Key Dependencies Between Sprints

- Sprint 2 depends on Sprint 1's minimum contract (platform state + data source).
- Sprint 3 depends on having functional Run Start or stable contractual simulation.
- Sprint 4 depends on baseline modes (Design/Runtime/Cost/Impact) defined in Sprint 3.

## 6) Cross-cutting Risks

1. **Front/Back misalignment in domain contracts**
   - Mitigation: contract versioning and explicit temporary adapters.
2. **Usability regression due to excess controls**
   - Mitigation: strict defaults, progressive disclosure, and "clean view" criteria.
3. **Performance in large graphs**
   - Mitigation: render strategy by zoom level + clusters.
4. **Network state ambiguity**
   - Mitigation: single state matrix and consistent UX copy.

## 7) Cross-cutting Opportunities

1. **Accelerate internal adoption** with a clearer UI for daily operation.
2. **Reduce support cost** through better visual diagnosis and explicit states.
3. **Improve Front/Back collaboration** with concrete integration contracts per sprint.
4. **Prepare enterprise ground** via scalability and visual control by layers.

## 8) Suggested Success Metrics

- Time to first useful action in Canvas (TTFA).
- % of sessions completing Plan → Run without blocking UX error.
- Rate of errors recovered via successful retry.
- Performance in 300-node graph (fps/interaction and layout latency).
- Usage of modes (Design/Runtime/Cost/Impact) and dwell time.

## 9) Closing

This plan divides evolution into concrete, cumulative deliverables, focusing on cognitive clarity, real backend integration, and scalability, without architectural drift.
