---
slice: F-02
date: 2026-03-31
lane: E
author: AI (Codex)
---

# Closeout: F-02 - platform-health capability refactor

## Governing sources

- `docs/planning/proposals/frontend-roadmap-20260219.md`
- `docs/architecture/frontend/planning/frontend-planning-capability-architecture.md`
- `docs/planning/state/agent-lane-e.yaml`
- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`

## Changes made

| File or path                                                                                    | Change                                                                                                                      | Why                                                                                                         |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/web/src/capabilities/platform-health/**`                                                  | New capability module with `contracts`, `domain`, `application`, `infrastructure`, and `presentation` layers                | Replaces the legacy ad hoc service/query split with a Fowler-style capability boundary                      |
| `apps/web/src/capabilities/platform-health/testing/**`                                          | Added shared fixtures and HTTP harness helpers for domain, application, presentation, and infrastructure tests              | Removes repeated ad hoc snapshots/responses and makes the capability test seams explicit                    |
| `apps/web/src/capabilities/platform-health/infrastructure/httpPlatformHealthClient.ts`          | Optional probes now preserve HTTP status on infrastructure failures and surface non-OK HTTP responses as typed probe errors | Restores operational diagnostics and keeps degraded states inspectable instead of collapsing to `n/a`       |
| `apps/web/src/capabilities/platform-health/index.ts`                                            | Barrel no longer re-exports infrastructure internals                                                                        | Keeps the public capability boundary narrow and prevents downstream coupling to adapter details             |
| `apps/web/src/app/Root.tsx`                                                                     | Root shell now consumes `usePlatformHealthSnapshotQuery` and `selectPlatformConnectionState` from the capability            | The shell depends on a stable frontend domain API instead of a query helper with leaked transport semantics |
| `apps/web/src/app/views/AdminView.tsx`                                                          | Admin platform diagnostics now read the new snapshot/probe model                                                            | Keeps the diagnostics UI aligned with the capability boundary and explicit endpoint semantics               |
| `apps/web/src/app/plugins/contracts/PluginContext.ts`                                           | Plugin platform state now depends on `PlatformConnectionState` from the capability                                          | Removes a type dependency on the deleted legacy query module                                                |
| `apps/web/src/app/stores/appStore.ts`                                                           | App store now stores the capability connection projection type                                                              | Eliminates duplicate connection-status typing                                                               |
| `apps/web/src/app/services/platform/*` and `apps/web/src/app/queries/usePlatformHealthQuery.ts` | Deleted legacy implementation                                                                                               | No permanent compatibility layer was left behind                                                            |

## Architecture outcome

- Health/platform is now modeled as a dedicated frontend capability instead of a loose service plus query.
- Backend DTOs are isolated under `contracts/`.
- Frontend projection types live under `domain/`.
- HTTP and endpoint-availability semantics live under `infrastructure/`.
- Shared test fixtures and harness utilities live under `testing/`.
- TanStack Query is now a thin presentation wrapper over the capability API.

## Docs synced

- [x] `docs/planning/state/agent-lane-e.yaml` - `F-02` marked done, `F-03` unlocked with partial progress evidence
- [x] `docs/planning/state/execution-workboard.md` - regenerated from lane state
- [x] `docs/planning/state/open-task-route.md` - regenerated from lane state
- [x] `docs/planning/state/agent-lane-e.md` - regenerated from lane state
- [x] `docs/planning/closeouts/index.md` - regenerated via docs sync
- [x] `docs/planning/status/generated-code-state.md` - regenerated after adding/removing frontend source files

## Test evidence

| Command                                  | Result                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/web typecheck`       | PASS                                                                                |
| `pnpm --filter @dvt/web exec vitest run` | PASS - 8 files, 28 tests                                                            |
| `pnpm docs:planning:lanes:generate`      | PASS                                                                                |
| `pnpm docs:workboard:generate`           | PASS                                                                                |
| `pnpm docs:status:generate`              | PASS                                                                                |
| `pnpm docs:sync`                         | PASS                                                                                |
| `pnpm docs:sync:check`                   | FAIL - expected before commit because the command diffs generated docs against HEAD |
| `pnpm verify:prepush`                    | PASS                                                                                |

## Debt introduced

None. This slice closes without stubs, placeholders, TODO markers, or compatibility shims.

## Residual follow-up

- `F-03` remains open for the global degraded/offline banner and retry/backoff behavior.
- `useCapabilitiesQuery` still uses direct `fetch` and is not yet aligned to the capability-module pattern introduced here.
