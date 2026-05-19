---
title: F-17-B Fowler Analysis - Monaco Diff Review Surface
status: Accepted
date: 2026-05-19
owner: Web / Architecture
planning_type: analysis
---

# F-17-B Fowler Analysis - Monaco Diff Review Surface

## Context

`F-17-B` exists to make Diff a mature review surface for SQL and structured
payload comparison without turning DVT into a browser IDE. The branch analysis
found that implementation had already moved ahead of planning: `SqlDiffPanel`
and `CatalogDiffPanel` already render `MonacoDiffViewer`, but the planning task
remained queued and the component lacked local semantic documentation.

The useful work is therefore closure, not reinvention.

## Mature-System Comparison

Mature review systems such as GitHub compare views, database migration review
tools, and IDE diff panes share four traits:

- the shell owns navigation and context;
- diff panes own text comparison, not workflow authority;
- the diff surface is read-only unless a separate edit command exists;
- large editor libraries are isolated behind lazy, intention-revealing
  component APIs.

DVT now follows that posture for Diff. `DiffView` composes the route workbench,
`DiffTabs` owns tab placement, `SqlDiffPanel` and `CatalogDiffPanel` adapt
domain-specific documents to the diff primitive, and `MonacoDiffSurface` binds
the third-party editor with DVT read-only invariants.

## Improved Patterns

| Area               | Pattern improved          | Result                                                               |
| ------------------ | ------------------------- | -------------------------------------------------------------------- |
| Route composition  | Application Controller    | `DiffView` stays a route composer rather than a Monaco host.         |
| Review payloads    | Presentation Model        | SQL and catalog documents are derived before rendering.              |
| Editor integration | Gateway / Adapter         | `MonacoDiffViewer` hides lazy loading and the third-party import.    |
| Drift prevention   | Semantic Fitness Function | Architecture test checks ownership, docs, and read-only constraints. |

## Antipatterns Detected

| Antipattern             | Finding                                                              | Resolution                                                              |
| ----------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Documentation drift     | Planning said Monaco Diff was queued while code already rendered it. | Add F-17-B component guide, stories, plan, and analysis.                |
| Hidden authority        | Monaco could become perceived route or shell owner.                  | Guard `DiffView` and `DiffTabs` against direct Monaco imports.          |
| Test-only confidence    | Existing tests proved rendered content, not architecture posture.    | Add semantic architecture guard for read-only and diff-only invariants. |
| Responsibility overload | Diff panels were readable but did not state owned concerns.          | Add module-level owned concern docblocks.                               |

## Component Grouping

The component boundary is:

- `apps/web/src/app/views/DiffView.tsx` - route application controller;
- `apps/web/src/app/views/diff/DiffTabs.tsx` - route-local tab composition;
- `apps/web/src/app/views/diff/SqlDiffPanel.tsx` - SQL review adapter;
- `apps/web/src/app/views/diff/CatalogDiffPanel.tsx` - catalog review adapter;
- `apps/web/src/app/components/monaco/MonacoDiffViewer.tsx` - lazy public
  viewer API;
- `apps/web/src/app/components/monaco/MonacoDiffSurface.tsx` - Monaco binding.

The grouping intentionally excludes Canvas shell ownership, Code editing, and
Artifacts read-only inspection. Those are separate product surfaces.

## Teachings For Future Work

- If code lands before planning state advances, close the drift immediately
  instead of creating a second feature narrative.
- A third-party UI primitive needs a local semantic adapter even when it is
  already a React component.
- Read-only posture must be guarded in code, docs, and tests; UI copy alone is
  not enough.
- Route workbenches should expose component guides before follow-on slices reuse
  their local patterns.

## Repetitions

The previous repetition was conceptual: SQL diff and catalog diff both embedded
Monaco behavior locally. The current grouping keeps a single `MonacoDiffViewer`
API and lets panels only choose language, labels, and content.

Residual repetition left intentionally: `SqlDiffPanel` and `CatalogDiffPanel`
both render route cards around the viewer. That is acceptable because their
headers and summaries are domain-specific.

## Code And Documentation Drift

Drift removed:

- planning task moved from queued implementation intent to active closure;
- code-owned concerns are stated at module heads;
- component guide now documents public API, invariants, transitions, and
  consumers;
- user stories now cover success, loading, unavailable, error, and governance
  scenarios.

Drift still outside this slice:

- `F-17-C` must close Artifacts Monaco read-only viewer semantics;
- `F-17-E` must harden bundle isolation beyond the current lazy component API;
- `F-17-F` must converge backend-backed diff contracts when those rails land.

## Opportunities

| Opportunity                 | Fowler pattern          | Next action                                      |
| --------------------------- | ----------------------- | ------------------------------------------------ |
| Bundle-size hardening       | Lazy Load / Gateway     | Keep under `F-17-E`.                             |
| Artifact viewer convergence | Shared Kernel avoidance | Implement `F-17-C` with separate Artifacts docs. |
| Backend diff truth          | Query Model             | Keep under `F-17-F` after live rails are ready.  |

## ADR Decision

No new ADR is required. The accepted Monaco rationale already decides that
Monaco is an embedded review primitive, not the shell or Canvas owner. This
slice records implementation truth and adds a Semantic Fitness Function around
that decision.
