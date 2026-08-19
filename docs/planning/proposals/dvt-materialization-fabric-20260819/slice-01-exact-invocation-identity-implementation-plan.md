---
title: S01 - Exact invocation identity implementation plan
status: Blocked
slice: S01
baseline_commit: c82cfeb733de1c0bed2f869904b8f9252c97db2e
created: 2026-08-19
gate_decision: blocked
---

# S01 — Dependency-ordered implementation plan

## 1. Purpose

This plan describes the smallest safe implementation sequence for exact invocation identity. It does not authorize implementation while the slice gate remains `blocked`.

The intended outcome is one strict, versioned identity:

```text
MaterializationInvocationIdentityV1
  -> RFC 8785 canonical UTF-8 bytes
  -> SHA-256
  -> InvocationDigest
```

The plan preserves current `planId`, planner-input hash, artifact digest, receipt and run identities.

## 2. Delivery boundary

### In scope

- canonicalization and digest convergence required by this identity;
- one ADR defining the preimage and compatibility boundary;
- strict shared contracts and parsers;
- one pure identity builder;
- one bounded provider family using managed/trusted-digest inputs;
- deterministic, mutation, security and cross-runtime evidence.

### Out of scope

- materialization index or cache lookup;
- result-manifest publication;
- artifact read/pin lifecycle;
- runtime reuse events;
- planned partial dbt execution;
- arbitrary warehouse snapshot identity;
- cross-tenant reuse;
- semantic SQL equivalence;
- Arrow/Parquet/Iceberg data-plane work.

## 3. Dependency graph

```text
P0 — converge canonical primitives (#2185/#2191)
  ↓
P1 — freeze ADR and semantic field matrix
  ↓
P2 — add versioned contracts and strict parser
  ↓
P3 — implement pure InvocationDigest builder
  ↓
P4 — implement one bounded identity provider
  ↓
P5 — integrate evidence and conformance tests
  ↓
P6 — gate review and unlock S02/S04
```

No phase may be reordered merely to begin coding earlier. In particular, a materialization index must not be built against a provisional digest.

## 4. P0 — Canonical primitive convergence

### Need

Planner and shared crypto currently do not consume one demonstrated canonical-byte authority. Durable action identity cannot depend on implementation-dependent key ordering.

### Existing authority

- [#2185](https://github.com/dunay2/dvt/issues/2185) owns repository-wide crypto/canonicalization convergence.
- `@dvt/crypto` remains the intended primitive boundary.
- Existing persisted hashes keep their current compatibility posture unless their owners explicitly version them.

### Work

1. Inventory every active JCS/stable-JSON/SHA implementation and consumer touched by S01.
2. Add normative RFC 8785 vectors, including property ordering, number serialization, strings and invalid Unicode.
3. Add the explicit current divergence vector:

   ```json
   {"a":1,"A":2}
   ```

   Required canonical order:

   ```json
   {"A":2,"a":1}
   ```

4. Prove identical canonical bytes and SHA-256 digests in supported Node and browser paths.
5. Select the surviving implementation behind `@dvt/crypto` based on evidence.
6. Migrate or wrap planner consumption only through #2185/#2191's accepted compatibility plan.
7. Remove superseded implementations rather than preserving parallel wrappers.

### Reuse

- RFC 8785 normative algorithm and corpus;
- current `json-canonicalize` dependency only if it passes the accepted vectors and maintenance review;
- Node `crypto` / WebCrypto as platform SHA-256 implementations behind one contract.

### Affected packages

Likely, subject to #2185's final disposition:

- `packages/@dvt/canonical` (`@dvt/crypto`);
- `packages/@dvt/planner`;
- focused engine/artifact consumers only when required by convergence.

### Entry conditions

- exact consumers and persisted/public hash compatibility are inventoried;
- no active PR is already migrating the same consumer set incompatibly.

### Exit conditions

- one canonicalization API and one digest API survive;
- RFC and cross-runtime vectors are green;
- the `A`/`a` vector is protected;
- no S01 consumer depends on `localeCompare` or another locale-sensitive ordering;
- current identities are either byte-compatible or deliberately versioned by their owners.

### Gate on failure

If Node/browser canonical bytes cannot be made identical without changing an existing public/persisted identity, keep the existing identity version intact and introduce a new explicitly versioned primitive path for `MaterializationInvocationIdentityV1`. Do not reinterpret old digests.

## 5. P1 — Freeze identity ADR and semantic matrix

### Need

Canonical bytes solve only representation. False hits remain possible if the preimage omits a result-affecting dependency.

### Existing authority

- ADR lifecycle already used by DVT;
- [#2156](https://github.com/dunay2/dvt/issues/2156) owns bounded semantic/effect assumptions;
- [ADR-0042](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/docs/adr/ADR-0042-execution-plan-canonical-identity-unification.md) provides the separation pattern for intrinsic identity, versions and timestamps.

### Work

1. Define the exact purpose of `InvocationDigest` and the identities it must never replace.
2. Freeze V1 preimage components:
   - `RecipeDigest`;
   - ordered named `InputSnapshotDigest` values;
   - `ParametersDigest`;
   - `ExecutionContractDigest`;
   - `OutputContractDigest`;
   - governed semantic profile ID/version.
3. Freeze result-affecting and incidental-field matrices for the first provider family.
4. Define intrinsic identity versus tenant/trust-domain lookup scope.
5. Define secret-version/ref handling and prohibited raw values.
6. Define unknown/unsupported version behavior: reject before reuse.
7. Define compatibility and migration: V1 never silently compares equal to a future version.
8. Define the relationship to future `ResultManifest`, index and planner evidence without designing those slices prematurely.

### Deliverable

One accepted ADR or normative contract decision referenced from the S01 study and manifest.

### Exit conditions

- a reviewer can calculate whether every example field belongs in the preimage without hidden code;
- every first-vertical input has an authoritative identity source;
- every unknown condition has an explicit fail-closed result;
- no plugin self-declaration such as `cacheable: true` can grant reuse.

### Gate on failure

If the first provider family still requires hidden mutable state or a universal semantic model, narrow the provider family. Do not weaken the identity globally.

## 6. P2 — Add strict versioned contracts and parser

### Need

Durable evidence requires a serializable contract whose unknown fields, duplicate inputs and version mismatches cannot be ignored silently.

### Existing authority

`@dvt/contracts` owns versioned wire contracts and parsers.

### Proposed contract set

Names remain provisional until P1:

```ts
type ContentDigestV1 = {
  algorithm: 'sha256';
  hex: string;
};

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

### Work

1. Add strict runtime validation/schema.
2. Reject unknown identity versions and algorithms.
3. Reject malformed SHA-256 values.
4. Reject duplicate or empty input ports.
5. Define deterministic port ordering at the builder boundary.
6. Reject unknown catch-all fields inside the hashed object.
7. Add golden encoded-object fixtures from P1.
8. Keep tenant/project/environment outside the intrinsic preimage while requiring scope in later lookup/evidence contracts.

### Affected packages

- `packages/@dvt/contracts`;
- contract tests/golden fixtures;
- no planner, engine, state or storage integration yet.

### Exit conditions

- positive and negative schema cases pass;
- round-trip preserves the exact V1 object;
- unknown V2/future examples fail closed;
- no generic metadata map can mutate identity invisibly.

## 7. P3 — Implement the pure identity builder

### Need

Callers must not each assemble, sort and hash the preimage independently.

### Proposed owner

A bounded materialization-domain package or an existing domain package selected during P1. Do not place semantic assembly inside `@dvt/crypto`.

### Responsibilities

- accept typed, already-resolved component digests;
- validate semantic-profile completeness;
- normalize named inputs deterministically;
- build the exact V1 preimage object;
- obtain canonical bytes from `@dvt/crypto`;
- compute SHA-256 through `@dvt/crypto`;
- return the preimage, digest and safe diagnostic component identities;
- produce no I/O and read no ambient environment.

### Forbidden responsibilities

- reading files, S3, PostgreSQL or warehouses;
- resolving secrets or environment variables;
- running dbt/SQL/Python;
- deciding whether a result is valid;
- looking up a cache/index;
- mutating planner or run state.

### Tests

- 100/100 deterministic evaluation;
- insertion/order invariance;
- duplicate input rejection;
- component mutation matrix;
- incidental-field absence;
- exact golden bytes and digest;
- architecture test preventing adapter-owned builders.

### Exit conditions

One builder and one V1 preimage exist; there are no per-plugin hash assemblers.

## 8. P4 — Implement one bounded identity provider

### Preferred first provider family

Managed/trusted-digest artifact invocation, with the HTTP JSON trusted-body-digest vertical as the likely first product demonstration.

### Why this provider first

- input identity is already an expected SHA-256 rather than a weak URL/timestamp proxy;
- output bytes can be owned by the existing DVT CAS;
- network work avoided is measurable;
- false-hit cases can be generated deterministically;
- it does not require arbitrary warehouse snapshot semantics.

### Required providers

1. `RecipeIdentityProvider` for the exact HTTP/acquisition step definition and configuration.
2. `InputSnapshotIdentityProvider` that accepts only a trusted expected content digest in V1.
3. `ExecutionContractIdentityProvider` that binds plugin implementation/runtime and material settings.
4. `OutputContractIdentityProvider` for the expected media type/shape/validation contract.

Names are illustrative; do not create generic provider interfaces until at least two concrete consumers prove a shared boundary.

### Exact exclusions

- URL-only identity;
- weak ETag-only identity;
- `Last-Modified` timestamp-only identity;
- mutable container tags;
- hidden process environment;
- arbitrary plugin opt-in.

### Exit conditions

The provider family constructs a complete invocation identity from explicit, authoritative inputs without performing a lookup or skipping execution.

## 9. P5 — Integrate validation evidence

### Need

A digest API is not complete until incompatible executions demonstrably produce misses and incidental changes do not.

### Required evidence

#### Canonical conformance

- RFC 8785 vectors;
- `A`/`a` ordering vector;
- non-ASCII/surrogate-pair ordering;
- number serialization;
- invalid lone surrogate rejection;
- Node/browser parity.

#### Semantic mutation matrix

Each relevant mutation changes the digest:

- recipe source/config value;
- input digest;
- dependency/runtime/plugin version;
- governed timezone/locale/collation/session setting;
- profile version;
- output contract.

Each incidental mutation leaves it unchanged:

- run/attempt/worker/trace IDs;
- timestamps;
- UI coordinates/display state;
- telemetry labels;
- map insertion order.

#### Security

- no raw secrets in preimage/error/log fixture;
- tenant A cannot use or probe tenant B lookup state in later integration;
- client cannot choose an arbitrary secret-version token;
- protected source/config text is not exposed by miss diagnostics.

#### Compatibility

- existing plan/artifact/receipt hash vectors remain unchanged unless their owners version them explicitly;
- V1 and future/unknown version examples never compare silently.

### Existing rails to reuse

- package Vitest suites;
- contract/determinism checks;
- architecture dependency checks;
- repository `verify:prepush`;
- #2157 oracle only when an actual reuse decision exists in a later slice.

### Exit conditions

All S01 Definition of Done items are green and independently reproducible.

## 10. P6 — Gate review and downstream unlock

### Review inputs

- accepted ADR;
- strict V1 contracts;
- one pure builder;
- one bounded provider family;
- RFC/cross-runtime/golden/mutation/security reports;
- compatibility statement for existing identities;
- exact removed/converged hashing sources from #2185.

### Gate decisions

- `pass`: S01 identity is stable enough for S02 to bind a `ResultManifest` and for S04 to plan index keys.
- `revise`: implementation exists but field semantics, vectors or compatibility remain ambiguous.
- `blocked`: an external owner such as #2185/#2156 or an unavailable exact snapshot prevents completion.

### Current decision

`blocked` — implementation may not start until P0/P1 entry conditions are satisfied.

## 11. Dependency and ownership matrix

| Order | Dependency | Why it precedes S01 implementation | Consumed outcome |
|---|---|---|---|
| 1 | [#2185](https://github.com/dunay2/dvt/issues/2185) | Avoid another canonicalization/SHA implementation and silent identity drift. | One primitive authority and migration posture. |
| 2 | [#2156](https://github.com/dunay2/dvt/issues/2156) | A digest needs bounded semantic/effect completeness. | First semantic profile and fail-closed rules. |
| 3 | Security/tenancy boundary | Equality and secret-version evidence can leak across scopes. | V1 lookup/privacy rules. |
| 4 | [#2157](https://github.com/dunay2/dvt/issues/2157) | Later reuse must be falsifiable independently. | Oracle/counterexample fixtures. |
| 5 | [#2158](https://github.com/dunay2/dvt/issues/2158) | Planned reuse needs immutable verifiable evidence. | Evidence contract consumed by S02/S08. |

## 12. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Missing semantic field | False hit / incorrect data | Governed provider profile, mutation vectors, fail closed. |
| Too many incidental fields | False misses / poor value | Explicit exclusion matrix and miss diagnostics. |
| Canonicalization drift | Cross-runtime identity split | RFC corpus, golden bytes, one implementation authority. |
| Silent persisted-hash migration | Broken plans/receipts/artifacts | New V1 domain identity; preserve/version existing identities. |
| Secret equality leakage | Cross-scope information disclosure | Non-reversible governed version refs and scope-bound lookup. |
| Generic provider abstraction too early | Large speculative subsystem | First concrete managed/trusted-digest provider only. |
| Mutable runtime tags | Stale or incompatible result reuse | Bind OCI/runtime immutable digest/version. |
| Digest-only diagnostics | Unexplainable misses/hits | Retain typed component digests and safe reason codes. |

## 13. Rollback and removability

S01 must remain removable before any materialization index exists:

- current execution continues without invocation identity;
- no existing plan/run/artifact identity changes;
- no database migration is required in S01;
- provider identity construction can be disabled without changing execution behavior;
- all new contracts are unused outside guarded research/first-provider code until S02/S04 gates pass.

Once a later index persists V1 keys, rollback becomes a versioned deprecation/migration concern owned by that later slice, not by weakening V1 semantics.

## 14. Completion statement

S01 implementation is complete only when identity correctness is proven independently of caching. A successful SHA call, contract compilation or passing happy-path fixture is insufficient.
