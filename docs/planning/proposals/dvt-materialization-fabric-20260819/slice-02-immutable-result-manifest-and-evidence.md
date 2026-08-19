---
title: S02 - Immutable result manifest and verification evidence
status: Conditional GO; implementation blocked by S01 and semantic-profile review
owner: Architecture / Contracts / Artifacts / Engine
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2490, 2491, 2492]
---

# S02 — Immutable result manifest and verification evidence

## Decision

**Conditional GO.** DVT needs one immutable `ResultManifestV1` and an independent verifier before any invocation can be considered reusable.

An `InvocationDigest` identifies the requested computation. It does not prove that a previous output is complete, present, intact, compatible, authorized or still retained. A reusable result must carry enough immutable evidence for a component other than the producer to verify it.

Implementation is blocked until S01 freezes invocation identity and #2156 fixes the first semantic profile, effect class and evidence obligations.

## Need

Without a manifest, the materialization index would associate an invocation with loose artifact references or prior run state. That permits several false-hit classes:

- one output from a multi-output step is missing;
- bytes exist but belong to another invocation or output contract;
- producer/runtime compatibility changed;
- validation evidence is absent, expired or unsupported;
- an object was deleted, corrupted or quarantined;
- a result is visible outside its authorized scope;
- a partially published result becomes discoverable.

The manifest is therefore the immutable bridge:

```text
InvocationDigest
  -> ResultManifestDigest
       -> named output descriptors
       -> producer/runtime identity
       -> validation evidence
       -> semantic/output contracts
```

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

DVT has adjacent capabilities, not this contract:

- `packages/@dvt/contracts/src/types/artifacts.ts` provides `ArtifactRef`, but its optional fields and closed artifact-kind vocabulary are not a complete action-result proof.
- `packages/@dvt/contracts/src/schema-packs/common.ts` defines `StepResultEvidenceSchema` for current sink/acquisition evidence. It does not bind an invocation to every reusable output.
- `packages/@dvt/contracts/src/schema-packs/run-events.ts` serializes completion/failure/skip evidence. Runtime history is not an immutable reusable-result authority.
- `IContentAddressedArtifactStore` publishes content-addressed bytes, but has no result-manifest contract.
- `StepSkipped` cannot represent a successfully satisfied output; this is handled later by S11.

Existing acquisition and sink evidence must remain valid in their present domains. They may be referenced by a result manifest when the semantic profile requires them, but must not be silently redefined.

## Architectural fit

```text
@dvt/contracts
  -> strict ResultManifestV1 and descriptor schemas

materialization domain
  -> pure acceptance policy and reason codes

@dvt/artifacts
  -> immutable manifest/output publication and verification observations

application layer
  -> combines authorization, retention, provider and artifact observations

engine/events
  -> records executed or reused outcome; never becomes manifest storage
```

The executor can create a candidate manifest, but it cannot alone declare it reusable. Eligibility requires the independent verifier and the fenced publication/index protocol from S03–S04.

## Proposed V1 boundary

A managed-output manifest should bind at least:

```ts
type ResultManifestV1 = {
  schemaVersion: '1.0';
  invocationDigest: ContentDigestV1;
  semanticProfile: { profileId: string; profileVersion: string };
  outputContractDigest: ContentDigestV1;

  outputs: readonly {
    name: string;
    kind: 'managed-artifact';
    artifact: {
      uri: string;
      sha256: string;
      sizeBytes: number;
      mediaType: string;
    };
  }[];

  producer: {
    pluginImplementationDigest: ContentDigestV1;
    executionContractDigest: ContentDigestV1;
  };

  validationEvidence: readonly EvidenceDescriptorV1[];
  provenance: {
    producerRunRef?: string;
    producedAt: string;
  };
};
```

The complete manifest has its own canonical SHA-256 digest. Output names are unique and deterministically ordered. Provenance fields may record when and by which attempt the result was produced, but their compatibility meaning must be frozen rather than guessed.

External snapshot outputs are excluded from the first implementation unless one provider-specific verifier can prove immutability, accessibility and retention. S09 later introduces that boundary.

## Open-source convergence

### Adopt concepts

- [in-toto Statement v1](https://github.com/in-toto/attestation/tree/main/spec/v1): typed statement with digest-addressed subjects and a predicate. DVT can reuse the separation without importing supply-chain claims it cannot verify.
- [OCI Image Specification descriptors](https://github.com/opencontainers/image-spec/blob/main/descriptor.md): media type, digest and byte size as a compact immutable content descriptor.
- [Bazel Remote Execution API](https://github.com/bazelbuild/remote-apis): `ActionResult` remains separate from action identity and CAS objects.
- Existing DVT Zod/runtime-schema and canonical-hash authorities.

### Do not adopt yet

- a generic attestation framework, PKI or signing service;
- SLSA provenance levels as a substitute for DVT result validity;
- logical equivalence between different physical encodings;
- an embedded manifest JSON column in the mutable index;
- mutable repair of a published manifest.

Signing is a later threat-model decision. V1 integrity can rely on content addressing, trusted service boundaries, authorization and independent byte verification. A signature does not prove semantic completeness.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Contract semantics | High | Omitting a required output/evidence field creates false hits. |
| Implementation | Medium | Strict schemas and canonical hashing are bounded. |
| Compatibility/versioning | High | Manifests become durable evidence read by future versions. |
| Publication operations | High | S3/PostgreSQL boundary has no distributed transaction. |
| Security | High | Scope, protected locators and producer references can leak information. |
| Verification | High | Every output and evidence item must be checked independently. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Artifact descriptors | `ArtifactRef`, SHA/size/media observations | Strict complete managed-output descriptor for reuse. |
| Runtime evidence | Acquisition and sink evidence | Versioned reusable-result evidence vocabulary. |
| Content-addressed publication | S3 CAS | Manifest publication/read/verify and result binding. |
| Contract validation | Shared schemas | `ResultManifestV1`, compatibility and rejection rules. |
| Execution history | Run events/read models | Independent result verifier; history alone is insufficient. |

## Task decomposition

1. [#2490](https://github.com/dunay2/dvt/issues/2490) freezes `ResultManifestV1`, output/evidence descriptors and golden vectors.
2. [#2491](https://github.com/dunay2/dvt/issues/2491) implements the independent pure verifier and corruption corpus.
3. [#2492](https://github.com/dunay2/dvt/issues/2492) defines atomic publication order, compatibility and crash recovery.

## Implementation order

```text
S01 exact identity
  -> ResultManifestV1 contract/golden vectors
  -> S03 artifact read/verify observations
  -> independent verifier
  -> S04 fenced index confirmation
  -> atomic publication state machine
```

An index row must not become `ELIGIBLE` until all managed outputs and the manifest have been published and independently verified. Repeated publication of identical objects is idempotent; conflicting bytes/metadata are quarantined, not overwritten.

## Verification and falsification

Required negative corpus:

- manifest digest mismatch;
- wrong invocation/output-contract/profile version;
- missing or duplicate output;
- output digest, size or media-type mismatch;
- incompatible producer/runtime;
- unsupported evidence version;
- missing, expired or quarantined evidence;
- unauthorized scope;
- crash before/after each publication boundary;
- two producers attempting conflicting manifests for one invocation.

Release invariants:

```text
eligible manifest with missing output = 0
eligible manifest with corrupt output = 0
partial multi-output hit = 0
unsupported evidence silently accepted = 0
cross-scope manifest disclosure = 0
```

## Stop and narrow conditions

Stop or narrow when:

- the first profile cannot enumerate all outputs and required validation evidence;
- producer compatibility relies on mutable or hidden runtime state;
- independent verification cannot be performed without re-running the complete computation at comparable cost;
- publication recovery cannot guarantee that eligibility follows complete verification;
- the design starts becoming a generic provenance/PKI platform.

## Gate result

```text
gateDecision: conditional-go
gateScope: design-and-contract
authorizedImplementation: false
blocksOn:
  - S01 canonical identity
  - #2156 semantic/effect profile
  - S03 read/verify contract
  - S04 fenced confirm protocol
```
