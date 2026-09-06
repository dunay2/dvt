---
title: Generic Artifact Lineage Extraction User Stories
status: Active
owner: Traceability / Docs
last_reviewed: 2026-09-05
---

# Generic Artifact Lineage Extraction User Stories

## User Stories

### Verified SQL lineage

As a lineage consumer, I want a `StepStarted` event carrying a generic `StepArtifactRef` for `compiled-sql` to produce the standard SQL lineage facet, so traceability can describe executed SQL without owning artifact storage semantics.

Given a valid `StepArtifactRef` whose artifact kind is `compiled-sql`, when the mapper handles the event, then it reads and verifies the artifact through `@dvt/artifacts` and emits `SqlJobFacet`.

### Degraded artifact access

As an operator, I want lineage extraction to fail open when an artifact is unavailable, so lineage delivery does not become runtime lifecycle authority.

Given a valid generic artifact reference that cannot be read or fails integrity validation, when the mapper handles the event, then it emits no SQL facet and returns an `ARTIFACT_READ_FAILED` warning.

### Non-SQL artifacts

As a lineage maintainer, I want non-SQL artifact kinds ignored by the SQL mapper, so generic artifact identity does not imply SQL semantics.

Given a `StepArtifactRef` with an artifact kind other than `compiled-sql`, when the mapper handles the event, then it emits neither a SQL facet nor a warning.

## Negative scenarios

- Direct legacy compiled-code references are rejected by the event contract; there is no fallback reader.
- Traceability must not add its own S3/file/memory reader hierarchy, cache, resolver, or integrity implementation.
- A custom compiled-code lineage facet must not coexist with the standard SQL facet.

## Traceability

- Contract authority: `@dvt/contracts::StepArtifactRef`
- Artifact read/integrity authority: `@dvt/artifacts::readVerifiedArtifactBytes`
- Mapper: `@dvt/traceability-service::StepStartedLineageMapper`
- Delivery composition: `apps/lineage-worker`
