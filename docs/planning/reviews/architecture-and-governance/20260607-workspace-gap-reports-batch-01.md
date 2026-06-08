---
title: Workspace Gap Reports Batch 01
status: Draft
owner: Architecture / Workspace governance
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
---

# Workspace Gap Reports Batch 01

## Scope

This inbox report starts the workspace-by-workspace gap inventory requested on
2026-06-07. It is intentionally evidence-led and uses repository-governed
workspace scope rather than a hand-written package list.

The report is a first pass. It should be promoted or split into canonical
planning documents only after the workspace owners accept the classification and
sequence.

## Governing sources consulted

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `pnpm-workspace.yaml`
- `turbo.json`
- `package.json`
- `tools/ci/scope-config.mjs`
- `tools/ci/policy/workflow-scope.json`
- `docs/planning/status/generated-capability-coverage.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/frontend-component-reflection-inventory-plan-20260604.md`
- `apps/web/package.json`
- `apps/api/package.json`

## Method

1. Use `pnpm-workspace.yaml` to confirm the workspace roots: `packages/*`,
   `apps/*`, and `packages/@dvt/*`.
2. Use `tools/ci/scope-config.mjs` as the governed workspace list because it
   drives CI routing and workspace relevance.
3. Use `tools/ci/policy/workflow-scope.json` to map each workspace to physical
   paths.
4. Use root `package.json` and per-workspace `package.json` files when available
   to identify build, typecheck, lint, test, and integration surfaces.
5. Use generated capability coverage only as a coarse signal; it is not granular
   enough to close per-workspace readiness by itself.

## Current repository signals

- The repository is a pnpm/turbo monorepo with affected build, lint, typecheck,
  and test routing.
- The generated capability report is strong at macro level, but it only assesses
  six coarse capabilities and shows one explicit gap: contracts specs are still
  absent from the signal set.
- The frontend has unusually rich local test taxonomy, including unit,
  presentation, architecture, canvas, Monaco, shell session, workspace services,
  changed-suite routing, and Cypress live flows.
- The API has build, typecheck, lint, unit, integration, and dependency-cruiser
  architecture scripts, making it a good reference shape for other apps.
- Workspace scope governance has an implementation mismatch: the `crypto`
  workspace entry is named `@dvt/crypto`, while the path policy points to
  `packages/@dvt/canonical/**`. This needs explicit resolution before deeper
  automation depends on workspace identity.

## Workspace inventory and initial gaps

### apps/api — `dvt-api`

**Path:** `apps/api/**`

**Observed strengths**

- Has explicit dev, build, start, typecheck, lint, unit test, integration test,
  and architecture test scripts.
- Depends on runtime, adapters, contracts, delivery, engine, planner,
  observability, and Temporal plugin packages, so it is the main composition
  surface.

**Gaps to report**

- Needs a route-by-route command/query rail completeness report. The package is
  a composition boundary and should not allow route handlers to invent semantics
  outside the governed rails.
- Needs an authorization and tenancy matrix per API surface, especially where it
  exposes plan, run, source import, artifact, or worker operations.
- Needs an integration-readiness report separating in-process tests from real
  Postgres/Temporal/S3 dependency tests.
- Needs API-to-web contract drift checks if UI surfaces consume API responses
  without generated/shared client contracts.

**Next report slice**

- Build `docs/planning/reviews/architecture-and-governance/20260607-api-gap-report.md` with route inventory, command/query
  rail mapping, adapter calls, tests, and missing negative cases.

### apps/web — `@dvt/web`

**Path:** `apps/web/**`

**Observed strengths**

- Has a strong test taxonomy: unit, presentation, architecture, canvas, Monaco,
  shell-session, workspace-services, changed-suite routing, and Cypress flows.
- Current planning already accepts frontend component reflection as a planning DB
  inventory linked to real files, surfaces, ports, command/query rails, and
  evidence.

**Gaps to report**

- Product functionality gap remains more important than component inventory:
  source, operation, destination, run, logs, lineage, SQL, YAML/JSON, and docs
  surfaces need visible user-flow completeness checks.
- Needs a screen/workspace report that distinguishes implemented UI affordances
  from actionable workflow creation.
- Needs command/query rail coverage per UI action. Menu actions, canvas actions,
  palette actions, plugin docks, and route transitions must not create browser-
  local semantics.
- Needs backend-dependency posture per surface: mocked, read-only, command
  capable, live capable, or blocked.
- Needs Cypress coverage tied to user stories, not only technical surfaces.

**Next report slice**

- Build `docs/planning/reviews/architecture-and-governance/20260607-web-gap-report.md` with route/surface matrix, visible
  commands, backend dependencies, tests, and blockers to complete a real flow.

### apps/lineage-worker — `dvt-lineage-worker`

**Path:** `apps/lineage-worker/**`

**Observed strengths**

- It is a governed CI workspace.
- Its existence means lineage is treated as runtime processing, not only a UI
  view.

**Gaps to report**

- Needs an input/output contract report: consumed events, emitted projections,
  idempotency keys, retry rules, and dead-letter behavior.
- Needs a lineage-read-model ownership report separating write side, projection,
  query side, and UI consumption.
- Needs integration tests proving ordering and replay behavior.

**Next report slice**

- Build a worker contract report covering event envelope, projection table,
  replay, tenant scope, and observability.

### apps/outbox-worker — `dvt-outbox-worker`

**Path:** `apps/outbox-worker/**`

**Observed strengths**

- It is a governed CI workspace and likely owns publication out of the
  transactional boundary.

**Gaps to report**

- Needs explicit ordering, deduplication, retry, poison-message, and tenant
  isolation evidence.
- Needs alignment with ADRs governing event sourcing, outbox ordering, and run
  events.
- Needs a report on what is persisted before publication and what is safe to
  republish.

**Next report slice**

- Produce an outbox operational correctness report with idempotency and ordering
  tests.

### apps/projector-worker — `dvt-projector-worker`

**Path:** `apps/projector-worker/**`

**Observed strengths**

- It is a governed CI workspace and separates projection concerns from API and
  engine execution.

**Gaps to report**

- Needs a projection catalog: source events, target read models, rebuild rules,
  checkpointing, and drift detection.
- Needs a data-loss and replay safety report.
- Needs tests that prove projection idempotency and version tolerance.

**Next report slice**

- Produce a projector read-model coverage report.

### apps/temporal-worker — `dvt-temporal-worker`

**Path:** `apps/temporal-worker/**`

**Observed strengths**

- It is a governed runtime workspace and central to executing external workflow
  orchestration without letting Temporal own DVT semantics.

**Gaps to report**

- Needs a worker task/activity inventory and mapping to DVT execution concepts.
- Needs a local integration readiness report: Temporal, Postgres, plugin, and
  plan interpreter boundaries.
- Needs cancellation, retry, heartbeat, timeout, and idempotency evidence per
  activity.

**Next report slice**

- Produce a Temporal worker execution-safety report.

### packages/@dvt/temporal-dbt-plugin — `@dvt/temporal-dbt-plugin`

**Path:** `packages/@dvt/temporal-dbt-plugin/**`

**Observed strengths**

- It is a governed plugin workspace and is explicitly used by the API.

**Gaps to report**

- Needs plugin capability manifest coverage: supported dbt-like operations,
  unsupported operations, input contracts, output contracts, and execution
  limits.
- Needs a compatibility report separating dbt-compatible semantics from DVT-owned
  semantics.
- Needs golden examples proving plugin behavior against execution plans.

**Next report slice**

- Produce plugin capability and contract coverage report.

### packages/@dvt/artifacts — `@dvt/artifacts`

**Path:** `packages/@dvt/artifacts/**`

**Observed strengths**

- It is a governed package and is used by the API.

**Gaps to report**

- Needs artifact lifecycle report: creation, immutability, addressing,
  retention, authorization, and deletion policy.
- Needs a manifest/versioning matrix for generated artifacts.
- Needs tests for corrupted, missing, unauthorized, and cross-tenant artifact
  access.

**Next report slice**

- Produce artifact lifecycle and access-control gap report.

### packages/@dvt/canonical / crypto identity mismatch — `@dvt/crypto` vs path `packages/@dvt/canonical/**`

**Path:** `packages/@dvt/canonical/**` according to workflow scope policy.

**Observed strengths**

- The workspace appears in CI scope as `crypto`, but the path policy points at a
  canonical package path.

**Gaps to report**

- Workspace identity is inconsistent: scope config names package `@dvt/crypto`,
  while policy and tests reference `packages/@dvt/canonical/**`.
- Needs a decision: either package identity is canonical/crypto, or the CI scope
  is carrying historical naming drift.
- Needs a rename/alias risk report before changing package names because crypto
  and canonical identity are likely cross-cutting.

**Next report slice**

- Produce a package identity drift report and recommended normalization path.

### packages/@dvt/contracts — `@dvt/contracts`

**Path:** `packages/@dvt/contracts/**`

**Observed strengths**

- Root scripts include contract index generation and several validation commands:
  RFC2119, glossary, references, idempotency vectors, executable examples, and
  golden validation.

**Gaps to report**

- Generated capability coverage reports `contracts specs exist` as `no`, leaving
  contracts at 70% in the coarse capability score.
- Needs a contract/spec reconciliation report: package source, `specs/contracts`,
  generated README, executable examples, schemas, and version policy.
- Needs negative compatibility fixtures for old/new versions where public
  contracts are stable.

**Next report slice**

- Produce `contracts` report first among packages because it is a known measured
  gap and impacts API, web, engine, planner, and adapters.

### packages/@dvt/delivery — `@dvt/delivery`

**Path:** `packages/@dvt/delivery/**`

**Observed strengths**

- It is a governed runtime package and is consumed by the API.

**Gaps to report**

- Needs a delivery boundary report: what belongs to delivery vs adapter vs API vs
  outbox.
- Needs failure semantics for delivery attempts, retries, duplicate handling, and
  tenant-aware routing.
- Needs integration tests around real delivery dependencies where applicable.

**Next report slice**

- Produce delivery boundary and retry semantics report.

### packages/@dvt/dsl — `@dvt/dsl`

**Path:** `packages/@dvt/dsl/**`

**Observed strengths**

- It is a governed domain package and should be the natural home for authoring
  language constructs.

**Gaps to report**

- Needs a DSL capability matrix: source nodes, operations, destinations,
  validation rules, compile targets, and unsupported constructs.
- Needs a mapping from web authoring interactions to DSL objects.
- Needs parser/serializer round-trip tests and compatibility fixtures.

**Next report slice**

- Produce DSL authoring-readiness report focused on creating a real flow.

### packages/@dvt/engine — `@dvt/engine`

**Path:** `packages/@dvt/engine/**`

**Observed strengths**

- Capability coverage marks Engine Core at 100% using source, tests, and root
  `test:engine` script signals.
- Root scripts include determinism and replay-focused test commands.

**Gaps to report**

- Because coverage is macro-level, engine still needs a per-public-API surface
  report: admission policy, deterministic execution, cancellation, replay,
  failure classification, and emitted events.
- Needs explicit check that engine does not decide planning or persistence policy.
- Needs a database-reflection report if engine has already been moved into the
  planning/governance DB as a proof.

**Next report slice**

- Produce engine public API and DB-reflection delta report.

### packages/@dvt/observability — `@dvt/observability`

**Path:** `packages/@dvt/observability/**`

**Observed strengths**

- It is a governed package and is consumed by API.

**Gaps to report**

- Needs telemetry contract report: spans, metrics, logs, trace IDs, run IDs,
  tenant IDs, and redaction rules.
- Needs user-visible observability mapping: which backend signals appear in logs,
  metrics, lineage, or run status screens.
- Needs test evidence for no secret leakage.

**Next report slice**

- Produce observability signal contract report.

### packages/@dvt/observability-otel — `@dvt/observability-otel`

**Path:** `packages/@dvt/observability-otel/**`

**Observed strengths**

- It is a separate adapter package for OpenTelemetry concerns and is consumed by
  API.

**Gaps to report**

- Needs adapter contract separation from domain observability.
- Needs exporter/configuration matrix per environment.
- Needs tests for disabled telemetry, partial config, and exporter failure.

**Next report slice**

- Produce OTel adapter hardening report.

### packages/@dvt/plan-interpreter — `@dvt/plan-interpreter`

**Path:** `packages/@dvt/plan-interpreter/**`

**Observed strengths**

- It is a governed workspace and root typecheck builds it before full typecheck.

**Gaps to report**

- Needs execution-plan coverage matrix: node types, edges, dependencies,
  unsupported constructs, deterministic ordering, and error behavior.
- Needs golden examples proving interpreter output against contract fixtures.
- Needs boundary check ensuring interpreter does not mutate run state directly.

**Next report slice**

- Produce plan interpreter semantic coverage report.

### packages/@dvt/plan-verifier — `@dvt/plan-verifier`

**Path:** `packages/@dvt/plan-verifier/**`

**Observed strengths**

- It is consumed by API and is a separate governed validation workspace.

**Gaps to report**

- Needs validation rule catalog: structural, semantic, security, tenant,
  capability, and plugin support checks.
- Needs negative fixtures that explain why a plan is rejected.
- Needs alignment with web preflight so the UI does not accept plans the backend
  rejects.

**Next report slice**

- Produce verifier rule coverage and UX alignment report.

### packages/@dvt/planner — `@dvt/planner`

**Path:** `packages/@dvt/planner/**`

**Observed strengths**

- Capability coverage marks Planner at 100% using source, tests, and package
  presence.
- API consumes planner directly.

**Gaps to report**

- Needs planner command/query rail report: inputs, policies, output plan shape,
  determinism, and unsupported requests.
- Needs cost/impact/skip-intelligence gap assessment against product roadmap.
- Needs explicit separation from engine execution decisions.

**Next report slice**

- Produce planner capability and decision-boundary report.

### packages/@dvt/planner-contracts — `@dvt/planner-contracts`

**Path:** `packages/@dvt/planner-contracts/**`

**Observed strengths**

- It is isolated from planner implementation and appears in governed workspace
  scope.

**Gaps to report**

- Needs versioning and compatibility report between planner contracts and core
  contracts.
- Needs generated schema/index alignment.
- Needs migration policy for planner request/response evolution.

**Next report slice**

- Produce planner-contracts compatibility report.

### packages/@dvt/run-domain — `@dvt/run-domain`

**Path:** `packages/@dvt/run-domain/**`

**Observed strengths**

- It is a governed domain package and should own run lifecycle invariants.

**Gaps to report**

- Needs lifecycle state-machine report: states, events, transitions,
  cancellation, failure, retry, and terminal states.
- Needs alignment with state-store persistence and API status queries.
- Needs property-based or table-driven transition tests.

**Next report slice**

- Produce run-domain lifecycle completeness report.

### packages/@dvt/state-store — `@dvt/state-store`

**Path:** `packages/@dvt/state-store/**`

**Observed strengths**

- It is a governed workspace and is central to run-state truth.

**Gaps to report**

- Needs storage contract report: append-only events, projections, transaction
  boundaries, idempotency, optimistic concurrency, and tenant isolation.
- Needs Postgres adapter separation check if storage details leak into domain or
  API.
- Needs migration and replay safety evidence.

**Next report slice**

- Produce state-store persistence correctness report.

### packages/@dvt/traceability-service — `@dvt/traceability-service`

**Path:** `packages/@dvt/traceability-service/**`

**Observed strengths**

- Capability coverage marks Traceability at 100% using source, tests, and package
  presence.
- It is included in global workspace relevance, showing cross-cutting governance
  importance.

**Gaps to report**

- Needs report separating runtime traceability, documentation traceability,
  governance DB traceability, and lineage traceability.
- Needs evidence that generated indexes and manifests do not drift from source.
- Needs explicit ownership boundaries with docs tooling and planning DB tooling.

**Next report slice**

- Produce traceability boundary and drift-control report.

### packages/@dvt/adapter-postgres — `@dvt/adapter-postgres`

**Path:** `packages/@dvt/adapter-postgres/**`

**Observed strengths**

- Capability coverage marks Adapters at 100% using temporal/postgres source and
  adapter test script signals.
- Root scripts include adapter-postgres unit and integration commands.

**Gaps to report**

- Needs adapter contract report: schemas, migrations, transaction boundaries,
  isolation levels, connection management, and tenant filters.
- Needs integration evidence for reset, migration, concurrent writes, duplicate
  events, and unauthorized tenant access.
- Needs boundary check that Postgres adapter does not own domain semantics.

**Next report slice**

- Produce Postgres adapter integration hardening report.

### packages/@dvt/adapter-temporal — `@dvt/adapter-temporal`

**Path:** `packages/@dvt/adapter-temporal/**`

**Observed strengths**

- Capability coverage marks Adapters at 100%.
- Root scripts include multiple Temporal integration variants, including local,
  transformation, Postgres-local, and Docker proof commands.

**Gaps to report**

- Needs adapter activity/workflow contract matrix.
- Needs cancellation, signal idempotency, retry, timeout, heartbeat, and worker
  failure evidence.
- Needs explicit check that Temporal is replaceable infrastructure and does not
  become execution-model authority.

**Next report slice**

- Produce Temporal adapter correctness and replaceability report.

### packages/@dvt/cli — `@dvt/cli`

**Path:** `packages/@dvt/cli/**`

**Observed strengths**

- Root scripts include CLI tests and golden path validation through the CLI.

**Gaps to report**

- Needs command inventory: user-facing commands, inputs, outputs, exit codes,
  stderr/stdout contracts, and golden fixtures.
- Needs parity report with API and planning DB commands so CLI does not become a
  parallel product path.
- Needs CI usage report: which scripts depend on CLI behavior and what breaks if
  CLI output changes.

**Next report slice**

- Produce CLI command contract and golden coverage report.

## Cross-workspace missing reports

These reports cut across several workspaces and should be created after the
first per-workspace batch is reviewed.

1. **Command/query rail coverage report** — API, web, CLI, workers, plugins.
2. **Contract/spec reconciliation report** — contracts, planner-contracts,
   specs, generated indexes, examples.
3. **Runtime state correctness report** — run-domain, state-store, engine,
   adapters, workers.
4. **User-flow completeness report** — web, API, planner, verifier, DSL,
   interpreter, artifacts.
5. **Observability and audit report** — observability, OTel adapter, API, workers,
   web logs/metrics screens.
6. **Workspace identity drift report** — at minimum `crypto`/`canonical`, plus any
   package path/name mismatches found in the next pass.

## Recommended sequence

1. Contracts gap report, because the generated capability page already reports a
   measurable gap.
2. Web gap report, because user-flow incompleteness is the highest product-value
   blocker.
3. API gap report, because it composes most backend packages and exposes product
   rails.
4. Runtime state correctness report across run-domain, state-store, engine,
   adapter-postgres, adapter-temporal, outbox-worker, projector-worker, and
   temporal-worker.
5. DSL/planner/verifier/interpreter report, because real authoring depends on the
   chain from user intent to executable plan.
6. Observability/artifacts/traceability report, because operational trust depends
   on evidence, auditability, and generated output lifecycle.

## Validation performed

- Repository inspection through GitHub connector.
- Branch created: `feature/workspace-gap-reports-20260607`.
- No local `pnpm` validation was run in this pass because only an inbox Markdown
  report was created through the GitHub connector.

## Closeout status

This is not a claim that every gap is fully proven. It is the first governed
inventory slice and should be followed by dedicated workspace reports that read
source files, tests, architecture docs, ADRs, and planning DB surfaces for each
workspace.
