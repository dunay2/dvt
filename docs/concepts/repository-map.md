---
title: Repository Map
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-02
---

# Repository Map

Current workspace facts come from package manifests and repository source/test files.
Architecture identity and canonical-document ownership come from exact Planning DB read models.
Missing or conflicting identity is reported as a gap and is never inferred from names.

## Current state

| Metric                  | Value                                                |
| ----------------------- | ---------------------------------------------------- |
| Workspaces              | 25                                                   |
| Rows with explicit gaps | 25                                                   |
| Workspace source        | `apps/*` and `packages/*` package manifests          |
| Architecture source     | `architecture.component_query`                       |
| Documentation source    | `planning_query_store.documentation_lifecycle_query` |

## Workspace map

| Workspace                 | Path                                 | Kind    | Src | Tests | Build | Test | Typecheck | Planning DB component      | Component status | Canonical documentation | Gap                    |
| ------------------------- | ------------------------------------ | ------- | --- | ----- | ----- | ---- | --------- | -------------------------- | ---------------- | ----------------------- | ---------------------- |
| dvt-api                   | `apps/api`                           | app     | 349 | 245   | yes   | yes  | yes       | SYS-API-ROOT               | review           | -                       | missing-doc-entry      |
| dvt-lineage-worker        | `apps/lineage-worker`                | app     | 9   | 5     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| dvt-outbox-worker         | `apps/outbox-worker`                 | app     | 25  | 29    | yes   | yes  | yes       | SYS-WORKERS-ROOT           | review           | -                       | missing-doc-entry      |
| dvt-projector-worker      | `apps/projector-worker`              | app     | 2   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| dvt-temporal-worker       | `apps/temporal-worker`               | app     | 14  | 5     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/web                  | `apps/web`                           | app     | 790 | 512   | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/adapter-postgres     | `packages/@dvt/adapter-postgres`     | package | 57  | 47    | yes   | yes  | yes       | SYS-ADAPTERS-ROOT          | review           | -                       | missing-doc-entry      |
| @dvt/adapter-temporal     | `packages/@dvt/adapter-temporal`     | package | 44  | 46    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/artifacts            | `packages/@dvt/artifacts`            | package | 20  | 3     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/crypto               | `packages/@dvt/canonical`            | package | 3   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/cli                  | `packages/@dvt/cli`                  | package | 1   | 1     | yes   | yes  | yes       | SYS-RUNTIME-CLI-VALIDATION | review           | -                       | missing-doc-entry      |
| @dvt/contracts            | `packages/@dvt/contracts`            | package | 93  | 50    | yes   | yes  | yes       | SYS-CONTRACTS-ROOT         | review           | -                       | missing-doc-entry      |
| @dvt/delivery             | `packages/@dvt/delivery`             | package | 15  | 11    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/dsl                  | `packages/@dvt/dsl`                  | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/engine               | `packages/@dvt/engine`               | package | 124 | 70    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/observability        | `packages/@dvt/observability`        | package | 5   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/observability-otel   | `packages/@dvt/observability-otel`   | package | 2   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/plan-interpreter     | `packages/@dvt/plan-interpreter`     | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/plan-verifier        | `packages/@dvt/plan-verifier`        | package | 6   | 3     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/planner              | `packages/@dvt/planner`              | package | 28  | 21    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/planner-contracts    | `packages/@dvt/planner-contracts`    | package | 0   | 0     | yes   | no   | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/run-domain           | `packages/@dvt/run-domain`           | package | 5   | 1     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/state-store          | `packages/@dvt/state-store`          | package | 15  | 13    | yes   | yes  | yes       | SYS-RUNTIME-STATE-STORE    | review           | -                       | missing-doc-entry      |
| @dvt/temporal-dbt-plugin  | `packages/@dvt/temporal-dbt-plugin`  | package | 10  | 2     | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |
| @dvt/traceability-service | `packages/@dvt/traceability-service` | package | 39  | 15    | yes   | yes  | yes       | -                          | -                | -                       | unregistered-component |

## Reading rule

- `unregistered-component`: no active Planning DB component has the exact workspace repository path.
- `ambiguous-component`: more than one active Planning DB component claims the exact workspace path.
- `missing-doc-entry`: the matched component has no current canonical document with the same subject key.
- `ambiguous-doc-entry`: more than one current canonical document claims the component subject key.

This map is a repository and architecture projection, not a behavioral specification.
Use the linked canonical document for authored meaning and design rationale.

> This page is auto-generated by `pnpm docs:status:generate`. Do not edit manually.
