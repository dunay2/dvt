---
title: Execution Template Monaco Preview User Stories
status: Accepted
date: 2026-05-22
last_reviewed: 2026-05-22
owners:
  - apps/web
component: Templates workbench
---

# Execution Template Monaco Preview User Stories

| Story ID      | User               | Goal                                         | Acceptance Criteria                                                          |
| ------------- | ------------------ | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `US-F17D-001` | Analytics engineer | Review generated SQL with editor ergonomics. | A ready Snowflake task preview renders in read-only Monaco.                  |
| `US-F17D-002` | Operator           | Understand why preview is unavailable.       | Missing required parameters show blocked state and field-level messages.     |
| `US-F17D-003` | Maintainer         | Keep Templates route-owned.                  | Architecture guard proves route and workbench do not import Monaco directly. |
| `US-F17D-004` | Maintainer         | Reuse shared Monaco gateway.                 | Templates delegates ready preview to `MonacoCodeViewer`.                     |
| `US-F17D-005` | Product reviewer   | Avoid fake commands.                         | Preview has no save, apply, dispatch, or export command in this slice.       |

## Scenario Matrix

| Scenario                 | State   | Expected UX                                       | Guard                                         |
| ------------------------ | ------- | ------------------------------------------------- | --------------------------------------------- |
| Required fields missing  | blocked | Validation state only, no Monaco viewer.          | `TemplatesView.test.tsx`                      |
| Required fields complete | ready   | Monaco read-only preview with deterministic text. | `TemplateMonacoPreviewPanel.test.tsx`         |
| Route ownership drift    | n/a     | Route delegates to panel and not editor binding.  | `templatesMonacoPreview.architecture.test.ts` |
| Fake command temptation  | n/a     | No save/export/apply affordance.                  | `templatesMonacoPreview.architecture.test.ts` |

## Boundaries

- Templates previews generated source only.
- The Monaco panel is not an editor.
- Generated source remains local presentation output until backend contracts
  define a persisted template-generation rail.
