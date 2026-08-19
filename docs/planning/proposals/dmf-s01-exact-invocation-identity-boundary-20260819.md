---
title: DMF S01 - Exact Invocation Identity Problem and Proposed Boundary
status: Proposed
owner: Architecture / Contracts / Crypto
baseline_commit: 2955d3c8c5400beff4f07c3b98369438b6140645
created: 2026-08-19
planning_type: architecture-proposal
related_issues:
  - 2185
  - 2187
  - 2487
  - 2489
related_prs:
  - 2484
---

# DMF S01 — Exact Invocation Identity Problem and Proposed Boundary

## Decision requested

Approve the smallest identity boundary required before DVT can safely index or reuse a previous materialization:

> A new versioned `MaterializationInvocationIdentityV1` identifies one exact executable invocation. Its digest is derived from RFC 8785 canonical bytes and SHA-256 through the single `@dvt/crypto` primitive authority. Existing plan, artifact, dbt, idempotency and persisted identities retain their current domain meanings and may migrate only with byte-equivalence proof or an explicit domain version.

This proposal does **not** implement a materialization cache, result lookup, runtime skip, PostgreSQL index or HTTP reuse. It resolves the identity problem that those mechanisms would otherwise amplify.

## Why this is the first implementation-enabling cut

DVT already has several hashes and identifiers, but each answers a different question:

| Existing identity | Question it answers | Why it is not the materialization invocation key |
|---|---|---|
| `planId` | Is this the same canonical `PlanCore`? | It identifies a complete plan, not one executable step with exact data/runtime inputs. |
| Planner `inputHashSha256` | Is this the same normalized planner input? | It includes graph/selection/policy input, not exact external snapshots and the complete execution contract. |
| Plugin compatibility fingerprint | Are admitted step kinds/configuration shapes compatible? | It is not a digest of complete semantic configuration values, plugin bytes or runtime state. |
| Artifact SHA-256 | Are these exact physical bytes identical? | It does not prove which invocation produced them or whether they satisfy the current output contract. |
| Run/step IDs | Which execution attempt is this? | They are operational identities and intentionally differ between attempts. |

Reusing any of these values as a generic cache key would conflate distinct domains and create either false hits or unnecessary misses.

The required question is narrower:

> Are the exact recipe, every named input snapshot, all result-affecting parameters, the effective execution contract, the expected output contract and the governed semantic profile identical?

## Current repository problem

Baseline inspected: [`main@2955d3c8c5400beff4f07c3b98369438b6140645`](https://github.com/dunay2/dvt/tree/2955d3c8c5400beff4f07c3b98369438b6140645).

### 1. Canonicalization currently has multiple active authorities

At least three active paths currently claim or approximate canonical JSON:

1. [`packages/@dvt/canonical/src/jcs.ts`](https://github.com/dunay2/dvt/blob/2955d3c8c5400beff4f07c3b98369438b6140645/packages/%40dvt/canonical/src/jcs.ts)
   - handwritten serializer;
   - package is published as `@dvt/crypto` despite the physical `canonical` path;
   - object keys are ordered with `localeCompare`.

2. [`packages/@dvt/contracts/src/utils/jcsCanonicalize.ts`](https://github.com/dunay2/dvt/blob/2955d3c8c5400beff4f07c3b98369438b6140645/packages/%40dvt/contracts/src/utils/jcsCanonicalize.ts)
   - a second handwritten near-copy;
   - also orders keys with `localeCompare`;
   - remains a primitive implementation inside the contracts package.

3. [`packages/@dvt/planner/src/domain/hashing.ts`](https://github.com/dunay2/dvt/blob/2955d3c8c5400beff4f07c3b98369438b6140645/packages/%40dvt/planner/src/domain/hashing.ts)
   - uses the external `json-canonicalize` implementation;
   - owns another direct WebCrypto SHA-256 implementation.

This is already owned as repository hardening by #2185–#2193. DMF must consume that convergence rather than introduce a fourth serializer or hash wrapper.

### 2. The shared handwritten implementation is not proven RFC 8785 compliant

RFC 8785 requires property names to be sorted as raw strings by unsigned UTF-16 code units, independently of locale.

The current shared implementations use:

```ts
Object.keys(object).sort((left, right) => left.localeCompare(right));
```

A minimal counterexample on the current Node runtime is:

```ts
const value = { a: 1, A: 2 };
```

Current locale-sensitive order:

```json
{"a":1,"A":2}
```

Required raw UTF-16 order (`A` = `0x0041`, `a` = `0x0061`):

```json
{"A":2,"a":1}
```

The current primitive test corpus checks only simple lowercase key order, `undefined` omission, negative zero, array order and a basic SHA-256 vector. It does not currently prove the normative Unicode/property-order/error behavior required for a durable cryptographic identity.

Other conformance questions also require explicit vectors rather than comments or assumptions:

- lone Unicode surrogate rejection;
- I-JSON input restrictions;
- non-finite numbers;
- `undefined` in objects and arrays;
- cross-runtime number serialization;
- exact Node/browser/tooling byte parity.

Reference: [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html).

### 3. Correcting the primitive in place may change existing identities

The obvious correction—replace `localeCompare` or route every consumer immediately through `json-canonicalize`—is unsafe without domain compatibility evidence.

Existing canonical bytes may already participate in:

- plan/input identities;
- stored plan integrity;
- event/start/recovery idempotency;
- dbt source/analysis/content revisions;
- governance fingerprints;
- workspace and warehouse identities;
- artifact and archive integrity.

For inputs whose current and corrected canonical ordering differ, an in-place replacement can change a persisted/public digest while the domain still calls it the same identity version.

Therefore there are two different problems:

```text
Primitive convergence
  -> one correct implementation

Domain compatibility
  -> whether each existing identity can change in place
```

They must not be solved by one repository-wide search-and-replace.

## Failure model

An invocation identity is safety-critical because a false hit is worse than a false miss.

### False hit

A result-affecting fact is omitted from the identity:

```text
same digest
but different input snapshot / plugin implementation / timezone / output contract
  -> stale or incorrect result reused
```

### False miss

An incidental operational fact is included:

```text
same semantic invocation
but different run ID / worker / trace / attempt / timestamp
  -> correct result needlessly recomputed
```

### Silent identity migration

Canonicalization or framing changes without a domain version:

```text
same identity name/version
but different canonical bytes and digest
  -> persisted references, idempotency and compatibility become ambiguous
```

### Scope leak

A global digest lookup exposes that another tenant possesses the same private recipe or data:

```text
same intrinsic digest across scopes
  -> existence side channel or unauthorized reuse
```

V1 must prevent all four classes independently.

## Proposed solution

## 1. Introduce a new intrinsic identity domain

The first contract is deliberately small and illustrative; exact exported names remain subject to #2487 review:

```ts
type Sha256DigestV1 = {
  algorithm: 'sha256';
  hex: string;
};

type MaterializationInvocationIdentityV1 = {
  identityKind: 'dvt.materialization.invocation';
  identityVersion: '1';

  recipeDigest: Sha256DigestV1;

  inputs: readonly {
    port: string;
    snapshotDigest: Sha256DigestV1;
  }[];

  parametersDigest: Sha256DigestV1;
  executionContractDigest: Sha256DigestV1;
  outputContractDigest: Sha256DigestV1;

  semanticProfile: {
    profileId: string;
    profileVersion: string;
  };
};
```

The identity digest is:

```text
InvocationDigestV1
  = SHA-256(
      UTF-8(
        RFC8785_JCS(MaterializationInvocationIdentityV1)
      )
    )
```

The complete preimage remains available as immutable evidence. A naked 64-character string is insufficient for explanation, compatibility and future verification.

## 2. Keep identity composition domain-owned

`@dvt/crypto` owns only primitives:

```text
UTF-8 encoding
RFC 8785 canonicalization
SHA-256 bytes/text/streaming
```

The materialization domain owns:

```text
which fields participate
field meaning
normalization and ordering before canonicalization
identity version
semantic profile
failure behavior
```

This preserves the #2185/#2187 rule:

> Centralize algorithms; do not centralize every business identity into `hash(object)` or a generic `HashService`.

## 3. Make every identity component explicit

### `recipeDigest`

Binds the exact computation definition for one governed step family:

- admitted step kind and recipe-schema version;
- normalized executable source or compiled-source digest;
- complete semantic configuration values;
- named input/output port contract;
- dependency/lock identity relevant to the recipe.

It excludes display labels, canvas position, UI focus and other presentation facts.

### Named `input.snapshotDigest`

Each input must resolve to an immutable or independently verifiable snapshot identity before reuse is considered.

For the first provider this should be a DVT-managed or trusted expected artifact descriptor. A URL, table name, row count, timestamp or ETag is not sufficient by itself.

Inputs are ordered by normalized port name and duplicate ports are rejected before canonicalization.

### `parametersDigest`

Binds result-affecting invocation parameters separately from the recipe so a miss can be explained as changed code/configuration versus changed arguments.

### `executionContractDigest`

Binds every environmental fact declared by the profile as result-affecting, for example:

- plugin implementation digest/version;
- immutable OCI image digest when containerized;
- runtime, dbt and adapter versions;
- dependency lock identity;
- database semantic version where relevant;
- timezone, locale, collation and session settings when material.

It excludes run ID, attempt, worker, queue, trace/span IDs and wall-clock timestamps unless a narrowly governed profile proves that one changes the accepted result.

### `outputContractDigest`

Binds what the current consumer accepts:

- output names/ports;
- exact media/schema contract;
- ordering, nullability and partition semantics where material;
- required validation-policy version.

It does not hash the produced output bytes. Those belong later to `ResultManifestDigest` and physical `BlobDigest`.

### `semanticProfile`

The profile declares whether reuse is permitted and which fields/evidence are mandatory for one bounded step family.

Initial candidate:

```text
trusted-http-artifact-v1
```

Unsupported, unknown, nondeterministic, opaque or effectful profiles fail closed.

## 4. Separate intrinsic identity from authorization scope

Tenant/trust scope is not inserted arbitrarily into the intrinsic semantic digest.

V1 lookup is still strictly scoped:

```text
lookup key
  = tenant/trust-domain scope
  + InvocationDigestV1
```

Consequences:

- two scopes may independently produce the same intrinsic digest;
- no V1 global lookup exists;
- no cross-tenant reuse exists;
- authorization is evaluated before candidate existence or miss detail is disclosed;
- metrics/logs do not expose full private digests as high-cardinality public labels.

This keeps semantic identity stable while preventing equality probing from becoming a cross-scope side channel.

## 5. Exclude raw secrets from all preimages

Credentials, tokens, connection strings and secret values never enter:

- canonical identity preimages;
- events or logs;
- UI explanations;
- metric attributes.

When a secret rotation can alter a result, the execution contract may include only a server-governed, non-reversible, scope-safe secret version/reference identity.

Hashing a low-entropy secret directly is not automatically safe and can create an offline guessing or cross-scope equality oracle.

## Canonicalization and compatibility decision

## New identity

`MaterializationInvocationIdentityV1` has no legacy alias. It starts only after the surviving `@dvt/crypto` path passes the normative RFC 8785 and cross-runtime corpus.

## Existing identities

Each existing domain follows one of two paths:

### Byte-equivalent migration

Allowed when old and new implementations produce exactly the same canonical bytes/digest over the complete supported input domain and frozen golden corpus.

```text
same domain identity version
same canonical bytes
same digest
```

### Versioned domain migration

Required when preimage, ordering, canonicalization, framing, truncation or output representation changes.

```text
old domain identity version remains readable for its bounded lifecycle
new writes use explicit new domain identity version
removal condition is documented
```

There is no generic `sha256-v2`, permanent dual write, forwarding crypto package or unversioned hash refresh.

## Open-source convergence

### RFC 8785

Adopt as the normative JSON canonical-byte contract. The implementation choice must pass its vectors and DVT cross-runtime compatibility corpus.

### Existing `json-canonicalize` dependency

The planner already uses an external implementation. The likely convergence is to place one vetted implementation behind `@dvt/crypto`, but this proposal does not approve the dependency merely because it already exists.

Acceptance requires:

- RFC property-order, Unicode, number and error vectors;
- Node/browser/tooling parity;
- maintained package and acceptable supply-chain posture;
- exact compatibility analysis for existing identities.

If the existing package fails a required vector, select another mature implementation or a narrowly reviewed wrapper. Do not retain the current handwritten serializers as independent authorities.

### Bazel Remote Execution API

Reuse its mature conceptual separation:

```text
Action/Invocation identity != ActionResult/ResultManifest != CAS blob digest
```

DVT must not import the complete build-system protocol because warehouse snapshots, dbt semantics, effects and tenant evidence have different domain requirements.

Reference: [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis).

### OCI descriptors

Reuse immutable image/content descriptors—algorithm, digest, media type and size—when a container/runtime image can affect execution.

Do not use mutable tags such as `latest` as execution-contract identity.

Reference: [OCI Image Specification — Descriptor](https://github.com/opencontainers/image-spec/blob/main/descriptor.md).

## Rejected alternatives

### Reuse `planId`

Rejected because it identifies a complete plan core rather than one exact executable invocation and its external snapshots/runtime contract.

### Reuse artifact SHA-256

Rejected because output byte identity does not bind the producing recipe, inputs, runtime or accepted output contract.

### Fix `localeCompare` in place everywhere

Rejected until every affected domain proves byte-equivalence or selects an explicit identity-version migration.

### Add a generic `hash(value)` or `HashService`

Rejected because it hides preimage ownership and encourages unrelated domains to share an accidental identity contract.

### Add CBOR, Protobuf or a custom DVT encoder now

Rejected because the current problem is semantic completeness and canonical convergence, not JSON compactness. A new encoding adds another compatibility surface before correctness is established.

### Include tenant ID inside the intrinsic digest

Rejected as the default because authorization scope and semantic identity are separate concerns. V1 prevents cross-scope access through scoped index keys and admission, not by redefining the computation.

### Allow plugin self-declaration with `cacheable: true`

Rejected because a plugin cannot unilaterally prove its effect, snapshot and runtime semantics. Reuse requires an approved semantic profile and independent evidence.

## Proposed implementation sequence

```text
1. Accept or amend this problem/solution boundary
       |
       v
2. #2185/#2187/#2189/#2191
   converge and prove one @dvt/crypto primitive authority
       |
       v
3. #2487
   add strict MaterializationInvocationIdentityV1 contract,
   pure builder and golden/mutation vectors
       |
       v
4. #2489
   add trusted-http-artifact-v1 identity provider
       |
       v
5. S02+
   ResultManifest, verifier, CAS verification, index and first HTTP reuse
```

The first code PR after this proposal should not contain an index or cache hit. It should contain the strict V1 contract, canonical preimage vectors and a pure builder—or remain blocked if crypto conformance is unresolved.

## Acceptance tests to freeze before code

### Canonicalization

- normative RFC 8785 property-order and Unicode vectors;
- `A` versus `a` and non-ASCII/surrogate-pair property names;
- lone surrogate rejection;
- I-JSON number/error boundaries;
- Node/browser/tooling canonical bytes and SHA equality.

### Identity determinism

```text
100 identical evaluations
  -> 100 identical canonical byte sequences
  -> 100 identical InvocationDigestV1 values
```

### Semantic mutations that must change the digest

- recipe source/configuration;
- named input snapshot;
- result-affecting parameter;
- plugin/runtime/dependency identity;
- relevant timezone/locale/collation/session setting;
- output contract;
- semantic-profile version.

### Incidental mutations that must not change the digest

- run and attempt IDs;
- worker and queue;
- timestamps and trace IDs;
- canvas coordinates and display labels;
- object insertion order.

### Failure and privacy

- unknown field/profile/version rejects;
- duplicate input port rejects;
- unresolved runtime or input snapshot is non-reusable;
- raw secrets are absent from preimages/diagnostics;
- one tenant cannot probe another tenant's candidate existence.

## Open review questions

The PR requests decisions on only three bounded points:

1. **Intrinsic identity versus scope:** retain the proposed separation and use a scope-bound index key?
2. **First semantic profile:** confirm `trusted-http-artifact-v1` as the initial complete provider?
3. **Operational controls:** freeze which timeout/retry/cancellation fields are incidental versus result-affecting for that first profile?

All broader materialization-index, lease, ResultManifest, Arrow, dbt and partition decisions remain in their owned slices.

## Exit condition for this proposal

This proposal is complete when reviewers can answer, without reopening the whole Materialization Fabric design:

- what exact question `InvocationDigestV1` answers;
- which fields are included and excluded;
- who owns canonical primitives versus domain preimages;
- how existing identities remain compatible;
- why tenant scope is enforced outside the intrinsic digest;
- which first profile can provide complete evidence.

Acceptance authorizes the next bounded code PR. It does not claim that result reuse is already implemented.
