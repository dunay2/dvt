---
title: Fowler analysis for Postgres tenant isolation canon
status: Draft
date: 2026-05-23
owners:
  - packages/@dvt/adapter-postgres
---

# Fowler Analysis: Postgres Tenant Isolation Canon

## Scope

This review covers `C-MAND-POSTGRES-RLS-QA-CANON`, centered on the Postgres
adapter tenant-isolation work governed by `ADR-0031`, the RLS QA remediation
plans, and the state-store adapter component documentation.

## Mature-System Comparison

Mature multi-tenant systems normally keep isolation as a named component rather
than as scattered SQL snippets. The current branch has moved in that direction:
tenant context, service context, table catalog, service-owner capability, and
direct RLS proof are now explicit adapter concepts. The remaining gap was that
the semantic contract was discoverable from tests and code, but not from a local
component guide that named public API, invariants, transitions, and consumers.

## Improved Patterns

- **Defense in depth**: adapter predicates and forced Postgres RLS both protect
  tenant-owned rows.
- **Separated authority**: admin migration authority is distinct from app-role
  runtime proof.
- **Explicit capability catalog**: service-mode access is represented by a
  closed adapter-internal capability catalog.
- **Table-scoped access**: service owners are no longer modeled as a global
  bypass list.
- **Architecture fitness tests**: existing tests already guard closed service
  access, app-role posture, and RLS catalog drift.

## Anti-Patterns Detected

- **Implicit component contract**: the RLS component was encoded in code/tests
  but did not have a local canonical component page.
- **Knowledge concentration in integration tests**: user scenarios and
  transitions were mostly reverse-engineered from test names.
- **Documentation lag**: `StateStoreAdapter.md` described tenant isolation, but
  not the full service-owner matrix or app/admin transition model.

## Component Grouping

The component should be treated as `Postgres Tenant Isolation`, owned by
`@dvt/adapter-postgres`:

- Policy/catalog: `PostgresTenantIsolationPolicy.ts`
- Service authority: `PostgresServiceAccessCapability.ts`
- Service entrypoint: `PostgresMaintenanceAccess.ts`
- Runtime context: `PostgresSchemaManager.setTenantContext` and
  `enterPostgresMaintenanceContext`
- Proof harness: `test/helpers/postgresRlsProofHarness.ts`
- Semantic architecture test:
  `PostgresTenantIsolationSemantic.architecture.test.ts`

## Lessons

- RLS is not only a database feature; it is an architectural boundary with a
  domain vocabulary.
- Runtime and migration roles must be proved separately.
- A service-mode escape hatch must have a named owner and a table-specific
  justification.
- Component documentation should be added before integration tests become the
  only readable system map.

## Repetitions Fixed

- Repeated narrative about tenant isolation across ADR, plan, and adapter guide
  is now consolidated into a local component document and linked from the
  Postgres adapter index.
- Service-owner semantics are validated once through a semantic architecture
  test rather than relying only on integration-test assertions.

## Drift Fixed

- The local component guide now documents the table catalog and service-owner
  matrix that production code enforces.
- User stories now cover tenant, service, admin, CI, and future-table drift
  scenarios.
- The adapter guide now points readers to the component-level RLS contract
  instead of leaving RLS as a subsection only.

## Opportunities Left

- Split a physical maintenance role from app-role service context if production
  operation requires different database credentials.
- Add plan-store tenant RLS when `plan_records` and stored plan tables become
  part of the tenant-owned online runtime surface.
- Promote repeated Postgres role-provisioning evidence into an operations
  runbook if more adapters adopt DB-native isolation.

## ADR Assessment

No new ADR is required. `ADR-0031` already owns the architectural decision:
adapter methods must enforce tenant isolation and prepare for Postgres RLS
defense in depth. This slice canonizes and tests that decision rather than
changing it.
