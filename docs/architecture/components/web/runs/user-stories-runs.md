---
title: User Stories - Runs Domain Frontend
status: Active
owner: Web / Architecture
date: 2026-05-08
code_refs:
  - apps/web/src/app/ports/runs.ts
  - apps/web/src/app/services/runs/runsService.ts
  - apps/web/src/app/services/runs/runsService.api.ts
  - apps/web/src/app/services/runs/runsService.mock.ts
  - apps/web/src/app/services/runs/runWorkspaceFacade.ts
  - apps/web/src/app/services/runs/runsService.test.ts
  - apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts
---

# User Stories - Runs Domain Frontend

## Governing Sources

- [Runs Component Local Guide](./component-runs.md)
- [IRunsPort](../../../../../apps/web/src/app/ports/runs.ts)
- [Runs Frontend Architecture](./dvt-runs-frontend-architecture.md)
- [Command Query Rail Governance](../../../command-query-rail-governance.md)

These stories describe current `apps/web` behavior. They do not claim extra
client-side validation, synthetic run identity, or fields that are not present
in the `IRunsPort` DTOs.

## 1. List Runs

### US-01: List Runs - Empty List

**As** a workspace user,
**I want** an empty run list when no runs are visible in the current scope,
**So that** the Runs view can render an empty state without treating absence as
an error.

**C&Q rail:** Query - `listRunSummaries`

**Scenario:**

- Given the current workspace has no visible runs
- When `listRunSummaries()` resolves
- Then the caller receives `[]`
- And no exception is thrown

**Current evidence:**

- `runsService.mock.ts` can return an empty list from local fixture state.
- `runsService.api.ts` maps the API list payload into `RunSummaryItem[]`.
- Runs route state can render list-ready and empty states from the returned
  array.

### US-02: List Runs - Summary Items

**As** a workspace user,
**I want** each listed run to expose the presentation summary fields,
**So that** I can choose a run without loading every detail payload upfront.

**C&Q rail:** Query - `listRunSummaries`

**Scenario:**

- Given the current workspace has visible runs
- When `listRunSummaries()` resolves
- Then each `RunSummaryItem` has `runId`, `status`, and `startedAt`
- And optional summary fields such as `planId`, `environment`, `completedAt`,
  `substatus`, `message`, `hash`, `snapshotStaleness`, and `execution` are
  present only when the adapter can derive them

**Current evidence:**

- `RunSummaryItem` is declared in `apps/web/src/app/ports/runs.ts`.
- `runsApiSnapshotMapper.ts` maps backend snapshot records into summaries.
- `runsService.test.ts` covers API list mapping and scope query construction.

### US-03: List Runs - API Failure

**As** a workspace user,
**I want** list failures to surface as failures,
**So that** the route can show an error state instead of stale or fabricated
data.

**C&Q rail:** Query - `listRunSummaries`

**Scenario:**

- Given the API rejects the list request
- When `listRunSummaries()` is called through the API adapter
- Then the promise rejects
- And the route layer decides how to classify or render the failure

**Current evidence:**

- `runsService.api.ts` does not synthesize fallback list data after API errors.
- Route/facade tests own user-visible error posture.

## 2. View Run Detail

### US-04: View Run Detail - Existing Run

**As** a workspace user,
**I want** to load the current snapshot for one run,
**So that** I can inspect status, timing, provenance, and execution evidence
when the backend provides it.

**C&Q rail:** Query - `getRunSnapshot`

**Scenario:**

- Given a run with ID `run-123` exists
- When `getRunSnapshot('run-123')` resolves
- Then the caller receives a non-null `RunSnapshot`
- And the snapshot includes `runId`, `status`, and `startedAt`
- And optional fields such as `provenance`, `execution`, `materialization`, or
  failure details are present only when supplied by the adapter mapping

**Current evidence:**

- `RunSnapshot` is declared in `apps/web/src/app/ports/runs.ts`.
- `runsService.api.ts` calls `GET /runs/:runId` with tenant scope.
- `runsService.test.ts` covers snapshot mapping and removal of the old
  `/status` route dependency.

### US-05: View Run Detail - Run Not Found

**As** a workspace user,
**I want** a missing run to return `null`,
**So that** the route can distinguish not-found from transport failure.

**C&Q rail:** Query - `getRunSnapshot`

**Scenario:**

- Given the API returns HTTP 404 for a run ID
- When `getRunSnapshot(runId)` is called
- Then the API adapter resolves `null`
- And other HTTP failures still reject

**Current evidence:**

- `runsService.api.ts` catches `ApiError` with `statusCode === 404`.
- `runsService.test.ts` covers HTTP 404 translation to `null`.

### US-06: View Run Detail - API Failure

**As** a workspace user,
**I want** non-404 snapshot failures to remain visible,
**So that** the UI does not hide authorization, availability, or unexpected
runtime failures.

**C&Q rail:** Query - `getRunSnapshot`

**Scenario:**

- Given the API returns an error other than HTTP 404
- When `getRunSnapshot(runId)` is called
- Then the promise rejects with the original error
- And caller-level state decides whether to render forbidden, unavailable, or
  unexpected posture

**Current evidence:**

- `runsService.api.ts` only translates 404 to `null`.
- `runWorkspaceFacade.ts` classifies load failures for route consumption.

## 3. Start Run

### US-07: Start Run - Accepted

**As** a workspace user,
**I want** to start a run from a persisted plan and execution selection,
**So that** the runtime can execute the selected work.

**C&Q rail:** Command - `startRun`

**Scenario:**

- Given I have a valid `StartRunInput` with `planRef`, `workspaceScope`, and
  `selection`
- When `startRun(input)` resolves
- Then the caller receives `RunStartReceipt`
- And `RunStartReceipt.runId` is assigned by the API
- And `accepted` reflects the runtime admission result

**Current evidence:**

- `runsService.api.ts` posts to `POST /runs/start`.
- `runsService.test.ts` covers receipt parsing and malformed receipt rejection.

### US-08: Start Run - Client Does Not Own Run Identity

**As** a workspace user,
**I want** the web client to avoid sending a canonical run ID,
**So that** the protected runtime remains the authority for run identity.

**C&Q rail:** Command - `startRun`

**Scenario:**

- Given `startRun(input)` is called
- When the API adapter builds the request body
- Then the payload includes `tenantId`, `projectId`, `environmentId`,
  `targetAdapter`, `selection`, and `planRef`
- And the payload does not include a client-authored `runId`

**Current evidence:**

- `runsService.test.ts` covers that `startRun` does not send client-authored run
  identity.
- [Start Run Client Identity Boundary](./start-run-client-identity-boundary.md)
  records the same invariant.

### US-09: Start Run - Runtime Rejection

**As** a workspace user,
**I want** runtime start rejections to remain typed or explicit,
**So that** the UI can explain admission, authorization, or availability
failure.

**C&Q rail:** Command - `startRun`

**Scenario:**

- Given the protected runtime rejects `POST /runs/start`
- When `startRun(input)` is called
- Then `normalizeProtectedRuntimeRejection` may map the `ApiError`
- And otherwise the original error propagates

**Current evidence:**

- `runsService.api.ts` wraps `postJson` with
  `normalizeProtectedRuntimeRejection(error) ?? error`.
- `runsService.test.ts` covers protected runtime rejection normalization.

## 4. View Run Events

### US-10: View Run Events - Events Returned

**As** a workspace user,
**I want** to load event timeline pages for a run,
**So that** I can inspect runtime progress and emitted evidence.

**C&Q rail:** Query - `listRunEvents`

**Scenario:**

- Given run `run-123` has events
- When `listRunEvents('run-123')` resolves
- Then the caller receives `RunEventTimelinePage`
- And `events` contains parsed `RunEvent` records
- And `nextAfterSeq` is present only when the adapter receives it

**Current evidence:**

- `runsService.api.ts` calls `GET /runs/:runId/events`.
- `parseRunEventRecord` validates records before presentation use.
- `runsService.test.ts` covers events payload extraction.

### US-11: View Run Events - After Sequence

**As** a workspace user,
**I want** to request events after a known sequence,
**So that** polling can resume without re-reading the whole timeline.

**C&Q rail:** Query - `listRunEvents`

**Scenario:**

- Given the caller has already read sequence `5`
- When `listRunEvents(runId, 5)` is called
- Then the adapter appends `afterSeq=5` to the query string
- And tenant scope remains present

**Current evidence:**

- `runsService.api.ts` builds query parameters with `URLSearchParams`.
- `runsService.test.ts` covers `afterSeq` query construction.

### US-12: View Run Events - Timeline Degraded

**As** a workspace user,
**I want** snapshot loading and event loading failures to be distinguishable,
**So that** a route can show available snapshot data even when the timeline
query fails.

**C&Q rail:** Query - `listRunEvents`

**Scenario:**

- Given `getRunSnapshot(runId)` succeeds
- And `listRunEvents(runId)` rejects
- When `runWorkspaceFacade` composes the workspace view
- Then the route can render a degraded timeline posture without fabricating
  event data

**Current evidence:**

- `runWorkspaceFacade.ts` composes snapshot and timeline state.
- `runWorkspaceFacade.test.ts` covers facade error classification.

## 5. Mock Mode

### US-13: Mock Mode - Same Port Shape

**As** a developer,
**I want** mock and API adapters to satisfy `IRunsPort`,
**So that** route code can be written against one presentation boundary.

**C&Q rail:** Not applicable - local adapter parity

**Scenario:**

- Given the application is configured for API mode or mock mode
- When `createRunsService(mode)` is called
- Then the returned object satisfies `IRunsPort`
- And route code does not branch on `DataSourceMode`

**Current evidence:**

- `createApiRunsService` and `createMockRunsService` both return `IRunsPort`.
- `createRunsService` owns the mode switch.

## 6. Tenant Scoping

### US-14: Tenant Scope - Query Construction

**As** a workspace user,
**I want** runtime reads and commands scoped to the active workspace context,
**So that** run data does not cross tenant or environment boundaries.

**C&Q rail:** Cross-cutting scope rule for Runs commands and queries

**Scenario:**

- Given the active `SessionContextPort` returns tenant, project, and environment
  values
- When `listRunSummaries()` is called
- Then the API query includes tenant, project, and environment scope
- When `getRunSnapshot()` or `listRunEvents()` is called
- Then the API query includes tenant scope
- When `startRun()` is called
- Then the request body includes tenant, project, environment, and target
  adapter

**Current evidence:**

- `runsApiPayloads.ts` builds tenant-scope query strings.
- `runsService.api.ts` sends workspace scope in `startRun`.
- `runsService.test.ts` covers list, snapshot, events, and start request scope.

## Coverage Matrix

| Story | IRunsPort method   | Rail type | Current evidence surface          |
| ----- | ------------------ | --------- | --------------------------------- |
| US-01 | `listRunSummaries` | Query     | Mock/API list mapping             |
| US-02 | `listRunSummaries` | Query     | `RunSummaryItem` DTO and mapper   |
| US-03 | `listRunSummaries` | Query     | API error propagation             |
| US-04 | `getRunSnapshot`   | Query     | Snapshot DTO and API mapping      |
| US-05 | `getRunSnapshot`   | Query     | HTTP 404 to `null` mapping        |
| US-06 | `getRunSnapshot`   | Query     | Non-404 error propagation         |
| US-07 | `startRun`         | Command   | `POST /runs/start` receipt parse  |
| US-08 | `startRun`         | Command   | No client-authored `runId`        |
| US-09 | `startRun`         | Command   | Runtime rejection normalization   |
| US-10 | `listRunEvents`    | Query     | Events payload parsing            |
| US-11 | `listRunEvents`    | Query     | `afterSeq` query construction     |
| US-12 | `listRunEvents`    | Query     | Facade degraded timeline posture  |
| US-13 | factory/adapters   | N/A       | One `IRunsPort` for API and mock  |
| US-14 | all methods        | Scope     | Session-derived workspace scoping |

## Related

- [Runs Component Local Guide](./component-runs.md)
- [Runs Frontend Architecture](./dvt-runs-frontend-architecture.md)
- [Frontend Runtime Contract Technical Manual](./frontend-runtime-contract-technical-manual.md)
- [Start Run Client Identity Boundary](./start-run-client-identity-boundary.md)
- [Runs Domain Architecture Test](../../../../../apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts)
- [Command Query Rail Governance](../../../command-query-rail-governance.md)
