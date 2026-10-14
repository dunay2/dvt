---
id: R-20260311-G5-4-QA-01
title: G5 worker operability can regress without stale-readiness, ownership fencing, and downstream dedupe proof
status: Open
date: 2026-03-11
owners:
  - engine
  - adapter-postgres
  - platform
  - ci
severity: High
probability: Medium
---

# R-20260311-G5-4-QA-01 - G5 worker operability can regress without stale-readiness, ownership fencing, and downstream dedupe proof

## Context

`G5.3` materially improved ordered at-least-once delivery and shutdown behavior,
but the next QA pass still found five operational gaps that can produce real
runtime regressions even when the current unit and package-level suites are
green:

- readiness is derived from runtime state only, so a worker can stay
  `ready=true` after its loop stops making progress if the last completed tick
  left the state as `idle` or `draining`;
- shutdown now interrupts bootstrap correctly, but the runtime still lacks an
  explicit `stopping` state and a freshness rule that withdraws readiness as
  soon as shutdown begins;
- the new bootstrap-abort path still leaves a narrow race for direct
  `createOutboxWorkerRuntime(..., { shutdownSignal })` callers: an abort that
  lands just after startup resolves can still trigger
  `abortPendingOperations()`, leaving the adapter poisoned while returning a
  runtime handle;
- startup ownership is now fenced by advisory locks on a dedicated PostgreSQL
  session, and post-start lock loss now forces the host to withdraw ownership
  and stop, but the multi-worker proof and real PostgreSQL evidence for that
  fencing model are still incomplete;
- the worker proves at-least-once delivery at its own boundary, but the
  downstream duplicate-handling contract is still implicit and reclaim/backlog
  behavior is not yet closed with real PostgreSQL evidence.

Those gaps match the failure classes repeatedly seen in comparable distributed
worker systems: heartbeat-stale health, queue daemons that hang while still
looking alive, graceful shutdown without timely readiness withdrawal, and
duplicate or replay behavior that is only partially defended by the consumer.

## Risk

If those gaps remain undocumented or are treated as "non-blocking ops details",
`G5` can regress in ways that are painful in production:

- orchestration can continue routing traffic to a worker whose process is alive
  but whose tick loop is stale;
- a node that is already shutting down can remain externally `ready` long
  enough to absorb work it should no longer own;
- a direct runtime caller can receive a successfully created runtime handle
  whose first database access fails immediately with `AbortError` if shutdown
  lands inside the bootstrap race window;
- a broken or reset ownership session now stops the current host, but
  `ADR-0009` multi-worker enforcement still lacks concurrent-worker proof and
  real PostgreSQL evidence for the selected shard/fencing model;
- duplicate publication can be technically correct at the worker boundary while
  still causing downstream side effects if the consumer contract does not prove
  idempotent handling;
- reclaim and backlog pressure can preserve ordering while still hiding a
  production bottleneck or starvation mode that the current local evidence does
  not yet expose.

## Mitigation

- Keep `G5` rollout language explicit: startup ownership is fenced and
  post-start lock loss now forces host shutdown, but concurrent-worker proof
  and real PostgreSQL evidence are still incomplete.
- Add a freshness-aware readiness invariant, an explicit `stopping` runtime
  state, and tests that prove readiness is withdrawn immediately on shutdown and
  after stale ticks.
- Harden `waitForStartupOrAbort()` so a late abort after successful startup does
  not mutate adapter state, and pin that path with a regression test for direct
  runtime callers.
- Define the downstream duplicate-handling contract explicitly around
  `eventId` and `idempotencyKey`, and prove it with a canary or contract test.
- Execute reclaim/orphan recovery and backlog sanity against a real PostgreSQL
  lane before claiming operability closure.
- Consult the original design context in Git; current work belongs in GitHub
  Issues, not the retired plan:
  [G5 / US-G5.4 Operability And Ownership Hardening Plan (Git provenance)](https://github.com/dunay2/dvt/blob/bec9a00d48ce1f02ec26199f670fcf1757680ad7/docs/planning/archive/gaps/G5-US-G5.4-OPERABILITY-AND-OWNERSHIP-HARDENING-PLAN.md).

## Evidence

- `apps/outbox-worker/src/host/runOutboxWorkerHost.ts`
- `apps/outbox-worker/src/ownership/PgShardOwnershipGate.ts`
- `apps/outbox-worker/src/runtime/createOutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/runtime/OutboxWorkerRuntime.ts`
- `apps/outbox-worker/src/ops/OutboxWorkerMonitor.ts`
- `apps/outbox-worker/src/ops/OperationalServer.ts`
- `apps/outbox-worker/test/host/runOutboxWorkerHost.test.ts`
- `apps/outbox-worker/test/ownership/PgShardOwnershipGate.test.ts`
- `apps/outbox-worker/test/runtime/createOutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/runtime/OutboxWorkerRuntime.test.ts`
- `apps/outbox-worker/test/canary/standaloneCanaryAcceptance.test.ts`
- `packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.sharding.test.ts`
- `packages/@dvt/adapter-postgres/test/smoke.test.ts`
- `https://github.com/dunay2/dvt/blob/bec9a00d48ce1f02ec26199f670fcf1757680ad7/docs/planning/archive/gaps/G5-OUTBOX-WORKER-CONSOLIDATED-PLAN.md`
- `docs/risk-register/quality/r-20260426-start-run-intent-rollback-asymmetry.md#risk-r-20260311-g5-3-correctness-01`

## Reference-Only Comparative Signals

These references informed the QA assessment, but they are not canonical repo
requirements:

- [Airflow scheduler health checks and heartbeat freshness](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/check-health.html)
- [Airflow scheduler HA and DB locking constraints](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/scheduler.html)
- [Dagster queued daemon hangs while heartbeats stop advancing](https://github.com/dagster-io/dagster/issues/28910)
- [Dagster duplicate run keys not de-duplicated within one evaluation](https://github.com/dagster-io/dagster/issues/26753)
- [Celery staged shutdown and soft-shutdown window](https://docs.celeryq.dev/en/stable/userguide/workers.html)
- [Temporal workers still receiving work during graceful shutdown](https://github.com/temporalio/sdk-python/issues/783)

<a id="risk-r-20260330-lineage-dlq-auto-replay"></a>

## Independent risk R-20260330-LINEAGE-DLQ-AUTO-REPLAY

```risk-record-v1
---
id: R-20260330-LINEAGE-DLQ-AUTO-REPLAY
title: Automatic lineage DLQ replay may requeue persistent poison events repeatedly
status: Open
date: 2026-03-30
owners:
  - '@dvt/delivery'
  - '@dvt/adapter-postgres'
severity: Medium
probability: Medium
---

## Context

Lineage worker now supports automatic replay from `lineage_dead_letter` back into `lineage_outbox`.

## Risk

If failures are caused by persistent payload/data issues instead of transient sink outages, auto-replay can keep requeueing the same events and increase churn/noise without resolving root cause.

## Mitigation

1. Keep replay bounded by batch size and tenant scope.
2. Alert on dead-letter backlog threshold to surface sustained failure patterns.
3. Track replayed counts and dead-letter lag in logs; disable auto-replay (`DVT_LINEAGE_DLQ_AUTO_REPLAY_ENABLED=false`) if churn dominates.
4. Consider replay cooldown and replay-attempt budget per dead-letter record in a follow-up hardening slice.
```

<a id="risk-r-20260402-snapshot-retry-fallback-cadence"></a>

## Independent risk R-20260402-SNAPSHOT-RETRY-FALLBACK-CADENCE

```risk-record-v1
---
id: R-20260402-SNAPSHOT-RETRY-FALLBACK-CADENCE
title: Documentary misalignment risk for snapshot ownership and fallback polling traceability
status: Open
date: 2026-04-02
owners:
  - packages/@dvt/adapter-postgres
  - packages/@dvt/delivery
severity: Medium
probability: Medium
context: >
  This PR carries ARC-2 documentary artifacts while the effective code delta against main is
  documentary-only.
risk: >
  Evidence and risk text can drift from actual merge content if they imply runtime changes that are
  not present in the final diff.
mitigations:
  - Keep evidence wording explicitly documentary for this PR.
  - Keep code refs aligned to reviewed scope without claiming new runtime behavior.
  - Re-run pre-push gates before publishing updates.
---
```

<a id="risk-r-20260404-ar-c2-operability-evidence-gap"></a>

## Independent risk R-20260404-AR-C2-OPERABILITY-EVIDENCE-GAP

```risk-record-v1
---
id: R-20260404-AR-C2-OPERABILITY-EVIDENCE-GAP
title: AR-C2 can be overstated as complete without dashboard and alert evidence
status: Open
date: 2026-04-04
owners:
  - dvt-api
  - dvt-outbox-worker
  - docs
severity: High
probability: Medium
---
summary: >
  AR-C2 has canonical signal and threshold mapping, but operational closure remains incomplete while
  dashboard wiring evidence, alert-rule evidence, and sustained validation windows are pending. This
  creates a risk of declaring SLA readiness without enforceable monitor proof.

mitigations:
  - Require immutable dashboard evidence per mapped signal (`AR-C2-T2`).
  - Require immutable alert-rule and routing evidence per mapped threshold (`AR-C2-T3`).
  - Require sustained validation windows and operator outcome records before lane closure
    (`AR-C2-T4`).
  - Keep `AR-C2` status as `in_progress` until all evidence rows are complete.

monitoring:
  - Track completion of pending TODOs in
    `docs/planning/closeouts/20260404-ar-c2-sla-operational-closure-closeout.md`.
  - Run `pnpm qa:artifact:check` and `pnpm verify:prepush` on every AR-C2 iteration.
  - Review evidence matrix completeness in
    `docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md`.

follow_up:
  - Move risk to Closed only when AR-C2 evidence matrices are fully populated and lane task AR-C2 is
    set to done with supporting closeout evidence.
```

<a id="risk-r-20260408-mw-c1-step-kind-dispatch-drift"></a>

## Independent risk R-20260408-MW-C1-STEP-KIND-DISPATCH-DRIFT

```risk-record-v1
---
id: R-20260408-MW-C1-STEP-KIND-DISPATCH-DRIFT
title: Runtime step-kind routing can regress to catch-all execution in adapter-temporal
status: Open
date: 2026-04-08
owners:
  - packages/@dvt/adapter-temporal
severity: Medium
probability: Low
context: >
  MW-C1 introduces explicit step-kind dispatch through StepActivityDispatcher and DbtStepActivity to
  remove catch-all runtime step handling from Temporal activities.
risk: >
  Future edits may bypass or weaken dispatcher registration checks, reintroducing implicit execution
  of unsupported kinds and hiding integration gaps.
mitigations:
  - 'StepActivityDispatcher now routes task steps by step.kind and fails closed for unknown kinds.'
  - 'TemporalWorkerHost now accepts an explicit stepActivitiesByKind registry so new kinds are
    registered at composition, not by editing workflow code.'
  - 'StepActivityDispatcher snapshots the supplied registry at construction so late mutation does
    not change dispatch for already-created workers.'
  - 'UnsupportedStepKindError is emitted as non-retryable PermanentStepError semantics.'
  - 'Unit tests assert step kind required, unsupported-kind failure paths, and positive
    registered-kind execution.'
  - 'Time-skipping golden-path integration test remains in validation baseline.'
review_after: 2026-06-01
---
```

<a id="risk-r-20260409-provider-ref-exact-match-adapter-conformance"></a>

## Independent risk R-20260409-PROVIDER-REF-EXACT-MATCH-ADAPTER-CONFORMANCE

```risk-record-v1
---
id: R-20260409-PROVIDER-REF-EXACT-MATCH-ADAPTER-CONFORMANCE
title: Future adapters may violate the validated providerRef reconciliation contract
status: Open
date: 2026-04-09
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
severity: Medium
probability: Low
summary: >
  The engine now reconciles `estimateRunRef()` drift through a typed `saveProviderRef(...)` seam.
  Any future adapter that changes provider discriminator or returns malformed late-bound identifiers
  can still fail the start-run flow at runtime.
context: >
  This branch hardens the start-run protocol by keeping provider reconciliation typed and validated
  against the persisted provider discriminator while persisting a canonical discriminated
  `providerRef` inside `RunMetadata`. The remaining residual risk is conformance by future adapters,
  not ambiguity in the engine contract.
risk: >
  A newly added or modified adapter could implement `estimateRunRef()` incorrectly, causing startRun
  requests to dispatch a provider run and then fail provider-ref reconciliation. The engine now
  compensates with a best-effort cancel on invalid cross-provider drift or rejected updates, but
  operational confusion and adapter churn would still occur until the adapter is corrected.
mitigations:
  - 'The provider adapter contract now states that `startRun()` must keep the same provider
    discriminator when `estimateRunRef()` is implemented.'
  - 'StartRunExecutionService reconciles same-provider late-bound fields through
    `saveProviderRef(...)` and fails closed on rejected updates.'
  - 'Engine, API, state-store, and Postgres adapter tests now exercise the nested `providerRef`
    contract end to end.'
review_after: 2026-06-01
---
```

<a id="risk-r-20260409-provider-status-semantic-drift"></a>

## Independent risk R-20260409-PROVIDER-STATUS-SEMANTIC-DRIFT

```risk-record-v1
---
id: R-20260409-PROVIDER-STATUS-SEMANTIC-DRIFT
title: Consumers may expect DVT lifecycle statuses (PAUSED, CANCELLING) in ProviderRunStatusView
status: Open
date: 2026-04-09
owners:
  - packages/@dvt/adapter-temporal
severity: Low
probability: Low
context: >
  TemporalAdapter.getProviderStatusView() previously returned DVT-owned lifecycle statuses (PAUSED,
  CANCELLING) via the workflow query model. After the fix, it returns Temporal-native execution
  statuses from handle.describe(). Any consumer that matched on providerStatus === 'PAUSED' or
  providerSubstatus === 'CANCELLING' will no longer see those values.
risk: >
  If API consumers or UI code conditionally branch on DVT lifecycle statuses within
  ProviderRunStatusView, they will stop matching after this change and may lose visibility into
  paused or cancelling state. The canonical status (CanonicalRunStatus) is the correct source for
  those lifecycle concepts.
mitigations:
  - 'CanonicalRunStatus (event-sourced projection) still reports PAUSED and substatus correctly.'
  - 'RunStatusEnrichment returns both canonical and providerView, so callers can use the canonical
    plane for DVT lifecycle state.'
  - 'Integration tests updated to expect Temporal-native statuses only.'
  - 'Unknown future Temporal describe() status tokens now pass through as provider diagnostics
    instead of failing enriched reads closed.'
review_after: 2026-04-16
---
```

<a id="risk-r-20260409-tf-c2-b-run-read-evidence-attempt-safety"></a>

## Independent risk R-20260409-TF-C2-B-RUN-READ-EVIDENCE-ATTEMPT-SAFETY

```risk-record-v1
---
id: R-20260409-TF-C2-B-RUN-READ-EVIDENCE-ATTEMPT-SAFETY
title: Run read evidence derivation can regress if attempt authority and event-history scope diverge
status: Open
date: 2026-04-09
owners:
  - apps/api
  - packages/@dvt/adapter-temporal
severity: Medium
probability: Medium
---
```

<a id="risk-r-20260410-temporal-capability-lane-scope-overtrigger"></a>

## Independent risk R-20260410-TEMPORAL-CAPABILITY-LANE-SCOPE-OVERTRIGGER

```risk-record-v1
---
id: R-20260410-TEMPORAL-CAPABILITY-LANE-SCOPE-OVERTRIGGER
title: Temporal capability-specific CI lanes can over-trigger on broad engine or contract diffs
status: Open
date: 2026-04-10
owners:
  - packages/@dvt/adapter-temporal
  - packages/@dvt/engine
severity: Low
probability: Medium
context: >
  The PR quality gate now separates Temporal baseline, transformation, and Postgres capability
  integrations. Scope routing remains intentionally broad for engine, contracts, workflow, and
  helper changes so capability-specific regressions do not slip through.
risk: >
  Some pull requests that touch broad runtime surfaces can trigger transformation and Postgres
  capability lanes even when the logical change is unrelated, increasing CI cost and wall-clock
  time.
mitigations:
  - The baseline, transformation, and Postgres semantics are now isolated into separate suites and
    commands.
  - Scope logic is centralized in tools/ci/scope-config.mjs with parity tests.
  - Over-triggering is accepted for now in favor of correctness until more precise change
    classification is justified.
review_after: 2026-06-15
---
```

<a id="risk-r-20260410-temporal-runtime-closure-pnpm-json-coupling"></a>

## Independent risk R-20260410-TEMPORAL-RUNTIME-CLOSURE-PNPM-JSON-COUPLING

```risk-record-v1
---
id: R-20260410-TEMPORAL-RUNTIME-CLOSURE-PNPM-JSON-COUPLING
title: Temporal runtime closure helper depends on PNPM JSON output shape
status: Open
date: 2026-04-10
owners:
  - packages/@dvt/adapter-temporal
severity: Low
probability: Low
context: >
  The helper scripts/build-workspace-runtime-deps.cjs now delegates runtime dependency selection to
  `pnpm list --filter-prod ... --json --depth -1` instead of walking workspace manifests by hand.
risk: >
  If PNPM changes the structure or semantics of its JSON output, the helper can stop discovering the
  intended runtime closure and CI preparation for Temporal capability lanes may fail or under-build.
mitigations:
  - The helper fails fast when the requested workspace package is not present in the PNPM response.
  - Validation runs exercise the helper through the baseline, transformation, and Postgres
    integration lanes.
  - The helper itself is syntax-checked and the downstream CI scope tests are part of the validation
    baseline.
review_after: 2026-06-15
---
```

<a id="risk-r-20260413-tf-c2-local-postgres-proof-compatibility"></a>

## Independent risk R-20260413-TF-C2-LOCAL-POSTGRES-PROOF-COMPATIBILITY

```risk-record-v1
---
id: R-20260413-TF-C2-LOCAL-POSTGRES-PROOF-COMPATIBILITY
title: TF-C2 local Postgres proof can drift from workspace and Docker CLI compatibility assumptions
status: Open
date: 2026-04-13
owners:
  - packages/@dvt/adapter-temporal
  - packages/@dvt/adapter-postgres
severity: Low
probability: Medium
context: >
  The canonical local Postgres proof for TF-C2 depends on two environment-facing seams: the Temporal
  integration lane must resolve the built adapter-postgres package, and the proof wrapper must
  launch the Docker Compose stack on developer machines that can expose either `docker compose` or
  `docker-compose`.
risk: >
  If the Temporal Postgres proof wrapper assumes a preexisting workspace symlink or only one Compose
  CLI variant, local acceptance can fail before exercising the actual runtime semantics, creating
  false negatives and slowing closure of runtime slices.
mitigations:
  - The Vitest config now resolves `@dvt/adapter-postgres` to the built dist entry produced by
    `prepare:integration:postgres`.
  - The wrapper now prefers `docker compose` and falls back to `docker-compose`.
  - The runbook and evidence record now document the local proof-path compatibility assumptions
    explicitly.
review_after: 2026-06-01
---
```

<a id="risk-r-20260414-tf-c3-dbt-plugin-runtime-projection"></a>

## Independent risk R-20260414-TF-C3-DBT-PLUGIN-RUNTIME-PROJECTION

```risk-record-v1
---
id: R-20260414-TF-C3-DBT-PLUGIN-RUNTIME-PROJECTION
title: TF-C3 rollout can drift from the validated in-repo Temporal worker host
status: Open
date: 2026-04-14
owners:
  - packages/@dvt/adapter-temporal
severity: Medium
probability: Medium
context: >
  `TF-C3` now includes the in-repo worker topology that phase 2 needed: shared artifact-backed
  runtime readers, a standalone `apps/temporal-worker` composition root, and an adapter-owned
  `DbtCliPluginRunner`. Unit, package, and worker-level tests now prove the host composition and the
  DBT runtime handoff. The remaining risk is no longer missing topology; it is rollout drift between
  this validated in-repo host and environment wiring outside the repo, plus two explicit residual
  governance gaps around artifact-store binding.
risk: >
  If deployment or canary rollout wires the worker, DBT binary, or artifact locators differently
  from the validated in-repo composition, persisted DBT runs can fail closed or exhibit environment-
  specific drift even though the repo-level host topology is now correct. In addition, `recoverRun`
  currently re-evaluates DBT bundle store binding against live API configuration rather than a store
  identity persisted with the accepted run, so changing sanctioned artifact-store config can
  invalidate recovery of already-accepted runs without artifact drift. The protected API also does
  not yet fail fast on DBT bundle-store misconfiguration at bootstrap; the first DBT-bearing
  admission discovers that defect on request rather than during startup.
mitigations:
  - '`DbtStepActivity` now fails closed for missing `runExecutionContextRef`, missing runtime
    wiring, missing `pluginContexts.dbt`, or mismatched plugin runner results.'
  - 'The repo now contains a canonical `apps/temporal-worker` composition root instead of relying on
    test-only host wiring.'
  - 'Adapter-temporal unit and worker-composition tests now prove the reader-to-plugin-runner
    handoff explicitly.'
  - 'The DBT runtime no longer dereferences a mutable string-only bundle URI: `projectBundleRef` is
    now a typed immutable bundle ref with `kind=dbt-project-bundle`, required `sha256`, required
    `tenantId`, and a canonical tenant-scoped locator, and the worker verifies both tenant alignment
    and bytes before execution.'
  - 'Start-run admission now rejects DBT-bearing plans before queueing when `runExecutionContextRef`
    is missing, `pluginContexts.dbt` is absent, or the resolved DBT bundle tenant or canonical
    locator does not match the run tenant.'
  - 'The DBT integration fixtures now bind `runExecutionContextRef.sha256` to canonical context
    bytes and reject unregistered refs, so same-worker multi-run tests cannot silently reuse one
    fake context.'
  - 'The same fixture seam now registers plan bytes per `PlanRef`, rejects stale
    `runExecutionContextRef` to plan bindings up front, and preserves engine rejection reasons when
    DBT step execution fails closed.'
  - 'Artifact runtime reads no longer instantiate a fresh S3 client per fetch; the runtime now uses
    a long-lived client path so bundle/context reads do not pay read-scoped SDK churn.'
  - 'Fixture lookup no longer depends on optional `PlanRef.sizeBytes`, and synthetic DBT runtime
    refs now hash RFC-8785/JCS canonical bytes so harmless property-order churn cannot masquerade as
    execution-context drift.'
  - 'The DBT multi-run fixture path now requires per-binding `planBytes` and uses the public
    `@dvt/crypto` package boundary, so tests no longer rely on sibling source imports or a silent
    worker-global blob fallback when multiple plans share one worker.'
  - 'The worker now ships `/healthz`, `/readyz`, `/metrics`, and a canonical runbook so operability
    is part of the repo truth instead of a follow-up guess.'
  - 'Lane C keeps the remaining rollout-acceptance work visible under `TF-C3-E` instead of treating
    code topology alone as full closure.'
  - 'This risk entry now explicitly records the remaining recovery/store-identity drift and API
    bootstrap fail-fast gap as accepted debt for the current development slice instead of implying
    that only out-of-repo rollout work remains.'
review_after: 2026-06-15
---
```

<a id="risk-r-20260415-ar-c4-runtime-circuit-breaker-roll-out"></a>

## Independent risk R-20260415-AR-C4-RUNTIME-CIRCUIT-BREAKER-ROLL-OUT

```risk-record-v1
---
id: R-20260415-AR-C4-RUNTIME-CIRCUIT-BREAKER-ROLL-OUT
title: Runtime circuit-breaker and worker operation tuning can drift after merge
status: Open
date: 2026-04-15
owners:
  - packages/@dvt/adapter-temporal
  - apps/temporal-worker
severity: Medium
probability: Medium
context: >
  AR-C4 introduced a run-state command circuit breaker in `@dvt/adapter-temporal`, updated Temporal
  worker operational wiring, and strengthened local integration execution defaults for
  Postgres-backed runs.
risk: >
  If environment-specific thresholds, health-gate assumptions, or Temporal operation settings
  diverge from validated repository defaults, runtime behavior can shift under sustained failure
  pressure and lead to premature trip/open states or delayed recovery visibility.
mitigations:
  - 'Circuit-breaker behavior is covered by dedicated adapter tests and integrated in adapter
    exports.'
  - 'Temporal worker runtime startup and monitoring paths are covered by temporal-worker unit tests.'
  - 'Integration-local commands now include deterministic Postgres URL fallbacks for reproducible
    local verification.'
  - 'Cancellation integration assertions now validate unique per-run bundle references instead of
    raw runner invocation counts.'
  - 'Pre-push governance checks and ARC validation were executed for this slice.'
review_after: 2026-06-15
---
```

<a id="risk-r-20260420-temporal-dbt-builtin-coupling"></a>

## Independent risk R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING

```risk-record-v1
---
id: R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING
title: Temporal DBT plugin package extraction remains sandbox follow-up risk
status: Mitigated
date: 2026-04-20
owners:
  - packages/@dvt/adapter-temporal
  - apps/temporal-worker
severity: Medium
probability: Medium
context: >
  Repository review on 2026-04-20 confirmed that DBT is not only a test concern. Earlier
  implementation treated DBT as a built-in runtime path: @dvt/adapter-temporal carried DBT in the
  default activity registry and generic ActivityDeps surface, and engine admission had DBT-oriented
  binding semantics. The 2026-04-28 DBT-core decoupling pass removed that default-core coupling:
  ActivityDeps no longer includes dbtPluginRunner or runExecutionContextReader,
  createDefaultStepActivityRegistry() starts empty, apps/temporal-worker composes
  createDbtStepActivityRegistry() only when DVT_TEMPORAL_DBT_ENABLED=true, and engine admission now
  receives generic pluginRequirements rather than DBT-specific policy. The follow-up plugin
  isolation pass added a generic TemporalStepPluginProfile composer, a DBT plugin manifest for the
  Temporal-supported DBT subset, an SQL-shaped plugin composition proof, and an architecture test
  that keeps packages/@dvt/engine source free of DBT vocabulary. The 2026-04-29 Fowler hardening
  pass also removed DBT-oriented compiled SQL artifact interpretation from workflow emission and
  active lineage/UI fixtures: StepStarted artifact references now use the generic compiled-sql
  discriminator. The 2026-04-29 DBT CLI runner SRP pass added a generic TemporalStepPluginRunner
  execution port and split DbtCliPluginRunner into focused DBT-local helper modules for argument
  derivation, process execution, project materialization, failure mapping, and helper contracts. The
  2026-05-14 package extraction pass moved the concrete DBT manifest, step activity registry, CLI
  runner, and helper modules into @dvt/temporal-dbt-plugin and removed DBT concrete exports from the
  @dvt/adapter-temporal root API.
risk: >
  Package-level DBT ownership no longer lives in @dvt/adapter-temporal. The remaining risk is that
  the concrete DBT plugin still executes a local CLI in the worker process. Future executor plugins
  need sandbox and dependency-isolation posture before mature multi-tenant runtime hardening is
  claimed.
mitigations:
  - 'Keep apps/temporal-worker as the only live composition root that wires DBT runtime
    dependencies.'
  - 'Keep createDefaultStepActivityRegistry() plugin-free and fail CI if DBT symbols re-enter core
    activity modules.'
  - 'Prefer explicit composition-time registries and step-kind wiring for every executor profile.'
  - 'Keep engine admission tests on generic/example plugins so DBT cannot re-enter engine semantics
    through test fixtures.'
  - 'Require each executor profile to own its manifest and supported runtime subset; do not name a
    profile subset as the full external tool capability set.'
  - 'Keep DbtCliPluginRunner as orchestration only; DBT CLI subprocess, bundle materialization,
    argument mapping, failure mapping, and helper contracts must remain split under
    packages/@dvt/temporal-dbt-plugin/src.'
  - 'Keep @dvt/adapter-temporal free of concrete DBT exports through the package extraction
    architecture guard.'
  - 'Keep adapter-temporal tests split between Temporal-core behavior and DBT plugin or runtime
    behavior so boundary drift remains visible.'
review_after: 2026-06-15
---
```

<a id="risk-r-20260421-temporal-activity-deps-wiring-drift"></a>

## Independent risk R-20260421-TEMPORAL-ACTIVITY-DEPS-WIRING-DRIFT

```risk-record-v1
---
id: R-20260421-TEMPORAL-ACTIVITY-DEPS-WIRING-DRIFT
title: Temporal activity dependency wiring can drift from the segment-resolution runtime contract
status: Open
date: 2026-04-21
owners:
  - packages/@dvt/adapter-temporal
severity: Low
probability: Medium
context: >
  Before this slice, `ActivityDeps` marked `fetcher` and `integrity` as optional even though
  `resolveExecutionSegment()` always required both seams. The production Temporal worker usually
  wired them correctly, but the public activity-construction contract still allowed incomplete
  wiring and deferred failure until a later runtime path exercised segment resolution.
risk: >
  If future harnesses or composition roots bypass the canonical helpers or weaken the activity
  dependency shape again, Temporal runtime construction could accept invalid wiring and fail only
  after execution begins, making regressions harder to detect and localize.
mitigations:
  - Keep `ActivityDeps.fetcher` and `ActivityDeps.integrity` required in the public activity
    contract.
  - Keep eager validation in `createActivities()` so missing segment-resolution seams fail at
    construction time.
  - Keep typecheck coverage that rejects incomplete `ActivityDeps` objects.
  - Keep worker lifecycle and activity tests aligned with the active engine idempotency contract.
---
```

<a id="risk-r-20260421-utility-module-componentization-drift"></a>

## Independent risk R-20260421-UTILITY-MODULE-COMPONENTIZATION-DRIFT

```risk-record-v1
---
id: R-20260421-UTILITY-MODULE-COMPONENTIZATION-DRIFT
title: Flat utility modules can drift without explicit component APIs and semantic ownership
status: Open
date: 2026-04-21
owners:
  - apps/api
  - packages/@dvt/adapter-temporal
  - packages/@dvt/engine
severity: Medium
probability: Medium
context: >
  The 2026-04-21 Fowler follow-up review improved semantic encapsulation in one `apps/api`
  component, but several high-traffic modules across `apps/api`, `@dvt/adapter-temporal`, and
  `@dvt/engine` still expose clusters of loosely related exported functions without one explicit
  public API, invariants, or named owned concern. The immediate candidates are
  `apps/api/src/entrypoints/http/httpErrorMapper.ts`,
  `apps/api/src/entrypoints/http/routeParserPrimitives.ts`,
  `apps/api/src/entrypoints/http/runCommandFieldParsers.ts`,
  `apps/api/src/entrypoints/http/routeParseIssue.ts`,
  `packages/@dvt/adapter-temporal/src/temporalObservability.ts`,
  `packages/@dvt/engine/src/application/providerSelection.ts`, and
  `packages/@dvt/adapter-temporal/src/temporalErrorPolicy.ts`.
risk: >
  If these modules continue growing as flat helper surfaces, DVT can accumulate hidden public APIs,
  mixed concerns, and semantic drift between parsing, mapping, policy, and lifecycle ownership. That
  increases the chance of duplication, weakens test focus, makes module intent harder to read, and
  encourages ad hoc reuse through convenience exports instead of bounded component contracts.
mitigations:
  - >
    Collapse `apps/api/src/entrypoints/http/httpErrorMapper.ts` behind one explicit mapper surface,
    for example `map(error): HttpResponseModel`, instead of multiple sibling exports.
  - >
    Group route parameter parsing in `routeParserPrimitives.ts` under one owned decoder module and
    group body-field parsing in `runCommandFieldParsers.ts` under one command-field parser surface.
  - >
    Replace the free-form route parse issue helpers in `routeParseIssue.ts` with one explicit result
    or factory contract that owns bad-request and forbidden outcomes.
  - >
    Separate `packages/@dvt/adapter-temporal/src/temporalObservability.ts` into observability
    construction versus timeout or error handling concerns.
  - >
    Replace `packages/@dvt/engine/src/application/providerSelection.ts` with one explicit provider
    registry or selection component so adapter-map lifecycle and selection policy are owned in one
    place.
  - >
    Keep `packages/@dvt/adapter-temporal/src/temporalErrorPolicy.ts` small or promote it to one
    explicit classifier component before SDK-version handling or policy branching grows.
  - >
    For every promoted component, add a local component guide that states public API, invariants,
    transitions, and consumers, plus at least one semantic architecture test that validates owned
    concern rather than barrel thinness.
review_after: 2026-06-15
---
## Candidate Modules Ordered By Architectural Impact

1. `apps/api/src/entrypoints/http/httpErrorMapper.ts` Error-to-response mapping remains spread
across sibling exports instead of one obvious public mapper contract. 2.
`apps/api/src/entrypoints/http/routeParserPrimitives.ts` Query/path parameter parsing is cohesive
but still published as flat helpers. 3. `apps/api/src/entrypoints/http/runCommandFieldParsers.ts`
Request-body field parsing follows the same flat-helper pattern as route parsing. 4.
`apps/api/src/entrypoints/http/routeParseIssue.ts` Route-parse error construction still exposes
multiple builder helpers rather than one result contract. 5.
`packages/@dvt/adapter-temporal/src/temporalObservability.ts` Observability assembly and timeout or
error policy still share one helper module. 6.
`packages/@dvt/engine/src/application/providerSelection.ts` Adapter selection logic still relies on
function-level coordination instead of one explicit registry-like boundary. 7.
`packages/@dvt/adapter-temporal/src/temporalErrorPolicy.ts` Small today, but likely to grow into a
more meaningful classifier boundary.
```

<a id="risk-r-20260423-adr0-traceability-gate-drift"></a>

## Independent risk R-20260423-ADR0-TRACEABILITY-GATE-DRIFT

```risk-record-v1
---
id: R-20260423-ADR0-TRACEABILITY-GATE-DRIFT
title: ADR-0000 traceability gate can drift from workspace build closure
status: Open
date: 2026-04-23
owners:
  - packages/@dvt/traceability-service
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
  - packages/@dvt/adapter-postgres
severity: Medium
probability: Low
context: >
  The default branch `CI - Code Quality` workflow failed in the ADR-0000 traceability gate after
  `@dvt/traceability-service` began depending on additional internal workspaces while its `prebuild`
  hook still compiled only `@dvt/contracts`. Once that build closure was corrected, the validator
  exposed missing traceability headers in governed engine, contract, adapter, and lineage files that
  were outside the regression baseline.
risk: >
  If future traceability-service imports or governed file additions are not paired with dependency
  closure validation and ADR-0000 header updates, the default branch can regress to a red quality
  badge even when the underlying runtime logic is otherwise unchanged.
mitigations:
  - >
    Keep `tools/ci/workspace-typecheck-contract.test.mjs` asserting that the traceability ADR gate
    prebuilds the full `@dvt/traceability-service` dependency closure.
  - >
    Treat `pnpm traceability:adr0` as the canonical local proof for changes under governed
    contracts, engine, adapters, and traceability-service paths.
  - >
    Commit refreshed `traceability.manifest.json` output whenever new non-baseline traceability
    headers are added.
observed_trigger:
  - '`pnpm traceability:adr0` failed on a clean runner before dependency closure correction.'
  - 'The validator reported non-baseline ADR-0000 header issues after the build phase succeeded.'
review_after: 2026-06-30
---
```

<a id="risk-r-20260423-rc-c2-turbo-ci-governance"></a>

## Independent risk R-20260423-RC-C2-TURBO-CI-GOVERNANCE

```risk-record-v1
---
id: R-20260423-RC-C2-TURBO-CI-GOVERNANCE
title: Turbo affected-task routing could diverge from required repository gates
status: Open
date: 2026-04-23
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/planner'
  - '@dvt/adapter-temporal'
  - ci
severity: Medium
probability: Low
---
context: >
  RC-C2 routes affected build, type-check, and test commands through governed Turbo tasks and
  changes package-level script contracts for workspaces that include contract, engine, planner, and
  adapter paths.
risk: >
  If Turbo task inputs, package script contracts, or pre-push scope classification drift apart, an
  affected route could run a narrower check than the repository governance model expects and create
  false confidence in CI or local pre-push results.
mitigations:
  - >-
    Keep `turbo.json` global dependencies aligned with root graph inputs that should invalidate all
    affected task hashes.
  - >-
    Route affected build, type-check, and test commands through
    `scripts/run-turbo-workspace-task.cjs` rather than ad hoc recursive package commands.
  - >-
    Keep `tools/ci/turbo-workspace-task-contract.test.mjs` and
    `tools/ci/prepush-typecheck-scope.test.mjs` in the merge-gated `pnpm test:ci-tools` lane.
  - >-
    Keep `pnpm verify:prepush` fail-closed to full root `pnpm type-check` when global graph inputs
    change.
  - >-
    Preserve ARC evidence and risk updates for contract, engine, planner, and adapter path touches
    even when the file change is limited to validation scripts or package metadata.
```

<a id="risk-r-20260424-temporal-plan-ref-contract"></a>

## Independent risk R-20260424-TEMPORAL-PLAN-REF-CONTRACT

```risk-record-v1
---
id: R-20260424-TEMPORAL-PLAN-REF-CONTRACT
title: Provider runtimes can regress to unchecked PlanRef execution
status: Open
date: 2026-04-24
owners:
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
severity: High
probability: Medium
context: >
  The 2026-04-24 slice hard-cuts IProviderAdapter.startRun() to PlanRef plus resolved run context.
  The engine still performs authoritative pre-dispatch verification, while Temporal resolves
  execution segments by fetching plan material through PlanRef inside activities.
risk: >
  A future adapter or activity could fetch plan bytes by PlanRef without revalidating PlanRef.sha256
  before execution. That would reintroduce the original contract drift and make runtime execution
  depend on mutable or corrupted plan material.
mitigations:
  - >
    Keep provider adapter start signatures pointer-backed and covered by
    packages/@dvt/contracts/test/provider-adapter.architecture.test.ts.
  - >
    Keep Temporal segment resolution wired through PlanIntegrityValidator.fetchAndValidate() or an
    equivalent verifier before returning executable segments.
  - >
    Require every new provider adapter to include a negative test where fetched plan bytes differ
    from PlanRef.sha256 and execution fails before step dispatch.
  - >
    Run ARC-2 evidence checks whenever contracts, engine, or adapter runtime paths change.
review_after: 2026-06-30
---
```

<a id="risk-r-20260429-engine-static-analysis-cleanup"></a>

## Independent risk R-20260429-ENGINE-STATIC-ANALYSIS-CLEANUP

```risk-record-v1
---
id: R-20260429-ENGINE-STATIC-ANALYSIS-CLEANUP
title: Engine and Temporal static-analysis cleanup can drift from admission and activity semantics
status: Open
date: 2026-04-29
owners:
  - dvt/engine
  - dvt/adapter-temporal
severity: Low
probability: Low
context: >
  This branch continues the static-analysis cleanup by moving recovery-service delegation and
  run-execution-context admission to typed request objects, splitting default engine error-message
  rendering into small named renderer functions, and replacing Temporal activity test setup tuples
  with named setup options.
risk: >
  Behavior-preserving refactors around admission, recovery delegation, error text, and activity test
  harness setup can still drift from runtime semantics if call sites or contract tests are not kept
  in the same slice.
mitigations:
  - Keep WorkflowEngine recovery delegation covered by the existing WorkflowEngine tests.
  - Keep default engine error text covered by errorI18n.contract.test.ts.
  - Keep run-execution-context admission covered by the split admission policy suite.
  - Keep Temporal activity behavior covered by activities.test.ts.
  - Require ARC-2 evidence for any follow-up change under packages/@dvt/engine or
    packages/@dvt/adapter-temporal.
review_after: 2026-05-15
---
```

<a id="risk-r-20260429-plugin-admission-architecture"></a>

## Independent risk R-20260429-PLUGIN-ADMISSION-ARCHITECTURE

```risk-record-v1
---
id: R-20260429-PLUGIN-ADMISSION-ARCHITECTURE
title: Plugin admission architecture can drift back into executor-specific coupling
status: Open
date: 2026-04-29
owners:
  - dvt/engine
  - dvt/adapter-temporal
severity: Low
probability: Low
context: >
  The branch hardens run-execution-context admission and DBT plugin isolation. The intended
  architecture is that engine admission remains generic while DBT and future executors such as SQL
  own plugin-specific requirements.
risk: >
  Future plugin work could reintroduce DBT-specific wording or behavior into engine admission if
  semantic architecture tests and local component documentation are not kept current.
mitigations:
  - Keep RunExecutionContextAdmissionPolicy.srp.architecture.test.ts as the semantic fitness
    function for admission ownership.
  - Keep StartRunProtocol.v1.md generic for plugin-bearing plans.
  - Require ARC-2 evidence for follow-up changes under engine or adapter-temporal plugin boundaries.
review_after: 2026-05-15
---
```

<a id="risk-r-20260430-ar-d-continuation-safety"></a>

## Independent risk R-20260430-AR-D-CONTINUATION-SAFETY

```risk-record-v1
---
id: R-20260430-AR-D-CONTINUATION-SAFETY
title: AR-D continuation safety residual capacity tuning
status: Open
date: 2026-04-30
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - packages/@dvt/adapter-temporal
severity: Medium
probability: Medium
context: >
  The continuation safety slice now gives expired PlanRef pointers, missing plan artifacts, and
  cursor payload overflow explicit RunFailed reasons. It also bounds processed control-signal id
  retention in continue-as-new cursor state, isolates workflow failure classification in a policy
  module, and adds component-level stories plus mailbox traceability.
risk: >
  AR-D2 now has an executable standard production capacity SLA. Residual risk remains around
  empirical production tuning for tenant-specific profiles and larger Temporal namespaces.
mitigations:
  - Keep AR-D2 evidence linked to the capacity SLA policy and semantic architecture test.
  - Keep PlanRef retention duration greater than the expected maximum workflow duration per profile.
  - Retain the continuation safety negative tests in contracts, engine, and adapter-temporal.
  - Retain the semantic architecture test that guards component docs, user stories, mailbox, and
    owned-concern module declarations.
review_after: 2026-05-15
---
```

<a id="risk-r-20260430-ar-d2-temporal-capacity-sla"></a>

## Independent risk R-20260430-AR-D2-TEMPORAL-CAPACITY-SLA

```risk-record-v1
---
id: R-20260430-AR-D2-TEMPORAL-CAPACITY-SLA
title: Temporal capacity SLA still needs empirical production tuning
status: Open
date: 2026-04-30
owners:
  - packages/@dvt/adapter-temporal
severity: Low
probability: Medium
context: >
  AR-D2 now has an executable standard production profile for PlanRef workflow capacity. The policy
  checks non-zero continue-as-new rollover, payload budget ordering, layer count per segment,
  expected segment count, workflow-history event and byte estimates, and PlanRef retention margin.
risk: >
  The standard thresholds are governed and testable, but they still require production telemetry and
  tenant-profile tuning after larger DAGs run through real Temporal namespaces.
mitigations:
  - Keep the standard profile explicit in temporalPlanRefCapacitySlaPolicy.ts.
  - Treat zero rollover as diagnostic or incident-only, not production-ready.
  - Add empirical thresholds from Temporal namespace telemetry before introducing enterprise tenant
    profile variants.
  - Keep AR-D2 evidence linked to package tests, architecture tests, and pre-push validation.
review_after: 2026-05-15
---
```

<a id="risk-r-20260430-temporal-sdk-1-16-1-patch"></a>

## Independent risk R-20260430-TEMPORAL-SDK-1-16-1-PATCH

```risk-record-v1
---
id: R-20260430-TEMPORAL-SDK-1-16-1-PATCH
title: Temporal SDK patch upgrades can drift from provider integration behavior
status: Open
date: 2026-04-30
owners:
  - packages/@dvt/adapter-temporal
  - apps/temporal-worker
severity: Low
probability: Low
context: >
  PR #1038 upgrades the Temporal TypeScript SDK packages used by the adapter and Temporal worker
  from 1.16.0 to 1.16.1. Although this is a patch-level dependency update, the adapter boundary is
  governed by ARC-2 because provider SDK behavior can affect workflow execution, worker startup, and
  integration-test harness semantics.
risk: >
  Temporal SDK patch behavior could change provider-side edge cases that are not covered by local
  unit tests or dependency-only review.
mitigations:
  - Keep adapter-temporal type-check and unit-test validation in the PR evidence.
  - Keep GitHub Temporal integration lanes as the merge gate for provider-level regressions.
  - Reopen this risk if Temporal worker startup, activity execution, or workflow lifecycle tests
    regress after merge.
review_after: 2026-05-15
---
```

<a id="risk-r-20260505-adr0-traceability-gate"></a>

## Independent risk R-20260505-ADR0-TRACEABILITY-GATE

```risk-record-v1
---
id: R-20260505-ADR0-TRACEABILITY-GATE
title: ADR-0000 traceability gate scope can drift from repository governance scope
status: Open
date: 2026-05-05
owners:
  - '@dvt/contracts'
  - '@dvt/engine'
  - '@dvt/adapter-temporal'
  - ci
severity: Medium
probability: Medium
---
summary: >
  The ADR-0000 traceability gate validates the current configured package scope, while some accepted
  ADRs are implemented in apps, scripts, or docs-governance surfaces outside that scope. If the ADR
  catalog expands without a matching governed-path expansion or explicit baseline entry, CI can
  report reverse coverage failures that are scope mismatches rather than missing runtime work.

mitigations:
  - Keep `traceability.config.json` and `traceability.issue-baseline.json` reviewed together
    whenever ADR catalog matching changes.
  - Prefer adding governed headers to package files for real package-scope regressions instead of
    expanding the baseline.
  - Treat reverse-coverage baseline additions as explicit scope records, not as permission to skip
    ADR implementation.

validation:
  - pnpm traceability:adr0
  - pnpm test:ci-tools
  - pnpm verify:prepush
```

<a id="risk-r-20260509-tenant-aware-outbox-sharding"></a>

## Independent risk R-20260509-TENANT-AWARE-OUTBOX-SHARDING

```risk-record-v1
---
id: R-20260509-TENANT-AWARE-OUTBOX-SHARDING
title: Tenant-aware outbox sharding can create short mixed-policy windows during rollout
status: Open
date: 2026-05-09
owners:
  - packages/@dvt/delivery
  - packages/@dvt/engine
  - packages/@dvt/adapter-postgres
  - apps/outbox-worker
severity: Medium
probability: Low
mitigations:
  - Keep Engine outbox sharding as named facade functions with an owned-concern docblock.
  - Delegate Engine facade behavior to Delivery without importing node:crypto.
  - Guard against raw Delivery barrel exports and local hash reimplementation in architecture tests.
---
```

<a id="risk-r-20260513-mw-d2-temporal-worker-routing"></a>

## Independent risk R-20260513-MW-D2-TEMPORAL-WORKER-ROUTING

```risk-record-v1
---
id: R-20260513-MW-D2-TEMPORAL-WORKER-ROUTING
title: Capability-routed Temporal workers require operational queue alignment
status: Open
date: 2026-05-13
owners:
  - packages/@dvt/adapter-temporal
  - apps/api
  - apps/temporal-worker
severity: Medium
probability: Medium
context: >
  MW-D2 introduces provider-neutral step activity routing by step kind. Workflow starts remain
  tenant queue scoped, while executeStep activities can be sent to capability-specific Temporal
  activity task queues. The routing model is configuration-driven and DBT remains only one plugin
  consumer.
risk: >
  Operators can configure a route to a task queue with no live pollers or a worker image that has
  not composed the required plugin activity. In that case the workflow can accumulate activity queue
  delay or fail closed with unsupported step-kind errors.
mitigations:
  - Keep route configuration validated and frozen into workflow input.
  - Keep runbooks explicit about matching activity route queues to worker deployments.
  - Monitor Temporal schedule-to-start latency and poller count per routed activity queue.
  - Keep StepActivityDispatcher fail-closed when a worker lacks the matching plugin registry.
review_after: 2026-05-27
---
```

<a id="risk-r-20260514-ar-a7-in-memory-outbox-ownership"></a>

## Independent risk R-20260514-AR-A7-IN-MEMORY-OUTBOX-OWNERSHIP

```risk-record-v1
---
id: R-20260514-AR-A7-IN-MEMORY-OUTBOX-OWNERSHIP
title: Delivery-owned in-memory outbox core can mask durable adapter parity gaps
status: Open
date: 2026-05-14
owners:
  - packages/@dvt/delivery
  - packages/@dvt/engine
severity: Low
probability: Low
mitigations:
  - Keep Engine as a facade over the Delivery-owned in-memory core.
  - Guard ownership with OutboxInMemoryStorageOwnership.architecture.test.ts.
  - Keep durable adapter behavior covered by adapter-specific tests when PostgreSQL semantics
    change.
---
```
