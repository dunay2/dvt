---
title: Project workspace and graph authority hard-cut
status: Accepted
date: 2026-08-13
owners:
  - apps/api
  - apps/web
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/workspace/ProjectWorkspace.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/WorkspaceGraphDraft.v1.ts
  - apps/api/src/infrastructure/auth/embeddedPrincipalGrantRepository.ts
  - apps/api/src/infrastructure/auth/embeddedProjectOnboardingRepository.ts
  - apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts
  - apps/web/src/app/services/session/protectedRouteSessionContext.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test:unit
    - DVT_PG_URL=<postgres> pnpm --filter dvt-api exec vitest run test/infrastructure/auth/embeddedProjectOnboardingRepository.test.ts test/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.test.ts
    - pnpm --filter @dvt/web test
    - pnpm verify:prepush
---

Issue #2170 converges project admission, workspace grants/defaulting and graph
draft authority on the existing command/query rails. The shared contracts now
own project/workspace and graph-draft public vocabulary. One normalized
principal-grant repository supplies authorization, workspace context and
project onboarding; project creation owns product policy outside persistence
and serializes grant mutation in PostgreSQL.

The server returns a deterministic default from its granted workspace set. The
browser retains only a selection that remains in that set. Graph requests
authenticate once, derive read/write capability from one grant snapshot, use
canonical request hashing, treat every declared Canvas as graph-owned and
re-evaluate current Canvas authority before idempotent replay.

This is an intentional hard-cut. Graph draft responses no longer publish
nonexistent migration states, the web no longer owns a duplicate protocol, and
three topology-only route wrappers plus their exact-file fixture guard were
removed.

## Real PostgreSQL evidence

The focused integration proves:

- equal concurrent project commands return one `created` and one `replayed`;
- the same key with changed payload returns `idempotency_conflict`;
- concurrent duplicate names return a typed duplicate outcome;
- concurrent different projects preserve both normalized grants;
- replay of a completed graph save is refused after file authority occupies
  the Canvas;
- concurrent graph and file-authority claims produce exactly one owner.

## No compatibility or debt

No preference subsystem, compatibility parser, migration-state branch, fake
adapter, stub, TODO or disabled quality rule was introduced. Unsupported graph
formats fail closed. Historical delivery documents remain Git history; current
architecture and mandatory ARC evidence are the only maintained human views.
