---
title: Code Workbench Workspace Files User Stories
status: Proposed
owner: Web / Product
last_reviewed: 2026-05-04
planning_type: architecture
---

# Code Workbench Workspace Files User Stories

## Scope

These stories govern the Code workbench workspace-files slice. They are
intentionally narrower than project onboarding, lineage, diff, or persisted
file editing: Code may hold a local Monaco buffer, but it does not save file
content in this slice.

## Stories

### CODE-FILES-1: Load Workspace File Tree

As a project user, I want the Code tab to show the files available for my
selected tenant, project, and environment so that I can inspect source material
without leaving the workbench.

Acceptance criteria:

- opening the Code tab calls `ListWorkspaceFiles`;
- the query includes `tenantId`, `projectId`, and `environmentId`;
- a successful response renders the file tree;
- an empty tree renders the governed empty state;
- missing or invalid scope fails closed and does not render mock data.

Tests:

- API route test: scoped request returns `WorkspaceFileTree`;
- web adapter test: endpoint includes selected scope;
- architecture test: adapter does not call bare `/workspace/files`;
- Cypress: Code tab displays the file tree in live mode.

### CODE-FILES-2: Open First Or Selected File In Monaco

As a project user, I want the Code tab to open the first available file in
Monaco and let me select another file so that I can inspect and locally edit
source contents quickly.

Acceptance criteria:

- after the tree loads, the first file is previewed;
- selecting a file calls `GetWorkspaceFileContent`;
- the query includes scope and encoded `WorkspacePath`;
- successful response renders Monaco in editable local-buffer mode;
- the Code route shows the local-buffer warning instead of a read-only banner;
- typing changes the local editor buffer without calling a save API.

Tests:

- API route test: scoped file request returns content and language;
- web adapter test: file-content endpoint includes scope;
- CodeView test: first file renders and the local-buffer state remains visible;
- Cypress: selecting a file opens Monaco and accepts typing.

### CODE-FILES-3: Missing File Does Not Break Explorer

As a reviewer, I want a missing selected file to show a precise preview error
while keeping the explorer visible so that I can pick another file.

Acceptance criteria:

- API emits `HttpErrorEnvelope.v1` with reason `workspace_file_not_found`;
- web adapter maps only that canonical reason to `WorkspaceFileLoadError`;
- Code preview pane shows selected-file unavailable state;
- file tree remains visible.

Tests:

- API route test: missing file returns 404 `workspace_file_not_found`;
- web adapter test: unrelated 404 remains a generic `ApiError`;
- CodeView test: explorer remains visible when selected preview is missing.

### CODE-FILES-4: Invalid Paths Fail Closed

As a platform owner, I want invalid or traversal paths rejected so that the Code
tab cannot read outside the workspace root.

Acceptance criteria:

- parent traversal is rejected;
- absolute paths are rejected;
- unsupported extensions are rejected;
- oversized files are rejected as invalid/unavailable;
- invalid path returns `invalid_workspace_path`.

Tests:

- API route test: `../package.json` returns 400 `invalid_workspace_path`;
- repository unit test: absolute and parent paths are rejected;
- architecture test: route delegates path rules to the value object/policy
  surface, not ad hoc string checks in the UI.

### CODE-FILES-5: Unauthorized Reads Fail Closed

As a tenant admin, I want file reads to require explicit project authorization
so that users cannot inspect another tenant or project.

Acceptance criteria:

- missing bearer token returns unauthorized;
- denied `workspace:files:view` returns forbidden;
- rejected reads do not call the repository;
- UI shows the governed route error state.

Tests:

- API route test: unauthenticated request returns 401;
- API route test: denied authorization returns 403 and repository is not called;
- Cypress negative path is optional until the auth harness can express denied
  workspace file scope without intercepting the file route.

### CODE-FILES-6: Code Is Reachable Before First Canvas Document

As a user entering a workspace without a persisted canvas document, I want Code
to appear beside Graph so I can inspect and type in workspace files before
choosing a canvas template.

Acceptance criteria:

- `/canvas` renders Graph and Code in the Canvas workbench tab strip;
- Code is selected through `SelectCanvasWorkbenchTab(code)`;
- `/canvas/code` loads `ListWorkspaceFiles` and `GetWorkspaceFileContent`;
- Monaco accepts typed text in the local buffer;
- Lineage, Diff, Artifacts, and Runs remain hidden until their scopes are ready.

Tests:

- Canvas tab model test: `workspace` scoped tabs stay available without a canvas
  document;
- Cypress: first-canvas entry shows Code beside Graph and Monaco accepts typed
  text.

## Scenario Matrix

| Story        | Query                     | DDD owner                 | Happy path            | Negative path          | Architecture guard              |
| ------------ | ------------------------- | ------------------------- | --------------------- | ---------------------- | ------------------------------- |
| CODE-FILES-1 | `ListWorkspaceFiles`      | `WorkspaceFileTree`       | file tree renders     | missing scope          | no unscoped endpoint            |
| CODE-FILES-2 | `GetWorkspaceFileContent` | `WorkspaceFileContent`    | editable local buffer | malformed path         | route uses query rail           |
| CODE-FILES-3 | `GetWorkspaceFileContent` | `WorkspaceFileReadPolicy` | explorer preserved    | canonical missing file | strict reason mapping           |
| CODE-FILES-4 | `GetWorkspaceFileContent` | `WorkspacePath`           | valid relative path   | traversal rejected     | policy owns validation          |
| CODE-FILES-5 | both queries              | `WorkspaceFileReadPolicy` | authorized read       | 401/403                | repository not called on denial |
| CODE-FILES-6 | both queries              | `CodeEditableBuffer`      | Monaco accepts typing | canvas draft missing   | no save command invented        |
