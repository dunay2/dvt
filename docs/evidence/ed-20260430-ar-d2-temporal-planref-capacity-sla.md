---
title: AR-D2 Temporal PlanRef capacity SLA policy
status: Accepted
date: 2026-04-30
owners:
  - packages/@dvt/adapter-temporal
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/adapter-temporal/src/temporalPlanRefCapacitySlaPolicy.ts
  - packages/@dvt/adapter-temporal/test/temporalPlanRefCapacitySlaPolicy.test.ts
  - docs/architecture/components/engine/adapters/temporal/temporal-planref-capacity-sla.md
  - buzon/20260430-codex-fowler-ar-d2-temporal-capacity-sla-analysis-and-remediation.md
evidence:
  tests:
    - pnpm --filter @dvt/adapter-temporal exec vitest run test/temporalPlanRefCapacitySlaPolicy.test.ts test/workflow-component-semantics.architecture.test.ts
    - pnpm --filter @dvt/adapter-temporal test
    - pnpm --filter @dvt/adapter-temporal typecheck
---

## Summary

This evidence records the AR-D2 capacity SLA hardening slice for the Temporal
PlanRef workflow boundary. The slice adds an executable policy for production
readiness, documents the governed profile, and ties the profile to local user
stories plus semantic architecture tests.

The policy keeps diagnostic `continueAsNewAfterLayerCount = 0` available for
local or incident use while making it an explicit production-readiness
violation. It also evaluates rollover payload budget, maximum layer count per
segment, expected segment count, workflow-history estimates, and `PlanRef`
retention margin.

The Fowler follow-up records the architectural analysis in the mailbox and
extends the semantic architecture test so the analysis, component guide, user
stories, and executable policy remain aligned.
