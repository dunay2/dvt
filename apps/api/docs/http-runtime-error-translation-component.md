---
title: HTTP Runtime Error Translation Component
status: Active
owner: apps/api
last_reviewed: 2026-04-21
---

# HTTP runtime error translation component

This local guide documents the `apps/api` boundary that translates parse,
auth, facade, engine, and typed runtime failures into the canonical
`HttpErrorEnvelope.v1`.

This is a **local component guide**, not a second canonical contract. The
canonical caller-visible envelope remains
`docs/contracts/shared/HttpErrorEnvelope.v1.md`.

## Owned concern

The component owns exactly one concern:

- translate entrypoint-local semantic failures into stable `HttpResponseModel`
  values without leaking route-local formatting or runtime message parsing

It does **not** own:

- run lifecycle semantics
- planner semantics
- adapter execution semantics
- Fastify bootstrapping

## Public API

- `httpErrorTranslation.ts`
  Public production seam:
  `httpErrorTranslation.parse.issue`,
  `httpErrorTranslation.auth.*`,
  `httpErrorTranslation.startRun.*`,
  `httpErrorTranslation.runtime.domainError`
- `httpErrorContract.ts`
  Canonical HTTP error primitives:
  `HTTP_ERROR_TYPE`, `HTTP_HEADER`, `HttpResponseModel`,
  `createHttpErrorResponse`, `sendHttpResponse`, `normalizeHttpErrorReason`
- `httpErrorReasonCatalog.ts`
  Stable route-level reason catalog:
  `HTTP_ERROR_REASON`
- `routeParseIssue.ts`
  Parser/auth semantic rejection model:
  `RouteParseIssue`, `RouteParseResult`, `badRequestIssue`,
  `forbiddenIssue`, `badRequestResult`, `forbiddenResult`

## Invariants

- the only caller-visible error envelope is `HttpErrorEnvelope.v1`
- `error.type` decides the HTTP status; routes do not handcraft status codes for
  known semantic failures
- parser failures become `RouteParseIssue` values before serialization
- runtime-domain translation is typed and must not depend on `error.message`
  parsing
- production consumers import `httpErrorTranslation.ts` instead of internal
  mapper/classifier modules
- `httpErrorMapper.ts` does not own runtime-domain classification
- translated `HttpResponseModel` values are emitted through `sendHttpResponse`
  instead of handwritten route serialization
- optional `details` are omitted when empty

## Transitions

```mermaid
stateDiagram-v2
  [*] --> Parsed
  Parsed --> ParseRejected: parser/auth scope issue
  Parsed --> ApplicationOutcome: facade/use case accepts input
  ApplicationOutcome --> RuntimeRejected: typed runtime error thrown
  ApplicationOutcome --> SuccessResponse: success payload
  ParseRejected --> HttpEnvelope
  RuntimeRejected --> HttpEnvelope
  SuccessResponse --> [*]
  HttpEnvelope --> [*]
```

## Component map

```mermaid
flowchart TB
  subgraph Boundary["HTTP runtime error translation boundary"]
    Contract["httpErrorContract.ts"]
    Api["httpErrorTranslation.ts"]
    Reasons["httpErrorReasonCatalog.ts"]
    Parse["routeParseIssue.ts"]
    Mapper["httpErrorMapper.ts"]
    Classifier["httpDomainErrorClassifier.ts"]
    Details["httpErrorDetails.ts"]
  end

  Routes["admin/get/list/events/run-command routes"] --> Api
  Api --> Parse
  Api --> Mapper
  Api --> Classifier
  Mapper --> Contract
  Classifier --> Contract
  Mapper --> Reasons
  Classifier --> Reasons
  Mapper --> Details
  Classifier --> Details
```

## Sequence

```mermaid
sequenceDiagram
  participant Route as Route consumer
  participant Parser as Parser/Auth seam
  participant Api as httpErrorTranslation
  participant Mapper as httpErrorMapper
  participant Classifier as httpDomainErrorClassifier
  participant Contract as httpErrorContract

  Route->>Parser: parse request / authorize scope
  alt parse or auth rejection
    Parser-->>Api: RouteParseIssue or auth result
    Api->>Mapper: delegate by concern
    Mapper->>Contract: createHttpErrorResponse(...)
    Contract-->>Route: HttpResponseModel
  else runtime error after execution
    Route->>Api: runtime.domainError(error)
    Api->>Classifier: delegate by concern
    Classifier->>Contract: createHttpErrorResponse(...)
    Contract-->>Route: HttpResponseModel | null
  end
```

## Consumers

- `adminRoutes.ts`
- `getRunRoute.ts`
- `getRunEventsRoute.ts`
- `listRunsRoute.ts`
- `runCommandRouteExecutor.ts`
- `authorizeExecutionScope.ts`
- `authorizeAdminExecutionScope.ts`
- `startRunRoute.ts`

## Focused file map

- `apps/api/src/entrypoints/http/httpErrorContract.ts`
- `apps/api/src/entrypoints/http/httpErrorTranslation.ts`
- `apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts`
- `apps/api/src/entrypoints/http/routeParseIssue.ts`
- `apps/api/src/entrypoints/http/httpErrorDetails.ts`
- `apps/api/src/entrypoints/http/httpErrorMapper.ts`
- `apps/api/src/entrypoints/http/httpDomainErrorClassifier.ts`
- `apps/api/test/entrypoints/http/httpErrorTranslation.test.ts`
- `apps/api/test/entrypoints/http/httpRuntimeErrorTranslation.architecture.test.ts`

## Consumers and boundaries

- route parsers and auth seams produce semantic failures
- `httpErrorTranslation.ts` is the public seam for production consumers
- the mapper serializes parse/auth/facade/engine outcomes behind that seam
- the classifier serializes typed runtime-domain errors behind that seam
- `sendHttpResponse` is the owned transport writer for translated responses
- unknown runtime errors remain uncategorized and are rethrown to the outer
  error boundary

## Extension rules

- add new production consumer imports through `httpErrorTranslation.ts`, not
  directly from mapper/classifier internals
- add new route-level static reasons in `HTTP_ERROR_REASON`
- add new parser rejections through `RouteParseIssue`, not ad hoc `{ status,
body }` objects
- add new typed runtime-domain branches only in `httpDomainErrorClassifier.ts`
- if a new helper is shared across mapper and classifier, prefer a dedicated
  helper module inside this component instead of duplicating the logic
