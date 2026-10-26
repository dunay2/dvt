---
title: Pending Source Output must preserve occurrence and canonical ownership
status: mitigated
date: 2026-10-26
owners:
  - Web
  - Contracts
arc_level: ARC-2
---

# Pending Source Output Risks

| Risk                                                               | Mitigation                                                                        | Evidence                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Field removal deletes a global Input or changes a sibling Source   | Local Read identity preference and occurrence-scoped functional delta             | Batched-edit, self-JOIN and duplicate-instance tests                |
| Partial publication exposes physical fields at terminal connection | Resolve producer defaults and recheck current canonical field eligibility         | Partial-default and revoked-publication tests                       |
| Intermediate narrowing removes a key required by later JOINs       | Materialize only terminal Output, preserving complete Reads and ON                | Nested JOIN terminal regression                                     |
| Shared SET/aggregate output silently ignores independent intent    | Explicit rejection for partial intent; complete default preserves authored Output | SET/aggregate matrix                                                |
| Stale async completion publishes half a graph or loses preferences | Snapshot CAS, cancellation and atomic graph document/preference update            | Real-session cancel, stale preference and permission/recovery tests |
| Save/reopen replays defaults over an already configured selection  | Configured and retained documents preserve consumed absence                       | Disconnected configured/retained persistence regressions            |
| Disconnected terminal leaves enabled controls with no owner        | Resolve the owning configured root or disable unavailable controls                | Real staged-command/canonical inspector matrix                      |
| Form-specific styles and edit states drift                         | Shared Frame Edit context, passive inclusion rows and existing tokens             | Presentation and existing architecture/style guards                 |

The implemented rejection of an independent partial Source contribution through a
shared output is an explicit supported boundary, not an unfinished branch.
Existing command permissions, Model Apply/Cancel and persistence CAS remain active.
No new accepted debt or compatibility version is introduced. Exact acceptance and
the earlier SVG-targeting observation are recorded under
[issue #2937](https://github.com/dunay2/dvt/issues/2937) and the
[evidence record](../evidence/ED-20261026-pending-source-output-selection.md).
