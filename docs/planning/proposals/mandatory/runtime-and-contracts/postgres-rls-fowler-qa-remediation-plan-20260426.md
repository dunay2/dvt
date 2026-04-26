---
title: Postgres RLS Fowler QA Remediation Plan
status: Completed
date: 2026-04-26
owners:
  - packages/@dvt/adapter-postgres
planning_type: proposal
---

# Postgres RLS Fowler QA Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:test-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** close the hard-QA findings left in the production tenant-isolation baseline.

**Architecture:** keep admin schema authority separate from application runtime authority, make test grants least-privilege, and scope service-mode RLS bypasses to the table-level maintenance owner that actually needs them. PostgreSQL remains an adapter concern; API and engine code do not import maintenance authority.

**Tech Stack:** TypeScript, Vitest, PostgreSQL RLS, `pg`, `@dvt/adapter-postgres`.

---

## Think-First Analysis

### Problem Summary

The RLS baseline proves real database enforcement, but the app-role proof still
has four weaknesses:

1. `PostgresStartRunIntentStore` cannot run as an app-role runtime after admin
   migration because readiness is only reached through `migrate()`.
2. The app-role proof grants DML on every table in the schema, including
   `schema_migrations`.
3. The service-mode RLS predicate accepts every approved service owner for every
   tenant-owned table.
4. The direct RLS proof checks the known table catalog but does not fail when a
   new tenant-owned table is created outside that catalog.

### Root Cause

The previous remediation treated "non-owner app role" as one posture but did
not split the data-plane from the schema/migration plane. It also modeled
service bypass as a global capability list instead of a table-scoped access
matrix.

### Constraints And Invariants

- `ADR-0031`: adapter methods must enforce tenant isolation and prepare for
  Postgres RLS defense in depth.
- `TENANT_ISOLATION_TESTS.v1.md`: direct access tests must prove RLS enforcement
  and zero cross-tenant rows.
- `SECURITY_INVARIANTS.v1.md`: StateStore boundary must enforce RLS or equivalent
  storage filtering.
- `AGENTS.md`: no hidden debt, no fake success, docs/code/tests/CI alignment.

### Options Considered

| Option                                                     | Decision                | Why                                                                                                 |
| ---------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| Keep broad grants and document risk                        | Rejected                | It makes least-privilege proof non-actionable.                                                      |
| Add separate admin/runtime classes for every store         | Rejected for this slice | Correct direction, but too large for this remediation.                                              |
| Add runtime-ready posture to `PostgresStartRunIntentStore` | Selected                | Matches existing `PostgresStateStoreAdapter.assumeSchemaReady` seam and fixes the production split. |
| Scope RLS owners per table                                 | Selected                | Matches least privilege and catches wrong-service bypasses.                                         |
| Discover all tenant-owned tables in proof schema           | Selected                | Converts future catalog drift into a failing integration test.                                      |

## Pre-Implementation Brief

- **Mode:** Full.
- **Scope:** `@dvt/adapter-postgres` RLS policy, helper grants, app-role runtime
  tests, evidence/risk docs, generated docs status.
- **Out of scope:** plan-store tenancy, separate physical maintenance DB role,
  API RBAC.
- **Risk:** table-scoped service owners may initially miss a legitimate worker
  query. Mitigation: run the adapter Postgres suite with `DVT_PG_INTEGRATION=1`
  and adjust only from observed failures or code evidence.
- **Validation plan:** targeted red/green tests,
  `pnpm --filter @dvt/adapter-postgres test`,
  `pnpm --filter @dvt/adapter-postgres typecheck`,
  docs generators, and `pnpm verify:prepush`.

## TDD Tasks

### Task 1: Least-Privilege App Runtime Grants

**Files**

- Modify: `packages/@dvt/adapter-postgres/test/helpers/postgresRlsProofHarness.ts`
- Modify: `packages/@dvt/adapter-postgres/test/PostgresAppRoleRuntime.integration.test.ts`

- [x] Write a failing integration assertion proving the app role cannot insert
      into `schema_migrations` after runtime grants.
- [x] Run the app-role integration test and verify it fails because the current
      helper grants DML on all tables.
- [x] Replace broad `ON ALL TABLES` grants with explicit grants for the
      tenant-owned runtime tables used by the target adapter.
- [x] Re-run the app-role integration test and verify it passes.

### Task 2: Start-Run Intent App Runtime Mode

**Files**

- Modify: `packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts`
- Modify: `packages/@dvt/adapter-postgres/test/PostgresAppRoleRuntime.integration.test.ts`

- [x] Write a failing app-role integration test that migrates
      `start_run_intents` with admin authority, grants only runtime access to
      `start_run_intents`, constructs `PostgresStartRunIntentStore` with
      `assumeSchemaReady: true`, and performs create/read/transition operations.
- [x] Run the targeted test and verify it fails because the runtime store is not
      ready without calling `migrate()`.
- [x] Add `assumeSchemaReady?: boolean` to the store config and mark the runtime
      store ready without invoking schema DDL.
- [x] Re-run targeted tests and typecheck.

### Task 3: Table-Scoped Service Owners

**Files**

- Modify: `packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts`
- Modify: `packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts`
- Modify: `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`

- [x] Write a failing unit test proving `run_metadata` permits
      `run-metadata-tenant-resolver` but rejects `outbox-worker`.
- [x] Write a failing direct RLS integration assertion proving the wrong service
      owner returns zero rows from `run_metadata`.
- [x] Replace the global service-owner list in each table policy with explicit
      `serviceAccessOwners` per table.
- [x] Re-run targeted policy and RLS tests.

### Task 4: Tenant-Owned Table Catalog Drift Guard

**Files**

- Modify: `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`

- [x] Write a failing helper-level integration test that creates a tenant-owned
      rogue table with `tenant_id` and proves the catalog guard rejects it.
- [x] Implement catalog discovery against `pg_catalog` for
      tenant-owned tables in the transient schema.
- [x] Assert the real migrated schema has no tenant-owned tables outside
      `TENANT_ISOLATION_TABLES`.
- [x] Re-run the RLS integration suite.

### Task 5: Evidence And Gate Alignment

**Files**

- Modify: `docs/evidence/ed-20260425-production-tenant-isolation-baseline.md`
- Modify: `docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml`
- Modify generated docs as required.

- [x] Update evidence with the app-role intent runtime proof, exact grants, and
      table-scoped service owner proof.
- [x] Update risk text to leave only the physical maintenance-role split and
      plan-store tenancy as residual risks.
- [x] Run `pnpm docs:sync` and `pnpm docs:status:generate`.
- [x] Run final adapter tests, typecheck, and `pnpm verify:prepush`.
