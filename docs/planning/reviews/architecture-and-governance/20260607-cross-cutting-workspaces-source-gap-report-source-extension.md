---
title: Cross-Cutting Workspaces Source Gap Report Extension
status: Draft
owner: Architecture / Governance / Operations
workspace_group:
  - '@dvt/artifacts'
  - '@dvt/observability'
  - '@dvt/observability-otel'
  - '@dvt/traceability-service'
  - '@dvt/cli'
  - '@dvt/crypto'
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
extends: docs/planning/reviews/architecture-and-governance/20260607-cross-cutting-workspaces-source-gap-report.md
---

# Cross-Cutting Workspaces Source Gap Report Extension

## Purpose

This extension verifies cross-cutting workspace conclusions against source. It
separates mature shared abstractions from scaffold/posture mismatches.

## Sources checked

- `packages/@dvt/artifacts/src/index.ts`
- `packages/@dvt/observability/src/index.ts`
- `packages/@dvt/observability/src/contracts/IObservability.ts`
- `packages/@dvt/observability/src/policy/cardinalityPolicy.ts`
- `packages/@dvt/observability-otel/src/OtelObservability.ts`
- `packages/@dvt/traceability-service/src/index.ts`
- `packages/@dvt/cli/src/index.ts`
- `packages/@dvt/cli/validate-contracts.cjs`
- `packages/@dvt/canonical/package.json`

## Source-backed corrections

### 1. Artifacts is a real bounded context

`@dvt/artifacts/src/index.ts` says it is the canonical owner package for
compiled-code storage and enrichment concerns. It exports storage ports, plan
store ports, stored plan artifact store ports, dbt project bundle reading, run
execution context reading, artifact integrity validation, compiled-code SHA/ref
attachment, and multiple storage adapters.

**Correction**

Artifacts should not be treated as a thin helper package. The gap is lifecycle
contract and consumer burn-down from planner transitional re-exports.

### 2. Observability core is meaningful; OTel adapter is scaffolded

`@dvt/observability` defines core interfaces for metrics, traces, logs, spans,
context propagation, and cardinality validation. The cardinality policy forbids
high-cardinality metric label keys including runId, stepId, planId, planSha,
attemptId, and userId.

`@dvt/observability-otel/src/OtelObservability.ts` explicitly says it is a
scaffold and should be replaced with OpenTelemetry SDK bindings. Metrics and
traces are noop implementations; logs are JSON console output.

**Correction**

Do not say observability is absent. Core observability exists. Real OTel export is
not implemented.

### 3. Traceability-service has both governance and runtime roles

`traceability-service/src/index.ts` exports types, contracts, service,
filesystem ADR catalog adapter, glob header scanner, manifest builder, validator,
and lineage index. This package spans source/governance traceability and runtime
lineage.

**Correction**

The package is powerful but overloaded. The gap is role separation and DB-first
documentation alignment.

### 4. CLI source says not user-facing

`@dvt/cli/src/index.ts` declares `userFacingCli: false` and commands
`validate-contracts` and `run-golden-paths`. But package metadata is
`private: false`. `validate-contracts.cjs` is script-backed and validates plan
fixtures plus several contract parser shapes from built contracts.

**Correction**

The CLI should be classified as internal validation surface unless deliberately
promoted to user-facing CLI.

### 5. Crypto/canonical is a real identity drift

`packages/@dvt/canonical/package.json` names the package `@dvt/crypto`. The path,
package name, tests, and CI scope do not use one vocabulary.

**Correction**

This is not just naming taste. It affects workspace count, source maps, generated
docs, and developer mental model.

## Refined cross-cutting gaps

### CC-01R — Artifact lifecycle matrix

Create a generated matrix covering compiled code, stored plans, dbt bundles, run
execution contexts, integrity checks, storage backend, tenant scope, retention,
and error semantics.

### CC-02R — Observability signal catalogue

Generate a signal catalogue from usages and enforce cardinality policy. High
cardinality correlation belongs in context/logs/traces, not metric labels.

### CC-03R — OTel posture decision

Choose one:

- rename/document as noop/console adapter;
- implement real OpenTelemetry SDK exporters.

Do not leave `OtelObservability` looking production-ready while source says
scaffold.

### CC-04R — Traceability role split

Split matrix into:

- governance/source traceability;
- manifest validation;
- ADR/header scanning;
- runtime lineage;
- DB-first documentation import/export.

### CC-05R — CLI visibility decision

Either make package private/internal or define user-facing command contract. For
now source indicates internal validation only.

### CC-06R — Crypto/canonical ADR

Add ADR or status decision for path/package naming. The decision must update
workspace registry and CI policy.

## Updated cross-cutting remediation order

1. Workspace registry and crypto/canonical naming decision.
2. OTel scaffold posture decision.
3. CLI visibility decision.
4. Artifact lifecycle matrix.
5. Observability signal catalogue.
6. Traceability role split and DB-first alignment.
7. Generated public surface matrices.

## Closeout

Cross-cutting packages are not empty. The risk is mostly posture mismatch and
lack of generated governance: OTel scaffold, CLI visibility, artifact lifecycle,
traceability role split, observability signal catalogue, and crypto/canonical
identity drift.
