---
title: S07 - Pure managed-artifact action-result reuse
status: Experiment GO; implementation blocked by format/runtime benchmark
owner: Plugins / Artifacts / Research / Performance
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2506, 2507, 2508]
---

# S07 — Pure managed-artifact action-result reuse

## Decision

**GO for a bounded experiment; implementation blocked by benchmark.** DVT should prove one pure artifact-to-artifact computation after the HTTP vertical, but it must not invent a tabular encoder or adopt Arrow/Parquet/DuckDB without measured evidence.

The first profile must consume exact DVT-managed bytes, produce exact DVT-managed bytes and have no external database/network side effect after input retrieval. This isolates the complete action-result protocol from mutable sinks.

## Need

S05 proves exact reuse of an externally acquired artifact. It does not prove that DVT can reuse a result it computed from immutable inputs. A pure transform validates:

- complete recipe identity;
- exact managed input snapshots;
- runtime/library identity;
- deterministic output semantics;
- immutable output publication;
- warm result reuse and single-flight;
- downstream observational equivalence.

A deliberately useful candidate is a schema-bound JSON/JSONL-to-columnar conversion, but the result format and engine remain an experimental decision.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

DVT already has:

- exact artifact descriptors and tenant-scoped CAS;
- JSON/JSONL acquisition and validation;
- Temporal plugin/step registry boundaries;
- artifact readers used by downstream plugins.

The repository audit found no current production dependency or runner that provides a general Apache Arrow, Parquet or Iceberg transform.

`packages/@dvt/temporal-object-file-postgres-plugin/src/ObjectFilePostgresPluginRunner.ts` consumes an object artifact and writes to PostgreSQL. That is an effectful sink with database state and receipt semantics; it is unsuitable as the first pure reusable action.

The absence of a current transform is important: this slice must introduce one bounded product vertical, not a generic ETL framework.

## Architectural fit

```text
managed input ArtifactRef
  -> S03 verified bytes
  -> exact pure-transform InvocationDigest
  -> S04 lookup/lease
       ├── hit -> verified output ResultManifest
       └── miss -> bounded deterministic transform
                  -> publish output + manifest
                  -> verify + fenced confirm
```

The step is admitted through the existing registry and executed by the existing Temporal plugin mechanism. The Materialization Fabric remains optional for cold execution.

## Profile boundary

The candidate `pure-managed-artifact-v1` profile must freeze:

- exact input media type and schema contract;
- JSON/JSONL parsing and malformed-record behavior;
- row-order preservation or explicit order irrelevance;
- field order and schema metadata;
- null and missing-field semantics;
- integer/decimal/floating-point boundaries;
- timestamps, timezone and precision;
- nested/unsupported values;
- output format and compression options;
- deterministic metadata rules;
- library/runtime version and resource limits;
- cancellation and partial-output cleanup.

Unknown or unsupported semantics reject before reuse admission. A codec/library upgrade changes the execution contract until compatibility is re-proven.

## Open-source convergence

### Candidates to benchmark

- [Apache Arrow JavaScript](https://arrow.apache.org/docs/js/) for Arrow IPC output and cross-language columnar interoperability;
- [Apache Parquet](https://parquet.apache.org/) for durable compressed analytical artifacts;
- [DuckDB Node Neo](https://duckdb.org/docs/stable/clients/node_neo/overview) as a mature native conversion/query engine capable of reading JSON and producing Arrow/Parquet;
- current JSON/JSONL artifact baseline.

### Decision principles

Arrow IPC is primarily an interchange/streaming representation. Parquet is primarily durable analytical storage. DuckDB can remove implementation work but adds a native engine, version, container and supply-chain footprint. The correct choice depends on measured target consumers.

### Explicit rejections

- a DVT-specific binary encoder;
- Arrow as plan/event/control-plane serialization;
- selecting a format from compression ratio alone;
- assuming schema equality proves content equality;
- physical equivalence across different codec/library versions in V1;
- a generic arbitrary-code transform runtime.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Semantic profile | High | Numeric/time/order/null ambiguity. |
| Library/runtime selection | High | Native footprint versus JS performance and fidelity. |
| Deterministic output | High | Format metadata and library-version variation. |
| Plugin implementation | Medium | Bounded once profile/engine are fixed. |
| Performance | High | Verification may cost close to recomputation. |
| Interoperability | High | Independent readers must agree on types/schema. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Managed artifact input/output | CAS contracts | Pure transform semantic profile. |
| JSON/JSONL validation | HTTP plugin | Reusable shared parsing boundary or deliberate local implementation. |
| Temporal plugin registry | Yes | One bounded pure transform step. |
| Columnar tooling | Not in production dependencies | Evidence-based library/format selection. |
| Materialization infrastructure | Planned S01–S04 | Full action-result integration. |
| Tests | Artifact/plugin patterns | Type corpus, independent reader, benchmark and fault proof. |

## Task decomposition

1. [#2506](https://github.com/dunay2/dvt/issues/2506) defines the exact pure managed-artifact semantic profile.
2. [#2507](https://github.com/dunay2/dvt/issues/2507) benchmarks Arrow IPC, Parquet, DuckDB and JSON baseline.
3. [#2508](https://github.com/dunay2/dvt/issues/2508) implements the selected transform and action-result reuse only after a measured GO.

## Benchmark protocol

Freeze small, medium and large fixtures covering:

- flat primitive rows;
- null/missing fields;
- decimals and numeric boundaries;
- timestamps/timezones/precision;
- nested values where supported;
- malformed and unsupported values;
- repeated deterministic runs.

Measure:

- wall time, CPU and peak memory;
- output bytes and compression;
- streaming/backpressure/cancellation;
- cold-start and native/container footprint;
- deterministic physical bytes or frozen normalized observation across 100 runs;
- independent reader interoperability;
- verification/read cost versus full transformation;
- dependency maintenance/security cost.

Byte-for-byte stability is preferred. If unavoidable format metadata varies, physical digest remains version-bound and the normalized oracle must be explicit; V1 does not declare different encoders logically equivalent.

## Implementation and proof

Cold path:

```text
verify input
  -> acquire fence
  -> deterministic transform
  -> publish immutable output/manifest
  -> independent verification
  -> fenced index confirmation
```

Warm path:

```text
same exact invocation
  -> verify manifest/output
  -> zero transform executions
  -> same downstream observations
```

Release gates:

```text
full vs reused downstream divergence = 0
false-safe result = 0
100 concurrent cold invocations -> 1 confirmed result
unsupported type silently coerced = 0
custom DVT encoder introduced = 0
measured saving >= frozen #2152 threshold
```

## Stop and narrow conditions

Stop or narrow when:

- no candidate preserves the frozen type/order/timezone semantics;
- output cannot be deterministic or safely version-bound;
- native deployment/security cost exceeds product value;
- verification cost is comparable to recomputation for target sizes;
- no independent consumer needs the columnar output;
- the work expands into a generic transform framework.

A failed benchmark means retain JSON/JSONL or defer the vertical. It does not justify inventing a format.

## Gate result

```text
gateDecision: experiment-go
gateScope: one-pure-managed-transform
authorizedImplementation: false
blocksOn:
  - S01-S04 complete
  - S05 infrastructure proof
  - #2507 measured format/runtime GO
```
