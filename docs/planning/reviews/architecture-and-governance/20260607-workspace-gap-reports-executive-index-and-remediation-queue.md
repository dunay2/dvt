---
title: Workspace Gap Reports Executive Index And Remediation Queue
status: Draft
owner: Architecture / Product / Governance
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# Workspace Gap Reports Executive Index And Remediation Queue

## Purpose

This document turns the source-grounded reports in this branch into an actionable
engineering queue. It is not another audit. It is the decision layer over the
reports governed under `docs/planning/reviews/architecture-and-governance/`.

## Report set

| Area                        | Base report                                                                                                | Source extension                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Initial workspace inventory | `docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-batch-01.md`             | `docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-batch-01-source-extension.md`             |
| Contracts                   | `docs/planning/reviews/architecture-and-governance/20260607-contracts-workspace-gap-report.md`             | `docs/planning/reviews/architecture-and-governance/20260607-contracts-workspace-gap-report-source-extension.md`             |
| Web                         | `docs/planning/reviews/architecture-and-governance/20260607-web-workspace-gap-report.md`                   | `docs/planning/reviews/architecture-and-governance/20260607-web-workspace-gap-report-source-extension.md`                   |
| API                         | `docs/planning/reviews/architecture-and-governance/20260607-api-workspace-gap-report.md`                   | `docs/planning/reviews/architecture-and-governance/20260607-api-workspace-gap-report-source-extension.md`                   |
| All workspaces              | `docs/planning/reviews/architecture-and-governance/20260607-source-grounded-24-workspace-gap-reports.md`   | `docs/planning/reviews/architecture-and-governance/20260607-source-grounded-24-workspace-gap-reports-source-extension.md`   |
| Core planning/execution     | `docs/planning/reviews/architecture-and-governance/20260607-core-execution-planning-source-gap-report.md`  | `docs/planning/reviews/architecture-and-governance/20260607-core-execution-planning-source-gap-report-source-extension.md`  |
| Runtime/adapters/workers    | `docs/planning/reviews/architecture-and-governance/20260607-runtime-adapters-workers-source-gap-report.md` | `docs/planning/reviews/architecture-and-governance/20260607-runtime-adapters-workers-source-gap-report-source-extension.md` |
| Product flow closure        | `docs/planning/reviews/architecture-and-governance/20260607-product-flow-closure-source-gap-report.md`     | `docs/planning/reviews/architecture-and-governance/20260607-product-flow-closure-source-gap-report-source-extension.md`     |
| Cross-cutting workspaces    | `docs/planning/reviews/architecture-and-governance/20260607-cross-cutting-workspaces-source-gap-report.md` | `docs/planning/reviews/architecture-and-governance/20260607-cross-cutting-workspaces-source-gap-report-source-extension.md` |

## Executive findings

### Finding 1 — DVT is not a blank prototype

The source proves real implemented foundations:

- API route constants and protected runtime command/query rail catalog.
- Web plugin projection, DVT canvas kind, DVT source/transform/sink node kinds,
  toolbar command surface, and local readiness model.
- Contracts for generic graph source, execution plan, and workspace graph draft.
- Planner facade and deterministic planning pipeline.
- Plan verifier logic for plan ID/admission/step config.
- Plan interpreter DAG validation and deterministic execution layers.
- Temporal workflow determinism, activity dispatch, and plugin step activity
  model.
- Postgres state/outbox/archive/lineage surface.
- Delivery outbox/projector runtimes.
- Traceability and artifact packages.

### Finding 2 — The product flow is still not closed

The missing value path is concrete:

```text
source -> transform -> sink -> readiness -> preview -> PlanRef -> run -> events/evidence -> back to canvas
```

The gaps are not vague. They are named rails and contracts:

- `ValidateCanvasExecutionReadiness`
- typed DVT node configuration
- generic DVT source/transform/sink golden proof
- `CancelRun` frontend consumption
- `OpenRunSourceCanvas`
- `ListNodeExecutionEvidence`
- `SaveCodeWorkspaceFileBuffer`
- `UpdateNodeCodeProjection`
- `TestWarehouseConnection`
- `CreateWarehouseConnection`

### Finding 3 — Some first-pass concerns were corrected by source inspection

- API does not lack a route/rail inventory; it has `runtimeRoutes.constants.ts`
  and `PROTECTED_RUNTIME_COMMAND_QUERY_RAILS`.
- Contracts do not lack generic workflow contracts; `ExecutionPlan.v1` and
  `WorkspaceGraphAuthoringDraft.v1` are strong.
- Web does not lack an architecture; it has plugin projection, route registry,
  DVT node kinds, connection rules, and readiness read model.
- Runtime is not ad hoc; Temporal, outbox, projector, and lineage have real
  runtimes.

### Finding 4 — Governance/reporting gaps remain real

- Workspace count/identity is ambiguous until a canonical workspace registry
  exists.
- `@dvt/crypto` package lives under `packages/@dvt/canonical`.
- `@dvt/observability-otel` is scaffold/noop while named like a real OTel adapter.
- `@dvt/cli` says `userFacingCli: false` while package metadata is `private: false`.
- `@dvt/plan-verifier` and `@dvt/state-store` use `--passWithNoTests` posture.

## Prioritized remediation queue

## P0 — Registry and truth alignment

### P0.1 — Canonical workspace registry

**Problem**

The branch identified 24/25 count ambiguity depending on whether CLI is counted
and how `@dvt/crypto`/`packages/@dvt/canonical` is interpreted.

**Deliverable**

Create a canonical registry source with:

- workspace key;
- package name;
- path;
- workspace kind: app/package/tooling;
- product inclusion;
- CI scope key;
- owner;
- public/private posture;
- source index;
- validation commands.

**Suggested path**

`docs/planning/status/workspace-registry.md` or a DB-backed source plus generated
Markdown.

**Validation**

- registry includes every entry from `tools/ci/scope-config.mjs`;
- registry reconciles `workflow-scope.json`;
- no unclassified workspace remains.

### P0.2 — `@dvt/crypto` / `packages/@dvt/canonical` decision

**Problem**

Package name and physical path disagree.

**Deliverable**

ADR/status decision:

- rename path;
- rename package;
- or document compatibility and enforce it.

## P1 — Product vertical proof

### P1.1 — Seeded DVT source-to-run golden proof

**Problem**

The repo has pieces but no single vertical proof.

**Deliverable**

A seeded flow using existing server-known connection:

```text
dvt:source -> dvt:sql_transform -> dvt:sink
```

It must prove:

- graph draft shape;
- planner envelope;
- plan preview;
- persisted PlanRef;
- plan verification;
- interpreter layers;
- start run;
- run status/events;
- evidence link or explicit missing-evidence diagnostic.

**Validation**

- unit/contract fixtures for the chain;
- API integration where feasible;
- Cypress E2E route when web path is ready.

### P1.2 — `ValidateCanvasExecutionReadiness`

**Problem**

`ObservePlanRunReadiness` exists locally, but authoritative readiness is still a
gap.

**Deliverable**

Governed query rail with machine-readable blockers:

- missing source;
- missing transform;
- missing sink;
- invalid edge;
- disconnected graph;
- missing connection;
- invalid SQL;
- unsupported step kind;
- adapter unavailable;
- authorization denied.

### P1.3 — Typed DVT node configuration

**Problem**

DVT node kinds exist but are thin visual/authoring primitives.

**Deliverable**

Typed config contracts and UI editor paths for:

- source;
- SQL transform;
- sink.

## P2 — Core proof and tests

### P2.1 — Plan verifier direct test suite

**Problem**

`@dvt/plan-verifier` has real logic but weak `--passWithNoTests` posture.

**Deliverable**

Tests for:

- plan ID valid;
- plan ID mismatch;
- unsupported plan/schema/runtime;
- invalid plan payload;
- unknown step kind;
- invalid step config;
- valid known config.

### P2.2 — Plan interpreter fixture taxonomy

**Problem**

DAG implementation is real, but fixture coverage should be explicit.

**Deliverable**

Fixtures for sequential, fan-out, fan-in, diamond, duplicate id, empty id,
unknown dependency, self dependency, invalid dependency value, cycle, downstream
collection.

### P2.3 — Planner profile split

**Problem**

Planner supports generic graph but defaults are dbt-oriented.

**Deliverable**

Explicit profiles:

- `dbt`;
- `dvt-generic`.

## P3 — Runtime operational contracts

### P3.1 — Runtime step capability registry

**Problem**

Planner/verifier/Temporal worker capability truth is fragmented.

**Deliverable**

Step kind registry connecting:

- planner factory;
- contract schema;
- verifier;
- interpreter;
- Temporal activity;
- Postgres relational capability;
- worker profile;
- API readiness;
- web blocker.

### P3.2 — Delivery guarantee and idempotency matrix

**Problem**

Outbox publish-before-mark-delivered implies at-least-once behavior.

**Deliverable**

Document and test delivery guarantee and duplicate handling.

### P3.3 — Worker admin/SLO contract

**Problem**

Worker admin responses are inconsistent.

**Deliverable**

Shared worker response contract including readiness, lag, last tick, last error,
mode, and queue state.

## P4 — Cross-cutting posture cleanup

### P4.1 — OTel adapter posture decision

**Problem**

`@dvt/observability-otel` is scaffold/noop.

**Deliverable**

Either implement real OTel SDK binding or rename/document as console/noop adapter.

### P4.2 — CLI visibility decision

**Problem**

`@dvt/cli` metadata and source posture conflict.

**Deliverable**

Make package private/internal or define user-facing CLI contract.

### P4.3 — Artifact lifecycle matrix

**Problem**

Artifacts package owns serious storage concerns but lacks lifecycle matrix.

**Deliverable**

Matrix for compiled code, plan artifacts, dbt bundles, run execution contexts,
integrity, storage backend, tenant scope, retention, and error semantics.

## Suggested first PRs

### PR 1 — Workspace registry only

Scope:

- add workspace registry doc/source;
- classify current workspaces;
- document 24/25 count policy;
- no runtime code changes.

Risk: low. Value: high for governance and future automation.

### PR 2 — Plan verifier tests

Scope:

- add direct tests for existing verifier behavior;
- remove confidence risk from `--passWithNoTests` posture where possible.

Risk: low. Value: high for execution safety.

### PR 3 — API route/rail generated report

Scope:

- generate Markdown from `runtimeRoutes.constants.ts` and
  `PROTECTED_RUNTIME_COMMAND_QUERY_RAILS`;
- compare route constants with rail rows.

Risk: low/medium. Value: high for frontend/backend alignment.

### PR 4 — Product vertical proof design

Scope:

- create contract fixtures for DVT source/transform/sink;
- document readiness blockers;
- define seeded connection assumptions.

Risk: medium. Value: highest product return.

## Non-goals for the next slice

- Do not refactor all workspaces at once.
- Do not rename `@dvt/crypto` before ADR/registry decision.
- Do not implement real OTel and product flow in the same PR.
- Do not add new UI behavior without rail/catalog update.
- Do not let generated docs become another hand-maintained truth source.

## Closeout

The branch now contains a source-grounded map and an actionable remediation queue.
The next high-return move is not more audit; it is a small PR that makes the
workspace registry and/or verifier tests executable.
