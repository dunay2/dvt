---
title: WE-HX-5 provider telemetry seams
status: Accepted
date: 2026-05-12
owners:
  - '@dvt/engine'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/engine/src/application/providerSelection.ts
  - packages/@dvt/engine/src/application/StartRunApplicationService.ts
  - packages/@dvt/engine/src/services/startRun/StartRunTelemetryPolicy.ts
evidence:
  tests:
    - pnpm --filter @dvt/engine test -- test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
    - pnpm --filter @dvt/engine test -- test/application/providerSelection.test.ts test/services/StartRunApplicationService.test.ts
---

# WE-HX-5 Provider Telemetry Seams Evidence

This evidence records the ARC-2 proof for the WE-HX-5 engine seam
standardization slice. The slice consolidates provider lookup behind
`IEngineProviderResolver` / `MapBackedEngineProviderResolver`, extracts
start-run start and success telemetry to `StartRunTelemetryPolicy`, and adds a
semantic architecture guard for drift.

The public workflow-engine contracts are unchanged.
