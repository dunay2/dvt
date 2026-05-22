---
title: F-21 Execution Template Source Generation Workbench Plan
status: Accepted
date: 2026-05-22
last_reviewed: 2026-05-22
owners:
  - apps/web
task_id: F-21
---

# F-21 Execution Template Source Generation Workbench Plan

## Think-First Analysis

Problem summary: F-21 is already named in the frontend roadmap and component
inventory, but the product has no `/templates` route, no local template catalog,
and no governed presentation model for template parameter capture, preview, and
export posture.

Root cause: earlier work correctly kept Monaco preview infrastructure separate
from template ownership, but left the Templates workbench as documentation-only
future state. That makes `F-17-D` and provider-facing generation UX depend on a
route that does not exist.

Constraints and invariants:

- `AGENTS.md` requires doc-driven design, explicit command/query rail posture,
  no stubs, no hidden debt, and validation evidence.
- `docs/architecture/command-query-rail-governance.md` requires observable route
  behavior to be cataloged before implementation.
- `docs/architecture/fowler-opportunity-planning-governance.md` requires a
  Fowler matrix, negative tests, architecture guard, and user-flow proof for a
  new route workbench.
- `docs/architecture/components/web/screen-manuals-and-user-stories.md` defines
  Templates states: empty, loading, validation error, preview ready, and
  read-only.
- `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`
  defines the expected Templates component set.

Options considered:

- Use a schema/form library: rejected for this first vertical because the route
  needs a small catalog-backed parameter model, not a broad form framework.
- Use Monaco immediately: rejected because `F-17` owns Monaco preview
  infrastructure and F-21 should establish route ownership first.
- Create backend API contracts now: rejected because provider semantics remain
  governed backend services and contracts; this slice is presentation-local.
- Implement a pure local catalog and preview projection: selected because it
  removes documentation drift, creates a route owner, and gives `F-17-D` a real
  surface to enhance later.

Selected approach: add a DVT-owned `/templates` shell route with a small
execution-template catalog, a pure generation/validation model, route-level
workbench slots, docs, architecture guard, and Cypress UX proof. The workbench
generates deterministic preview source and export metadata only; it does not
persist, dispatch, or call provider APIs.

Rejected alternatives:

- Embedding template generation inside Canvas, because Canvas should stay
  graph-first.
- Treating templates as a dbt-only plugin tab, because F-21 covers
  provider-facing scaffolds such as Snowflake tasks and ETL jobs.
- Adding mock backend endpoints, because mock-only semantics would become
  hidden authority.

## Command And Query Rail Catalog

| Rail                                    | Type    | Owning bounded context | DDD owner                            | Port or adapter surface                 | Scope and authorization                                                                   | Negative tests                                                                 |
| --------------------------------------- | ------- | ---------------------- | ------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `ListExecutionTemplateProfiles`         | query   | Web operator workbench | `ExecutionTemplateCatalogReadModel`  | Templates route presentation model      | Local built-in catalog only; no tenant data; shell access follows normal route admission. | Empty/unknown catalog is not fabricated; selected template must exist.         |
| `GenerateExecutionTemplatePreview`      | query   | Web operator workbench | `ExecutionTemplatePreviewProjection` | Templates route presentation model      | Deterministic local preview; no persistence, dispatch, provider mutation, or credentials. | Missing required parameters and unknown template ids return validation errors. |
| `SelectExecutionTemplateProfile`        | command | Web operator workbench | `ExecutionTemplateSelectionState`    | Templates route component event handler | Route-local UI state only; no backend mutation.                                           | Unknown ids fall back to the first catalog entry in the pure model.            |
| `UpdateExecutionTemplateParameterValue` | command | Web operator workbench | `ExecutionTemplateParameterState`    | Templates route component event handler | Route-local UI state only; parameter schema owns labels and required flags.               | Empty required values keep preview blocked with explicit field errors.         |

## Fowler Opportunity Matrix

<!-- markdownlint-disable MD060 -->

| Scenario                                                 | Opportunity             | Fowler pattern                      | DDD owner                                | Command/query rail                      | Implementation surfaces                                                                                                                                                                                                                                                                                                                                                                                         | Unit or package test                                      | Architecture test                                                      | User-flow test                            | Out of scope                                                  |
| -------------------------------------------------------- | ----------------------- | ----------------------------------- | ---------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Templates documented as future state but no route exists | Documentation drift     | Component guide + Strangler Fig     | Templates workbench component guide      | `ListExecutionTemplateProfiles`         | `docs/architecture/components/web/templates/execution-template-source-generation-component.md`, `docs/architecture/components/web/templates/execution-template-source-generation-user-stories.md`, `docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md`, `docs/planning/proposals/mandatory/frontend-and-ux/f21-execution-template-source-generation-workbench-plan-20260522.md` | docs checks                                               | `templatesWorkbench.architecture.test.ts`                              | `templates-workbench.cy.ts`               | Backend/provider contracts                                    |
| Parameter and preview rules would otherwise live in JSX  | Responsibility overload | Presentation Model + Service Layer  | `ExecutionTemplatePreviewProjection`     | `GenerateExecutionTemplatePreview`      | `apps/web/src/app/views/templates/templatesViewModel.ts`, `apps/web/src/app/views/templates/templatesViewModel.test.ts`, `apps/web/src/app/views/TemplatesView.tsx`, `apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx`                                                                                                                                                                             | `templatesViewModel.test.ts`                              | `templatesWorkbench.architecture.test.ts`                              | `templates-workbench.cy.ts`               | Generic template engine                                       |
| Provider scaffolds risk stringly typed local semantics   | Primitive obsession     | Introduce Parameter Object          | `ExecutionTemplateParameterDefinition`   | `UpdateExecutionTemplateParameterValue` | `apps/web/src/app/views/templates/templatesViewModel.ts`                                                                                                                                                                                                                                                                                                                                                        | missing required parameter negative test                  | `templatesWorkbench.architecture.test.ts`                              | Cypress required-field assertion          | Full JSON schema editor                                       |
| Route visibility must not be a Canvas tab workaround     | Boundary drift          | Route Controller + Shell Navigation | DVT plugin route contribution read model | `ListExecutionTemplateProfiles`         | `apps/web/src/app/plugins/dvt/dvtContributions.ts`, `apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts`, `apps/web/src/app/routes.ts`                                                                                                                                                                                                                                                       | plugin projection architecture test                       | route contribution guard                                               | Cypress route navigation                  | Moving existing Canvas tabs                                   |
| Generated preview must be reviewable but not executable  | Hidden authority        | Read Model                          | `ExecutionTemplatePreviewProjection`     | `GenerateExecutionTemplatePreview`      | `apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx`, `apps/web/src/app/views/TemplatesView.test.tsx`                                                                                                                                                                                                                                                                                                 | preview is read-only and export metadata is deterministic | architecture guard rejects dispatch/persist wording in route component | Cypress preview/export metadata assertion | Dispatch, persistence, provider credentials, applying changes |

<!-- markdownlint-enable MD060 -->

## Red-Green Plan

1. Add `templatesViewModel.test.ts` expecting catalog projection, required-field
   errors, deterministic preview source, and unknown-template fallback.
2. Add `TemplatesView.test.tsx` expecting the route workbench to render catalog,
   parameter fields, blocked preview, and generated preview after user input.
3. Add `templatesWorkbench.architecture.test.ts` expecting owned-concern
   docblocks, pure model ownership, component docs, user stories, route
   contribution, and no backend/provider mutation language.
4. Add `templates-workbench.cy.ts` expecting `/templates` to be navigable, block
   missing required values, and show generated preview/export metadata.
5. Run the focused tests and observe red for missing implementation.
6. Implement the pure model and route components only within declared surfaces.
7. Add DVT plugin route contribution for `/templates`.
8. Update docs indexes/status generated surfaces, validate targeted checks,
   commit through the helper, run `pnpm verify:prepush`, open PR, resolve
   comments and CI, merge, then take the next planning task.

ADR decision: no ADR is required. This is a web route/presentation workbench
slice implementing existing frontend architecture direction; it does not change
repository architecture, backend contracts, persistence, provider execution, or
compatibility policy.

```feature-mechanization
version: 1
featureId: F21-EXECUTION-TEMPLATE-SOURCE-GENERATION-WORKBENCH-20260522
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/f21-execution-template-source-generation-workbench-plan-20260522.md
componentGuides:
  - docs/architecture/components/web/templates/execution-template-source-generation-component.md
userStories:
  - docs/architecture/components/web/templates/execution-template-source-generation-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/screen-manuals-and-user-stories.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/TemplatesView.tsx
  - apps/web/src/app/views/TemplatesView.test.tsx
  - apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
  - apps/web/src/app/views/templates/templatesViewModel.ts
  - apps/web/src/app/views/templates/templatesViewModel.test.ts
  - apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts
  - apps/web/src/app/plugins/dvt/dvtContributions.ts
  - apps/web/src/app/plugins/pluginRuntimeProjection.architecture.test.ts
  - apps/web/cypress/e2e/templates/templates-workbench.cy.ts
  - buzon/20260522-codex-fowler-f21-execution-template-workbench-analysis.md
  - docs/.manifest.json
  - docs/architecture/components/web/index.md
  - docs/architecture/components/web/templates/execution-template-source-generation-component.md
  - docs/architecture/components/web/templates/execution-template-source-generation-user-stories.md
  - docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md
  - docs/planning/closeouts/20260522-f21-execution-template-source-generation-workbench-closeout.md
  - docs/planning/proposals/mandatory/frontend-and-ux/f21-execution-template-source-generation-workbench-plan-20260522.md
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-*/**
  - packages/@dvt/planner/**
commandQueryRails:
  - name: ListExecutionTemplateProfiles
    type: query
    dddOwner: ExecutionTemplateCatalogReadModel
  - name: GenerateExecutionTemplatePreview
    type: query
    dddOwner: ExecutionTemplatePreviewProjection
  - name: SelectExecutionTemplateProfile
    type: command
    dddOwner: ExecutionTemplateSelectionState
  - name: UpdateExecutionTemplateParameterValue
    type: command
    dddOwner: ExecutionTemplateParameterState
domainObjects:
  - name: ExecutionTemplateCatalogReadModel
    type: read model
    owner: apps/web
  - name: ExecutionTemplatePreviewProjection
    type: projection
    owner: apps/web
  - name: ExecutionTemplateParameterDefinition
    type: value object
    owner: apps/web
fowlerSignals:
  - Documentation drift
  - Responsibility overload
  - Primitive obsession
  - Boundary drift
  - Hidden authority
architectureGuards:
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
cypressFlows:
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
completionGate:
  - pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts
  - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
  - pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/pluginRuntimeProjection.architecture.test.ts
  - pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
  - pnpm --filter @dvt/web typecheck
  - pnpm docs:feature-mechanization -- --feature F21-EXECUTION-TEMPLATE-SOURCE-GENERATION-WORKBENCH-20260522
  - pnpm docs:feature-mechanization:implementation
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm governance:refresh
  - pnpm verify:prepush
redGreenCycles:
  - id: f21-template-preview-model
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts
    expectedFailure: Templates pure model does not exist.
    patchSurfaces:
      - apps/web/src/app/views/templates/templatesViewModel.ts
      - apps/web/src/app/views/templates/templatesViewModel.test.ts
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts
  - id: f21-templates-route-workbench
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx
    expectedFailure: Templates route workbench does not exist.
    patchSurfaces:
      - apps/web/src/app/views/TemplatesView.tsx
      - apps/web/src/app/views/TemplatesView.test.tsx
      - apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx
  - id: f21-templates-route-governance
    redTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    expectedFailure: Templates docs, route contribution, and semantic guards are missing.
    patchSurfaces:
      - apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts
      - apps/web/src/app/plugins/dvt/dvtContributions.ts
      - buzon/20260522-codex-fowler-f21-execution-template-workbench-analysis.md
      - docs/architecture/components/web/templates/execution-template-source-generation-component.md
      - docs/architecture/components/web/templates/execution-template-source-generation-user-stories.md
    greenTest: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
  - id: f21-templates-browser-ux
    redTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    expectedFailure: Templates route is not navigable in the browser.
    patchSurfaces:
      - apps/web/cypress/e2e/templates/templates-workbench.cy.ts
      - apps/web/src/app/plugins/dvt/dvtContributions.ts
    greenTest: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
symbols:
  - name: EXECUTION_TEMPLATE_CATALOG
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateCatalogReadModel
    cqRails: [ListExecutionTemplateProfiles]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: ExecutionTemplateParameterDefinition
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateParameterDefinition
    cqRails: [ListExecutionTemplateProfiles]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: ExecutionTemplateDefinition
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateCatalogReadModel
    cqRails: [ListExecutionTemplateProfiles]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: ExecutionTemplateParameterValues
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateParameterState
    cqRails: [UpdateExecutionTemplateParameterValue]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: ExecutionTemplatePreviewError
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: ExecutionTemplatePreview
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Primitive obsession]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: valueOrDefault
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateParameterState
    cqRails: [UpdateExecutionTemplateParameterValue]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: normalizeIdentifier
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: renderSnowflakeTask
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: renderSnowflakeProcedure
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: renderEtlScaffold
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: requireDefaultExecutionTemplate
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateCatalogReadModel
    cqRails: [ListExecutionTemplateProfiles]
    fowlerSignals: [Fail-fast invariant]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: resolveExecutionTemplateSelection
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateSelectionState
    cqRails: [SelectExecutionTemplateProfile]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: createDefaultExecutionTemplateValues
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplateParameterState
    cqRails: [UpdateExecutionTemplateParameterValue]
    fowlerSignals: [Extract Function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: resolveExecutionTemplatePreview
    path: apps/web/src/app/views/templates/templatesViewModel.ts
    dddOwner: ExecutionTemplatePreviewProjection
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Responsibility overload]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/templates/templatesViewModel.test.ts]
  - name: TemplatesView
    path: apps/web/src/app/views/TemplatesView.tsx
    dddOwner: Templates route controller
    cqRails: [SelectExecutionTemplateProfile, UpdateExecutionTemplateParameterValue]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: TEMPLATES_ROUTE_BOOTSTRAP_HANDLE
    path: apps/web/src/app/plugins/dvt/dvtContributions.ts
    dddOwner: DVT plugin route contribution read model
    cqRails: [ListExecutionTemplateProfiles]
    fowlerSignals: [Boundary drift]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/pluginRuntimeProjection.architecture.test.ts]
  - name: TemplatesRouteWorkbenchProps
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Introduce Parameter Object]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: TemplatesViewHeader
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [ListExecutionTemplateProfiles]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: TemplatesRouteWorkbench
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Responsibility overload]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: TemplateCatalog
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [ListExecutionTemplateProfiles, SelectExecutionTemplateProfile]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: TemplateParameterForm
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [UpdateExecutionTemplateParameterValue, GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: TemplateParameterField
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [UpdateExecutionTemplateParameterValue]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: GeneratedSourcePanel
    path: apps/web/src/app/views/templates/TemplatesRouteWorkbench.tsx
    dddOwner: Templates route presentation model
    cqRails: [GenerateExecutionTemplatePreview]
    fowlerSignals: [Extract Component]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx]
  - name: REPO_ROOT
    path: apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts]
  - name: APP_ROOT
    path: apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts]
  - name: readAppSource
    path: apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts]
  - name: readRepoDoc
    path: apps/web/src/app/views/templates/templatesWorkbench.architecture.test.ts
    dddOwner: Web architecture test harness
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Test-only confidence]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: N/A - architecture test helper only.
    unitTests: [pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts]
  - name: stubTemplatesRouteBootstrapApis
    path: apps/web/cypress/e2e/templates/templates-workbench.cy.ts
    dddOwner: Templates browser UX proof
    cqRails: [ListExecutionTemplateProfiles, GenerateExecutionTemplatePreview]
    fowlerSignals: [Semantic fitness function]
    architectureGuard: pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/templates/templatesWorkbench.architecture.test.ts
    cypressCoverage: pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/templates/templates-workbench.cy.ts
    unitTests: [N/A - Cypress route helper]
```
