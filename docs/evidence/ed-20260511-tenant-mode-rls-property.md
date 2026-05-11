---
title: Tenant-mode RLS property proof
status: Accepted
date: 2026-05-11
owners:
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts
    - '$env:DVT_PG_ADMIN_URL="postgresql://dvt_planning:dvt_planning_local@localhost:55432/dvt_planning"; $env:DVT_PG_APP_USER="dvt_app"; $env:DVT_PG_APP_PASSWORD="dvt_app"; node scripts/provision-postgres-app-role.cjs'
    - '$env:DVT_PG_ADMIN_URL="postgresql://dvt_planning:dvt_planning_local@localhost:55432/dvt_planning"; $env:DVT_PG_RLS_URL="postgresql://dvt_app:dvt_app@localhost:55432/dvt_planning"; $env:DVT_PG_INTEGRATION="1"; $env:DVT_PG_URL=$env:DVT_PG_ADMIN_URL; $env:DATABASE_URL=$env:DVT_PG_ADMIN_URL; pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresTenantRlsEnforcement.integration.test.ts'
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm verify:prepush
---

## Summary

This evidence closes `C/AR-C-TENANT-ISOLATION-PROPERTY` for the Postgres
tenant-owned online tables. The RLS tenant branch now requires a complete
transaction-local tenant mode, not only a matching `dvt.tenant_id` setting.

## Traceability

| Link             | Evidence                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement      | `AR-C-TENANT-ISOLATION-PROPERTY`: prove tenant isolation and RLS service-access posture with property or negative tests and runtime evidence.                                     |
| Decision         | ADR-0031 and the production tenant-isolation baseline require forced RLS on tenant-owned online Postgres tables.                                                                  |
| Design           | `PostgresTenantIsolationPolicy` owns the tenant table catalog, tenant/service context SQL, and RLS predicate generation.                                                          |
| Contract         | `setTenantContextSql()`, `setServiceContextSql()`, and `buildTenantIsolationPolicySql(schema, table)`.                                                                            |
| Code             | `PostgresTenantIsolationPolicy.ts` now gates the tenant predicate by `dvt.access_mode = tenant` and matching `tenant_id`.                                                         |
| Test             | `PostgresTenantIsolationPolicy.test.ts` asserts the generated predicate and `PostgresTenantRlsEnforcement.integration.test.ts` proves every cataloged table with tenant A/B rows. |
| Runtime evidence | The integration proof ran against a non-owner, non-`BYPASSRLS`, non-schema-creating Postgres app role using `DVT_PG_RLS_URL`.                                                     |

## Runtime Proof

The new integration case seeds tenant A and tenant B probe rows for every table
in `TENANT_ISOLATION_TABLES`, grants the app role only probe `SELECT`
privileges, and proves all of the following through real PostgreSQL RLS:

- missing tenant/service context returns no rows;
- partial tenant context with only `dvt.tenant_id` returns no rows;
- full tenant mode returns only the matching tenant rows;
- tenant B cannot observe tenant A rows through the same table catalog.

Service-access coverage remains governed by the existing explicit maintenance
context and table-scoped service-owner checks in the same integration file.
