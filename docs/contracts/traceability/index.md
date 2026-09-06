---
title: Traceability Contracts
status: Active
owner: Core Architecture / Traceability / Docs
last_reviewed: 2026-09-05
---

# Traceability Contracts

Normative contract home for lineage facets emitted by
`@dvt/traceability-service`.

This page is the canonical documentation entrypoint for the emitted facet
surface governed under `G6`.

## Canonical Contract Home

The repo-governed lineage facet artifacts live here:

- [OpenLineage vendored facets provenance](./facets/openlineage/index.md)
- [OpenLineage SQL Job Facet 1-0-0 vendored copy](./facets/openlineage/SqlJobFacet.1-0-0.schema.json)

Contract ownership split:

- `sql` facet:
  emitted `_schemaURL` stays pinned to the public OpenLineage schema URL
  `https://openlineage.io/spec/facets/1-0-0/SqlJobFacet.json`
  while this repo vendors a local copy for offline validation and review.
- artifact identity/read/integrity:
  traceability does not own a second artifact model or reader hierarchy.
  Step lifecycle events use the generic `StepArtifactRef` runtime contract and
  artifact bytes are read and verified through `@dvt/artifacts`.
- SQL lineage specialization:
  when a generic step artifact has `artifactKind = compiled-sql`, the mapper may
  build the standard OpenLineage SQL job facet from the verified artifact bytes.
  This specialization does not create a compiled-code artifact authority.

## Runtime And Code Anchors

The emitted schema URL is defined in:

- `packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts`

The emitted facet types are defined in:

- `packages/@dvt/traceability-service/src/lineage/types.ts`

The current builder and mapper surface is implemented in:

- `packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts`
- `packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`

The canonical generic artifact read/integrity path is implemented in:

- `packages/@dvt/artifacts/src/runtime/readVerifiedArtifactBytes.ts`
- `packages/@dvt/artifacts/src/runtime/readArtifactBytes.ts`
- `packages/@dvt/artifacts/src/runtime/validateArtifactIntegrity.ts`

## Governance Rules

- Planning docs under `docs/planning/archive/gaps/g6/` explain historical execution
  sequence and closure strategy, but they are not the normative facet contract.
- Any change to emitted `_schemaURL`, facet field names, or required properties
  must update the schema artifact in this folder and the corresponding canonical
  architecture evidence where required.
- Vendored OpenLineage mirrors must keep explicit provenance and update-policy
  notes in this folder so offline validation remains auditable during review.
- Traceability must not introduce a step-kind-specific artifact reference,
  reader, cache, resolver, fallback, or compatibility surface beside the
  canonical generic artifact authority.
- Validation lanes must validate mapper output against these local artifacts,
  not against the network.

## Hard Cut — 2026-09-05

The compiled-code-specific lineage contract and reader subsystem were removed.
There is no compatibility alias, dual-read path, or legacy replay reader.
Historical evidence may still describe the retired model at the commit where it
was valid; it is not active architecture.

## Related

- [G6 Hub](../../planning/archive/gaps/g6/index.md)
- [G6 OpenLineage CI and Schema Pin Plan](../../planning/archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
- [Gap Execution Plans](../../planning/archive/gaps/GAP_EXECUTION_PLANS.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
