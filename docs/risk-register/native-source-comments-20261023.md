---
title: Native source comments must retain provider ownership and field identity
status: mitigated
date: 2026-10-23
owners:
  - API
  - Web
arc_level: ARC-2
---

# Native Source Comment Risks

| Risk                                                            | Mitigation                                                                                                      | Evidence                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Provider comments mistaken for DVT or dbt authored descriptions | Separate optional contract comment and `metadata.sourceComment`; passive source display; no external write-back | Contract, Overview and import tests                     |
| Comment assigned to the wrong field after a column is dropped   | Join `pg_attribute` by relation and column name, read its actual `attnum`                                       | Disposable PostgreSQL proof with ordinal gap            |
| Previous physical source documentation survives rebind          | Replace table/field comments or remove them when absent; preserve logical field order                           | Rebind replacement/removal tests                        |
| Additional catalog work grows with column count                 | Reuse one parameterized batched column query; no per-field calls or row scans                                   | Discovery query-count assertion and real provider proof |
| Long or HTML-like comments distort or execute in the inspector  | Plain React text with wrapping and preserved line breaks                                                        | UI escaping tests and native browser flow               |

The metadata is an import/rebind snapshot. This change does not claim continuous
freshness or a warehouse comment subscription, and does not infer provider
documentation from file-authoritative dbt descriptions. No debt exception or
disabled rule is introduced.
