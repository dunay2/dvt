---
title: Web App Functionalities
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web App Functionalities

## Functionalities

| #   | Functionality                   | Description                                                                                                                      |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Run Status Display              | Shows current run status, step-level progress, and workflow state fetched from `apps/api`.                                       |
| 2   | User Interaction and Monitoring | Enables users to trigger actions (e.g., start a run, inspect step details) and monitor ongoing workflow execution in real time.  |
| 3   | UI Component Management         | Manages the lifecycle of UIComponentAggregates — mounting, updating, and unmounting components as application state changes.     |
| 4   | API Integration                 | Integrates with `apps/api` to receive status queries and submit user-driven requests via the APIGateway boundary.                |
| 5   | Engine Status Integration       | Consumes workflow status from `@dvt/engine` via the EngineStatusFeed to ensure the display reflects live execution state.        |
| 6   | Visualization Logic             | Applies visualization rules (e.g., color coding, progress indicators) to transform raw run and step data into user-facing views. |

## Main Methods

- `manageUIComponents(): void`: Orchestrates the creation, update, and teardown of UIComponentAggregates within the application.
- `manageVisualizationLogic(): void`: Applies visualization rules to current application state and triggers re-renders as needed.
- `reportWebStatus(): WebStatus`: Returns the current status of the web application aggregate for health monitoring or cross-domain observability.
- `receiveStatusQuery(runId: string): Promise<RunStatus>`: (APIGateway) Queries `apps/api` for the status of a specific run by ID.
- `receiveWorkflowStatus(runId: string): WorkflowStatus`: (EngineStatusFeed) Retrieves live workflow execution status from `@dvt/engine`.
- `storeUIComponent(component: UIComponent): void`: (UIComponentAggregate) Persists a UI component definition for management within the aggregate.

## Key Files

- `apps/web/src/domain/WebAggregate.ts`
- `apps/web/src/domain/UIComponentAggregate.ts`
- `apps/web/src/gateways/APIGateway.ts`
- `apps/web/src/gateways/EngineStatusFeed.ts`
- `apps/web/src/index.ts`
