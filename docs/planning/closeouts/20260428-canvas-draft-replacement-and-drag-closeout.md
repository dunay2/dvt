---
title: Canvas draft replacement and drag recovery
status: Active
date: 2026-04-28
owners:
  - web
planning_type: closeout
---

# Closeout: Canvas Draft Replacement And Drag Recovery

## Think-First Analysis

Problem summary:

- A local `tenant/project/dev` workspace displayed persisted nodes from an older
  draft, but the route had no visible way to create a fresh canvas once a draft
  record already existed.
- The visible cards were reported as not movable. The viewport already gates
  drag through effective edit permission, but the rendered node did not declare
  an explicit React Flow drag surface.

Root cause:

- The first-canvas command was intentionally fail-closed when
  `graphDraftQuery.data.record` existed. That protected existing authoring data,
  but it also left no governed recovery action for stale persisted local data.
- React Flow drag was enabled only by `nodesDraggable`; the concrete node shell
  relied on incidental child event propagation while also being wrapped in a
  context-menu trigger.

Constraints and invariants:

- Governing sources: `AGENTS.md`,
  `docs/planning/status/governance-document-rule-inventory.md`,
  `docs/guides/ai-work-protocol.md`,
  `docs/guides/testing-and-ci-capabilities.md`, and
  `docs/architecture/components/web/graph/graph-frontend-architecture.md`.
- Canvas is a singular workspace draft canvas document in the current model.
  This slice must not pretend that multiple canvases exist.
- Draft replacement must use the protected draft repository and current
  revision compare-and-swap guard.
- Read-only and blocked route postures must keep graph mutation disabled.

Options considered:

- Delete the local Postgres row manually. Rejected because it fixes only this
  machine and bypasses the governed product path.
- Always overwrite existing drafts on create. Rejected because it could destroy
  user work through an old first-canvas action.
- Add an explicit replacement command from the host tab strip. Selected because
  it preserves fail-closed first creation and provides a visible recovery path.

Selected option and rationale:

- Add `mode: "replace_current"` to the create-canvas command.
- Keep default `create_first` semantics fail-closed when a draft already exists.
- Surface a confirmed "New canvas" action in the host tab strip for editable
  existing canvas drafts.
- Add an explicit `.canvas-node-drag-surface` handle to tie drag behavior to the
  rendered node shell.

## Pre-Implementation Brief

Mode: Full.

Scope:

- `apps/web/src/app/views/canvas/**`
- `apps/web/src/app/components/canvas/DbtNodeComponent.tsx`
- Graph frontend architecture documentation.

Risks and mitigations:

- Risk: accidental destructive replacement. Mitigation: explicit
  `replace_current` command mode plus confirmation UI plus CAS revision guard.
- Risk: drag is enabled while route is read-only. Mitigation: existing
  effective route permissions still drive `nodesDraggable`, handlers, and button
  disabled state.

Out of scope:

- Multi-canvas data model.
- Manual database cleanup.
- Backend contract changes.

Test coverage plan:

- Negative test: existing drafts remain protected unless `replace_current` is
  present.
- Positive test: explicit replacement saves an empty draft with
  `expectedRevision` set to the current record revision.
- UI test: existing canvas exposes "New canvas" and requires confirmation before
  replacement.
- Negative UI test: replacement action remains disabled when graph edits are
  gated.
- Drag test: the node mapper assigns the explicit drag-handle selector and the
  DVT node shell owns the matching class.

## 2026-04-29 Transitional Shim Removal

### Problem summary

The branch hardening still left real transition surfaces in the active web
graph and shell slice. The highest-risk items were not wording: they were
unused aggregate stores, duplicate fixture/type surfaces, palette aliases, and
service reexports that kept older shapes reachable.

### Root cause

The previous work focused on startup, protected draft reads, replacement, and
drag behavior. It preserved some transition paths to reduce blast radius. That
is below the current target: the active web slice should publish one canonical
path, keep state in named slices, and fail closed for unsupported persisted
values.

### Constraints and invariants

- `AGENTS.md`: no hidden debt, no stubs, no hook bypass, and validation
  evidence.
- `docs/guides/ai-work-protocol.md`: `Slim` maintenance/refactor because this
  removes transitional affordances without adding a new external feature.
- `docs/architecture/reference-architecture.md`: one runtime truth per
  boundary and replaceable infrastructure behind stable ports.
- `docs/architecture/components/web/frontend-fowler-implementation-pattern.md`:
  active Fowler routes must not publish transitional read models or route-level
  fallback behavior.
- `docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md`:
  protected draft reads remain authoritative; unsupported route state fails
  closed.

### Options considered

- Keep the terms as explanatory documentation only.
- Rename only the terms in docs/tests while keeping transitional code.
- Remove transitional affordances in the active web slice and rename tests to
  unsupported or retired semantics.

### Selected option and rationale

Remove active transitional affordances where they are under this slice's
ownership, delete unused aggregate or duplicate modules, and update docs/tests
to describe canonical projection, unsupported data, or retired endpoints
directly. This keeps Fowler boundaries mature: Gateway and projection seams
remain explicit, while route code does not carry silent migration behavior.

### Rejected alternatives

- Keeping palette aliases, because they silently accept unsupported
  persisted values.
- Keeping unimported aggregate stores or duplicate mock/type surfaces, because
  they invite parallel ownership and make future SRP review ambiguous.
- Bulk editing historical archives or contract-versioning governance, because
  those are not active runtime surfaces for this web slice.

## 2026-04-29 Presentation Template Extraction

### Problem summary

The Canvas host/recovery slice still had two places where markup lived next to
state resolution or command construction:

- `CanvasPlaygroundHost.tsx` rendered first-canvas HTML and constructed
  `CanvasCreateCanvasDocumentCommand` objects from button clicks.
- `CanvasRecoveryBanner.tsx` branched over recovery reasons while rendering
  repeated banner HTML and reading Canvas copy directly.

### Selected option and rationale

Extract the HTML into passive templates while keeping the application decisions
in coordinator/model files:

- `CanvasPlaygroundHost.tsx` now selects copy and builds create-canvas command
  DTOs; `CanvasPlaygroundHost.templates.tsx` renders the host card and buttons.
- `canvasRecoveryBannerModel.ts` resolves `CanvasDraftPresentationState` into a
  renderable `CanvasRecoveryBannerViewState`.
- `CanvasRecoveryBanner.tsx` coordinates model plus template; `CanvasRecoveryBanner.templates.tsx`
  renders the banner from resolved state only.

This is positive because it reduces SRP drift without changing user behavior:
templates render, models decide, and command DTO construction stays outside JSX.

## Current Evidence

- `pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts CanvasPlaygroundTabStrip.test.tsx`
  failed before implementation for the missing replacement command and "New
  canvas" action.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
  failed before documentation/encapsulation closure for the missing Fowler
  mailbox, local component guide, and owned-concern docblocks.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
  failed during the CodeScene follow-up because the architecture guard still
  expected inline command conditionals. The guard was updated to require named
  semantic helpers instead.
- `pnpm --filter @dvt/web test -- canvasCreateCanvasDocumentCommand.test.ts CanvasPlaygroundTabStrip.test.tsx CanvasViewport.test.tsx DbtNodeComponent.architecture.test.ts`
  passed.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts canvasCreateCanvasDocumentCommand.test.ts workspaceGraphDraftProjection.test.ts workspaceService.api.test.ts`
  passed after extracting command eligibility, save transitions, edge
  projection, and DBT node-type rule helpers.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
  failed during the node-mapper CodeScene follow-up because
  `MapCanonicalNodeToCanvasNodeArgs` did not exist yet.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts useCanvasViewportGraphModel.test.tsx useCanvasController.core.test.tsx useCanvasController.test.tsx`
  passed after moving canonical-node viewport projection to a named parameter
  object.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
  failed during the tab-strip CodeScene follow-up because
  `CanvasPlaygroundTabs`, `CanvasReplacementAction`, and
  `resolveCanvasReplacementActionState` did not exist yet.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts CanvasPlaygroundTabStrip.test.tsx`
  passed after splitting host tab rendering from replacement-action state and
  command creation.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts canvasPlaygroundTabStripModel.test.ts`
  failed during the SRP/i18n review because
  `canvasPlaygroundTabStripModel.ts` and
  `CanvasPlaygroundTabStrip.templates.tsx` did not exist yet.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts canvasPlaygroundTabStripModel.test.ts CanvasPlaygroundTabStrip.test.tsx`
  passed after separating the tab-strip coordinator, locale-backed replacement
  model, and JSX templates.
- `pnpm --filter @dvt/web test` failed once after that split because two older
  architecture guards still expected the tab-strip docblock and data slot to
  live in the coordinator file.
- `pnpm --filter @dvt/web test -- canvasPlaygroundTabState.architecture.test.ts CanvasShell.architecture.test.tsx canvasStartupAndDraftRecovery.architecture.test.ts canvasPlaygroundTabStripModel.test.ts CanvasPlaygroundTabStrip.test.tsx`
  passed after aligning those guards with the coordinator/template boundary.
- `pnpm --filter @dvt/web test` passed after the guard alignment. The run still
  emits existing React `act(...)` warnings around React Flow/CanvasContent, but
  no tests fail.
- Post-commit Fowler review found one remaining template-boundary leak:
  `CanvasReplacementActionState` mixed `activeCanvasKind` with renderable
  labels and enablement.
- `pnpm --filter @dvt/web test -- canvasPlaygroundTabStripModel.test.ts canvasStartupAndDraftRecovery.architecture.test.ts`
  failed red after requiring `CanvasReplacementActionViewState`.
- `pnpm --filter @dvt/web test -- canvasPlaygroundTabStripModel.test.ts canvasStartupAndDraftRecovery.architecture.test.ts CanvasPlaygroundTabStrip.test.tsx`
  passed after templates consumed only `CanvasReplacementActionViewState`.
- `pnpm --filter @dvt/web test -- canvasStartupAndDraftRecovery.architecture.test.ts`
  passed after adding the semantic architecture guard.
- `pnpm --filter @dvt/web typecheck` passed.
- `pnpm --filter @dvt/web build` passed.
- `pnpm --filter @dvt/web test` passed.
- `pnpm lint` failed once for a new test helper without explicit return type,
  then passed after fixing it.
- `pnpm lint:md` failed once for a closeout evidence table alignment issue,
  then passed after converting the evidence to a list.
- `pnpm exec prettier --check -- <changed TS/TSX/MD files>` failed once after
  broader branch formatting drift was detected, then passed after formatting the
  changed files.
- `pnpm verify:prepush` passed before and after the final closeout edit.
- `pnpm docs:sync:check` passed.
- Runtime checks passed for `http://127.0.0.1:5173/canvas`,
  `http://127.0.0.1:3000/healthz`, and
  `http://127.0.0.1:3000/capabilities`.
- Browser MCP validation was attempted, but the Playwright MCP backend returned
  `Target page, context or browser has been closed`; browser-level evidence was
  therefore limited to HTTP runtime checks and automated component/route tests.

## Debt And Stub Check

- No manual database cleanup was used.
- No stubs, placeholders, fake adapters, TODO/FIXME markers, or hidden bypasses
  were introduced.
- No lint, type, test, docs, or hook rule was disabled or relaxed.

## Fowler And Component Docs

- Fowler mailbox:
  `buzon/20260428-codex-fowler-web-graph-startup-and-draft-recovery-analysis.md`
- Local component guide:
  `docs/architecture/components/web/graph/canvas-startup-and-draft-recovery-component.md`
- The component guide records public API, invariants, transitions, consumers,
  and diagrams for failed route posture, protected draft read-model projection,
  explicit draft replacement, and drag-handle ownership.
