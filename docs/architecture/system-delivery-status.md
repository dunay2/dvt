---
title: Current Status
status: Active
owner: Architecture / Delivery / Docs
last_reviewed: 2026-03-12
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

- Review date: 2026-03-08
- Workspace inventory source:
  [Generated Code State](../planning/status/generated-code-state.md)
- Active workspaces: 19
- Source files: 281
- Test files: 75
- Workspaces with test scripts: 15 of 19

## Executive Summary

| Area                       | Current posture | What is true now                                                                                                                                                                             | Primary status source                                                                                                                        |
| -------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry layer                | Partial         | `apps/api` and `apps/web` exist; API auth is implemented in code but still carries architecture-test debt; web has no automated tests                                                        | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) |
| Planning layer             | Partial         | planner, verifier, DSL, and plan-interpreter packages exist; contract and package surfaces are present, but not every product flow is production-hardened                                    | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                                 |
| Execution layer            | Partial         | engine, Postgres adapter, and Temporal adapter are implemented; the first standalone outbox worker slice now exists, while scheduler and further hardening remain gap-driven                 | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md)                                                                               |
| Persistence layer          | Partial         | Postgres state store and outbox persistence primitives are implemented; standalone outbox runtime now exists, but downstream contract hardening, canary rollout, and shard model remain open | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md)                                                                               |
| Observability              | Partial         | observability contracts and the OTel binding exist; production validation remains incomplete                                                                                                 | [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md)                                                                 |
| Traceability / OpenLineage | Partial         | mapper, package tests, `_schemaURL` pinning, and repo-local facet artifacts exist; golden validation and delivery-runtime concerns remain open                                               | [Gap Execution Plans](../planning/gaps/GAP_EXECUTION_PLANS.md), [Canonical Doc Code Matrix](../planning/status/canonical-doc-code-matrix.md) |

## Area Status

### Entry Layer

| Area       | Packages   | Status  | Notes                                                                                                          |
| ---------- | ---------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| API server | `apps/api` | Partial | Real auth and command authorization are implemented in code; architecture-test closure remains open under `G8` |
| Web UI     | `apps/web` | Partial | Client shell and routing exist; automated test coverage is still absent                                        |

### Planning And Interpretation

| Area                | Packages                | Status      | Notes                                                                                                                                         |
| ------------------- | ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning core       | `@dvt/planner`          | Partial     | Planner code and contract coupling exist; repo docs still treat it as an active planning subsystem rather than a fully closed product surface |
| Plan verification   | `@dvt/plan-verifier`    | Partial     | Package exists with tests; it remains a narrow verification utility, not a broad workflow policy layer                                        |
| Plan interpretation | `@dvt/plan-interpreter` | Implemented | Deterministic DAG analysis package exists with test coverage and a canonical package page                                                     |
| DSL evaluation      | `@dvt/dsl`              | Implemented | Small deterministic DSL package exists with package-level tests and canonical docs                                                            |

### Execution And Adapters

| Area              | Packages                   | Status             | Notes                                                                                                                                |
| ----------------- | -------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow engine   | `@dvt/engine`              | Partial            | Core engine exists and remains the largest architecture surface; standalone projector and some runtime separations remain open       |
| Temporal adapter  | `@dvt/adapter-temporal`    | Closed for Phase 1 | Real adapter primitives, worker host, lookup, and time-skipping integration coverage exist; residual hardening is tracked separately |
| Postgres adapter  | `@dvt/adapter-postgres`    | Closed for Phase 1 | State-store and outbox persistence implementation are present and treated as closed in current gap tracking                          |
| Mock/test adapter | `@dvt/engine` test surface | Implemented        | Exists as test-only support surface, not as a product runtime                                                                        |

### Persistence, Read Models, And Delivery

| Area           | Packages                                    | Status             | Notes                                                                                                                                                                                                 |
| -------------- | ------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State store    | `@dvt/state-store`, `@dvt/adapter-postgres` | Closed for Phase 1 | Canonical persistence boundary exists; see the state-store overview and Postgres adapter docs                                                                                                         |
| Outbox runtime | `@dvt/engine`, `@dvt/adapter-postgres`      | Closed for Phase 1 | Closed G5 2026-03-12; standalone worker with advisory-lock shard fencing and local-docker canary evidence delivered; downstream contract hardening and `outbox_lineage` flow remain Phase 2 under G10 |
| Read models    | engine and infra follow-up                  | Partial            | In-process projection exists; standalone read-model service remains open under `G7`                                                                                                                   |

### Observability And Traceability

- `@dvt/observability` (`Implemented`):
  port surface exists and is documented.
- `@dvt/observability-otel` (`Partial`):
  binding exists, but production validation is still incomplete.
- `@dvt/traceability-service` (`Partial`):
  mapper/resolver package exists with tests; `_schemaURL` and repo-local
  contract artifacts exist; golden validation and runtime delivery hardening
  remain open.
- future `outbox_lineage` flow (`Pending`):
  delivery worker and fail-open DLQ policy are still Phase 2 work.

## Gap Summary

| Gap | Title                                        | Current state                            |
| --- | -------------------------------------------- | ---------------------------------------- |
| G1  | Temporal adapter runtime                     | Closed                                   |
| G2  | Postgres state store complete                | Closed                                   |
| G3  | Intent store plus reconciler runtime         | Closed                                   |
| G4  | compiledCodeRef ownership                    | Closed                                   |
| G5  | Independent outbox worker runtime            | Closed                                   |
| G6  | OpenLineage mapping tests plus schema pin    | Partial                                  |
| G7  | Standalone projector and read models         | Partial                                  |
| G8  | API auth hardening                           | Implemented in code, review debt remains |
| G9  | StepTypeRegistry plus typed `stepTypeConfig` | Pending                                  |
| G10 | `outbox_lineage` worker plus fail-open DLQ   | Pending                                  |

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
