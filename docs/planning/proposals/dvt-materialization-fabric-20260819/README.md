---
title: DVT Materialization Fabric research programme
status: Complete slice study; implementation gated
owner: Architecture / Planner / Engine / Artifacts / Research
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
programme_epic: 2486
study_pr: 2484
parent_research_epic: 2152
---

# DVT Materialization Fabric

## Verifiable exact reuse of heterogeneous executions

## Decision under study

> DVT should execute a step only when it cannot verify that an exact, authorized and still-valid materialization of the same invocation already exists.

This is not a generic cache and not merely content-addressed storage. The proposed product boundary binds a prior result to:

- the exact executable recipe;
- exact input snapshots;
- every result-affecting execution-contract dependency;
- the output contract and governed semantic profile;
- immutable result and validation evidence;
- output presence, integrity, retention and quarantine state;
- the authorized tenant/trust scope.

A false miss wastes work. A false hit can silently return incorrect data. The primary design objective is therefore **zero false-safe reuse decisions**, not maximum hit ratio.

The research decomposition is complete in [#2486](https://github.com/dunay2/dvt/issues/2486) and this PR. Production implementation is not claimed.

## Product hypothesis

Mature systems already provide individual pieces:

- Bazel action caches and content-addressed storage;
- Nix content-addressed/reproducible outputs;
- dbt state/defer and artifacts;
- workflow memoization;
- immutable Iceberg snapshots/manifests;
- Arrow/Parquet data-plane formats;
- incremental runtimes such as Differential Dataflow.

The candidate DVT contribution is narrower and harder:

> Verify and explain whether a prior result remains exactly reusable across supported heterogeneous data/runtime boundaries, while failing closed whenever definition, input, environment, effect, scope or evidence is unknown.

“Proof-carrying” is used informally: each reuse carries versioned immutable evidence independently checkable by DVT. It is not a claim of universal mathematical proof.

## Repository baseline and existing foundations

Source audit baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

| Existing capability | Current authority | Decision |
|---|---|---|
| Deterministic `ExecutionPlan` / `PlanRef` | `@dvt/planner`, `@dvt/contracts`, Plan Store | Preserve planner purity and exact stored-plan execution. |
| Plan/input/blob hashes | Planner, crypto, artifacts | Keep current meanings; none is an `InvocationDigest`. |
| Canonical crypto convergence | #2185 / #2191 | Reuse one proven RFC 8785 + SHA-256 authority. |
| Tenant-scoped CAS publication | `@dvt/artifacts`, S3 adapter | Extend with bounded read/verify/pin; do not build another CAS. |
| HTTP JSON trusted descriptors | HTTP JSON plugin | First exact production reuse vertical. |
| PostgreSQL state/concurrency patterns | State-store adapters, snapshot work queue | Reuse transactions/`SKIP LOCKED`; add real monotonic fencing. |
| dbt native analyzer | #2171 / `DbtCliProjectAnalyzer` | Reuse complete analysis result; no second analyzer/cache. |
| Canonical run events/read models | Engine/state/Web | Add explicit reused-success outcome; never reinterpret `StepSkipped`. |
| Safe partial-execution research | #2152–#2162 | Reuse semantics, oracle, evidence, UI and stop/go rails. |

Central missing seams:

- versioned exact `InvocationDigest`;
- immutable `ResultManifest` and independent verifier;
- tenant-scoped CAS read/verify and retention pins;
- materialization index and single-flight fencing;
- explicit reused-success event/evidence;
- first E2E vertical proving full-versus-reused equivalence.

## Target architecture

```text
RecipeDigest
+ exact InputSnapshotDigest[]
+ ParametersDigest
+ ExecutionContractDigest
+ OutputContractDigest
+ governed SemanticProfile
          |
          v
     InvocationDigest
          |
          v
scope-safe Materialization Index
   | verified hit        | active producer         | miss
   v                     v                         v
ResultManifest      wait/recheck              lease/fence
   |                     |                         |
verify outputs/pin       +-----------+-------------+
   |                                 v
reuse success                  execute/publish
                                      |
                               independent verify
                                      |
                               fenced index confirm
```

Identity domains remain separate:

```text
InvocationDigest       -> exact requested computation
ResultManifestDigest   -> immutable action-to-output/evidence binding
BlobDigest             -> physical-byte integrity
PlanId                  -> canonical plan identity
Run/step IDs            -> execution-attempt identity
```

Authorization is separate from intrinsic identity. V1 lookup and reuse remain tenant/trust-domain scoped; cross-tenant reuse/discovery is excluded.

## Planned and opportunistic reuse

### Planned pinned reuse

Mutable candidates are resolved, authorized, verified and pinned before the pure planner. The immutable stored plan references the exact result/evidence/pin. Runtime executes that exact `PlanRef`; it does not silently re-plan.

### Opportunistic reuse

A step still planned to run may find an exact verified result or wait for another identical producer. Index/lease failure falls back to ordinary execution when policy permits. This optimization never changes stored plan truth.

## Non-negotiable invariants

1. Unknown, opaque, unsupported or unverifiable is never reusable.
2. CAS presence and successful prior execution are not reuse proof.
3. Planner performs no PostgreSQL, S3, HTTP, dbt or warehouse reads.
4. `StartRun(PlanRef)` remains authoritative.
5. Effects are governed; plugins cannot self-declare `cacheable: true`.
6. Raw secrets never enter digest preimages, events or metrics.
7. Compression and Arrow/Parquet representation are orthogonal to semantic identity.
8. A stale producer cannot confirm after losing its fencing epoch.
9. A result is eligible only after complete independent verification.
10. Reuse is successful result satisfaction, never `StepSkipped`.
11. Existing persisted identities retain their documented meanings.
12. False-safe decisions are release blockers regardless of performance.

## Slice studies

| Slice | Study | Gate | Tasks |
|---|---|---|---|
| S01 — Exact invocation identity | [study](./slice-01-exact-invocation-identity.md) · [implementation plan](./slice-01-exact-invocation-identity-implementation-plan.md) · [validation](./slice-01-exact-invocation-identity-validation.md) · [manifest](./slice-01-exact-invocation-identity.manifest.json) | Conditional GO; implementation blocked | #2487, #2489 |
| S02 — Result manifest/evidence | [study](./slice-02-immutable-result-manifest-and-evidence.md) | Conditional GO | #2490–#2492 |
| S03 — CAS read/verify/pin | [study](./slice-03-cas-read-verify-and-retention-pin.md) | Conditional GO | #2493–#2495 |
| S04 — Index/lease/fencing | [study](./slice-04-materialization-index-lease-and-fencing.md) | Conditional GO | #2496–#2498 |
| S05 — Exact HTTP JSON reuse | [study](./slice-05-http-json-exact-reuse.md) | GO after prerequisites; first vertical | #2499–#2501 |
| S06 — dbt native-analysis reuse | [study](./slice-06-dbt-native-analysis-reuse.md) | Conditional GO; blocked by #2171 | #2502, #2504, #2505 |
| S07 — Pure artifact transform | [study](./slice-07-pure-artifact-action-result-reuse.md) | Experiment GO; benchmark-gated | #2506–#2508 |
| S08 — Planned safe partial dbt | [study](./slice-08-planned-safe-partial-dbt-execution.md) | Research-gated through #2156–#2159 | #2509 |
| S09 — Dataset/partition manifests | [study](./slice-09-dataset-snapshot-and-partition-manifests.md) | Research GO; deferred | #2510–#2512 |
| S10 — Multi-runtime data plane | [study](./slice-10-multi-runtime-data-plane.md) | Deferred conditional GO | #2513–#2515 |
| S11 — Outcomes/lifecycle/explanation | [study](./slice-11-outcomes-lifecycle-and-explanation.md) | Conditional GO; outcome contract early | #2516–#2518 |

Complete issue/dependency register: [DMF delivery register](./delivery-register.md).

## Critical path to first production value

```text
#2185/#2191 crypto convergence
  -> S01 exact identity
  -> S02 manifest/verifier/publication
  -> S03 CAS verification/pins
  -> S04 index/fencing/crash proof
  -> S11 explicit reused-success outcome
  -> S05 HTTP JSON exact reuse
  -> S05 E2E oracle and value gate
```

No dbt execution, Arrow, Iceberg, partition or Flight/ADBC implementation belongs on the first critical path.

## Open-source convergence policy

Prefer mature standards and bounded adapters:

- [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) and SHA-256 for canonical identity;
- [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis) for action/cache/CAS separation;
- [OCI descriptors](https://github.com/opencontainers/image-spec/blob/main/descriptor.md) for immutable content/runtime descriptors;
- [in-toto attestation statement](https://github.com/in-toto/attestation) concepts for digest subjects and typed evidence;
- PostgreSQL transactions/constraints/locking and existing DVT tenant patterns;
- S3 conditional writes/streaming verification;
- official dbt artifacts/state/parsing contracts;
- Apache Arrow, Parquet, Iceberg and ADBC/Flight only at the data-plane/provider seams justified by each study.

Reuse may mean adopting a specification, test corpus, small library or adapter—not importing an entire subsystem.

Explicitly rejected for V1:

- custom DVT binary encoder or hash algorithm;
- another CAS, planner, analyzer, event store or scheduler;
- global/cross-tenant cache;
- URL/table/timestamp/row-count reuse heuristics;
- universal SQL equivalence;
- record-level incremental runtime before partition evidence is proven;
- Arrow as plans/events/control-plane identity;
- Flight/ADBC without a named measured consumer.

## Programme gates

Correctness and security:

```text
false-safe reuse decisions = 0
accepted full-vs-reused observable divergence = 0
reuse without complete supported evidence = 0
eligible index row with absent/corrupt output = 0
stale producer confirmed after takeover = 0
cross-scope hit/existence disclosure = 0
active/shared referenced output collected = 0
opaque/effectful case silently reused = 0
```

Determinism and evidence:

```text
canonical identity repeatability = 100/100
structured evidence coverage for accepted reuse = 100%
unknown versions fail closed
```

Value gates are frozen before experiments through #2152. A safe but low-value slice is disabled, narrowed or stopped.

## Existing authority map

| Concern | Existing owner |
|---|---|
| Research lifecycle/value/novelty | #2152, #2154 |
| Effects and observable semantics | #2156 |
| Independent oracle/adversarial corpus | #2157 |
| Plan evidence | #2158 |
| Bounded safe partial dbt | #2159 |
| User explanation | #2161 |
| dbt source/analyzer convergence | #2171 |
| Canonical cryptographic primitives | #2185 |
| Runtime diagnostic evidence | #2473 |

## Evidence posture

This PR is documentation/research and issue decomposition. It records source inspection at the stated baseline and formal implementation gates. It does not claim that Materialization Fabric production code, service-backed tests or benchmarks have already been delivered.

Every implementation issue requires executable proof through existing DVT CI/service-backed rails. A merged research PR or completed checklist is not runtime evidence.
