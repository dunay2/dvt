---
title: W4.1 Canvas Node Workbench hardening plan
status: Proposed
date: 2026-08-08
last_reviewed: 2026-08-08
owners:
  - apps/web
planning_type: proposal
lane: E
github_epics:
  - 2195
  - 2254
github_issues:
  - 2262
  - 2255
---

# W4.1 Canvas Node Workbench Hardening Plan

## Purpose

Harden the existing Canvas Node Workbench without introducing a second editor, command path, persistence authority, connection model, state store, registry, or generic form engine.

The product outcome is a professional and coherent authoring surface in which user-visible gestures converge on existing semantic commands, editable values remain owned by their current Graph Draft or file/YAML authority, derived facts remain read-only, and critical flows are proven through the existing browser/acceptance rails.

## Baseline

Implementation branch: `hardening/canvas-workbench-ux`.

Baseline commit: `main@32cfaf6d31fa5ca789bdb390def95d27f5d71f59`.

PR: #2261.

Owning task: #2262.

Acceptance gate: #2255.

Connection/resource semantics remain owned by #2256/#2257 and are explicitly out of scope for this PR unless a compatibility correction is strictly required.

## Process deviation

The first two implementation commits on #2261 were created before this W4.1 proposal and before #2262 became the single owning task. That ordering does not satisfy the normal documentation-first requirement.

Do not rewrite or squash history to manufacture compliance. The deviation is retained as reviewable history. From this document forward, no additional production change is made without being covered by this plan and the issue acceptance contract.

## Existing authorities to preserve

- `CanvasNodeShell`: node-shell gesture owner.
- `CanvasNodeContextMenuModel`: presentation/action-availability owner.
- `onInspectNode`: contextual Workbench focus command seam.
- `onOpenNodeCode`: existing node-code command seam.
- `CanvasNodeWorkbenchPanel` and overlay: current contextual Workbench presentation owner.
- `CanvasDraftSession`: sole Web aggregate/session for Graph Draft authoring.
- `CanvasInspectorNodeDraft`: transient UI draft only.
- `NodePropertiesReadModel`: passive property projection only.
- workspace file working tree and dbt YAML mutation rails: authoritative file-backed dbt editing.
- explicit execution-selection command: sole owner of execution selection.

## Current verified gaps

1. Node double-click previously opened the generic Workbench even when the existing code action was available.
2. Visual/Workbench focus and execution selection are different concepts; double-click must never dispatch execution selection.
3. The Node Workbench header exposes a text close action but no contextual help affordance matching the requested professional/accessibility posture.
4. Remaining W4 production literals bypass localization in touched authoring surfaces.
5. `canEditNode` is too coarse to explain file-backed dbt mixed authority; this PR must not make derived dbt facts writable merely to make the UI look complete.
6. The full persist/reload promise remains an acceptance concern under #2255 and cannot be replaced with mocked-only component evidence.

## Selected design

### Gesture routing

Double-click resolves the existing presentation actions:

```text
code action available
  -> existing open-node-code command
else Workbench inspection available
  -> existing contextual Workbench command
else
  -> no misleading action
```

Context menu, floating toolbar, Workbench Code tab and double-click may coexist only because they dispatch the same semantic owner.

### Workbench header

Use the existing UI primitives and copy catalog.

- keep the node title/kind as the left context block;
- place contextual help and close controls together at the right edge;
- use icon-led controls with accessible names;
- help content is a focus/hover tooltip or bounded contextual popover, never permanent body prose;
- close remains the existing hide command and retains focus restoration through the overlay;
- no global help subsystem is introduced.

### Authoring truth

Graph Draft supported fields continue through the existing Inspector draft/apply/CAS lifecycle. File-backed dbt SQL/YAML edits continue through their existing authorities. Passive/artifact-derived fields remain passive.

No generic property store or schema-form engine is added.

## Interaction invariants

- normal focus does not mutate execution selection;
- double-click does not mutate execution selection;
- disabled read actions are not executed;
- closing Workbench restores node focus where the current overlay already provides that behavior;
- moving/closing presentation surfaces cannot invent persistence;
- every retained visible action produces an observable result or is absent;
- unsupported edits are read-only/unavailable with truthful copy, never fake disabled authoring.

## UX quality contract

The touched Workbench surface must be:

- sober and technical rather than decorative;
- visually dense without clipping or overlap;
- keyboard reachable with visible focus;
- consistent in iconography and action placement;
- localized in ES and EN;
- usable at normal desktop and bounded narrow viewport sizes already supported by Canvas;
- free of permanent explanatory prose when contextual help is sufficient.

## Implementation cuts

### Cut A — gesture truth

- route double-click through existing code/Workbench actions;
- prove disabled actions fail closed;
- prove execution-selection actions are never double-click targets.

### Cut B — Workbench header presentation

- add localized contextual help copy;
- reuse the existing tooltip/popover primitive;
- convert close/help to right-aligned icon-led controls with accessible labels;
- preserve overlay drag and close/focus behavior;
- add focused accessibility/layout behavior tests.

### Cut C — touched authoring copy / truth

- remove remaining visible literals only in W4 surfaces changed by this PR;
- do not widen to repo-wide i18n;
- preserve current Graph Draft and dbt authority boundaries.

### Cut D — evidence

- run focused Web unit/typecheck/lint tests;
- reuse #2255 for browser/service-backed persist/reload and product UAT evidence;
- record any product defect that prevents a required live step instead of bypassing it with direct storage/API manipulation.

## Explicit non-goals

- #2256/#2257 connection model implementation;
- backend/API changes;
- a new editor or Workbench;
- a second authoring aggregate/store;
- a generic JSON-schema form engine;
- plan/run/history/cost expansion;
- repository-wide visual redesign;
- rewriting historical WUX/CUX closeouts or plans to match current source.

## Validation

Required before the PR is review-ready:

- focused node-shell gesture tests;
- focused Workbench panel/overlay tests;
- ES/EN copy tests for touched states;
- Web typecheck and lint;
- relevant Web unit/presentation suites;
- relevant repository CI;
- acceptance evidence or explicit bounded blocker posted to #2255;
- QA review of the exact final head;
- PR left open for product-owner review, never auto-merged.

## Definition of Done

- [ ] double-click uses one existing semantic command owner and never execution selection;
- [ ] Workbench help/close controls satisfy keyboard, accessible-name, placement and clipping requirements;
- [ ] no new command/store/persistence mechanism exists;
- [ ] touched visible W4 copy is localized;
- [ ] Graph Draft/file-backed dbt authority remains truthful;
- [ ] focused tests, Web quality gates and remote CI pass;
- [ ] #2255 contains reproducible acceptance evidence or an explicit product blocker;
- [ ] QA findings are resolved or have an owning issue;
- [ ] #2261 remains open for explicit owner review.
