---
title: Web App DDD Structure
status: Draft
owner: UI / Visualization Domain
last_reviewed: 2026-03-28
---

# Web App DDD Structure

## DDD Diagram

```mermaid
classDiagram
  class WebAggregate {
    +manageUIComponents(): void
    +manageVisualizationLogic(): void
    +reportWebStatus(): WebStatus
  }
  class UIComponentAggregate {
    +storeUIComponent(component: UIComponent)
    +manageUIOperations(): void
    +reportUIStatus(): UIStatus
  }
  class APIGateway {
    +receiveStatusQuery(runId: string): Promise~RunStatus~
    +exposeEndpoint(route: string): void
  }
  class EngineStatusFeed {
    +receiveWorkflowStatus(runId: string): WorkflowStatus
  }
  WebAggregate "1" --> "many" UIComponentAggregate : owns
  WebAggregate --> APIGateway : uses
  WebAggregate --> EngineStatusFeed : uses
```

## Aggregates & Entities

- **WebAggregate**: The central web model and aggregate root for `apps/web`. Owns all UI components, visualization logic, and coordinates interactions with the API and engine.
- **UIComponentAggregate**: Represents individual managed UI components within the application. Stores component state, manages UI operations, and reports status to WebAggregate.
- **APIGateway**: Boundary object that mediates communication between the web application and `apps/api`, receiving status queries and routing user-initiated requests.
- **EngineStatusFeed**: Boundary object that surfaces workflow execution status from `@dvt/engine` into the application for display.

## Domain Events

- `UIComponentRendered`: Emitted when a UIComponentAggregate successfully renders its view to the browser.
- `RunStatusDisplayed`: Emitted when the WebAggregate successfully retrieves and displays a run's status for the user.
- `UserActionDispatched`: Emitted when a user interaction is captured and forwarded to the API layer.

## Key Files

- `apps/web/src/domain/WebAggregate.ts`
- `apps/web/src/domain/UIComponentAggregate.ts`
- `apps/web/src/gateways/APIGateway.ts`
- `apps/web/src/index.ts`
