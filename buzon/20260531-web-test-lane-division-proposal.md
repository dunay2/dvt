# Web Test Lane Division Proposal

Status: Implemented first slice  
Owner: Frontend / CI  
Date: 2026-05-31  
Branch: `feat/web-test-lanes-proposal`

## Purpose

Split `@dvt/web` tests so changed-file routing can avoid broad unit or presentation coverage when the changed area is a bounded frontend feature surface.

## Fowler Signals

| Signal | Finding | Fix |
| --- | --- | --- |
| Feedback-loop drag | Workspace service changes previously fell back to the broad `unit` lane. | Add a `workspace-services` focus lane. |
| Boundary drift | Routing must not move into GitHub Actions YAML. | Keep routing in `WebVitestChangedSuiteRouter`. |
| Duplicate semantics | Suite config, package scripts, and routing can drift. | Add architecture guards over catalog, scripts, config, and routing. |

## Implemented Slice

The first slice is `workspace-services`.

Implemented surfaces:

- `apps/web/vitest.workspace-services.config.ts`
- `apps/web/package.json`
- `apps/web/vitest.suites.ts`
- `apps/web/src/testing/workspaceServicesVitestLane.architecture.test.ts`
- `docs/architecture/components/web/web-vitest-changed-suite-router-component.md`

## Behavior

- `src/app/services/workspace/**` source changes route to `workspace-services`.
- `src/app/services/workspace/**/*.test.*` changes keep exact-file execution under the workspace-services config.
- Non-workspace service changes still fall back to the previous broad lane, for example `unit`.
- CI workflow YAML still delegates to `test:web:changed`; no route logic was duplicated in GitHub Actions.

## Validation Commands

Recommended checks:

```text
pnpm --filter @dvt/web test -- src/testing/workspaceServicesVitestLane.architecture.test.ts
pnpm --filter @dvt/web test -- src/testing/vitestSuites.architecture.test.ts
pnpm --filter @dvt/web test:workspace-services
pnpm test:web:changed -- --files apps/web/src/app/services/workspace/workspacePorts.api.ts
```

## Remaining Work

The next safe slices are:

1. `plugins`
2. `admin`
3. `shell`
4. `artifacts-diff`
5. `templates`
6. `runs-lineage-cost`

Do not add all lanes in one PR. Add one lane, guard it, and verify that the router still remains the single source of changed-file truth.
