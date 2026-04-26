---
title: Postgres RLS QA Remediation Plan
status: Accepted
date: 2026-04-25
owner: Architecture / Runtime
planning_type: proposal
---

# Postgres RLS QA Remediation Plan

## Goal

Close the hard QA findings from the Postgres tenant-isolation branch without
weakening the hardcut posture. The target is a mature two-role proof:
migration/setup runs as an explicit admin role, while runtime adapter behavior
and direct RLS enforcement are proven with a non-owner application role.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/adr/ADR-0031-adapter-tenant-isolation.md`
- `docs/architecture/components/engine/security/TENANT_ISOLATION_TESTS.v1.md`
- `docs/evidence/ed-20260425-production-tenant-isolation-baseline.md`
- `docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml`
- `.github/workflows/test.yml`
- `.github/workflows/pr-quality-gate.yml`
- `.github/workflows/adapter-postgres-integration-nightly.yml`

## QA Findings To Remediate

| Finding                                                     | Severity   | Root Cause                                                                         | Remediation                                                                   |
| ----------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| CI no longer proves adapter runtime behavior under app role | High       | `DVT_PG_URL` is admin in CI; `DVT_PG_RLS_URL` only drives direct SQL proof         | Add an app-role runtime integration smoke after admin migration               |
| RLS catalog test checks only one service owner              | Medium     | Test asserts `runMetadataTenantResolver.owner` instead of the closed owner catalog | Assert every `POSTGRES_RLS_SERVICE_ACCESS_OWNERS` value appears in policy SQL |
| Provisioner does not verify schema-level create privileges  | Medium     | Script revokes/checks database `CREATE`, but claim says non-schema-creating        | Revoke and verify `CREATE` on `public` schema for the app role                |
| RLS integration test has too many reasons to fail           | Low/Medium | Role posture, catalog shape, row isolation, and service bypass live in one test    | Split test concerns behind shared setup helpers                               |

## Current Shape

```mermaid
flowchart TD
  CI[CI Postgres job] --> AdminUrl[DVT_PG_URL = admin role]
  CI --> RlsUrl[DVT_PG_RLS_URL = app role]
  AdminUrl --> FullSuite[adapter-postgres full suite]
  RlsUrl --> DirectSql[direct SQL RLS probe]
  FullSuite -. gap .-> AppRuntime[app-role adapter runtime behavior not proven]
```

## Target Shape

```mermaid
flowchart TD
  AdminRole[Migration/admin role] --> Migrate[Create schema and run migrations]
  AdminRole --> Grants[Grant runtime DML and sequence privileges on test schema]
  AppRole[Non-owner app role] --> RuntimeSmoke[PostgresStateStoreAdapter runtime smoke]
  AppRole --> DirectRls[Direct SQL RLS enforcement proof]
  RuntimeSmoke --> AC1[tenant-scoped writes and reads work]
  RuntimeSmoke --> AC2[cross-tenant reads remain denied or empty]
  DirectRls --> AC3[role cannot bypass RLS or create schema objects]
  DirectRls --> AC4[all tenant tables force RLS with approved service owners]
```

## Design Decision

Keep full adapter suite setup under admin authority because many existing
integration tests create transient schemas and are migration/setup tests, not
runtime least-privilege tests.

Add a narrow app-role runtime proof instead of pretending the whole suite can
run as the application role. This is the mature split:

1. Admin role proves migrations and schema setup.
2. App role proves online runtime operations after migration.
3. Direct SQL probe proves RLS cannot be bypassed by missing tenant context or
   cross-tenant access.

## Implementation Tasks

### Task 1: Add App-Role Runtime Integration Smoke

**Files**

- Create: `packages/@dvt/adapter-postgres/test/PostgresAppRoleRuntime.integration.test.ts`
- Modify: `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`
- Optional create: `packages/@dvt/adapter-postgres/test/helpers/postgresRlsProofHarness.ts`

**TDD steps**

- [x] Write a failing test that migrates a transient schema with
      `DVT_PG_ADMIN_URL`, grants runtime privileges to the role from
      `DVT_PG_RLS_URL`, then constructs `PostgresStateStoreAdapter` with the
      app-role connection string.
- [x] Expected first red: `permission denied` or missing helper until runtime
      grants and harness are implemented.
- [x] Implement a test helper that grants only runtime privileges on the
      transient schema:
      `USAGE` on schema, `SELECT`, `INSERT`, `UPDATE`, `DELETE` on tables.
- [x] Prove `bootstrapRunTx` works as the app role for tenant A and tenant B.
- [x] Prove tenant-scoped read APIs expose only the caller tenant.
- [x] Prove cross-tenant read attempts through adapter APIs return empty or
      denied according to existing adapter contract.

**Acceptance criteria**

- The test fails if `DVT_PG_RLS_URL` points to a superuser, owner, `BYPASSRLS`,
  or schema-creating role.
- The test fails if app-role adapter writes only work when `DVT_PG_URL` is an
  admin role.
- The test does not require the app role to create schemas or run migrations.

### Task 2: Enforce Full Service-Owner Catalog In RLS Policy Proof

**Files**

- Modify: `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`
- Modify if needed: `packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts`

**TDD steps**

- [x] Write the failing assertion against all
      `POSTGRES_RLS_SERVICE_ACCESS_OWNERS`, not one hard-coded owner.
- [x] Temporarily confirm the assertion would fail if one owner is absent from
      the policy string.
- [x] Update the test assertion to iterate every owner for both `USING` and
      `WITH CHECK` policy expressions.

**Acceptance criteria**

- Removing any owner from `POSTGRES_RLS_SERVICE_ACCESS_OWNERS` or from the
  generated policy text breaks the catalog proof.
- The test still asserts tenant column, policy name, `ENABLE RLS`, and
  `FORCE RLS` for every table in `TENANT_ISOLATION_TABLES`.

### Task 3: Harden App Role Provisioning Against Schema Create Drift

**Files**

- Modify: `scripts/provision-postgres-app-role.cjs`
- Add or modify: script-level test if an existing script test suite covers
  provisioning behavior
- Modify: `docs/evidence/ed-20260425-production-tenant-isolation-baseline.md`
- Modify: `docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml`

**TDD steps**

- [x] Add a failing verification path that detects `CREATE` on schema `public`
      for the app role.
- [x] Implement `REVOKE CREATE ON SCHEMA public FROM <appUser>`.
- [x] Verify the script fails with
      `POSTGRES_APP_ROLE_CAN_CREATE_PUBLIC_SCHEMA_OBJECTS:<appUser>` if the
      role still has schema-level create privileges.
- [x] Keep the existing database-level `CREATE` verification.

**Acceptance criteria**

- The app role cannot create databases, roles, schemas in the database, or
  objects in `public`.
- The script remains idempotent.
- The evidence doc claim “non-schema-creating application role” is mechanically
  true for the local/CI proof posture.

### Task 4: Split RLS Integration Test Responsibilities

**Files**

- Modify: `packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts`
- Optional create: `packages/@dvt/adapter-postgres/test/helpers/postgresRlsProofHarness.ts`

**Refactor steps**

- [x] Extract connection-string resolution and role-name parsing into a small
      test helper.
- [x] Extract transient schema allocation and cleanup into a helper.
- [x] Extract admin migration plus app/probe grants into a helper.
- [x] Split assertions into independent tests:
      role posture, catalog shape, tenant row isolation, missing-context row
      isolation, and approved service access behavior.

**Acceptance criteria**

- A role posture failure does not mask catalog proof failures.
- Catalog proof can fail independently from row-isolation data setup.
- Row-isolation tests remain real PostgreSQL tests, not string-only tests.

### Task 5: Wire CI To Run The App-Role Runtime Smoke

**Files**

- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/pr-quality-gate.yml`
- Modify: `.github/workflows/adapter-postgres-integration-nightly.yml`
- Modify: `docs/evidence/ed-20260425-production-tenant-isolation-baseline.md`

**Implementation steps**

- [x] Keep `DVT_PG_URL` and `DATABASE_URL` as admin for the full suite.
- [x] Keep `DVT_PG_RLS_URL` as the app-role DSN.
- [x] Add an explicit step after provisioning:
      `pnpm --filter @dvt/adapter-postgres test -- PostgresAppRoleRuntime.integration.test.ts PostgresTenantRlsEnforcement.integration.test.ts`.
- [x] Ensure this step runs with `DVT_PG_INTEGRATION=1` in the three Postgres
      workflows.

**Acceptance criteria**

- CI proves migrations with admin authority.
- CI proves online adapter runtime with app authority.
- CI proves direct RLS enforcement with app authority.

## Validation Plan

Run these locally with Docker Postgres running:

```powershell
$env:DVT_PG_ADMIN_URL='postgresql://dvt:dvt@localhost:5432/dvt'
$env:DVT_PG_APP_USER='dvt_app'
$env:DVT_PG_APP_PASSWORD='dvt_app'
node scripts/provision-postgres-app-role.cjs

$env:DVT_PG_RLS_URL='postgresql://dvt_app:dvt_app@localhost:5432/dvt'
$env:DVT_PG_INTEGRATION='1'
$env:DVT_PG_URL=$env:DVT_PG_ADMIN_URL
$env:DATABASE_URL=$env:DVT_PG_ADMIN_URL
pnpm --filter @dvt/adapter-postgres test -- PostgresAppRoleRuntime.integration.test.ts PostgresTenantRlsEnforcement.integration.test.ts
pnpm --filter @dvt/adapter-postgres test
pnpm --filter @dvt/adapter-postgres typecheck
```

Run governance gates:

```powershell
$env:GIT_BASE='origin/main'
$env:GIT_HEAD='HEAD'
node tools/ci/arc-check.mjs
pnpm docs:sync
pnpm verify:prepush
```

## Out Of Scope

- Plan-store tenancy for `plan_records` and `stored_plans`.
- True production database-role split between tenant app role and maintenance
  role.
- Timing oracle tests and API masking behavior.
- Changing runtime semantics outside Postgres adapter proof posture.

## Done Criteria

- App-role runtime smoke is red/green verified.
- Full service-owner catalog is asserted in RLS policy proof.
- Provisioner verifies both database-level and schema-level create privileges.
- RLS tests are split by owned concern.
- CI has explicit admin-migration/app-runtime/direct-RLS proof steps.
- Evidence and risk docs describe the actual posture without overstating it.
- `pnpm verify:prepush` passes.
