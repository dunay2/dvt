---
title: Marquez Public-Data Visual System User Stories
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-05-22
planning_type: architecture
---

# Marquez Public-Data Visual System User Stories

## US-MARQUEZ-001: Identify A Public-Data Surface

As a product designer, I want a clear rule for when Marquez applies so that
operator workbench routes do not inherit public explainer styling.

Acceptance:

- public-data, civic, and explanatory open-data routes may use Marquez;
- Canvas, Runs, Code, Diff, Artifacts, Templates, Plugins, Admin, and Cost do
  not use Marquez by default;
- proposals name the route intent before selecting the visual system.

## US-MARQUEZ-002: Read A Data Story With Provenance

As an external reader, I want metrics and claims to include source and freshness
signals so that I can understand whether the public-data story is current.

Acceptance:

- public-data metrics show source and update cadence;
- caveats are visible near the claim they qualify;
- methodology is reachable without opening an operator panel.

## US-MARQUEZ-003: Reuse Mature Primitives Without Copying The Workbench

As a frontend engineer, I want to reuse shell, chart, and primitive components
without adopting dense operator chrome so that public-data pages stay
maintainable.

Acceptance:

- Radix/shadcn primitives and chart components remain allowed;
- command palettes and dense operational tables are not default page structure;
- narrative sections and dataset cards own the first public-data composition.

## US-MARQUEZ-004: Prevent Visual-System Drift

As an architect, I want an architecture guard to keep Marquez scoped to
public-data surfaces so that future frontend work does not create an unbounded
second theme.

Acceptance:

- component docs define public API, invariants, transitions, and consumers;
- the UX guide states that Marquez must not be applied to operator workbench
  routes;
- the reference stack states that Marquez is not a dependency.
