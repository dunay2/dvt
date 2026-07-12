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

### CODE-FILES-2: Open And Synchronize A Workspace File In Monaco

As a project user, I want the Code tab to open the first available file in
Monaco and synchronize accepted edits into the project working tree so that
the graph and project files retain one revision-guarded authority.

Acceptance criteria:

- after the tree loads, the first file is previewed;
- selecting a file calls `GetWorkspaceFileContent`;
- the query includes scope and encoded `WorkspacePath`;
- successful response renders Monaco in editable working-tree mode;
- typing transitions the file through `modified`, `syncing`, and
  `synchronized` states;
- synchronization calls the existing `SaveWorkspaceFileContent` command with
  the last authoritative content SHA;
- selecting another file flushes the current edit before changing selection;
- a stale revision stops automatic writes and exposes an explicit reload path;
- the workbench has no user-facing Save action and never represents a
  working-tree write as a Git stage, commit, push, or remote sync.

Tests:

- API route test: scoped file request returns content and language;
- web adapter test: file-content endpoint includes scope;
- synchronization-model test: in-flight edits serialize without data loss;
- CodeView test: typing synchronizes through the command rail and file
  selection waits for the pending write;
- Cypress: contextual project Code accepts an edit, reaches synchronized
  state, and sends a revision-guarded command without a Save button.

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
to open contextually over Graph so I can inspect and update workspace files
before choosing a canvas template.

Acceptance criteria:

- project code opens from contextual Canvas actions instead of a permanent tab
  strip;
- Code activation preserves the graph context rather than selecting a route
  tab;
- the contextual workbench loads `ListWorkspaceFiles` and
  `GetWorkspaceFileContent`;
- Monaco edits synchronize through `SaveWorkspaceFileContent`;
- Lineage, Diff, Artifacts, and Runs remain hidden until their scopes are ready.

Tests:

- component/presenter tests keep Code behind contextual Canvas activation;
- Cypress: contextual Code entry keeps Graph context visible and Monaco accepts
  typed text.

## Scenario Matrix

| Story        | Rail                                                  | DDD owner                 | Happy path                 | Negative path          | Architecture guard                      |
| ------------ | ----------------------------------------------------- | ------------------------- | -------------------------- | ---------------------- | --------------------------------------- |
| CODE-FILES-1 | `ListWorkspaceFiles`                                  | `WorkspaceFileTree`       | file tree renders          | missing scope          | no unscoped endpoint                    |
| CODE-FILES-2 | `GetWorkspaceFileContent`; `SaveWorkspaceFileContent` | `WorkspaceFileContent`    | revision-guarded sync      | revision conflict      | one internal command; no Save UI        |
| CODE-FILES-3 | `GetWorkspaceFileContent`                             | `WorkspaceFileReadPolicy` | explorer preserved         | canonical missing file | strict reason mapping                   |
| CODE-FILES-4 | `GetWorkspaceFileContent`                             | `WorkspacePath`           | valid relative path        | traversal rejected     | policy owns validation                  |
| CODE-FILES-5 | both read queries                                     | `WorkspaceFileReadPolicy` | authorized read            | 401/403                | repository not called on denial         |
| CODE-FILES-6 | both read queries; `SaveWorkspaceFileContent`         | `CodeWorkingTreeSync`     | contextual Monaco autosync | canvas draft missing   | no duplicate command or Git-state claim |
