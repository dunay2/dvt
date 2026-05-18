---
title: Run Event Timeline User Stories
status: Active
owner: Web / Runs
date: 2026-05-18
code_refs:
  - apps/web/src/app/services/runs/runEventTimelineModel.ts
  - apps/web/src/app/services/runs/runWorkspaceFacade.ts
  - apps/web/src/app/components/console/useConsoleLogStream.ts
  - apps/web/src/app/views/runs/RunEventTimelineTable.tsx
---

# Run Event Timeline User Stories

## Governing Sources

- [Run Event Timeline Component](./run-event-timeline-component.md)
- [Runs Component Local Guide](./component-runs.md)
- [Frontend Runtime Contract Technical Manual](./frontend-runtime-contract-technical-manual.md)
- [App Shell](../appshell/app-shell.md)
- [Command Query Rail Governance](../../../command-query-rail-governance.md)

## Stories

### US-F10-01: Ordered Timeline

**As** an operator,
**I want** run events displayed in runtime sequence order,
**So that** progress is readable even when transport pages arrive out of order.

Acceptance:

- Given events with `runSeq` values out of order
- When the frontend normalizes the event page
- Then events render by ascending `runSeq`

### US-F10-02: Duplicate Event Collapse

**As** an operator,
**I want** repeated event pages to avoid duplicate visible rows,
**So that** reconnect or overlapping polling does not make the run look noisy.

Acceptance:

- Given an existing event with `eventId = evt_1`
- And a later page includes `evt_1` again
- When the page is merged
- Then the visible timeline still contains one `evt_1`

### US-F10-03: Cursor Preservation

**As** the shell console,
**I want** to preserve `nextAfterSeq`,
**So that** the next poll resumes after the backend-provided cursor.

Acceptance:

- Given a page returns `nextAfterSeq = 12`
- When the stream model merges the page
- Then the next stream state stores `nextAfterSeq = 12`

### US-F10-04: Active Status Polling

**As** an operator,
**I want** the console to poll only active runs,
**So that** terminal runs do not keep background polling alive.

Acceptance:

- Given status is `pending` or `running`
- Then event stream polling is enabled
- Given status is `completed`, `failed`, or `cancelled`
- Then event stream polling is disabled

### US-F10-05: Shared Event Semantics

**As** a maintainer,
**I want** console lines and timeline rows to share severity and headline
semantics,
**So that** the two surfaces do not drift in meaning.

Acceptance:

- Given a `StepFailed` event
- When the console formats it
- And when the Runs timeline table renders it
- Then both surfaces use `ERROR` severity and the same headline copy

### US-F10-06: Structured Timeline Rows

**As** an operator,
**I want** the Runs route to render event rows with timestamp, severity,
headline, detail, and step ID,
**So that** durable timeline review is more scannable than terminal text.

Acceptance:

- Given an event has `emittedAt`, `eventType`, `payload.message`, and `stepId`
- When the Runs workspace renders the timeline
- Then the timeline row shows timestamp, severity, headline, detail, and step ID

### US-F10-07: Terminal Companion Lines

**As** an operator,
**I want** the bottom console to show the same event stream as terminal lines,
**So that** I can watch progress while staying in another workbench view.

Acceptance:

- Given active run events exist
- When the bottom console is open
- Then it shows formatted lines derived from the shared event semantics

### US-F10-08: Snapshot Authority Is Preserved

**As** a maintainer,
**I want** timeline events to stay chronology-only,
**So that** events do not fabricate materialization, failure diagnostics, or
snapshot status.

Acceptance:

- Given a timeline event payload includes result-like fields
- And the snapshot omits result evidence
- When the Runs workspace renders
- Then result evidence remains absent

### US-F10-09: Timeline Degraded State

**As** an operator,
**I want** event fetch failure to degrade only the timeline,
**So that** the run snapshot still remains visible.

Acceptance:

- Given snapshot fetch succeeds
- And event fetch fails
- When the workspace loads
- Then snapshot content renders and the timeline shows degraded copy

### US-F10-10: Architecture Guard

**As** a maintainer,
**I want** an architecture test to enforce shared timeline semantics,
**So that** future edits cannot split console and Runs chronology behavior.

Acceptance:

- Given console and Runs event consumers exist
- When architecture tests run
- Then they prove both consumers use the shared run event timeline model

## Coverage Matrix

| Story  | Primary surface           | Test surface                                      |
| ------ | ------------------------- | ------------------------------------------------- |
| F10-01 | `runEventTimelineModel`   | `runEventTimelineModel.test.ts`                   |
| F10-02 | `runEventTimelineModel`   | `runEventTimelineModel.test.ts`                   |
| F10-03 | `runEventTimelineModel`   | `runEventTimelineModel.test.ts`                   |
| F10-04 | `runEventTimelineModel`   | `runEventTimelineModel.test.ts`                   |
| F10-05 | shared presentation model | `formatLogLine.test.ts`, `RunStates.test.tsx`     |
| F10-06 | `RunEventTimelineTable`   | `RunsView.test.tsx`, `runEventTableModel.test.ts` |
| F10-07 | `useConsoleLogStream`     | `formatLogLine.test.ts`, existing console tests   |
| F10-08 | `RunWorkspaceStateView`   | `RunStates.test.tsx`                              |
| F10-09 | `RunWorkspaceFacade`      | `runWorkspaceFacade.test.ts`                      |
| F10-10 | architecture guard        | `runsDomainBoundary.architecture.test.ts`         |
