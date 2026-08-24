# SQLGlot integration study — derived column lineage for SQL-authoritative DVT transforms

Date: 2026-08-24

Tracking: #2618

Study branch: `study/sqlglot-integration`

DVT study baseline: `main@ffee4ee479b683e3346d5a96749229f798d4ca41`

## Corrected decision frame

The useful question is no longer whether DVT should add a generic SQL semantic engine.

The concrete product question is:

> Can SQLGlot be the smallest reliable implementation detail for deriving output-column lineage from SQL-authoritative `dvt:sql_transform` SQL, while SQL remains the authority and existing DVT lineage presentation remains the projection owner?

This correction matters because a broad `SqlSemanticAnalysis` abstraction would invite capabilities with no current consumer: generic ASTs, normalization, transpilation, optimizer output, schema engines and persistence. None of those is required to solve the identified product gap.

## Authority model

### Visual mode

```text
VisualTransformRecipeV1
  = authoring authority
        |
        +--> existing deterministic PostgreSQL compiler
        |
        +--> recipe-derived column lineage
```

SQLGlot is not used here. Re-parsing generated SQL would recreate information already owned by the recipe and would add a second interpretation path.

### SQL mode

```text
SQL text
  = authoring authority
        |
        v
bounded SQLGlot column-lineage analysis
        |
        v
DVT relation/column lineage DTO
        |
        v
existing graph/source binding resolution
        |
        v
existing Canvas column-lineage projection
```

SQL mode does not "lose visual provenance". No visual recipe is authoritative in SQL mode. SQLGlot derives a read model from SQL; it never reconstructs a visual recipe.

## Case matrix

| Case | Disposition | Reason |
|---|---|---|
| Visual DVT transform | KEEP existing | Recipe already owns inputs/outputs and visual lineage |
| SQL-authoritative DVT transform | ADOPTION CANDIDATE | Concrete missing semantic projection: output -> input column lineage |
| PostgreSQL readiness | EXCLUDE | #2333 owns `libpg-query` structural policy + real PostgreSQL readiness |
| VTX2 generation | EXCLUDE | Existing TS compiler is smaller and deterministic |
| dbt Jinja/source SQL | EXCLUDE from first slice | dbt-native analysis owns source semantics |
| dbt compiled SQL | FUTURE ONLY | Analyze only if a concrete dbt lineage consumer is later justified |
| OpenLineage | DOWNSTREAM ONLY | May consume DVT lineage later; never analysis authority |
| Marquez | DOWNSTREAM ONLY | Projection/backend, never source of DVT lineage truth |
| SQL rewrite/transpile | EXCLUDE | No current DVT product requirement; file/source fidelity risk |
| Optimizer output | EXCLUDE | No consumer and would create a second planning semantic surface |
| Analysis persistence/cache | EXCLUDE from MVP | Result is recomputable; add only from measured need |

## Minimum object model

### `SqlColumnLineageAnalysis`

Internal application result. Do not place it in public `@dvt/contracts` until a real cross-process/public consumer requires that promotion.

```ts
type SqlDialect = 'postgres' | 'snowflake' | 'bigquery' | 'databricks' | 'redshift';

type SqlRelationRef = Readonly<{
  catalog?: string;
  schema?: string;
  name: string;
}>;

type SqlColumnRef = Readonly<{
  relation?: SqlRelationRef;
  column: string;
}>;

type SqlOutputColumnLineage = Readonly<{
  outputColumn: string;
  inputs: readonly SqlColumnRef[];
}>;

type SqlColumnLineageAnalysis =
  | Readonly<{
      status: 'analyzed';
      dialect: SqlDialect;
      analyzer: Readonly<{
        engine: 'sqlglot';
        engineVersion: string;
        contractVersion: 'sql-column-lineage.v1';
      }>;
      outputs: readonly SqlOutputColumnLineage[];
    }>
  | Readonly<{
      status: 'unsupported' | 'unavailable';
      diagnostics: readonly SqlColumnLineageDiagnostic[];
    }>;
```

The provenance fields make the derived result explainable and reproducible without promoting it to a persisted domain authority.

Do not add:

- SQLGlot AST nodes;
- generic DVT SQL AST;
- normalized SQL;
- rewritten SQL;
- optimizer/planner structures;
- execution/readiness state;
- cache identity;
- persistence lifecycle.

### `ISqlColumnLineageAnalyzer`

One narrow application port:

```ts
interface ISqlColumnLineageAnalyzer {
  analyze(input: Readonly<{
    sql: string;
    dialect: SqlDialect;
    schema?: SqlColumnLineageSchemaContext;
  }>): Promise<SqlColumnLineageAnalysis>;
}
```

The port owns only the question: "which input columns contribute to each output column?"

It does not answer:

- is this SQL executable?;
- is it allowed by DVT policy?;
- how should it be compiled?;
- how should it be materialized?;
- how should graph node IDs be assigned?;
- how should OpenLineage be emitted?

### `SqlGlotColumnLineageAnalyzer`

Infrastructure adapter. It may use a small Python process because SQLGlot is Python-native, but the process boundary must remain bounded and replaceable.

Responsibilities:

1. accept the DVT request;
2. enforce dialect allow-list and input size;
3. invoke SQLGlot with timeout/output limits;
4. optionally qualify with supplied schema context where semantics are well defined;
5. extract physical relation refs and output-column lineage;
6. map to strict DVT JSON/DTO;
7. report SQLGlot engine version;
8. discard every SQLGlot-native object before returning.

It does not own network access, persistence, source identity, graph identity or SQL validation.

### bounded process execution

DVT already owns bounded process mechanics in the dbt analyzer: timeout, output limits, subprocess failure classification and sanitized environment.

If implementation proceeds, extract/reuse only the genuinely generic mechanics into a `BoundedProcessRunner` if doing so reduces duplicate code. Add bounded stdin support so SQL is not placed in command-line arguments.

Do not create:

- `SqlGlotProcessManager`;
- long-lived daemon;
- HTTP microservice;
- MCP server;
- queue;
- cache service;
- second process framework.

## Product projection boundary

The analyzer must not know Canvas node IDs.

It returns SQL identities:

```text
catalog/schema/relation/column
```

A DVT-owned projector resolves these against existing Graph/source bindings and emits the existing Canvas lineage representation.

Conceptually:

```text
SqlColumnLineageAnalysis
 + current DVT graph/source bindings
        |
        v
SQL-authoritative transform column lineage projection
        |
        v
existing Canvas column-lineage edges/read model
```

This preserves the authority split:

```text
SQL = truth
SQLGlot result = derived interpretation
Graph/source bindings = DVT identity mapping
Canvas lineage = presentation projection
```

## First proof slice

The first proof must be lineage-centric rather than a tour of SQLGlot features.

Fixtures:

1. direct projection and rename/alias;
2. cast and scalar function transformation;
3. multiple input columns into one output;
4. filters, proving predicates do not fabricate output lineage;
5. GROUP BY plus aggregate outputs and HAVING;
6. nested CTE and subquery;
7. quoted/case-sensitive PostgreSQL identifiers;
8. ambiguous/unqualified columns;
9. one multi-relation JOIN fixture as future-boundary stress evidence;
10. unsupported/provider-specific syntax;
11. one large/deep query for process timeout/cost measurement.

For every fixture record:

```text
input SQL
dialect
optional schema context
expected output columns
expected input column refs per output
actual result
ambiguity/unsupported behavior
elapsed process time
```

## Performance/provenance policy

The analysis starts **ephemeral, reproducible and measured**.

The analyzed result carries:

- `contractVersion`;
- SQLGlot engine/version;
- dialect.

Do not add durable analysis identity or cache yet.

A cache may be proposed later only if measurements show repeated identical SQL analysis is materially expensive. If added, its natural derivation key would be based on authoritative SQL identity + dialect + analyzer/contract version + relevant schema-context identity, but that is intentionally not part of this MVP.

## dbt boundary

DVT already exposes dbt `compiledSql` in analysis resources, but availability is not a use case.

Do not integrate SQLGlot into #2171 simply because compiled SQL exists.

A future dbt lineage consumer would need to prove all of:

1. a named product projection needs compiled-SQL column lineage;
2. the existing dbt manifest/native analysis does not already provide sufficient truth;
3. the same #2171 analysis snapshot can be reused without another dbt parse/compile;
4. SQLGlot receives only compiled SQL, never raw Jinja as if it were executable SQL.

Until then, dbt is outside the implementation slice.

## PostgreSQL readiness boundary

#2333 remains authoritative for PostgreSQL readiness.

SQLGlot may successfully derive lineage from SQL that PostgreSQL later rejects. That is acceptable because the two outputs answer different questions:

```text
SQLGlot: what column dependencies can be derived from this SQL?
#2333: is this SQL structurally allowed and valid/readable against the effective PostgreSQL connection?
```

Never promote SQLGlot parse success to readiness.

## OpenLineage boundary

If the derived DVT lineage later proves useful to OpenLineage, the transport consumes the DVT projection. The lineage worker/Marquez must not independently invoke SQLGlot and create a second interpretation path.

## Go / no-go

`ADOPT-BOUNDED` only if the complete product chain is clean:

```text
SQL-authoritative transform
 -> bounded SQLGlot analysis
 -> DVT column refs
 -> existing DVT binding resolution
 -> existing Canvas lineage presentation
```

Prefer `REFERENCE-ONLY` when:

- process/runtime packaging is disproportionate to the value;
- supported SQL produces too much ambiguous lineage;
- the result requires exposing SQLGlot AST to be useful;
- the integration requires a second store/cache/service to function;
- the existing Canvas consumer cannot consume the result without a parallel lineage model.

Reject when correctness is insufficient for the SQL surface DVT actually supports.

## Explicit non-goals

- generic semantic SQL engine;
- SQL AST contract;
- SQL parser replacement;
- PostgreSQL validator replacement;
- visual compiler replacement;
- SQL -> Visual reconstruction;
- dbt parser/compiler replacement;
- SQL transpilation product;
- query optimizer;
- automatic SQL rewrite;
- second lineage store;
- analysis persistence subsystem;
- browser Python/SQLGlot runtime.

## Principle

**Do not integrate SQLGlot. Solve SQL-authoritative column lineage with SQLGlot only if it is the smallest reliable mechanism.**
