---
id: R-20260426-START-RUN-INTENT-ROLLBACK-ASYMMETRY
title: Start-run intent schema downgrade remains asymmetric
status: Open
date: 2026-04-26
owners:
  - packages/@dvt/adapter-postgres
severity: Low
probability: Medium
---

# R-20260426-START-RUN-INTENT-ROLLBACK-ASYMMETRY

## Context

The core Postgres schema manager supports rollback planning and execution.
`StartRunIntentSchemaManager` still supports only forward migration.

The current QA hardening slice mitigates the operational memory risk of dual
migrations by introducing and adopting `migratePostgresRuntimeStores(...)`, but
it does not add symmetric downgrade behavior for the intent schema.

## Risk

If an operator needs to downgrade the `start_run_intents` schema in a real
incident, the downgrade path is manual SQL rather than a governed `rollbackTo`
API. That increases procedural risk and makes rollback posture asymmetric
between the two schema managers.

## Implemented Mitigations

- migration metadata now states clearly that hardening steps are idempotent and
  do not imply historical snapshot semantics;
- API bootstraps that need both stores use one shared helper so the runtime
  startup path is explicit and repeatable;
- the residual asymmetry is documented in the canonical review and this risk
  register entry instead of being hidden behind optimistic wording.

## Remaining Actions

1. Decide whether `StartRunIntentSchemaManager` should expose `rollbackTo`.
2. If not, publish an explicit manual downgrade runbook for `start_run_intents`.
3. Keep the review and evidence artifacts aligned with the chosen operational
   posture.

## Evidence

- `packages/@dvt/adapter-postgres/src/StartRunIntentSchemaManager.ts`
- `packages/@dvt/adapter-postgres/src/migratePostgresRuntimeStores.ts`
- `apps/api/src/runtime/intentReconcilerRuntime.ts`
- `apps/api/src/modules/buildProtectedRuntimeModule.ts`
- `docs/planning/reviews/architecture-and-governance/20260426-api-tenant-review.md`
- [Historical source](https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260426-api-tenant-qa-hardening.md)

<a id="risk-r-20260311-g5-3-correctness-01"></a>

## Independent risk R-20260311-G5-3-CORRECTNESS-01

```risk-record-v1
---
id: R-20260311-G5-3-CORRECTNESS-01
title: G5.3 correctness hardening is mergeable, but formal closeout still depends on real PostgreSQL evidence and policy alignment
status: Open
date: 2026-03-11
owners:
  - engine
  - adapter-postgres
  - ci
severity: High
probability: Medium
---

# R-20260311-G5-3-CORRECTNESS-01 - G5.3 correctness hardening is mergeable, but formal closeout still depends on real PostgreSQL evidence and policy alignment

## Context

`G5.3` materially improves outbox correctness:

- same-`runId` no-bypass behavior is now pinned in engine, runtime, canary, and
  PostgreSQL smoke tests;
- `publish success + markDelivered failure -> redelivery` is explicitly covered;
- stale-claim recovery and DLQ replay envelope preservation are now represented
  in PostgreSQL smoke coverage targets;
- runtime and runbook language remain explicit about at-least-once behavior and
  do not claim end-to-end exactly-once delivery.

That means the slice is a real hardening step, not a cosmetic test pass.

The residual risk is not "missing implementation" in the abstract. The residual
risk is over-claiming closure before the remaining repository-level evidence and
policy alignment are complete.

## Risk

If `G5.3` is treated as fully closed without the remaining evidence below, the
repository can drift into a false sense of completion:

- PostgreSQL correctness paths may be well-tested in code yet still unproven in
  a real integration lane if `pnpm test:adapter-postgres` remains skipped in
  the validation environment;
- the hardened `listPending()` query can preserve correctness while still
  becoming a production bottleneck under backlog or multi-`runId` pressure if
  no basic performance evidence is gathered;
- `ADR-0009` still documents "N retries = 5 (default)" while current code and
  runbook policy use `MAX_OUTBOX_ATTEMPTS = 10`, which leaves an explicit
  ADR/runtime drift if it is not resolved or consciously accepted;
- the standalone runtime and reusable worker can still drift over time, as
  already tracked by
  [R-20260308-G5-OUTBOX-WORKER-01](r-20260311-g5-4-operability-and-fencing-residuals.md#risk-r-20260308-g5-outbox-worker-01).

If that happens, reviewers may approve a technically good hardening slice while
the repository still lacks enough evidence to declare `G5.3` formally closed.

## Mitigation

- Keep `G5.3` language explicit: this slice proves at-least-once ordered
  delivery semantics, not end-to-end exactly-once.
- Keep run-event write boundaries hardened across engine and adapter-postgres:
  typed schema failures, tenant/run guards, and safe `runSeq` parsing must
  remain part of the mandatory regression surface.
- Execute `pnpm test:adapter-postgres` against a real PostgreSQL integration
  environment and report the pass/skip state honestly in closeout evidence.
- Gather at least minimal query-level evidence for the hardened PostgreSQL
  claim path (`EXPLAIN`, backlog sanity, or equivalent repository-approved
  performance proof) before declaring production-grade closure.
- Resolve the `ADR-0009` retries mismatch by either aligning the ADR to the
  shipped `10` attempts, aligning code to `5`, or recording an explicit
  accepted deviation with follow-up ownership.
- Keep runtime/core drift visible through
  [R-20260308-G5-OUTBOX-WORKER-01](r-20260311-g5-4-operability-and-fencing-residuals.md#risk-r-20260308-g5-outbox-worker-01)
  until ownership converges on one semantic core.

## Evidence

- `https://github.com/dunay2/dvt/blob/bec9a00d48ce1f02ec26199f670fcf1757680ad7/docs/planning/archive/gaps/G5-US-G5.3-CORRECTNESS-HARDENING-PLAN.md`
- `https://github.com/dunay2/dvt/blob/bec9a00d48ce1f02ec26199f670fcf1757680ad7/docs/planning/archive/gaps/GAP_EXECUTION_PLANS.md`
- `docs/guides/outbox-worker-technical-manual-20260404.md`
- `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`
- `packages/@dvt/delivery/test/OutboxWorker.test.ts`
- `packages/@dvt/adapter-postgres/test/smoke.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresRunEventStore.test.ts`
- `packages/@dvt/adapter-postgres/src/runEventEnvelopePolicy.ts`
- `packages/@dvt/adapter-postgres/src/PostgresRunEventStorage.ts`
- `docs/risk-register/quality/r-20260311-g5-4-operability-and-fencing-residuals.md#risk-r-20260308-g5-outbox-worker-01`
```

<a id="risk-r-20260328-rcb5f2-lineage-claim-race"></a>

## Independent risk R-20260328-RCB5F2-LINEAGE-CLAIM-RACE

```risk-record-v1
---
id: R-20260328-RCB5F2-LINEAGE-CLAIM-RACE
title: Lineage stale-claimer concurrency remains timestamp-fenced without lease tokens
status: Open
date: 2026-03-28
owners:
  - '@dvt/adapter-postgres'
severity: Medium
probability: Low
---

## Context

`RC-B5-F2` adds real-DB tests for lineage claim-timeout and stale-claimer interactions.
Current write fencing uses claim timestamp windows (`claimed_at` + timeout) and does not include a separate lease token.

## Risk

Timestamp-window fencing is sensitive to timing edges under highly concurrent workers.
Coverage is improved by integration tests, but lease-token ownership is still not modeled for lineage claim acknowledgements.

## Mitigation

1. Keep claim-timeout and stale-claimer integration tests in the adapter suite.
2. Monitor lineage dead-letter and retry metrics for regressions in production.
3. Consider tokenized claim ownership for lineage paths in a future hardening slice if timing-edge incidents appear.
```

<a id="risk-r-20260329-adapter-import-alias-drift"></a>

## Independent risk R-20260329-ADAPTER-IMPORT-ALIAS-DRIFT

```risk-record-v1
---
id: R-20260329-ADAPTER-IMPORT-ALIAS-DRIFT
title: Adapter-postgres can regress if inline import aliases reappear in runtime modules
status: Open
date: 2026-03-29
owners:
  - '@dvt/adapter-postgres'
severity: Low
probability: Medium
---

## Context

This branch includes adapter-postgres refactoring that removes inline `import type ... as ...` aliases from runtime modules and adds CI guard coverage in `tools/ci/adapter-postgres-import-alias-regression.test.mjs`.

## Risk

Without a persistent governance signal, future refactors can reintroduce alias patterns that break the intended import boundary style and re-open the same CI regression surface.

## Mitigation

1. Keep the adapter import-alias regression test in CI and treat failures as release-blocking for adapter-postgres slices.
2. Require review focus on runtime module import style in adapter-postgres PRs.
3. Close this risk only after repeated green CI cycles confirm the guard is stable across merges.
```

<a id="risk-r-20260404-guards-alignment"></a>

## Independent risk R-20260404-GUARDS-ALIGNMENT

```risk-record-v1
---
id: R-20260404-GUARDS-ALIGNMENT
title:
  Riesgo de inconsistencia en guards de transición y shape-checking entre run-domain y
  adapter-postgres
status: Open
date: 2026-04-04
owners:
  - dvt/adapter-postgres
severity: Medium
probability: Low
---
La falta de alineación entre los guards de transición y shape-checking en run-domain y
adapter-postgres podría causar divergencias en la validación de eventos y estados, afectando la
integridad del sistema distribuido. Esta actualización mitiga el riesgo asegurando consistencia
contractual y cobertura de tests.
```

<a id="risk-r-20260404-planner-v1-contract-normalization"></a>

## Independent risk R-20260404-PLANNER-V1-CONTRACT-NORMALIZATION

```risk-record-v1
---
id: R-20260404-PLANNER-V1-CONTRACT-NORMALIZATION
title: Planner boundary contract naming drift across V2 and V1 symbols
status: Open
date: 2026-04-04
owners:
  - '@dvt/contracts'
  - '@dvt/planner'
  - '@dvt/adapter-postgres'
  - 'dvt-api'
severity: Medium
probability: Medium
---
summary: >
  Active runtime boundaries used a mixed V2/V1 planner contract vocabulary. This created integration
  ambiguity and ARC-governed drift risk between contracts, planner, API, and adapter consumers.

mitigations:
  - Normalize active contract filenames and exported symbols to V1.
  - Align parser and schema helper names to the same public contract line.
  - Validate with package build/test plus repository pre-push quality gates.

monitoring:
  - Track PR/CI comments that report unresolved V2 symbols in active runtime paths.
  - Watch contract schema sync tests and changed-file checks for regressions.

follow_up:
  - Continue cleanup of legacy historical/local docs that still mention V2 labels where those
    surfaces remain intentionally archival.
```

<a id="risk-r-20260405-workflow-snapshot-schema-version"></a>

## Independent risk R-20260405-WORKFLOW-SNAPSHOT-SCHEMA-VERSION

```risk-record-v1
---
id: R-20260405-WORKFLOW-SNAPSHOT-SCHEMA-VERSION
title: WorkflowSnapshot schema-version drift can reappear if version bumps are skipped
status: Open
date: 2026-04-05
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
context: >
  WorkflowSnapshot now carries an explicit schemaVersion and Postgres read paths rebuild snapshots
  when the stored version differs from the current contract version.
risk: >
  Future snapshot shape changes may bypass the version bump process, which would reduce the value of
  automated stale detection and could allow incompatible persisted snapshots to survive unnoticed.
mitigations:
  - CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION is centralized in @dvt/contracts.
  - Snapshot constructors in engine and adapter paths now stamp schemaVersion explicitly.
  - Postgres getSnapshot triggers rebuildSnapshot on schemaVersion mismatch.
  - Snapshot staleness SQL now includes schemaVersion mismatch predicates.
  - ARC-2 evidence documents validation and rollout baseline for this change.
review_after: 2026-05-15
---
```

<a id="risk-r-20260407-plan-policy-boundary-drift"></a>

## Independent risk R-20260407-PLAN-POLICY-BOUNDARY-DRIFT

```risk-record-v1
---
id: R-20260407-PLAN-POLICY-BOUNDARY-DRIFT
title: Execution policy sidecar can drift from canonical stored plan identity
status: Open
date: 2026-04-07
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Medium
context: >
  Execution admission policy has been separated from canonical plan definition. Stored-plan
  persistence and fetch paths now move two coordinated payloads: canonical plan bytes and sidecar
  RunExecutionPolicy metadata.
risk: >
  If plan bytes and execution policy are persisted, backfilled, or fetched out of sync, the engine
  can verify one canonical plan while admitting the run against stale capability or compatibility
  requirements. That would weaken the intended planner/engine boundary instead of clarifying it.
mitigations:
  - 'ADR-0046 freezes the ownership split between ExecutionPlan and RunExecutionPolicy.'
  - 'PlannerBuildResultV1 now publishes plan and executionPolicy separately.'
  - 'PlanRef no longer carries runtime policy fields, reducing leakage paths.'
  - 'Plan integrity validation and executability validation load StoredPlanArtifact with both bytes
    and executionPolicy.'
  - 'Adapter-postgres persists plugin compatibility fingerprint and required capabilities as sidecar
    metadata.'
  - 'Contracts, planner, engine, adapter-postgres, and API tests cover the split end to end.'
  - 'verify:prepush remains mandatory before push or PR creation.'
review_after: 2026-05-31
---
```

<a id="risk-r-20260408-pr807-adapter-postgres-test-contract-drift"></a>

## Independent risk R-20260408-PR807-ADAPTER-POSTGRES-TEST-CONTRACT-DRIFT

```risk-record-v1
---
id: R-20260408-PR807-ADAPTER-POSTGRES-TEST-CONTRACT-DRIFT
title:
  Adapter-postgres integration tests can drift from artifact fetch and lineage validation contracts
status: Open
date: 2026-04-08
owners:
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
context: >
  PR-807 updates dependency and test wiring where adapter-postgres integration tests were no longer
  aligned with the current PlanStore fetch artifact shape and lineage validation path preconditions.
risk: >
  If future changes reintroduce stale assumptions in integration tests, CI can fail late with
  misleading diagnostics or miss regressions in plan-store fetch payload handling and lineage
  integrity enforcement.
mitigations:
  - 'Lifecycle integration test now asserts against artifact.bytes from fetch().'
  - 'Missing-lineage integration test now uses a hash consistent with the modified canonical plan.'
  - 'Adapter Postgres Integration Smoke check gates merges for this path.'
  - 'verify:prepush is required before push to catch cross-workspace drift.'
review_after: 2026-05-31
---
```

<a id="risk-r-20260408-pr850-adapter-postgres-test-order-drift"></a>

## Independent risk R-20260408-PR850-ADAPTER-POSTGRES-TEST-ORDER-DRIFT

```risk-record-v1
---
id: R-20260408-PR850-ADAPTER-POSTGRES-TEST-ORDER-DRIFT
title: Adapter-postgres integration tests can drift from deterministic manifest node ordering rules
status: Open
date: 2026-04-08
owners:
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
context: >
  PR-850 updates adapter-postgres integration assertions after mainline planner changes enforced
  deterministic manifest node ordering and aligned canonical-hash expectations.
risk: >
  If integration assertions keep stale node-order assumptions, CI can fail on non-functional order
  differences and hide real regressions in adapter behavior.
mitigations:
  - 'records-core integration assertions now match deterministic manifest ordering from main.'
  - 'Duplicate canonicalHash key usage was removed from the records-core fixture assertion shape.'
  - 'Adapter Postgres Integration Smoke and Run Tests gates execute on every PR for this path.'
  - 'verify:prepush was executed before push to catch local drift early.'
review_after: 2026-05-31
---
```

<a id="risk-r-20260409-ci-rebuild-dedupe-and-adapter-postgres-consolidation"></a>

## Independent risk R-20260409-CI-REBUILD-DEDUPE-AND-ADAPTER-POSTGRES-CONSOLIDATION

```risk-record-v1
---
id: R-20260409-CI-REBUILD-DEDUPE-AND-ADAPTER-POSTGRES-CONSOLIDATION
title: CI rebuild dedupe or job consolidation could hide missing explicit build prerequisites
status: Open
date: 2026-04-09
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
context: >
  CI workflows and package lifecycle hooks were changed so explicit workflow build steps become the
  authoritative dependency-graph build, while package hooks skip redundant work under DVT_CI. The
  adapter-postgres workflow also moved from two jobs to one Postgres-backed full-suite job.
risk: >
  If any workflow path calls typecheck or test without the required explicit graph build,
  DVT_CI-driven hook skipping could surface missing dist artifacts only in CI. If the
  adapter-postgres scope policy or parity tooling drifts from the consolidated workflow, CI could
  silently lose the intended coverage/cost balance.
mitigations:
  - 'workspace-ci now performs explicit graph builds before typecheck with DVT_CI enabled.'
  - 'contracts.yml compiles contracts inline instead of depending on cross-job artifacts.'
  - 'adapter-postgres CI now runs the full suite against a real Postgres container in one job.'
  - 'CI policy validation and workflow parity tests were updated to match the consolidated
    adapter-postgres job.'
  - 'Validation included local Postgres-backed adapter-postgres execution plus pnpm test:ci-tools
    and pnpm verify:prepush.'
  - '2026-09-30 / #3494: engine coverage retains the test/pretest lifecycle, forwards the actual
    coverage flag and reuses one root threshold policy. Executable negative coverage tests reject
    low coverage and include unexecuted source; Test Suite requires coverage-final.json and fails if
    the report is missing. This closes false-green evidence before any later deduplication.'
evidence:
  - docs/evidence/ed-20260930-engine-coverage-evidence.md
  - https://github.com/dunay2/dvt/issues/3494
review_after: 2026-10-30
---
```

<a id="risk-r-20260416-ar-d1-incremental-snapshot-projection"></a>

## Independent risk R-20260416-AR-D1-INCREMENTAL-SNAPSHOT-PROJECTION

```risk-record-v1
---
id: R-20260416-AR-D1-INCREMENTAL-SNAPSHOT-PROJECTION
title: Incremental snapshot checkpoint drift can mask replay assumptions
status: Open
date: 2026-04-16
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
context: >
  AR-D1 changes snapshot rebuild behavior from full replay-by-default to checkpoint-plus-delta
  replay. Correctness now depends on checkpoint validity (`schemaVersion` compatibility and
  monotonic `last_run_seq`).
risk: >
  If a stale or malformed checkpoint is accepted as valid, replay may omit required events and
  project an incorrect status surface.
mitigations:
  - Keep strict checkpoint guards (schema compatibility and bounded sequence checks) before delta
    replay.
  - Preserve full-replay fallback when checkpoint state is missing or incompatible.
  - Keep rebuild tests that cover checkpoint and fallback paths in both in-memory and Postgres
    stores.
review_after: 2026-06-30
---
```

<a id="risk-r-20260421-adapter-pg-workspace-path-drift"></a>

## Independent risk R-20260421-ADAPTER-PG-WORKSPACE-PATH-DRIFT

```risk-record-v1
---
id: R-20260421-ADAPTER-PG-WORKSPACE-PATH-DRIFT
title: Adapter-postgres workspace type-path mappings can drift from real package imports
status: Open
date: 2026-04-21
owners:
  - packages/@dvt/adapter-postgres
  - apps/api
severity: Medium
probability: Medium
context: >
  `packages/@dvt/adapter-postgres/tsconfig.json` uses an explicit `paths` map to resolve sibling
  workspace packages from built `dist` declarations. The 2026-04-21 API HTTP entrypoint slice
  exposed that the adapter imported `@dvt/delivery` and `@dvt/traceability-service`, but the `paths`
  map had not been updated to match those imports. The mismatch did not surface only as an
  adapter-local issue; it broke `pnpm --filter dvt-api build` because the API build recursively
  prebuilds adapter dependencies.
risk: >
  If manual workspace path maps continue diverging from real imports, DVT can accumulate latent
  build failures that only appear in recursive package builds, slowing PR feedback and masking the
  true health of unrelated slices that depend on the same orchestration path.
mitigations:
  - >
    Keep adapter package builds in the validation baseline for slices that depend on recursive
    workspace prebuilds instead of assuming `apps/api` can be validated in isolation.
  - >
    Whenever `@dvt/adapter-postgres` imports a new internal package, update the local `paths` map in
    the same slice and verify `pnpm --filter @dvt/adapter-postgres build`.
  - >
    Evaluate whether the adapter can replace the hand-maintained path list with one shared
    workspace-resolution strategy so new sibling imports are not tracked in multiple places.
observed_trigger:
  - '`pnpm --filter dvt-api build` failed through recursive prebuild.'
  - 'Root cause traced to `packages/@dvt/adapter-postgres/tsconfig.json`.'
  - >
    Missing mappings were `@dvt/delivery`, `@dvt/delivery/*`, `@dvt/traceability-service`, and
    `@dvt/traceability-service/*`.
review_after: 2026-06-15
---
```

<a id="risk-r-20260425-production-tenant-isolation-baseline"></a>

## Independent risk R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE

```risk-record-v1
---
id: R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE
title: Plan-store tenancy and live RLS profile coverage remain after forced RLS baseline
status: Open
date: 2026-04-25
owners:
  - packages/@dvt/adapter-postgres
  - packages/@dvt/engine
  - packages/@dvt/contracts
severity: High
probability: Medium
context: >
  The 2026-04-25 tenant isolation slice enables forced RLS for tenant-owned online Postgres state
  tables, introduces explicit tenant/service transaction context, and makes run_metadata the
  authoritative source for tenant backfills. The follow-up hardcut includes start_run_intents in the
  RLS baseline, tenant-scopes intent command/query operations through StartRunIntentRef, adds
  explicit tenant predicates to run-event sequence and dedupe reads, requires adapter-internal
  POSTGRES_SERVICE_ACCESS catalog entries through PostgresMaintenanceAccess for service-context
  activation, re-applies RLS policies with approved service_access_owner predicates, and removes the
  duplicate IStartRunIntentStore/StartRunIntentPolicy ownership from @dvt/contracts. The 2026-04-25
  follow-up also changes the CI/local RLS proof role to a non-schema-creating role: migrations run
  through the explicit admin URL, online runtime smoke runs through DVT_PG_RLS_URL after explicit
  runtime grants, direct RLS enforcement uses DVT_PG_RLS_URL without tenant context fallbacks, and
  table-scoped service owners prevent one maintenance path from reading every tenant-owned table.
  The 2026-04-26 QA follow-up narrows the app-role runtime grant helper from broad tenant-catalog
  DML to explicit run-state and start-run-intent privilege profiles, and adds direct negative write
  probes for missing and mismatched tenant context.
risk: >
  Plan records still lack top-level tenant/project/environment columns, so plan-store tenancy
  remains a separate governed task. RLS enforcement must still be proven in the deployment profile
  using a non-owner, non-BYPASSRLS, non-schema-creating application role; superuser, BYPASSRLS,
  database CREATE, or public-schema CREATE privileges invalidate the direct-access proof. The
  TypeScript maintenance catalog and table-scoped RLS service_access_owner predicates reduce
  accidental drift but do not replace database-role separation: arbitrary SQL running under the same
  application role can still forge transaction-local settings. Future direct SQL readers can still
  drift if they bypass the adapter client-session pattern or omit tenant predicates on tenant-owned
  reads.
mitigations:
  - >
    Keep `FORCE ROW LEVEL SECURITY` on tenant-owned online tables and keep application traffic on a
    non-owner, non-schema-creating role for least privilege.
  - >
    Keep the app-role runtime smoke in CI so migration/setup authority and online application
    authority remain separately proven, including negative checks that the app role lacks write
    privileges on lineage/dead-letter tables outside the run-state runtime grant profile.
  - >
    Keep all tenant command/query paths setting tenant context with explicit tenant predicates and
    all worker/maintenance global sweep paths setting service context before accessing RLS-protected
    tables.
  - >
    Keep service context behind PostgresMaintenanceAccess, the closed POSTGRES_SERVICE_ACCESS
    catalog, and table-scoped RLS owner lists; do not export generic capability creation or
    maintenance authority from the adapter package root, and keep architecture tests forbidding API
    imports of service authority.
  - >
    Split tenant application and maintenance database roles before production onboarding so service
    mode cannot be forged by arbitrary SQL under the tenant application role.
  - >
    Run PostgresTenantRlsEnforcement.integration.test.ts under DVT_PG_INTEGRATION=1 with a
    non-owner, non-BYPASSRLS, non-schema-creating role before production onboarding. This test must
    keep real DML-negative probes, not only catalog-string checks.
  - >
    Run PostgresAppRoleRuntime.integration.test.ts under DVT_PG_INTEGRATION=1 with DVT_PG_URL set to
    the admin migration role and DVT_PG_RLS_URL set to the application role. This test must prove
    state-store and start-run-intent runtime paths work without granting schema_migrations DML.
  - >
    Keep start_run_intents under its dedicated schema manager RLS migration, require
    StartRunIntentRef on intent command/query operations, and forbid direct pool.query access from
    the intent store.
  - >
    Do not use `__unknown_tenant__`, payload-derived, or synthetic fallbacks for tenant-owned
    storage migrations; migration must fail if ownership cannot be derived from canonical metadata.
  - >
    Schedule a separate plan-store tenancy slice to add top-level tenant/project/environment
    ownership to `plan_records` and `stored_plans`.
review_after: 2026-06-30
---
```

<a id="risk-r-20260427-rc-g1-d-planner-ownership"></a>

## Independent risk R-20260427-RC-G1-D-PLANNER-OWNERSHIP

```risk-record-v1
---
id: R-20260427-RC-G1-D-PLANNER-OWNERSHIP
title: Planner-private behavior ports can drift back into the shared kernel
status: Open
date: 2026-04-27
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - packages/@dvt/adapter-postgres
  - apps/api
severity: Medium
probability: Low
context: >
  RC-G1-D splits mixed planner contract files so serializable vocabulary remains in @dvt/contracts
  while planner-private behavior ports move to @dvt/planner. The cutover also makes
  @dvt/adapter-postgres declare an explicit planner dependency for the lifecycle store interface it
  implements.
risk: >
  A future convenience export or broad adapter import could reintroduce planner-private behavior
  through @dvt/contracts, remove the module-level owned-concern declaration, or make the Postgres
  adapter depend on planner services instead of only the owner-local behavior port it implements.
mitigations:
  - >
    packages/@dvt/contracts/test/planner-private-ownership.architecture.test.ts proves the moved
    behavior ports are absent from @dvt/contracts source files and its root barrel.
  - >
    packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts proves the moved
    behavior ports are published from @dvt/planner and now validates semantic encapsulation:
    type-only root-barrel exports, owned-concern docblocks, type-only shared-vocabulary imports, no
    DTO vocabulary exports, and no peer-domain or adapter imports.
  - >
    docs/architecture/components/planner/planner-private-behavior-ports-component.md records the
    component public API, invariants, lifecycle transitions, consumers, and extension rules so the
    semantic boundary is not only encoded in source layout.
  - >
    https://github.com/dunay2/dvt/blob/d3fe40beaa66bd8d98ae9397b76340ff5f895f21/docs/planning/reviews/architecture-and-governance/20260427-rc-g1-d-fowler-architecture-review.md
    records the Fowler-style review, mature-system comparison, detected anti-patterns, drift fixes,
    and future lessons for similar owner-package migrations.
  - >
    eslint.config.cjs blocks governed runtime code from importing the moved ports from
    @dvt/contracts.
  - >
    The RC-G1-D proposal and closeout document record the explicit exception that
    @dvt/adapter-postgres imports the planner-owned lifecycle port as an implementation dependency,
    not as a planner service dependency.
review_after: 2026-06-30
---
```

<a id="risk-r-20260511-tenant-mode-rls-property"></a>

## Independent risk R-20260511-TENANT-MODE-RLS-PROPERTY

```risk-record-v1
---
id: R-20260511-TENANT-MODE-RLS-PROPERTY
title: Tenant-owned RLS tables can drift from complete tenant-mode authorization
status: Open
date: 2026-05-11
owners:
  - packages/@dvt/adapter-postgres
severity: Low
probability: Low
---
mitigation:
  summary: >
    The Postgres tenant-isolation predicate now requires both dvt.access_mode = tenant and a
    matching dvt.tenant_id for tenant access, while service access remains gated by an approved
    table-scoped service owner. New schema-manager hardening migrations reapply the current RLS
    predicate for already-migrated core and start-run-intent tables. Runtime integration coverage
    seeds every cataloged tenant-owned table and proves missing, partial, and cross-tenant contexts
    fail closed.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260511-tenant-mode-rls-property.md
    - packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts
    - packages/@dvt/adapter-postgres/test/StartRunIntentSchemaManager.test.ts
    - packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
  follow_up:
    - Keep the RLS proof in CI/nightly with a non-owner, non-BYPASSRLS application role.
```

<a id="risk-r-20260513-ar-a6-snapshot-rebuild-concurrency-contract"></a>

## Independent risk R-20260513-AR-A6-SNAPSHOT-REBUILD-CONCURRENCY-CONTRACT

```risk-record-v1
---
id: R-20260513-AR-A6-SNAPSHOT-REBUILD-CONCURRENCY-CONTRACT
title: Future state-store adapters may miss snapshot rebuild mutual exclusion
status: Open
date: 2026-05-13
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/adapter-postgres'
severity: Medium
probability: Low
---
context: >
  AR-A6 clarified that IRunStateStoreMaintenance.rebuildSnapshot must serialize durable snapshot
  mutation per (tenantId, runId) or fail competing commands with a typed transient concurrency
  error.

risk: >
  A future non-PostgreSQL state-store adapter could implement deterministic replay without
  equivalent mutual exclusion, allowing two repair or projector commands to race on the same
  materialized snapshot.

mitigation: >
  Keep the semantic architecture guard in @dvt/contracts, require adapter guides to describe
  equivalent mutual exclusion, and review any new state-store adapter against the snapshot rebuild
  concurrency component guide.

validation:
  - pnpm --filter @dvt/contracts test --
    test/run-state-store-maintenance-concurrency.architecture.test.ts
```

<a id="risk-r-20260513-ar-d4-zero-downtime-schema-rollback"></a>

## Independent risk R-20260513-AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK

```risk-record-v1
---
id: R-20260513-AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK
title: Online rollback classification could mislabel a future destructive schema step
status: Open
date: 2026-05-13
owners:
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
description: >
  AR-D4 relies on every future migration step receiving explicit rollback compatibility
  classification. A future destructive step misclassified as online could allow rollback under live
  traffic.
mitigation:
  - PostgresSchemaRollbackZeroDowntime.architecture.test.ts requires the local component guide,
    owned concerns, and compatibility policy to stay aligned.
  - PostgresSchemaManager.rollback.test.ts covers online and offline policy classification.
  - New migration PRs touching packages/@dvt/adapter-postgres/** trigger ARC-2 evidence and risk
    review.
---
```

<a id="risk-r-20260513-run-events-hash-partitioning"></a>

## Independent risk R-20260513-RUN-EVENTS-HASH-PARTITIONING

```risk-record-v1
---
id: R-20260513-RUN-EVENTS-HASH-PARTITIONING
title: Run events partitioning could drift from idempotency and tenant isolation constraints
status: Open
date: 2026-05-13
owners:
  - dvt/adapter-postgres
severity: Medium
probability: Low
---
The `run_events` table is the authoritative event log. Partitioning it could accidentally weaken
duplicate idempotency, per-run ordering, rollback safety, or tenant RLS if the migration shape
drifts from the adapter contract. This slice mitigates the risk by partitioning by `run_id`,
preserving the existing primary and unique constraints, copying a fixed canonical column list during
conversion, testing rollback, and reapplying tenant RLS after conversion.
```
