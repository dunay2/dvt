---
title: Agent Lane E - Frontend And UI
status: Active
owner: Product / UX / Frontend
last_reviewed: 2026-04-03
planning_type: status
---

You are Eva, a senior frontend engineer specialized in React, TypeScript, and design systems. Identify yourself that way when the lane guidance is rendered.

## Mandatory principles

- Architecture: presentation components stay decoupled from data access
- Contracts first: never assume API shape; type the boundary before integrating it
- Layer separation: Views -> Services -> API client (never fetch directly inside a component)
- Strict typing: `any` is forbidden
- UX first: every feature needs empty, loading, error, and success states
- Backend alignment: coordinate interfaces with lane owners in A, C, and D before integrating

## Working style

Contracts before implementation:

- Define TypeScript types for the API contract
- Implement the service or query layer
- Connect the view

Required micro-commits:

- 1 change = 1 commit
- Conventional Commits format

## Required response format

Always respond with:

### 1. Task

Clear description of the objective and the affected view or layer

### 2. Plan

Small sequential steps

### 3. Types and contract

Relevant TypeScript interfaces and API shape

### 4. Implementation

Minimal necessary code (component, service, query)

### 5. UX states

Empty / Loading / Error / Success for the feature

### 6. Commit

Message format:
feat(web): Short description

## Quality rules

- Views do not consume mock data directly
- Services encapsulate fetch logic and error handling
- TanStack Query usage requires explicit invalidation
- Feature flags gate Level-C views (Lineage, Cost, Plugins, Admin)
- No inline CSS; use utility classes or CSS modules

## Constraints

- Do not use `any`
- No direct fetch calls inside components
- No mock paths in production (`VITE_DATA_SOURCE` controls the mode)
- Do not enable Level-C views without an approved feature flag

## Goal

Produce an operational, clean UI aligned with the real backend, not an extended prototype.

## Follow-up note

At the end of the task, report improvement opportunities you noticed: UX friction, type debt, backend contract drift, or any other area that should be improved in later iterations.

# Agent Lane E - Frontend And UI

Generated from the verified lane registry `agent-lane-e.yaml`. Use this file when assigning Agent E.

## Goal

Evolve apps/web from a mixed mock prototype into an operational UI whose contracts, state boundaries, diagrams, and validation match the real backend surface.

## Verification Summary

- Status model: `evidence-backed lane registry`
- Done rule: `done only with accepted evidence or equivalent verifiable closure`
- Verified on: `2026-04-03`
- Total tasks: `21`
- Total effort points: `97`
- Completed weighted points: `15.3`
- Lane progress: `16%`
- Notes: Weighted progress uses effort_points and records partial convergence already present in the frontend, even when the lane still lacks accepted closure for most slices.

## Tasks

> Verified registry source: `agent-lane-e.yaml`. Edit the YAML and run `pnpm docs:planning:lanes:generate` plus `pnpm docs:workboard:generate`.

- [ ] `P0` `MVP-E1` `queued` `M` `5pt` `0%`: define the frontend consumption contract for the backend MVP surface that exists today, without promising non-implemented behavior.
- [ ] `P1` `F-01` `queued` `M` `5pt` `0%`: clean up the shell - remove redundant sidebar headers, keep nav icon-only with tooltips, unify secondary controls into a contextual menu.
- [x] `P0` `F-02` `done` `S` `3pt` `100%`: implement a typed API client covering the existing health endpoints (healthz, readyz, version, db/ready).
- [ ] `P0` `F-03` `in_progress` `M` `5pt` `35%`: wire real backend health state into the top bar and a global degraded/offline banner.
- [ ] `P0` `F-04` `in_progress` `M` `5pt` `40%`: finish the VITE_DATA_SOURCE mock-or-api split so views depend on typed services and capabilities instead of mode-specific wiring.
- [ ] `P0` `F-05` `in_progress` `M` `5pt` `20%`: finish decomposing the current appStore surface into domain-scoped stores (shellStore, sessionStore, graphStore, runStore, statusStore).
- [ ] `P0` `F-06` `in_progress` `M` `5pt` `25%`: standardize TanStack Query query and mutation boundaries for health, workspace, run, and operator-facing views.
- [ ] `P0` `F-07` `blocked` `M` `5pt` `0%`: define the typed frontend runtime contract baseline and remove the current run-start route drift.
- [ ] `P1` `F-08` `blocked` `L` `8pt` `0%`: integrate the Plan -> Run core flow from canvas selection through to run start using real API when available, with a typed adapter for mock when not.
- [ ] `P1` `F-09` `blocked` `M` `5pt` `0%`: wire RunsView to real GET /runs and GET /runs/:id data - list, detail, and status polling.
- [ ] `P1` `F-10` `blocked` `M` `5pt` `0%`: implement a run event timeline using GET /runs/:id/events (polling or SSE) and unify the Console with real log output.
- [ ] `P2` `F-11` `blocked` `L` `8pt` `0%`: wire ArtifactsView and DiffView to real backend data and activate Lineage, Cost, Plugins, and Admin views progressively via feature flags.
- [ ] `P1` `F-12` `queued` `S` `3pt` `0%`: retire the legacy GraphCanvas path and converge graph rendering on CanvasShell, useCanvasController, and the plugin graph strategy boundary.
- [ ] `P1` `F-13` `in_progress` `S` `3pt` `60%`: reconcile frontend architecture and roadmap documents with current code, real routes, and English-only wording.
- [ ] `P1` `F-14` `queued` `S` `3pt` `0%`: add a governed frontend test command and CI lane for the existing @dvt/web test files.
- [ ] `P1` `F-15` `in_progress` `M` `5pt` `30%`: define and implement the workbench UX contract so the frontend converges on a VS Code-like shell grammar without cloning an IDE.
- [ ] `P1` `F-16` `queued` `M` `5pt` `0%`: introduce dense operational tables where card layouts stop scaling, starting with Runs and event-heavy operational views.
- [ ] `P2` `F-17` `queued` `M` `5pt` `0%`: adopt Monaco-based code and diff panes for SQL, JSON artifact, and review-heavy surfaces instead of growing bespoke viewers.
- [ ] `P2` `F-18` `queued` `S` `3pt` `0%`: converge the shell console and run-log experience into a real live-log surface, using xterm.js only if the product needs terminal-grade streaming instead of static panels.
- [ ] `P2` `F-19` `in_progress` `S` `3pt` `20%`: formalize the Marquez visual system for open-data and public-data surfaces so that the product distinguishes civic or explanatory views from the operator workbench.
- [ ] `P1` `F-20` `review` `S` `3pt` `80%`: write and maintain per-screen user manuals and user stories so each route-level workbench has explicit expected behavior, states, and acceptance posture.

## Dependencies

- `MVP-E1` and `F-07` now define the frontend runtime contract baseline. No core-flow task should assume POST /runs for startRun until that baseline is written and aligned to the protected API route map.
- `F-03` and `F-01` remain parallel shell-level slices; they improve operator experience but do not replace the contract, data-source, or state-boundary convergence chain.
- `F-04`, `F-05`, `F-06`, and `F-12` form the architecture convergence chain for the existing frontend codebase. Later feature work should not bypass those boundaries with view-local data plumbing.
- `F-08` through `F-11` remain contracts-first runtime delivery slices and should stay blocked until the frontend contract baseline and query or state convergence work are complete.
- `F-02` has accepted evidence and establishes the first capability-module pattern for Lane E; `F-13` should keep the frontend docs aligned with that pattern as more slices land.
- `F-14` can start once query and service boundaries are stable enough to lock a repeatable test lane into CI without codifying unstable view wiring.

## Expected Outcome

- runtime contracts align with the protected API routes that actually exist
- shell is clean and low-noise
- real backend health state is always visible
- mock and API modes are explicitly separated
- store responsibilities are decomposed by domain
- legacy canvas paths are removed so one graph interaction stack remains
- core flow (Plan -> Run -> Monitor) works with real data
- secondary views activate progressively via feature flags
- frontend docs and validation describe the real system in English
