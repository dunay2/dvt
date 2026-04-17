---
title: Root-local doc triage
status: Active
owner: Frontend / API / Docs
last_reviewed: 2026-04-17
planning_type: status
---

# Root-local doc triage

This document records the canonicalization decisions for root-local markdown
files that had started to compete with the repo docs surface.

The focus for this slice is:

- `apps/web/*.md`
- `infra/prototypes/api/*.md`

Use this page with:

- [web component](../../architecture/components/web/index.md)
- [Repository Map](../../concepts/repository-map.md)
- [Canonical Doc Code Matrix](./canonical-doc-code-matrix.md)
- [Planning Archive](../archive/index.md)

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/DOCS_README.md`
- `docs/guides/documentation-maintenance-guide-20260407.md`
- `docs/architecture/components/web/index.md`
- `docs/planning/proposals/nice-to-have/frontend-and-ux/frontend-roadmap-20260219.md`

## Classification Rule

- `prohowte`: extract an active canonical doc into `docs/` and remove the local
  root copy from the primary reader path
- `retain-local`: keep the file local because it is package-maintainer or
  operational context, but make sure it does not behave as a parallel docs root
- `archive`: move the historical, superseded, or draft-only note into
  `docs/planning/archive/`

## Summary

- Files reviewed: `12`
- `prohowte`: `1`
- `retain-local`: `3`
- `archive`: `8`

The main conclusion is simple:

- `apps/web` keeps a local package `README` and attribution file only
- active frontend guidance now starts in `docs/`
- local proposal and design packs moved to archive instead of remaining on the
  active reader path

## Inventory

<!-- markdownlint-disable MD060 -->

| Artifact                                            | Current role                    | Classification | Target home                                                                    | Reason                                                                           |
| --------------------------------------------------- | ------------------------------- | -------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/web/README.md`                                | package entrypoint              | `retain-local` | keep local with canonical-reading note                                         | useful package orientation, but it must route readers into `docs/`               |
| `apps/web/ATTRIBUTIONS.md`                          | package-local license inventory | `retain-local` | keep local                                                                     | local attribution file, not a planning or architecture authority                 |
| `apps/web/PLUGIN_DEVELOPER_GUIDE.md`                | local active authoring guide    | `prohowte`     | `docs/architecture/components/web/plugin-contributions-developer-guide.md`     | still useful, but should exist as a canonical guide instead of a root-local note |
| `apps/web/CANVAS_PANEL_REFACTOR_PLAN.md`            | local execution proposal        | `archive`      | `docs/planning/archive/proposals/canvas-ux-refactor-execution-plan.md`         | historical slice proposal superseded by current canvas architecture docs         |
| `apps/web/DOCUMENTATION_INDEX.md`                   | local docs-root index           | `archive`      | `docs/planning/archive/proposals/web-local-documentation-index.md`             | local doc pack must not remain the active frontend entry surface                 |
| `apps/web/DVT_FRONTEND_DIALECT_CODEGEN_BOUNDARY.md` | local boundary proposal         | `archive`      | `docs/planning/archive/architecture/frontend-dialect-codegen-boundary.md`      | historical rationale superseded by canonical frontend-planning and runtime docs  |
| `apps/web/DVT_FRONTEND_PLUGIN_ARCHITECTURE.md`      | local plugin design proposal    | `archive`      | `docs/planning/archive/architecture/frontend-plugin-architecture-v1-hybrid.md` | proposal detail remains useful historically, but not as active authority         |
| `apps/web/DVT_GRAPH_CANVAS_UX_OPTIMIZATION.md`      | local canvas UX note            | `archive`      | `docs/planning/archive/architecture/graph-canvas-ux-optimization.md`           | superseded by current canvas architecture and modernization review               |
| `apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md`          | local frontend roadmap          | `archive`      | `docs/planning/archive/proposals/frontend-plan-back-alignment.md`              | active reader route now lives in canonical roadmap and contract docs             |
| `apps/web/FRONTEND_SPRINT_PLAN_TASKS_RISKS.md`      | local sprint plan               | `archive`      | `docs/planning/archive/proposals/frontend-sprint-tasks-and-risks.md`           | lane YAML and canonical roadmap now own active sequencing                        |
| `infra/prototypes/api/README.md`                    | prototype workspace pointer     | `retain-local` | keep local with archive pointer                                                | local workspace note is acceptable if it points to the archived evaluation       |
| `infra/prototypes/api/valoracion.md`                | undated prototype evaluation    | `archive`      | `docs/planning/archive/architecture/api-prototype-evaluation.md`               | historical prototype assessment should not live as a root-local note             |

<!-- markdownlint-enable MD060 -->

## Target State

After this cleanup, the frontend and prototype reader routes should be:

1. `docs/architecture/components/web/index.md`
2. `docs/architecture/components/web/plugin-contributions-developer-guide.md`
3. `docs/planning/proposals/nice-to-have/frontend-and-ux/frontend-roadmap-20260219.md`
4. `docs/planning/status/canonical-doc-code-matrix.md`
5. `docs/planning/archive/index.md` for historical local notes

Package-local markdown may remain only when it is clearly non-canonical and
does not recreate a second architecture or planning surface.
