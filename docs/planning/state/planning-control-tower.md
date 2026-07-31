---
title: Planning Control Tower
status: Active
owner: Product / Architecture / Delivery
last_reviewed: 2026-07-31
planning_type: operational
---

# Planning Control Tower

The MVP uses one task authority: GitHub Issues.

## Authority Boundary

| Concern                                                     | Canonical authority                      |
| ----------------------------------------------------------- | ---------------------------------------- |
| backlog, priority, assignment, status, blockers, acceptance | GitHub Issues                            |
| implementation review, comments, checks, merge              | GitHub pull requests                     |
| components, capabilities, relations, ownership              | Planning DB                              |
| commands, queries, ports, adapters, negative tests          | Planning DB                              |
| feature mechanization and architecture evidence             | Planning DB                              |
| executable product truth                                    | code, contracts, tests, and CI on `main` |

## Invariants

1. No `agent-lane-*` source or generated view exists.
2. No Planning DB task lifecycle command is used.
3. No process projects Planning DB task status into GitHub.
4. An issue closes only after its acceptance criteria are implemented,
   reviewed, merged, and evidenced.
5. Architecture changes still update Planning DB before implementation through
   the existing command/query rails.
6. Git history provides task and implementation history; no parallel local
   task journal is maintained.

Follow [GitHub MVP Issue Workflow](./github-mvp-issue-workflow.md).
