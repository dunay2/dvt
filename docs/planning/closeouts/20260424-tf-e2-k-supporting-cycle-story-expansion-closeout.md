---
title: TF-E2-K Supporting Cycle Story Expansion Closeout
status: Accepted
date: 2026-04-24
owners:
  - Frontend
  - Architecture
---

# TF-E2-K Supporting Cycle Story Expansion Closeout

## Summary

The original `TF-E2-K` story pack already captured the operator-visible host
cycles.

This follow-up closes the next planning gap before implementation:

- continuation from typed host cycle into `preview/run`
- authoritative first-canvas creation through the draft lifecycle seam
- explicit fail-closed creation behavior when authority is blocked or already
  present
- dedicated ownership for host-cycle route scenarios instead of burying them in
  generic controller defaults

## Governing sources

- [TF-E2-K playground complete-cycle stories 2026-04-24](../proposals/mandatory/frontend-and-ux/tf-e2-k-playground-complete-cycle-stories-20260424.md)
- [Canvas playground host component](../../architecture/components/web/graph/canvas-playground-host-component.md)
- [Canvas authoring runtime component](../../architecture/components/web/graph/canvas-authoring-runtime-component.md)
- [Planning control tower](../state/planning-control-tower.md)
- [AI work protocol](../../guides/ai-work-protocol.md)

## Think-first analysis

- Problem summary:
  The route already had most host states, but the remaining work was not
  decomposed into the final operator/supporting cycles that still need proof.
- Root cause:
  Planning had the first cycle set, but not yet the lifecycle-authority and
  fail-closed creation stories that sit underneath the host UX.
- Constraints and invariants:
  - `Workspace` remains the persisted container
  - `Canvas` remains a document/tab
  - first-canvas success must come from authoritative draft truth
  - host-cycle scenarios must stay story-shaped
- Selected option and rationale:
  Expand the existing `TF-E2-K` story pack instead of creating a competing
  proposal, then map the new authority-cycle work into one additional slice.

## Real work performed

- Extended
  [tf-e2-k-playground-complete-cycle-stories-20260424.md](../proposals/mandatory/frontend-and-ux/tf-e2-k-playground-complete-cycle-stories-20260424.md)
  with:
  - `US-E2-021` authoritative first-canvas creation
  - `US-E2-022` fail-closed first-canvas rejection
  - dedicated diagrams for both authority cycles
- Updated
  [canvas-playground-host-component.md](../../architecture/components/web/graph/canvas-playground-host-component.md)
  to declare dedicated host-cycle scenario-module ownership.
- Updated
  [canvas-authoring-runtime-component.md](../../architecture/components/web/graph/canvas-authoring-runtime-component.md)
  to declare a narrow first-canvas create-command seam.
- Updated
  [agent-lane-e.yaml](../state/agent-lane-e.yaml)
  so `TF-E2-K-G` is active and `TF-E2-K-I` now tracks the authority-cycle proof
  and test-support extraction work.

## Validation

- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm docs:gov:manifest`

The broader package and `verify:prepush` validation remain part of the
implementation commits that follow this docs-first milestone.

## No-debt evidence

- No rules were relaxed.
- No planning was left only in chat or PR text.
- No fake scope reduction was introduced.

## No-stub evidence

- The added material is canonical planning and architecture documentation.
- No placeholder runtime path or fake host behavior was added.
