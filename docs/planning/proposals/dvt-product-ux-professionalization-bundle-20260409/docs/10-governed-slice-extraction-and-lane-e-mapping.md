---
title: Governed Slice Extraction And Lane E Mapping
status: Draft
owner: Product / UX / Frontend
last_reviewed: 2026-04-09
planning_type: proposal
---

# Governed Slice Extraction And Lane E Mapping

## Purpose

This note extracts the DVT product UX professionalization bundle into governed
frontend slices that can be executed through Lane E without turning the bundle
into a parallel roadmap.

The bundle remains a proposal pack. Lane E remains the canonical task registry.

## Slice A: Shell Grammar And Contextual Workbench Topology

### Bundle sources

- `docs/00-executive-summary.md`
- `docs/03-target-product-grammar-and-flows.md`
- `docs/06-impact-matrix.md`
- `docs/07-rollout-plan.md`

### Primary Lane E ownership

- `F-15` owns the workbench UX contract and the stable shell grammar.

### Supporting Lane E tasks

- `F-01` owns shell cleanup and top-bar simplification.
- `F-18` owns the bottom diagnostics surface convergence.
- `F-23` owns the contextual role of `Code` and `Diff` for file-history review.

### Why this maps to existing work

The bundle's persistent shell, activity rail, center workbench, right
inspector, and bottom diagnostics model is already the same problem space owned
by `F-15`. The bundle sharpens that direction, but it does not justify a second
shell-grammar task.

## Slice B: Operator Workbench Visual System And Token Convergence

### Bundle sources

- `docs/02-dvt-current-state-audit.md`
- `docs/04-visual-system-and-style-guide.md`
- `docs/06-impact-matrix.md`
- `docs/07-rollout-plan.md`
- `styles/dvt-professional-typography.css`
- `styles/dvt-professional-density.css`
- `styles/dvt-professional-theme.tokens.css`
- `styles/dvt-workbench-monaco-theme-notes.md`

### Primary Lane E ownership

- `F-24` owns this slice as a new governed task.

### Related Lane E tasks

- `F-15` supplies the shell grammar this visual system must serve.
- `F-17` consumes Monaco theming and embedded editor alignment.
- `F-18` consumes diagnostics-panel density and state rules.
- `F-19` remains separate because it governs the Marquez-style open-data
  direction, not the operator workbench visual system.

### Why a new task is required

Lane E does not currently have a single task that owns operator-workbench
tokens, density modes, route-header surface rules, or the migration away from
route-level `slate-*` and hex hardcodes. Without a dedicated task, that work
would diffuse across shell cleanup, Monaco, and open-data styling slices.

## Slice C: Plugin UX Integration Contract And Governed Docks

### Bundle sources

- `docs/00-executive-summary.md`
- `docs/03-target-product-grammar-and-flows.md`
- `docs/05-plugin-ux-integration-contract.md`
- `docs/06-impact-matrix.md`
- `docs/07-rollout-plan.md`

### Primary Lane E ownership

- `F-25` owns this slice as a new governed task.

### Related Lane E tasks

- `F-15` supplies the shell and dock grammar.
- `F-21` consumes the contract for future template and source-generation
  workbenches.
- `F-23` consumes the contract for contextual `Code` and `Diff` ownership.

### Why a new task is required

The repo already has technical plugin seams, but Lane E does not yet own a
single UX contract for plugin docking, route metadata, command-palette
contributions, bottom-panel contributions, or plugin readiness semantics. The
bundle contains the design baseline, but governance needs a first-class task.

## Implementation order

1. Close shell grammar decisions through `F-15`, `F-01`, `F-18`, and `F-23`.
2. Freeze the operator-workbench visual system in `F-24` before broad styling
   cleanup starts.
3. Freeze the plugin UX integration contract in `F-25` before new plugin
   surfaces or workbench docks are introduced.

## Non-goals

- This note does not replace the canonical frontend architecture pages.
- This note does not authorize code changes by itself.
- This note does not make the bundle the roadmap of record.
