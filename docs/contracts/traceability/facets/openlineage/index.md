---
title: OpenLineage Vendored Facets
status: Active
owner: Core Architecture / Traceability / Docs
last_reviewed: 2026-03-08
---

# OpenLineage Vendored Facets

This folder contains repo-local validation mirrors for OpenLineage schemas that
remain pinned in emitted lineage payloads.

## SQL Job Facet 1-0-0

- Emitted `_schemaURL`:
  `https://openlineage.io/spec/facets/1-0-0/SqlJobFacet.json`
- Repo-local artifact:
  [SqlJobFacet.1-0-0.schema.json](SqlJobFacet.1-0-0.schema.json)
- Vendored on: `2026-03-08`
- Artifact SHA-256:
  `e3b9996ed97a45198c83330021726b24ba0b04e5d7856e9a6d121eb636af7032`
- Purpose:
  offline validation and human review for `G6`; CI must validate against this
  repo-local copy and must not fetch schemas from the network
- Update policy:
  any change to the emitted `_schemaURL`, required properties, or facet field
  names must update this artifact, the emitting package constants and types, the
  relevant tests, and the supporting evidence docs in the same PR

## Related

- [Traceability Contracts](../../index.md)
- [G6 Hub](../../../../planning/gaps/g6/index.md)
