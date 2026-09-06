---
title: dbt-query-profiler Integration Study
status: Review
owner: Architecture / Product
date: 2026-08-23
last_reviewed: 2026-09-06
planning_type: study
---

> Historical evidence: this study describes DVT baseline
> `ffee4ee479b683e3346d5a96749229f798d4ca41` and the pinned upstream
> revisions below. “Current” and “AS-IS” refer to that snapshot, not today's
> implementation. Integration preserves research evidence only: it adds no
> dependency, runtime integration, implementation commitment, or priority.
> Current disposition and acceptance remain in issue #2621.

# dbt-query-profiler integration study — DVT / OBS1

Date: 2026-08-23

DVT baseline: `main@ffee4ee479b683e3346d5a96749229f798d4ca41`

Upstream examined: `dbt-labs/dbt-query-profiler@bdb92046ae5949fd36b51c1c95e01e455fcb5d14`.

Tracking: #2621. Coordinates with #2473, #2474, #2486, #2567, #2622 and provider-gated follow-up #2624.

## Decision

**ADOPT-BOUNDED as prior art/provider mapping; do not add the package as a mandatory DVT runtime dependency.**

The project contains high-value knowledge that DVT should not independently rediscover:

- warehouse-native query-history sources;
- normalized query execution statistics;
- actual/estimated execution-plan retrieval patterns;
- provider-specific permission, retention and lag constraints;
- adapter-dispatch tests across Snowflake, BigQuery, Databricks, Redshift and DuckDB.

However, the package's default `model_name -> query_id` correlation is deliberately approximate and is weaker than the identity DVT can own for its own runs. DVT should therefore reuse the provider knowledge while keeping exact run/step/attempt correlation and evidence persistence in existing OBS1 authorities.

## Upstream posture

- repository: `dbt-labs/dbt-query-profiler`;
- license: Apache-2.0;
- created: 2026-01-29;
- latest upstream SHA examined: `bdb92046ae5949fd36b51c1c95e01e455fcb5d14`, 2026-08-07;
- supported adapters: Snowflake, BigQuery, Databricks, Redshift and DuckDB;
- PostgreSQL is **not supported**;
- current CI/integration workflows are parked under `.github/workflows_wip/`, so the repository should be treated as young prior art rather than a mature runtime dependency;
- the package is implemented as dbt macros invoked via `dbt run-operation`.

This maturity posture favors copying/adapting the stable provider semantics and tests, not coupling DVT execution to the package.

## Current DVT AS-IS

### DBT runner

`DbtCliPluginRunner` already owns the real DBT execution boundary:

```text
Temporal worker
  -> DbtStepActivity
  -> DbtCliPluginRunner
  -> dbt CLI
```

The current process adapter returns bounded `stdout` and `stderr`, but `DbtCliPluginRunner` currently ignores the command result on success and returns only:

```text
stepId
status = COMPLETED
```

The project and runtime profile are temporary resources and are removed after execution.

### Execution identity

DVT already owns stronger correlation dimensions than upstream query-history heuristics:

```text
tenant/project/environment
+ runId
+ stepId
+ logicalAttemptId
```

### Existing artifact/evidence seams

DVT contracts already contain the artifact kind:

```text
dbt-run-results
```

but the current DBT runner does not publish `target/run_results.json` before deleting the temporary project.

`StepResultEvidence` currently owns only the already-delivered evidence families. This study does not introduce another evidence contract or store; OBS1 decides the smallest existing carrier/extension after the artifact path is proven.

### Current production provider posture

The current proven DVT DBT vertical is PostgreSQL-first. The upstream query-profiler does not support PostgreSQL. Therefore warehouse query-history enrichment from this package is **not on the OBS1.1 critical path**.

## Capability matrix

| Capability                 | dbt-query-profiler                                         | DVT disposition                                                         |
| -------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Query history              | normalized across five warehouses                          | **ADAPT PROVIDER KNOWLEDGE** behind future evidence provider seam       |
| Query stats                | rich provider-specific timing/bytes/cache/resource metrics | **ADAPT** with strict provenance and provider-correct names             |
| Estimated plan             | EXPLAIN/provider equivalent                                | **REFERENCE**; use only when it adds value and does not re-execute work |
| Actual execution plan      | strongest on Snowflake; provider-specific elsewhere        | **ADAPT LATER** only for a supported provider and product consumer      |
| Model -> query correlation | query comment node id + slowest recent candidate           | **REJECT AS DVT AUTHORITY**                                             |
| Raw query SQL              | retrievable from history                                   | **REJECT BY DEFAULT** for durable evidence; sensitive literals risk     |
| Account-wide history       | optional elevated mode                                     | **REJECT BY DEFAULT**; least-privilege/user-scoped first                |
| DuckDB query stats         | can re-execute via `EXPLAIN ANALYZE`                       | **REJECT AS AUTOMATIC EVIDENCE COLLECTION**                             |
| dbt package installation   | package added to project + run-operation                   | **REJECT AS MANDATORY DVT ARCHITECTURE**                                |

## Key finding — exact correlation is the architectural difference

The upstream package documents and implements this model:

```text
model/node id
  -> search recent query history using dbt query_comment
  -> choose the slowest of recent candidates
  -> query stats / plan
```

Its own source explains why this is approximate: the default dbt query comment includes `node_id` but no `invocation_id`; therefore the exact statement belonging to the current run cannot be recovered from that comment alone.

That is acceptable for an interactive profiler, but not as canonical correlation for a DVT-owned run.

DVT should instead prefer:

```text
DVT Run / Step / attempt
  -> real dbt command
  -> capture target/run_results.json before cleanup
  -> adapter_response exact provider query id where the supported adapter exposes it
  -> provider evidence lookup by that exact id
```

Current dbt adapter source confirms exact query ids are available for at least relevant modern adapter paths such as Snowflake and Databricks. A provider implementation must verify this again against the exact DVT-supported dbt/adapter versions before becoming Ready.

If an adapter cannot expose an exact correlation key, DVT must either define a separately approved weaker-evidence posture or return provider evidence unavailable. It must not silently upgrade the upstream heuristic to authoritative truth.

## Provider evidence worth reusing

### Snowflake

Upstream maps:

- query id/type/status;
- warehouse name/size;
- total elapsed time;
- compilation/execution/queue time;
- bytes scanned;
- bytes written to result;
- rows produced;
- cloud-services credits;
- overload/provisioning queue metrics.

It also uses `get_query_operator_stats(query_id)` for actual operator-level evidence:

```text
operator id
parent operators
operator type
input/output rows
execution-time share
spilling/operator attributes
```

This is high-value prior art for a future Snowflake evidence adapter.

### BigQuery

Upstream maps:

- job id/type/state;
- duration;
- bytes processed;
- bytes billed;
- cache hit;
- slot milliseconds;
- BI engine mode;
- DML affected rows;
- resource warnings;
- transferred bytes / processed accuracy.

BigQuery does not expose the same operator-plan shape; the package uses Query Insights instead. DVT must preserve that semantic difference rather than force every provider into a fake common operator tree.

### Databricks

Upstream maps:

- statement id/status/duration;
- warehouse id;
- bytes read/written;
- rows produced/read;
- files/partitions read and pruned;
- compilation/execution/wait durations;
- task duration;
- IO/result cache;
- local spill and shuffle bytes.

This is a strong candidate for future provider evidence if DVT supports the adapter.

### Redshift

Upstream maps timing, returned rows/bytes, queue/planning/lock wait and result-cache facts. One mapping deserves explicit rejection: current source aliases `returned_bytes` as `bytes_scanned`. DVT must not copy that semantic conflation. Provider fields stay provider-correct unless an equivalence is proven.

### DuckDB

Useful for local/tests, but current query stats can re-execute a query with `EXPLAIN ANALYZE`. DVT must never re-run a completed production step merely to obtain optional diagnostic evidence unless an explicit bounded action requests it.

## Security and privacy

Query history can expose:

- raw SQL and literals;
- user identifiers;
- warehouse/database names;
- object names;
- execution metadata visible beyond the current user when account-level views are used.

OBS1 already establishes the correct policy:

```text
provider output
  -> classify / redact / bound
  -> durable artifact/reference only when allowed
```

Therefore:

- user-scoped history is the safe default;
- account-level history requires an explicit deployment/permission decision;
- raw query SQL is not durable evidence by default;
- credentials and profile content remain excluded;
- query-history unavailability/expiration is a diagnostic availability state, never canonical Step failure.

## What DVT should keep

- `DbtCliPluginRunner` as DBT execution owner;
- `run_events` as canonical execution truth;
- existing Run/Step/attempt identity;
- content-addressed artifacts for bounded detailed evidence;
- existing `dbt-run-results` artifact vocabulary;
- existing server-owned DBT target/credential binding;
- Runs/Console as product projection;
- OpenLineage as interoperability projection, not query-evidence storage.

## What DVT should adapt

1. provider-specific query-stat mappings from upstream;
2. provider capability differences instead of inventing one fake universal query profile;
3. provider history permission/retention/lag tests;
4. actual-plan extraction patterns when a supported provider demonstrates value;
5. integration fixtures that ensure fields preserve correct meaning and unavailable behavior.

## What DVT should not build

- another generic query-history database;
- a second run/event store;
- an OBS-specific polling service;
- a mandatory dbt package injected into user projects;
- another generic SQL profiling UI;
- account-wide history browsing by default;
- model-name/query-comment heuristic as canonical correlation;
- automatic raw SQL persistence;
- provider-neutral metric fields whose names lie about source semantics;
- automatic query re-execution merely to collect evidence.

## Minimum delivery sequence

### 1. OBS1.1 — current critical path

Inside #2474, evaluate capturing a **bounded/sanitized `target/run_results.json` artifact before temporary DBT project cleanup**.

This can add value even on PostgreSQL because it preserves exact DBT execution output/adapter response and strengthens diagnostics without requiring provider query-history support.

Do not broaden #2474 into five warehouse adapters.

### 2. OBS1.2 — provider-gated

Issue #2624 is the follow-up and remains Not Ready until DVT supports one upstream-covered warehouse adapter and exact provider query correlation is proven.

Implement exactly one provider first.

### 3. Expansion only after value proof

Only after one provider demonstrates useful cost/diagnostic evidence should DVT consider a small provider evidence port and additional adapters. The port must be derived from proven common fields, not designed from the five upstream implementations in advance.

## Cost / gain

### Gain

- avoids re-researching five warehouses' history/stat/plan surfaces;
- gives OBS1 a concrete catalog of execution-cost evidence;
- lets DVT outperform the upstream package for DVT-owned runs by using exact execution correlation;
- reuses existing artifacts/run identity rather than building a telemetry subsystem;
- can expose real bytes/slots/spill/queue evidence when the provider already records it.

### Cost

- provider-specific permissions and retention must still be managed;
- history can be delayed or expired;
- metrics are not semantically identical across providers;
- exact query-id availability must be verified per supported dbt adapter/version;
- no immediate production benefit on DVT's current PostgreSQL-first vertical because upstream has no PostgreSQL implementation.

## Stop / narrow conditions

Stop provider integration when any of the following is true:

- no exact correlation from DVT step to provider query can be established;
- provider evidence adds no diagnostic/cost value beyond existing DBT/OBS1 evidence;
- required permissions force unsafe account-wide visibility;
- history latency/retention makes the UX misleading without a bounded asynchronous collection model;
- implementation requires a new store/poller/dashboard merely to retain optional evidence;
- field normalization would require lying about provider semantics.

## Final disposition

**ADOPT-BOUNDED** — provider algorithms, mappings and test cases are reusable prior art; the package itself is not a DVT execution authority or mandatory dependency.

Immediate action:

- feed exact DBT result-artifact capture into #2474;
- keep #2624 blocked until a supported non-PostgreSQL provider meets the activation gate;
- do not implement query-history polling, multi-provider abstraction or new persistence in this study.
