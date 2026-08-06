---
title: Repository Map
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-06
---

# Repository Map

Use this map to locate a workspace, its exact architecture identity, and its canonical documentation entry point.
Repository facts come from package manifests and source/test files; architecture and documentation identity come from Planning DB read models.
Missing or conflicting identity is reported as a gap and is never inferred from package, directory, title, or document names.

## Current state

| Metric                  | Value                                            |
| ----------------------- | ------------------------------------------------ |
| Workspaces              | 27                                               |
| Rows with explicit gaps | 27                                               |
| Workspace source        | `apps/*` and `packages/*` package manifests      |
| Architecture source     | `architecture.component_query`                   |
| Documentation source    | `planning_query_store.documentation_panel_query` |

## Workspace map

| Workspace                                 | Path                                                 | Kind    | Src | Tests | Build | Test | Typecheck | Planning DB component      | Component status | Canonical documentation | Gap                    |
| ----------------------------------------- | ---------------------------------------------------- | ------- | --- | ----- | ----- | ---- | --------- | -------------------------- | ---------------- | ----------------------- | ---------------------- |
| dvt-api                                   | `apps/api`                                           | app     | 368 | 256   | yes   | yes  | yes       | SYS-API-ROOT               | review           | -                       | missing-doc-entry      |
| dvt-lineage-worker                        | `apps/lineage-worker`                                | app     | 9   | 5     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| dvt-outbox-worker                         | `apps/outbox-worker`                                 | app     | 25  | 29    | yes   | yes  | yes       | SYS-WORKERS-ROOT           | review           | -                       | missing-doc-entry      |
| dvt-projector-worker                      | `apps/projector-worker`                              | app     | 2   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| dvt-temporal-worker                       | `apps/temporal-worker`                               | app     | 21  | 15    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/web                                  | `apps/web`                                           | app     | 819 | 534   | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/adapter-postgres                     | `packages/@dvt/adapter-postgres`                     | package | 59  | 49    | yes   | yes  | yes       | SYS-ADAPTERS-ROOT          | review           | -                       | missing-doc-entry      |
| @dvt/adapter-temporal                     | `packages/@dvt/adapter-temporal`                     | package | 44  | 46    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/artifacts                            | `packages/@dvt/artifacts`                            | package | 22  | 5     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/crypto                               | `packages/@dvt/canonical`                            | package | 3   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/cli                                  | `packages/@dvt/cli`                                  | package | 1   | 1     | yes   | yes  | yes       | SYS-RUNTIME-CLI-VALIDATION | review           | -                       | missing-doc-entry      |
| @dvt/contracts                            | `packages/@dvt/contracts`                            | package | 98  | 55    | yes   | yes  | yes       | SYS-CONTRACTS-ROOT         | review           | -                       | missing-doc-entry      |
| @dvt/delivery                             | `packages/@dvt/delivery`                             | package | 15  | 11    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/dsl                                  | `packages/@dvt/dsl`                                  | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/engine                               | `packages/@dvt/engine`                               | package | 125 | 70    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/observability                        | `packages/@dvt/observability`                        | package | 5   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/observability-otel                   | `packages/@dvt/observability-otel`                   | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/plan-interpreter                     | `packages/@dvt/plan-interpreter`                     | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/plan-verifier                        | `packages/@dvt/plan-verifier`                        | package | 6   | 5     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/planner                              | `packages/@dvt/planner`                              | package | 28  | 23    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/planner-contracts                    | `packages/@dvt/planner-contracts`                    | package | 0   | 0     | yes   | no   | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/run-domain                           | `packages/@dvt/run-domain`                           | package | 5   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/state-store                          | `packages/@dvt/state-store`                          | package | 15  | 13    | yes   | yes  | yes       | SYS-RUNTIME-STATE-STORE    | review           | -                       | missing-doc-entry      |
| @dvt/temporal-dbt-plugin                  | `packages/@dvt/temporal-dbt-plugin`                  | package | 11  | 2     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/temporal-http-json-plugin            | `packages/@dvt/temporal-http-json-plugin`            | package | 5   | 2     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/temporal-object-file-postgres-plugin | `packages/@dvt/temporal-object-file-postgres-plugin` | package | 6   | 4     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/traceability-service                 | `packages/@dvt/traceability-service`                 | package | 39  | 15    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |

## Reading rule

- `unregistered-component`: no active Planning DB component has the exact workspace repository path.
- `ambiguous-component`: more than one active Planning DB component claims the exact workspace path.
- `missing-doc-entry`: the matched component has no current canonical document linked by explicit component identity.
- `ambiguous-doc-entry`: more than one current canonical document is linked to the same component identity.

## Related authored context

- [Component Map](../architecture/component-map.md) for authored component responsibilities and relations.
- [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) for topic-level code, test, command, and evidence navigation.
- [System Delivery Status](../architecture/system-delivery-status.md) for current delivery and maturity interpretation.
- [Glossary](./glossary.md) and [Domain Language](./domain-language.md) for repository terminology.

This projection does not define behavior, maturity, or responsibility prose.
Use the linked canonical document for authored meaning and design rationale.

> This page is auto-generated by `pnpm docs:status:generate`. Do not edit manually.
