---
title: Execution Template Monaco Preview Component
status: Accepted
date: 2026-05-22
last_reviewed: 2026-05-22
owners:
  - apps/web
component: Templates workbench
---

# Execution Template Monaco Preview Component

## Owned Concern

The Templates Monaco preview component owns read-only inspection of generated
template source inside the `/templates` route.

It does not own template catalog semantics, parameter validation, source
generation, shell navigation, persistence, provider execution, or Monaco's
third-party editor binding.

## Public API

| API                          | Surface                                                           | Responsibility                                |
| ---------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `TemplateMonacoPreviewPanel` | `apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx` | Adapts one ready generated preview to Monaco. |
| `TemplatesRouteWorkbench`    | `apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx`    | Delegates ready preview rendering.            |
| `MonacoCodeViewer`           | `apps/web/src/app/components/monaco/MonacoCodeViewer.tsx`         | Lazy read-only Monaco code gateway.           |
| `ExecutionTemplatePreview`   | `apps/web/src/app/views/templates/templatesViewModel.ts`          | Preview projection consumed by the panel.     |

## Command And Query Rails

| Rail                               | Type  | DDD owner                            | Status      |
| ---------------------------------- | ----- | ------------------------------------ | ----------- |
| `GenerateExecutionTemplatePreview` | query | `ExecutionTemplatePreviewProjection` | Implemented |
| `ListExecutionTemplateProfiles`    | query | `ExecutionTemplateCatalogReadModel`  | Implemented |

## Invariants

- Monaco renders only `ready` previews.
- Blocked previews stay in the route validation state and do not mount Monaco.
- `TemplateMonacoPreviewPanel` is read-only and exposes no save, apply, export,
  or dispatch command.
- `TemplatesView` and `TemplatesRouteWorkbench` do not import
  `@monaco-editor/react` directly.
- The shared `MonacoCodeViewer` remains the only gateway from Templates to the
  Monaco code surface.
- Canvas production modules do not become Monaco hosts through this slice.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ValidationBlocked
  ValidationBlocked --> PreviewReady: required parameters provided
  PreviewReady --> MonacoPreviewMounted: ready source delegated to panel
  MonacoPreviewMounted --> ValidationBlocked: required parameter cleared
  MonacoPreviewMounted --> PreviewReady: generated source changes
```

## Component Diagram

```mermaid
flowchart LR
  View["TemplatesView"] --> Workbench["TemplatesRouteWorkbench"]
  Workbench --> Projection["ExecutionTemplatePreviewProjection"]
  Workbench --> Blocked["Blocked preview state"]
  Workbench --> Panel["TemplateMonacoPreviewPanel"]
  Panel --> Viewer["MonacoCodeViewer"]
  Viewer --> Surface["MonacoCodeSurface"]
  Surface --> Editor["Monaco Editor"]
```

## Consumers

| Consumer            | Relationship                                                    |
| ------------------- | --------------------------------------------------------------- |
| Templates route     | Shows generated source as read-only Monaco preview.             |
| Cypress UX guard    | Proves the route still reaches a ready generated preview.       |
| F-17 parent         | Uses this as the Templates leg of the embedded Monaco strategy. |
| Future Diff handoff | May compare generated source after backend query rails exist.   |

## Non-Goals

- No edit mode.
- No export/download command.
- No backend template persistence.
- No provider execution.
- No route shell changes.

<a id="section-execution-template-monaco-preview-user-stories"></a>

## Execution Template Monaco Preview User Stories

| Story ID      | User               | Goal                                         | Acceptance Criteria                                                          |
| ------------- | ------------------ | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `US-F17D-001` | Analytics engineer | Review generated SQL with editor ergonomics. | A ready Snowflake task preview renders in read-only Monaco.                  |
| `US-F17D-002` | Operator           | Understand why preview is unavailable.       | Missing required parameters show blocked state and field-level messages.     |
| `US-F17D-003` | Maintainer         | Keep Templates route-owned.                  | Architecture guard proves route and workbench do not import Monaco directly. |
| `US-F17D-004` | Maintainer         | Reuse shared Monaco gateway.                 | Templates delegates ready preview to `MonacoCodeViewer`.                     |
| `US-F17D-005` | Product reviewer   | Avoid fake commands.                         | Preview has no save, apply, dispatch, or export command in this slice.       |

### Scenario Matrix

| Scenario                 | State   | Expected UX                                       | Guard                                         |
| ------------------------ | ------- | ------------------------------------------------- | --------------------------------------------- |
| Required fields missing  | blocked | Validation state only, no Monaco viewer.          | `TemplatesView.test.tsx`                      |
| Required fields complete | ready   | Monaco read-only preview with deterministic text. | `TemplateMonacoPreviewPanel.test.tsx`         |
| Route ownership drift    | n/a     | Route delegates to panel and not editor binding.  | `templatesMonacoPreview.architecture.test.ts` |
| Fake command temptation  | n/a     | No save/export/apply affordance.                  | `templatesMonacoPreview.architecture.test.ts` |

### Boundaries

- Templates previews generated source only.
- The Monaco panel is not an editor.
- Generated source remains local presentation output until backend contracts
  define a persisted template-generation rail.

> Acceptance scope status: Accepted. Owner: See component owner.
