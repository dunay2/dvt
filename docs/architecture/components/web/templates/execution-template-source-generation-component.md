---
title: Execution Template Source Generation Component
status: Accepted
date: 2026-05-22
last_reviewed: 2026-05-22
owners:
  - apps/web
component: Templates workbench
---

# Execution Template Source Generation Component

## Owned Concern

The Templates workbench owns presentation-local selection, parameter capture,
validation, deterministic preview generation, and export metadata for governed
execution-template scaffolds.

It does not own provider execution, persistence, credentials, backend template
contracts, or Monaco infrastructure. Those remain separate governed surfaces.

## Public API

| API                                       | Surface                                                           | Responsibility                                      |
| ----------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------- |
| `EXECUTION_TEMPLATE_CATALOG`              | `apps/web/src/app/views/templates/templatesViewModel.ts`          | Built-in read model for available template profiles |
| `resolveExecutionTemplateSelection`       | `apps/web/src/app/views/templates/templatesViewModel.ts`          | Route-local template selection state                |
| `resolveExecutionTemplatePreview`         | `apps/web/src/app/views/templates/templatesViewModel.ts`          | Validation and deterministic preview projection     |
| `TemplatesView`                           | `apps/web/src/app/views/TemplatesView.tsx`                        | Route controller and route-local command handlers   |
| `TemplatesRouteWorkbench`                 | `apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx`    | Workbench slot renderer                             |
| `TemplateMonacoPreviewPanel`              | `apps/web/src/app/views/templates/TemplateMonacoPreviewPanel.tsx` | Ready generated-source preview adapter              |
| DVT plugin `/templates` view contribution | `apps/web/src/app/plugins/dvt/dvtContributions.ts`                | Shell route registration                            |

## Command And Query Rails

| Rail                                    | Type    | DDD owner                            | Status      |
| --------------------------------------- | ------- | ------------------------------------ | ----------- |
| `ListExecutionTemplateProfiles`         | query   | `ExecutionTemplateCatalogReadModel`  | Implemented |
| `GenerateExecutionTemplatePreview`      | query   | `ExecutionTemplatePreviewProjection` | Implemented |
| `SelectExecutionTemplateProfile`        | command | `ExecutionTemplateSelectionState`    | Implemented |
| `UpdateExecutionTemplateParameterValue` | command | `ExecutionTemplateParameterState`    | Implemented |

## Invariants

- Preview generation is deterministic from the selected template and parameter
  values.
- Required parameters block preview and expose field-specific errors.
- Unknown template ids resolve to the first catalog entry rather than creating
  unowned semantics.
- Generated source is read-only route output; the route does not dispatch,
  persist, or apply generated artifacts.
- Ready generated source is inspected through `TemplateMonacoPreviewPanel` and
  the shared read-only `MonacoCodeViewer` gateway.
- Provider semantics are descriptive profile metadata until backend contracts
  accept provider-owned generation behavior.
- The route uses `RouteWorkbenchFrame` slots and does not create a parallel
  shell layout.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> TemplateSelected
  TemplateSelected --> ValidationBlocked: required parameter missing
  ValidationBlocked --> PreviewReady: required parameters provided
  PreviewReady --> ValidationBlocked: required parameter cleared
  PreviewReady --> TemplateSelected: template changed
```

## Component Flow

```mermaid
flowchart LR
  Shell["Shell /templates route"] --> View["TemplatesView"]
  View --> Selection["SelectExecutionTemplateProfile"]
  View --> Parameters["UpdateExecutionTemplateParameterValue"]
  View --> Workbench["TemplatesRouteWorkbench"]
  Workbench --> Catalog["ListExecutionTemplateProfiles"]
  Workbench --> Preview["GenerateExecutionTemplatePreview"]
  Preview --> Monaco["TemplateMonacoPreviewPanel"]
  Monaco --> Source["Read-only generated source"]
  Preview --> Export["Export metadata"]
```

## Consumers

| Consumer              | Relationship                                                              |
| --------------------- | ------------------------------------------------------------------------- |
| Shell navigation      | Shows Templates as an extended DVT route.                                 |
| Future Canvas handoff | May pass workflow context into the route after a governed rail exists.    |
| Future Diff handoff   | May review generated source deltas after F-17 preview work lands.         |
| F-17 Monaco work      | Provides the read-only Monaco preview adapter for ready generated source. |

## Non-Goals

- No provider execution or apply action.
- No backend persistence.
- No generic template engine.
- No credentials, tenant-specific catalog, or provider API calls.
- No Monaco editing, save, apply, or export command.

<a id="section-execution-template-source-generation-user-stories"></a>

## Execution Template Source Generation User Stories

### Stories

| Story id         | Scenario                       | Acceptance criteria                                                                       |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| US-TEMPLATES-001 | Select a template profile      | User can open `/templates`, see provider profiles, and switch the selected profile.       |
| US-TEMPLATES-002 | Block incomplete generation    | Missing required parameters show field-specific validation and no generated source.       |
| US-TEMPLATES-003 | Generate preview               | Completing required fields produces deterministic read-only source and filename metadata. |
| US-TEMPLATES-004 | Preserve route ownership       | Templates uses the shared route workbench frame and is not embedded as a Canvas tab.      |
| US-TEMPLATES-005 | Avoid hidden backend authority | The route exposes preview/export posture only and does not persist, dispatch, or apply.   |
| US-TEMPLATES-006 | Navigate from shell            | User can reach Templates from shell navigation without manually entering the route URL.   |
| US-TEMPLATES-007 | Understand active form state   | The selected template and required-field errors are exposed through accessible state.     |

### UX Flow

```mermaid
sequenceDiagram
  participant User
  participant Shell
  participant TemplatesView
  participant Model as Template preview model

  User->>Shell: Open /templates
  Shell->>TemplatesView: Render route workbench
  TemplatesView->>Model: ListExecutionTemplateProfiles
  User->>TemplatesView: Select profile
  User->>TemplatesView: Enter parameter values
  TemplatesView->>Model: GenerateExecutionTemplatePreview
  Model-->>TemplatesView: Validation errors or preview source
  TemplatesView-->>User: Read-only preview and export metadata
```

```mermaid
flowchart LR
  Plugins["Shell route"] --> Nav["Shell navigation"]
  Nav --> Templates["Templates workbench"]
  Templates --> Catalog["Selected template aria-pressed=true"]
  Templates --> Errors["Required fields aria-invalid + describedby"]
```

### Negative Scenarios

| Scenario               | Expected result                                                | Guard                                          |
| ---------------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Required value empty   | Preview remains blocked with explicit required-field message.  | `templatesViewModel.test.ts` and Cypress flow. |
| Unknown template id    | Pure model falls back to first catalog entry.                  | `templatesViewModel.test.ts`.                  |
| Route tries to persist | Architecture guard rejects provider mutation wording in route. | `templatesWorkbench.architecture.test.ts`.     |
| Navigation drift       | Shell navigation still reaches `/templates`.                   | Cypress shell navigation flow.                 |

> Acceptance scope status: Accepted. Owner: See component owner.
