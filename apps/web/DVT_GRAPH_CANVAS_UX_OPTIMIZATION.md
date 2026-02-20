# DVT+ Graph Canvas UX Optimization (State-Driven, Architecture-Preserving)

## 1) UX Architecture Proposal (Overview)

Objective: Optimize cognitive clarity of the DAG canvas without changing architecture or contracts.

Principles:

- Separate semantic layers by visual mode (do not mix abstractions).
- Keep the base structural graph stable between modes.
- Show detail on demand (hover/inspector), not persistently.
- Prioritize initial legibility and scalability (>300 nodes).

Explicit restrictions (remain):

- No changes to Planner/Engine/State/dbt artifacts/plugins.
- No new execution capabilities.
- UI strictly state-driven.

## 2) Layer Model Specification

### 2.1 Defined Layers

1. **Core Pipeline Layer (default ON)**
   - Sources + Models.
   - The only mandatory layer by default.
2. **Validation Layer (default OFF in clean view)**
   - Tests represented in aggregate (badges/inspector), not as main nodes.
3. **Exposure Layer (default OFF)**
   - Exposures visible only when the layer is active.
4. **Runtime Layer (default OFF)**
   - Execution state + duration.
5. **Cost Layer (default OFF)**
   - Cost heatmap over core nodes.
6. **Lineage/Impact Layer (default OFF)**
   - Upstream/downstream highlighting on selection.

### 2.2 Coexistence Rules

- Only one "intensive" layer active at a time: Runtime **or** Cost **or** Impact.
- Validation and Exposure can combine with Core, but not dominate visually.
- The base structure (core nodes/edges) does not change when toggling layers.

## 3) Interaction Model Specification

### 3.1 Work Modes

- **Design Mode (default):** Clean core, no persistent metrics.
- **Runtime Mode:** Overlay execution state/duration.
- **Cost Mode:** Overlay cost heatmap.
- **Impact Mode:** Overlay selection impact.

### 3.2 Test Redesign

- Aggregated badge per node (`tests: pass/fail`).
- Critical indicator (red) only when failure exists.
- Full detail in side inspector (list of tests with status).

Test node visibility:

- Only in “Validation Layer ON + high zoom” or in dedicated diagnostic view.

Drill-down:

- Click on test badge opens inspector filtered by node.
- From inspector, navigate to individual test without saturating main canvas.

### 3.3 Exposures Redesign

- Default state: hidden.
- When Exposure Layer is active:
  - Secondary visual style (dashed border, lower contrast than models).
  - Thin, semi-transparent connections.
- Exposures never compete in size/color with core nodes.

### 3.4 Runtime and Metrics

- **Design Mode:** No persistent duration/cost visible.
- **Runtime Mode:** Show status + duration per node (persistent in this mode).
- **Cost Mode:** Show cost color map (persistent in this mode).
- Hover: reveals contextual tooltip (on-demand detail) in any mode.

### 3.5 Inspector

- Contextual to selected node.
- Ordered sections: Summary → Runtime → Cost → Tests → Exposures.
- Main source for detail; canvas reserved for signaling.

### 3.6 Updates and Animation

- Smooth, short transitions (150–250ms) on state changes.
- No continuous decorative animation.
- Mode changes do not rewrite layout; only overlays/styles.

## 4) Layout Rules

### 4.1 Recommended Engine

- **ELK layered** preferred for legible hierarchy and stable edge routing.
- Maintain fallback compatibility with current layout (dagre) if applicable.

### 4.2 Order and Hierarchy

- Main axis left→right by dependencies.
- Optional swimlanes by type (Source / Staging / Marts / Outputs).
- Tests and exposures outside main lane in clean mode.

### 4.3 Visual Rules

- Uniform base size in core nodes.
- Color by semantic type (few colors, consistent contrasts).
- State (success/fail/in progress) as secondary signal (badge/border), not dominant background color.
- Edge routing orthogonal/smooth, minimizing crossings.

### 4.4 Deterministic Rules

- Stable order by type + name + dependency to avoid "jumps".
- Incremental insertion of new nodes preserving existing layout.

## 5) Scalability Guidelines

### 5.1 Progressive Reveal

- Low zoom: only critical labels and general shape.
- Medium zoom: names + summarized state.
- High zoom: additional metadata on demand.

### 5.2 Grouping and Collapse

- Auto-group by domain/tag/transformation layer.
- Collapsible clusters with counters (nodes, failures, aggregate cost).
- Expand only the focused group to reduce visual load.

### 5.3 Visual Performance

- Virtualize/hide details not visible in viewport.
- Minimize global re-render; prefer granular update by node/layer.

## 6) Enumerated Optimization Tasks

1. Implement toggleable layer system (Core/Validation/Exposure/Runtime/Cost/Impact).
2. Migrate tests to aggregated representation (badge + inspector) as default.
3. Define exposures as optional, low-visual-weight layer.
4. Introduce isolated Runtime and Cost overlays by mode.
5. Standardize visual hierarchy (size, color, borders, edges).
6. Implement single mode selector (Design/Runtime/Cost/Impact).
7. Add collapsible grouping + progressive reveal for large graphs.
8. Adopt deterministic ELK layered layout and incremental insertion rules.

## 7) Before/After (Conceptual)

Before:

- Everything visible simultaneously (core + tests + exposures + metrics).
- Signal competition and noise in initial reading.

After:

- Clean view by default (Core only).
- Specialized signals by mode/layer.
- Detail moved to inspector/hover.
- Stable structure when changing mode.

## 8) Acceptance Criteria

- A 50-node graph is legible “first glance” in Design Mode.
- Tests do not visually compete with models in main view.
- Runtime/cost metrics do not appear persistently in design mode.
- Switching to Runtime/Cost does not alter base graph structure.
- No changes in architecture or execution semantics.
- UI remains strictly state-driven.

## 9) Explicit Non-Goals

- Redesign Planner.
- Change execution semantics.
- Replace React Flow.
- Remove dbt artifacts.
- Introduce new orchestration logic.
- Add feature creep outside UX optimization.
