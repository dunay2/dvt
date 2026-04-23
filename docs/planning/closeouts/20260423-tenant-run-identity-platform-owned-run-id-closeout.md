---
title: Closeout - Tenant/run identity platform-owned run id
status: Review
owner: Architecture / API / Runtime / Frontend
last_reviewed: 2026-04-23
planning_type: closeout
slice: tenant-run-identity-platform-owned-run-id
---

# Closeout: Tenant/run identity platform-owned run id

## Think-First Analysis

### Problem summary

The start-run flow allowed the browser to mint `run_ui_${Date.now()}` and send
that value to `POST /runs/start` as canonical run identity.

That was architecturally wrong for a protected runtime boundary because
`runId` is not a display-only token. It flows into canonical runtime identity,
duplicate checks, event ordering, snapshots, and adapter run references.

### Root cause

The internal `StartRunCommand` requires `runId`, and the API route had leaked
that internal requirement directly into the external HTTP contract.

The web `runsService` also mirrored a runtime-shaped `RunContext`, so the UI
was allowed to author execution identity instead of sending only caller-owned
start-run inputs.

### Constraints and invariants

- preserve `runId` inside the internal API-to-runtime command boundary
- preserve existing engine, event, snapshot, and adapter use of concrete
  `runId`
- reject client-provided `runId` explicitly rather than ignoring it
- keep the UI on the caller side of the boundary
- avoid contract-package churn for this slice because the internal command still
  needs `runId`

### Selected option

Adopt `ADR-0050` and make `runId` platform-owned at `apps/api` start-run
parsing time.

The API now generates `runId`, rejects any incoming `runId` field, and passes
the generated value into the existing internal `StartRunCommand`.

The generator emits `run_<UUIDv7>` ids. This keeps the API boundary responsible
for collision-resistant, time-local identity allocation while explicitly
leaving retry/idempotency, lifecycle transitions, recovery, and provider
workflow semantics in the runtime/application layers.

The web start-run boundary now sends only:

- `planRef`
- `workspaceScope`
- `selection`

## Implementation summary

- Added `apps/api/src/entrypoints/http/startRunIdentity.ts` with the
  platform-owned `run_<UUIDv7>` run-id generator.
- Threaded the generator through `startRunRoute` and `parseStartRunBody`.
- Changed `parseStartRunCommand` so `POST /runs/start`:
  - rejects client-provided `runId` with `client_run_id_not_allowed`
  - generates platform-owned `runId`
  - preserves the existing internal `StartRunCommand` shape
- Updated start-run route/parser tests to cover generated ids and forbidden
  client ids.
- Changed web `StartRunInput` from runtime context shape to caller-owned
  `planRef + workspaceScope + selection`.
- Flattened `runsService.api` `/runs/start` payload mapping around caller-owned
  `StartRunInput`.
- Changed the canvas run-start action to derive selection from the persisted
  plan and use workspace scope snapshot as part of `StartRunInput`.
- Removed `run_ui_*` execution-id minting from the canvas run-start path and
  changed preview-only context generation to the non-authoritative
  `preview_context` marker.
- Updated the mock runs service and affected web tests to the new caller-owned
  start-run payload.
- Kept the start-run route signature below CodeScene's function-argument
  threshold by replacing positional adapter/generator seams with a single
  dependency object.
- Refactored protected-runtime payload and bootstrap helpers in `app.test.ts`
  so the start-run request-shape change did not leave duplicated large test
  bodies.
- Added `ADR-0050` and the governed proposal for this slice.
- Added generated ADR index coverage through `docs:sync` without modifying the
  legacy non-kebab-case ADR catalog.
- Updated the frontend/backend runtime contract doc so `POST /runs/start`
  reflects caller-owned `StartRunInput` and API-owned `runId`.
- Added Fowler analysis in the branch mailbox and linked the remediated
  architecture from the system review.
- Added a local web component guide for the start-run client identity boundary
  with public API, invariants, transitions, consumers, and diagrams.
- Rewrote the active web identity guide around the positive
  `StartRunInput = planRef + workspaceScope + selection` contract instead of
  carrying retired implementation-pattern prohibitions.
- Updated the API start-run HTTP entrypoint component guide with the
  platform-owned identity seam and rejection invariant.
- Added a dedicated API platform identity component guide so
  `startRunIdentity.ts` has its own public API, invariants, transitions,
  consumers, and semantic fitness rules instead of being documented only as a
  sub-bullet of the HTTP entrypoint.
- Extracted `canvasRunSelection.ts` so plan-node selection is a semantic seam
  instead of hidden logic inside start-run orchestration.
- Added semantic architecture tests for API and web identity ownership.
- Migrated the default API generator away from unstructured UUIDv4 output to
  `run_<UUIDv7>`, and extended the API architecture test to prove the allocator
  stays out of engine, persistence, adapter, and facade semantics.

## Files and systems affected

- API route/parsing:
  - `apps/api/src/entrypoints/http/startRunIdentity.ts`
  - `apps/api/src/entrypoints/http/startRunRoute.ts`
  - `apps/api/src/entrypoints/http/startRunRouteParser.ts`
  - `apps/api/src/entrypoints/http/startRunRouteCommandBuilder.ts`
  - `apps/api/src/entrypoints/http/httpErrorReasonCatalog.ts`
  - `apps/api/src/app.ts`
  - `apps/api/docs/start-run-http-entrypoint-component.md`
  - `apps/api/docs/start-run-platform-identity-component.md`
- API route tests:
  - `apps/api/test/entrypoints/http/startRunIdentity.architecture.test.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.test.support.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.authAndSuccess.test.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.validation.test.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts`
  - `apps/api/test/entrypoints/http/startRunRoute.facadeResultTranslation.test.ts`
  - `apps/api/test/entrypoints/http/planRouteParserHelpers.test.ts`
  - `apps/api/test/app.test.ts`
- Web run-start boundary:
  - `apps/web/src/app/ports/runs.ts`
  - `apps/web/src/app/services/runs/runsService.api.ts`
  - `apps/web/src/app/services/runs/runsService.mock.ts`
  - `apps/web/src/app/views/canvas/canvasRunStartAction.ts`
  - `apps/web/src/app/views/canvas/canvasRunSelection.ts`
  - `apps/web/src/app/views/canvas/canvasPlanAction.ts`
  - `apps/web/src/app/plugins/contracts/PluginServices.ts`
- Web tests:
  - `apps/web/src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts`
  - `apps/web/src/app/services/runs/runsService.test.ts`
  - `apps/web/src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx`
  - `apps/web/src/app/views/runs/useRunWorkspace.test.tsx`
  - `apps/web/src/app/views/canvas/useCanvasController.test.serviceDefaults.ts`
- Governed docs:
  - `docs/adr/adr-0050-platform-owned-start-run-identity.md`
  - `docs/adr/ADR-Index.md`
  - `docs/architecture/components/web/runs/frontend-backend-mvp-contract.md`
  - `docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md`
  - `docs/architecture/components/web/runs/start-run-client-identity-boundary.md`
  - `docs/architecture/components/api/api-current-to-target-architecture.md`
  - `docs/planning/proposals/mandatory/runtime-and-contracts/tenant-run-identity-platform-owned-run-id-plan-20260423.md`
  - `docs/planning/closeouts/20260423-tenant-run-identity-platform-owned-run-id-closeout.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - `buzon/20260423-codex-fowler-tenant-run-identity-analysis-and-remediation.md`

## Validation run

- `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/startRunRoute.authAndSuccess.test.ts test/entrypoints/http/startRunRoute.validation.test.ts test/entrypoints/http/startRunRoute.planSourcePolicy.test.ts test/entrypoints/http/planRouteParserHelpers.test.ts test/entrypoints/http/startRunRoute.engineErrorTranslation.test.ts test/entrypoints/http/startRunRoute.facadeResultTranslation.test.ts`
- `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/entrypoints/http/startRunIdentity.architecture.test.ts`
- `pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/app.test.ts`
- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/services/runs/runsService.test.ts src/app/views/canvas/useCanvasExecutionActions.runStart.test.tsx src/app/views/runs/useRunWorkspace.test.tsx`
- `pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts`
- `pnpm --filter dvt-api typecheck`
- `pnpm --filter @dvt/web typecheck`
- `pnpm docs:status:generate`
- `pnpm docs:planning:lanes:generate`
- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-debt evidence

- no new debt record introduced
- no lint/type/test rule was relaxed
- no hooks were bypassed
- no contract or runtime behavior was faked to simulate platform-owned ids
- no API retry, dedupe, lifecycle, or provider workflow behavior was added
  under the identity allocator

## No-stub evidence

- no placeholder route behavior was added
- no fake success path was added for missing `runId`
- no TODO/FIXME marker was introduced to defer the identity boundary
