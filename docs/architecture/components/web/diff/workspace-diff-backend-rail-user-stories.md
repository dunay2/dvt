---
title: Workspace Diff Backend Rail User Stories
status: Accepted
owner: Web / API / Architecture
last_reviewed: 2026-05-22
planning_type: architecture
---

# Workspace Diff Backend Rail User Stories

1. As an operator reviewing a workspace diff in API mode, I want DiffView to
   request `GetWorkspaceDiffChanges` from the protected runtime API so fixture
   data cannot appear as product truth.
2. As an authenticated operator without `workspace:diff:view`, I want the diff
   query to fail closed so unauthorized workspace evidence is not exposed.
3. As an operator in a workspace with no published diff artifact, I want the
   diff route to show the empty state from an authoritative backend response.
4. As an operator whose workspace has a malformed diff artifact, I want a
   deterministic error rather than partial or guessed diff rows.
5. As a maintainer, I want route, catalog, web adapter, and docs guarded
   together so future changes cannot reintroduce an uncataloged diff endpoint.
