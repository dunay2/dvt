---
title: 01 Market Benchmarks
status: Draft
owner: Product / UX / Frontend
last_reviewed: 2026-04-17
planning_type: proposal
---

# 01. Market Benchmarks: large workboards and iterative operator workflows

## Why these references

It is not enough to copy products that simply look polished. DVT needs
references that solve at least one of these tensions well:

- a large board or surface,
- repeated movement between overview and detail,
- dense technical operations,
- artifact editing and inspection,
- extension through plugins.

## Key references

### 1. VS Code

**What it contributes**

- very stable shell structure
- clear activity rail
- explorer, editor, and bottom panel working together
- quick open and command palette
- strong context persistence

**What DVT should borrow**

- layout grammar
- keyboard-first switching
- separation between global navigation and active content
- bottom panel as diagnostics, not as a disconnected screen

**What DVT should not copy literally**

- cryptic density
- overly developer-IDE affordances if the operator audience is broader than
  full-time engineers

### 2. dbt Studio IDE

**What it contributes**

- one interface for build, test, run, and versioning
- a work language centered on project and execution

**What DVT should borrow**

- the operator should not feel like they are switching mental applications when
  editing, comparing, and running
- tighter connection between artifact, compilation, and monitoring

**What DVT should not copy literally**

- an editor-first posture if DVT wants Canvas to remain a differentiating
  surface

### 3. Miro

**What it contributes**

- board structure through frames
- navigation between working zones
- wayfinding on large surfaces

**What DVT should borrow**

- frames, sections, and saved areas
- zone navigation on large boards
- treating Canvas as navigable space, not just a node renderer

**What DVT should not copy literally**

- unconstrained placement and visual chaos
- too many floating tools competing for attention

### 4. FigJam / Figma

**What it contributes**

- clear grouping through sections
- strong contextual inspector
- clean hierarchy between canvas, properties, and library

**What DVT should borrow**

- contextual inspector posture
- semantically grouped work areas
- explicit left / center / right structure

**What DVT should not copy literally**

- a toolset optimized for visual design rather than operations

### 5. Grafana

**What it contributes**

- sharp separation between exploration and monitoring
- dense views that still stay readable
- a strong plugin culture

**What DVT should borrow**

- clear split between investigative and summarized operational views
- high density with hierarchy
- plugins as product capability, not as ad hoc hacks

**What DVT should not copy literally**

- panel sprawl
- too many simultaneous surfaces without a strong hierarchy

### 6. Dagster

**What it contributes**

- tight relationship between graph, lineage, and execution
- navigation through assets and dependencies
- an operational model centered on flows and states

**What DVT should borrow**

- closeness between graph, execution, and asset context
- jump paths between node, lineage, and runtime evidence

**What DVT should not copy literally**

- exposing too much conceptual complexity too early

### 7. Backstage

**What it contributes**

- application composition through plugins
- route and navigation composition through governed references
- structural scalability in the frontend

**What DVT should borrow**

- plugins adapting to the shell, not the shell adapting to each plugin
- governed integration of navigation and views

**What DVT should not copy literally**

- the "corporate portal" feel if DVT wants a sharper operational workbench

## Cross-cutting patterns DVT should adopt

### 1. Fixed shell grammar

Every mature product keeps a stable layout grammar. DVT should avoid letting
each route invent its own composition model.

### 2. Action hierarchy

- global actions at the top
- navigation on the left
- local actions near active content
- contextual actions in the inspector
- diagnostics at the bottom

### 3. Context persistence

Iterative users do not want to restart from zero. Persist:

- layout
- recent route
- selection
- filters
- active tab
- saved view

### 4. Progressive disclosure

Advanced capability should exist without overwhelming the first layer. Start
with the task, then reveal the detail.

### 5. Density with order

Density is useful when it improves comparison, scanning, and action speed. It
fails when it destroys hierarchy or increases visual noise.
