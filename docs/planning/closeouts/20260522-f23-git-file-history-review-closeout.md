---
title: F-23 Git file history review closeout
status: Accepted
owner: Frontend / API / Architecture
last_reviewed: 2026-05-22
planning_type: closeout
---

# F-23 Git File History Review Closeout

## Governing Sources

- `docs/planning/status/governance-document-rule-inventory.md`
- `AGENTS.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/components/web/git/git-mode-architecture.md`
- `docs/architecture/components/web/main-workspace-views-and-ux.md`
- `docs/planning/proposals/mandatory/frontend-and-ux/f23-git-file-history-review-plan-20260522.md`
- `docs/architecture/components/web/git/git-file-history-review-user-stories.md`

## Work Performed

F-23 adds a governed, file-scoped Git history read path without adding a Git
management surface. `Code` can now show recent history for the selected
workspace file in the existing right workbench slot, and each history entry
hands revision review to the existing `Diff` route.

The protected runtime API now exposes the `GetWorkspaceFileHistory` query rail:

- DDD read model: `WorkspaceFileHistory`
- Application port: `IWorkspaceFileHistoryRepository`
- Use case: `ListWorkspaceFileHistoryUseCase`
- Adapter surface: `GET /workspace/file-history/:path`
- Authorization: tenant/project/environment scope plus `workspace:files:view`
- Negative behavior: unauthenticated, missing scope, invalid path, and missing
  Git history cases are explicit.

## Current Flow

```mermaid
flowchart LR
  Code["Code route"] --> File["Selected workspace file"]
  File --> Query["GetWorkspaceFileHistory"]
  Query --> Adapter["Local Git history adapter"]
  Adapter --> Panel["Code right-panel history"]
  Panel --> Diff["Diff route"]
```

## Validation Evidence

- Planning query cleanup:
  `node --test scripts/planning-db-query.test.cjs` passed with 66 tests.
- Feature mechanization:
  `pnpm docs:feature-mechanization -- --feature F23-GIT-FILE-HISTORY-REVIEW-20260522` passed.
- Implementation mechanization:
  `pnpm docs:feature-mechanization:implementation -- --feature F23-GIT-FILE-HISTORY-REVIEW-20260522` passed.
- API red/green gate:
  `pnpm exec vitest run --config vitest.config.ts test/entrypoints/http/workspaceFileHistoryRoutes.test.ts test/architecture/workspaceFileHistoryQueryRail.architecture.test.ts test/entrypoints/http/registerProtectedRuntimeRoutes.test.ts` passed with 3 files and 9 tests.
- Web adapter gate:
  `pnpm exec vitest run --config vitest.unit.config.ts src/app/services/workspace/workspacePorts.api.test.ts` passed with 1 file and 9 tests.
- Code route gate:
  `pnpm exec vitest run --config vitest.config.ts src/app/views/CodeView.test.tsx` passed with 1 file and 5 tests.
- Web lint:
  `pnpm lint` in `apps/web` passed.
- API architecture:
  `pnpm test:arch` in `apps/api` passed.
- Web type-check:
  `pnpm typecheck` in `apps/web` passed.
- API type-check:
  `pnpm typecheck` in `apps/api` passed.

## ADR Decision

No new ADR is required. The slice adds a narrow protected runtime query rail and
reuses the existing workspace file authorization model and `Diff` workbench for
comparison intent. It does not change contracts packages, engine behavior,
adapter package contracts, persistence schema, or external product workflow
policy.

## No-Debt And No-Stub Evidence

- No staging, commit, branch, conflict, or repository-management UI was added.
- No package contract, engine, planner, or adapter package was changed, so ARC-2
  evidence/risk files are not triggered.
- No fake adapter, fake success path, TODO, FIXME, placeholder, or unfinished
  branch was added for this slice.
- No lint, type, test, docs, governance, or hook rule was disabled or relaxed.
