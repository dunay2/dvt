---
title: E-CANVAS-SOURCE-IMPORT-BACKEND-1 closeout
status: Accepted
date: 2026-05-30
owners:
  - Web
  - API
planning_type: closeout
---

# E-CANVAS-SOURCE-IMPORT-BACKEND-1 Closeout

## Think-First Analysis

Problem summary: Canvas source import exists as a UI and frontend port, but API
mode hard-codes `sourceImportAvailable: false` and the API adapter throws for
warehouse connection discovery, table discovery, and source import.

Root cause: the workspace port decomposition created the frontend capability
boundary before a backend bounded context owned warehouse source import. That
left product behavior split between a disabled composition flag, a throw-only
adapter, and test doubles.

Constraints and invariants:

- `AGENTS.md` requires inventory-first work, DB-first planning task lifecycle,
  command/query rail identification, no stubs, and validation evidence.
- `docs/architecture/command-query-rail-governance.md` requires externally
  observable behavior to use named command/query rails before implementation.
- `docs/architecture/fowler-opportunity-planning-governance.md` requires a
  planning matrix for route, adapter, and workflow changes.
- `docs/architecture/components/web/workspace/workspace-port-decomposition-component.md`
  requires narrow workspace ports and fail-closed API mode for missing rails.
- `ADR-0034`, `ADR-0039`, `ADR-0051`, `ADR-0055`, `ADR-0056`, and new
  `ADR-0058` govern bounded contexts, hexagonal ports, access decisions,
  server-owned workspace context, server-projected UI authority, and warehouse
  source import semantics.

Options considered:

- Keep API mode disabled and only improve the typed unavailable error. Rejected:
  it would not satisfy the P0 task target.
- Wire the frontend directly to fixture data. Rejected: hidden authority and
  mock semantics would remain product truth.
- Add protected backend rails backed by a server-owned warehouse catalog port,
  then wire the web adapter to those rails. Selected because it aligns product
  behavior with the command/query rail model and keeps connector semantics
  behind infrastructure.

Selected option and rationale: implement a minimal accepted warehouse source
import bounded context in `dvt-api` with a catalog-backed connector adapter,
protected route group, use cases, negative tests, and web API adapter wiring.
The initial connector reads server-owned configured catalog data; it is API
runtime data, not frontend fixture truth.

Rejected alternatives:

- New public package contracts in this slice. Rejected to avoid broad contract
  churn; the surface is protected runtime API plus web presentation DTOs.
- Direct mutation from the web adapter. Rejected because the authoritative
  graph draft lives behind the protected workspace graph draft store.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, and
  `ImportWarehouseSources` rails to protected runtime workspace catalog.
- Add API ports, use cases, route group, local catalog adapter, route constants,
  authorization actions, tests, and web adapter HTTP wiring.
- Add ADR-0058 and update workspace component docs.

Out of scope:

- Snowflake, BigQuery, Redshift, or Postgres live-driver credentials.
- File/API/stream source types.
- UI redesign of the wizard.

Validation plan:

- `pnpm --filter dvt-api test -- --runInBand` or targeted vitest equivalent.
- `pnpm --filter @dvt/web test:unit:run -- workspacePorts.api`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:sync`
- `pnpm verify:prepush`

Command/query rail impact:

- Query: `ListWarehouseConnections`, owning bounded context
  `Warehouse source import`, read model `WarehouseConnectionCatalog`.
- Query: `ListWarehouseConnectionSourceObjects`, owning bounded context
  `Warehouse source import`, read model `SourceObjectCatalogResponse`.
- Command: `ImportWarehouseSources`, owning bounded context
  `Warehouse source import`, aggregate `WorkspaceGraphAuthoringDraft` via
  `WarehouseSourceRegistration`.

## Fowler Matrix

| scenario                                                  | opportunity      | Fowler pattern                             | DDD owner                           | command/query rail                                                                           | implementation surfaces                                     | unit or package test                   | architecture test            | user-flow test                       | out of scope                 |
| --------------------------------------------------------- | ---------------- | ------------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------- | ---------------------------- | ------------------------------------ | ---------------------------- |
| API mode source import is disabled by a frontend literal. | Hidden authority | Server-owned capability boundary           | Warehouse source import route group | `ListWarehouseConnections`, `ListWarehouseConnectionSourceObjects`, `ImportWarehouseSources` | `apps/api/src/**`, `apps/web/src/app/services/workspace/**` | route and adapter tests                | protected runtime rail guard | existing wizard flow against adapter | non-warehouse source types   |
| Throw-only adapter occupies a real port.                  | Boundary drift   | Gateway + explicit protected runtime route | `IWarehouseSourceImportPort`        | same rails                                                                                   | web API adapter                                             | adapter endpoint tests                 | no unimplemented throw guard | none                                 | connector driver credentials |
| Backend has no owner for warehouse catalog.               | Anemic domain    | Service Layer + Repository/Gateway         | `WarehouseConnectionCatalog`        | list connections and tables                                                                  | API application ports/use cases/infrastructure              | use case and route tests               | command/query catalog guard  | wizard E2E later                     | external warehouse drivers   |
| Import must update canvas graph authority.                | Hidden authority | Aggregate update through store port        | `WorkspaceGraphAuthoringDraft`      | `ImportWarehouseSources`                                                                     | source import use case + graph draft store                  | duplicate/noop and invalid table tests | route registration guard     | existing canvas refresh path         | full YAML file generation    |

## Closeout Evidence

Governing sources used:

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/workspace/workspace-port-decomposition-component.md`
- `buzon/20260530-codex-fowler-canvas-source-import-backend-gap-analysis.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/e-canvas-source-import-backend-plan-20260530.md`
- `docs/adr/ADR-0058-warehouse-source-import-rails.md`

Real work performed:

- Added API application ports, use cases, route group, route registration,
  protected route constants, access decision actions, and an initial
  server-owned warehouse connection catalog adapter for source import.
- Added web API adapter wiring for warehouse connection discovery, table
  discovery, and source import.
- Added protected runtime rail architecture tests, API route tests, and web
  adapter tests for the new source import endpoints.
- Hardened the import command after QA found that a client could send fake
  column metadata for an otherwise valid table identity; saved draft nodes now
  use server catalog metadata.
- Added the governed feature mechanization plan for the new rails and symbols,
  then updated docs indexes through the governed docs/gov refresh flow.

Validation evidence:

- `pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts`
  passed.
- `pnpm --filter dvt-api test` passed.
- `pnpm --filter @dvt/web test:unit:run` passed.
- `pnpm --filter dvt-api typecheck` passed.
- `pnpm --filter @dvt/web typecheck` passed.
- `pnpm --filter dvt-api lint` passed.
- `pnpm docs:status:generate` passed.
- `pnpm docs:sync` passed.
- `pnpm governance:refresh` passed.
- `pnpm docs:feature-mechanization:implementation` passed.
- `pnpm exec prettier --write <changed-files-reported-by-verify>` passed after
  `format:changed` was unavailable in this workspace.
- `pnpm verify:prepush` passed after the feature mechanization and formatting
  corrections.
- `pnpm --filter dvt-api test -- test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts`
  passed after adding the malicious client-metadata regression.
- `pnpm --filter @dvt/web test:presentation:run -- src/app/components/SourceImportWizard.test.tsx`
  passed for the source import wizard user flow.

No-debt evidence:

- No debt entry was created.
- No lint, type, test, CI, hook, or governance rule was disabled or relaxed.
- No hook bypass was used.
- Draft-store conflicts and idempotency mismatches fail closed as HTTP 409
  instead of reporting successful import.
- Client-supplied table metadata is not trusted as source-of-truth for persisted
  source nodes; catalog metadata remains authoritative.

No-stub evidence:

- No throw-only adapter remains for API-mode source import.
- No frontend fixture or mock workspace double is used as API-mode authority.
- The initial warehouse catalog is an API-owned adapter behind
  `IWarehouseConnectionCatalog`; external driver adapters remain explicit future
  infrastructure work, not a hidden placeholder in this slice.
