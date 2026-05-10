---
title: Workspace Port Decomposition User Stories
status: Implemented
owner: Web / API / Architecture
last_reviewed: 2026-05-10
planning_type: architecture
---

# Workspace Port Decomposition User Stories

## Story 1: Read workspace files through the file query port

As a web user browsing code or artifacts, I want workspace files to load through
a file-read port so the UI cannot accidentally call graph, admin, diff, or
warehouse import capabilities.

Acceptance:

- Given API mode is active, when a file tree is requested, then the UI calls the
  workspace files query port.
- Given a file is missing, when the API returns the protected not-found envelope,
  then the file query port raises the existing file-load unavailable state.
- Given the consumer is a file browser, then its dependency shape does not
  include diff, admin, plugin, import, or write methods.

## Story 2: Read graph snapshots through the graph snapshot port

As a canvas or lineage user, I want presentation graph snapshots to come from a
graph snapshot query port so graph reads do not depend on file or admin service
shape.

Acceptance:

- Given a protected graph draft exists, when the graph snapshot is requested,
  then the port projects the draft into the presentation graph snapshot.
- Given the graph draft does not exist, when the graph snapshot is requested,
  then the port returns an empty graph without failing route startup.
- Given a consumer only needs graph projection, then it does not receive file
  write, warehouse import, admin, plugin, or diff methods.

## Story 3: Fail closed for diff until a backend rail exists

As a reviewer, I want diff reads to use a named diff query port so missing
backend support is explicit and cannot be hidden behind a broad workspace
service.

Acceptance:

- Given API mode is active and no `GetWorkspaceDiffChanges` backend rail exists,
  when `DiffView` requests diff changes, then the diff port returns an
  unavailable state before any HTTP call.
- Given a test harness injects diff fixtures, when diff data renders, then the
  fixture path stays test-only and is not product backend truth.

## Story 4: Keep plugin catalog separate from runtime execution

As a platform operator, I want plugin catalog display to be separate from
runtime plugin execution so a static frontend registry cannot imply backend
readiness.

Acceptance:

- Given API mode is active and no plugin catalog backend rail exists, when the
  plugin catalog is requested, then the plugin catalog port returns unavailable.
- Given static frontend registry entries exist, when navigation renders, then
  they are treated as presentation composition only.
- Given a plugin can execute runtime behavior, then its readiness must come from
  backend capability or catalog evidence.

## Story 5: Keep admin read models out of the workspace port

As an admin user, I want role and audit views to depend on an admin read port so
workspace graph/file capabilities do not imply RBAC or audit authority.

Acceptance:

- Given API mode is active and no admin read rail exists, when admin roles or
  audit log are requested, then the admin read port returns unavailable before
  transport.
- Given a test harness injects fixture roles and audit entries, when they
  render, then they remain test-only and do not imply production RBAC truth.

## Story 6: Fence warehouse source import as command-oriented work

As a data author, I want warehouse source discovery and import to use a
source-import port so browser-local import semantics cannot masquerade as a
backend command.

Acceptance:

- Given API mode is active and warehouse source rails do not exist, when the
  wizard opens, then the source import port returns unavailable capability.
- Given a test harness injects source-import doubles, when sources are imported,
  then generated graph/file changes remain test-only.
- Given backend import rails are introduced later, then discovery queries and
  import commands are cataloged separately.

## Story 7: Prevent broad-port regression

As an architect, I want a semantic architecture test to fail if a broad
workspace port returns so that future work cannot reintroduce hidden authority.

Acceptance:

- Given a developer adds `IWorkspacePort` with graph, files, diff, admin,
  plugins, import, and write methods, when the architecture test runs, then it
  fails.
- Given a view imports more than its owned capability port, when the architecture
  test runs, then it reports the violating consumer.
- Given all consumers use narrow ports, when the architecture test runs, then it
  passes.
