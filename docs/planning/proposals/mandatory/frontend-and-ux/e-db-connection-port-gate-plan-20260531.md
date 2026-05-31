---
title: E DB Connection Port Gate Plan
status: Accepted
date: 2026-05-31
owners:
  - Web
planning_type: mandatory-plan
---

# E DB Connection Port Gate Plan

## Think-First Analysis

Problem summary: the web API workspace port already adapts warehouse connection
and source-import calls to protected API endpoints, but the Canvas route still
turns `sourceImportAvailable` into route policy from a transport-level constant.
That lets route-level state claim source import is open even when runtime plugin
capabilities disable the dbt source-import contribution.

Root cause: transport reachability and product availability were collapsed into
one boolean. The workspace port can know that HTTP endpoints exist; the Canvas
composition root must also account for runtime plugin contribution availability.

Constraints and invariants:

- `docs/architecture/command-query-rail-governance.md` keeps the behavior on the
  existing `ListWarehouseConnections`, `ListWarehouseConnectionTables`, and
  `ImportWarehouseSources` rails.
- `docs/architecture/fowler-opportunity-planning-governance.md` requires the
  slice to remove hidden authority without broadening ownership.
- `docs/architecture/components/web/plugin-contributions-developer-guide.md`
  keeps source-import options declared by the plugin and enabled by the shell.
- `docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md`
  already implements the backend adapter and plugin-declared source-import
  options; this slice must not reopen backend behavior.

Options considered:

- Keep `apiWorkspacePortCapabilities.sourceImportAvailable = true` as the sole
  route gate. Rejected: that preserves hidden UI authority when the runtime
  plugin contribution is unavailable.
- Move plugin checks into `workspacePorts.ts`. Rejected: workspace transport
  ports should not depend on plugin presentation registry state.
- Compose transport availability with runtime source-import contributions inside
  the Canvas controller environment. Selected: it is the narrow composition-root
  fix and keeps API transport and plugin contribution ownership separate.

## Fowler Opportunity Matrix

| Scenario                                                                    | Opportunity      | Pattern                       | DDD owner          | Rail                                                      | Allowed surfaces              | Tests                      | Out of scope       |
| --------------------------------------------------------------------------- | ---------------- | ----------------------------- | ------------------ | --------------------------------------------------------- | ----------------------------- | -------------------------- | ------------------ |
| Canvas policy claims source import is open from a transport constant alone. | Hidden authority | Composition Root / Policy DTO | Canvas route shell | `ImportWarehouseSources`, `ListWarehouseConnections`      | Canvas controller environment | Controller route unit test | Backend route work |
| Runtime plugin disables dbt but empty/route policy still sees import open.  | Boundary drift   | Plugin Contribution Gate      | dbt plugin shell   | `ListWarehouseConnectionTables`, `ImportWarehouseSources` | Runtime capability projection | Negative route policy test | Wizard redesign    |

## Pre-Implementation Brief

- Mode: Slim.
- Scope: derive Canvas `sourceImportAvailable` from both the API workspace port
  capability and runtime source-import plugin contributions.
- Expected outcome: when runtime capabilities disable the dbt plugin, Canvas
  route policy exposes `canOpenSourceImport=false` even though the API adapter
  remains available.
- Risks and mitigations:
  - Risk: coupling workspace transport services to plugin registry. Mitigation:
    keep the merge in `useCanvasControllerEnvironment`, not in workspace port
    adapters.
  - Risk: reopening source import API behavior. Mitigation: no API files are in
    the allowed implementation surfaces.
- Out of scope: backend catalog changes, wizard step changes, new source types,
  credential handling, Cypress coverage, and live database introspection.
- Validation plan:
  - `pnpm docs:feature-mechanization -- --feature E-DB-CONNECTION-PORT-1`
  - `pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx`
  - `pnpm --filter @dvt/web typecheck`
  - `pnpm --filter @dvt/web lint`
  - `pnpm docs:sync`
  - `pnpm verify:prepush`

## Feature Mechanization

```feature-mechanization
version: 1
featureId: E-DB-CONNECTION-PORT-1
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/frontend-and-ux/e-db-connection-port-gate-plan-20260531.md
componentGuides:
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
  - docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md
userStories:
  - E-DB-CONNECTION-PORT-1
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/architecture/components/web/plugin-contributions-developer-guide.md
allowedImplementationSurfaces:
  - apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts
  - apps/web/src/app/views/canvas/useCanvasController.core.test.tsx
  - apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts
  - apps/web/src/app/views/canvas/useCanvasController.test.types.ts
  - docs/planning/proposals/mandatory/frontend-and-ux/e-db-connection-port-gate-plan-20260531.md
  - docs/planning/proposals/index.md
  - docs/planning/proposals/mandatory/frontend-and-ux/index.md
  - docs/.manifest.json
forbiddenImplementationSurfaces:
  - apps/api/**
  - packages/**
  - specs/contracts/**
  - apps/web/cypress/**
  - docs/archive/**
commandQueryRails:
  - name: ListWarehouseConnections
    type: query
    dddOwner: Warehouse source import
  - name: ListWarehouseConnectionTables
    type: query
    dddOwner: Warehouse source import
  - name: ImportWarehouseSources
    type: command
    dddOwner: Warehouse source import
domainObjects:
  - name: RuntimeCapabilities
    type: read model
    owner: Canvas route shell
  - name: SourceImportContribution
    type: plugin contribution
    owner: dbt plugin shell
fowlerSignals:
  - Source import route policy used transport capability as product capability
  - Runtime plugin availability was checked downstream in CanvasShell only
architectureGuards:
  - pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - controller policy unit slice only
completionGate:
  - pnpm docs:sync
  - pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx
  - pnpm --filter @dvt/web typecheck
  - pnpm --filter @dvt/web lint
  - pnpm verify:prepush
redGreenCycles:
  - id: runtime-source-import-capability-gate
    redTest: pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx
    expectedFailure: Canvas route policy reports canOpenSourceImport=true when runtime capabilities disable the dbt source-import contribution.
    patchSurfaces:
      - apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts
      - apps/web/src/app/views/canvas/useCanvasController.core.test.tsx
      - apps/web/src/app/views/canvas/useCanvasController.test.projectionMocks.ts
      - apps/web/src/app/views/canvas/useCanvasController.test.types.ts
    greenTest: pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx
symbols:
  - name: useCanvasControllerEnvironment
    path: apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts
    dddOwner: Canvas route shell
    cqRails: [ImportWarehouseSources, ListWarehouseConnections, ListWarehouseConnectionTables]
    fowlerSignals: [Source import route policy used transport capability as product capability]
    architectureGuard: pnpm --filter @dvt/web test -- src/app/views/canvas/useCanvasController.core.test.tsx
    cypressCoverage: N/A - controller policy unit slice only
    unitTests:
      - apps/web/src/app/views/canvas/useCanvasController.core.test.tsx
```
