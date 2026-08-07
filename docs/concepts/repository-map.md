---
title: Repository Map
status: Active
owner: Architecture / Docs
last_reviewed: 2026-08-07
---

# Repository Map

Use this map to locate every effective pnpm workspace, its exact architecture identity, and an exact documentation entry when one is mechanically available.
Architecture identity comes from Planning DB; documentation coverage comes from an explicit canonical binding when registered or an exact workspace-local README fallback.
Missing or conflicting identity is reported as a gap and is never inferred from package, directory, title, or document names.

## Current state

| Metric                  | Value                                            |
| ----------------------- | ------------------------------------------------ |
| Workspaces              | 27                                               |
| Rows with explicit gaps | 27                                               |
| Workspace source        | `pnpm list -r --depth -1 --json`                 |
| Architecture source     | `architecture.component_query`                   |
| Documentation source    | exact component binding or workspace `README.md` |

## Workspace map

| Workspace                                 | Path                                                 | Kind    | Src | Tests | Build | Test | Typecheck | Planning DB component      | Component status | Documentation entry                                                                                | Coverage       | Gap                           |
| ----------------------------------------- | ---------------------------------------------------- | ------- | --- | ----- | ----- | ---- | --------- | -------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- | -------------- | ----------------------------- |
| dvt-api                                   | `apps/api`                                           | app     | 368 | 256   | yes   | yes  | yes       | SYS-API-ROOT               | review           | [apps/api/README.md](../../apps/api/README.md)                                                     | linked-local   | missing-canonical-doc-binding |
| dvt-lineage-worker                        | `apps/lineage-worker`                                | app     | 9   | 5     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| dvt-outbox-worker                         | `apps/outbox-worker`                                 | app     | 25  | 29    | yes   | yes  | yes       | SYS-WORKERS-ROOT           | review           | [apps/outbox-worker/README.md](../../apps/outbox-worker/README.md)                                 | linked-local   | missing-canonical-doc-binding |
| dvt-projector-worker                      | `apps/projector-worker`                              | app     | 2   | 1     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| dvt-temporal-worker                       | `apps/temporal-worker`                               | app     | 21  | 15    | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/web                                  | `apps/web`                                           | app     | 825 | 541   | yes   | yes  | yes       | -                          | -                | [apps/web/README.md](../../apps/web/README.md)                                                     | linked-local   | unregistered-component        |
| @dvt/adapter-postgres                     | `packages/@dvt/adapter-postgres`                     | package | 59  | 49    | yes   | yes  | yes       | SYS-ADAPTERS-ROOT          | review           | -                                                                                                  | reference-only | missing-canonical-doc-binding |
| @dvt/adapter-temporal                     | `packages/@dvt/adapter-temporal`                     | package | 44  | 46    | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/artifacts                            | `packages/@dvt/artifacts`                            | package | 22  | 5     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/crypto                               | `packages/@dvt/canonical`                            | package | 3   | 1     | yes   | yes  | yes       | -                          | -                | [packages/@dvt/canonical/README.md](../../packages/@dvt/canonical/README.md)                       | linked-local   | unregistered-component        |
| @dvt/cli                                  | `packages/@dvt/cli`                                  | package | 1   | 1     | yes   | yes  | yes       | SYS-RUNTIME-CLI-VALIDATION | review           | [packages/@dvt/cli/README.md](../../packages/@dvt/cli/README.md)                                   | linked-local   | missing-canonical-doc-binding |
| @dvt/contracts                            | `packages/@dvt/contracts`                            | package | 98  | 55    | yes   | yes  | yes       | SYS-CONTRACTS-ROOT         | review           | -                                                                                                  | reference-only | missing-canonical-doc-binding |
| @dvt/delivery                             | `packages/@dvt/delivery`                             | package | 15  | 11    | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/dsl                                  | `packages/@dvt/dsl`                                  | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | [packages/@dvt/dsl/README.md](../../packages/@dvt/dsl/README.md)                                   | linked-local   | unregistered-component        |
| @dvt/engine                               | `packages/@dvt/engine`                               | package | 125 | 70    | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/observability                        | `packages/@dvt/observability`                        | package | 5   | 1     | yes   | yes  | yes       | -                          | -                | [packages/@dvt/observability/README.md](../../packages/@dvt/observability/README.md)               | linked-local   | unregistered-component        |
| @dvt/observability-otel                   | `packages/@dvt/observability-otel`                   | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | [packages/@dvt/observability-otel/README.md](../../packages/@dvt/observability-otel/README.md)     | linked-local   | unregistered-component        |
| @dvt/plan-interpreter                     | `packages/@dvt/plan-interpreter`                     | package | 4   | 1     | yes   | yes  | yes       | -                          | -                | [packages/@dvt/plan-interpreter/README.md](../../packages/@dvt/plan-interpreter/README.md)         | linked-local   | unregistered-component        |
| @dvt/plan-verifier                        | `packages/@dvt/plan-verifier`                        | package | 6   | 5     | yes   | yes  | yes       | -                          | -                | [packages/@dvt/plan-verifier/README.md](../../packages/@dvt/plan-verifier/README.md)               | linked-local   | unregistered-component        |
| @dvt/planner                              | `packages/@dvt/planner`                              | package | 28  | 23    | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/planner-contracts                    | `packages/@dvt/planner-contracts`                    | package | 0   | 0     | yes   | no   | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/run-domain                           | `packages/@dvt/run-domain`                           | package | 5   | 1     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/state-store                          | `packages/@dvt/state-store`                          | package | 15  | 13    | yes   | yes  | yes       | SYS-RUNTIME-STATE-STORE    | review           | -                                                                                                  | reference-only | missing-canonical-doc-binding |
| @dvt/temporal-dbt-plugin                  | `packages/@dvt/temporal-dbt-plugin`                  | package | 11  | 2     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/temporal-http-json-plugin            | `packages/@dvt/temporal-http-json-plugin`            | package | 5   | 2     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/temporal-object-file-postgres-plugin | `packages/@dvt/temporal-object-file-postgres-plugin` | package | 6   | 4     | yes   | yes  | yes       | -                          | -                | -                                                                                                  | reference-only | unregistered-component        |
| @dvt/traceability-service                 | `packages/@dvt/traceability-service`                 | package | 39  | 15    | yes   | yes  | yes       | -                          | -                | [packages/@dvt/traceability-service/README.md](../../packages/@dvt/traceability-service/README.md) | linked-local   | unregistered-component        |

## Reading rule

- `canonical`: an exact canonical document binding exists for the workspace component.
- `linked-local`: no canonical binding exists, but the effective workspace has an exact local `README.md`.
- `reference-only`: neither an exact canonical binding nor a workspace-local README exists.
- `unregistered-component`: no active non-drift Planning DB component has the exact workspace repository path.
- `ambiguous-component`: more than one active non-drift component claims the exact workspace path.
- `missing-canonical-doc-binding`: the component is registered but no exact canonical document relation is registered.
- `ambiguous-canonical-doc-binding`: more than one canonical document is explicitly bound to the component.

## Related authored context

- [Component Map](../architecture/component-map.md) for authored component responsibilities and relations.
- [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) for topic-level code, test, command, and evidence navigation.
- [System Delivery Status](../architecture/system-delivery-status.md) for current delivery and maturity interpretation.
- [Glossary](./glossary.md) and [Domain Language](./domain-language.md) for repository terminology.

This projection does not define behavior, maturity, or responsibility prose.
Use the exact documentation entry when present and the related authored context for broader interpretation.

> This page is auto-generated by `pnpm docs:status:generate`. Do not edit manually.
