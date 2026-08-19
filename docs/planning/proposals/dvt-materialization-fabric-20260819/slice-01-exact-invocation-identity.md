---
title: S01 - Exact invocation identity
status: Conditional GO; blocked before implementation
owner: Architecture / Contracts / Planner / Crypto
baseline_commit: c82cfeb733de1c0bed2f869904b8f9252c97db2e
created: 2026-08-19
parent: ./README.md
primary_dependencies:
  - 2152
  - 2154
  - 2156
  - 2185
---

# S01 — Exact invocation identity

## 1. Decision summary

**Decision:** proceed with the slice design, but do not implement materialization lookup or result reuse yet.

**Conditional GO:** DVT needs a new, versioned `InvocationDigest` domain identity. It must reuse the single canonical JCS/SHA-256 authority that survives [#2185](https://github.com/dunay2/dvt/issues/2185), not create another hashing utility.

**Blockers before implementation:**

1. prove one RFC 8785-compatible canonical byte sequence across the supported Node/browser/runtime consumers;
2. converge planner-local and shared canonicalization through #2185/#2191 or reuse their exact accepted design;
3. freeze the V1 preimage schema and field semantics in an ADR/contract decision;
4. define authoritative providers for recipe, input-snapshot and execution-contract identity in the first bounded vertical;
5. freeze mutation/golden vectors before building a materialization index.

The identity contract is infrastructure for safe reuse, but it is not itself proof that a result remains reusable.

## 2. Need

DVT currently has several valid hashes, each answering a different question:

| Existing value | Current question | Why it is insufficient for materialization reuse |
|---|---|---|
| `inputHashSha256` | Was this normalized planner input the same? | Includes graph/selection/policy input, not exact external data snapshots or a complete execution environment. |
| `planId` | Is this the same canonical `PlanCore`? | Identifies a stored plan, not one step invocation and not its materialized result. |
| `pluginCompatibilityFingerprint` | Are the planned kinds/config-key sets compatible? | Current preimage uses kinds and configuration **keys**, not configuration values, implementation bytes or runtime semantics. |
| artifact SHA-256 | Are these physical output bytes identical? | Does not prove which action produced the bytes or that they satisfy the current invocation. |
| run/step IDs | Which execution attempt is this? | Operational identity is intentionally unique, not content-addressed. |

Without an exact invocation identity, a materialization lookup would eventually depend on weak proxies such as node ID, URL, table name, source timestamp or successful prior run. Any of those can produce a false hit.

The required question is:

> Are the requested recipe, all semantically relevant inputs, the effective runtime contract and the expected output semantics exactly compatible with the result already stored?

## 3. Fit with current DVT architecture

The slice fits the existing authority model without changing `ExecutionPlan` identity:

```text
@dvt/contracts
  -> owns the versioned serializable invocation identity shape

@dvt/crypto
  -> owns vetted JCS bytes + SHA-256 primitive only

materialization domain component (future bounded owner)
  -> selects and orders identity fields
  -> validates semantic completeness
  -> builds InvocationDigest

application/provider resolvers
  -> resolve exact source/runtime/plugin/snapshot evidence before planning

@dvt/planner
  -> receives immutable resolved evidence
  -> remains pure and deterministic
```

The domain owner decides **what** belongs in the digest preimage. `@dvt/crypto` decides only **how** canonical bytes are produced and hashed.

No change is proposed to current `planId`, `inputHashSha256`, artifact hash or persisted receipt semantics. V1 invocation identity is a new contract with no compatibility alias to earlier informal hashes.

## 4. Current source audit

Baseline: [`c82cfeb733de1c0bed2f869904b8f9252c97db2e`](https://github.com/dunay2/dvt/tree/c82cfeb733de1c0bed2f869904b8f9252c97db2e).

### 4.1 Planner identity is deterministic but plan-scoped

[`PlanAssembler.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/planner/src/domain/PlanAssembler.ts) currently:

- normalizes graph, selection, decision scope and policies;
- computes `inputHashSha256` from that canonical planner input;
- computes a compatibility fingerprint from step IDs, kinds and sorted `stepTypeConfig` keys;
- builds `PlanCore`;
- computes `planId` from canonical `PlanCore`;
- keeps creation time outside the hashed core.

This is the correct separation for plan determinism. It must not be stretched into invocation/result identity.

### 4.2 Planner canonicalization has a direct implementation dependency

[`packages/@dvt/planner/src/domain/hashing.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/planner/src/domain/hashing.ts) uses the `json-canonicalize` dependency and WebCrypto SHA-256.

[`packages/@dvt/planner/package.json`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/planner/package.json) therefore owns a direct canonicalization dependency instead of consuming the shared `@dvt/crypto` package.

### 4.3 A shared crypto package exists, but convergence is incomplete

The physical workspace [`packages/@dvt/canonical`](https://github.com/dunay2/dvt/tree/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/canonical) publishes the package name `@dvt/crypto`.

It exposes:

- [`jcsCanonicalize`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/canonical/src/jcs.ts);
- [`sha256Hex`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/canonical/src/sha256.ts).

The current handwritten object-key ordering uses `localeCompare`. RFC 8785 requires property-name sorting on the raw strings as arrays of unsigned UTF-16 code units and explicitly makes the comparison independent of locale. This does not by itself prove a production collision, but it is enough to classify the current implementation as **not yet proven RFC 8785-conformant for identity-critical use**.

The current test file covers useful basic behavior, but not the complete RFC number/string/property-order vectors, invalid Unicode cases or cross-implementation parity.

Engine wrappers already consume `@dvt/crypto` in places such as [`packages/@dvt/engine/src/utils/jcs.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/engine/src/utils/jcs.ts), while planner remains on the direct library path. This is precisely the convergence problem already owned by #2185.

### 4.4 Existing artifact storage is content-addressed, not action-addressed

[`IContentAddressedArtifactStore.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/artifacts/src/contentAddressed/IContentAddressedArtifactStore.ts) currently exposes publication, not materialization lookup.

[`S3ContentAddressedArtifactStore.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/artifacts/src/contentAddressed/S3ContentAddressedArtifactStore.ts) already provides a strong seed:

- tenant-scoped object locations;
- caller-supplied SHA/size/media-type verification;
- conditional create;
- collision-path readback and integrity validation.

This proves DVT already understands physical content identity. It does not provide an action key or prove that a blob satisfies an invocation.

### 4.5 Existing contracts deliberately separate ownership and plan identity

[`ExecutionPlan.v1.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts) keeps tenant/project/environment ownership as authorization-relevant metadata that does not alter `planId`.

[`ADR-0042`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/docs/adr/ADR-0042-execution-plan-canonical-identity-unification.md) also separates the canonical `PlanCore` identity from schema/contract versions and timestamps.

Invocation identity should follow the same discipline: intrinsic semantic identity and scope authorization remain separate concepts, while V1 index lookup is still scope-bound.

## 5. Open-source and standards convergence

### 5.1 RFC 8785 / JCS — adopt as the canonical preimage rule

[RFC 8785](https://www.rfc-editor.org/rfc/rfc8785.html) exists specifically so cryptographic operations can hash a repeatable JSON representation. It constrains values to I-JSON, uses ECMAScript primitive serialization and defines deterministic property sorting.

**Decision:** use RFC 8785-compatible canonical JSON for V1 identity preimages.

**Do not:** invent a DVT JSON encoder, Unicode normalizer, numeric representation or key-ordering scheme.

**Required convergence:** one vetted implementation behind `@dvt/crypto`, tested against the RFC/cross-language corpus. Whether the surviving code internally uses the current `json-canonicalize` dependency, another established implementation or a corrected local wrapper is a #2185 decision based on conformance, maintenance and browser/Node support.

### 5.2 SHA-256 — retain as the V1 digest algorithm

SHA-256 is already used by planner and artifact identity and is interoperable across Node/WebCrypto/S3/OCI tooling.

**Decision:** retain SHA-256 for V1. Algorithm agility is represented in the digest contract, but no BLAKE3/MD5/dual-hash migration is justified for this slice.

Proposed digest value object:

```ts
type ContentDigestV1 = {
  algorithm: 'sha256';
  hex: string;
};
```

The value object prevents naked strings from being confused across domains, but it does not create a generic `hashAnything()` domain service.

### 5.3 Bazel Remote Execution API — reuse the action-model separation

The [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto) defines an `Action` that captures the information needed to reproduce an execution, identifies it by the digest of its encoded form, stores bytes in a CAS, and maps action digests to `ActionResult` through a separate Action Cache.

DVT should borrow the separation:

```text
InvocationDigest != ResultManifestDigest != BlobDigest
Materialization Index != CAS
```

DVT should **not** import the complete REAPI protocol in V1. Build-system file trees and command-line actions do not directly model mutable warehouse snapshots, dbt semantics, effect classes or DVT scope/evidence.

### 5.4 OCI descriptors — reuse immutable runtime image identity

The [OCI Image Specification](https://github.com/opencontainers/image-spec) uses content descriptors containing media type, digest and byte size, with content linked through a Merkle DAG.

When a container image can alter a result, DVT should use the immutable OCI manifest/config digest rather than a mutable tag such as `latest`.

OCI identity is one input to `ExecutionContractDigest`; it does not replace the full DVT invocation model.

### 5.5 Property-based and cross-implementation testing

A property-based library such as [`fast-check`](https://github.com/dubzzz/fast-check) may help generate JSON values and mutation cases, but it is not required to establish RFC conformance. The first authority is the normative RFC corpus plus explicit golden vectors shared by every supported runtime.

**Decision:** add `fast-check` only if it materially reduces hand-written mutation coverage and package cost is accepted. Do not introduce it merely because the problem involves hashes.

### 5.6 Rejected for V1

| Candidate | Decision | Reason |
|---|---|---|
| Custom binary encoder/CBOR canonicalization | Reject | Adds a second serialization problem before JSON identity is proven. |
| Protobuf as the invocation identity | Defer | Useful for stable protocols only after field semantics are frozen; wire compatibility does not solve semantic completeness. |
| BLAKE3 | Reject for V1 | No demonstrated need; SHA-256 interoperability is stronger in current DVT/tooling. |
| Runtime object serialization | Reject | Property order, prototypes, undefined values and implementation details are not a stable protocol. |
| SQL text equivalence/AST hashing | Reject for S01 | Exact normalized recipe identity is feasible; semantic SQL equivalence is a separate research problem. |
| Whole Bazel REAPI implementation | Reject | Excess mechanism and incorrect domain assumptions for the first vertical. |

## 6. Proposed V1 identity model

### 6.1 Contract shape

Illustrative contract; names remain provisional until the ADR/contract review:

```ts
type MaterializationInvocationIdentityV1 = {
  identityKind: 'dvt.materialization.invocation';
  identityVersion: '1';

  recipeDigest: ContentDigestV1;

  inputs: readonly {
    port: string;
    snapshotDigest: ContentDigestV1;
  }[];

  parametersDigest: ContentDigestV1;
  executionContractDigest: ContentDigestV1;
  outputContractDigest: ContentDigestV1;

  semanticProfile: {
    profileId: string;
    profileVersion: string;
  };
};
```

```text
InvocationDigest
  = SHA-256(
      UTF-8(
        JCS(MaterializationInvocationIdentityV1)
      )
    )
```

The complete object is stored or reproducibly available for evidence. A digest without a versioned preimage schema is insufficient for diagnosis and compatibility.

### 6.2 RecipeDigest

The recipe identity should include only facts that can change what is computed:

- governed step kind and version;
- normalized executable source or compiled-source digest;
- complete semantic configuration values;
- named input/output port contract;
- dependency/lock identity relevant to the recipe;
- semantic-profile identity;
- plugin recipe-schema version.

It excludes display name, node coordinates, workbench focus, run selection UI state, author, timestamps and telemetry.

Exact normalization is step-specific and governed. SQL/dbt/Python/HTTP must not share a fake universal normalizer.

### 6.3 InputSnapshotDigest

Each input must resolve to an immutable or independently verifiable snapshot identity before reuse can be considered.

Examples for later slices:

| Input type | Candidate authoritative identity |
|---|---|
| DVT-managed artifact | CAS digest + manifest contract. |
| HTTP resource | Trusted expected body digest; URL/ETag alone is insufficient for the first vertical. |
| dbt project | Source-revision/content-set identity + analyzer/version evidence. |
| Iceberg table | Exact snapshot ID plus governed metadata/manifest identity. |
| Warehouse table without snapshots | Not reusable until a valid provider-specific snapshot/change identity exists. |

Input order is semantic by named port. The contract canonicalizes a deterministic port ordering and rejects duplicate ports.

### 6.4 ExecutionContractDigest

The execution contract captures everything outside recipe/input bytes that can alter the result:

- plugin implementation digest/version;
- runtime/container image digest;
- dbt/runtime/adapter versions;
- dependency lockfile or environment identity;
- database engine semantic version where relevant;
- timezone, locale, collation and session variables when the profile declares them material;
- governed feature/policy version;
- deterministic random seed only when the supported profile explicitly permits seeded computation.

It excludes worker ID, run ID, attempt number, queue, wall-clock timestamp, trace/span IDs and retry telemetry unless a bounded semantic profile proves one changes the result.

A mutable image tag, package range or unversioned plugin name is not sufficient.

### 6.5 ParametersDigest

Parameters are separated from the recipe so DVT can explain whether a miss came from changed code/config or changed invocation data.

The domain contract must classify parameters that affect results. Operational controls such as timeout may belong to execution policy rather than semantic identity unless timeout can change the accepted output/result contract.

### 6.6 OutputContractDigest

A previous result is reusable only when the current consumer accepts the same output contract:

- output names/ports;
- media/schema contract;
- compatibility profile/version;
- relevant nullability/order/partition semantics;
- validation policy required before publication.

The output contract digest does not hash the output bytes; those belong in the `ResultManifest`/blob identities.

### 6.7 Semantic profile

A governed semantic profile states whether exact reuse is permitted and which identity/evidence fields are mandatory for one specific step family.

Example classes for later #2156 work:

```text
pure-managed-artifact-v1
snapshot-deterministic-sql-v1
validity-bounded-analysis-v1
effectful-never-reuse-v1
opaque-v1
```

These are not plugin self-assertions. Unsupported or unknown profile versions fail closed.

## 7. Scope, tenancy and secrets

### 7.1 Intrinsic digest versus lookup scope

The same intrinsic invocation may exist in two tenants, but V1 index keys and authorization checks remain scope-bound:

```text
lookup key = tenant/trust-domain scope + InvocationDigest
```

This avoids leaking whether another tenant has executed the same private recipe or possesses the same data.

No cross-tenant hit, digest probing or global deduplication is allowed in V1.

### 7.2 Secret handling

Raw secrets, credentials, tokens and connection strings never enter:

- invocation preimages;
- result manifests;
- logs/events;
- UI evidence.

When secret rotation can alter results, the execution contract uses a server-governed, scope-safe **secret version/ref identity** that is non-reversible and cannot be supplied as arbitrary client text.

A secret value hash is not automatically safe: low-entropy secrets can be guessed, and a shared hash can become a cross-scope equality side channel.

## 8. Complexity assessment

| Dimension | Complexity | Reason |
|---|---|---|
| Semantic completeness | **High** | Missing one result-affecting field creates false hits; irrelevant fields create expensive false misses. |
| Canonical encoding | **Medium**, currently risky | RFC 8785 is mature, but DVT has multiple implementations/dependencies and incomplete vectors. |
| Contract/versioning | **High** | Identity schemas become durable compatibility boundaries. |
| Domain implementation | **Medium** | Building and hashing a frozen object is straightforward once semantics are fixed. |
| Provider integration | **High–Very High** | Exact snapshot/runtime identity differs across HTTP, dbt, warehouses, Python and table formats. |
| Migration | **High** | Existing hashes must retain current meaning; no silent reinterpretation. |
| Runtime operations | **Low for S01** | No index/lease/storage changes belong to this slice. |
| Security/privacy | **High** | Scope equality, secret versions and digest probing can leak information. |
| Verification | **High** | Requires RFC vectors, cross-runtime parity, semantic mutation matrix and negative cases. |

Overall S01 is **architecturally high complexity but bounded implementation size**. Most risk lies in choosing the correct preimage, not in calling SHA-256.

## 9. What DVT already has and what is missing

| Capability | Have | Missing before S01 is Done |
|---|---|---|
| SHA-256 primitive | Node and WebCrypto implementations in active code | One governed shared primitive contract and parity vectors. |
| Canonical JSON | Planner dependency and shared handwritten implementation | One proven RFC 8785 authority across runtimes. |
| Versioned shared contracts | `@dvt/contracts` and schema/version governance | `MaterializationInvocationIdentityV1` and strict parser/schema. |
| Deterministic planner | Pure normalized plan assembly | Immutable materialization evidence input is later; planner must not become identity resolver. |
| Step registry/config schemas | Existing known-step admission | Governed recipe/runtime semantic-profile contribution per first step kind. |
| Artifact digests | Tenant-scoped CAS publication and validation | Relation from invocation to result manifest, deliberately outside S01. |
| Runtime/plugin versions | Some versions/capabilities exist in current contracts/runtime | Complete result-affecting execution-contract identity for the chosen vertical. |
| Source revisions/snapshots | Several domain-specific identities exist or are planned | One authoritative exact snapshot resolver per reusable input kind. |
| Tests | Plan determinism and basic crypto tests | RFC corpus, cross-implementation parity, mutation/golden vectors and adversarial identity cases. |

## 10. Proposed implementation sequence after blockers clear

### Step 1 — finish canonical primitive convergence

Consume #2185/#2191 rather than duplicating it:

- one public JCS function;
- one SHA-256 digest function/value type;
- RFC 8785 golden corpus;
- Node/browser parity;
- remove or wrap direct planner dependency only through the accepted migration plan;
- preserve current persisted hash semantics where compatibility requires it.

### Step 2 — write the identity ADR

The ADR must freeze:

- identity purpose and exclusions;
- canonical encoding and digest algorithm;
- intrinsic identity versus lookup scope;
- V1 compatibility/version behavior;
- secret/version posture;
- relationship to `planId`, `inputHashSha256`, CAS and ResultManifest;
- failure behavior for unsupported fields/profile versions.

### Step 3 — add strict contracts and parsers

Under `@dvt/contracts`, add only the serializable shape and schema required by the first vertical:

- no generic arbitrary digest bag;
- no optional catch-all metadata inside the hashed preimage;
- duplicate input ports rejected;
- deterministic ordering required or normalized before serialization;
- unknown fields rejected.

### Step 4 — add a pure domain builder

A bounded materialization-domain component should:

- accept already-resolved typed identities;
- validate profile completeness;
- normalize deterministic arrays;
- generate canonical preimage bytes;
- compute the digest;
- expose safe explanation/diff fields for misses.

It must not read S3, PostgreSQL, files, environment variables, dbt or warehouses.

### Step 5 — implement one vertical-specific identity provider

Prefer the exact HTTP-artifact or DVT-managed artifact vertical because inputs and outputs already have authoritative digests.

Do not begin with arbitrary warehouse tables or generic dbt materializations.

### Step 6 — freeze identity evidence before index/storage work

Produce golden preimages/digests for positive and mutation cases. Only then may S02/S04 use `InvocationDigest` as a durable key.

## 11. Verification plan

### 11.1 Canonicalization conformance

- RFC 8785 sample and number-serialization vectors;
- raw UTF-16 property sorting, including non-ASCII and surrogate-pair cases;
- strings preserved without Unicode normalization;
- invalid lone surrogates rejected;
- I-JSON number boundary behavior explicit;
- Node and browser implementations produce identical bytes/digests;
- current direct library and surviving `@dvt/crypto` implementation compared before convergence.

The current `localeCompare` path must have an explicit red test demonstrating whether it diverges from the normative property-order vector; do not rely on an implementation comment.

### 11.2 Determinism

For each golden invocation:

```text
100 identical evaluations
  -> 100 identical canonical preimages
  -> 100 identical InvocationDigests
```

Input object insertion order, graph source order and equivalent construction order must not alter identity.

### 11.3 Semantic mutation matrix

Every result-affecting mutation must change the digest:

- executable source/config value;
- named input snapshot;
- dependency/lock identity;
- plugin implementation;
- runtime/container digest;
- dbt/adapter version where governed;
- relevant timezone/locale/collation/session setting;
- semantic profile/version;
- output contract.

Every explicitly incidental mutation must not change it:

- run ID;
- attempt ID;
- created timestamp;
- worker/queue;
- trace/span ID;
- node coordinates/display presentation;
- telemetry tags;
- reordered map insertion.

### 11.4 Security and scope

- same intrinsic invocation in two tenants produces the same intrinsic digest only if all intrinsic inputs match, but V1 lookup never crosses scope;
- one tenant cannot test another tenant's hit existence;
- raw secrets are absent from canonical preimages and diagnostics;
- secret version/ref cannot be client-selected outside authorized aliases;
- digest/log output cannot reveal protected source/config payloads.

### 11.5 Compatibility

- existing `planId`, planner input hash and artifact SHA vectors remain unchanged unless their owning issue explicitly versions/migrates them;
- unknown invocation identity version is rejected;
- future identity versions do not silently compare equal to V1;
- no `InvocationDigest` is accepted without its declared algorithm and schema version.

### 11.6 Architecture

- planner has no S3/PostgreSQL/provider reads;
- runtime adapters do not define independent invocation preimages;
- only the shared crypto boundary owns canonicalization/digest primitives;
- only the materialization domain owns the invocation preimage schema;
- no generic plugin `cacheable` opt-in exists.

## 12. Definition of Ready for implementation

- [ ] #2185's surviving JCS/SHA authority and migration posture are fixed;
- [ ] RFC 8785 vectors pass across every supported implementation/runtime involved in V1;
- [ ] the exact first vertical is fixed to managed/trusted-digest inputs;
- [ ] recipe, input snapshot, execution contract and output contract providers are named for that vertical;
- [ ] V1 preimage and exclusion matrix are reviewed and frozen;
- [ ] intrinsic identity versus tenant/trust lookup scope is approved;
- [ ] secret-version handling is approved;
- [ ] contract/ADR owners and affected packages are fixed;
- [ ] no open issue/PR owns an incompatible materialization identity;
- [ ] golden and mutation vectors are committed before materialization index code begins.

## 13. Definition of Done

- [ ] one strict `MaterializationInvocationIdentityV1` contract exists;
- [ ] one shared, RFC 8785-proven canonicalization path produces its bytes;
- [ ] one SHA-256 digest value type/API is reused from the surviving crypto authority;
- [ ] the first governed vertical can build a complete identity without hidden provider state;
- [ ] every result-affecting field in the frozen matrix changes identity;
- [ ] every approved incidental field leaves identity unchanged;
- [ ] deterministic preimage/digest equality passes 100/100 runs and cross-runtime vectors;
- [ ] unknown/invalid/profile-incomplete inputs fail before lookup or execution reuse;
- [ ] tenant lookup and secret privacy tests pass;
- [ ] existing plan/artifact/receipt identities retain their documented semantics;
- [ ] no materialization index, result cache hit or production skip is claimed by this slice alone;
- [ ] affected contract/crypto/planner/architecture tests and repository verification pass.

## 14. Stop / narrow conditions

Stop or narrow S01 when:

- the selected first vertical cannot expose an exact input snapshot;
- a result-affecting runtime dependency remains hidden or mutable;
- canonical bytes diverge between supported runtimes;
- safe scope/secret equality cannot be represented without leakage;
- completing the preimage requires a universal semantic model rather than one bounded profile;
- the implementation attempts to change current plan/artifact hashes silently;
- an existing mature identity protocol can be adopted directly with less risk than a DVT contract.

If these conditions affect only one provider/step family, classify that family as opaque/non-reusable rather than weakening the global identity.

## 15. Result of this pass

S01 is necessary and architecturally compatible with DVT, but the current repository is in a **transitional canonicalization state**. The correct immediate work is convergence and conformance, not materialization-cache code.

The recommended boundary is:

```text
Reuse:
  RFC 8785 + SHA-256
  @dvt/crypto after #2185 convergence
  Bazel's action/cache/CAS separation as prior art
  OCI immutable image digest where relevant

Build in DVT:
  versioned invocation preimage contract
  semantic completeness rules per governed profile
  scope-safe identity assembly and evidence

Do not build yet:
  materialization index
  runtime cache hit
  cross-tenant reuse
  SQL semantic equivalence
  custom encoder/hash algorithm
```

The next slice should study **S02 — Immutable ResultManifest and verification evidence**, because a correct action key without a durable, independently verifiable result binding is still unsafe.
