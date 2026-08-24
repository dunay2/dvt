---
title: Substrait semantic IR spike plan
status: Review
owner: Architecture / VTX2
last_reviewed: 2026-08-24
planning_type: review
baseline_sha: ffee4ee479b683e3346d5a96749229f798d4ca41
---

# Substrait semantic IR spike plan

## Think-first analysis

### Problem summary

VTX2 currently proposes a private language-neutral relational IR in #2595 with
`Input`, `Project`, `Filter`, `Join`, `Set`, `Aggregate`, `Sort`, `Fetch`, a
recursive expression model, portable types and function identities. Substrait
already specifies a typed semantic logical plan covering most of that vocabulary.
Implementing both without evidence risks duplicating relations, expressions,
types, functions, validation and versioning.

The study must determine whether Substrait can be the semantic authority for DVT
transformations, whether it needs a small DVT authoring-identity sidecar, or
whether DVT genuinely needs a separate editable authoring representation that
compiles to Substrait.

### Root cause

The current VTX2 planning was framed before measuring Substrait as a direct
canonical representation. Substrait was treated mainly as prior art or an
interchange adapter. That leaves the key product-specific tension untested:
Substrait field references are positional, while DVT authoring requires stable
`RelationId` and `FieldId` identities through rename, edit, reload and lineage.

### Governing constraints and invariants

- `AGENTS.md` and the governance inventory require plan-first, outcome-agnostic
  execution and repository-backed evidence.
- #2594 requires one semantic authority and prohibits another Flow IR or planner.
- #2595 requires stable editable relation/field identity and currently proposes a
  private Relational IR, but has not yet proven that Substrait cannot own the
  semantic algebra.
- #2597 keeps SQL AST syntax separate from semantic transformation meaning.
- #2618 keeps provider-native PostgreSQL preflight authoritative and treats
  SQLGlot as a bounded SQL frontend candidate.
- #2524 keeps `graphSource -> Planner -> ExecutionPlan` as the execution boundary;
  relation/operator count must not become runtime-step count.
- ADR-0017 governs ExecutionPlan compatibility; ADR-0018 governs shared-kernel
  ownership. This spike does not change either contract.
- No production contract, persistence authority, planner, runtime or existing
  compatibility path may change in this study.

### Options considered

1. **Private DVT relational IR** — implement #2595 as planned and optionally map
   it to Substrait later.
2. **Substrait canonical editable IR** — persist/edit Substrait directly.
3. **Substrait canonical IR plus DVT identity sidecar** — Substrait owns semantic
   relations/expressions/types/functions; DVT owns only stable authoring identity,
   provenance and UI metadata.
4. **DVT authoring model plus Substrait compiled IR** — retain a product-specific
   editable representation only if positional references or editing lifecycle
   cannot be solved without it.
5. **Reference only** — use Substrait as design prior art but do not integrate it.

No option is selected before evidence. The final gate is exactly one of
`ADOPT-CANONICAL`, `ADOPT-CANONICAL-WITH-SIDECAR`, `ADOPT-AS-COMPILED-IR`,
`ADOPT-BOUNDED`, `REFERENCE-ONLY`, or `REJECT`.

### Existing implementations to evaluate before writing adapters

- `substrait-python` DataFrame and builder APIs.
- `substrait-python` SQL-to-Substrait translator, which currently uses
  `sqloxide`; its coverage and determinism must be measured rather than assumed.
- SQLGlot as a dialect-aware SQL AST frontend.
- Isthmus/Calcite as a reference SQL-to-Substrait producer.
- Substrait Validator as a structural/semantic validation tool.
- DuckDB and DataFusion as independent consumers where supported.
- Current PostgreSQL `libpg-query` plus native `EXPLAIN` readiness rail.

### Rejected pre-decisions

- Creating `DvtFilter`, `DvtJoin`, `DvtAggregate`, a second type system or a
  second function catalog before proving a missing Substrait responsibility.
- Making SQLGlot AST the semantic IR.
- Replacing provider-native readiness with generic parsing or plan validation.
- Using Substrait physical relations as DVT's planner/runtime model.
- Adding one Canvas node or execution step per Substrait relation.

## Fowler opportunity matrix

| Scenario | Opportunity | Fowler/DDD interpretation | Owner | Evidence required |
| --- | --- | --- | --- | --- |
| DVT relation classes map 1:1 to Substrait | Duplicate semantics | Parallel hierarchy / duplicated model | VTX2 semantic contract | LOC and mapping comparison |
| SQL AST becomes product truth | Boundary drift | Representation leaks across bounded context | SQL bridge | SQLGlot/libpg-query to semantic-plan tests |
| Substrait ordinals replace stable authoring identity | Primitive obsession / hidden identity | Authoring identity is a DVT value object | Card authoring | rename/reload/lineage proof |
| Semantic operators become runtime steps | Responsibility overload | Logical transformation differs from execution planning | Planner | graphSource/ExecutionPlan unchanged |
| Parser success is treated as provider readiness | Hidden authority | PostgreSQL remains final readiness authority | SQL readiness | parser/provider disagreement fixtures |
| Pre-1.0 instability is treated as blanket rejection | Speculation | Risk must be bounded to used profile | Architecture | release/issues/profile matrix |

## Pre-implementation brief

- **Mode:** Full, but isolated spike only.
- **Scope:** reproducible fixtures, producer/consumer experiments, compatibility
  matrix, performance measurements and an architecture decision report.
- **Allowed paths:** `spikes/substrait-semantic-ir/**`, this review document and a
  dedicated study workflow. Existing product paths are read-only.
- **Expected outcome:** evidence-backed selection of one final gate and explicit
  list of DVT code that is needed, avoided or deferred.
- **Risks:** upstream version mismatch, validator lag, consumer dialect gaps,
  nondeterministic producer output, positional identity mismatch, Python process
  cost and false interoperability claims.
- **Mitigations:** pin versions, record tool/spec versions in every artifact,
  fail closed, separate representation/validation/execution results, compare
  semantic fingerprints rather than raw protobuf bytes, and retain native
  PostgreSQL preflight.
- **Out of scope:** production contracts, persistence migration, UI implementation,
  planner/runtime changes, optimizer, cross-provider movement and arbitrary
  Python execution.
- **Command/query rail impact:** none. The spike adds no externally observable
  product command or query.
- **Validation:** the workflow must run the Planning DB architecture query first,
  install pinned tools, execute tests, publish machine-readable evidence and run
  repository documentation/changed-scope checks that are viable for an isolated
  study.

## Required evidence matrix

The spike must record, per fixture:

```text
input language and dialect
parser/producer version
parse result
Substrait relation/expression coverage
serialization result
validator result
consumer result
semantic result comparison
roundtrip result
identity-sidecar result
native provider preflight posture
unsupported reason
```

The fixture corpus must include projection, rename, nested scalar expressions,
CASE, CAST, filters, at least three joins, set operations, aggregation/HAVING,
order/fetch, windows, CTE/subquery, quoted identifiers, NULL/decimal/timestamp,
PostgreSQL functions, vendor functions, arrays/JSON and UNNEST/EXPLODE.

## Decision gates

`ADOPT-CANONICAL` or `ADOPT-CANONICAL-WITH-SIDECAR` requires all of the
following:

- the VTX2 core is representable without silent loss;
- unsupported constructs fail closed;
- stable DVT identity has a small, explicit solution;
- no parallel relational/type/function AST is needed;
- TypeScript/runtime integration cost is bounded;
- generated plans validate at a compatible version;
- at least one independent consumer proves representative interoperability;
- pre-1.0 version pinning and migrations are operationally manageable;
- `graphSource -> Planner -> ExecutionPlan` remains unchanged.

## Definition of done

- [ ] Planning DB architecture baseline captured before experiment execution.
- [ ] Upstream 1.0 blocker and DVT-impact matrix recorded.
- [ ] Reproducible SQL and visual/DataFrame fixtures committed.
- [ ] SQLGlot, upstream SQL producer and current PostgreSQL-path options compared.
- [ ] Substrait plan serialization and compatible validation attempted with exact versions.
- [ ] At least one independent consumer attempted; support and failures are explicit.
- [ ] Stable identity/rename/reload sidecar experiment completed.
- [ ] Runtime/dependency/upgrade cost measured.
- [ ] Alternatives compared by owned LOC, duplication, portability and editing suitability.
- [ ] Exactly one final gate recorded with residual risks and activation conditions.
- [ ] No product code or contract changed.
