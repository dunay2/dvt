---
title: Temporal step plugin semantics hardening
status: Accepted
date: 2026-04-29
owners:
  - packages/@dvt/adapter-temporal
  - packages/@dvt/contracts
  - packages/@dvt/traceability-service
  - apps/web
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/plugins/TemporalStepPluginProfile.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/dbtPluginManifest.ts
  - packages/@dvt/adapter-temporal/src/plugins/dbt/DbtStepActivity.ts
  - packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers.ts
  - packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts
  - packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts
  - packages/@dvt/contracts/test/fixtures/run-event-compiled-code-ref.fixtures.ts
  - packages/@dvt/traceability-service/src/lineage/compiledCodeRef.ts
  - packages/@dvt/traceability-service/test/lineage/compiledCodeRef.test.ts
  - apps/web/src/app/views/runs/RunStates.test.tsx
  - apps/web/cypress/e2e/canvas/canvas-preview-run-persisted.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/traceability-service test -- test/lineage/compiledCodeRef.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/runs/RunStates.test.tsx
    - pnpm --filter @dvt/adapter-temporal typecheck
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/traceability-service typecheck
    - pnpm --filter @dvt/web typecheck
    - pnpm lint
    - pnpm docs:sync
    - pnpm verify:prepush
---

# Temporal Step Plugin Semantics Hardening

## Decision Context

The branch had already moved DBT activity execution behind a Temporal worker
plugin profile. The remaining Fowler drift was semantic: workflow artifact
emission and several consumers still treated compiled SQL as DBT-shaped
metadata.

## Evidence Summary

- Workflow artifact emission is now driven by `compiledCodeRef`, not by DBT
  step-kind membership.
- The StepStarted artifact discriminator used by active producers, contracts,
  traceability ingestion, and UI fixtures is `compiled-sql`.
- DBT executable step-kind ownership is isolated in the DBT plugin manifest and
  named as the Temporal-supported executable subset, not the full DBT universe.
- Architecture tests validate plugin ownership semantics: DBT vocabulary stays
  out of core activity modules and workflow artifact helpers remain
  plugin-agnostic.
- The risk register now narrows the remaining risk to package-level extraction
  of DBT activity and CLI runner surfaces.

## No-Debt Statement

This evidence records no approved debt, no relaxed rule, and no stubbed plugin
path. A production SQL plugin remains a future feature, not a fake
implementation in this slice.
