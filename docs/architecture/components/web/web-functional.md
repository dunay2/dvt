---
title: Web Functionalities
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web Functionalities

## Functionalities

| #   | Functionality             | Description                                                                                                          |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | UI Component Library      | Provides reusable UI components (views, panels, controls) consumed by the web application layer.                     |
| 2   | Run Status Visualization  | Renders current run status, step progress, and workflow state sourced from the API and engine.                       |
| 3   | User Interaction Handling | Captures and dispatches user events (e.g., triggering a run, viewing step details) to the appropriate API endpoints. |
| 4   | API Integration           | Communicates with `apps/api` via HTTP to query run status, retrieve plan summaries, and submit user requests.        |
| 5   | Engine Status Display     | Surfaces workflow execution state from `@dvt/engine` for real-time monitoring in the UI.                             |
| 6   | Contract Compliance       | All API calls and data models conform to the UI contracts and API definitions governing the UI/Visualization domain. |

## Main Methods

- `renderView(state: UIState): ReactElement`: Renders a UI component tree based on the current application state.
- `handleUserInteraction(event: UIEvent): void`: Processes a user-triggered event and dispatches the corresponding API call or state update.
- `fetchStatus(): Promise<RunStatus>`: Queries the API for the latest run or workflow status and updates the component state.
- `queryStatus(runId: string): Promise<RunStatus>`: (APIClient) Sends an HTTP GET request to `apps/api` for run status by run ID.
- `getWorkflowStatus(runId: string): Promise<WorkflowStatus>`: (EngineStatusAdapter) Retrieves workflow execution state from `@dvt/engine` for display.

## Key Files

- `packages/@dvt/web/src/components/`
- `packages/@dvt/web/src/adapters/APIClient.ts`
- `packages/@dvt/web/src/adapters/EngineStatusAdapter.ts`
- `packages/@dvt/web/src/index.ts`
