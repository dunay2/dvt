---
title: Start-run HTTP entrypoint component
status: Active
owner: apps/api
last_reviewed: 2026-04-23
---

# Start-run HTTP entrypoint component

This local guide documents the `apps/api` HTTP subcomponent that owns request
parsing and response emission for the `start-run` route.

It sits at the transport edge, before the wider
[`start-run application component`](./start-run-application-component.md).
It does not own auth semantics, planner compilation, or engine dispatch.

Use these related guides with this page:

- `apps/api/docs/start-run-control-boundary-component.md`
- `apps/api/docs/start-run-application-component.md`
- `apps/api/docs/start-run-platform-identity-component.md`
- `apps/api/docs/http-runtime-error-translation-component.md`
- `docs/adr/adr-0050-platform-owned-start-run-identity.md`
- `docs/architecture/components/web/runs/start-run-client-identity-boundary.md`

## Owned concern

The component owns exactly one concern:

- translate the `POST /runs/start` HTTP request into a canonical
  `StartRunCommand` plus requested authorization scope
- reject any caller-provided `runId` and insert a platform-owned internal
  `runId` before the command crosses into application orchestration
- emit the mapped HTTP response through the public error-translation facade

It does **not** own:

- authenticated execution orchestration
- canonical result taxonomy
- direct `FastifyReply` serialization details
- planner execution or plan storage
- engine error mapping
- retry, duplicate-run, lifecycle, recovery, or provider workflow semantics

## Public API

- `startRunRoute.ts`
  Route seam that composes parser, bearer-token extraction, authenticated
  facade execution, and HTTP response translation
- `startRunRouteParser.ts`
  Request parser that returns canonical command + requested scope
- `startRunRouteCommandBuilder.ts`
  Command builder that selects the allowed plan-source branch and assembles the
  canonical `StartRunCommand`
- `startRunIdentity.ts`
  Platform-owned `run_<UUIDv7>` execution-id generator seam used by the route
  boundary. Its dedicated local component guide is
  `apps/api/docs/start-run-platform-identity-component.md`.
- `startRunRouteTargetAdapterParser.ts`
  Adapter-specific binding of the generic target-adapter parser to the
  start-run registry

## Invariants

- the only default adapter-registry binding in this subcomponent lives at the
  outer route seam
- the only default run-id generator binding in this subcomponent lives at the
  outer route seam
- client-provided `runId` is rejected with `client_run_id_not_allowed`; it is
  never silently ignored or normalized
- `startRunRouteCommandBuilder.ts` rejects caller-authored identity before it
  calls the injected run-id generator
- `startRunRouteCommandBuilder.ts` rejects a generated id that does not match
  `run_<UUIDv7>` before delegating to the authenticated facade
- `startRunRoute.ts` never calls `sendHttpResponse(...)` directly; it always
  emits via `httpErrorTranslation.respond(...)`
- `startRunRoute.ts` depends on `parseStartRunBody(...)`, not on lower-level
  plan-route parser internals
- `startRunRouteCommandBuilder.ts` owns plan-source branch assembly after
  `evaluatePlanRoutePlanSource(...)` decides the allowed branch
- parser and builder modules stay transport-semantic; they do not import
  application services such as the authenticated facade
- generated `runId` remains internal command vocabulary; the external request
  shape is `planRef` or planner input plus workspace scope, target adapter, and
  selection
- generated `runId` has the `run_<UUIDv7>` shape for time locality and
  multi-instance collision resistance, but all consumers must treat it as
  opaque
- `startRunIdentity.ts` imports only platform allocation primitives; it must
  not import `@dvt/engine`, state-store adapters, provider adapters, or the
  authenticated start-run facade
- persistence uniqueness remains the final collision guard; the HTTP
  entrypoint must not add retry/idempotency behavior that belongs to a
  governed runtime contract

## Component map

```mermaid
flowchart LR
  Route["startRunRoute.ts"] --> Parser["parseStartRunBody()"]
  Parser --> Builder["parseStartRunCommand()"]
  Builder --> Identity["startRunIdentity.ts"]
  Builder --> Policy["evaluatePlanRoutePlanSource()"]
  Builder --> Target["parseStartRunTargetAdapter()"]
  Route --> Facade["StartRunAuthorizedFacade"]
  Route --> Errors["httpErrorTranslation.respond(...)"]
```

## Identity allocation boundary

```mermaid
flowchart TB
  Parser["parseStartRunBody"] --> Builder["parseStartRunCommand"]
  Builder --> Reject["reject client runId"]
  Builder --> Generator["startRunIdentity.ts"]
  Generator --> RunId["run_<UUIDv7>"]
  RunId --> ValidateRunId["validate generated run_<UUIDv7>"]
  ValidateRunId --> Command["StartRunCommand.runId"]
  Command --> Facade["StartRunAuthorizedFacade"]
  Facade --> Runtime["runtime/application engine path"]

  Generator -. "does not import" .-> Engine["@dvt/engine"]
  Generator -. "does not import" .-> Store["state-store / adapters"]
  Generator -. "does not own" .-> Lifecycle["retry / dedupe / lifecycle"]
```

## Transitions

```mermaid
sequenceDiagram
  participant Route as startRunRoute
  participant Parser as parseStartRunBody
  participant Facade as StartRunAuthorizedFacade
  participant Errors as httpErrorTranslation

  participant Identity as startRunIdentity

  Route->>Parser: parseStartRunBody(body, adapterRegistry, runIdGenerator)
  alt parse failure
    Parser-->>Route: RouteParseIssue
    Route->>Errors: parse.issue(...)
    Route->>Errors: respond(...)
  else parse success
    Parser->>Identity: generate platform-owned runId
    Parser->>Parser: reject malformed generated id
    Parser-->>Route: command + requestedScope
    Route->>Facade: execute(token, requestId, command, requestedScope)
    Facade-->>Route: facade result or engine error
    Route->>Errors: startRun.facadeResult(...) or startRun.engineError(...)
    Route->>Errors: respond(...)
  end
```

## Consumers

- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/entrypoints/http/startRunIdentity.ts`
- `apps/api/src/app.ts`
- `apps/api/test/entrypoints/http/startRunRoute*.test.ts`
- `apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts`
- `apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts`
- `apps/api/test/entrypoints/http/startRunRouteTargetAdapterParser.test.ts`

## Focused file map

- `apps/api/src/entrypoints/http/startRunRoute.ts`
- `apps/api/src/entrypoints/http/startRunIdentity.ts`
- `apps/api/src/entrypoints/http/startRunRouteParser.ts`
- `apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts`
- `apps/api/src/entrypoints/http/startRunRouteTargetAdapterParser.ts`
- `apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts`
- `apps/api/test/entrypoints/http/startRunHttpEntrypointComponent.architecture.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.validation.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.facadeResultTranslation.test.ts`
- `apps/api/test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts`

## Extension rules

- keep default registry composition at the outermost route seam only
- keep default run-id generation at the outermost route seam only
- add new transport-level request fields in the parser/builder layer before
  touching application orchestration
- do not add caller-visible execution identity fields without revisiting
  `ADR-0050`
- route-level consumers must keep using `httpErrorTranslation.respond(...)`
- do not let the route import lower-level plan-route field helpers directly
  once a dedicated `start-run` parser seam exists
