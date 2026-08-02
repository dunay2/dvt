---
title: Monaco Bundle Isolation User Stories
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
component: Monaco bundle isolation
---

# Monaco Bundle Isolation User Stories

| ID          | Actor               | Scenario                                                           | Acceptance                                                                  |
| ----------- | ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| US-F17E-001 | Frontend maintainer | Monaco dependency is present in the web build.                     | Vite places Monaco dependency ids in `monaco-vendor`.                       |
| US-F17E-002 | Frontend maintainer | Terminal dependency is present in the web build.                   | Vite still places `@xterm` ids in `terminal-vendor`.                        |
| US-F17E-003 | Operator            | Opens a surface that does not use Monaco.                          | Consumer modules do not eagerly import `@monaco-editor/react`.              |
| US-F17E-004 | Reviewer            | Opens contextual Code, comparison, artifact, or Templates content. | The surface reaches Monaco through a lazy gateway and owned surface module. |
| US-F17E-005 | Maintainer          | Adds a new Monaco-backed surface.                                  | Architecture guard fails if the consumer imports Monaco vendor directly.    |
| US-F17E-006 | Operator            | Opens Monaco-backed content in local or CI execution.              | Monaco workers load from the web bundle instead of a public CDN.            |

## Test Matrix

| Scenario                                                    | Test                                         |
| ----------------------------------------------------------- | -------------------------------------------- |
| Monaco and terminal chunk names stay explicit               | `monacoBundleIsolation.architecture.test.ts` |
| Vite config delegates to the pure resolver                  | `monacoBundleIsolation.architecture.test.ts` |
| Lazy gateway and surface-only import boundaries hold        | `monacoBundleIsolation.architecture.test.ts` |
| Monaco worker loading stays local to the web bundle         | `monacoBundleIsolation.architecture.test.ts` |
| Changed Monaco/config files route to the Monaco focus suite | `vitestSuites.architecture.test.ts`          |
