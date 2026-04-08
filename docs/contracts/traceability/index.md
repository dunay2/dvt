---
title: Traceability Contracts
status: Active
owner: Core Architecture / Traceability / Docs
last_reviewed: 2026-03-08
---

# Traceability Contracts

Normative contract home for lineage facets emitted by
`@dvt/traceability-service`.

This page is the canonical documentation entrypoint for the emitted facet
surface governed under `G6`.

## Canonical Contract Home

The repo-governed lineage facet artifacts live here:

- [OpenLineage vendored facets provenance](facets/openlineage/index.md)
- [OpenLineage SQL Job Facet 1-0-0 vendored copy](facets/openlineage/SqlJobFacet.1-0-0.schema.json)
- [DvtDbtDetailsJobFacet v1](facets/DvtDbtDetailsJobFacet.v1.schema.json)
- [CompiledCodeRef v1 shared contract](../shared/CompiledCodeRef.v1.schema.json)

Contract ownership split:

- `sql` facet:
  emitted `_schemaURL` stays pinned to the public OpenLineage schema URL
  `https://openlineage.io/spec/facets/1-0-0/SqlJobFacet.json`
  while this repo vendors a local copy for offline validation and review.
- `dvt_dbt_details` facet:
  emitted `_schemaURL` points to the repo-governed DVT schema ID
  `https://dvt.local/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json`
  and the normative schema artifact is versioned locally in this folder.
  Its `compiledCodeRef` property mirrors the shared-kernel contract artifact
  under `docs/contracts/shared/CompiledCodeRef.v1.schema.json` so the facet
  schema stays self-contained for offline AJV compilation.

## Runtime And Code Anchors

The emitted schema URLs are defined in:

- `packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts`

The emitted facet types are defined in:

- `packages/@dvt/traceability-service/src/lineage/types.ts`

The current builder and mapper surface is implemented in:

- `packages/@dvt/traceability-service/src/lineage/facets/SqlJobFacetBuilder.ts`
- `packages/@dvt/traceability-service/src/lineage/mapper/StepStartedLineageMapper.ts`

## Governance Rules

- Planning docs under `docs/planning/archive/gaps/g6/` explain execution sequence and
  closure strategy, but they are not the normative facet contract.
- Any change to emitted `_schemaURL`, facet field names, or required properties
  must update the schema artifact in this folder and the corresponding evidence
  or gap closeout docs.
- Vendored OpenLineage mirrors must keep explicit provenance and update-policy
  notes in this folder so offline validation remains auditable during review.
- Repo-local traceability facets that embed shared-kernel structures must stay
  aligned with the shared contract artifact and document that linkage
  explicitly; use a self-contained mirror when offline AJV compilation cannot
  resolve external schema references.
- Validation lanes introduced in later `G6` slices must validate mapper output
  against these local artifacts, not against the network.

## Related

- [G6 Hub](../../planning/archive/gaps/g6/index.md)
- [G6 OpenLineage CI and Schema Pin Plan](../../planning/archive/gaps/g6/G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
- [Gap Execution Plans](../../planning/archive/gaps/GAP_EXECUTION_PLANS.md)
- [Canonical Doc Code Matrix](../../planning/status/canonical-doc-code-matrix.md)
