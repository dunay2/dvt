---
title: Frontend Runtime Contract Technical Manual
status: Review
owner: Frontend / API / Architecture
last_reviewed: 2026-05-08
domain: frontend
---

# Frontend Runtime Contract Technical Manual

## Subsystem In DVT Context

This manual defines the runtime contract boundary between `apps/web` and
`apps/api` for run orchestration and run monitoring.

Vertical impact:

- primary: UI / Frontend
- secondary: API / Entry
- tertiary: Execution Runtime
- supporting: Documentation Governance

## Historical Route Drift That F-07 Corrects

Before the current F-07 implementation, frontend runtime service behavior in
[runsService.ts](../../../../../apps/web/src/app/services/runs/runsService.ts):

- `startRun` posts to `POST /runs`
- `getRunStatus` reads `GET /runs/:runId/status`
- `getRun` reads `GET /runs/:runId`
- `listRunEvents` reads `GET /runs/:runId/events`

Protected runtime route map in
[runtimeRoutes.constants.ts](../../../../../apps/api/src/entrypoints/http/runtimeRoutes.constants.ts):

- `POST /runs/start`
- `GET /runs`
- `GET /runs/:runId`
- `GET /runs/:runId/events`

### Historical Drift Map

```mermaid
flowchart LR
  Web["apps/web runsService"] --> StartOld["POST /runs (drift)"]
  Web --> StatusOld["GET /runs/:runId/status (drift)"]
  Web --> GetRun["GET /runs/:runId (aligned)"]
  Web --> Events["GET /runs/:runId/events (aligned)"]

  API["apps/api protected runtime routes"] --> StartNew["POST /runs/start"]
  API --> List["GET /runs"]
  API --> GetRunApi["GET /runs/:runId"]
  API --> EventsApi["GET /runs/:runId/events"]
```

## Implemented Runtime Route Baseline

Frontend runtime contract now aligns to protected runtime route truth:

- start authority: `POST /runs/start`
- list authority: `GET /runs`
- run snapshot authority: `GET /runs/:runId`
- event timeline authority: `GET /runs/:runId/events`

`GET /runs/:runId/status` is removed from frontend runtime authority.
Status and lifecycle snapshot are read from `GET /runs/:runId`.

## Fowler Boundary Applied In F-07

Active route consumers now use explicit read models and a route-level facade:

- `listRunSummaries(): Promise<RunSummaryItem[]>`
- `getRunSnapshot(runId): Promise<RunSnapshot | null>`
- `listRunEvents(runId, afterSeq?): Promise<RunEventTimelinePage>`
- `startRun(input): Promise<RunStartReceipt>`
- `loadRunWorkspace(runId): Promise<RunWorkspaceViewModel | null>`

Retired from active route consumers:

- `listRuns(): Promise<Run[]>`
- `getRun(runId): Promise<Run | null>`
- `getRunStatus(runId): Promise<CanonicalRunStatus>`

No compatibility mapping is allowed from canonical-status payloads to a fake full
`Run` aggregate in the active Runs route.

### Implemented Route Contract Map

```mermaid
flowchart LR
  View["Runs and Canvas views"] --> Service["RunsService boundary"]
  Service --> Start["POST /runs/start"]
  Service --> List["GET /runs"]
  Service --> Get["GET /runs/:runId"]
  Service --> Events["GET /runs/:runId/events"]
  Start --> API["apps/api protected runtime module"]
  List --> API
  Get --> API
  Events --> API
```

## Communication Matrix

| Frontend runtime intent | Runtime endpoint          | Authority   | Notes                                |
| ----------------------- | ------------------------- | ----------- | ------------------------------------ |
| start run               | `POST /runs/start`        | API / Entry | command route, auth and admission    |
| list runs               | `GET /runs`               | API / Entry | list/read route                      |
| fetch run snapshot      | `GET /runs/:runId`        | API / Entry | status truth and detail truth        |
| list run events         | `GET /runs/:runId/events` | API / Entry | ordered timeline feed for monitoring |

## Runs Versus Bottom Console Drawer

`GET /runs/:runId/events` now has two governed frontend consumers, but they do
not own the same product responsibility:

- `RunWorkspaceFacade` composes snapshot plus timeline into the durable
  run-detail workbench;
- `useConsoleLogStream()` mirrors the active run as a shell-level live stream
  companion;
- only the Runs workspace combines timeline with snapshot authority;
- the shell drawer must not present itself as the authoritative run-detail
  surface.

Current consumer split:

```mermaid
flowchart LR
  Events["GET /runs/:runId/events"] --> DrawerHook["useConsoleLogStream()"]
  Events --> Facade["RunWorkspaceFacade.loadRunWorkspace(runId)"]
  Snapshot["GET /runs/:runId"] --> Facade
  DrawerHook --> Drawer["BottomConsoleDrawer"]
  Facade --> Runs["RunWorkspaceStateView"]
```

Authority rules:

1. `BottomConsoleDrawer` may show ordered live lines for the active run.
2. `BottomConsoleDrawer` must not derive snapshot truth, failure diagnostics,
   or result evidence on its own.
3. `RunWorkspaceStateView` owns snapshot truth and timeline degradation
   semantics for `/runs/:runId`.
4. Future convergence of logs, timeline, and terminal-grade streaming belongs
   to `F-10` and `F-18`, not to ad hoc shell copy drift.

## Runs Workbench State Ownership

`RunsView` is still the route compositor, but the route now has one governed
state contract that separates route-root state from workspace-inner state.

```mermaid
flowchart TD
  Input["runId + run summaries query + run workspace query"] --> Model["RunsWorkbench state model"]
  Model --> Index["runs-index state"]
  Index --> IndexError["runs-error state"]
  Index --> IndexEmpty["runs-empty state"]
  Index --> IndexList["runs-list state"]
  Model --> Loading["run-loading state"]
  Model --> Missing["run-missing state"]
  Model --> Error["run-error state"]
  Model --> Workspace["run-workspace state"]
  Workspace --> Snapshot["snapshot authority"]
  Workspace --> Timeline["timeline state: available | empty | degraded"]
```

Rules:

1. Route-root state chooses between list, loading, missing, error, and focused
   workspace.
2. `/runs` must render a governed list-error state when `GET /runs` fails and
   no authoritative list data is available.
3. Degraded timeline treatment is not a route-root error state because the run
   snapshot is still authoritative and renderable.
4. The focused workspace may carry `snapshot-only` detail truth while still
   rendering a degraded or empty timeline notice honestly.
5. The route must never collapse `run-missing` and `run-degraded` into the same
   user treatment.

Primary anchors:

- [RunsView.tsx](../../../../../apps/web/src/app/views/RunsView.tsx)
- [runWorkbenchStateModel.ts](../../../../../apps/web/src/app/views/runs/runWorkbenchStateModel.ts)
- [WorkbenchStates.tsx](../../../../../apps/web/src/app/components/workbench/state/WorkbenchStates.tsx)
- [RunDetailStateViews.tsx](../../../../../apps/web/src/app/views/runs/RunDetailStateViews.tsx)
- [RunWorkspaceStateView.tsx](../../../../../apps/web/src/app/views/runs/RunWorkspaceStateView.tsx)

The runtime contract does not change because of this extraction. Shared
workbench state primitives now own the repeated route-state chrome, while
`Runs` continues to own route-specific copy and state selection.

## Shared Run Event Presentation Model

The shell drawer and the Runs route now share one event-presentation seam
before they render their different surfaces:

```mermaid
flowchart LR
  Event["RunEvent"] --> SharedModel["buildRunEventPresentationModel(event)"]
  SharedModel --> SharedCopy["resolveRunEventHeadline(...)"]
  SharedCopy --> Drawer["formatRunEventAsLogLine(...)"]
  SharedCopy --> Timeline["RunWorkspaceStateView timeline event card"]
```

The shared model owns:

- event level (`INFO`, `WARN`, `ERROR`, `SUCCESS`);
- headline key;
- optional detail copied from runtime event payload message when present;
- step identity when the event belongs to one step.

F-10 adds a shared event timeline model before presentation:

```mermaid
flowchart LR
  Query["listRunEvents(runId, afterSeq)"] --> Timeline["normalize/merge timeline"]
  Timeline --> Console["terminal line stream"]
  Timeline --> Workspace["structured timeline cards"]
```

The timeline model owns ordering, duplicate collapse, cursor preservation, and
active-status polling decisions. It does not own snapshot truth.

The shared copy resolver owns:

- the governed human-readable headline text used by both drawer and timeline
  surfaces.

It does not change authority:

- `BottomConsoleDrawer` still renders a shell-level companion stream;
- `BottomConsoleDrawer` still owns terminal-style log-line composition;
- `RunWorkspaceStateView` still owns durable timeline interpretation;
- snapshot truth, failure diagnostics, and result evidence remain outside the
  shared event-presentation seam.

## PlanRef handoff prerequisite

The start-run contract is now preceded by backend-owned plan handoff routes:

- `POST /plans/preview` returns `{ plan, planRef }` when a valid preview is
  persisted.
- `POST /plans/import` returns `{ plan, planRef }` for a readable persisted
  plan inside the authorized scope.
- `apps/web/src/app/services/plans/plansService.api.ts` parses `planRef`
  directly from the payload and rejects envelopes that omit it.

This keeps the runtime boundary consistent:

1. preview or import returns a backend-authored `PlanRef`;
2. `useCanvasExecutionActions` fails closed if `currentPlan.planRef` is absent;
3. `runsService.startRun()` remains `PlanRef`-driven through `POST /runs/start`.

## Platform-Owned Start-Run Identity

The runtime contract now separates caller-owned start intent from
platform-owned execution identity.

Caller-owned input:

- `planRef`
- `workspaceScope`
- `selection`

Platform-owned output:

- `EngineRunRef.runId`

`StartRunInput` is the complete client-authored request contract for
`/runs/start`. The API route rejects any caller-authored canonical execution
identity with `client_run_id_not_allowed` and generates the internal
`StartRunCommand.runId` itself as `run_<UUIDv7>`.

Frontend consumers must treat `EngineRunRef.runId` as opaque. UUIDv7 provides
platform-side locality and collision resistance, but its timestamp bits are not
a frontend ordering, retry, or lifecycle contract.

```mermaid
flowchart LR
  Canvas["Canvas start action"] --> Input["StartRunInput: planRef + workspaceScope + selection"]
  Input --> Service["runsService.startRun"]
  Service --> Api["POST /runs/start"]
  Api --> Reject["reject client runId"]
  Api --> Generated["platform run_<UUIDv7>"]
  Generated --> Ref["EngineRunRef"]

  Input -. "no canonical execution identity" .-> Service
  Service -. "does not send caller-authored identity" .-> Api
  Service -. "must not parse" .-> Ref
```

Detailed local guide:

- [Start-run client identity boundary](./start-run-client-identity-boundary.md)

## Current Consumer Gap

The route baseline is now correct. Current limitation is explicit and truthful:

- `GET /runs/:runId` returns a runtime snapshot, not a full event-enriched run
  aggregate;
- the frontend must not present snapshot-only payloads as if they already carry
  step, timeline, artifact, or node-history detail;
- that richer operational detail remains a follow-on convergence slice for
  `F-09` through `F-11`.

## Result Evidence Rendering Rule

Caller-visible materialization evidence is success-only in the active runtime
contract line.

Rules:

1. `RunWorkspaceStateView` may render materialization evidence only when
   `snapshot.status = completed`.
2. Completed snapshots may render top-level executor identity plus sink target,
   row count, and started or completed timestamps only from persisted snapshot
   fields.
3. Failed snapshots render top-level executor identity and failure diagnostics
   only from persisted snapshot fields, without materialization
   evidence, even if an older internal projector or payload still carries stale
   sink metadata.
4. Running, paused, and cancelled snapshots render snapshot truth without
   result-evidence claims.
5. Timeline events remain chronology-only support for `/runs/:runId`; they must
   not be used to infer executor, rows written, sink target, or failed-step
   outcome when the snapshot does not already carry that evidence.

## Provenance Linkage Rendering Rule

Caller-visible plan provenance now belongs to the snapshot authority, not to
timeline heuristics.

Rules:

1. `GET /runs/:runId` may carry `provenance.persistedPlan` with the persisted
   plan record id, plan version, plan source ref, and canonical plan hash.
2. When the persisted plan carries preview-time authoring provenance,
   `GET /runs/:runId` may also carry `provenance.authoring.graphArtifact` and
   `provenance.authoring.sqlArtifact`.
3. `RunWorkspaceStateView` renders that plan-and-authoring provenance only from
   snapshot fields.
4. `GET /runs/:runId/events` remains supplemental for execution-time artifact
   refs emitted by runtime steps and must not become the source of authoring
   truth.

## Vertical Impact Map

```mermaid
flowchart TD
  F07["F-07 runtime contract baseline"] --> UI["UI / Frontend"]
  F07 --> API["API / Entry"]
  F07 --> Runtime["Execution Runtime"]
  F07 --> Gov["Documentation Governance"]
  UI --> F08["F-08 Plan to Run flow"]
  UI --> F09["F-09 Runs operational view"]
  F09 --> F10["F-10 Event timeline convergence"]
  F10 --> F11["F-11 Artifacts and Diff real data"]
```

## Opportunity Register

1. Contract truth for UX state handling (loading, auth, not-found, conflict).
2. Clearer runtime error semantics at service level (`401/403/404/409/422/5xx`).
3. Lower rework risk for `F-08` through `F-11`.
4. Better service-level testability and deterministic route coverage.

## Consequences

- positive: route ownership and error posture become explicit
- positive: docs and code evolve against one runtime route baseline
- cost: strict migration work in service tests and route consumers
- cost: short-term refactor overhead while preserving mock mode behavior

## Handoff Chain

```mermaid
flowchart LR
  F07["F-07 baseline"] --> F08["F-08 core flow"]
  F08 --> F09["F-09 runs list/detail"]
  F09 --> F10["F-10 timeline and console"]
  F10 --> F11["F-11 artifacts, diff, feature-flagged views"]
```

## Canonical References

- [Frontend Fowler Implementation Pattern](../frontend-fowler-implementation-pattern.md)
- [Runs Frontend Architecture](./dvt-runs-frontend-architecture.md)
- [Frontend Runtime Contract User Manual](./frontend-runtime-contract-user-manual.md)
- [F-07 Frontend Runtime Contract Baseline Plan](../../../../planning/proposals/mandatory/runtime-and-contracts/f-07-frontend-runtime-contract-baseline-plan-20260404.md)
