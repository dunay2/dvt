---
title: Postgres Tenant Isolation Service Access Remediation Plan
status: Active
owner: Architecture / Runtime
last_reviewed: 2026-04-25
planning_type: proposal
---

# Postgres Tenant Isolation Service Access Remediation Plan

## Governing Sources

- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/reference-architecture.md`
- `docs/contracts/index.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/evidence/ed-20260425-production-tenant-isolation-baseline.md`
- `docs/risk-register/quality/R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE.yaml`

## Problem

The tenant isolation slice improved the API-level and adapter-level posture, but
the `service` access mode is still too easy to treat as ambient authority.
`PostgresSchemaManager.setServiceContext(...)` exposes service mode as a static
schema-manager operation, and the capability factory is generic enough that
adapter code can mint new owners instead of using a constrained maintenance
catalog.

This is not a mature security boundary. It is a useful TypeScript seam, but the
stronger design is to make maintenance access explicit, named, narrow, and
architecturally unreachable from API entrypoints.

## Current Shape

```mermaid
flowchart TD
  A[Adapter maintenance code] --> B[createPostgresServiceAccessCapability]
  A --> C[PostgresSchemaManager.setServiceContext]
  C --> D[set_config dvt.access_mode = service]
  D --> E[RLS service bypass predicate]
  F[API package] -. deep import risk .-> B
  F -. deep import risk .-> C
```

## Target Shape

```mermaid
flowchart TD
  A[Adapter maintenance code] --> B[POSTGRES_SERVICE_ACCESS catalog]
  A --> C[enterPostgresMaintenanceContext]
  C --> D[assert named capability]
  D --> E[set_config dvt.access_mode = service]
  E --> F[RLS requires service mode plus approved owner]
  G[API package] -- forbidden by architecture test --> B
  G -- forbidden by architecture test --> C
```

## Selected Remediation

1. Remove the generic exported service capability factory.
2. Replace it with a closed `POSTGRES_SERVICE_ACCESS` maintenance catalog.
3. Move service-context activation out of `PostgresSchemaManager` into a
   dedicated maintenance access module.
4. Add architecture tests that forbid API imports of service access internals.
5. Update RLS policy SQL to require both service mode and an approved
   `dvt.service_access_owner`.
6. Preserve the residual risk explicitly: owner predicates still do not replace
   database role separation.

## Acceptance Criteria

- `PostgresServiceAccessCapability.ts` does not export a generic factory.
- `PostgresSchemaManager` no longer owns service-context activation.
- Production service access calls go through `enterPostgresMaintenanceContext`.
- API source files cannot import service access internals or call service
  context helpers.
- RLS policy text requires an approved `dvt.service_access_owner` when service
  mode is used.
- `IStartRunIntentStore` remains engine-owned, with no duplicate contract files
  under `@dvt/contracts`.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: AR-C-TENANT-ISOLATION-PROPERTY
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/postgres-tenant-isolation-service-access-remediation-plan-20260425.md
componentGuides:
  - docs/adr/ADR-0031-adapter-tenant-isolation.md
userStories:
  - docs/planning/reviews/architecture-and-governance/20260426-api-tenant-review.md
governingSources:
  - AGENTS.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/adr/ADR-0031-adapter-tenant-isolation.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/postgres-tenant-isolation-service-access-remediation-plan-20260425.md
  - docs/evidence/**
  - docs/risk-register/quality/**
  - packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
  - packages/@dvt/adapter-postgres/test/PostgresTenant*.test.ts
forbiddenImplementationSurfaces:
  - packages/@dvt/contracts/**
  - packages/@dvt/engine/**
  - packages/@dvt/adapter-temporal/**
commandQueryRails:
  - name: ValidatePostgresTenantIsolationPolicy
    type: query
    dddOwner: PostgresTenantIsolationPolicy
domainObjects:
  - name: PostgresTenantIsolationPolicy
    type: adapter SQL policy
    owner: packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
fowlerSignals:
  - Partial tenant context denied.
  - Catalog-wide RLS proof.
architectureGuards:
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - backend adapter RLS policy
completionGate:
  - pnpm verify:prepush
redGreenCycles:
  - id: tenant-mode-rls-predicate
    redTest: pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts
    expectedFailure: RLS tenant_id matching does not require tenant mode.
    patchSurfaces:
      - packages/@dvt/adapter-postgres/src/PostgresTenantIsolationPolicy.ts
      - packages/@dvt/adapter-postgres/test/PostgresTenantIsolationPolicy.test.ts
    greenTest: pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts
  - id: tenant-owned-table-property-proof
    redTest: DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test -- PostgresTenantRlsEnforcement.integration.test.ts
    expectedFailure: RLS runtime proof covers only one tenant-owned table.
    patchSurfaces:
      - packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
    greenTest: DVT_PG_INTEGRATION=1 pnpm --filter @dvt/adapter-postgres test -- PostgresTenantRlsEnforcement.integration.test.ts
symbols:
  - name: seedTenantIsolationProbeRows
    path: packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
    dddOwner: PostgresTenantIsolationPolicy
    cqRails:
      - ValidatePostgresTenantIsolationPolicy
    fowlerSignals:
      - RLS proof fixture.
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A
    unitTests:
      - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantRlsEnforcement.integration.test.ts
  - name: selectDistinctTenantIds
    path: packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
    dddOwner: PostgresTenantIsolationPolicy
    cqRails:
      - ValidatePostgresTenantIsolationPolicy
    fowlerSignals:
      - RLS read probe.
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A
    unitTests:
      - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantRlsEnforcement.integration.test.ts
  - name: insertTenantIsolationProbeRow
    path: packages/@dvt/adapter-postgres/test/PostgresTenantRlsEnforcement.integration.test.ts
    dddOwner: PostgresTenantIsolationPolicy
    cqRails:
      - ValidatePostgresTenantIsolationPolicy
    fowlerSignals:
      - RLS table fixture.
    architectureGuard: pnpm docs:feature-mechanization:implementation
    cypressCoverage: N/A
    unitTests:
      - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantRlsEnforcement.integration.test.ts
```

## Validation Plan

```bash
pnpm --filter @dvt/adapter-postgres test -- PostgresServiceAccessCapability.architecture.test.ts PostgresTenantIsolationPolicy.test.ts PostgresTenantRlsEnforcement.integration.test.ts
pnpm --filter @dvt/contracts test -- start-run-intent-ownership.architecture.test.ts
pnpm --filter @dvt/adapter-postgres typecheck
pnpm --filter @dvt/contracts typecheck
pnpm docs:sync
pnpm docs:status:generate
pnpm docs:gov:manifest:check
pnpm verify:prepush
```

## Residual Risk

The catalog and RLS owner predicate reduce accidental privilege drift, but they
do not create a cryptographic or database-role security boundary. A production
hardening follow-up should separate tenant and maintenance database roles so
service-mode access cannot be forged by arbitrary SQL running under the tenant
application role.
