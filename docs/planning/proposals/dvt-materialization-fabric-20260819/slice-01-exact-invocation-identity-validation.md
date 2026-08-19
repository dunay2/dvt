---
title: S01 - Exact invocation identity validation report
status: Partial evidence
slice: S01
baseline_commit: c82cfeb733de1c0bed2f869904b8f9252c97db2e
created: 2026-08-19
gate_decision: blocked
---

# S01 — Validation and evidence report

## 1. Gate decision

```text
Decision: blocked
Scope: implementation
```

The architectural direction is accepted provisionally, but S01 is not implementation-ready because:

- the repository does not yet have one demonstrated RFC 8785 canonicalization authority;
- the normative cross-runtime corpus is not integrated and green;
- the V1 invocation preimage has not been approved as a contract/ADR;
- the first provider family's recipe/input/runtime/output identity sources are not frozen.

This gate does not block continuing the research pass or studying S02. It blocks code that persists or uses an `InvocationDigest` as a materialization lookup key.

## 2. Evidence levels

| Level | Meaning | S01 status |
|---|---|---|
| `source-inspected` | Exact repository code/contract was read at the fixed baseline. | Completed for the bounded sources below. |
| `primary-source-compared` | Official specification or upstream source was compared. | Completed for RFC 8785, Bazel REAPI and OCI concepts. |
| `command-reproduced` | A concrete local command reproduced the finding. | Completed for the locale-sensitive key-ordering counterexample. |
| `repository-tested` | DVT package/repository commands passed with the proposed implementation. | Not applicable; no implementation exists. |
| `service-backed` | Real supported services executed the proposed behavior. | Not applicable; no implementation exists. |
| `oracle-validated` | Full and reused executions were compared independently. | Blocked until later slices implement reuse. |

## 3. Repository baseline and scope

Source baseline:

- [`main@c82cfeb733de1c0bed2f869904b8f9252c97db2e`](https://github.com/dunay2/dvt/tree/c82cfeb733de1c0bed2f869904b8f9252c97db2e)

The PR branch was later synchronized with `main@e5117e8bedb6bbe1c9b7689adaa1f08dc866b088`. The intervening commit changes only Web dbt/DVT connection declarations and tests; it does not alter the planner, crypto, contract or artifact sources audited by S01.

This validation report covers exact invocation identity only. It does not validate a cache, result manifest, index, lease, runtime hit or partial execution.

## 4. Source evidence

### 4.1 Planner identities

Inspected:

- [`packages/@dvt/planner/src/domain/PlanAssembler.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/planner/src/domain/PlanAssembler.ts)
- [`packages/@dvt/planner/src/domain/hashing.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/planner/src/domain/hashing.ts)
- [`packages/@dvt/planner/package.json`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/planner/package.json)

Observed:

- `inputHashSha256` hashes normalized planner input;
- `planId` hashes canonical `PlanCore`;
- `pluginCompatibilityFingerprint` binds step IDs, kinds and configuration-key sets rather than complete execution semantics;
- planner directly consumes `json-canonicalize` and WebCrypto SHA-256.

Validation result:

```text
planId != InvocationDigest
inputHashSha256 != InvocationDigest
pluginCompatibilityFingerprint != InvocationDigest
```

The current values remain valid for their current purposes and must not be reinterpreted.

### 4.2 Shared crypto authority

Inspected:

- [`packages/@dvt/canonical/src/jcs.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/canonical/src/jcs.ts)
- [`packages/@dvt/canonical/src/sha256.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/canonical/src/sha256.ts)
- [`packages/@dvt/canonical/test/canonical.test.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/canonical/test/canonical.test.ts)
- [`packages/@dvt/engine/src/utils/jcs.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/engine/src/utils/jcs.ts)

Observed:

- a shared package named `@dvt/crypto` already exists;
- the handwritten JCS implementation sorts object keys through `localeCompare`;
- basic tests exist, but the inspected test set does not provide the complete normative RFC/cross-runtime corpus;
- engine consumers already reuse the package in some paths, while planner remains direct-library based.

Validation result:

```text
one intended primitive boundary exists
but repository convergence and RFC conformance are not yet demonstrated
```

### 4.3 Content-addressed artifacts

Inspected:

- [`IContentAddressedArtifactStore.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/artifacts/src/contentAddressed/IContentAddressedArtifactStore.ts)
- [`S3ContentAddressedArtifactStore.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/artifacts/src/contentAddressed/S3ContentAddressedArtifactStore.ts)

Observed:

- CAS publication validates digest, size and media type;
- object locations are tenant-scoped;
- publication is conditional;
- collision handling reads and verifies existing content;
- the public store contract does not map an executable invocation to a result.

Validation result:

```text
physical content integrity foundation exists
materialization/action identity does not
```

### 4.4 Contracts and ADR boundary

Inspected:

- [`ExecutionPlan.v1.ts`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/packages/%40dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts)
- [`ADR-0042`](https://github.com/dunay2/dvt/blob/c82cfeb733de1c0bed2f869904b8f9252c97db2e/docs/adr/ADR-0042-execution-plan-canonical-identity-unification.md)

Observed:

- DVT already separates canonical plan identity, versions, timestamps and ownership concerns;
- that separation can be reused conceptually for invocation identity;
- no current V1 materialization invocation contract was found in the bounded audit.

## 5. Reproduced canonicalization counterexample

### 5.1 Requirement

RFC 8785 requires object property names to be ordered as raw strings using unsigned UTF-16 code units, independent of locale.

For the keys `A` and `a`, raw code-unit order is:

```text
A (U+0041) before a (U+0061)
```

### 5.2 Current code path under test

The inspected shared implementation uses:

```ts
Object.keys(obj).sort((a, b) => a.localeCompare(b))
```

### 5.3 Reproduction command

Executed in Node with the default locale behavior:

```bash
node - <<'NODE'
function current(value) {
  const keys = Object.keys(value).sort((a, b) => a.localeCompare(b));
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + JSON.stringify(value[key])).join(',') + '}';
}

function codeUnit(value) {
  const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return '{' + keys.map((key) => JSON.stringify(key) + ':' + JSON.stringify(value[key])).join(',') + '}';
}

const input = { a: 1, A: 2 };
console.log('current=', current(input));
console.log('rfc-order=', codeUnit(input));
NODE
```

Observed output:

```text
current= {"a":1,"A":2}
rfc-order= {"A":2,"a":1}
```

### 5.4 Finding

This is a concrete divergence, not only a theoretical concern. An identity-critical consumer using the current handwritten path can generate different canonical bytes from the RFC-required ordering.

Required disposition:

- add this as a failing vector under #2185;
- select/fix the shared implementation;
- prove parity with the planner's current library path before migrating or versioning identities;
- do not create a materialization index until the surviving bytes are frozen.

This report does not infer that existing stored DVT identities are already corrupted. It proves that the current shared implementation is unsuitable as an unqualified RFC 8785 authority for new durable invocation identity.

## 6. Primary-source comparison

### 6.1 RFC 8785

Source: [RFC 8785 — JSON Canonicalization Scheme](https://www.rfc-editor.org/rfc/rfc8785.html)

Validated use:

- canonical JSON preimage;
- I-JSON constraints;
- ECMAScript primitive serialization;
- deterministic raw property ordering;
- normative/golden vectors.

Decision:

```text
adopt; do not invent a DVT encoder for V1 identity
```

### 6.2 Bazel Remote Execution API

Source: [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis/blob/main/build/bazel/remote/execution/v2/remote_execution.proto)

Validated prior-art distinction:

```text
Action digest -> Action Cache -> ActionResult
CAS digest -> opaque input/output bytes
```

Decision:

```text
reuse the separation concept
reject wholesale REAPI adoption for the first DVT vertical
```

DVT still needs provider-specific snapshots, semantic profiles, tenancy and evidence not supplied by the build-system model.

### 6.3 OCI Image Specification

Source: [OCI Image Specification](https://github.com/opencontainers/image-spec)

Validated use:

- immutable content descriptors;
- manifest/config digests;
- runtime image identity more precise than mutable tags.

Decision:

```text
reuse immutable OCI digest as one ExecutionContractDigest input when containers are material
```

## 7. Issue and ownership validation

Audited related ownership:

| Concern | Existing owner | S01 disposition |
|---|---|---|
| safe partial execution programme | [#2152](https://github.com/dunay2/dvt/issues/2152) | extend, do not duplicate |
| prior-art mapping | [#2154](https://github.com/dunay2/dvt/issues/2154) | feed slice findings into the wider reproducible study |
| bounded semantics/effects | [#2156](https://github.com/dunay2/dvt/issues/2156) | required semantic input |
| independent oracle | [#2157](https://github.com/dunay2/dvt/issues/2157) | later verification authority |
| immutable reuse evidence | [#2158](https://github.com/dunay2/dvt/issues/2158) | later evidence authority |
| bounded dbt vertical | [#2159](https://github.com/dunay2/dvt/issues/2159) | do not implement inside S01 |
| dbt analysis identity/convergence | [#2171](https://github.com/dunay2/dvt/issues/2171) | later provider-specific consumer |
| crypto/JCS/SHA convergence | [#2185](https://github.com/dunay2/dvt/issues/2185) | blocking primitive owner |
| execution diagnostics | [#2473](https://github.com/dunay2/dvt/issues/2473) | reuse later, no second event/log authority |

No new epic or duplicate crypto issue is justified by S01.

## 8. Validation still required before `pass`

### Canonical bytes

- [ ] full RFC 8785 vector corpus in the repository;
- [ ] `A`/`a` vector fails before and passes after convergence;
- [ ] non-ASCII and surrogate-pair ordering vectors;
- [ ] invalid lone surrogate handling;
- [ ] Node/browser byte parity;
- [ ] SHA-256 parity over exact UTF-8 bytes.

### Contract and identity

- [ ] approved `MaterializationInvocationIdentityV1` ADR/schema;
- [ ] strict unknown-field/version/algorithm rejection;
- [ ] duplicate input-port rejection;
- [ ] exact golden preimage/digest fixtures;
- [ ] 100/100 deterministic identity runs;
- [ ] result-affecting mutation matrix;
- [ ] incidental-field invariance matrix.

### First provider family

- [ ] authoritative recipe identity;
- [ ] authoritative trusted input snapshot identity;
- [ ] immutable runtime/plugin identity;
- [ ] output-contract identity;
- [ ] governed semantic profile;
- [ ] complete construction without hidden ambient state.

### Security

- [ ] tenant/trust-domain lookup isolation model;
- [ ] no cross-scope hit probing;
- [ ] governed secret version/ref model;
- [ ] raw-secret leak scan across preimages, errors, logs and fixtures.

### Repository checks after implementation

- [ ] focused contract/crypto/planner tests;
- [ ] cross-runtime test lane;
- [ ] architecture dependency checks;
- [ ] contracts/determinism lane;
- [ ] `pnpm verify:prepush`;
- [ ] no skipped/suppressed failure cited as evidence.

## 9. Acceptance thresholds

| Property | Threshold |
|---|---|
| identical-input identity determinism | 100/100 |
| RFC/cross-runtime golden divergence | 0 |
| result-affecting mutations missing the digest | 0 |
| approved incidental mutations changing the digest | 0 |
| unknown/profile-incomplete cases accepted | 0 |
| raw secrets in preimage/evidence | 0 |
| cross-scope lookup/discovery leak | 0 |
| existing identity changed without explicit version/migration | 0 |

No performance threshold applies to S01 beyond recording canonicalization/digest overhead. Correctness precedes caching value.

## 10. Risks and rollback evidence

Current PR impact:

```text
documentation only
no product code
no schema/database migration
no plan/hash/runtime behavior change
```

Future S01 implementation must remain removable without disabling normal execution and without rewriting current plan/artifact/receipt identities.

## 11. Final validation conclusion

The need for exact invocation identity is demonstrated, the integration seam is compatible with current DVT authorities, and mature standards cover the low-level primitives. The source audit also found a concrete canonicalization divergence that makes immediate implementation unsafe.

Therefore:

```text
Architectural direction: proceed
Implementation gate: blocked
Unblock when: P0/P1 evidence and contracts are complete
Next research pass: S02 ResultManifest and verification evidence
```
