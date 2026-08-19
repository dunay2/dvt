---
title: S06 - dbt native-analysis reuse
status: Conditional GO; blocked by #2171 identity and baseline convergence
owner: dbt Analysis / API / Contracts / Research
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2502, 2504, 2505]
---

# S06 — dbt native-analysis reuse

## Decision

**Conditional GO.** Reuse DVT's complete normalized native-analysis result for an exact source/runtime identity before considering dbt's internal partial-parsing optimization.

Do not use the current `analysisSha256` as a durable materialization key and do not create route-local caches. #2171 remains the owner of one source snapshot, analyzer composition and native-analysis convergence.

## Need

Several bounded product operations need the same dbt project analysis:

- graph projection;
- project validation;
- selected-model analysis;
- source editing, validation and reprojection.

Repeated `dbt parse` processes over the same exact revision/runtime waste process startup, parsing and semantic-extraction work. However, an incomplete cache key can return stale resources, diagnostics, dependencies or source mappings and corrupt authoring behavior.

The safe target is:

```text
exact source + dbt/adapter/analyzer environment
  -> complete NativeAnalysisManifest
  -> verified reuse across bounded consumers
```

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

`apps/api/src/infrastructure/dbt/DbtCliProjectAnalyzer.ts` currently runs:

```text
dbt parse --no-partial-parse
```

This is a good correctness baseline: every miss executes a full native analysis rather than relying on dbt's own mutable partial-parse state.

`apps/api/src/infrastructure/dbt/dbtAnalysisHash.ts` constructs a private stable JSON/hash over parts of the normalized result. The repository audit and #2171 establish that the current identity does not bind every field required for durable reuse, including complete semantic evidence, analyzer/semantic-extractor version, dbt/adapter context and all parse-affecting environment inputs.

Different routes currently reach related analysis capabilities. #2171 already owns convergence on one source snapshot and one analyzer authority; DMF must extend that authority rather than create another dbt service.

## Architectural fit

```text
#2171 source snapshot + analyzer authority
  -> resolve complete analysis InvocationDigest
  -> scoped Materialization Fabric lookup/verifier
       ├── hit -> rehydrate strict NativeAnalysisManifest result
       └── miss -> one full dbt parse --no-partial-parse
                  -> normalize resources/dependencies/diagnostics/evidence
                  -> publish/verify/confirm
```

Consumers receive the same immutable normalized contract. They do not read dbt artifacts directly or own separate caches.

## Proposed NativeAnalysisManifest boundary

A complete V1 analysis result must bind:

- exact project source revision/content set;
- `dbt_project.yml`, package metadata and lockfiles;
- parse-relevant profile/target semantic identity without raw credentials;
- dbt Core/Fusion version and artifact schema version;
- adapter version/capabilities;
- DVT analyzer and semantic-extractor versions;
- governed environment/Jinja/macro inputs;
- normalized resources and dependencies;
- diagnostics;
- semantic evidence and source mappings used by graph/authoring operations;
- output descriptors and compatibility profile.

Failed or partial analysis results are not reusable in the initial profile. A future bounded negative-result cache would need explicit freshness and error determinism rules.

## Open-source convergence

### Reuse

- [dbt manifest artifact](https://docs.getdbt.com/reference/artifacts/manifest-json) as upstream native parse evidence;
- [dbt state selection](https://docs.getdbt.com/reference/node-selection/methods) and [defer](https://docs.getdbt.com/reference/node-selection/defer) as prior art for project-state comparison;
- [dbt parsing documentation](https://docs.getdbt.com/reference/parsing) for partial-parse invalidation inputs and caveats;
- existing DVT source snapshot, analyzer, contracts and S01–S04 infrastructure.

### Do not conflate

- dbt `partial_parse.msgpack` is dbt's own parser acceleration state; it is not DVT's durable verified analysis result;
- dbt state/defer compares project artifacts but does not prove external data materialization validity;
- dbt manifest equality alone does not cover DVT semantic-extractor/source-mapping version.

Initial implementation retains `--no-partial-parse` on misses. Enabling dbt partial parsing requires a separate benchmark and invalidation proof after the durable DVT boundary works.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Identity completeness | Very high | Hidden parse inputs or version omissions. |
| Rehydration | High | Dropping diagnostics/evidence/source mappings used by consumers. |
| Consumer convergence | High | Route-local divergence and duplicate analyzers. |
| Performance | Medium | Small projects may not justify durable verification. |
| Security | High | Profiles/environment values and credentials. |
| Compatibility | High | dbt artifact/adapter/analyzer version changes. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Full analyzer | `DbtCliProjectAnalyzer` | Single application reuse authority. |
| Native upstream artifact | dbt `manifest.json` | DVT-complete normalized manifest/evidence contract. |
| Analysis hash | Private/incomplete current implementation | Exact versioned invocation/result identity. |
| Source revision work | #2171 | Durable verified result binding. |
| Consumer operations | Graph/validation/authoring | One complete rehydrated result contract. |
| Tests | Analyzer/operation fixtures | Mutation corpus, call-count and benchmark gates. |

## Task decomposition

1. [#2502](https://github.com/dunay2/dvt/issues/2502) freezes and persists the complete `NativeAnalysisManifestV1`.
2. [#2504](https://github.com/dunay2/dvt/issues/2504) reuses verified analysis through one bounded application authority.
3. [#2505](https://github.com/dunay2/dvt/issues/2505) proves invalidation completeness and measured value.

## Implementation sequence

```text
#2171 converge source/analyzer/consumer baseline
  -> enumerate every consumer-observed field
  -> freeze complete analysis identity/manifest
  -> publish immutable outputs
  -> implement verified lookup/rehydration
  -> adopt consumer matrix one by one
  -> execute mutation corpus and benchmark
```

No consumer migrates until full parse and rehydrated result are compared over its complete observation contract.

## Verification corpus

Mutations that must invalidate or reject:

- SQL/model body;
- YAML properties, tests and source declarations;
- macros and indirect macro dependencies;
- packages and lockfiles;
- `dbt_project.yml`;
- parse-relevant target/profile semantics;
- governed environment/Jinja inputs;
- dbt Core/Fusion and adapter versions;
- analyzer/semantic-extractor versions;
- added, deleted or renamed resources;
- diagnostic, semantic-region or source-map changes;
- corrupt/missing output and unsupported artifact version.

Incidental temp paths, process IDs and timing must not change identity.

Release gates:

```text
accepted full-vs-rehydrated consumer-field divergence = 0
false-safe analysis reuse = 0
warm hit dbt parse process count = 0
concurrent cold identical requests -> 1 analyzer process
unknown parse-affecting input silently omitted = 0
```

Benchmark small, medium and large fixtures. If durable lookup/verification costs exceed full parse for small projects, disable the policy below a measured boundary rather than weakening evidence.

## Stop and narrow conditions

Stop or narrow when:

- parse-affecting inputs cannot be completely captured;
- dbt/adapter exposes hidden unversioned state that changes the normalized result;
- rehydration omits diagnostics, semantic evidence or source mappings required by authoring;
- route convergence in #2171 is incomplete;
- verification cost erases value for target projects;
- implementation begins maintaining a second analyzer or enabling partial parse without evidence.

## Gate result

```text
gateDecision: conditional-go
gateScope: complete-native-analysis-result
authorizedImplementation: false
blocksOn:
  - #2171 source/analyzer convergence
  - S01-S04 infrastructure
  - complete consumer observation matrix
```
