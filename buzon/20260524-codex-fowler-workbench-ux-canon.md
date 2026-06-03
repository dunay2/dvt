---
title: Fowler analysis for DVT workbench UX canon
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-24
planning_type: analysis
---

# Fowler Analysis For DVT Workbench UX Canon

## Fowler Analysis

The workbench UX draft is valuable, but its architectural role must be
classification input rather than runtime authority. Fowler's separation of
concerns lens points to one central issue: shell grammar, route workbench
composition, graph authoring, runtime intent, and command discovery are separate
responsibilities that should not be shipped through one large UX document.

The existing system improved after F-15 by introducing the route workbench frame
and semantic slots. It improved again after F-24 and F-25 by making visual tokens
and plugin docks explicit. The remaining problem is documentation posture: the
draft still looks active enough to be mistaken for a second backlog.

## Mature-System Comparison

Mature tools keep a stable shell contract and allow local surfaces to specialize
inside it. VS Code separates the workbench shell from editor panes, GitHub keeps
global navigation restrained, and NiFi keeps graph construction inside the graph
domain. DVT's mature-system path is the same: top shell for discovery, route
workbenches for route concerns, Canvas components for graph behavior, and
planner/engine rails for execution.

## Antipatterns

- Draft-as-backlog: a draft spec can keep accumulating implicit work after its
  accepted subset has already landed elsewhere.
- Big-design coupling: one document mixes menus, command palette, context,
  Canvas creation, runtime panels, and export semantics.
- Label drift: product labels in draft prose can be copied into route IDs before
  read models and capability registries accept them.
- Shell authority creep: top menus can accidentally become the owner of
  route-local graph mutations.

## Repetitions

- No-left-rail guidance appears in the draft, UX implementation guide, Canvas
  Fowler canon, route frame component, and workbench inventory.
- Command/menu ownership appears in both draft menus and shell documentation.
- Runtime intent appears in both the UX draft and runtime/frontend contract
  docs.

These repetitions are not all harmful, but they need one disposition layer so
readers know which surface is canonical for behavior.

## Drift

The main drift is status drift: the draft is marked `Draft`, but several
accepted decisions already live in F-15, F-24, F-25, F-28, Canvas tab guides,
and the workbench inventory. The canon plan fixes that by adding explicit
frontmatter disposition and routing active behavior to component contracts.

## Opportunities

- Promote future command palette work as a focused task instead of expanding
  the draft.
- Promote route-toolbar extraction separately when routes need shared toolbar
  behavior.
- Keep Canvas label and view-strip changes in the Canvas tab read model.
- Use semantic CI to catch unclassified UX drafts in future governance passes.

## Applied Pattern

The applied pattern is a disposition read model plus semantic fitness function.
`RecordWorkbenchUxCanon` records the classification, `ClassifyWorkbenchUxDisposition`
answers which surface owns a UX claim, and `ValidateWorkbenchShellContract`
keeps shell, route, Canvas, and runtime boundaries separated.
