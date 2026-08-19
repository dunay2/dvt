---
title: S09 - Dataset snapshot and partition manifests
status: Research GO; implementation deferred until dataset-level reuse is proven
owner: Data Contracts / Planner / Research / Provider Adapters
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2510, 2511, 2512]
---

# S09 — Dataset snapshot and partition manifests

## Decision

**Research GO; implementation deferred.** DVT should model exact dataset and partition snapshots only after the whole-result Materialization Fabric works. Apache Iceberg is the preferred first external evidence provider because it already exposes immutable snapshots, manifest lists and file-level change metadata.

V1 must not infer partition safety from table names, row counts, timestamps or SQL text. Partition reuse is admitted only for governed operators whose input-to-output dependency is demonstrably sound.

## Need

A whole-dataset digest forces all consumers to recompute when one partition changes. For large append- or partition-oriented data, the useful target is:

```text
changed input partitions
  -> only affected output partitions execute
  -> unchanged verified output partitions remain reusable
```

This requires two separate proofs:

1. exact identity of the dataset snapshot and each partition/file component;
2. a sound operator profile showing which inputs can affect each output partition.

A Merkle manifest solves the first, not the second.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

The repository audit found no production Apache Iceberg, Delta Lake or Arrow/Parquet snapshot provider and no `DatasetSnapshotManifest` contract. Current artifact digests identify individual stored bytes, not an external table snapshot or partition dependency graph.

The existing planner understands graph dependencies and selection closure, not row/file/partition-level impact. Existing snapshots in state-store/work-queue domains are operational snapshots, not analytical dataset snapshot evidence.

Therefore S09 is not a small extension to current planner hashing. It is a later provider/profile layer built on S01–S08.

## Architectural fit

```text
provider-specific immutable snapshot evidence
  -> DatasetSnapshotManifestV1
  -> canonical dataset/partition root identities
  -> governed operator impact calculator
  -> immutable partition candidate bundle
  -> planner emits explicit partition run/reuse decisions
  -> ResultManifest references managed or external snapshot outputs
```

Provider readers resolve and verify mutable catalog/storage facts before planning. The planner receives immutable normalized descriptors and remains pure.

## Proposed manifest boundary

`DatasetSnapshotManifestV1` should bind:

- provider and semantic-profile version;
- exact source snapshot/reference identity;
- schema/logical-shape digest;
- partition specification and transform version;
- deterministic ordered partition descriptors;
- data/delete file or managed-artifact descriptors where applicable;
- sequence/status/tombstone semantics required by the provider;
- canonical root digest over every child descriptor;
- retention/accessibility evidence;
- optional statistics as non-authoritative observations unless proven complete.

A child partition identity remains stable when its exact content/semantics remain unchanged. Any added, removed, changed or tombstoned child changes the dataset root.

## Open-source convergence

### Apache Iceberg — preferred first provider

The [Apache Iceberg specification](https://iceberg.apache.org/spec/) already models:

- immutable table metadata versions;
- snapshot IDs;
- manifest lists;
- manifest files;
- data and delete files;
- schema and partition-spec evolution;
- sequence numbers and snapshot references.

DVT should resolve an immutable snapshot and project its metadata into a DVT evidence contract rather than scanning and hashing every row.

### Delta Lake — comparative prior art

The [Delta transaction-log protocol](https://github.com/delta-io/delta/blob/master/PROTOCOL.md) provides add/remove file actions and table versions. It is a later provider candidate, not part of the first issue.

### Merkle manifests

Use canonical child descriptors and a root hash for bounded diff/verification. Do not invent a DVT storage format; the manifest is evidence and dependency structure, not a table format.

### Differential Dataflow

[Differential Dataflow](https://github.com/TimelyDataflow/differential-dataflow) is useful prior art for precise change propagation. It is not a runtime dependency for V1 because DVT first needs bounded partition-preserving profiles within its existing planner/Temporal architecture.

## Initial operator admission

Potentially sound first profiles:

- partition-preserving map/filter/projection;
- append-only union with compatible schema and disjoint/declared partition mapping;
- equi-join only with a proven co-partitioning contract on both inputs.

Global invalidate or reject initially:

- aggregate;
- window;
- sort;
- deduplicate;
- cross join;
- unknown SQL/UDF;
- repartitioning with unproven mapping;
- any operation reading global state or clock/randomness.

This conservative boundary is essential. One changed input partition may affect all outputs for many common operators.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Snapshot contract | High | Provider evolution, deletion and schema semantics. |
| Iceberg adapter | High | Spec/version/catalog/storage coverage and bounded reads. |
| Partition impact | Very high | Hidden cross-partition dependencies. |
| Plan/runtime integration | Very high | Partial outputs, pins and exact replay. |
| Retention | High | External snapshots may expire. |
| Performance | High | Large manifests and verification/diff cost. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Blob content identities | CAS | Dataset/partition root manifest. |
| Pure graph planner | Yes | Partition impact profiles and decisions. |
| External source plugins | Several domains | Immutable Iceberg snapshot evidence provider. |
| Result manifests/pins | Planned S02/S03 | External snapshot descriptor and retention check. |
| Oracle | #2157 discipline | Full-versus-partition recomputation corpus. |
| Columnar formats | Not current production dependency | Provider/library decision and independent reader. |

## Task decomposition

1. [#2510](https://github.com/dunay2/dvt/issues/2510) freezes `DatasetSnapshotManifestV1` and partition identity.
2. [#2511](https://github.com/dunay2/dvt/issues/2511) implements a read-only Apache Iceberg snapshot evidence provider.
3. [#2512](https://github.com/dunay2/dvt/issues/2512) adds governed partition dependency propagation and a differential oracle.

## Implementation sequence

```text
whole-result reuse proven
  -> freeze one dataset snapshot contract
  -> select supported Iceberg spec/catalog/storage boundary
  -> project exact immutable snapshot evidence
  -> benchmark manifest construction/diff/verification
  -> admit partition-preserving operator corpus
  -> integrate immutable partition candidates into plan
  -> compare full vs partition-aware recomputation
```

Do not start with arbitrary warehouse tables. A source without trustworthy immutable snapshot/change identity remains dataset-level miss/full execution.

## Verification corpus

Snapshot mutations:

- append and overwrite;
- data/delete file changes;
- schema evolution;
- partition-spec evolution;
- snapshot branch/tag resolving to different IDs;
- expired or missing snapshot;
- tampered/missing manifest list or manifest;
- unsupported Iceberg spec/content fields;
- unauthorized catalog/storage scope.

Operator mutations:

- map/filter/projection;
- append-only union;
- proven co-partitioned join;
- deliberate unsafe aggregate/window/dedup/UDF cases;
- schema/runtime/profile/global-policy changes.

Release gates:

```text
false-safe partition decision = 0
full-vs-partition-aware observable divergence = 0
unknown operator silently admitted = 0
row-count/timestamp heuristic used as authority = 0
expired external snapshot planned as reusable = 0
```

Measure manifest size/build/diff/verification, provider calls/bytes and useful-work reduction for sparse changes.

## Stop and narrow conditions

Stop at whole-dataset reuse when:

- provider snapshot semantics cannot be retained and independently verified;
- supported operator dependencies cannot be expressed soundly;
- manifest/diff/reconstruction costs erase value;
- an official provider library lacks required spec/platform coverage and a narrow adapter would become a table-format implementation;
- the design attempts universal SQL/UDF dependency analysis.

## Gate result

```text
gateDecision: research-go
gateScope: iceberg-first-and-bounded-partition-profiles
authorizedImplementation: false
deferredUntil:
  - whole-result Materialization Fabric proven
  - S08 bounded plan integration proven
```
