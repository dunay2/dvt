---
title: DVT Materialization Fabric research programme
status: Draft research proposal
owner: Architecture / Planner / Engine / Artifacts / Research
baseline_commit: c82cfeb733de1c0bed2f869904b8f9252c97db2e
created: 2026-08-19
related_issues:
  - 2152
  - 2154
  - 2156
  - 2157
  - 2158
  - 2159
  - 2161
  - 2171
  - 2185
  - 2473
---

# DVT Materialization Fabric

## Verifiable, exact reuse of heterogeneous executions

## 1. Classification and decision under study

This document is a **research and architecture proposal**, not evidence that result reuse is already delivered.

The decision under study is:

> DVT should execute a step only when it cannot verify that an exact, authorized and still-valid materialization of the same invocation already exists.

The proposed differentiator is not a generic cache and not merely content-addressed storage. It is a **verifiable materialization fabric** that binds a previous result to:

- the exact executable recipe;
- exact input snapshots;
- every relevant execution-contract dependency;
- the output contract and semantic profile;
- immutable result and validation evidence;
- the authorized tenant/trust scope in which reuse is permitted.

A false miss wastes work. A false hit can silently return incorrect data. The design therefore optimizes for **zero false reuse decisions**, not for maximum hit ratio.

This programme extends the existing safe-partial-execution research owned by [#2152](https://github.com/dunay2/dvt/issues/2152). It must not create a second planner, graph model, state authority, artifact store, event model, research registry or user-interface authority.

## 2. Product hypothesis

Current data/workflow systems often provide one or more of the following:

- content-addressed blobs;
- action/result caches;
- state-based selection;
- incremental query execution;
- immutable table snapshots;
- workflow memoization;
- runtime-specific execution evidence.

The candidate DVT contribution is narrower and harder:

> Given a heterogeneous DVT graph, determine and explain when a prior materialization remains exactly reusable across supported runtimes, while failing closed whenever definition, input, environment, effect, scope or evidence is unknown.

The term **proof-carrying** may be used informally in this study, but it does not claim a universal mathematical proof. It means that each reuse decision carries versioned, immutable evidence that a verifier independent from the executor can check.

## 3. Current repository baseline

Baseline inspected: [`main@c82cfeb733de1c0bed2f869904b8f9252c97db2e`](https://github.com/dunay2/dvt/tree/c82cfeb733de1c0bed2f869904b8f9252c97db2e).

The audit confirms that DVT already has important foundations:

| Existing capability | Current authority | Relevance |
|---|---|---|
| Deterministic `ExecutionPlan` construction | `@dvt/planner` + `@dvt/contracts` | Reuse the pure planner and immutable `PlanRef`; do not introduce another plan format. |
| JCS/SHA-based plan identities | planner-local hashing plus `@dvt/crypto` convergence work | Reuse one vetted canonical digest authority after [#2185](https://github.com/dunay2/dvt/issues/2185) resolves current duplication. |
| Content-addressed artifact publication | `@dvt/artifacts` | Extend the existing CAS with bounded read/verify/pin capabilities; do not build another CAS. |
| Tenant-scoped artifact locators and collision verification | S3 CAS adapter | Reuse the security and integrity posture for materialization outputs/manifests. |
| Immutable stored plans and exact `StartRun(PlanRef)` | Plan Store / engine | Planned reuse must be frozen into the exact stored plan, not recomputed inside Temporal. |
| Run/step event truth | engine/state store | Reuse canonical runtime evidence; do not make the cache a second run-state authority. |
| Existing safe-partial-execution research gates | #2152–#2162 | Reuse its oracle, safety, evidence, UI and stop/go protocol. |

The audit also confirms the central gaps:

- no `InvocationDigest` that identifies one exact executable invocation;
- no immutable `ResultManifest` that binds an invocation to verified outputs;
- no materialization index mapping invocation identity to a result manifest;
- no read/verify/pin contract on the current artifact store;
- no lease/fencing protocol for concurrent equivalent producers;
- no governed cross-runtime semantic profile for reuse;
- no first end-to-end vertical proving a cache hit is observationally equivalent to full execution.

Current `planId`, planner input hash and blob SHA-256 values are valid identities for their current domains. None is a substitute for invocation identity.

## 4. Target conceptual model

```text
Recipe identity
      +
Exact input snapshot identities
      +
Execution-contract identity
      +
Output contract + semantic profile
      ↓
InvocationDigest
      ↓
Materialization Index
   ├── verified hit ──> pinned ResultManifest ──> reuse
   ├── producer active ──> wait/single-flight ──> verify/reuse
   └── miss ──> lease/fencing ──> execute ──> publish/verify/index
```

The model separates concerns deliberately:

| Identity / object | Question answered |
|---|---|
| `RecipeDigest` | What exact computation is requested? |
| `InputSnapshotDigest` | What exact state is each input in? |
| `ExecutionContractDigest` | Which runtime/plugin/settings can affect the result? |
| `InvocationDigest` | Is this the same exact executable invocation? |
| `ResultManifestDigest` | Which immutable outputs/evidence satisfy that invocation? |
| `BlobDigest` | Are these physical bytes intact? |
| Optional `LogicalDataDigest` | Are two governed representations logically equivalent? This is later research, not V1. |

The intrinsic invocation identity is separate from authorization. V1 lookups remain tenant/trust-domain scoped, and **cross-tenant reuse is excluded** even when intrinsic digests match.

## 5. Two reuse planes, one semantic authority

### 5.1 Planned reuse

The application resolves current snapshots and candidate materializations, freezes them into immutable planner input, and the pure planner emits explicit run/reuse decisions in the stored plan.

```text
mutable external state
  -> application evidence resolution + verification + retention pin
  -> immutable candidate bundle
  -> pure planner
  -> exact stored PlanRef
  -> runtime executes that exact plan
```

The runtime must not silently re-plan a stored `PlanRef`.

### 5.2 Opportunistic action-result reuse

A step that is still planned to run may race with another identical invocation. The runtime may consult the same materialization authority:

```text
planned RUN
  -> exact InvocationDigest
  -> verified hit: reuse
  -> active producer: wait with fencing
  -> miss: execute and publish
```

This is an optimization only. If the opportunistic index is unavailable, DVT executes normally. If a stored plan explicitly pins a reused result and that result is unavailable or invalid, execution fails the exact plan rather than silently substituting a different decision.

## 6. Non-negotiable invariants

1. **Unknown is never reusable.** Missing, stale, opaque, unsupported or unverifiable evidence resolves to run or typed refusal.
2. **CAS presence is not reuse proof.** A blob digest proves byte identity, not that the bytes satisfy the current invocation.
3. **Successful prior execution is not reuse proof.** Inputs, environment, outputs, effects and evidence must still verify.
4. **Planner purity remains intact.** PostgreSQL, S3, warehouse and provider reads happen before the planner and are frozen as immutable input.
5. **`StartRun(PlanRef)` remains authoritative.** Temporal orchestrates; it does not invent materialization semantics.
6. **Tenant and trust isolation remain explicit.** V1 has no cross-tenant discovery or reuse side channel.
7. **Secrets never enter digest preimages as raw values.** Only governed, non-reversible version/reference evidence may participate when a secret version changes semantics.
8. **Effects are governed, not self-declared.** A plugin cannot opt into reuse with a boolean such as `cacheable: true`.
9. **Compression is orthogonal.** Identity hashes canonical uncompressed semantic bytes; storage/transport may compress without changing identity.
10. **Arrow is a data-plane format, not an identity authority.** Arrow/Parquet/Iceberg may carry or persist data, while DVT manifests and snapshots govern reuse.
11. **No silent compatibility change.** Existing plan, artifact, receipt or persisted hashes keep their current semantics. New materialization identities start with an explicit V1 schema; migrations are deliberate.
12. **Zero false-safe decisions is the primary gate.** Performance value cannot compensate for incorrect reuse.

## 7. Existing ownership and convergence

| Concern | Existing owner to extend | This programme must not duplicate |
|---|---|---|
| Safe partial execution and research gates | [#2152](https://github.com/dunay2/dvt/issues/2152) | Another differentiation epic or research lifecycle. |
| Prior-art/novelty comparison | [#2154](https://github.com/dunay2/dvt/issues/2154) | A promotional tool checklist. |
| Observable semantics/effects | [#2156](https://github.com/dunay2/dvt/issues/2156) | A universal effect framework. |
| Independent oracle/adversarial corpus | [#2157](https://github.com/dunay2/dvt/issues/2157) | A production benchmark database or second engine. |
| Machine-verifiable plan evidence | [#2158](https://github.com/dunay2/dvt/issues/2158) | A mutable proof database. |
| Bounded dbt partial execution | [#2159](https://github.com/dunay2/dvt/issues/2159) | A generic optimizer before the first vertical succeeds. |
| User explanation | [#2161](https://github.com/dunay2/dvt/issues/2161) | Another Plan Preview/Run UI authority. |
| dbt analysis/source identity | [#2171](https://github.com/dunay2/dvt/issues/2171) | A second dbt analyzer or premature cache. |
| Canonical cryptographic primitives | [#2185](https://github.com/dunay2/dvt/issues/2185) | Another hash/canonicalization package. |
| Runtime diagnostic evidence | [#2473](https://github.com/dunay2/dvt/issues/2473) | Another event/log store. |

## 8. Slice-study protocol

Each slice is studied and reviewed independently before implementation. Every slice document must contain:

1. **Need** — the concrete failure/cost that justifies the slice.
2. **Fit** — the exact existing DVT authority and integration seam.
3. **Source audit** — current production code, contracts, tests and gaps at a fixed commit.
4. **Open-source convergence** — standards/libraries/systems to reuse, plus explicit rejection of unnecessary dependencies.
5. **Complexity** — semantic, implementation, migration, operational and security complexity.
6. **What exists / what is missing** — no roadmap item may be presented as delivered.
7. **Implementation boundary** — smallest complete vertical and files/packages likely affected.
8. **Verification** — positive, negative, adversarial, concurrency and performance evidence.
9. **Stop/go decision** — explicit conditions to proceed, narrow, defer or reject.
10. **Dependencies and ownership** — issues/ADRs that must close first or be updated instead of duplicated.

A slice is not Ready because a design can be written. It is Ready only when its identity, evidence, failure semantics, authoritative owner and falsifiable acceptance gates are fixed.

## 9. Slice map

| Slice | Need and result | Main reuse candidates | Initial complexity | Current status |
|---|---|---|---|---|
| S01 — Exact invocation identity | Distinguish one exact executable invocation from plan, run and blob identities. | RFC 8785, SHA-256, `@dvt/crypto`, Bazel REAPI action model, OCI digests. | Semantic **High**; code **Medium**; migration **High**. | **Studied in this PR — conditional GO.** |
| S02 — Immutable result manifest and evidence | Bind invocation, outputs, producer and validation evidence immutably. | Existing contracts/CAS; OCI descriptor ideas; in-toto/SLSA concepts only if needed. | **High**. | Next study. |
| S03 — CAS read, verify and retention pin | Safely retrieve and preserve outputs referenced by plans/manifests. | Existing `@dvt/artifacts`, S3 conditional operations/checksums. | **Medium–High**. | Pending. |
| S04 — Materialization index, lease and fencing | Map invocation to result and prevent duplicate concurrent producers. | PostgreSQL unique constraints/advisory locks/leases; proven fencing-token patterns. | **High**, especially crash consistency. | Pending. |
| S05 — Exact HTTP JSON reuse | First bounded end-to-end hit based on a trusted expected digest. | Existing HTTP JSON downloader and CAS. | **Medium**. | Candidate first implementation vertical. |
| S06 — dbt native-analysis reuse | Avoid repeated `dbt parse` for an identical governed source/runtime identity. | Existing dbt analyzer/snapshots; dbt artifacts; request-scoped then durable evidence if measured. | **High**. | Pending #2171 measurements/identity. |
| S07 — Pure artifact-to-artifact action cache | Prove complete recipe/input/runtime/output reuse under DVT-owned bytes. | CAS, ResultManifest, Arrow IPC/Parquet where useful. | **High**. | Pending S01–S04. |
| S08 — Planned safe partial dbt execution | Reuse exact materializations inside immutable partial plans. | #2156–#2159, dbt state/artifacts, full-execution oracle. | **Very high**. | Research-gated. |
| S09 — Partition and snapshot manifests | Recalculate only affected partitions rather than whole datasets. | Merkle manifests, Iceberg snapshots/manifests, Delta transaction log concepts. | **Very high**. | Later research. |
| S10 — Multi-runtime data plane | Move data efficiently without inventing formats. | Arrow C Data/IPC/Flight, ADBC, Parquet, Iceberg. | **High**. | Later; never an identity prerequisite. |
| S11 — Explanation, retention and quarantine | Make hits/misses/invalidation auditable and handle corruption/GC safely. | Existing Plan Preview, Runs/Console, OBS1, CAS lifecycle. | **High**. | Pending contracts and first vertical. |

Detailed slice documents live beside this index. The first is [S01 — Exact invocation identity](./slice-01-exact-invocation-identity.md).

## 10. Proposed dependency sequence

```text
S01 identity
  ↓
S02 result manifest/evidence
  ↓
S03 CAS read/verify/pin
  ↓
S04 index + lease/fencing
  ↓
S05 exact HTTP JSON vertical
  ├── proves infrastructure and failure semantics
  └── supplies evidence before broader caching

S06 dbt native-analysis reuse
  ↓
S07 pure artifact action cache
  ↓
S08 planned safe partial dbt
  ↓
S09 partition/snapshot reuse
  ↓
S10 broader multi-runtime data plane

S11 explanation/retention/quarantine evolves only from delivered contracts.
```

The sequence is intentionally conservative. No generic materialization subsystem should be implemented before the exact HTTP or artifact vertical proves the contracts and operational protocol.

## 11. Open-source reuse policy

Prefer established specifications and narrow libraries over custom mechanisms:

- [RFC 8785 / JCS](https://www.rfc-editor.org/rfc/rfc8785.html) for canonical JSON preimages;
- [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis) as prior art for separating action identity, action cache and CAS;
- [OCI Image Specification](https://github.com/opencontainers/image-spec) for content descriptors and immutable runtime image digests;
- [Apache Arrow](https://arrow.apache.org/docs/format/Columnar.html), [Parquet](https://parquet.apache.org/) and [Iceberg](https://iceberg.apache.org/spec/) for data-plane and snapshot primitives;
- PostgreSQL and S3 primitives already used by DVT for durable indexing, conditional publication and tenant-scoped storage.

Reuse does not mean importing an entire subsystem. The study must first determine whether DVT needs:

- a protocol concept;
- a test-vector corpus;
- a small library;
- an adapter;
- or no dependency at all.

A dependency is accepted only when it removes more correctness/maintenance risk than it introduces.

## 12. Global success and stop gates

The initial gates inherited from #2152 remain authoritative:

- false-safe reuse decisions: **0**;
- observable divergence in accepted reuse cases: **0**;
- deterministic canonical identity: **100/100** identical evaluations;
- structured evidence coverage for every reuse: **100%**;
- unknown/opaque cases silently reused: **0**;
- median useful-work reduction in designated incremental scenarios: initially **at least 20%**;
- planner overhead at the governed 1,000-node case: within the frozen protocol bound;
- cross-scope materialization leaks or discovery side channels: **0**.

Stop, narrow or defer when:

- exact input/runtime identity cannot be established;
- the oracle cannot detect deliberately unsafe reuse;
- canonicalization is not interoperable across supported runtimes;
- correctness holds but measured value is below the frozen threshold;
- operational complexity exceeds the value of recomputation;
- a mature external system already owns the exact required boundary more safely.

## 13. Evidence posture of this PR

This first PR is documentation-only and commit-bound. Source code and issue ownership were inspected at the baseline above. It does not claim that repository commands, service-backed tests or benchmarks have already been executed for the proposed mechanism.

Each later implementation slice must add executable evidence through the existing DVT test and CI rails rather than treating this document or a merged PR as proof of delivery.
