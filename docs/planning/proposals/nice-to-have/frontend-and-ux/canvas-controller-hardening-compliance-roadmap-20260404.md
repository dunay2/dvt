---
title: Canvas controller hardening compliance roadmap 2026-04-04
status: Active
owner: Frontend / Architecture
last_reviewed: 2026-04-04
planning_type: proposal
---

# Canvas controller hardening compliance roadmap 2026-04-04

## Purpose

Track QA hard findings and close them in a deterministic item-by-item sequence.

The execution target is the `F-05` canvas hardening chain in Lane E.

## Governing Sources

- [Agent Lane E](../../../state/agent-lane-e.yaml)
- [Canvas controller hard gate](canvas-controller-document-first-hard-gate-20260404.md)
- [Canvas controller current-to-target architecture](../../../../architecture/frontend/graph/canvas-controller-current-to-target-architecture.md)

## Compliance Items

### Item 1 - Complete hard-gate negative invariants

Status: Completed

Scope:

- add missing negative tests required by the hard gate;
- keep tests route-level and implementation-agnostic.

DoD:

- query error returns safe controller state without route crash;
- overlay fallback from `cost` to `runtime` is verified when cost data disappears;
- navigation handoff after run start is verified as isolated route-side effect.

### Item 2 - Enforce controller SRP size gate

Status: Completed

Scope:

- reduce `useCanvasController.ts` below 200 lines;
- keep it as composition facade only.

DoD:

- `useCanvasController.ts` <= 200 lines;
- controller keeps orchestration only;
- heavy derivation is extracted to dedicated modules.

### Item 3 - Enforce test-file SRP size gate

Status: Completed

Scope:

- split monolithic test suite into harness and focused suites;
- keep every test file <= 200 lines.

DoD:

- no canvas controller test file exceeds 200 lines;
- harness stays reusable and minimal;
- core and persistence tests remain green.

### Item 4 - Raise boundary quality toward hexagonal target

Status: Completed

Scope:

- continue reducing direct route coupling to broad app-store surface;
- prepare seams for route-safe facade consumption.

DoD:

- route composition points are explicit and testable;
- no regression in current runtime contract behavior.

## Validation Baseline

Each item closes with:

1. `pnpm test:web`
2. `pnpm --filter @dvt/web typecheck`
3. `pnpm verify:prepush`
