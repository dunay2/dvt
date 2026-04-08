---
title: Repository Map
status: Active
owner: Architecture / Docs
last_reviewed: 2026-03-13
---

# Repository Map

This page is the canonical workspace map for the repository.

Use it to answer:

- which workspace owns what responsibility;
- which document is the visible entry point for that workspace;
- whether the workspace has a full canonical doc surface or is still
  reference-only.

This page is not a behavioral specification. For topic-level traceability, use
[Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md).
For current implementation truth, use
[System Delivery Status](../architecture/system-delivery-status.md).

Concept anchors for this page:

- [Glossary](glossary.md) for `workspace`, `reference-only`,
  `canonical spec`, and `status doc`
- [Domain Language](domain-language.md) for repository-wide naming
  discipline

## Coverage Classes

- `canonical`: the workspace has an active documentation landing page or
  governing doc that should be treated as the first stop.
- `linked-local`: the canonical route lives in `docs/`, but the detailed local
  reference still lives under `apps/` or `packages/`.
- `reference-only`: the workspace exists in code and may have local notes, but
  it still lacks an accepted canonical package surface.

## Entry Surfaces

| Workspace           | Responsibility                                                                  | Primary documentation entry point                                                                                                                                               | Coverage       |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `dvt-api`           | HTTP entrypoint, auth boundary, background runtime wiring                       | [API current-to-target architecture](../architecture/components/api/api-current-to-target-architecture.md), [System Delivery Status](../architecture/system-delivery-status.md) | `canonical`    |
| `dvt-outbox-worker` | Delivery composition root, active/passive ownership host, operational endpoints | [ADR-0034](../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md), [System Delivery Status](../architecture/system-delivery-status.md)                          | `canonical`    |
| `@dvt/web`          | UI shell, graph canvas, run monitoring, client routing                          | [Frontend Architecture](../architecture/frontend/index.md), [apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md](../../apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md)                          | `linked-local` |

## Core Planning and Execution

| Workspace                   | Responsibility                                                | Primary documentation entry point                                                                                                                                                       | Coverage       |
| --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `@dvt/contracts`            | Shared contracts, schemas, execution interfaces               | [Contracts Index](../contracts/index.md), [Engine Contracts](../contracts/engine/index.md)                                                                                              | `canonical`    |
| `@dvt/planner`              | Plan construction, compiledCode attachment, planner contracts | [Planner component surface](../architecture/components/planner/index.md), [Planner Current State Assessment](../planning/status/planner-current-state-assessment.md)                    | `canonical`    |
| `@dvt/plan-interpreter`     | Shared DAG analysis and plan interpretation helpers           | [Plan Interpreter Package](../architecture/shared/plan-interpreter.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                    | `canonical`    |
| `@dvt/plan-verifier`        | Plan integrity, schema compatibility, hash verification       | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md), [ADR-0017](../adr/ADR-0017_ExecutionPlan_Schema_Versioning.md)                                            | `canonical`    |
| `@dvt/dsl`                  | Gateway expression AST, parser, evaluator                     | [Gateway DSL Package](../architecture/shared/dsl.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                      | `canonical`    |
| `@dvt/engine`               | Core workflow execution and orchestration                     | [Engine Architecture](../architecture/engine/index.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                    | `canonical`    |
| `@dvt/adapter-temporal`     | Temporal provider runtime and worker host                     | [Temporal Adapter Specification](../architecture/engine/adapters/temporal/TemporalAdapter.spec.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)        | `canonical`    |
| `@dvt/adapter-postgres`     | Postgres state store, intent store, outbox persistence        | [Postgres State Store Adapter](../architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) | `canonical`    |
| `@dvt/delivery`             | Delivery worker orchestration, retry and shard-aware draining | [ADR-0034](../adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md), [ADR-0033](../adr/ADR-0033-outbox-worker-sharding-and-fencing-model.md)                              | `canonical`    |
| `@dvt/state-store`          | State-store contract and storage boundary                     | [Postgres State Store Adapter](../architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md), [System Delivery Status](../architecture/system-delivery-status.md)          | `canonical`    |
| `@dvt/traceability-service` | Lineage mapping and governance tooling surface                | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md), [packages/@dvt/traceability-service/README.md](../../packages/@dvt/traceability-service/README.md)        | `linked-local` |

## Platform and Support Workspaces

| Workspace                 | Responsibility                                                    | Primary documentation entry point                                                                                                                                            | Coverage       |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `@dvt/observability`      | Runtime observability contracts and label policy                  | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md), [Observability Guide](../architecture/engine/ops/observability.md)                             | `canonical`    |
| `@dvt/observability-otel` | OpenTelemetry implementation path                                 | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md), [packages/@dvt/observability-otel/README.md](../../packages/@dvt/observability-otel/README.md) | `linked-local` |
| `@dvt/cli`                | CLI smoke surface and validation entrypoint                       | [CLI Package](../architecture/shared/cli.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                   | `canonical`    |
| `@dvt/crypto`             | Canonicalization and hashing helpers in `packages/@dvt/canonical` | [Crypto Package](../architecture/shared/crypto.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                             | `canonical`    |
| `@dvt/planner-contracts`  | Package boundary for planner contract artifacts                   | [Contracts Index](../contracts/index.md), [Planner Contracts](../contracts/planner/index.md)                                                                                 | `canonical`    |

## Relationships

- `apps/web` consumes `apps/api` and should not act as a parallel documentation
  root. The route from `docs/` to local frontend docs starts at
  [Frontend Architecture](../architecture/frontend/index.md).
- `@dvt/engine` depends on contracts and ports, while adapters own runtime IO.
  The route for execution topics starts at
  [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md).
- `@dvt/plan-verifier`, `@dvt/dsl`, `@dvt/plan-interpreter`, and `@dvt/crypto`
  are small but critical packages. They cannot remain invisible just because
  they are smaller than engine or adapters.

## Current Package Limitations

- `@dvt/dsl` now has a canonical doc surface, but the package is still only a
  minimal equality-expression DSL and has no accepted repository-wide spec.
- `@dvt/cli` now has a canonical doc surface, but it still exposes script
  entrypoints more than a real exported CLI.
- `@dvt/plan-interpreter` and `@dvt/crypto` are now visible, but both remain
  easy to underestimate because they are small packages with cross-cutting
  impact.

The documentation gap is reduced. The behavior and maturity gaps still need to
be read honestly package by package.
