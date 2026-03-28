---
title: api Constraints & Invariants
status: Draft
owner: API / Entry Domain
last_reviewed: 2026-03-28
---

# api Constraints & Invariants

## Constraints and Invariants

| Constraint / Invariant                                         | Where Enforced                   | Description                                                                                                                                     |
| -------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Must comply with API contracts and authentication requirements | ApiApplication / AuthMiddleware  | Every endpoint must conform to the contract shapes defined in `@dvt/contracts`; all requests must pass authentication before reaching handlers. |
| Only interacts with API domain, engine, and delivery           | Route handler layer              | The API layer must not import or call packages outside of `@dvt/engine` and `@dvt/delivery`; direct database or adapter access is forbidden.    |
| All request bodies must be validated before processing         | RouteHandler input validation    | Raw request payloads must be parsed and validated against the relevant Zod schema before being passed to the engine or delivery layer.          |
| Authentication must precede all route logic                    | AuthMiddleware ordering          | The auth middleware must be registered before any route handler so that unauthenticated requests are rejected at the earliest point.            |
| HTTP error responses must follow the standard error envelope   | RouteHandler error handling      | All error responses must include a structured error body matching the API error contract — no raw exception messages may be sent to clients.    |
| Signals must be idempotent from the API boundary               | RouteHandler / engine delegation | Duplicate signal submissions with the same idempotency key must be detected and acknowledged without re-processing.                             |

## Validation Examples

- A request to the plan execution endpoint with a missing or malformed body is rejected with HTTP 400 and a structured validation error before reaching the engine.
- A request without a valid bearer token is rejected with HTTP 401 by `AuthMiddleware` before any route handler executes.
- A signal request with an unrecognised run ID is forwarded to the engine, which returns a domain error that the API maps to HTTP 404.

## Key Files

- `apps/api/src/index.ts`
- `apps/api/src/routes/`
- `apps/api/src/middleware/auth.ts`
