---
title: ED-20260312 — G8 Arch Tests and Engine Wiring Closeout
gap: G8
status: Closed
date: 2026-03-12
author: AI-assisted delivery (Claude Sonnet 4.6)
tasks: T8-6, T8-7
---

# ED-20260312 — G8 Arch Tests and Engine Wiring Closeout

Evidence document for the final two tasks of the G8 API auth hardening gap.

## Closure Criteria

| Criterion | Exit signal | Result |
| --- | --- | --- |
| T8-6: dependency-cruiser rules installed | `pnpm --filter dvt-api test:arch` passes | Pass — 0 violations |
| T8-6: 5 §16.2 layer rules present | config file checked | Pass — 5 rules |
| T8-7: `EngineStartRunUseCase` replaces stub | `POST /runs/start` calls `engine.startRun()` | Pass — use case unit test confirms |
| T8-7: `WorkflowEngine` wired with real adapters | `app.ts` inspected | Pass |
| T8-7: all existing tests still pass | `pnpm --filter dvt-api test` | Pass — 21/21 |
| T8-7: typecheck clean | `pnpm --filter dvt-api typecheck` | Pass — 0 errors |

## T8-6 — dependency-cruiser Architectural Rules

### Installed

- `dependency-cruiser@17.3.9` added to `apps/api/package.json` devDependencies
- `test:arch` script: `depcruise src --config .dependency-cruiser.cjs`

### Rules (apps/api/.dependency-cruiser.cjs)

| Rule name | From | To | Purpose |
| --- | --- | --- | --- |
| `no-domain-to-application` | `src/domain/` | `src/(application\|entrypoints\|infrastructure)/` | Domain must not depend on outer rings |
| `no-application-to-fastify-or-jwt` | `src/application/` | `fastify`, `@fastify`, `jose` | Application layer must not import HTTP/JWT libraries |
| `no-application-to-oidc-libs` | `src/application/` | `openid-client`, `oidc-provider` | Application layer must not import OIDC runtime libs |
| `no-ports-to-http-types` | `src/application/ports/` | `fastify`, `@fastify`, `http`, `node:http` | Port interfaces must be HTTP-agnostic |
| `no-routes-direct-policy` | `src/(routes\|entrypoints)/` | `src/domain/auth/policy` | Entrypoints must not bypass application layer |

### Validation Run

```
pnpm --filter dvt-api test:arch
✔ no dependency violations found (104 modules, 134 dependencies cruised)
```

## T8-7 — Engine-Backed StartRun Use Case

### Model Changes (`apps/api/src/application/ports/auth.ts`)

`StartRunCommand` extended with:

```typescript
export interface StartRunPlanRef {
  readonly uri: string;
  readonly sha256: string;
  readonly schemaVersion: string;
  readonly planId: string;
  readonly planVersion: string;
}

export interface StartRunCommand {
  readonly planRef: StartRunPlanRef;
  readonly runId: string;
  readonly targetAdapter: 'temporal' | 'mock';
  readonly selection: ReadonlyArray<string>;
}
```

### New File (`apps/api/src/application/services/engineStartRunUseCase.ts`)

`EngineStartRunUseCase` implements `IStartRunUseCase`, delegating to
`IWorkflowEngine.startRun(planRef, runContext)`. Returns `{ runId, accepted: true }`.

### Route Changes (`apps/api/src/entrypoints/http/startRunRoute.ts`)

`parseStartRunBody` now parses `planRef`, `runId`, and `targetAdapter` from the
request body. Returns 400 with codes `INVALID_PLAN_REF`, `INVALID_RUN_ID`,
`INVALID_TARGET_ADAPTER` for missing or malformed values.

### App Wiring (`apps/api/src/app.ts`)

Inside the OIDC conditional block, `WorkflowEngine` is now constructed with:

- `PostgresStateStoreAdapter` (state store + outbox)
- `PostgresStartRunIntentStore` (idempotency intent store)
- `SnapshotProjector`
- `MockAdapter` (test adapter surface)
- System clock (`nowIsoUtc: () => new Date().toISOString()`)
- `AllowAllAuthorizer` (engine-level; real auth enforced at application layer)
- `PlanRefPolicy({ allowedSchemes: ['https', 's3', 'gs', 'azure'] })`

Imports of `@dvt/engine` and `@dvt/adapter-postgres` are deferred as dynamic
`import()` calls inside the OIDC block to avoid CJS/ESM interop failures in
the Node 22 native test runner when OIDC is not configured.

### App Test Update (`apps/api/test/app.test.ts`)

`buildApp()` now returns a promise because the protected runtime wiring loads
engine and adapter modules asynchronously before the app surface is returned.
The app tests were updated to `await buildApp()` and to use `assert.rejects()`
for the OIDC-without-database fast-fail path.

### Validation Run

```
pnpm --filter dvt-api test
# tests 21
# pass  21
# fail   0
duration_ms 1475.4323
```

## Touched Files

| File | Change |
| --- | --- |
| `apps/api/package.json` | added `dependency-cruiser` devDep; added `test:arch`; added `@dvt/contracts` build to `pretest` |
| `apps/api/.dependency-cruiser.cjs` | new — 5 arch rules |
| `apps/api/src/application/ports/auth.ts` | extended `StartRunCommand` with `StartRunPlanRef`, `runId`, `targetAdapter` |
| `apps/api/src/application/services/engineStartRunUseCase.ts` | new — `EngineStartRunUseCase` |
| `apps/api/src/entrypoints/http/startRunRoute.ts` | parse `planRef`, `runId`, `targetAdapter` from body |
| `apps/api/src/app.ts` | wire `WorkflowEngine` with real adapters; deferred dynamic imports |
| `apps/api/src/server.ts` | await `buildApp()` |
| `apps/api/test/app.test.ts` | await `buildApp()`; updated async rejection assertion |
| `apps/api/test/entrypoints/http/startRunRoute.test.ts` | updated command assertions for new fields |
| `apps/api/test/application/services/engineStartRunUseCase.test.ts` | new — 2 tests |
