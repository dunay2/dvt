---
title: G6 - OpenLineage CI + Schema Pin
status: Review
owner: Core Architecture / Traceability / Docs
last_reviewed: 2026-03-08
planning_type: proposal
---

# G6 - OpenLineage CI + Schema Pin

This folder centralizes the planning material for `G6`.

`G6` is the Phase 1.5 hardening track for package-scoped OpenLineage
translation quality in `@dvt/traceability-service`.

Use this folder as the planning entry point for `G6`. It does not close
delivery runtime concerns; those remain under `G10`.

Concept anchors for this folder:

- [Glossary](../../../concepts/glossary.md) for `traceability`,
  `schema pin`, `canonical spec`, and `verification tuple`
- [Domain Language](../../../concepts/domain-language.md) for the naming
  discipline between planning, status, contracts, and runtime concerns
- [Roadmap Of Record](../../roadmap/index.md) for repository-wide sequencing
- [Canonical Doc Code Matrix](../../status/canonical-doc-code-matrix.md) for
  the curated doc -> code -> test -> command mapping

## Scope Boundary

`G6` is explicitly about:

- deterministic translation tests in CI;
- `_schemaURL` pinning for emitted OpenLineage facet payloads;
- repo-governed normative artifacts for emitted lineage facets;
- hermetic validation of the pinned schema contract;
- mapper/resolver package hardening and closeout docs.

`G6` is explicitly not about:

- `outbox_lineage` delivery runtime;
- Marquez transport or delivery retries;
- external sink availability;
- worker/DLQ behavior for lineage publication.

Those runtime concerns stay under `G10`.

## Navigation

- [G6 OpenLineage CI and Schema Pin Plan](G6-OPENLINEAGE-CI-SCHEMA-PIN-PLAN.md)
- [G6 Architecture and QA Review](G6-ARCHITECTURE-QA-REVIEW-20260308.md)
- [Traceability Contracts](../../../contracts/traceability/index.md)
- [Gap Execution Plans](../GAP_EXECUTION_PLANS.md)
- [Gap Parallel Execution Tracks](../GAP_PARALLEL_EXECUTION_TRACKS.md)
- [System Delivery Status](../../../architecture/system-delivery-status.md)
- [Canonical Doc Code Matrix](../../status/canonical-doc-code-matrix.md)

## Planning Inputs Already In Repo

- [ADR-0032 - compiledCodeRef ownership](../../../adr/ADR-0032-compiledcoderef-ownership.md)
- [DVT+ Consolidated Architectural Review](../../reviews/DVT_ARCH_REVIEW_CONSOLIDATED_20260305.md)
- [DVT+ Architectural Review Pass 2](../../reviews/DVT+_Architectural_Review_Pass_2.md)
- [Gap Execution Plans - G6 section](../GAP_EXECUTION_PLANS.md#g6---openlineage-mapping-tests-ci--schema-pin)
- [System Delivery Status - Observability and Traceability](../../../architecture/system-delivery-status.md#observability-and-traceability)

## Current Baseline

- mapper and resolver package code exist;
- package-level tests exist;
- `_schemaURL` is already pinned in the emitted `sql` and `dvt_dbt_details`
  facets;
- the normative facet artifacts now live in
  [Traceability Contracts](../../../contracts/traceability/index.md);
- deterministic golden validation, offline schema validation execution, and the
  mandatory CI tuple remain open follow-up slices;
- lineage delivery runtime remains out of scope for this gap.
