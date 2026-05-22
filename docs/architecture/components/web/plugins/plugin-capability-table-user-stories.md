---
title: Plugin Capability Table User Stories
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
component: Plugin capability table
---

# Plugin Capability Table User Stories

| ID             | Actor               | Scenario                                | Acceptance                                                                    |
| -------------- | ------------------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| US-F25-PCT-001 | Operator            | Searches plugin declarations.           | The catalog filters by plugin name, id, capability, backend id, or kind.      |
| US-F25-PCT-002 | Operator            | Reviews blocked backend-backed plugins. | Backend-state filter can show only blocked plugins and keeps reasons visible. |
| US-F25-PCT-003 | Frontend maintainer | Adds a new static plugin contribution.  | The plugin appears in the table without adding route-local card chrome.       |
| US-F25-PCT-004 | Plugin author       | Checks what the shell can execute.      | Detail shows declared, frontend, backend, and executable readiness states.    |

## Test Matrix

| Scenario                                    | Test                                          |
| ------------------------------------------- | --------------------------------------------- |
| Search and backend-state filters work       | `PluginsView.test.tsx`                        |
| Blocked backend reason stays visible        | `PluginsView.test.tsx`                        |
| Dense table stays behind component boundary | `pluginsCapabilityTable.architecture.test.ts` |
