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

| Risk                                                               | Mitigation                                                                         | Evidence                                                              |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Field removal deletes a global Input or changes a sibling Source   | Local Read identity preference and occurrence-scoped functional delta              | Batched-edit, self-JOIN and duplicate-instance tests                  |
| Partial publication exposes physical fields at terminal connection | Resolve producer defaults and recheck current canonical field eligibility          | Partial-default and revoked-publication tests                         |
| Intermediate narrowing removes a key required by later JOINs       | Materialize only terminal Output, preserving complete Reads and ON                 | Nested JOIN terminal regression                                       |
| Shared SET/aggregate output silently ignores independent intent    | Explicit rejection for partial intent; complete default preserves authored Output  | SET/aggregate matrix                                                  |
| Stale async completion publishes half a graph or loses preferences | Snapshot CAS, cancellation and atomic graph document/preference update             | Real-session cancel, stale preference and permission/recovery tests   |
| Save/reopen replays defaults over an already configured selection  | Configured and retained documents preserve consumed absence                        | Disconnected configured/retained persistence regressions              |
| Disconnected terminal leaves enabled controls with no owner        | Resolve the owning configured root or disable unavailable controls                 | Real staged-command/canonical inspector matrix                        |
| Form-specific styles and edit states drift                         | Shared Frame Edit context, passive inclusion rows and existing tokens              | Presentation and existing architecture/style guards                   |
| Legacy Input removal makes a still-published field unrecoverable   | Explicit additive bind plus exact-occurrence Output inside one Model transaction   | V12 candidate, Apply/Cancel and native recovery matrix                |
| Async Input recovery commits one half of the Model change          | Existing bind and semantic validation on unpublished candidate, one final CAS      | Rejection, permission, stale, cancellation and no-change regressions  |
| Toggle changes row/filter geometry during editing                  | Shared explicit selected-only filter, stable keyed rows and presentation ownership | Edit/filter/focus/scroll/card-position browser and presentation tests |
| A late Apply or durable-save receipt navigates an obsolete Model   | Scoped attempt identities invalidated on settlement, dismissal and unmount         | Deferred receipt, retry, duplicate decision and unmount regressions   |

Producer reordering resolves pending type labels by stable identity, with a real
mixed-type reorder/reopen regression. Structural Save remains available for an
unconfigured terminal while configured initialization retains its Apply guard.
Rejected output ordering restores the local presentation as well as canonical
authority. Native edge tests requery an actionable current centre instead of
retaining stale offsets; the pointer action and persistence assertions remain.

The implemented rejection of an independent partial Source contribution through a
shared output is an explicit supported boundary, not an unfinished branch.
Existing command permissions, Model Apply/Cancel and persistence CAS remain active.
No new accepted debt or compatibility version is introduced. Exact acceptance and
the earlier SVG-targeting observation are recorded under
[issue #2937](https://github.com/dunay2/dvt/issues/2937) and the
[evidence record](../evidence/ED-20261026-pending-source-output-selection.md).
