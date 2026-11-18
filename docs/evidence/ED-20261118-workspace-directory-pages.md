---
title: Complete project template directory discovery
status: draft
date: 2026-11-18
owners:
  - API
  - Web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/workspace/WorkspaceDirectoryPage.v1.ts
  - apps/api/src/infrastructure/workspaceFiles/workspaceDirectoryPage.ts
  - apps/api/src/entrypoints/http/workspaceFilesRoutes.ts
  - apps/web/src/app/views/templates/useProjectTemplateFiles.ts
evidence:
  tests:
    - pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/workspaceDirectoryPage.test.ts test/entrypoints/http/workspaceFilesRoutes.test.ts
    - pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/TemplatesView.test.tsx
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/templates/templates-workbench.cy.ts
---

# Project template discovery

The Files tree returns at most 500 files for a workspace. In the reproduction,
500 entries in an earlier directory exhausted the tree while a directly
addressed template could still be read. The Templates catalog now requests
direct entries of its project directory through the existing authorized
`ListWorkspaceFiles` query. Each page contains up to 100 names. The original
tree response remains available to the Code explorer.

The storage proof creates 500 unrelated files and 501 template files in a real
temporary directory. It verifies six pages in lexical order, workspace and
directory isolation, unreadable selectors and a directory junction. HTTP tests
exercise authorization and both response shapes. The Templates route tests
searching loaded results, continuing after a failed page and saving a variant
with its original revision. Exact candidate and CI results belong to
[#3975](https://github.com/dunay2/dvt/issues/3975).

See the [component contract](../architecture/components/web/workspace/workspace-port-decomposition-component.md)
and [risk controls](../risk-register/workspace-directory-pages-20261118.md).
