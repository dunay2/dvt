---
title: Web Functionalities
status: Active
owner: UI / Visualization Domain
last_reviewed: 2026-05-08
---

# Web Functionalities

This document summarizes the active product-facing functionality of `apps/web`.
The current runtime boundary is hexagonal: route views depend on presentation
ports and service facades, while HTTP transport is isolated in adapters.

## Functionalities

| #   | Functionality             | Description                                                                                                |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Route and workbench shell | Composes browser routes, plugin views, and shell-owned administrative surfaces.                            |
| 2   | Run status visualization  | Renders run summaries, snapshots, step progress, and timeline events sourced from protected runtime rails. |
| 3   | User interaction handling | Captures user intent and dispatches it through presentation ports such as `IRunsPort`.                     |
| 4   | API integration           | Communicates with `apps/api` through service adapters such as `runsService.api.ts`.                        |
| 5   | Contract compliance       | Keeps frontend DTOs aligned with current API route contracts and runtime rails.                            |

## Main Methods

The following methods are the current `IRunsPort` contract implemented by
[`runsService.api.ts`](../../../../apps/web/src/app/services/runs/runsService.api.ts)
and defined in [`ports/runs.ts`](../../../../apps/web/src/app/ports/runs.ts):

- `getRunSnapshot(runId: string): Promise<RunSnapshot | null>`: fetches a tenant-scoped run snapshot from `GET /runs/:runId`.
- `listRunSummaries(): Promise<RunSummaryItem[]>`: lists run summaries from `GET /runs` using tenant, project, and environment scope.
- `startRun(input: StartRunInput): Promise<RunStartReceipt>`: starts a run via `POST /runs/start`; the API owns run identity and admission.
- `listRunEvents(runId: string, afterSeq?: number): Promise<RunEventTimelinePage>`: lists tenant-scoped run events from `GET /runs/:runId/events`.

## Key Files

- `apps/web/src/app/services/runs/runsService.ts`
- `apps/web/src/app/services/runs/runsService.api.ts`
- `apps/web/src/app/ports/runs.ts`
- `apps/api/src/application/ports/protectedRuntimeRunRailVocabulary.ts`
- `apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts`
