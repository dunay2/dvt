---
title: System Governance Plan-Store Navigation
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-08-17
planning_type: status
---

# System Governance Plan-Store Navigation

> Generated from Planning DB authority. Do not edit this projection by hand.

This page intentionally contains no file inventory or copied totals. Query the
current DB read models and generated Git ownership projection instead.

## Mandatory Queries

```bash
pnpm planning:db:query units --component SYS-PLANSTORE --no-refresh
pnpm planning:db:query component-tree --parent-unit SYS-PLANSTORE --no-refresh
pnpm planning:db:query files --domain SYS-PLANSTORE --limit 1000 --no-refresh
pnpm planning:db:query filesystem-coverage --no-refresh
```

## Component Navigation

- `SYS-PLANSTORE` — Plan-store domain (`review`)
- `SYS-PLANSTORE-API-COMPOSITION` — API plan-store composition and resolvers (`review`)
- `SYS-PLANSTORE-ARTIFACTS-PORTS` — Plan-store artifacts ports and runtime readers (`review`)
- `SYS-PLANSTORE-CONTRACTS` — Plan-store contracts (`review`)
- `SYS-PLANSTORE-DOCS-RISK` — Plan-store docs, reviews, risk, and evidence (`review`)
- `SYS-PLANSTORE-ENGINE-FETCH` — Engine plan artifact fetch and plan-ref policy (`review`)
- `SYS-PLANSTORE-POSTGRES` — Postgres plan-store adapter implementation (`review`)
- `SYS-PLANSTORE-ROOT` — Plan-store root component (`superseded`)
- `SYS-PLANSTORE-TEMPORAL-COMPOSITION` — Temporal plan-store composition and plan-ref workflow boundary (`review`)
