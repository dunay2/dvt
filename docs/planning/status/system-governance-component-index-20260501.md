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

Fowler semantics are split from raw status so `canonical` does not act as a
hidden authority signal. `governanceState` says whether the unit is governed
or remediation-bound, `canonicalRole` says what kind of canonical role it
plays, and `evidenceState` says whether the row is verified or only
classified.

## Totals

- Component/source units: 31
- Components: 31
- Source units: 0
- Drift components: 4
- Legacy components: 0
- Components requiring children: 18

## By Level

<!-- prettier-ignore-start -->
| Level | Files |
| --- | ---: |
| `component` | 31 |
<!-- prettier-ignore-end -->

## By Status

<!-- prettier-ignore-start -->
| Status | Files |
| --- | ---: |
| `canonical` | 1 |
| `coverage-required` | 22 |
| `drift` | 4 |
| `review` | 3 |
| `superseded` | 1 |
<!-- prettier-ignore-end -->

## By Governance State

<!-- prettier-ignore-start -->
| Governance state | Files |
| --- | ---: |
| `coverage-required` | 22 |
| `drift` | 4 |
| `governed` | 1 |
| `review` | 3 |
| `superseded` | 1 |
<!-- prettier-ignore-end -->

## By Canonical Role

<!-- prettier-ignore-start -->
| Canonical role | Files |
| --- | ---: |
| `implementation-owner` | 1 |
| `none` | 30 |
<!-- prettier-ignore-end -->

## Oversized Components

Components with `childrenRequired: true` and more than 100 files:

<!-- prettier-ignore-start -->
| Component | Files | Status |
| --- | ---: | --- |
| `SYS-DOCS-GOVERNANCE-ROOT` | 1652 | `coverage-required` |
| `SYS-WEB-ROOT` | 797 | `coverage-required` |
| `SYS-RUNTIME-ROOT` | 286 | `coverage-required` |
| `SYS-ADAPTERS-ROOT` | 196 | `coverage-required` |
| `SYS-CI-GOVERNANCE-ROOT` | 180 | `coverage-required` |
| `SYS-CONTRACTS-ROOT` | 127 | `coverage-required` |
| `SYS-REPO-METADATA-ROOT` | 111 | `canonical` |
| `SYS-WORKERS-ROOT` | 103 | `coverage-required` |
<!-- prettier-ignore-end -->

## Components

<!-- prettier-ignore-start -->
| Component | Level | Status | Governance state | Canonical role | Evidence state | Files | DDD owner | Parent |
| --- | --- | ---: | --- | --- | --- | ---: | --- | --- |
| `SYS-ADAPTERS-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 196 | `ADP` | `SYS-ADAPTERS` |
| `SYS-API-APPLICATION-PORTS` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 16 | `PORT` | `SYS-API-ROOT` |
| `SYS-API-APPLICATION-SERVICES` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 34 | `AS` | `SYS-API-ROOT` |
| `SYS-API-BOOTSTRAP` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 2 | `ENTRY` | `SYS-API-ROOT` |
| `SYS-API-DOCS` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 14 | `INFRA` | `SYS-API-ROOT` |
| `SYS-API-DOMAIN-AUTH` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 1 | `DS` | `SYS-API-ROOT` |
| `SYS-API-HTTP-ENTRYPOINT-TESTS` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 50 | `INFRA` | `SYS-API-ROOT` |
| `SYS-API-HTTP-ENTRYPOINTS` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 75 | `ENTRY` | `SYS-API-ROOT` |
| `SYS-API-INFRASTRUCTURE` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 27 | `ADP` | `SYS-API-ROOT` |
| `SYS-API-OPS-ROUTES` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 11 | `ENTRY` | `SYS-API-ROOT` |
| `SYS-API-REPO-CONFIG` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 11 | `INFRA` | `SYS-API-ROOT` |
| `SYS-API-RUNTIME-COMPOSITION` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 26 | `AS` | `SYS-API-ROOT` |
| `SYS-API-TESTS` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 99 | `INFRA` | `SYS-API-ROOT` |
| `SYS-CI-GOVERNANCE-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 180 | `INFRA` | `SYS-CI-GOVERNANCE` |
| `SYS-CONTRACTS-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 127 | `PORT` | `SYS-CONTRACTS` |
| `SYS-DOCS-GOVERNANCE-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 1652 | `INFRA` | `SYS-DOCS-GOVERNANCE` |
| `SYS-OBSERVABILITY-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 15 | `PORT` | `SYS-OBSERVABILITY` |
| `SYS-PLANNER-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 76 | `DS` | `SYS-PLANNER` |
| `SYS-PLANSTORE-API-COMPOSITION` | `component` | `drift` | `drift` | `none` | `remediation-required` | 20 | `AS` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-ARTIFACTS-PORTS` | `component` | `review` | `review` | `none` | `review-required` | 23 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-CONTRACTS` | `component` | `drift` | `drift` | `none` | `remediation-required` | 3 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-DOCS-RISK` | `component` | `review` | `review` | `none` | `review-required` | 34 | `INFRA` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-ENGINE-FETCH` | `component` | `drift` | `drift` | `none` | `remediation-required` | 5 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-POSTGRES` | `component` | `drift` | `drift` | `none` | `remediation-required` | 16 | `ADP` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-ROOT` | `component` | `superseded` | `superseded` | `none` | `retired` | 0 | `PORT` | `SYS-PLANSTORE` |
| `SYS-PLANSTORE-TEMPORAL-COMPOSITION` | `component` | `review` | `review` | `none` | `review-required` | 11 | `ADP` | `SYS-PLANSTORE` |
| `SYS-REPO-METADATA-ROOT` | `component` | `canonical` | `governed` | `implementation-owner` | `classification-only` | 111 | `INFRA` | `SYS-REPO-METADATA` |
| `SYS-RUNTIME-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 286 | `AS` | `SYS-RUNTIME` |
| `SYS-TRACEABILITY-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 65 | `DS` | `SYS-TRACEABILITY` |
| `SYS-WEB-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 797 | `ENTRY` | `SYS-WEB` |
| `SYS-WORKERS-ROOT` | `component` | `coverage-required` | `coverage-required` | `none` | `coverage-required` | 103 | `AS` | `SYS-WORKERS` |
<!-- prettier-ignore-end -->

## Related Surfaces

- [System Governance File Index](./system-governance-file-index-20260501.md)
- [System Governance Unit Index](./system-governance-unit-index-20260501.md)
- [System Governance Unit Taxonomy](./system-governance-unit-taxonomy-20260501.md)
