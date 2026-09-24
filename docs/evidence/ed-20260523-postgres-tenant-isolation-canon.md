---
title: Postgres tenant isolation canon documentation and semantic guard
status: Accepted
date: 2026-05-23
owners:
  - packages/@dvt/adapter-postgres
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-postgres/test/PostgresTenantIsolationSemantic.architecture.test.ts
  - docs/architecture/components/engine/adapters/state-store/postgres/tenant-isolation-component.md
  - docs/architecture/components/engine/adapters/state-store/postgres/tenant-isolation-user-stories.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationSemantic.architecture.test.ts
    - pnpm --filter @dvt/adapter-postgres test -- PostgresTenantIsolationPolicy.test.ts PostgresServiceAccessCapability.architecture.test.ts PostgresTenantIsolationSemantic.architecture.test.ts
    - pnpm --filter @dvt/adapter-postgres typecheck
    - pnpm verify:prepush
---

# Summary

This evidence covers the 2026-05-23 canonization pass for the Postgres tenant
isolation component. The slice does not change runtime RLS behavior; it adds a
semantic architecture guard and local component documentation so the existing
RLS catalog, table-scoped service-owner matrix, transitions, consumers, and user
stories remain aligned.

# Verification Scope

- The semantic architecture test proves service access remains table-scoped and
  rejects a global service-owner bypass posture.
- The same test proves the component documentation names the public internal
  API, invariants, transitions, consumers, diagrams, each tenant-owned table,
  and each approved service owner.
- The component guide links back to `ADR-0031` and complements the existing
  real PostgreSQL integration proofs.
