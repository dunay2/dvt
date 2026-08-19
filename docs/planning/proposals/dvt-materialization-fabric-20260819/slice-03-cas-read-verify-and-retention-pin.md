---
title: S03 - CAS read, verify and retention pin
status: Conditional GO; blocked by S02 descriptors and lifecycle ownership
owner: Artifacts / State Store / Security / Engine
baseline_commit: af2a7f85ea5a2cfb5a5e9a888f702c078814b426
created: 2026-08-19
parent_epic: 2486
tasks: [2493, 2494, 2495]
---

# S03 — CAS read, verify and retention pin

## Decision

**Conditional GO.** Extend the existing DVT content-addressed artifact authority with narrow tenant-scoped read/verify and reference-based pin capabilities. Do not create another CAS or a generic object-store facade.

This slice is implementation-blocked until S02 fixes the exact managed-output descriptor and current retention owners are reconciled.

## Need

The current CAS can publish bytes and verify a collision during publication. Reuse needs three additional guarantees:

1. retrieve or verify a known content descriptor without republishing it;
2. prevent unauthorized object-existence disclosure and arbitrary S3 access;
3. retain a result manifest and all managed outputs while a stored plan/run depends on them.

A hit is unsafe when an index references an object that was deleted, corrupted, moved outside scope or collected after planning.

## Current source audit

Baseline: [`main@af2a7f85ea5a2cfb5a5e9a888f702c078814b426`](https://github.com/dunay2/dvt/tree/af2a7f85ea5a2cfb5a5e9a888f702c078814b426).

### Existing CAS authority

`packages/@dvt/artifacts/src/contentAddressed/IContentAddressedArtifactStore.ts` currently exposes only `publish`.

`S3ContentAddressedArtifactStore.ts` already provides important properties:

- tenant-derived content-addressed object location;
- caller-supplied SHA-256, size and media-type checks;
- S3 conditional creation with `If-None-Match: *`;
- collision-path `GetObject` and integrity verification;
- typed storage failures rather than silent overwrite.

This is the correct physical-storage authority to extend.

### Existing lower-level reader

`packages/@dvt/artifacts/src/runtime/readArtifactBytes.ts` already supports bounded S3/file reads, cancellation and observed content metadata. It is a general runtime helper, not a tenant-scoped content-addressed verification contract. Reuse should extract/share narrow mechanics where appropriate, not expose a generic arbitrary-URI reader as the CAS API.

### Missing retention boundary

Repository retention/archival patterns exist for events and other state, but no materialization reference graph or pin guarantees that a result referenced by an immutable `PlanRef` remains available through execution/recovery.

## Architectural fit

```text
@dvt/artifacts
  -> content-addressed publish/read/verify ports
  -> S3 implementation and typed integrity observations

state-store/application lifecycle
  -> pin/reference metadata and idempotent release

materialization verifier
  -> consumes observations; decides eligibility

planner
  -> receives already verified/pinned evidence; never reads S3
```

The artifact package proves object bytes and descriptor compatibility. It does not decide that an invocation may be reused.

## Proposed ports

Names are provisional, responsibilities are not:

```ts
interface IContentAddressedArtifactVerifier {
  verify(input: {
    scope: ArtifactScope;
    expected: ManagedArtifactDescriptorV1;
    maxBytes: number;
    signal?: AbortSignal;
  }): Promise<ArtifactVerification>;
}

interface IContentAddressedArtifactReader {
  readVerified(input: VerifiedReadInput): Promise<VerifiedArtifactBytes>;
}

interface IMaterializationPinStore {
  acquire(input: PinRequest): Promise<PinReceipt>;
  renew(input: RenewPinRequest): Promise<PinReceipt>;
  release(input: ReleasePinRequest): Promise<void>;
}
```

Every read/verify request contains a complete expected descriptor. The adapter derives and validates the tenant path and digest key; callers do not browse buckets or submit arbitrary locators.

A pin covers the manifest and every managed output it references. It is owned by a plan, active run, evidence investigation or lifecycle policy and is separate from object identity.

## Open-source convergence

### S3 primitives to reuse

- [Amazon S3 conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html) for write-once digest keys;
- `GetObject` streaming and checksum metadata as additional observations;
- AWS SDK v3 already present in DVT;
- S3 versioning/Object Lock only if the approved threat/retention policy requires protection from privileged deletion or regulatory retention.

DVT must not trust ETag as SHA-256, especially for multipart uploads. The expected DVT descriptor remains authoritative and actual bytes are hashed under bounded streaming.

### Lifecycle concepts to reuse

- PostgreSQL transactional reference metadata;
- existing DVT retention/archive policy and batch-work mechanisms;
- Iceberg snapshot references only later for provider-managed snapshots.

Do not adopt a generic CAS service, external cache daemon or object-lock rollout as a prerequisite for the first vertical.

## Complexity

| Dimension | Complexity | Main risk |
|---|---:|---|
| Read/verify API | Medium | Accidentally creating arbitrary object-store access. |
| Streaming integrity | Medium–High | Unbounded buffering, cancellation and metadata mismatch. |
| Authorization/privacy | High | Existence probing across tenants/trust domains. |
| Pin/reference model | High | Collector races and partially pinned multi-output results. |
| Operations | High | Orphans, lifecycle jobs and shared-object references. |
| Migration | Medium | Existing publish API must retain behavior. |

## What exists and what is missing

| Capability | Exists | Missing |
|---|---|---|
| Tenant-scoped digest keys | S3 CAS publisher | Explicit scope-safe read/verify port. |
| Collision verification | Private publication path | Shared bounded integrity implementation. |
| Generic bounded reads | `readArtifactBytes` | CAS-specific authorization/path validation. |
| Cancellation/limits | Existing reader/plugin paths | Consistent verification contracts and metrics. |
| Retention policies | Other lifecycle domains | Materialization pins/reference graph. |
| Conditional publication | `If-None-Match: *` | Safe relation to manifest/index eligibility. |

## Task decomposition

1. [#2493](https://github.com/dunay2/dvt/issues/2493) adds tenant-scoped content-addressed read/verify ports.
2. [#2494](https://github.com/dunay2/dvt/issues/2494) implements bounded S3 byte-integrity verification and shares it with collision handling.
3. [#2495](https://github.com/dunay2/dvt/issues/2495) adds reference-based retention pins and safe release semantics.

## Implementation boundary

The smallest complete delivery is not “add `get()`”. It is:

```text
complete expected descriptor
  -> authorize scope without disclosing existence
  -> validate content-addressed locator
  -> bounded read/hash/metadata verification
  -> stable observation for ResultManifestVerifier
```

Pinning follows once S04 fixes the index/reference transaction boundary:

```text
verified complete manifest
  -> acquire all-or-nothing references
  -> persist startable immutable plan/run reference
  -> renew/recover while active
  -> release idempotently
  -> collector may evaluate only when no references remain
```

## Verification

Required cases:

- correct small and multi-chunk objects;
- corruption at beginning, middle and end;
- wrong tenant/path/digest/size/media type;
- missing versus unauthorized non-disclosure;
- oversized body and cancellation;
- conditional-publish races;
- plan cannot persist with a partially pinned manifest;
- two plans sharing an output retain it until both release;
- verifier/pin/collector race;
- abandoned plan/run recovery;
- S3 unavailable or checksum metadata absent.

Release invariants:

```text
unbounded materialization during verification = 0
cross-tenant object existence oracle = 0
active pinned result collected = 0
partially pinned plan made startable = 0
ETag accepted as DVT SHA-256 authority = 0
```

## Stop and narrow conditions

Stop or narrow when:

- scope-safe locator validation cannot prevent arbitrary bucket/key access;
- representative verification requires comparable work to recomputation and no cheaper trusted observation exists;
- current lifecycle ownership cannot provide reference-aware deletion;
- external provider snapshots cannot guarantee retention—classify those outputs unsupported instead of pretending a pin exists;
- the design begins replacing the existing artifact store rather than extending it.

## Gate result

```text
gateDecision: conditional-go
gateScope: bounded-artifact-extension
authorizedImplementation: false
blocksOn:
  - S02 managed output descriptor
  - scope disclosure policy
  - S04 index/reference boundary for pins
```
