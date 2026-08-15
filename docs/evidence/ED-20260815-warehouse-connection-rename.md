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

The delivery follows the repository's Fowler opportunity classification in
`docs/architecture/fowler-opportunity-planning-governance.md`: it replaces the
missing intent with one explicit command, preserves aggregate identity,
encapsulates mutation, reuses the existing Source Import interaction, and
fails closed instead of introducing a parallel management surface.

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

## Reproducible headed-browser protocol

The visible Chrome session `connection-rename` was exercised with
`agent-browser`. For each row, the session set the viewport, waited 350 ms for
responsive layout, scrolled the rename input into the dialog viewport, and
read the dialog, error, and input bounding boxes from the live DOM.

| Display target    | Browser viewport | Dialog bounds         | Error and input                     |
| ----------------- | ---------------- | --------------------- | ----------------------------------- |
| 1366x768 at 100%  | 1366x768         | 1024x736 at (171,16)  | Fully visible                       |
| 1366x768 at 200%  | 683x384          | 651x352 at (16,16)    | Fully visible after internal scroll |
| 1920x1080 at 100% | 1920x1080        | 1024x760 at (448,160) | Fully visible                       |
| 1920x1080 at 200% | 960x540          | 928x508 at (16,16)    | Fully visible after internal scroll |

The duplicate-name proof submitted `DUPLICATE PROOF` against the selected
`local-postgres-proof` connection. The live Spanish UI returned
`Ya existe una conexión con ese nombre.` while retaining the stable connection
ID. DOM inspection reported `aria-invalid="true"` and an `aria-errormessage`
value equal to the alert element ID. The raw transport response was absent.

No migration, persisted migration state, standalone connection-management
surface, browser-only storage, stub, or fake success path was added.
