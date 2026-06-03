---
title: F-18 Live Log Console Closeout
status: Accepted
owner: Frontend / UX
last_reviewed: 2026-05-22
planning_type: closeout
task_ids:
  - F-18
---

# F-18 Live Log Console Closeout

## Scope

This closeout accepts `F-18`. The shell bottom console now acts as a live
run-event companion instead of a placeholder API-mode console message.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/components/web/appshell/app-shell.md`
- `docs/architecture/components/web/runs/run-event-timeline-component.md`
- `docs/architecture/components/web/runs/frontend-runtime-contract-technical-manual.md`

## Accepted Behavior

- `useConsoleLogStream` consumes the active run event stream through the Runs
  query rail.
- `BottomConsoleDrawer` exposes explicit idle, loading, and streaming states.
- `XtermConsole` is the accepted terminal-grade shell companion renderer.
- Console lines and the Runs timeline share ordering, dedupe, cursor, polling,
  headline, detail, level, and step identity semantics.
- The idle state no longer claims live log streaming is unavailable.

## Evidence

- `apps/web/src/app/components/console/useConsoleLogStream.ts`
- `apps/web/src/app/components/console/XtermConsole.tsx`
- `apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts`
- `apps/web/src/app/views/runs/runsDomainBoundary.architecture.test.ts`
- `docs/architecture/components/web/appshell/app-shell.md`
- `docs/architecture/components/web/runs/run-event-timeline-component.md`

## Validation

- `pnpm --filter @dvt/web test -- src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx`
- `pnpm --filter @dvt/web test -- src/app/views/runs/runsDomainBoundary.architecture.test.ts src/app/components/shell/bottomConsoleDrawerModel.test.ts src/app/components/Console.test.tsx`

## Debt And Stub Evidence

No debt was introduced. No hook or quality gate was bypassed. No stub,
placeholder, fake stream, or fake success path was added.
