---
title: Bound Canvas authoring fields across UI, contract, API and PostgreSQL
status: Accepted
date: 2026-09-08
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/CanvasAuthoringFieldPolicy.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphAuthoringDraft.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitSemanticDocument.v1.ts
  - apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts
  - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/workspaceGraphDraftRoutes.test.ts
    - DVT_PG_URL=<postgres> pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/workspaceGraphDraftSemanticPersistence.test.ts
    - pnpm --filter @dvt/web test
    - node ../../tools/ci/run-web-cypress-native.mjs --headed --browser chrome --spec cypress/e2e/canvas/canvas-authoring-field-budgets.cy.ts
    - pnpm verify:prepush
---

Issue #3019 gives every editable field in the PCV1-I1 Canvas journey one
contract-owned category and limit. Human names, descriptions and tags use
Unicode code points. PostgreSQL identifiers and string literals use UTF-8
bytes. Timestamps and choices use closed semantic validation. This denominator covers
the enumerated fields exposed by PCV1 editors; opaque plugin metadata and binary
semantic documents remain outside recursive text limits.

The Web keeps rejected text visible, reports an accessible error and prevents
Apply. The shared v1 draft and Substrait schemas reject direct API bypasses.
PostgreSQL adds a named CHECK for the visible JSONB fields, so a caller cannot
persist an oversized draft by bypassing the HTTP boundary.

The cut removes the UTF-16 tag truncation helper. It adds no parallel profile,
compatibility parser, fallback enum, stub or fake persistence path. Existing
stored rows that violate the new policy fail closed at the v1 read boundary
until an explicit operator cleanup; they are never silently rewritten.
