---
title: Governed warehouse connection rename
status: Accepted
date: 2026-08-15
owners:
  - apps/api
  - apps/web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/source-import/SourceImportOperations.v1.ts
  - apps/api/src/application/services/renameWarehouseConnectionUseCase.ts
  - apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts
  - apps/web/src/app/components/sourceImportWizard/WarehouseConnectionRenameForm.tsx
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter @dvt/web test
    - node --test scripts/run-dev-stack.auth.test.cjs
    - pnpm verify:prepush
---

Issue #2366 adds the explicit `RenameWarehouseConnection` command to the
existing Warehouse Connection aggregate and Source Import interaction. The
command changes only the display name and preserves connection identity,
database, type, credential reference, source-object metadata, selection, and
the optimistic workspace-file persistence boundary.

The protected route uses a dedicated fail-closed authorization action. Blank
or malformed requests, unknown connections, duplicate case-insensitive names,
unauthorized scopes, and concurrent workspace revisions are rejected without a
parallel command or compatibility path.

The existing Source Import connection step owns the localized English and
Spanish interaction. Headed-browser verification covered selection, autofocus,
rename, persistence across reload, stable ID, case-insensitive duplicate
rejection with actionable copy, nested Escape cancellation with focus return,
and restoration of the proof connection's original name. Responsive checks
covered 1366x768 and 1920x1080 at 100% and their effective 200% viewports; the
dialog remained bounded and the rename controls stayed accessible.

No migration, persisted migration state, standalone connection-management
surface, browser-only storage, stub, or fake success path was added.
