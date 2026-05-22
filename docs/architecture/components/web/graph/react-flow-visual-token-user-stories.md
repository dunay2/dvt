---
title: React Flow Visual Token User Stories
status: Active
owner: Web / Canvas
last_reviewed: 2026-05-22
planning_type: architecture
---

# React Flow Visual Token User Stories

| id                      | actor               | story                                                    | acceptance                                                                                                              |
| ----------------------- | ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `US-F24-GRAPH-TOKEN-01` | Frontend maintainer | I want Canvas edge colors to come from one graph palette | `canvasNodeMapper.ts` imports `graphFlowPalette` and owns no edge hex literals.                                         |
| `US-F24-GRAPH-TOKEN-02` | Plugin author       | I want plugin node kinds to reuse named visual tones     | dbt and DVT node-kind catalogs call `resolveGraphNodeKindTone` instead of declaring minimap hex values.                 |
| `US-F24-GRAPH-TOKEN-03` | Reviewer            | I want graph renderer visual drift to fail mechanically  | `graphVisualTokenConvergence.architecture.test.ts` rejects local color-family and hex drift in graph rendering modules. |
