---
title: Monaco Bundle Isolation User Stories
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
component: Monaco bundle isolation
---

# Monaco Bundle Isolation User Stories

| ID          | Actor               | Scenario                                                  | Acceptance                                                                |
| ----------- | ------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------- |
| US-F17E-001 | Frontend maintainer | Monaco dependency is present in the web build.            | Vite places Monaco dependency ids in `monaco-vendor`.                     |
| US-F17E-002 | Frontend maintainer | Terminal dependency is present in the web build.          | Vite still places `@xterm` ids in `terminal-vendor`.                      |
| US-F17E-003 | Operator            | Opens a non-Monaco route.                                 | Route modules do not eagerly import `@monaco-editor/react`.               |
| US-F17E-004 | Reviewer            | Opens Code, Diff, Artifacts, or Templates Monaco surface. | The route reaches Monaco through a lazy gateway and owned surface module. |
| US-F17E-005 | Maintainer          | Adds a new route workbench.                               | Architecture guard fails if the route imports Monaco vendor directly.     |

## Test Matrix

| Scenario                                                    | Test                                         |
| ----------------------------------------------------------- | -------------------------------------------- |
| Monaco and terminal chunk names stay explicit               | `monacoBundleIsolation.architecture.test.ts` |
| Vite config delegates to the pure resolver                  | `monacoBundleIsolation.architecture.test.ts` |
| Lazy gateway and surface-only import boundaries hold        | `monacoBundleIsolation.architecture.test.ts` |
| Changed Monaco/config files route to the Monaco focus suite | `vitestSuites.architecture.test.ts`          |
