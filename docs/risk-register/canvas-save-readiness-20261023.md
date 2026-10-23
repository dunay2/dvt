---
title: Canvas save and readiness must preserve authority and exact intent
status: mitigated
date: 2026-10-23
owners:
  - Web
  - API
arc_level: ARC-2
---

# Canvas Save And Readiness Risks

| Risk                                                                | Mitigation                                                                                          | Evidence                                                                    |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Equivalent renders indefinitely defer saving                        | Debounce follows semantic identity and revision                                                     | Hook regression with repeated equivalent payloads                           |
| Genuine edits are lost or an unmounted draft is saved               | Preserve committed snapshot, restart on real signature changes and retain cancellation              | Semantic-edit, permission and unmount tests; existing acknowledgement tests |
| Saving is reported as permission denial                             | One typed admission distinguishes permission, persistence and runtime capability                    | Runtime policy and readiness tests                                          |
| A previous rejected Preview survives an edit                        | Bind outcome to attempted draft signature and derive current visibility                             | Rejection/edit regression and protected browser flow                        |
| Independent blockers repeat misleading global prose                 | Shared cause-specific message/label projection                                                      | Operational drawer regression                                               |
| More precise diagnostics accidentally broaden execution             | Keep publication admission in API and retain rejected profile/target tests without writes           | Real publisher admission tests                                              |
| Architecture records look complete without matching source evidence | Current Git ownership, exact symbols, test references and integrity validation                      | Planning DB component profiles and local implementation gate                |
| Generic metadata hides several reasons to change                    | Replace exact superseded values through the scoped revision command; name delegated concerns        | Six current definitions and their precise responsibility reasons            |
| A readiness query imports a command or concrete transport           | Root dependency-cruiser rejects reversed component import directions, including type imports        | Negative import fixtures, valid composition and real repository graph       |
| Metadata correction overwrites unrelated authority                  | Preserve ownership and bindings; retain expected revision, design scope and audited semantic deltas | Stale/unknown-removal tests and unchanged binding digests                   |

PostgreSQL's observed backend termination remains unexplained; it is not declared
fixed by this product slice. Existing global component evidence warnings also
remain open. Git preserves prior documentation; no historical copies or parallel
task registry are added.
