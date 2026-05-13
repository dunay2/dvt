---
title: WorkflowEngine provider and telemetry seams user stories
status: Active
owner: Architecture / Engine
last_reviewed: 2026-05-12
---

# WorkflowEngine Provider And Telemetry Seams User Stories

## Stories

| Story            | User              | Need                                       | Acceptance                                                                                            |
| ---------------- | ----------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `US-WE-HX-5-001` | Engine maintainer | Resolve providers through one named seam   | Admission, command, signal, and enrichment paths use `IEngineProviderResolver`.                       |
| `US-WE-HX-5-002` | Runtime operator  | Missing providers fail consistently        | Missing target or persisted providers throw `AdapterNotRegisteredError`.                              |
| `US-WE-HX-5-003` | Engine maintainer | Keep telemetry out of start-run decisions  | `StartRunApplicationService` delegates start/success telemetry to `StartRunTelemetryPolicy`.          |
| `US-WE-HX-5-004` | SRE               | Preserve telemetry visibility              | Start-run start, success count, and latency metrics keep their current names and tags.                |
| `US-WE-HX-5-005` | Architect         | See semantic ownership before reading code | Provider and telemetry modules declare owned-concern docblocks.                                       |
| `US-WE-HX-5-006` | Reviewer          | Detect drift mechanically                  | The architecture test validates docs, stories, mailbox, docblocks, provider seam, and telemetry seam. |

## Negative Scenarios

- `StartRunAdmissionGuard` reads directly from `adapters.get`.
- Runtime command, signal, or enrichment services import a generic lifecycle
  helper to resolve providers instead of using `IEngineProviderResolver`.
- `StartRunApplicationService` emits start-run success metrics directly.
- Provider lookup throws generic errors for registered-provider misses.
- Docs claim provider/telemetry standardization is complete while component
  guide, stories, or mailbox analysis are missing.

## Scenario Coverage Matrix

| Scenario                        | Guard                                                       | Unit or package proof                            |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Shared provider resolver seam   | `workflowEngineProviderTelemetrySeams.architecture.test.ts` | `providerSelection.test.ts`                      |
| Start-run telemetry policy seam | `workflowEngineProviderTelemetrySeams.architecture.test.ts` | `StartRunApplicationService.test.ts`             |
| Missing provider semantics      | `workflowEngineProviderTelemetrySeams.architecture.test.ts` | `providerSelection.test.ts`                      |
| Documentation alignment         | `workflowEngineProviderTelemetrySeams.architecture.test.ts` | `pnpm docs:feature-mechanization:implementation` |
