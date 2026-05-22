---
title: AR-D4 Zero-Downtime Schema Rollback Plan
status: Accepted
owner: Architecture / State Store / Adapter Postgres
last_reviewed: 2026-05-13
planning_type: mandatory-proposal
---

# AR-D4 Zero-Downtime Schema Rollback Plan

## Think-First Analysis

AR-D4 replaces the active-client rollback guard with migration-step
compatibility semantics. The command/query rails are:

- `PostgresStateStoreSchemaRollbackCommand`: executes only online-compatible
  rollback plans through `PostgresStateStoreAdminAdapter`.
- `PostgresStateStoreSchemaRollbackPlan`: exposes rollback steps and
  compatibility metadata through `PostgresSchemaManager`.

The Fowler move is **Encapsulate Policy**: availability belongs beside the
schema migration catalog, while the adapter admin facade remains the service
layer for concrete Postgres administration. Full analysis, diagrams, grouping
findings, drift notes, and stories live in the AR-D4 component guide, user-story
doc, and mailbox analysis referenced by the feature manifest below.

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-d4-zero-downtime-schema-rollback-plan-20260513.md
componentGuides: [docs/architecture/components/engine/adapters/state-store/postgres/schema-rollback-zero-downtime-component.md]
userStories: [docs/architecture/components/engine/adapters/state-store/postgres/schema-rollback-zero-downtime-user-stories.md]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/guides/ai-work-protocol.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/architecture/reference-architecture.md, docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md, docs/adr/ADR-0031-adapter-tenant-isolation.md, docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md, docs/adr/ADR-0039-hexagonal-port-hardening-and-solid-remediation.md]
allowedImplementationSurfaces: [buzon/20260513-codex-fowler-ar-d4-zero-downtime-schema-rollback-analysis.md, docs/planning/proposals/mandatory/runtime-and-contracts/ar-d4-zero-downtime-schema-rollback-plan-20260513.md, docs/planning/closeouts/20260513-ar-d4-zero-downtime-schema-rollback-closeout.md, docs/planning/state/agent-lane-d.yaml, docs/architecture/components/engine/adapters/state-store/postgres/index.md, docs/architecture/components/engine/adapters/state-store/postgres/schema-rollback-zero-downtime-component.md, docs/architecture/components/engine/adapters/state-store/postgres/schema-rollback-zero-downtime-user-stories.md, docs/evidence/ed-20260513-ar-d4-zero-downtime-schema-rollback.md, docs/risk-register/quality/R-20260513-AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK.yaml, packages/@dvt/adapter-postgres/DESIGN.md, packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts, packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts, packages/@dvt/adapter-postgres/src/index.ts, packages/@dvt/adapter-postgres/test/PostgresSchemaManager.rollback.test.ts, packages/@dvt/adapter-postgres/test/PostgresStateStoreAdapter.migrate.test.ts, packages/@dvt/adapter-postgres/test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts]
forbiddenImplementationSurfaces: [apps/web/**, apps/api/**, packages/@dvt/engine/**, packages/@dvt/contracts/**, packages/@dvt/planner/**, packages/@dvt/adapter-temporal/**]
commandQueryRails:
  - {name: PostgresStateStoreSchemaRollbackCommand, type: command, dddOwner: PostgresSchemaRollbackCompatibilityPolicy}
  - {name: PostgresStateStoreSchemaRollbackPlan, type: query, dddOwner: PostgresSchemaManager.createRollbackPlan}
domainObjects:
  - {name: PostgresSchemaRollbackCompatibilityPolicy, type: policy, owner: packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts}
  - {name: PostgresStateStoreAdminAdapter, type: adapter admin facade, owner: packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts}
fowlerSignals: [Replace active-client boolean gate with migration-step compatibility policy, Keep rollback as concrete Postgres adapter administration, Publish online-compatible rollback language]
architectureGuards: [pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts, pnpm docs:feature-mechanization:implementation]
cypressFlows: [N/A - state-store adapter administrative command only]
completionGate: [pnpm docs:feature-mechanization -- --feature AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK, pnpm --filter @dvt/adapter-postgres test, pnpm --filter @dvt/adapter-postgres typecheck, GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs, pnpm docs:sync, pnpm docs:status:generate, pnpm governance:refresh, pnpm docs:feature-mechanization:implementation, pnpm verify:prepush]
redGreenCycles:
  - {id: zero-downtime-rollback-semantic-guard, redTest: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts, expectedFailure: semantic docs missing, patchSurfaces: [packages/@dvt/adapter-postgres/test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts], greenTest: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts}
  - {id: online-compatible-rollback-allows-active-readers, redTest: pnpm --filter @dvt/adapter-postgres test -- test/PostgresStateStoreAdapter.migrate.test.ts, expectedFailure: rollback uses maintenance mode, patchSurfaces: [packages/@dvt/adapter-postgres/src/PostgresStateStoreAdminAdapter.ts], greenTest: pnpm --filter @dvt/adapter-postgres test -- test/PostgresStateStoreAdapter.migrate.test.ts}
  - {id: destructive-rollback-rejected-by-policy, redTest: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaManager.rollback.test.ts, expectedFailure: missing compatibility metadata, patchSurfaces: [packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts], greenTest: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaManager.rollback.test.ts}
symbols:
  - {name: PostgresSchemaRollbackCompatibilityPolicy, path: packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts, dddOwner: PostgresSchemaManager, cqRails: [PostgresStateStoreSchemaRollbackCommand, PostgresStateStoreSchemaRollbackPlan], fowlerSignals: [policy], architectureGuard: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts, cypressCoverage: N/A - adapter admin command only, unitTests: [pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaManager.rollback.test.ts, pnpm --filter @dvt/adapter-postgres test -- test/PostgresStateStoreAdapter.migrate.test.ts]}
  - {name: PostgresSchemaRollbackCompatibility, path: packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts, dddOwner: PostgresSchemaManager, cqRails: [PostgresStateStoreSchemaRollbackPlan], fowlerSignals: [plan metadata], architectureGuard: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts, cypressCoverage: N/A - adapter admin command only, unitTests: [pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaManager.rollback.test.ts]}
  - {name: rollbackCompatibilityFor, path: packages/@dvt/adapter-postgres/src/PostgresSchemaManager.ts, dddOwner: PostgresSchemaManager, cqRails: [PostgresStateStoreSchemaRollbackPlan], fowlerSignals: [classification], architectureGuard: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts, cypressCoverage: N/A - adapter admin command only, unitTests: [pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaManager.rollback.test.ts]}
  - {name: PostgresSchemaRollbackCompatibilityPolicy, path: packages/@dvt/adapter-postgres/src/index.ts, dddOwner: PostgresStateStoreAdminAdapter, cqRails: [PostgresStateStoreSchemaRollbackCommand], fowlerSignals: [public export], architectureGuard: pnpm --filter @dvt/adapter-postgres test -- test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts, cypressCoverage: N/A - adapter admin command only, unitTests: [pnpm --filter @dvt/adapter-postgres test -- test/PostgresStateStoreAdapter.migrate.test.ts]}
```

## Red/Green cycle 1

The architecture guard first fails on missing owned-concern docblocks, component
guide semantics, and package design drift.

## Red/Green cycle 2

The admin facade behavior test first fails because online-compatible rollback is
still routed through maintenance mode and active-client rejection.

## Red/Green cycle 3

The schema-manager behavior test first fails because rollback plans do not yet
publish compatibility metadata or reject offline-only plans through policy.
