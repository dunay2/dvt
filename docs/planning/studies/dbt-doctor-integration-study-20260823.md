---
title: dbt-doctor Integration Study
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
> Current disposition and acceptance remain in issue #2620.

# dbt-doctor integration study — DVT / DPE1

Date: 2026-08-23

DVT baseline: `main@ffee4ee479b683e3346d5a96749229f798d4ca41`

Upstream examined: `Astoriel/dbt-doctor`, current main including `ad5e740bf0a68868b610d7f81b7d8b2aa8840708`.

Tracking: #2620. Coordinates with #2567, #2568, #2572 and #2171.

## Decision

**REFERENCE-ONLY. Do not add dbt-doctor as a DVT runtime or MCP dependency.**

The project contains useful prior art for two bounded ideas:

1. fuse compatible column metrics into a single aggregate query rather than one query per metric/column;
2. derive explainable dbt test recommendations from profile evidence.

Its production profiling, drift, YAML and SQL-safety implementation is not suitable as DVT authority and should not replace DPE1, DVT dbt analysis, Source Import, Workspace File mutation or YAML CAS rails.

## Upstream posture

- package version: `0.1.0`;
- maturity: Active alpha;
- license: MIT;
- Python >=3.10;
- adapters implemented: PostgreSQL and DuckDB;
- dependencies include MCP, `ruamel.yaml`, psycopg, DuckDB and Pydantic;
- latest source-level profiler work observed is from 2025-12; latest repository commit inspected is documentation-oriented in 2026-05;
- upstream itself warns that large-table profiling is expensive, SQL safety is lightweight and human review is required before production YAML changes.

This is good prior art, not a dependency on which DVT should place an architectural boundary.

## DPE1 overlap matrix

| dbt-doctor capability       | Upstream behavior                                                                                                               | DVT/DPE1 disposition                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Batched column profiling    | one metadata lookup, exact `COUNT(*)`, one aggregate containing `COUNT(DISTINCT col)` for every column, plus `SELECT * LIMIT 5` | **COPY PATTERN ONLY**: keep fusion idea; reject default exact whole-table count/distinct/sample rows                    |
| Null/unique/min/max metrics | derives simple table/column profile                                                                                             | **ADAPT** only through `ProfileObservation` with method/scope/confidence/budget provenance                              |
| Test suggestions            | deterministic rules map profile stats to `not_null`, `unique`, `accepted_values`                                                | **ADAPT LATER** as a pure recommendation projection over DPE1 observations, never as collector authority                |
| Schema drift                | compares DB columns to manifest for add/remove/type mismatch                                                                    | **REJECT AS DEPENDENCY**: dbt-osmosis study already found a richer diff model; DVT should not add a second drift engine |
| YAML writer                 | `ruamel.yaml`, merge/add only, direct file rewrite                                                                              | **REJECT**: DVT current CST + expected SHA + atomic batch mutation + fresh dbt re-analysis is stronger                  |
| Overall health score        | fixed weighted 0–100 score                                                                                                      | **REJECT**: conflicts with DPE1 explainable `Observation -> Baseline -> Finding`; aggregate score is not authority      |
| MCP server                  | exposes profiler/audit/generation tools directly to AI clients                                                                  | **REJECT**: would create a second product/control boundary beside DVT                                                   |
| PostgreSQL connector        | prefix-based read-only SQL check                                                                                                | **REJECT**: insufficient as DVT security boundary; upstream itself calls SQL safety lightweight                         |

## Detailed finding: profiler

`DataProfiler.profile_table()` does not actually represent the DPE1 cost model.

Its current flow is conceptually:

```text
get columns
  -> SELECT COUNT(*)
  -> SELECT COUNT(col), COUNT(DISTINCT col), MIN/MAX ... for all columns
  -> SELECT * LIMIT 5
```

This has several problems for DVT:

1. whole-table `COUNT(*)` is automatic;
2. exact distinct is automatic for every column;
3. the aggregate is unbounded by window/partition/query budget;
4. there is no metadata-first L0 strategy;
5. there is no sampling policy or exact/approximate distinction;
6. there is no statement/query budget contract;
7. there is no observation identity, provenance, immutable-scope reuse or history;
8. raw row values are collected and retained in the profile object.

DPE1 explicitly requires the opposite defaults:

```text
reuse existing
 -> metadata L0
 -> bounded exact aggregate
 -> governed sample
 -> unavailable
```

with no hidden full-table fallback.

### What is worth keeping

The useful algorithmic idea is the fused aggregate builder:

```sql
SELECT
  count(...) ...,
  min(...) ...,
  max(...) ...
FROM governed_relation
WHERE governed_bounded_scope
```

DVT #2572 already selected this direction. Therefore dbt-doctor validates the pattern but does not remove the need for DVT's provider policy, Query Budget or evidence contracts.

Do **not** copy its query literally.

## Detailed finding: test suggestions

The pure rule style is useful:

```text
observed null rate == 0
  -> not_null candidate

observed unique count == row count
  -> unique candidate

low cardinality
  -> accepted_values candidate
```

But the current implementation has evidence problems:

- it labels some suggestions `high` based on one whole-table measurement without an observation version/scope contract;
- `accepted_values` can be populated from only a handful of sampled row values while the distinct-count metric comes from the full table;
- naming heuristics such as `_id` can produce medium-confidence advice that is not a database invariant;
- suggestions are not bound to existing dbt tests, immutable profile evidence or a finding/rule version.

DVT should preserve only the deterministic-rule idea.

A safe future DVT shape would be:

```text
ProfileObservationV1[]
        +
Dbt project manifest/tests
        +
TestRecommendationRuleV1
        |
        v
DbtTestRecommendation
  ruleVersion
  evidenceRefs[]
  confidence
  reason
  proposedTest
```

Rules must distinguish exact vs estimated/sampled evidence. `accepted_values` must never be synthesized from a tiny arbitrary sample and presented as exhaustive.

This is a future projection, not required to complete DPE1.

## Detailed finding: schema drift

Current dbt-doctor drift detects:

- DB column added;
- manifest column absent from DB;
- type mismatch.

Its implementation uses lowercase names and substring-style type equivalence.

This is useful as an example but inferior to the already studied dbt-osmosis diff model, which additionally models rename candidates and severity. Adding both would create duplicate policy.

Decision:

- DVT owns one drift/read-model outcome if product value is selected;
- prefer a bounded implementation or dbt-osmosis-derived algorithm behind the existing dbt analysis/provider boundary;
- dbt-doctor contributes no additional runtime dependency.

## Detailed finding: YAML mutation

`YamlWriter` is intentionally additive and preserves comments with `ruamel.yaml`, but it performs direct filesystem writes after loading/serializing the document.

DVT already has stronger production invariants for dbt YAML description edits:

```text
resolve authoritative resource
 -> expected content SHA
 -> CST-bounded mutation
 -> candidate SHA
 -> atomic WorkspaceFile batch mutation / CAS
 -> fresh dbt project re-analysis
 -> receipt
```

The dbt-doctor writer lacks DVT's tenant/workspace authority, revision conflict semantics, batch CAS, deterministic receipt and post-write dbt projection proof.

Decision: **do not replace or wrap DVT's YAML mutation rail with dbt-doctor**.

## Detailed finding: health score

`ProjectAuditor.overall_score` is a fixed weighted composite:

```text
25% model documentation
30% column documentation
35% tests
10% naming
```

This is easy to display but hides the cause and uncertainty behind one number. DPE1 explicitly rejected a global opaque health number as authoritative truth.

DVT may expose coverage facts independently if useful, but must not import this score as dataset health semantics.

## Security finding

The PostgreSQL connector claims read-only behavior but the enforcement is lightweight text-prefix inspection (`SELECT`, `WITH`, `EXPLAIN`) and does not establish DVT's required governed query contract. The upstream limitations explicitly say AST-based validation is still needed before sensitive use.

DVT should continue to use closed metric catalogs, authorized source/column identifiers, parameters, provider read-only/timeout posture and Query Budget. Do not reuse this connector.

## What this study removes from DVT's future workload

### Do not build independently

- a one-query-per-metric profiler;
- an opaque project-health scoring subsystem;
- an MCP quality server inside DVT;
- another schema-drift engine in parallel with dbt-osmosis/DVT analysis;
- another YAML writer;
- a generic unrestricted profile SQL endpoint.

### Reuse as prior art

1. fused metric aggregation;
2. deterministic evidence -> test-recommendation rules;
3. additive proposal UX: inspect -> suggest -> preview -> explicit apply.

The third item maps naturally to DVT's existing proposal/CAS mutation model, without importing dbt-doctor's writer.

## Impact on DPE1

No DPE1 architecture should be replaced.

Instead #2568/#2572 should record dbt-doctor as validating prior art plus a negative comparison:

- DPE1's metadata-first and Query Budget requirements are necessary precisely because the simpler full-table strategy becomes expensive;
- DPE1's prohibition on raw sample persistence avoids the `sample_rows/sample_values` exposure used by dbt-doctor;
- exact distinct remains explicit/budgeted, never automatic for every column;
- DPE1 findings remain evidence-linked and versioned;
- test recommendations, if added, should be a later read-model/proposal layer consuming DPE1 evidence.

## Final disposition

`REFERENCE-ONLY`

No product dependency, MCP runtime, connector, store, profiler, drift engine or YAML writer is adopted.

The following patterns are retained for design/tests only:

- fused aggregate construction;
- deterministic profile-to-test suggestion rules;
- proposal/preview/apply user workflow.

## Implementation gate

Do not open a dbt-doctor integration implementation issue.

If DPE1 later needs dbt test recommendations, create one bounded issue only after `ProfileObservationV1` and collection exactness/confidence semantics exist. That issue should implement the smallest pure DVT rule projector and cite dbt-doctor's rules as prior art rather than introduce the whole package.
