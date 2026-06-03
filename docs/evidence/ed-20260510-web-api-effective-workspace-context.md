---
title: Server-owned effective workspace context
status: Accepted
date: 2026-05-10
owners:
  - apps/api
  - apps/web
  - packages/@dvt/engine
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/ports/workspaceContext.ts
  - apps/api/src/entrypoints/http/workspaceContextRoute.ts
  - apps/api/src/infrastructure/auth/embeddedWorkspaceContextQuery.ts
  - apps/web/src/app/services/session/protectedRouteSessionContext.ts
  - packages/@dvt/engine/test/helpers/workflowEngine.fixture.ts
evidence:
  tests:
    - pnpm --filter dvt-api exec vitest run test/entrypoints/http/workspaceContextRoute.test.ts test/infrastructure/auth/embeddedWorkspaceContextQuery.test.ts test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/services/session/protectedRouteSessionContext.test.ts src/app/services/session/protectedRouteSessionContext.architecture.test.ts
    - pnpm --filter dvt-api typecheck
    - pnpm --filter @dvt/web typecheck
    - pnpm governance:refresh
    - pnpm verify:prepush
---

## Summary

This evidence records the branch that separates authenticated session profile
from server-owned effective workspace context and keeps the engine fixture
determinism cleanup in the same pull request.

## Architectural Intent

- `GET /session` remains a session query.
- `GET /workspace/context` owns effective tenant, project, and environment
  context for protected web API mode.
- The web protected route gate resolves session first, then the server-granted
  workspace context, before rendering protected routes.
- Engine test fixture branded values remain deterministic and explicit.

## Validation

The focused API and web tests passed, package typechecks passed, governance
refresh completed, feature mechanization checks passed, and `pnpm
verify:prepush` completed successfully before publication.
