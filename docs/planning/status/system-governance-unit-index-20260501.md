---
title: System Governance Unit Index
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-08-17
planning_type: status
---

# System Governance Unit Index

> Generated from Planning DB authority. Do not edit this projection by hand.

This page is navigation only. Current architecture ownership, hierarchy, status,
relations and design scope must be consulted in the Planning DB before making an
architecture or design decision.

## Mandatory Queries

```bash
pnpm planning:db:query units --parent-unit SYS-DVT --no-refresh
pnpm planning:db:query component-metadata --component <COMPONENT-ID> --no-refresh
pnpm planning:db:query architecture-designs
pnpm planning:db:query architecture-scopes
pnpm planning:db:query filesystem-coverage --no-refresh
```

Publish derived human-review projections only when explicitly requested:

```bash
pnpm planning:db:export --output-root .
```

Ordinary documentation build and serve commands consume the last explicit
publication and do not regenerate it.

## Root Navigation

- `SYS-ADAPTERS` — Adapter domain (`coverage-required`)
- `SYS-API` — API workspace (`coverage-required`)
- `SYS-CI-GOVERNANCE` — CI and automation governance (`coverage-required`)
- `SYS-CONTRACTS` — Contracts workspace family (`coverage-required`)
- `SYS-DOCS-GOVERNANCE` — Documentation governance (`coverage-required`)
- `SYS-OBSERVABILITY` — Observability domain (`coverage-required`)
- `SYS-PLANNER` — Planner workspace family (`coverage-required`)
- `SYS-PLANSTORE` — Plan-store domain (`review`)
- `SYS-REPO-METADATA` — Repository metadata (`canonical`)
- `SYS-RUNTIME` — Runtime domain (`coverage-required`)
- `SYS-TRACEABILITY` — Traceability domain (`coverage-required`)
- `SYS-WEB` — Web workspace (`coverage-required`)
- `SYS-WORKERS` — Worker domain (`coverage-required`)
