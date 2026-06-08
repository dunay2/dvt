---
title: Cross-Cutting Workspaces Source Gap Report
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
---

# Cross-Cutting Workspaces Source Gap Report

## Scope

This report covers the workspaces that do not sit cleanly inside one product
screen or one runtime loop, but strongly affect product correctness,
traceability, operational safety, and dynamic documentation.

Included surfaces:

- artifacts and plan/code storage;
- observability contracts;
- OpenTelemetry adapter posture;
- traceability service and lineage API;
- CLI validation/golden-path commands;
- crypto/canonical identity drift.

## Sources inspected

- `packages/@dvt/artifacts/package.json`
- `packages/@dvt/artifacts/src/index.ts`
- `packages/@dvt/observability/package.json`
- `packages/@dvt/observability/src/index.ts`
- `packages/@dvt/observability/src/contracts/IObservability.ts`
- `packages/@dvt/observability/src/policy/cardinalityPolicy.ts`
- `packages/@dvt/observability-otel/package.json`
- `packages/@dvt/observability-otel/src/index.ts`
- `packages/@dvt/observability-otel/src/OtelObservability.ts`
- `packages/@dvt/traceability-service/package.json`
- `packages/@dvt/traceability-service/src/index.ts`
- `packages/@dvt/cli/package.json`
- `packages/@dvt/cli/src/index.ts`
- `packages/@dvt/cli/validate-contracts.cjs`
- `packages/@dvt/canonical/package.json`
- `tools/ci/scope-config.mjs`
- `tools/ci/policy/workflow-scope.json`

## Current source facts

### Artifacts

`@dvt/artifacts` declares itself as the canonical owner package for compiled-code
storage and enrichment concerns. It exports compiled-code storage, dbt bundle
reading, plan-store read/write ports, stored plan artifact ports, run execution
context reading, artifact read/integrity helpers, compiled-code hashing/ref
attachment, and S3/Minio/filesystem/in-memory/noop storage adapters.

Planner still has transitional artifact re-exports, so artifact boundary
extraction is not fully burned down.

### Observability core

`@dvt/observability` exposes contracts for metrics, traces, logs, observability
context, cardinality policy, and noop observability.

`IObservability` has metrics, traces, logs, and `withContext`. Metrics expose
counters, histograms, and gauges. Traces expose spans and scoped execution.
Logs expose debug, info, warn, and error entries.

The cardinality policy forbids high-cardinality metric labels:

- `runId`
- `stepId`
- `planId`
- `planSha`
- `attemptId`
- `userId`

It also limits label key/value length.

### Observability OTel adapter

`@dvt/observability-otel` exports `OtelObservability`, but source currently says
it is a scaffold and should be replaced with OpenTelemetry SDK bindings. Metrics
and traces are noop implementations that validate cardinality. Logs are emitted
as JSON to console. `otlpEndpoint` and `resourceAttributes` are accepted in
options but not actually wired to OTel exporters.

### Traceability service

`@dvt/traceability-service` exports types, contracts, service, filesystem ADR
catalog adapter, glob header scanner, manifest builder, validator, and lineage
index. Its header declares ADR-0000 traceability governance and stable public API
for validation and manifest generation.

The lineage runtime report shows it also owns runtime lineage polling,
dead-letter and replay loops through lineage exports.

### CLI

`@dvt/cli` has `private: false` in package metadata, but `src/index.ts` declares
`userFacingCli: false` and command metadata limited to:

- `validate-contracts`
- `run-golden-paths`

`validate-contracts.cjs` is script-backed. It imports contract parsers from
built `@dvt/contracts`, validates execution plan fixtures under
`packages/@dvt/engine/test/contracts/plans`, validates PlanRef, RunContext,
SignalRequest, EngineRunRef, CanonicalRunStatus, CanonicalEngineEvent, and
RunSnapshot schemas, and runs glossary validation in warn mode.

### Crypto / canonical

The physical path is `packages/@dvt/canonical`, the package name is
`@dvt/crypto`, and the CI scope key is `crypto` while workflow policy points to
`packages/@dvt/canonical/**`.

## Gaps by workspace

## 1. `@dvt/artifacts`

### ART-01 — Artifact lifecycle contract is incomplete

The public surface implies compiled-code storage, plan artifacts, stored plan
artifact store, dbt project bundle reading, run execution context reading, and
integrity validation. But the lifecycle matrix is not explicit.

**Action**

Create artifact lifecycle contract with:

- artifact kind;
- writer;
- reader;
- storage backend;
- address/ref format;
- hash/integrity policy;
- immutability guarantee;
- tenant/project/environment scope;
- retention/deletion policy;
- error codes;
- tests.

### ART-02 — Planner compatibility bridge must be retired

Planner still re-exports artifact symbols as a transitional bridge. This keeps a
historical import path alive.

**Action**

Create an import-consumer report and remove planner re-exports once all callers
import directly from `@dvt/artifacts`.

### ART-03 — Dbt bundle concern may overfit artifact package

The package owns dbt project bundle readers alongside generic stored plan
artifacts. That may be valid, but the distinction between generic artifact model
and dbt-specific artifact model must be explicit.

**Action**

Separate artifact families in docs and tests:

- generic plan artifact;
- compiled code artifact;
- dbt project bundle artifact;
- run execution context artifact.

## 2. `@dvt/observability`

### OBS-01 — Signal catalogue is missing

The contract supports metrics/traces/logs, but the repo needs a signal catalogue
for the product/runtime surfaces.

**Action**

Create `observability-signal-catalog.md` with:

- metric/span/log name;
- owner;
- allowed labels;
- forbidden labels;
- context fields;
- redaction policy;
- tests;
- UI/operator consumer.

### OBS-02 — Cardinality policy is strong but needs adoption proof

The policy forbids high-cardinality metric labels, but each package that emits
metrics must prove it uses safe labels.

**Action**

Add static or unit checks for runtime packages to ensure metric labels do not use
forbidden keys directly.

### OBS-03 — Correlation belongs in context, not metric labels

`runId`, `stepId`, `planId`, `planSha`, `attemptId`, and `userId` are forbidden
as metric labels. They still need to exist in logs/traces/context.

**Action**

Document correlation routing:

- logs: allowed high-cardinality context fields;
- traces: span attributes policy;
- metrics: low-cardinality labels only;
- UI: query by run/event IDs through state-store/read models, not metric labels.

## 3. `@dvt/observability-otel`

### OTel-01 — Adapter is scaffold/noop, not real OTel exporter

The class accepts OTel-like options but does not wire OTel SDK exporters. This is
a real readiness gap.

**Action**

Either rename posture to `console/noop observability adapter`, or implement real
OpenTelemetry SDK wiring:

- resource attributes;
- OTLP endpoint;
- metrics exporter;
- traces exporter;
- logs strategy;
- shutdown/flush;
- disabled mode;
- exporter failure behavior.

### OTel-02 — Console JSON logs need schema contract

Logs currently emit JSON to console. That can be acceptable for container logs,
but must have a schema contract.

**Action**

Define log schema with event name, level, message, context, attributes, error
serialization, redaction, and compatibility rules.

## 4. `@dvt/traceability-service`

### TR-01 — Traceability roles are overloaded

Traceability service owns docs/header/ADR manifest concerns and also exports
lineage runtime. Both are traceability, but they serve different lifecycles.

**Action**

Split the public surface matrix by responsibility:

- governance traceability;
- source/header scanning;
- manifest validation;
- lineage runtime;
- CLI/tooling use;
- API/worker use.

### TR-02 — Runtime lineage and governance traceability need different SLAs

Manifest validation is build/CI-time. Lineage runtime is operational and has lag,
DLQ, replay, sink failure, and tenant concerns.

**Action**

Create separate SLOs and failure modes for governance traceability and runtime
lineage.

### TR-03 — Dynamic documentation path needs DB alignment

The project direction is DB-first/dynamic documentation. Traceability-service
must be mapped to the planning/governance DB import/export flows.

**Action**

Add traceability-to-DB alignment report:

- source headers;
- component docs;
- planning DB rows;
- governance DB rows;
- generated manifests;
- drift gates.

## 5. `@dvt/cli`

### CLI-01 — Package visibility conflicts with user-facing metadata

Package metadata says `private: false`, while `src/index.ts` says
`userFacingCli: false`.

**Action**

Decide one posture:

- internal validation package: make private or document why package visibility is
  false;
- user-facing CLI: define real CLI command contract and help/version behavior.

### CLI-02 — Script-backed commands need command contract

`validate-contracts` and `run-golden-paths` are important validation commands.
They need stable command contracts even if not user-facing.

**Action**

Document:

- command name;
- inputs/files read;
- outputs;
- exit codes;
- required build preconditions;
- generated artifacts;
- failure examples;
- CI usage.

### CLI-03 — Validation depends on built contracts

`validate-contracts.cjs` imports from `../contracts/dist/index.js`. This requires
contracts to be built before validation.

**Action**

Make preconditions explicit in package script or root validation docs. Avoid
silent failure when dist is stale or missing.

## 6. `@dvt/crypto` / `packages/@dvt/canonical`

### CR-01 — Name/path drift must be resolved

The package name is `@dvt/crypto`, physical path is `packages/@dvt/canonical`,
and tests also reference canonical path. This is already confusing enough to
produce workspace count drift.

**Action**

Create an ADR or status decision:

- keep path `canonical` and rename package to `@dvt/canonical`;
- keep package `@dvt/crypto` and rename path;
- keep both but document compatibility with hard validation.

### CR-02 — Determinism vectors are required

Any crypto/canonicalization package must publish deterministic fixtures.

**Action**

Create test vector catalogue for hashing/canonicalization functions:

- input payload;
- canonical string/bytes;
- expected hash;
- cross-runtime expectation;
- consumer package.

## Cross-cutting recommendations

### CC-01 — Create a canonical workspace registry

The branch already found workspace count ambiguity. A registry must become the
source of truth for package path/name/scope/count classification.

Required fields:

- workspace key;
- package name;
- path;
- workspace type: app/package/tooling;
- product inclusion: yes/no;
- CI scope key;
- owner;
- public/private;
- source index path;
- validation commands.

### CC-02 — Generate public surface matrices

The following packages need generated public surface matrices because they export
cross-cutting APIs:

- `@dvt/artifacts`
- `@dvt/observability`
- `@dvt/observability-otel`
- `@dvt/traceability-service`
- `@dvt/cli`
- `@dvt/crypto`

### CC-03 — Connect dynamic docs to source-owned symbols

For DB-first documentation, the source-owned concerns and public exports must be
queryable. The matrix should connect:

```text
source file -> symbol -> ownedConcern -> workspace -> component doc -> planning DB row -> governance DB row
```

## Recommended order

1. Workspace registry/count drift fix.
2. CLI visibility/contract decision.
3. OTel scaffold posture decision.
4. Artifact lifecycle contract.
5. Observability signal catalogue.
6. Traceability role split and DB alignment.
7. Crypto/canonical name-path ADR.
8. Public surface matrix generation.

## Validation baseline for future implementation

```bash
pnpm --filter @dvt/artifacts typecheck
pnpm --filter @dvt/artifacts test
pnpm --filter @dvt/observability typecheck
pnpm --filter @dvt/observability test
pnpm --filter @dvt/observability-otel typecheck
pnpm --filter @dvt/observability-otel test
pnpm --filter @dvt/traceability-service typecheck
pnpm --filter @dvt/traceability-service test
pnpm --filter @dvt/cli typecheck
pnpm --filter @dvt/cli test
pnpm --filter @dvt/crypto typecheck
pnpm --filter @dvt/crypto test
pnpm validate:contracts
pnpm golden:validate
pnpm verify:prepush
```

## Closeout

The cross-cutting stack contains real foundations, but several surfaces are still
not product/governance closed: OTel is scaffolded, CLI visibility conflicts with
metadata, artifact lifecycle is not fully documented, traceability mixes build
and runtime roles, and crypto/canonical identity drift affects workspace count
and mental model.
