---
title: ADR-0067 - Canonical Artifact Authority and Compiled-Code Hard Cut
status: Accepted
owner: Architecture / Artifacts / Contracts / Temporal / Traceability
last_reviewed: 2026-09-05
supersedes: ADR-0032
---

# ADR-0067 - Canonical Artifact Authority and Compiled-Code Hard Cut

## Status

Accepted.

Supersedes [ADR-0032](./ADR-0032-compiledcoderef-ownership.md).

## Context

DVT had two overlapping artifact models:

1. the generic content-addressed artifact authority in `@dvt/artifacts`, with
   generic runtime `StepArtifactRef` references and shared read/integrity
   behavior;
2. a compiled-code-specific family spanning Planner, Contracts, Temporal and
   Traceability (`ICompiledCodeStorage`, `CompiledCodeRef`, storage adapters,
   projection bridges, readers, cache and resolver).

The compiled-code family duplicated publication, reference, read and integrity
authority. Keeping both would violate the repository ownership rule that one
kind of truth has one owner.

A second generic `ArtifactRef` shape also remained exported from
`@dvt/contracts/src/types/artifacts.ts` without productive consumers. It encoded
artifact identity again with `uri/kind/sha256/sizeBytes`, competing with the
runtime `StepArtifactRef` shape.

## Decision

### 1. One artifact publication authority

New artifact publication uses the canonical generic content-addressed artifact
boundary owned by `@dvt/artifacts`.

There is no compiled-code-specific storage port or writer family.

### 2. One runtime artifact reference model

`StepArtifactRef` is the generic runtime artifact reference for step lifecycle
facts.

`CompiledCodeRef` is removed. The unused generic `ArtifactRef` / `DbtProjectBundleRef`
reference family is also removed rather than retaining a second generic shape.
A SQL artifact is represented by `StepArtifactRef` with
`artifactKind = compiled-sql`; this does not create a second SQL artifact
contract.

### 3. Planner does not publish artifacts

Planner materializes `ExecutionPlan`. Artifact publication/enrichment is not a
Planner responsibility. `attachCompiledCodeRefs` and execution-binding models
whose only purpose was the compiled-code transport are removed.

### 4. Temporal does not project legacy artifact models

Temporal executes the admitted plan and emits lifecycle facts. It does not
translate a compiled-code-specific step field into a generic artifact event
reference.

### 5. Traceability delegates artifact I/O and integrity

Traceability may specialize verified SQL artifacts into the standard
OpenLineage SQL Job Facet, but artifact URI handling, bytes, SHA-256 validation
and size validation are delegated to `@dvt/artifacts`.

Traceability owns no compiled-code-specific reader, cache, resolver, fallback,
or custom compiled-code facet.

### 6. Crypto consolidation remains separately owned

This hard cut removes SHA helpers that existed only to support the retired
compiled-code family. It does not broaden into the independent crypto
consolidation track. Surviving generic artifact integrity code keeps its current
runtime hashing implementation until the dedicated crypto owner migrates it.
No new hash abstraction is introduced here.

## Hard-Cut Compatibility Policy

This is an intentional breaking cut.

After this change DVT does not preserve:

- aliases or forwarding exports;
- deprecated compiled-code contracts;
- dual-read or dual-write paths;
- fallback readers;
- compatibility adapters;
- replay-only branches for the retired `compiledCodeRef` payload/step shape.

Persisted Temporal histories, plans or event payloads that require the retired
compiled-code-specific model are outside the supported compatibility horizon
after deployment of this cut. Operators must treat deployment as a runtime
history/schema boundary; the old model is not replayed through a permanent
legacy branch.

## Resulting Authority Model

```text
artifact publication        -> @dvt/artifacts CAS
artifact runtime reference  -> StepArtifactRef
artifact read + integrity   -> @dvt/artifacts
SQL lineage specialization  -> @dvt/traceability-service after verified read
Planner                     -> ExecutionPlan only
Temporal                    -> execution/lifecycle only
```

## Consequences

Positive:

- one artifact publication/read/integrity path;
- one generic runtime artifact reference shape;
- no compiled-code artifact subsystem beside CAS;
- Planner and Temporal responsibilities become narrower;
- Traceability retains SQL lineage without owning storage semantics.

Trade-off:

- old histories and payloads that depend on `compiledCodeRef` are not supported
  by a compatibility branch after the hard cut.

## Verification

The delivery PR must prove productive/public zero reachability for the retired
compiled-code symbols and keep affected package build, typecheck, tests,
architecture guards, determinism/golden tests, pre-push and required CI green.

## References

- [ADR-0032 - historical compiledCodeRef ownership decision](./ADR-0032-compiledcoderef-ownership.md)
- [ADR-0043 - Plan record, plan store, and artifacts ownership](./ADR-0043-plan-record-plan-store-and-artifacts-ownership.md)
- `packages/@dvt/contracts/src/contracts/engine/RunStateVocabulary.v1.ts`
- `packages/@dvt/artifacts/src/contentAddressed/IContentAddressedArtifactStore.ts`
- `packages/@dvt/artifacts/src/runtime/readVerifiedArtifactBytes.ts`
- `packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`
