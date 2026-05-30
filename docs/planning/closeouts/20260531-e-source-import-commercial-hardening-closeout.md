---
title: E-SOURCE-IMPORT-COMMERCIAL closeout
status: Accepted
date: 2026-05-31
owners:
  - Web
  - API
planning_type: closeout
---

# E-SOURCE-IMPORT-COMMERCIAL Closeout

## Summary

PR #1390 was already merged as `3d214490`. This follow-up branch sanitizes the
source-import backend so the production route group no longer depends on a
hardcoded warehouse catalog and the import command writes durable dbt source
YAML through the workspace file port.

## Governing Sources Used

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/roadmap/strategic-product-roadmap.md`
- `docs/adr/ADR-0058-warehouse-source-import-rails.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/e-source-import-commercial-hardening-plan-20260531.md`

## User Stories Created

| ID                            | Outcome                                                                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E-SOURCE-IMPORT-CATALOG-US`  | Warehouse connection discovery reads workspace-governed `.dvt/warehouse-connections.json`; missing catalogs return an empty list and unknown selections fail closed.    |
| `E-SOURCE-IMPORT-ARTIFACT-US` | `ImportWarehouseSources` persists deterministic `models/sources/*.yml` dbt source YAML and graph source nodes.                                                          |
| `E-SOURCE-IMPORT-QA-US`       | Tests cover demanding-reviewer cases: no hardcoded production catalog, duplicate catalog rows, server-authoritative metadata, YAML merge behavior, and draft conflicts. |

## Real Work Performed

- Replaced the production default `InMemoryWarehouseConnectionCatalog` with
  `WorkspaceWarehouseConnectionCatalog`, backed by the existing workspace file
  repository.
- Added `resolveWorkspaceFilesRoot` and reused it from the workspace files route
  group and source import route group so both protected surfaces resolve the
  same workspace root.
- Added deterministic dbt source YAML generation and merge behavior in
  `warehouseSourceYaml.ts`.
- Extended `ImportWarehouseSourcesUseCase` to read existing YAML, persist graph
  draft mutations, and then save generated source YAML artifacts.
- Added focused tests for the workspace-governed catalog, YAML generation and
  merge behavior, protected route import persistence, and architecture guard
  coverage against hardcoded production catalogs.
- Added `js-yaml` plus `@types/js-yaml` to parse existing source YAML instead
  of using ad hoc text manipulation.

## Validation Evidence

- `pnpm docs:feature-mechanization -- --feature E-SOURCE-IMPORT-COMMERCIAL`:
  PASS.
- `pnpm --filter dvt-api test -- test/application/services/warehouseSourceYaml.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/architecture/warehouseSourceImportRails.architecture.test.ts`:
  PASS, 4 files and 15 tests.
- `pnpm --filter dvt-api test`: PASS, 137 files and 674 tests; existing
  protected runtime integration file remained skipped.
- `pnpm --filter dvt-api typecheck`: PASS.
- `pnpm --filter dvt-api lint`: PASS.
- `pnpm docs:status:generate`: PASS.
- `pnpm docs:sync`: PASS.
- `pnpm governance:refresh`: PASS.
- `pnpm docs:feature-mechanization:implementation`: initially failed because
  internal YAML helper types were missing from the manifest; after adding the
  real symbols to the plan, PASS.
- `pnpm verify:prepush`: initially failed before commit because changed files
  had not yet been normalized by the repository's pre-commit Prettier hook;
  after committing through `pnpm commit`, the repeated pre-push gate PASSed.

## No-Debt Evidence

- No debt entry was created.
- No lint, type, test, CI, hook, or governance rule was disabled or relaxed.
- No hook bypass was used.
- ARC-2 was not triggered because this slice did not touch
  `packages/@dvt/contracts/**`, `specs/contracts/**`,
  `packages/@dvt/adapter-*/**`, `packages/@dvt/engine/**`, or
  `packages/@dvt/planner/**`.

## No-Stub Evidence

- No new stub, placeholder, fake adapter, fake success path, TODO, or FIXME was
  added.
- The merged hardcoded catalog adapter was removed from production wiring
  instead of being renamed or hidden.
- The remaining out-of-scope live warehouse credential discovery is explicitly
  outside this slice and is not represented as implemented behavior.
