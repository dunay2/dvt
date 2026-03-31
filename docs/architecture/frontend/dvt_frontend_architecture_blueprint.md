---
title: Frontend Architecture Blueprint (Expanded)
status: Archived
owner: frontend-architecture
last_reviewed: 2026-03-31
planning_type: architecture
document_type: reference-note
---

# Frontend Architecture Blueprint (Expanded)

## Raven Plan / DVT UI Architecture - Detailed Version (Historical Sketch)

This document is retained as a historical reference note. The canonical frontend baseline is defined by `frontend-ddd-target-architecture.md`, `frontend-architecture-execution-plan.md`, and `index.md` in this directory.

## 1. Context

This document defines the **frontend architecture baseline** for DVT+ (Raven Plan).

It extends the previous blueprint with:

- DSL design expansion
- Component system architecture
- Layout and responsive behavior
- Theming system
- Git-first strategy
- Export system
- Backend contract requirements
- Open points

---

# 2. Core Principles

## 2.1 Separation of Concerns

```
UI â‰  Server State â‰  Graph State â‰  Editor State
```

## 2.2 Product Philosophy

DVT is:

> A graph authoring and execution system with deterministic behavior

---

# 3. DSL Architecture (Expanded)

## 3.1 DSL Philosophy

- Graph-first
- Declarative
- Human-readable
- Git-diff friendly
- Exportable

---

## 3.2 Core Concepts

### Sources

Any entity can be a source:

```
source raw.orders
source api.salesforce
source file.csv
```

### Models

```
model base_orders:
  from raw.orders
```

### Variables

```
var region = 'EU'
var execution_mode = 'incremental'
```

### Components (future)

Reusable building blocks:

```
component enrich_customer:
  input: base_orders
  output: enriched_orders
```

---

## 3.3 DSL Requirements

- Must compile into GraphDocument
- Must support partial parsing (live typing)
- Must support validation + diagnostics
- Must support export to:
  - SQL
  - dbt
  - JSON
  - procedural pipelines

---

# 4. Component System Architecture

## 4.1 Component Types

### UI Components (visual)

- Button
- Card
- Table
- Panel

### Domain Components

- RunRow
- EventRow
- GraphNode
- PlanBlock

### Structural Components

- Layout containers
- Split views
- Panels

---

## 4.2 Component Principles

- Stateless where possible
- Controlled via props
- Styled via design tokens
- Composable

---

# 5. Theming System

## 5.1 Theme Modes

- Light
- Dark

## 5.2 Implementation

Use design tokens:

```
--color-bg
--color-text
--color-primary
```

## 5.3 Impact

Themes affect:

- all components
- graph colors
- editor colors

---

# 6. Layout System

## 6.1 Dynamic Layouts

Support:

- Collapsible sidebar
- Resizable panels
- Split views

---

## 6.2 Graph Authoring Layout

```
Editor | Graph
```

Modes:

- Editor only
- Graph only
- Split

---

## 6.3 Panel System

Bottom panel:

- Problems
- Logs
- SQL
- Plan

---

# 7. Git-First Architecture

## 7.1 Principle

Everything is versioned in Git.

## 7.2 Stored Entities

- DSL files
- Plans
- Config
- Metadata

---

## 7.3 Benefits

- diff-friendly
- reproducible
- auditable

---

# 8. Export System

## 8.1 Export Targets

- SQL
- dbt
- JSON
- Graph format
- Procedural pipeline

---

## 8.2 Flow

```
DSL â†’ Graph â†’ Plan â†’ Export
```

---

# 9. Backend Contracts

## 9.1 Required Endpoints

### Runs

- GET /runs
- GET /runs/:id

### Events

- GET /runs/:id/events

### Plans

- GET /plans/:id
- POST /plans/compile

### Lineage

- GET /lineage/:planId

### Control

- POST /runs/start
- POST /runs/:id/retry

---

## 9.2 Data Requirements

Backend must provide:

- deterministic plan
- event stream
- lineage graph
- execution status
- metrics

---

# 10. Open Points

## DSL

- final syntax definition
- component system integration

## Graph

- layout algorithm
- large graph handling

## Editor

- partial parsing performance
- autocomplete

## Backend

- contract stability
- plan versioning

## Export

- mapping fidelity
- multi-target support

---

# 11. Timeline (Updated)

## Phase 1 â€” Foundation

- Setup project
- Shell

## Phase 2 â€” Core UI

- Runs
- Navigation

## Phase 3 â€” Graph

- React Flow
- GraphDocument

## Phase 4 â€” Events

- Log system

## Phase 5 â€” DSL

- Editor
- Parser
- Preview

## Phase 6 â€” Advanced

- Plan Inspector
- Observability
- Control Panel

---

# 12. Final Note

This architecture is:

- modular
- extensible
- deterministic
- Git-first
- graph-first

---

# END
