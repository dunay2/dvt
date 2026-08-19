---
title: DVT Materialization Fabric delivery register
status: Complete research decomposition; implementation not delivered
programme_code: DMF
parent_epic: 2486
study_pr: 2484
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
---

# DMF delivery register

## Purpose

This is the executable issue and dependency register for the DVT Materialization Fabric study. It records every slice, its gate, its self-contained implementation tasks and existing authorities that must be extended rather than duplicated.

Issue naming is deliberately searchable:

```text
[DMF]                    programme epic
[DMF-S<slice>-T<task>]   bounded task
```

Parent epic: [#2486](https://github.com/dunay2/dvt/issues/2486)  
Research parent: [#2152](https://github.com/dunay2/dvt/issues/2152)  
Study PR: [#2484](https://github.com/dunay2/dvt/pull/2484)

## Programme completion boundary

This register completes the **research decomposition**. It does not claim production materialization reuse is implemented.

A task is independently executable only when its issue Definition of Ready is satisfied. Each issue contains bounded scope, source seams, open-source convergence, non-goals, dependencies, Definition of Ready, Definition of Done and required proof.

## Slice gate register

| Slice | Study | Gate | Implementation posture | Tasks |
|---|---|---|---|---|
| S01 — Exact invocation identity | [study](./slice-01-exact-invocation-identity.md) | Conditional GO; blocked | Converge RFC 8785/SHA and freeze exact V1 identity first. | #2487, #2489 |
| S02 — Result manifest/evidence | [study](./slice-02-immutable-result-manifest-and-evidence.md) | Conditional GO | No eligible result before independent verification. | #2490–#2492 |
| S03 — CAS read/verify/pin | [study](./slice-03-cas-read-verify-and-retention-pin.md) | Conditional GO | Extend existing CAS only. | #2493–#2495 |
| S04 — Index/lease/fencing | [study](./slice-04-materialization-index-lease-and-fencing.md) | Conditional GO | PostgreSQL index; no long transaction/exactly-once claim. | #2496–#2498 |
| S05 — HTTP JSON exact reuse | [study](./slice-05-http-json-exact-reuse.md) | GO after prerequisites | First production vertical. | #2499–#2501 |
| S06 — dbt native-analysis reuse | [study](./slice-06-dbt-native-analysis-reuse.md) | Conditional GO | Blocked by #2171 complete identity/convergence. | #2502, #2504, #2505 |
| S07 — Pure artifact transform | [study](./slice-07-pure-artifact-action-result-reuse.md) | Experiment GO | Benchmark Arrow/Parquet/DuckDB before dependency/implementation. | #2506–#2508 |
| S08 — Planned safe partial dbt | [study](./slice-08-planned-safe-partial-dbt-execution.md) | Research-gated GO | Reuse #2156–#2159; one new integration task. | #2509 |
| S09 — Partition/snapshot reuse | [study](./slice-09-dataset-snapshot-and-partition-manifests.md) | Research GO; deferred | Iceberg first; bounded operators only. | #2510–#2512 |
| S10 — Multi-runtime data plane | [study](./slice-10-multi-runtime-data-plane.md) | Deferred conditional GO | No Arrow/ADBC/Flight without named measured consumer. | #2513–#2515 |
| S11 — Outcomes/lifecycle/explanation | [study](./slice-11-outcomes-lifecycle-and-explanation.md) | Conditional GO | Outcome contract early; lifecycle/UI follow core contracts. | #2516–#2518 |

## Complete issue register

### S01 — Exact invocation identity

- [ ] [#2487 — Freeze `MaterializationInvocationIdentityV1` and golden vectors](https://github.com/dunay2/dvt/issues/2487)
- [ ] [#2489 — Implement the trusted-artifact invocation identity provider](https://github.com/dunay2/dvt/issues/2489)

Existing prerequisite: [#2185](https://github.com/dunay2/dvt/issues/2185) and its normative-vector/convergence tasks, including #2191.

### S02 — Immutable result manifest and evidence

- [ ] [#2490 — Freeze `ResultManifestV1` and immutable result evidence](https://github.com/dunay2/dvt/issues/2490)
- [ ] [#2491 — Implement independent verifier and corruption corpus](https://github.com/dunay2/dvt/issues/2491)
- [ ] [#2492 — Define atomic result publication and manifest compatibility](https://github.com/dunay2/dvt/issues/2492)

### S03 — CAS read, verify and retention pin

- [ ] [#2493 — Add tenant-scoped content-addressed read and verify ports](https://github.com/dunay2/dvt/issues/2493)
- [ ] [#2494 — Implement bounded S3 integrity verification](https://github.com/dunay2/dvt/issues/2494)
- [ ] [#2495 — Add retention pins and safe release semantics](https://github.com/dunay2/dvt/issues/2495)

### S04 — Materialization index, lease and fencing

- [ ] [#2496 — Add a scope-safe PostgreSQL materialization index](https://github.com/dunay2/dvt/issues/2496)
- [ ] [#2497 — Add lease, monotonic fencing and single-flight production](https://github.com/dunay2/dvt/issues/2497)
- [ ] [#2498 — Prove crash consistency and stale-producer rejection](https://github.com/dunay2/dvt/issues/2498)

### S05 — Exact HTTP JSON reuse

- [ ] [#2499 — Reuse exact HTTP JSON artifacts before network acquisition](https://github.com/dunay2/dvt/issues/2499)
- [ ] [#2500 — Integrate HTTP production with lease, manifest and fenced confirmation](https://github.com/dunay2/dvt/issues/2500)
- [ ] [#2501 — Prove HTTP JSON exact reuse end to end](https://github.com/dunay2/dvt/issues/2501)

### S06 — dbt native-analysis reuse

- [ ] [#2502 — Freeze and persist a complete `NativeAnalysisManifest`](https://github.com/dunay2/dvt/issues/2502)
- [ ] [#2504 — Reuse verified dbt native analysis across bounded operations](https://github.com/dunay2/dvt/issues/2504)
- [ ] [#2505 — Prove dbt analysis invalidation and measured value](https://github.com/dunay2/dvt/issues/2505)

Existing authority: [#2171](https://github.com/dunay2/dvt/issues/2171).

### S07 — Pure managed-artifact action-result reuse

- [ ] [#2506 — Define a pure managed-artifact transform profile](https://github.com/dunay2/dvt/issues/2506)
- [ ] [#2507 — Benchmark Arrow IPC, Parquet and DuckDB](https://github.com/dunay2/dvt/issues/2507)
- [ ] [#2508 — Implement pure artifact-to-artifact action-result reuse](https://github.com/dunay2/dvt/issues/2508)

### S08 — Planned safe partial dbt execution

- [ ] [#2509 — Integrate pinned materialization reuse into immutable `ExecutionPlan`](https://github.com/dunay2/dvt/issues/2509)

Existing authorities intentionally reused instead of duplicated: [#2156](https://github.com/dunay2/dvt/issues/2156), [#2157](https://github.com/dunay2/dvt/issues/2157), [#2158](https://github.com/dunay2/dvt/issues/2158), [#2159](https://github.com/dunay2/dvt/issues/2159) and [#2161](https://github.com/dunay2/dvt/issues/2161).

### S09 — Dataset snapshot and partition manifests

- [ ] [#2510 — Freeze `DatasetSnapshotManifestV1` and partition identity](https://github.com/dunay2/dvt/issues/2510)
- [ ] [#2511 — Implement an Apache Iceberg snapshot evidence provider](https://github.com/dunay2/dvt/issues/2511)
- [ ] [#2512 — Add partition dependency propagation and differential oracle](https://github.com/dunay2/dvt/issues/2512)

### S10 — Multi-runtime data plane

- [ ] [#2513 — Benchmark and select protocols per named boundary](https://github.com/dunay2/dvt/issues/2513)
- [ ] [#2514 — Implement trusted Arrow C Data and cross-process IPC adapters](https://github.com/dunay2/dvt/issues/2514)
- [ ] [#2515 — Gate ADBC and Arrow Flight behind measured needs](https://github.com/dunay2/dvt/issues/2515)

### S11 — Outcomes, lifecycle and explanation

- [ ] [#2516 — Add explicit reused execution outcomes and evidence contracts](https://github.com/dunay2/dvt/issues/2516)
- [ ] [#2517 — Add quarantine, retention and garbage-collection policy](https://github.com/dunay2/dvt/issues/2517)
- [ ] [#2518 — Add observability and user explanation projections](https://github.com/dunay2/dvt/issues/2518)

Existing UI/diagnostic authorities: [#2161](https://github.com/dunay2/dvt/issues/2161) and [#2473](https://github.com/dunay2/dvt/issues/2473).

## Dependency graph

```text
#2185/#2191
    -> S01 T01 -> S01 T02
                    |
                    v
             S02 T01 -> S03 T01/T02
                    |          |
                    v          v
                 S02 T02 <- verified artifact observations
                    |
           S03 T03 + S04 T01 -> S04 T02
                    \           /
                     -> S02 T03
                           |
                           v
                       S04 T03
                           |
             +-------------+--------------+
             |                            |
             v                            v
      S11 T01 outcome contract       S05 HTTP vertical
                                          |
                                          v
                                     S05 E2E proof
                                          |
             +----------------------------+------------------+
             |                                               |
             v                                               v
      S06 dbt analysis                              S07 pure transform
             |                                               |
             +--------------------+--------------------------+
                                  v
                    S08 planned pinned reuse
                                  |
                                  v
                    S09 dataset/partition reuse

S10 is independently activated only by named measured consumers.
S11 T02/T03 follow index/pin/outcome contracts and extend existing lifecycle/UI authorities.
```

## Critical path

The minimum safe route to first value is:

1. #2185/#2191 canonical cryptographic convergence;
2. #2487 and #2489 exact trusted-artifact identity;
3. #2490–#2492 result manifest/verifier/publication;
4. #2493–#2495 CAS verification and pins;
5. #2496–#2498 index, fencing and crash proof;
6. #2516 canonical reused-success outcome;
7. #2499–#2501 exact HTTP JSON vertical and E2E proof.

No dbt, Arrow, Iceberg, partition or remote-data-plane work is on the first critical path.

## Existing authorities reused

| Responsibility | Existing owner |
|---|---|
| Research stop/go and value gates | #2152, #2154 |
| Effects/observable semantics | #2156 |
| Independent oracle/adversarial corpus | #2157 |
| Machine-verifiable plan evidence | #2158 |
| Bounded safe partial dbt execution | #2159 |
| User explanation | #2161 |
| dbt source/analyzer convergence | #2171 |
| Canonical cryptographic primitives | #2185 |
| Runtime diagnostic evidence | #2473 |

## Programme release gates

```text
false-safe reuse decisions = 0
accepted full-vs-reused observable divergence = 0
reuse with missing/unsupported evidence = 0
eligible index row with absent/corrupt output = 0
stale producer confirmed after fence takeover = 0
cross-scope hit or existence disclosure = 0
active/shared referenced output collected = 0
```

Performance/value gates remain those frozen by #2152. A correctness-safe but low-value slice may be disabled, narrowed or stopped.

## Research decomposition closeout

- [x] Every S01–S11 slice has a source-grounded study.
- [x] Every slice has an explicit gate and stop/narrow conditions.
- [x] Every slice has an identifiable task owner set.
- [x] All 30 new tasks are self-contained and linked to #2486/#2484.
- [x] Existing issue authorities are reused instead of duplicated.
- [x] The critical path and first production vertical are explicit.
- [x] Open-source candidates are adopted only at bounded seams and with evidence gates.
- [ ] Production implementation and executable evidence — intentionally owned by the open child issues, not claimed by this research PR.
