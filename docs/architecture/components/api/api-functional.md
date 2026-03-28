---
title: api Functionalities
status: Draft
owner: API / Entry Domain
last_reviewed: 2026-03-28
---

# api Functionalities

## Functionalities

| #   | Functionality             | Description                                                                                                              |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | HTTP Routing              | Registers and dispatches all inbound HTTP requests to the appropriate handler based on method and path.                  |
| 2   | Authentication            | Validates bearer tokens or API keys on each request, rejecting unauthenticated traffic before it reaches business logic. |
| 3   | Plan Execution Triggering | Accepts plan execution requests and forwards them to `@dvt/engine` for orchestration.                                    |
| 4   | Run Status Querying       | Accepts status query requests and returns current run state sourced from `@dvt/delivery`.                                |
| 5   | Signal Handling           | Accepts inbound signal payloads and routes them to the appropriate workflow via the engine.                              |
| 6   | Input Validation          | Validates request bodies against contract schemas before passing them to downstream components.                          |

## Main Methods

- `registerRoutes(app: HttpServer): void`: Mounts all API route definitions onto the HTTP server instance.
- `applyAuthMiddleware(app: HttpServer): void`: Attaches the authentication middleware to the server so every request is authenticated before routing.
- `handlePlanExecution(req: Request, res: Response): Promise<void>`: Validates an incoming plan execution request and delegates to `@dvt/engine`.
- `handleStatusQuery(req: Request, res: Response): Promise<void>`: Validates an incoming status query and returns run state from `@dvt/delivery`.
- `handleSignalIngestion(req: Request, res: Response): Promise<void>`: Validates and forwards a signal payload to the engine for dispatch to the targeted workflow.
- `validateToken(token: string): AuthContext`: Verifies the supplied token and returns the resolved authentication context, or throws if invalid.

## Key Files

- `apps/api/src/index.ts`
- `apps/api/src/routes/`
- `apps/api/src/middleware/auth.ts`
