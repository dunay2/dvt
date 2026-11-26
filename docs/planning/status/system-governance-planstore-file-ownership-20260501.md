---
title: System Governance Plan-Store Navigation
status: Review
owner: Architecture / Docs / Delivery
last_reviewed: 2026-11-24
planning_type: status
---

# System Governance Plan-Store Navigation

Planning DB owns the current PlanStore component identities and semantic
ownership. Git owns the current files. This page supplies operator query routes;
it does not copy component status, hierarchy, file inventory, or totals.

Documentation, decisions, reviews, and risks belong to the concrete contract,
artifact, API, PostgreSQL, Engine, or Temporal boundary they govern. A shared
documentation category does not establish an implementation component or replace
those owners. Verification associations can name another component's tests
without changing ownership of the complete test file.

## Mandatory Queries

```bash
pnpm planning:db:query units --component SYS-PLANSTORE --no-refresh
pnpm planning:db:query component-tree --parent-unit SYS-PLANSTORE --no-refresh
pnpm planning:db:query files --domain SYS-PLANSTORE --limit 1000 --no-refresh
pnpm planning:db:query filesystem-coverage --no-refresh
```

Use the returned component identity to inspect its current profile, required
tests, responsibilities, and relations. The queries retain unresolved ownership
and evidence as explicit findings; a navigation page cannot establish acceptance
or turn a physical fallback owner into a cohesive component.
