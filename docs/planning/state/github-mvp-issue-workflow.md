---
title: GitHub MVP Issue Workflow
status: Active
owner: Product / Architecture / Delivery
last_reviewed: 2026-07-31
planning_type: guide
---

# GitHub MVP Issue Workflow

[GitHub Issues](https://github.com/dunay2/dvt/issues) is the only task backlog
and lifecycle authority for MVP delivery. Do not create or update local lane
files, Planning DB task rows, generated workboards, or DB-to-GitHub task
projections.

## Required Flow

1. Select an open issue from the active MVP epic.
2. Confirm its acceptance criteria and dependencies in GitHub.
3. Implement the smallest complete vertical slice.
4. Open a short PR linked to the issue.
5. Resolve review threads and required checks.
6. Merge the PR.
7. Close the issue only when its acceptance criteria are exercised by real
   evidence.

Planning DB remains authoritative for architecture components, capabilities,
relationships, command/query rails, feature mechanization, and governance
evidence. Those records must be updated through their existing command rails
when the implementation changes them.

GitHub issue state must not be inferred from Planning DB status. Planning DB
must not mutate GitHub issue lifecycle.

## Governing Decision

- [ADR-0061 - GitHub MVP task authority and Planning DB architecture boundary](../../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
