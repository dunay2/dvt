# DVT+ - dbt Visual Workflow Editor

A high-fidelity clickable desktop web app prototype for DVT+, a dbt-compatible visual workflow editor and runner.

## Features

### Core UX Principle: State-Driven Architecture

- Users never execute SQL directly
- Request Plan (Planner) → receive immutable ExecutionPlan preview
- Start Run (Engine) → run emits events → State Store is source of truth
- UI always reflects state from APIs/events

### Global App Shell

- **Top App Bar**: Tenant switcher, project selector, environment selector, Git branch/SHA, global search, notifications, connection status, user menu
- **Left Navigation**: Collapsible navigation with Canvas, Runs, Artifacts, Diff, Lineage, Cost & Observability, Plugins, Admin
- **Main Workspace**: VS Code-like dockable and resizable panels
- **Bottom Console**: Events, Logs, Metrics with resizable drawer

### Views

#### Canvas (Main Graph)

- React Flow-based DAG visualization
- Drag & drop from dbt Explorer to canvas
- Auto-layout with dagre algorithm
- Impact overlay showing upstream/downstream dependencies
- Column-level lineage toggle
- Edge creation with dbt semantic validation
- Selection-aware Plan and Run actions
- Inspector panel for node details

#### dbt Explorer (Left Panel)

- Grouped by node type: Sources, Models, Seeds, Snapshots, Tests, Exposures, Metrics, Macros
- Draggable items to canvas
- Status badges and duration/cost hints
- Package and tag information

#### Run View

- Live run monitoring with step timeline
- Real-time event stream
- Step-by-step execution progress
- Logs viewer with step selector
- Metrics dashboard
- Artifacts download links
- Pause/Resume/Cancel controls

#### Diff View

- Compare Git SHAs or Runs
- Graph diff (nodes added/removed/changed)
- SQL diff (side-by-side compiled SQL comparison)
- Catalog diff (column changes)
- Breaking changes panel with severity indicators

#### Lineage View

- Model-level lineage visualization
- Column-level lineage with transformations
- Impact summary (upstream/downstream counts)
- Pin to canvas functionality
- Breadcrumb navigation

#### Cost & Observability

- Cost by run and by model charts
- Warehouse usage monitoring
- Cost alerts and thresholds
- OpenTelemetry traces placeholder
- Performance metrics

#### Plugins

- Installed plugins management
- Enable/disable plugins
- Plugin capabilities and permissions
- Marketplace browser
- Plugin configuration

#### Admin (RBAC)

- Role management
- Permission matrix
- Audit log with search/filter
- Scoped permissions (tenant/project/environment)

#### Artifacts

- View dbt artifacts: manifest.json, run_results.json, catalog.json
- JSON preview with syntax highlighting
- Download artifacts
- Git SHA tracking

### Connection Validation (dbt Semantics)

**Allowed Connections:**

- SOURCE → MODEL (source())
- SEED → MODEL
- MODEL → MODEL (ref())
- SNAPSHOT → MODEL
- MODEL → TEST
- SOURCE → TEST
- MODEL → EXPOSURE
- MODEL → METRIC
- METRIC → EXPOSURE

**Disallowed:**

- TEST → anything
- EXPOSURE → anything
- Cycles (DAG only)
- Duplicate edges

### Network States

- REST OK / Degraded / Offline indicator
- Live events (SSE/WebSocket) vs Polling fallback
- Error state variants (401/403, 409 re-plan, 5xx degraded)
- Read-only mode on network issues

### Modals

- Plan Preview (immutable execution plan)
- Confirm Edge (semantic validation)
- Permission Denied (RBAC)
- Network Degraded
- Re-Plan Required (409 conflict)

## Technology Stack

- **React** + **TypeScript**
- **React Flow** (@xyflow/react) - Graph canvas with nodes/edges
- **Zustand** - Local UI state management
- **TanStack Query** - Server state/polling
- **Dagre** - Auto-layout algorithm
- **Recharts** - Cost and metrics charts
- **Tailwind CSS v4** - Styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icons
- **React Router** - Navigation

## Data Model

All data is sourced from dbt artifacts (manifest.json, run_results.json, catalog.json) representing an immutable state-driven architecture.

## Getting Started

This is a prototype with mock data. No backend required.

```bash
npm install
npm run dev
```

## Navigation

- `/canvas` - Main graph view (default)
- `/runs` - Run history and details
- `/artifacts` - dbt artifacts viewer
- `/diff` - Git/Run diff comparison
- `/lineage` - Lineage analysis
- `/cost` - Cost & observability dashboard
- `/plugins` - Plugin management
- `/admin` - RBAC and audit log
