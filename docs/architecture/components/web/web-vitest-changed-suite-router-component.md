---
title: Web Vitest Changed Suite Router Component
status: Active
owner: Frontend / CI
last_reviewed: 2026-05-18
planning_type: architecture
---

# Web Vitest Changed Suite Router Component

## Purpose

Own the local query that maps changed `@dvt/web` files to the smallest safe
Vitest suite command.

Owned concern: `WebVitestChangedSuiteRouter` converts file paths into catalog
owned suite commands. It is a local developer and review accelerator; it does
not replace the `Web Frontend Tests` CI lane.

## Public API

<!-- markdownlint-disable MD060 -->

| Surface                             | Type     | Responsibility                                              |
| ----------------------------------- | -------- | ----------------------------------------------------------- |
| `resolveWebVitestChangedSuitePlan`  | function | Maps changed paths to ordered suite names and commands.     |
| `WEB_VITEST_CHANGED_SUITE_COMMANDS` | constant | Names the package-local command for each routed suite.      |
| `test:changed`                      | command  | Runs dependency build once, then routed web suite commands. |
| `test:canvas-unit`                  | command  | Runs Canvas unit-model focus tests.                         |
| `test:canvas-presentation`          | command  | Runs Canvas presentation focus tests.                       |
| `test:canvas-architecture`          | command  | Runs Canvas architecture focus tests.                       |
| `test:web:changed`                  | command  | Root alias for the package-local changed-suite command.     |
| `run-vitest-changed-suites.ts`      | adapter  | Reads Git change sets or explicit `--files` arguments.      |

<!-- markdownlint-enable MD060 -->

## Invariants

- The router never changes primary suite ownership.
- Architecture-governance paths route to `architecture`.
- Canvas-scoped paths route to `canvas-unit`, `canvas-presentation`, or
  `canvas-architecture` when the file type makes that safe.
- Non-Canvas `.tsx` paths route to `presentation`.
- Non-Canvas `.ts` paths route to `unit`.
- If no web-relevant changed file exists, the command exits successfully
  without running a Vitest suite.
- CI still uses `test:web:ci`; the changed-suite command is a local and review
  command.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> ChangedFiles
  ChangedFiles --> GovernedPath: suite catalog/config/docs
  ChangedFiles --> CanvasPath: Canvas route or canvas module
  ChangedFiles --> TsxPath: non-Canvas TSX
  ChangedFiles --> TsPath: non-Canvas TS
  GovernedPath --> ArchitectureCommand
  CanvasPath --> CanvasUnitCommand: .ts
  CanvasPath --> CanvasPresentationCommand: .tsx
  CanvasPath --> CanvasArchitectureCommand: architecture
  TsxPath --> PresentationCommand
  TsPath --> UnitCommand
  ArchitectureCommand --> LocalEvidence
  CanvasUnitCommand --> LocalEvidence
  CanvasPresentationCommand --> LocalEvidence
  CanvasArchitectureCommand --> LocalEvidence
  PresentationCommand --> LocalEvidence
  UnitCommand --> LocalEvidence
```

## Consumers

- Local frontend developers use `pnpm --filter @dvt/web test:changed`.
- Reviewers use `pnpm test:web:changed -- --files <paths>` to validate a patch
  without running the full web suite.
- Architecture tests use the router API to prevent command drift.
- Documentation uses this component to explain local feedback-loop sizing.

## Component Flow

```mermaid
flowchart LR
  Git["Git changed files"] --> Adapter["run-vitest-changed-suites.ts"]
  Args["--files explicit paths"] --> Adapter
  Adapter --> Router["resolveWebVitestChangedSuitePlan"]
  Router --> Catalog["WebVitestSuiteCatalog"]
  Router --> Commands["WEB_VITEST_CHANGED_SUITE_COMMANDS"]
  Commands --> Vitest["Vitest suite delegates"]
```

## Negative Rules

- Do not use this command as the merge-gate replacement for `test:web:ci`.
- Do not add route-local changed-test scripts when the catalog can route them.
- Do not duplicate include/exclude glob semantics in the command adapter.
- Do not make source files under `apps/web/src/testing/**` production services.
