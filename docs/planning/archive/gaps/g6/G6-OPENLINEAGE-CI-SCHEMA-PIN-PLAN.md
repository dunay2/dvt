---
title: G6 OpenLineage CI and Schema Pin Plan
status: Proposed
owner: Core Architecture / Traceability / Docs
last_reviewed: 2026-03-08
planning_type: proposal
---

# G6 OpenLineage CI and Schema Pin Plan

## Goal

Close `G6` by making the current OpenLineage translation surface in
`@dvt/traceability-service` deterministic, schema-pinned, and hermetically
validated in CI.

## Canonical Anchors

- [Glossary](../../../../concepts/glossary.md) for `traceability`,
  `schema pin`, `canonical spec`, `verification tuple`, and `golden fixture`
- [Domain Language](../../../../concepts/domain-language.md) for the distinction
  between planning docs, status docs, and normative contract artifacts
- [G6 hub](./index.md) for planning navigation
- [Traceability Contracts](../../../../contracts/traceability/index.md) for the
  normative emitted facet artifacts
- [Canonical Doc Code Matrix](../../../status/canonical-doc-code-matrix.md) for
  the curated doc -> code -> test -> command mapping
- [System Delivery Status](../../../../architecture/system-delivery-status.md) for
  the cross-system implementation snapshot

## Baseline After `#405` And `#408`

Already landed:

- centralized lineage schema constants in
  `packages/@dvt/traceability-service/src/lineage/openlineageSchema.ts`
- governed emitted facet shapes for `sql` and `dvt_dbt_details`
- repo-local normative contract artifacts for both emitted facets

Still open:

- deterministic golden regression coverage
- offline schema validation execution against the vendored artifacts
- explicit CI command tuple for `G6` closeout

## Scope

### In Scope

- package-scoped translation from DVT run events to OpenLineage job facets
- governance of both emitted facets: `sql` and `dvt_dbt_details`
- deterministic tests for successful and fail-open mapping paths
- hermetic resolver behavior in test runs
- CI and documentation closure for this package boundary

### Out Of Scope

- full OpenLineage run-event envelope delivery
- `_outbox_lineage` transport/runtime design
- Marquez connectivity, retries, or fail-open publication runtime
- production lineage worker operations

Those concerns remain in `G10`.

## Normative Artifact Decision

The canonical normative home for emitted lineage facets is:

- [Traceability Contracts](../../../../contracts/traceability/index.md)

Artifact split:

- OpenLineage SQL facet:
  vendored local copy under
  `docs/contracts/traceability/facets/openlineage/SqlJobFacet.1-0-0.schema.json`
- DVT custom facet:
  repo-governed schema under
  `docs/contracts/traceability/facets/DvtDbtDetailsJobFacet.v1.schema.json`

Rationale:

- the contracts become navigable from Zensical
- the emitted facet surface is no longer governed only by prose planning docs
- later validation lanes can use stable repo-local artifacts without network

## Remaining Implementation Sequence

### Slice 3 - Deterministic golden tests

Add committed mapper fixtures and golden outputs for:

- success path with compiled SQL
- fail-open path when compiled code resolution fails
- no-facet path when no `compiledCodeRef` is present

Acceptance:

- mapper output drift becomes visible and reviewable in PRs
- committed golden fixtures fail when the payload changes unexpectedly

### Slice 4 - Offline schema validation

Validate emitted facet payloads against the local artifacts in
[Traceability Contracts](../../../../contracts/traceability/index.md).

Acceptance:

- validation runs offline
- emitted `_schemaURL` and vendored/local artifact IDs stay aligned
- failures clearly distinguish contract drift from mapping logic drift

### Slice 5 - CI and closeout

Wire the mandatory verification tuple and close the docs/status trail.

Target closure tuple:

- `pnpm --filter @dvt/traceability-service test`
- `pnpm --filter @dvt/traceability-service test:lineage:golden`
- `pnpm --filter @dvt/traceability-service test:lineage:schema`
- `pnpm traceability:adr0`

Equivalent commands are acceptable, but `G6` closure must keep:

- one explicit package regression lane
- one explicit golden validation lane
- one explicit schema validation lane

Closeout docs must update at least:

- [Gap Execution Plans](../GAP_EXECUTION_PLANS.md)
- [Canonical Doc Code Matrix](../../../status/canonical-doc-code-matrix.md)
- [System Delivery Status](../../../../architecture/system-delivery-status.md)
- one evidence doc or residual risk record, depending on closeout state

## Definition Of Done

`G6` is closed only when all of the following are true:

- both emitted facets are governed by explicit repo-local contract artifacts
- emitted facet shape is type-checked and test-asserted
- deterministic golden fixtures exist for the main mapper paths
- schema validation runs against vendored/local artifacts
- an explicit verification command tuple is recorded in docs and CI
- delivery/runtime concerns remain explicitly deferred to `G10`

## Story Order

1. `#405` - govern both emitted facets and centralize schema constants
2. `#408` - add normative contract artifacts for emitted lineage facets
3. `#404` - add deterministic golden regression coverage
4. `#407` - add offline schema validation and hermetic resolver validation
5. `#406` - wire the mandatory CI verification tuple and docs closeout
