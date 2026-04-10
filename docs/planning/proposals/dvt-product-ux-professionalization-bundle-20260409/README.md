# DVT Product UX Professionalization Bundle

This bundle captures a product and UX audit of `dunay2/dvt` grounded in the
real `apps/web` surfaces plus benchmark references for large boards, operator
workbenches, and plugin-oriented products.

## Purpose

Raise the frontend from a collection of technical screens to a professional
operator product with:

- a stable workbench grammar;
- clearer flow between authoring, review, and runtime investigation;
- better use of space and density;
- predictable plugin integration;
- a visual system that is governed instead of route-local.

## Governance Position

This bundle is not canonical on its own.

It is a proposal and rationale pack that feeds active Lane E work. Canonical
task ownership remains in:

- `docs/planning/state/agent-lane-e.yaml`
- `docs/architecture/components/web/*`
- the approved frontend roadmap and workbench architecture docs

The active extracted slices from this bundle are documented in:

- `docs/10-governed-slice-extraction-and-lane-e-mapping.md`

## What It Contains

- `docs/00-executive-summary.md`
  Product-level decisions and priorities.
- `docs/01-market-benchmarks.md`
  Reference product benchmark notes.
- `docs/02-dvt-current-state-audit.md`
  Audit of the current frontend and shell.
- `docs/03-target-product-grammar-and-flows.md`
  Target shell grammar, route posture, and main task flows.
- `docs/04-visual-system-and-style-guide.md`
  Operator-workbench visual direction, token posture, and density rules.
- `docs/05-plugin-ux-integration-contract.md`
  UX policy for governed plugin docking and contribution seams.
- `docs/06-impact-matrix.md`
  Implementation impact readout tied to the component matrix.
- `docs/07-rollout-plan.md`
  Sequenced rollout aligned to Lane E work.
- `docs/08-doc-and-code-drift-notes.md`
  Notes where the live repo already differs from stale documentation claims.
- `docs/09-wireframes-and-layouts.md`
  Target wireframes for shell, Canvas, Runs, and Plugins.
- `styles/*.css`
  Reference CSS for typography, density, and theme exploration.
- `references/*.md`
  Repo surfaces and external references used for the audit.

## Main Thesis

DVT should converge toward an operational workflow studio with:

- a persistent shell;
- a low-noise activity rail;
- a central route-level workspace;
- a contextual inspector;
- a bottom diagnostics surface;
- governed plugin docking points;
- a visual language that reads like an operator workbench instead of a glossy
  dashboard.

## How To Use This Bundle

Use it to:

- extract governed slices into Lane E tasks;
- refine active architecture and UX docs;
- guide implementation order without rewriting `apps/web`;
- identify which current route surfaces need token cleanup, shell alignment, or
  plugin-governance work.

Do not use it to:

- override active lane ownership;
- declare implementation complete on its own;
- introduce a second shell model;
- copy style experiments directly into production without token convergence.

## Scope Notes

This bundle does not modify runtime behavior by itself.

It does not ship font binaries. Any typography guidance here is limited to
recommended stacks and token posture.
