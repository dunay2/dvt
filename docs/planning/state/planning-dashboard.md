---
title: Planning Dashboard
status: Active
owner: Product / Architecture / Delivery
last_reviewed: 2026-09-09
planning_type: operational
---

# Planning Dashboard

Use the repository's [GitHub Issues](https://github.com/dunay2/dvt/issues) to
inspect queued, active, blocked, and completed product work.

- Task lifecycle and sequencing: GitHub Issues.
- Implementation review and integration: GitHub pull requests.
- Architecture, components, capabilities, relationships, command/query rails,
  feature mechanization, and governed evidence: Planning DB.
- Current product implementation truth: code, contracts, tests, and CI on
  `main`.

Local agent lanes, lane YAML, rendered lane pages, workboards, open-task routes,
and Planning DB task rows are retired. They must not be recreated as a second
task authority.

See [GitHub MVP Issue Workflow](./github-mvp-issue-workflow.md) for the delivery
procedure and
[ADR-0061](../../adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
for the authority boundary.
