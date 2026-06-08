---
title: Source-Grounded Gap Reports For 24 Workspaces
status: Draft
owner: Architecture / Workspace governance
date: 2026-06-07
last_reviewed: 2026-06-07
planning_type: review
supersedes:
  - docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-batch-01.md
---

# Source-Grounded Gap Reports For 24 Workspaces

## Correction note

The earlier batch was insufficient as a workspace coverage artifact. It created
three specific reports plus a broad inventory, but it did not provide source-led
coverage for all governed workspaces. This document corrects that error by
covering all 24 workspaces listed by repository CI scope governance.

This report is still a first-pass report, not a final implementation plan. The
standard for the next pass is stricter: each workspace must get its own dedicated
file with direct inspection of `src`, `test`, package scripts, architecture docs,
and planning DB projections where applicable.

## Workspace source of truth

The workspace set is taken from:

- `pnpm-workspace.yaml`
- `tools/ci/scope-config.mjs`
- `tools/ci/policy/workflow-scope.json`

The current governed workspace count used here is 24:

1. `apps/api` — `dvt-api`
2. `apps/lineage-worker` — `dvt-lineage-worker`
3. `apps/outbox-worker` — `dvt-outbox-worker`
4. `apps/projector-worker` — `dvt-projector-worker`
5. `apps/temporal-worker` — `dvt-temporal-worker`
6. `apps/web` — `@dvt/web`
7. `packages/@dvt/temporal-dbt-plugin` — `@dvt/temporal-dbt-plugin`
8. `packages/@dvt/artifacts` — `@dvt/artifacts`
9. `packages/@dvt/canonical` — package name `@dvt/crypto`
10. `packages/@dvt/contracts` — `@dvt/contracts`
11. `packages/@dvt/delivery` — `@dvt/delivery`
12. `packages/@dvt/dsl` — `@dvt/dsl`
13. `packages/@dvt/engine` — `@dvt/engine`
14. `packages/@dvt/observability` — `@dvt/observability`
15. `packages/@dvt/observability-otel` — `@dvt/observability-otel`
16. `packages/@dvt/plan-interpreter` — `@dvt/plan-interpreter`
17. `packages/@dvt/plan-verifier` — `@dvt/plan-verifier`
18. `packages/@dvt/planner` — `@dvt/planner`
19. `packages/@dvt/planner-contracts` — `@dvt/planner-contracts`
20. `packages/@dvt/run-domain` — `@dvt/run-domain`
21. `packages/@dvt/state-store` — `@dvt/state-store`
22. `packages/@dvt/traceability-service` — `@dvt/traceability-service`
23. `packages/@dvt/adapter-postgres` — `@dvt/adapter-postgres`
24. `packages/@dvt/adapter-temporal` — `@dvt/adapter-temporal`
25. `packages/@dvt/cli` — `@dvt/cli`

Important: the governed CI list contains 24 entries if `crypto` is counted by
workspace key, but the physical package set above enumerates 25 rows because the
`cli` workspace is also present and the original complaint expects 24. The source
inspection shows this must be normalized explicitly: either the expected number
is stale, or one workspace is being treated as tool/runtime outside the counted
product set. This is not cosmetic; it is a governance gap in workspace counting.

For the rest of this document, every listed workspace receives a report section.
The count discrepancy itself is tracked as `WG-00`.

## WG-00 — Workspace count and identity drift

**Source evidence inspected**

- `tools/ci/scope-config.mjs`
- `tools/ci/policy/workflow-scope.json`
- `packages/@dvt/canonical/package.json`

**Observed source fact**

The CI scope key is `crypto` and package name is `@dvt/crypto`, but the physical
path is `packages/@dvt/canonical`. This is a real name/path drift. The user-level
expectation says 24 workspaces, while the source-derived scope list plus CLI
surfaces produce a 25-row physical inventory depending on whether CLI is counted
as product workspace or tooling workspace.

**Gap**

Workspace governance needs a canonical workspace registry with fields:

- workspace key
- package name
- physical path
- product/tooling classification
- CI scope key
- expected workspace count inclusion
- package visibility

**Action**

Create `docs/planning/status/workspace-registry.md` or DB-backed equivalent and
make `scope-config.mjs` validate against it.

---

## 1. apps/api — `dvt-api`

**Sources inspected**

- `apps/api/package.json`
- `apps/api/src/server.ts`
- `docs/architecture/components/api/api-current-to-target-architecture.md`

**Real source signals**

- Package scripts include dev, build, start, typecheck, lint, unit test,
  integration test, and dependency-cruiser architecture test.
- `src/server.ts` starts `buildApp()`, bootstraps the intent reconciler runtime,
  starts a health watchdog, and handles shutdown.
- The architecture doc says API composes Fastify, health/readiness, protected
  runtime routes, OIDC authentication, tenant-scoped authorization, admission,
  Postgres state access, and provider adapters.

**Gaps**

- Route-by-route command/query rail inventory is missing as a source-generated
  artifact.
- Frontend-facing runtime contract is not published as one canonical artifact.
- Query purity remains incomplete where engine enrichment participates in query
  paths.
- Admin RBAC needs negative-case hardening.
- Freshness/SLA/backpressure semantics need one contract, not scattered config.
- Non-dbt workflow support needs explicit route/contract compatibility proof.

**Next action**

Generate `api-route-rail-inventory` from `apps/api/src/entrypoints/http/**` and
map each route to command/query rail, contract, authorization action, use case,
backend package, and tests.

---

## 2. apps/lineage-worker — `dvt-lineage-worker`

**Sources inspected**

- `apps/lineage-worker/package.json`
- `apps/lineage-worker/src/server.ts`

**Real source signals**

- Scripts include dev, build, start, typecheck, and Vitest.
- Runtime imports `LineageWorkerRuntime` from `@dvt/traceability-service`.
- Server builds lineage bootstrap, creates a `StepStarted` lineage mapper, starts
  an admin HTTP server, exposes `lag` and `deadLetterLag`, supports DLQ alert and
  auto replay settings, and closes bootstrap on shutdown.

**Gaps**

- Needs lineage event contract catalog: consumed event types, mapper ownership,
  generated facets, sink behavior, DLQ behavior, and replay semantics.
- Needs tenant isolation evidence for lineage records and DLQ replay.
- Needs operational SLO: lag, dead-letter threshold, alert tenant, replay policy.
- Needs user-facing mapping: which lineage outputs appear in web Lineage or run
  detail screens.

**Next action**

Create a lineage worker source report from `compiledCodeResolver`, `bootstrap`,
`LineageWorkerRuntime`, tests, and traceability-service lineage modules.

---

## 3. apps/outbox-worker — `dvt-outbox-worker`

**Sources inspected**

- `apps/outbox-worker/package.json`
- `apps/outbox-worker/src/server.ts`
- `packages/@dvt/delivery/package.json`

**Real source signals**

- Scripts include dev, build, start, typecheck including test TS config, Vitest,
  and dependency-cruiser architecture test.
- Runtime wires `OutboxWorkerMonitor`, operational server, stale readiness,
  purge/retention flags, and optional Postgres shard ownership gate.
- Delivery package has explicit tests for shard assignment, architecture,
  in-memory storage ownership, worker retry, sharding, observer, dead-letter,
  projector runtime, and start-run admission guard.

**Gaps**

- Needs shard ownership contract as a first-class invariant, not just runtime
  wiring.
- Needs exact outbox item lifecycle: pending, claimed, published, retry,
  dead-letter, purged.
- Needs poison-message and ownership-loss behavior evidence.
- Needs admin server response contract for readiness/liveness.

**Next action**

Create outbox correctness report from `host`, `ops`, `ownership`, delivery
worker tests, and Postgres adapter usage.

---

## 4. apps/projector-worker — `dvt-projector-worker`

**Sources inspected**

- `apps/projector-worker/package.json`
- `apps/projector-worker/src/server.ts`

**Real source signals**

- Server instantiates `PostgresStateStoreAdapter`, calls `migrate()`, creates
  `ProjectorWorkerRuntime`, exposes admin lag JSON, and shuts down store/server
  cleanly.
- Package depends on `@dvt/adapter-postgres` and `@dvt/delivery`.

**Gaps**

- Needs projection catalog: source events, target read models, checkpointing,
  rebuild rules, and drift handling.
- Needs evidence that calling `migrate()` at worker startup is intentional and
  safe in all environments.
- Needs admin API contract and SLO for `lag`.
- Needs replay/idempotency proof.

**Next action**

Create projector report from `ProjectorWorkerRuntime`, state-store adapter,
tests, and read-model targets.

---

## 5. apps/temporal-worker — `dvt-temporal-worker`

**Sources inspected**

- `apps/temporal-worker/package.json`
- `apps/temporal-worker/src/server.ts`
- `packages/@dvt/adapter-temporal/package.json`
- `packages/@dvt/temporal-dbt-plugin/package.json`

**Real source signals**

- Worker depends on adapter-postgres, adapter-temporal, artifacts, contracts,
  engine, temporal-dbt-plugin, Temporal worker, pino, zod.
- Server wires `TemporalWorkerMonitor`, operational server, dbt-enabled flag, and
  `runTemporalWorkerHost`.
- Adapter Temporal has time-skipping, transformation, Postgres-local, and Docker
  integration scripts.

**Gaps**

- Needs activity/workflow inventory mapped to DVT execution concepts.
- Needs cancellation, retry, timeout, heartbeat, signal idempotency, and worker
  failure evidence by activity.
- Needs dbt-enabled vs generic execution mode separation.
- Needs readiness contract consumed by API admission capacity.

**Next action**

Create Temporal worker report from `host`, `ops`, plugin wiring, adapter tests,
and API capacity probe integration.

---

## 6. apps/web — `@dvt/web`

**Sources inspected**

- `apps/web/package.json`
- `apps/web/src/app/routes.ts`
- `docs/architecture/components/web/frontend-mechanical-truth-inventory.md`
- `docs/architecture/components/web/frontend-component-inventory.md`

**Real source signals**

- Package scripts include build, typecheck, lint, unit, presentation,
  architecture, canvas, Monaco, shell-session, workspace-services,
  changed-suite, CI, E2E, and native Cypress execution.
- `routes.ts` creates plugin routes from registry, plugin availability guard,
  canvas workbench tab route, static shell routes for plugins/admin, and public
  login route.
- Mechanical truth inventory lists operational, preview, and fail-closed routes.

**Gaps**

- Real workflow closure remains missing: source -> operation -> validation ->
  preview/compile/import -> run -> evidence.
- UI actions need command/query rail coverage, not only route/component coverage.
- Backend dependency posture must be explicit per surface and endpoint.
- Cypress coverage should be indexed by user story, not only by technical suite.
- Component inventory is intentionally partial until AST validation exists.

**Next action**

Create source-derived UI action inventory from `routes.ts`, plugin registry,
CanvasToolbar, queries, stores, Cypress specs, and frontend DB inventories.

---

## 7. packages/@dvt/temporal-dbt-plugin — `@dvt/temporal-dbt-plugin`

**Sources inspected**

- `packages/@dvt/temporal-dbt-plugin/package.json`

**Real source signals**

- Depends on adapter-temporal, artifacts, contracts, engine, and `tar`.
- Has runtime dependency build script, build, test, and typecheck with test TS
  config.

**Gaps**

- Needs plugin capability manifest: what dbt operations are supported,
  unsupported, degraded, and generic-DVT compatible.
- Needs archive/extraction security review because it depends on tar handling.
- Needs golden fixtures for dbt package inputs and generated runtime execution.
- Needs boundary statement: plugin must not define DVT execution semantics.

**Next action**

Inspect plugin `src`, tests, fixtures, and Temporal adapter integration points.

---

## 8. packages/@dvt/artifacts — `@dvt/artifacts`

**Sources inspected**

- `packages/@dvt/artifacts/package.json`

**Real source signals**

- Depends on AWS S3 client and contracts.
- Exposes build, typecheck, Vitest, and Node >=22 engine.
- Planner still re-exports artifact symbols as transitional compatibility bridge.

**Gaps**

- Needs artifact lifecycle contract: create, address, immutable hash, retention,
  access, missing/corrupt handling, tenant isolation.
- Needs removal plan for transitional planner re-exports.
- Needs S3/local/in-memory parity tests.

**Next action**

Inspect `src/index.ts`, storage adapters, tests, and planner import consumers.

---

## 9. packages/@dvt/canonical — package name `@dvt/crypto`

**Sources inspected**

- `packages/@dvt/canonical/package.json`
- `tools/ci/scope-config.mjs`
- `tools/ci/policy/workflow-scope.json`

**Real source signals**

- Physical path is `packages/@dvt/canonical`, but package name is `@dvt/crypto`.
- Test command runs `packages/@dvt/canonical/test/canonical.test.ts`.
- Engine, state-store, adapter-temporal, temporal-worker reference
  `@dvt/crypto`.

**Gaps**

- Naming is inconsistent and must be normalized or documented.
- Need public surface report: what is canonicalization vs crypto.
- Need determinism guarantees and test vectors for every exported function.

**Next action**

Create package identity drift report before any rename.

---

## 10. packages/@dvt/contracts — `@dvt/contracts`

**Sources inspected**

- `packages/@dvt/contracts/package.json`
- `packages/@dvt/contracts/src/index.ts`
- `packages/@dvt/contracts/test/schema-sync.test.ts`
- `docs/planning/status/generated-capability-coverage.md`

**Real source signals**

- Package exposes build, typecheck, Vitest, and `schema:verify`.
- Public index exports many engine, planner, workspace graph, transformation,
  policy, and runtime boundary contracts.
- Schema sync test validates JSON schema vs Zod for planner policy and planner
  input envelope with valid and invalid fixtures.
- Generated capability coverage reports contracts at 70% because contract specs
  are missing.

**Gaps**

- `specs/contracts` publication is missing/incomplete.
- Public surface is broad and lacks generated family ownership matrix.
- Schema sync coverage is too narrow for the export surface.
- Frontend-facing runtime contract is not published as one artifact.

**Next action**

Generate public contract surface matrix from `src/index.ts` and bind it to
`specs/contracts`.

---

## 11. packages/@dvt/delivery — `@dvt/delivery`

**Sources inspected**

- `packages/@dvt/delivery/package.json`

**Real source signals**

- Exports main and testing subpath.
- Test script explicitly targets outbox shard assignment, architecture,
  in-memory ownership, worker, retry, sharding, observer, dead-letter,
  projector worker runtime, and start-run admission guard tests.

**Gaps**

- Delivery boundary needs to be split into delivery domain, outbox runtime,
  projector runtime, and admission guard responsibilities.
- Needs explicit retry/dead-letter/sharding lifecycle diagrams.
- Needs API and worker consumer map.

**Next action**

Inspect delivery `src` and test files to extract lifecycle state machine.

---

## 12. packages/@dvt/dsl — `@dvt/dsl`

**Sources inspected**

- `packages/@dvt/dsl/package.json`
- `packages/@dvt/dsl/src/index.ts`

**Real source signals**

- Depends on `@dvt/contracts`.
- Public API is tiny: `DslV1Expression`, `DslV1Operator`, `parseDslV1`, and
  `evaluateDslV1`.
- Owned concern is parsing/evaluating governed v1 transformation expressions.

**Gaps**

- Needs DSL capability matrix: operators, data types, invalid expressions,
  source/operation/destination mapping, and compile target compatibility.
- Needs syntax-to-canvas mapping for UI authoring.
- Needs round-trip and negative fixtures.

**Next action**

Inspect `v1/ast`, `parser`, `evaluator`, tests, and web/planner consumers.

---

## 13. packages/@dvt/engine — `@dvt/engine`

**Sources inspected**

- `packages/@dvt/engine/package.json`
- `packages/@dvt/engine/src/index.ts`

**Real source signals**

- Public exports include contracts, run events, execution plan, errors, engine
  ports, run state store ports, plan integrity, snapshot staleness,
  maintenance, intent store, projector, execution context, authorization,
  provider adapter, run command/signal/recovery/health/status query services,
  run enrichment service, outbox rate limiter, and authorization error.
- Package has main, runtime, and testing export subpaths.
- Depends on artifacts, observability, crypto, contracts, delivery, and
  run-domain.

**Gaps**

- Public API is large; needs generated surface ownership matrix.
- Query service/enrichment exports must be checked against CQRS purity.
- Engine should not own planning or persistence policy; dependencies need
  architecture audit.
- Need DB-reflection delta if engine is already represented in governance DB.

**Next action**

Create engine public API report from `src/index.ts`, domain services, ports,
tests, and ADR-0003.

---

## 14. packages/@dvt/observability — `@dvt/observability`

**Sources inspected**

- `packages/@dvt/observability/package.json`

**Real source signals**

- Package has a very narrow test command targeting `cardinalityPolicy.test.ts`.
- Exports main package and is consumed by API, engine, adapter-temporal.

**Gaps**

- Needs signal catalog: spans, logs, metrics, labels, cardinality, redaction,
  run/tenant/workspace correlation.
- Current visible test signal suggests cardinality is covered, but not complete
  observability behavior.
- Needs UI/ops mapping: which signals appear in logs, metrics, and runtime
  screens.

**Next action**

Inspect observability `src`, cardinality policy, consumers, and OTel adapter.

---

## 15. packages/@dvt/observability-otel — `@dvt/observability-otel`

**Sources inspected**

- `packages/@dvt/observability-otel/package.json`

**Real source signals**

- Depends on `@dvt/observability` only.
- Test builds observability first and runs `OtelObservability.test.ts`.

**Gaps**

- Needs adapter contract: disabled mode, exporter failure, resource attributes,
  environment config, redaction, and fallback behavior.
- Needs proof that OTel adapter does not leak domain decisions back into core
  observability.

**Next action**

Inspect OTel implementation and test coverage.

---

## 16. packages/@dvt/plan-interpreter — `@dvt/plan-interpreter`

**Sources inspected**

- `packages/@dvt/plan-interpreter/package.json`
- `packages/@dvt/plan-interpreter/src/index.ts`

**Real source signals**

- Package description says it owns shared plan interpretation: DAG analysis,
  execution layer computation, and validation consumed by all adapters.
- Public API exports `collectDownstreamStepIds`, `planExecutionLayers`,
  `validateDag`, `PlanValidationError`, and related types.

**Gaps**

- Needs DAG fixture coverage by shape: linear, fan-out, fan-in, cycle, orphan,
  missing dependency, selected subgraph.
- Needs adapter parity proof: Temporal/Postgres/generic adapters must produce
  identical ordering.
- Needs diagnostic contract for UI and verifier.

**Next action**

Inspect `dagAnalyzer`, tests, adapter consumers, and verifier overlap.

---

## 17. packages/@dvt/plan-verifier — `@dvt/plan-verifier`

**Sources inspected**

- `packages/@dvt/plan-verifier/package.json`
- `packages/@dvt/plan-verifier/src/index.ts`

**Real source signals**

- Public concern is admission compatibility, plan-version checks, hashes, and
  step-type configuration validation.
- Exports errors, planVersion, crypto, verify, and stepTypeConfig.
- Test script uses `--passWithNoTests`, which is a risk signal unless tests exist
  and are routed elsewhere.

**Gaps**

- Needs mandatory negative test coverage for every verifier rule.
- Needs alignment with API admission and web readiness validation.
- Needs step-type config coverage for transformation/source/destination nodes.

**Next action**

Inspect verifier source and tests; replace `passWithNoTests` posture with real
rule coverage if tests are absent.

---

## 18. packages/@dvt/planner — `@dvt/planner`

**Sources inspected**

- `packages/@dvt/planner/package.json`
- `packages/@dvt/planner/src/index.ts`

**Real source signals**

- Public index states `PlannerFacade` is the sole public entry point and domain
  `Planner` is intentionally not exported.
- It still has transitional re-exports from `@dvt/contracts` and artifact
  compatibility bridges from `@dvt/artifacts` with explicit removal criteria.
- Scripts include test, cross-runtime test, and slow tests.

**Gaps**

- Transitional exports need burn-down plan and consumer inventory.
- Need planner capability matrix: input kinds, graph sources, policies,
  executable outputs, unsupported constructs.
- Need non-dbt/general graph proof.

**Next action**

Create planner public boundary and transitional-export removal report.

---

## 19. packages/@dvt/planner-contracts — `@dvt/planner-contracts`

**Sources inspected**

- `packages/@dvt/planner-contracts/package.json`

**Real source signals**

- Depends on `@dvt/contracts`.
- Has build and typecheck only; no test script.

**Gaps**

- Needs justification for separate package vs `@dvt/contracts` planner family.
- Needs tests or contract fixtures if it owns any public shape.
- Needs version compatibility policy.

**Next action**

Inspect `src` and consumers; decide whether it is active boundary or migration
artifact.

---

## 20. packages/@dvt/run-domain — `@dvt/run-domain`

**Sources inspected**

- `packages/@dvt/run-domain/package.json`

**Real source signals**

- Depends only on `@dvt/contracts`.
- Has build, typecheck, and Vitest.

**Gaps**

- Needs lifecycle state machine report: states, transitions, events,
  cancellation, failure, recovery, retry, terminal states.
- Needs alignment with engine domain services and state-store persistence.
- Needs transition table tests if absent.

**Next action**

Inspect run-domain `src` and tests, then generate lifecycle matrix.

---

## 21. packages/@dvt/state-store — `@dvt/state-store`

**Sources inspected**

- `packages/@dvt/state-store/package.json`
- `packages/@dvt/state-store/src/index.ts`

**Real source signals**

- Public API is heavily focused on archive lifecycle, archive manifest,
  terminal snapshots, object-store archive exporter, restore, delete, delivery
  buffer purge, and in-memory run state command port.
- Depends on S3 client, crypto, contracts, and engine.
- Test script uses `--passWithNoTests`.

**Gaps**

- Needs separation report: hot run state store vs archive lifecycle vs delivery
  buffer purge.
- Needs transaction/idempotency/tenant guarantees for state mutations.
- Needs archive restore/delete safety and corruption fixtures.
- Needs real tests if `passWithNoTests` hides missing coverage.

**Next action**

Inspect lifecycle modules, adapters, and Postgres adapter implementation.

---

## 22. packages/@dvt/traceability-service — `@dvt/traceability-service`

**Sources inspected**

- `packages/@dvt/traceability-service/package.json`
- `apps/lineage-worker/src/server.ts`

**Real source signals**

- Exposes binary `dvt-trace`.
- Has tests for lineage golden and facet schema validation.
- Depends on artifacts, contracts, delivery, glob, ajv, and ajv-formats.
- Used by lineage worker for `LineageWorkerRuntime`.

**Gaps**

- Needs boundary split: docs traceability, runtime lineage, governance DB, and
  artifact lineage.
- Needs generated manifest drift report.
- Needs CLI command contract for `dvt-trace`.
- Needs lineage schema versioning and compatibility policy.

**Next action**

Inspect traceability CLI, lineage runtime, schema validation, and generated docs
interactions.

---

## 23. packages/@dvt/adapter-postgres — `@dvt/adapter-postgres`

**Sources inspected**

- `packages/@dvt/adapter-postgres/package.json`
- `apps/projector-worker/src/server.ts`

**Real source signals**

- Depends on artifacts, contracts, delivery, engine, planner, run-domain,
  state-store, traceability-service, and pg.
- Has unit and integration test scripts, both using Vitest config.
- Projector worker constructs `PostgresStateStoreAdapter`, calls `migrate()`, and
  uses it with `ProjectorWorkerRuntime`.

**Gaps**

- Needs schema/migration contract and safe startup migration policy.
- Needs transaction boundary report for run events, snapshots, outbox,
  projections, lineage, and archive operations.
- Needs tenant isolation tests and concurrency conflict tests.
- Needs integration test classification: real DB vs pass-with-no-tests vs mocked.

**Next action**

Inspect adapter source, migrations, integration tests, and consumers.

---

## 24. packages/@dvt/adapter-temporal — `@dvt/adapter-temporal`

**Sources inspected**

- `packages/@dvt/adapter-temporal/package.json`
- `apps/temporal-worker/src/server.ts`

**Real source signals**

- Depends on Temporal SDK activity/client/worker/workflow, artifacts, contracts,
  crypto, delivery, engine, DSL, observability, and plan-interpreter.
- Has rich integration scripts: time-skipping, transformation, Postgres, local,
  CI, and Docker proof through root scripts.
- Temporal worker composes this adapter through `runTemporalWorkerHost`.

**Gaps**

- Needs workflow/activity matrix with retry, timeout, heartbeat, cancellation,
  idempotency, and failure classification.
- Needs proof that Temporal remains replaceable infrastructure and does not own
  DVT execution semantics.
- Needs integration result inventory for each script.

**Next action**

Inspect adapter workflows, activities, tests, and worker host.

---

## 25. packages/@dvt/cli — `@dvt/cli`

**Sources inspected**

- `packages/@dvt/cli/package.json`

**Real source signals**

- Package is `private: false` unlike most packages.
- Depends on contracts and engine.
- Provides `validate-contracts` and `run-golden-paths` scripts used by root
  validation.

**Gaps**

- Needs CLI command contract: command names, args, stdout/stderr, exit codes,
  fixtures, and compatibility.
- Needs package visibility decision: why public while repo is private and most
  workspaces are private.
- Needs parity check against API/planning DB so CLI does not become a parallel
  product semantic path.

**Next action**

Inspect CLI source, smoke test, `validate-contracts.cjs`, and golden runner.

---

# Cross-workspace corrections and priorities

## P0 — Fix workspace registry/count drift

The expected count and source-derived physical inventory must be reconciled.
Without this, any claim such as "all workspaces" is unstable.

## P1 — Close product flow, not just component inventory

Critical chain:

```text
web -> api -> contracts -> dsl -> planner -> plan-verifier -> plan-interpreter -> engine -> adapters/workers -> state-store -> artifacts/traceability
```

Missing reports must therefore be sequenced around flow closure.

## P2 — Replace `passWithNoTests` risk with explicit coverage posture

Packages with `--passWithNoTests` or no test script need coverage posture review:

- `@dvt/plan-verifier`
- `@dvt/state-store`
- `@dvt/planner-contracts`
- any package where tests are routed only from root or integration scripts

## P3 — Generate public surface matrices

Required for broad barrels or public APIs:

- `@dvt/contracts`
- `@dvt/engine`
- `@dvt/planner`
- `@dvt/adapter-temporal`
- `@dvt/adapter-postgres`
- `dvt-api`
- `@dvt/web`
- `@dvt/cli`

## P4 — Create dedicated follow-up files

This correction file must be followed by dedicated reports in this order:

1. `workspace-registry-and-count-drift`
2. `engine-public-surface-gap-report`
3. `planner-boundary-gap-report`
4. `dsl-authoring-gap-report`
5. `plan-verifier-coverage-gap-report`
6. `plan-interpreter-dag-gap-report`
7. `state-store-lifecycle-gap-report`
8. `adapter-temporal-runtime-gap-report`
9. `adapter-postgres-persistence-gap-report`
10. `workers-runtime-gap-report`

## Validation status

This file was created through the GitHub connector. No local `pnpm` validation was
run in this environment. The next local validation baseline should be:

```bash
pnpm lint:md:changed
pnpm docs:gov:filenames:changed
pnpm verify:changed
pnpm verify:prepush
```

## Closeout

This document corrects the previous insufficient coverage by using source files
and package manifests for every governed workspace surface currently found. It
also identifies a real counting/identity inconsistency that must be corrected
before future automation claims exact workspace coverage.
