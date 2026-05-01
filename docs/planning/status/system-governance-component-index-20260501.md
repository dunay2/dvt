---
title: System Governance Component Index
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-01
planning_type: status
---

# System Governance Component Index

## Purpose

This is the human summary for component/source governance units. The
machine-readable source is:

- [system-governance-component-index.components.yaml](./system-governance-component-index.components.yaml)

The index exposes how many components exist, how many files each component owns,
which root/domain chain each component belongs to, which components still
require subdivision, and which components are drift or legacy.

## Totals

- Component/source units: 20
- Components: 20
- Source units: 0
- Drift components: 4
- Legacy components: 1
- Components requiring children: 19

## By Level

<!-- prettier-ignore-start -->
| Level | Files |
| --- | ---: |
| `component` | 20 |
<!-- prettier-ignore-end -->

## By Status

<!-- prettier-ignore-start -->
| Status | Files |
| --- | ---: |
| `canonical` | 1 |
| `coverage-required` | 11 |
| `drift` | 4 |
| `legacy` | 1 |
| `review` | 2 |
| `superseded` | 1 |
<!-- prettier-ignore-end -->

## Oversized Components

Components with `childrenRequired: true` and more than 100 files:

<!-- prettier-ignore-start -->
| Component | Files | Status |
| --- | ---: | --- |
| `SYS-DOCS-GOVERNANCE-ROOT` | 1643 | `coverage-required` |
| `SYS-WEB-ROOT` | 783 | `coverage-required` |
| `SYS-API-ROOT` | 362 | `coverage-required` |
| `SYS-RUNTIME-ROOT` | 286 | `coverage-required` |
| `SYS-ADAPTERS-ROOT` | 196 | `coverage-required` |
| `SYS-CI-GOVERNANCE-ROOT` | 169 | `coverage-required` |
| `SYS-CONTRACTS-ROOT` | 127 | `coverage-required` |
| `SYS-REPO-METADATA-ROOT` | 109 | `canonical` |
| `SYS-WORKERS-ROOT` | 103 | `coverage-required` |
<!-- prettier-ignore-end -->

## Components

<!-- prettier-ignore-start -->
| Component | Level | Status | Files | DDD owner | Parent |
| --- | --- | ---: | ---: | --- | --- |
| `SYS-ADAPTERS-ROOT` | `component` | `coverage-required` | 196 | `ADP` | `SYS-ADAPTERS` |
| `SYS-API-ROOT` | `component` | `coverage-required` | 362 | `AS` | `SYS-API` |
| `SYS-CI-GOVERNANCE-ROOT` | `component` | `coverage-required` | 169 | `INFRA` | `SYS-CI-GOVERNANCE` |
| `SYS-CONTRACTS-ROOT` | `component` | `coverage-required` | 127 | `PORT` | `SYS-CONTRACTS` |
| `SYS-DOCS-GOVERNANCE-ROOT` | `component` | `coverage-required` | 1643 | `INFRA` | `SYS-DOCS-GOVERNANCE` |
| `SYS-OBSERVABILITY-ROOT` | `component` | `coverage-required` | 15 | `PORT` | `SYS-OBSERVABILITY` |
| `SYS-PLANNER-ROOT` | `component` | `coverage-required` | 76 | `DS` | `SYS-PLANNER` |
| `SYS-PLANSTORE-API-COMPOSITION` | `component` | `drift` | 20 | `AS` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-ARTIFACTS-PORTS` | `component` | `review` | 23 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-CONTRACTS` | `component` | `drift` | 3 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-DOCS-RISK` | `component` | `review` | 31 | `INFRA` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-ENGINE-FETCH` | `component` | `drift` | 5 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-POSTGRES` | `component` | `drift` | 16 | `ADP` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-ROOT` | `component` | `superseded` | 0 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `component` | `legacy` | 9 | `ADP` | `SYS-PLANSTORE` |
| `SYS-REPO-METADATA-ROOT` | `component` | `canonical` | 109 | `INFRA` | `SYS-REPO-METADATA` |
| `SYS-RUNTIME-ROOT` | `component` | `coverage-required` | 286 | `AS` | `SYS-RUNTIME` |
| `SYS-TRACEABILITY-ROOT` | `component` | `coverage-required` | 65 | `DS` | `SYS-TRACEABILITY` |
| `SYS-WEB-ROOT` | `component` | `coverage-required` | 783 | `ENTRY` | `SYS-WEB` |
| `SYS-WORKERS-ROOT` | `component` | `coverage-required` | 103 | `AS` | `SYS-WORKERS` |
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
