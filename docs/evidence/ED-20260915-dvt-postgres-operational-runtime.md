---
title: DVT PostgreSQL operational runtime
status: Accepted
date: 2026-09-15
owners:
  - dvt-api
  - '@dvt/contracts'
  - '@dvt/adapter-postgres'
  - '@dvt/temporal-dvt-postgres-plugin'
  - dvt-temporal-worker
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/services/dvtPostgresExecutionContextBinding.ts
  - packages/@dvt/contracts/src/contracts/engine/RunExecutionContext.v1.ts
  - packages/@dvt/contracts/src/schema-packs/common.ts
  - packages/@dvt/adapter-postgres/src/PostgresDvtStableTablePublisher.ts
  - packages/@dvt/temporal-dvt-postgres-plugin/src/DvtPostgresStepActivity.ts
  - packages/@dvt/temporal-dvt-postgres-plugin/src/DvtPostgresPluginRunner.ts
  - apps/temporal-worker/src/runtime/temporalWorkerDvtPostgresProfile.ts
evidence:
  tests:
    - pnpm --filter '@dvt/contracts' test
    - pnpm --filter '@dvt/planner' test
    - pnpm --filter '@dvt/run-domain' test
    - pnpm --filter '@dvt/adapter-temporal' test
    - pnpm --filter '@dvt/adapter-postgres' test
    - pnpm --filter '@dvt/temporal-dvt-postgres-plugin' test
    - pnpm --filter dvt-temporal-worker test
    - DVT_PG_INTEGRATION=1 pnpm --filter dvt-temporal-worker exec vitest run --config vitest.config.ts test/host/dvtPostgres.service.integration.test.ts
    - pnpm verify:prepush
---

# DVT PostgreSQL operational runtime

## Authority and boundary

[Issue #2723](https://github.com/dunay2/dvt/issues/2723), ADR-0003,
ADR-0035, ADR-0064 and accepted ADR-0066 govern this slice. Planning DB design
`GH-2723-DVT-POSTGRES-RUNTIME-V1` and feature
`DVT-POSTGRES-OPERATIONAL-RUNTIME-2723` preceded implementation. The existing
`StartRun` command remains the sole command rail.

The runtime accepts only `dvt-operational-workload.v2`. StartRun resolves the
governed PostgreSQL binding, observes the expected predecessor and persists an
immutable execution context. Temporal resolves that context and the verified SQL
artifact without interpreting Substrait, Canvas cards or dbt semantics.

## Proof

- Contract regressions reject Preview v1, malformed DVT plugin contexts and
  incomplete publication evidence.
- API regressions prove that connection authorization and predecessor observation
  happen before Temporal dispatch.
- PostgreSQL integration tests prove first publication, replacement with stable
  OID, idempotency, stale rejection and unmanaged-target rejection.
- Plugin tests prove artifact verification before credentials, context alignment,
  stable failure mapping and successful-cleanup semantics.
- The service-backed test runs a real plan through Temporal and PostgreSQL, reads
  the published row and parses authoritative `StepCompleted.resultEvidence`.

## No-debt posture

No retired activity, compatibility alias, parallel command, inline SQL fallback,
automatic schema migration, fake success, stub, TODO or rule relaxation was added.
Planner and Engine remain independent of PostgreSQL, SQL, Substrait and Canvas
taxonomy. Hooks and validation stay enabled.
