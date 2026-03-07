---
title: Architecture Documentation Consolidation Matrix (2026-03-07)
status: Completed
owner: docs
last_reviewed: 2026-03-07
planning_type: review
---

# Architecture Documentation Consolidation Matrix (2026-03-07)

## Purpose

Reduce overlap between architecture, status, planning, and knowledge documents by assigning each one a single primary role.

## Execution Summary

The consolidation defined in this review was executed on 2026-03-07:

1. The atlas pack moved from `docs/planning/dvt_architecture_atlas_pack/` to `docs/architecture/atlas/`.
2. `docs/planning/execution-model/dvt-architecture-handbook.md` was archived as `docs/archive/DVT_ARCHITECTURE_HANDBOOK_20260307.md`.
3. `docs/planning/execution-model/dvt-system-map-god-status.md` was archived as `docs/archive/DVT_SYSTEM_MAP_GOD_STATUS_20260307.md`.
4. Atlas-local roadmap and decision-note copies were removed so planning and ADR ownership stay canonical.

## Decision Matrix

| Document                                                                  | Primary role today                               | Main overlap                                                                                                       | Decision | Rationale                                                                                                                        | Next action                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `docs/architecture/atlas/architecture/architecture_atlas.md`              | Code-aligned architecture snapshot               | `docs/architecture/system-delivery-status.md`, `docs/archive/DVT_SYSTEM_MAP_GOD_STATUS_20260307.md`                | Maintain | Useful as a navigable onboarding snapshot with topology, lifecycle, and implemented limits.                                      | Keep under `docs/architecture/atlas/` and avoid turning it into the canonical status board. |
| `docs/architecture/system-delivery-status.md`                             | Cross-system implementation status board         | `docs/architecture/atlas/architecture/architecture_atlas.md`, `docs/archive/DVT_SYSTEM_MAP_GOD_STATUS_20260307.md` | Maintain | Best fit for a canonical "what is implemented vs partial vs missing" document.                                                   | Treat this as the primary delivery-status document and keep major status deltas here.       |
| `docs/archive/DVT_SYSTEM_MAP_GOD_STATUS_20260307.md`                      | Historical review snapshot with recommendations  | `docs/architecture/system-delivery-status.md`, `docs/architecture/atlas/architecture/architecture_atlas.md`        | Archived | Heavy overlap, review-style narrative, encoding noise, and lower navigability than the two documents above.                      | Keep as historical analysis only.                                                           |
| `docs/archive/DVT_ARCHITECTURE_HANDBOOK_20260307.md`                      | Historical architecture handbook                 | `docs/architecture/reference-architecture.md`, `docs/architecture/engine/`, ADRs                                   | Archived | It contained useful principles and diagrams, but it competed with canonical architecture references while living under planning. | Keep as historical context only.                                                            |
| `docs/knowledge/REPOSITORY_MAP.md`                                        | Repository map and code entry points             | `docs/architecture/atlas/architecture/architecture_atlas.md`                                                       | Maintain | Low-risk overlap: it maps code structure rather than architecture status.                                                        | Keep as a knowledge/onboarding document.                                                    |
| `docs/architecture/atlas/status/code_completion_assessment_2026-03-06.md` | Quantified completion snapshot with effort model | `docs/architecture/system-delivery-status.md`, roadmap docs                                                        | Maintain | Distinct value: it adds percentages and effort estimates, not just status labels.                                                | Keep as a dated snapshot; refresh only when a new assessment is intentionally produced.     |
| `docs/adr/*.md`                                                           | Canonical architectural decisions                | Atlas notes and planning-handbook decisions                                                                        | Maintain | This is the normative decision space and must not be duplicated elsewhere.                                                       | Keep ADR IDs unique globally and move any competing decision text here or archive it.       |

## Canonical Role Assignment

- `docs/adr/`: normative architectural decisions
- `docs/architecture/`: canonical architecture references and code-aligned system views
- `docs/planning/gaps/`: active execution tracking and delivery sequencing
- `docs/planning/reviews/`: dated analysis and review artifacts
- `docs/knowledge/`: onboarding maps and repository navigation
- `docs/architecture/atlas/`: curated, navigable snapshot pack for onboarding and code-aligned reading

## Recommended Consolidation Order

1. Keep `docs/architecture/reference-architecture.md` aligned with any future handbook-level principle changes.
2. Keep `docs/architecture/system-delivery-status.md` as the canonical delivery-status board.
3. Keep the atlas focused on navigation, topology, and code-aligned snapshots, not active governance.
4. Archive any future duplicate roadmap or decision copies instead of adding a second canonical path.
