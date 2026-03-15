---
title: Current Status
status: Active
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-14
---

# Current Status

This page is the current implementation snapshot for the repository.

It is not the canonical behavioral spec for any one subsystem. Use it to answer
one practical question first: what is true in the codebase now, and where are
the remaining delivery gaps?

## Traceability Anchors

Use this page together with:

- [Glossary](../concepts/glossary.md) for shared meanings of `run`, `plan`,
  `adapter`, `status`, `gap`, and `canonical spec`
- [Domain Language](../concepts/domain-language.md) for the naming discipline
  shared across planning, architecture, contracts, and code
- [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
  for the curated topic -> doc -> code -> test -> command mapping
- [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md) for the
  active gap-by-gap delivery posture
- [Generated Code State](../planning/status/generated-code-state.md) for the
  current workspace and test inventory

Minimum tuple for this document:

- `canonical_spec`: topic-specific. Follow the matrix and the linked specs.
- `status_doc`: [`docs/architecture/system-delivery-status.md`](system-delivery-status.md)
- `code_paths`: summarized by area here; exact curated paths live in
  [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
- `test_paths`: summarized by area here; exact paths live in
  [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
- `verification_cmd`: `pnpm test:engine`, `pnpm test:adapter-postgres`,
  `pnpm test:adapter-temporal`, `pnpm test:adapter-temporal:integration`,
  `pnpm validate:contracts`
- `evidence_or_risk`: use linked evidence docs for closed work and linked risk
  records for residual hardening debt

## Snapshot

- Review date: 2026-03-14
- Workspace inventory source:
  [Generated Code State](../planning/status/generated-code-state.md)
- Active workspaces: 20
- Source files: 289
- Test files: 76
- Workspaces with test scripts: 16 of 20

## Executive Summary

| Area                       | Current posture    | What is true now                                                                                                                                                                                   | Primary status source                                                                                                                        |
| -------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry layer                | Partial            | `apps/api` auth hardening closed (G8): OIDC auth, tenant policy, arch rules, and engine-backed StartRun all closed; web has no automated tests                                                     | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) |
| Planning layer             | Partial            | planner, verifier, DSL, and plan-interpreter packages exist; contract and package surfaces are present, but not every product flow is production-hardened                                          | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                                 |
| Execution layer            | Partial            | engine, Postgres adapter, and Temporal adapter are implemented; delivery runtime ownership is now extracted into `@dvt/delivery`, while scheduler and further hardening remain gap-driven          | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md)                                                                               |
| Persistence layer          | Partial            | Postgres state store and outbox persistence primitives are implemented; standalone outbox runtime now exists, but downstream contract hardening, canary rollout, and shard model remain open       | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md)                                                                               |
| Observability              | Partial            | observability contracts and the OTel binding exist; production validation remains incomplete                                                                                                       | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                                 |
| Traceability / OpenLineage | Closed for Phase 1 | mapper, package tests, `_schemaURL` pinning, repo-local facet artifacts, committed golden fixtures, and offline AJV schema validation all pass; delivery-runtime concerns remain Phase 2 under G10 | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) |

## Area Status

### Entry Layer

| Area       | Packages   | Status             | Notes                                                                                                                                      |
| ---------- | ---------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| API server | `apps/api` | Closed for Phase 1 | G8 closed 2026-03-12: OIDC auth, tenant policy, dependency-cruiser arch rules, and `EngineStartRunUseCase` all delivered; 21/21 tests pass |
| Web UI     | `apps/web` | Partial            | Client shell and routing exist; automated test coverage is still absent                                                                    |

### Planning And Interpretation

| Area                | Packages                | Status      | Notes                                                                                                           |
| ------------------- | ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| Planning core       | `@dvt/planner`          | Partial     | Registry/schema hardening and planner validation closed under G9; broader planning-layer hardening remains open |
| Plan verification   | `@dvt/plan-verifier`    | Partial     | Package exists with tests; it remains a narrow verification utility, not a broad workflow policy layer          |
| Plan interpretation | `@dvt/plan-interpreter` | Implemented | Deterministic DAG analysis package exists with test coverage and a canonical package page                       |
| DSL evaluation      | `@dvt/dsl`              | Implemented | Small deterministic DSL package exists with package-level tests and canonical docs                              |

### Execution And Adapters

| Area              | Packages                   | Status             | Notes                                                                                                                                |
| ----------------- | -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow engine   | `@dvt/engine`              | Partial            | Core engine exists and remains the largest architecture surface; standalone projector and some runtime separations remain open       |
| Temporal adapter  | `@dvt/adapter-temporal`    | Closed for Phase 1 | Real adapter primitives, worker host, lookup, and time-skipping integration coverage exist; residual hardening is tracked separately |
| Postgres adapter  | `@dvt/adapter-postgres`    | Closed for Phase 1 | State-store and outbox persistence implementation are present and treated as closed in current gap tracking                          |
| Mock/test adapter | `@dvt/engine` test surface | Implemented        | Exists as test-only support surface, not as a product runtime                                                                        |

### Persistence, Read Models, And Delivery

| Area           | Packages                                                      | Status             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State store    | `@dvt/state-store`, `@dvt/adapter-postgres`                   | Closed for Phase 1 | Canonical persistence boundary exists; see the state-store overview and Postgres adapter docs                                                                                                                                                                                                                                                                                                                                                        |
| Outbox runtime | `@dvt/delivery`, `dvt-outbox-worker`, `@dvt/adapter-postgres` | Closed for Phase 1 | Closed G5 2026-03-12; delivery runtime ownership now lives in `@dvt/delivery`, with `dvt-outbox-worker` acting as the composition root and local-docker canary evidence delivered; downstream contract hardening and `outbox_lineage` flow remain Phase 2 under G10                                                                                                                                                                                  |
| Read models    | engine and infra follow-up                                    | Partial            | In-process projection exists and rejects terminal-state rewrites via `InvalidStateTransitionError`; `WorkflowEngine` can pre-bootstrap `RunQueued` before `adapter.startRun()` when an adapter provides `estimateRunRef`; G7.1 closed 2026-03-14 with numbered migration `004`, `rebuildSnapshot` on `IRunStateStore`, Postgres and in-memory implementations, index-backed `snapshot_status`, and admin rebuild endpoint; G7.2 and G7.3 remain open |

### Observability And Traceability

- `@dvt/observability` (`Implemented`):
  port surface exists and is documented.
- `@dvt/observability-otel` (`Partial`):
  binding exists, but production validation is still incomplete.
- `@dvt/traceability-service` (`Closed for Phase 1`):
  mapper/resolver package with tests; `_schemaURL` pinned; repo-local contract
  artifacts committed; golden fixtures for all 3 mapper paths; offline AJV
  schema validation for both emitted facets; 13/13 tests pass (2026-03-12);
  runtime delivery hardening remains Phase 2 under G10.
- future `outbox_lineage` flow (`Pending`):
  delivery worker and fail-open DLQ policy are still Phase 2 work.

## Gap Summary

| Gap | Title                                        | Current state |
| --- | -------------------------------------------- | ------------- |
| G1  | Temporal adapter runtime                     | Closed        |
| G2  | Postgres state store complete                | Closed        |
| G3  | Intent store plus reconciler runtime         | Closed        |
| G4  | compiledCodeRef ownership                    | Closed        |
| G5  | Independent outbox worker runtime            | Closed        |
| G6  | OpenLineage mapping tests plus schema pin    | Closed        |
| G7  | Standalone projector and read models         | Partial       |
| G8  | API auth hardening                           | Closed        |
| G9  | StepTypeRegistry plus typed `stepTypeConfig` | Closed        |
| G10 | `outbox_lineage` worker plus fail-open DLQ   | Pending       |

For closure criteria, evidence, and exact verification commands, use
[Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md).

## Reading Order

1. [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md)
2. [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)
3. [Generated Code State](../planning/status/generated-code-state.md)
4. Topic-specific specs under [Reference](index.md)

## Topic Entry Points

- Engine and execution invariants:
  [Engine Architecture](engine/index.md)
- State-store boundary:
  [State Store Overview](engine/contracts/state-store/overview.md)
- Shared package surfaces:
  [Shared Package Architecture](shared/index.md)
- Contracts:
  [Contracts Index](../contracts/index.md)
- Planning and execution debt:
  [Planning](../planning/index.md)
