---
title: S10 - Multi-runtime data-plane protocol convergence
status: Deferred conditional GO; no protocol without a named measured consumer
owner: Runtime / Connectors / Security / Performance
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2513, 2514, 2515]
---

# S10 — Multi-runtime data-plane protocol convergence

## Decision

**Deferred conditional GO.** DVT should reuse Apache Arrow, Parquet and related protocols boundary by boundary, only after a named consumer and a measured bottleneck exist.

There is no justified universal “Arrow platform” in the current repository. Data-plane protocols must remain separate from DVT's control-plane identity, plans, events, authorization and materialization evidence.

## Need

DVT may need to move tabular batches among Node, Python, R, Rust/native plugins, remote workers and databases. JSON/JSONL can become expensive for large typed datasets, but each boundary has different requirements:

- same-process trusted native memory exchange;
- local cross-process streaming;
- remote RPC streaming;
- database/warehouse access;
- durable analytical storage.

Selecting one protocol for all boundaries would either lose capabilities or add unnecessary native, network and security complexity.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

The repository audit found no production Apache Arrow JS, Arrow Flight, ADBC, Parquet or Iceberg dependency in the current runtime paths. Current artifact/plugin flows primarily use JSON/JSONL or existing database/object-file boundaries.

DVT already has the authorities that must remain outside the data plane:

- versioned contracts/plans/events;
- plugin admission and Temporal execution;
- tenant/trust authorization and secrets;
- content-addressed artifacts and result manifests;
- connector-specific semantics.

No current product consumer has been demonstrated that requires Arrow C Data, Flight or ADBC. Therefore S10 begins with a benchmark/decision issue, not implementation.

## Boundary-specific candidates

| Boundary | Candidate | Intended role | Primary risk |
|---|---|---|---|
| Trusted same process | Arrow C Data Interface | Share arrays/schema through pointers with minimal copies | Buffer lifetime, ABI and unsafe/untrusted pointers. |
| Local cross process | Arrow IPC stream/file | Typed batch serialization and streaming | Malformed/oversized input, version/type compatibility. |
| Remote service | Arrow Flight / Flight SQL | RPC streaming over Arrow IPC | Auth, mTLS, tenancy, retry and deployment. |
| Database connector | ADBC | Standard Arrow-oriented DB API | Driver/platform coverage, transaction/cancellation semantics. |
| Durable artifact | Parquet | Compressed analytical storage | Writer determinism, schema/logical-type/version differences. |
| Baseline | JSON/JSONL | Existing simple interoperable path | CPU/size/type fidelity at large scale. |

## Architectural fit

```text
DVT control plane
  - InvocationDigest
  - ResultManifest/evidence
  - authorization and secrets
  - plan/event contracts
            |
            v
selected bounded data-plane adapter
  - C Data / IPC / Flight / ADBC / Parquet
            |
            v
runtime or connector consumer
```

Transport/library/protocol versions enter `ExecutionContractDigest` when they can alter results. They never implicitly redefine logical identity or authorize reuse.

## Open-source convergence

### Apache Arrow C Data Interface

[Arrow C Data Interface](https://arrow.apache.org/docs/format/CDataInterface.html) provides a language-neutral ABI for Arrow arrays/schema. It is appropriate only inside a trusted process/native boundary with explicit ownership/release callbacks. Raw pointers are not accepted from untrusted clients or across processes.

### Arrow IPC

[Arrow IPC](https://arrow.apache.org/docs/format/Columnar.html#serialization-and-interprocess-communication-ipc) provides stream/file representations for cross-process batch exchange. DVT must enforce schema, field, batch, buffer and total-size limits and validate untrusted messages before consumption.

### Arrow Flight

[Arrow Flight](https://arrow.apache.org/docs/format/Flight.html) provides RPC streaming around Arrow IPC. It does not provide DVT invocation identity, result validity or tenant authorization. It is introduced only for a named remote worker/service with a complete security/operations model.

### ADBC

[Arrow ADBC](https://arrow.apache.org/adbc/current/) standardizes database connectivity around Arrow. It is evaluated per named provider/driver and does not replace every current connector automatically.

### Parquet

[Apache Parquet](https://parquet.apache.org/) is the candidate durable analytical representation. Physical output remains writer/version/options-bound in V1.

### Substrait

Substrait is explicitly deferred. Portable relational plans require function/type/extension and engine-semantics compatibility beyond a transport decision. It is not necessary for the initial Materialization Fabric.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| C Data | High | Memory ownership/use-after-free and ABI compatibility. |
| IPC | Medium–High | Type fidelity, untrusted input and bounded streaming. |
| Flight | Very high | Remote auth/tenancy/deployment/retry. |
| ADBC | High | Driver/provider/platform coverage and secret/transaction semantics. |
| Parquet | High | Logical types, deterministic metadata and independent readers. |
| Operations | High | Native binaries, container support and version matrix. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| JSON/JSONL artifacts | Yes | Measured baseline across named runtime boundaries. |
| Plugin/connector boundaries | Yes | Arrow/Parquet adapters for approved consumers. |
| Secret/tenant governance | Yes | Flight/ADBC-specific integration/threat proof. |
| Materialization identity/evidence | Planned | Version contributions, never transport-owned identity. |
| Cross-runtime consumers | Potential/future | Named current consumer and deployment target. |
| Type corpus | Partial per connectors | Shared exact interoperability corpus. |

## Task decomposition

1. [#2513](https://github.com/dunay2/dvt/issues/2513) benchmarks and selects protocols per named boundary.
2. [#2514](https://github.com/dunay2/dvt/issues/2514) implements trusted C Data and/or local IPC only for explicit GO decisions.
3. [#2515](https://github.com/dunay2/dvt/issues/2515) independently gates ADBC and Flight for named database/remote consumers.

## Decision benchmark

For each named consumer freeze:

- runtimes/platforms and library versions;
- representative schemas/data sizes;
- current JSON/connector baseline;
- copies, throughput, latency and peak memory;
- backpressure, cancellation and batch sizing;
- null/decimal/timestamp/timezone/nested type fidelity;
- independent implementation interoperability;
- startup/native/container footprint;
- authentication, TLS, authorization and malformed-input handling;
- materiality of transport cost relative to computation;
- integration/maintenance/security cost.

A protocol receives GO only when it removes measured cost or enables a real blocked capability. C Data, IPC, Flight, ADBC and Parquet may receive different decisions.

## Verification requirements

### C Data

- ownership/release on success, error and cancellation;
- no leak, double release or use-after-free;
- trusted-process boundary enforced;
- ABI/runtime/library version compatibility.

### IPC

- independent-runtime round trips;
- malformed, truncated, oversized and unsupported messages reject;
- bounded batches/buffers and cancellation;
- exact governed type/schema fidelity.

### Flight

- mTLS/TLS/auth and tenant/trust isolation;
- deadlines, backpressure, cancellation and retries;
- no plans/secrets in arbitrary Arrow metadata;
- DVT result/evidence contract remains separate.

### ADBC

- driver/provider version coverage;
- parameter binding, transactions and cancellation;
- error mapping and secret-provider integration;
- fallback to current connector where unsupported.

Release gates:

```text
custom DVT binary format introduced = 0
control-plane contracts migrated to Arrow = 0
protocol implemented without named consumer/GO = 0
cross-runtime type/schema divergence = 0 for supported corpus
unbounded untrusted data-plane input = 0
```

## Stop and narrow conditions

Defer or reject a protocol when:

- no named consumer exists;
- current transport is not a material bottleneck;
- maintained libraries lack platform/provider coverage;
- native/deployment/security cost exceeds measured value;
- type fidelity or cancellation cannot meet the frozen contract;
- adoption starts becoming a broad runtime rewrite.

## Gate result

```text
gateDecision: deferred-conditional-go
gateScope: boundary-by-boundary-only
authorizedImplementation: false
blocksOn:
  - named consumer
  - frozen baseline and GO threshold
  - security/deployment review
```
