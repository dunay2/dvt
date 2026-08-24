# SQLGlot integration study — static SQL readiness, product-first

Date: 2026-08-24

Tracking: #2618

Study branch: `study/sqlglot-integration`

DVT study baseline: `main@ffee4ee479b683e3346d5a96749229f798d4ca41`

## Corrected decision frame

The study is no longer centered on column lineage. Lineage is a possible secondary benefit of parsing SQL, not the product reason to introduce SQLGlot.

The product question is:

> When DVT has a real user-facing capability that produces or executes SQL beyond the current PostgreSQL-only path, can SQLGlot provide bounded multi-dialect static analysis before provider-native preflight and execution?

Possible activating outcomes include:

- a first supported non-PostgreSQL SQL transform provider;
- GPT-generated/repaired SQL with deterministic diagnostics before Preview/Run;
- another named SQL capability that needs dialect-aware static analysis.

No production dependency is justified solely to improve architecture.

## Product-first delivery rule

Implementation must flow from:

```text
user-visible outcome
 -> acceptance case
 -> current DVT authorities + mature reference systems
 -> minimum architecture changes
 -> technical microcommits
 -> service/live proof
 -> release
```

Microcommits may be technical, but they are steps toward one product result. A standalone refactor with no user capability, defect or measured cost is not a release outcome.

## Current DVT reference implementation

PostgreSQL already proves the desired product shape through #2333:

```text
SQL authoring
 -> libpg-query structural parse/policy
 -> governed ConnectionRef
 -> PostgreSQL read-only EXPLAIN
 -> Monaco diagnostics
 -> Preview fail-closed before planner / PlanRef
 -> Run
```

Keep this path. SQLGlot must not replace `libpg-query` merely for uniformity.

A known ownership smell remains: readiness presentation/API currently hangs from Source Import boundaries. #2632 records the extraction blueprint but is closed `not_planned` as a standalone refactor. That cleanup should be absorbed only into the first real product vertical that needs broader SQL readiness.

## Proven external pattern

DVT is not inventing a new SQL architecture. Mature systems already separate stages:

| Reference | Pattern |
|---|---|
| Apache Calcite | parse -> validate -> relational/planning stages |
| Apache DataFusion | parser -> logical plan -> physical plan |
| Trino | parser/analyzer + engine-native validation such as `EXPLAIN (TYPE VALIDATE)` |
| SQLMesh | SQLGlot-backed SQL understanding and compile-time checks before warehouse execution |
| SQLFluff | dialect-aware parsing/linting with bounded parser behavior |
| PostgreSQL / BigQuery / Snowflake / Databricks | provider-native EXPLAIN/dry-run/preflight remains authoritative |

For future architecture choices, record first:

```text
mature reference
 -> pattern used there
 -> DVT equivalent
 -> minimum concept to reuse
 -> deliberate DVT difference
 -> evidence required for that difference
```

Prefer proven patterns over locally novel mechanisms.

## Target admission model

```text
SQL producer
 -> static SQL analysis
 -> DVT structural/policy checks
 -> provider-native preflight
 -> Preview / PlanRef admission
 -> Run
```

SQL producers may be:

```text
human authoring
GPT generation/repair
VisualTransformRecipeV1 -> existing compiler
dbt/Jinja -> dbt-native compile
```

The producer never certifies readiness.

## Responsibility split

### SQL producer / compiler

Produces SQL. The existing visual compiler remains a small deterministic recipe -> SQL producer.

### Static SQL analysis

Potential future responsibility:

```text
SQL + expected dialect
 -> parse
 -> statement classification
 -> structural DVT policy
 -> deterministic diagnostics
 -> optional derived metadata for real consumers
```

SQLGlot is an `ADOPT-BOUNDED` candidate here when a second real dialect/product case appears.

### Provider-native preflight

Final authority for actual provider semantics:

```text
SQL + governed ConnectionRef
 -> actual catalog/types/functions/permissions/provider version
 -> EXPLAIN / dry-run / equivalent
 -> ready | invalid | unavailable
```

Generic parser success is never equivalent to provider readiness.

## Possible future seam

Only after a second real implementation exists should DVT consider a shared port such as:

```ts
interface ISqlStaticAnalyzer {
  analyze(input: {
    sql: string;
    dialect: SqlDialect;
  }): Promise<SqlStaticAnalysisResult>;
}
```

Likely shape:

```text
PostgreSQL -> existing libpg-query-backed implementation
second supported dialect -> evaluate SQLGlot-backed implementation
```

Do not create dialect registries, generic AST contracts or framework layers in advance.

## GPT boundary

GPT may generate or repair SQL but never acts as the admission authority:

```text
GPT
 -> SQL candidate
 -> deterministic static diagnostics
 -> provider preflight
 -> deterministic diagnostics
 -> Preview/PlanRef only after admission
```

Diagnostics may be fed back to GPT for another attempt, while the deterministic gates remain authoritative.

## SQLGlot proof

Evaluate representative fixtures for:

- projection/filter/casts/functions;
- joins and aliases;
- GROUP BY/HAVING/aggregates;
- CTE/subquery/windows;
- quoted/case-sensitive identifiers;
- syntax errors/multiple statements;
- unsupported/vendor-specific syntax;
- ambiguous identifiers;
- deep/large SQL for resource limits.

Record:

```text
SQLGlot version
dialect
parse/classification result
diagnostic/location behavior
cold/warm process cost
input/output bounds
provider-native preflight result
cases where SQLGlot accepts SQL the provider rejects
```

## Secondary benefits

If SQLGlot is later adopted for static analysis, its parsed representation may support product consumers for:

- relation/column references;
- column lineage;
- impact analysis;
- compatibility hints.

These are secondary benefits, not reasons to introduce standalone infrastructure.

## Explicit exclusions

- no SQLGlot AST in public DVT contracts;
- no automatic SQL rewrite/roundtrip;
- no local query optimizer/planner replacement;
- no visual compiler replacement for uniformity;
- no browser Python runtime;
- no daemon/MCP/microservice/cache by default;
- no provider support claim merely because SQLGlot parses a dialect;
- no standalone readiness-boundary cleanup without product value.

## Decision gate

- `ADOPT-BOUNDED` only when a named upcoming product capability needs multi-dialect static analysis and SQLGlot demonstrates net reduction;
- `REFERENCE-ONLY` if the knowledge is useful but no near-term product outcome justifies production dependency;
- `REJECT` if correctness or boundedness is insufficient for DVT-supported SQL.

## Principle

**Start from the user-visible capability, reuse proven industry patterns, and introduce only the minimum mechanism required to deliver and prove that capability.**
