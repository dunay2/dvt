# Spanish Content in Documentation

This file tracks the current `planning` documents that `pnpm docs:quality:check` still flags as likely non-English as of 2026-03-07.

The check is heuristic. Some files are fully or mostly in English and are only flagged because they still contain a few Spanish words, headings, or historical notes.

## Decision Rules

- `Translate in place`: keep the document active and convert the remaining Spanish content to English.
- `Archive or remove alias`: do not spend time translating first; either archive the document or remove the non-canonical file in favor of the canonical English version.
- `Consolidate first`: decide the canonical document before translating.
- `Temporary exception`: allow Spanish for now because the document is part of a live working session; revisit once the session closes.

Current open warnings in `planning`: 0.

## Resolved In This Branch

| Path                                                                            | Resolution                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `docs/planning/Definir el Consumidor del Outbox.md`                             | Removed. Readers now use the canonical file `Define-the-Outbox-Consumer.en.md` directly.                            |
| `docs/planning/ENGINE_DVT_ESPEC_CHECKLIST_ESTADO.md`                            | Removed. Readers now use the canonical file `ENGINE_DVT_SPEC_CHECKLIST_STATUS.en.md` directly.                      |
| `docs/planning/pending-release-please-continuous.md`                            | Rewritten in English and removed from the warning queue.                                                            |
| `docs/planning/pending-golden-path-coverage-debt.md`                            | Rewritten in English and removed from the warning queue.                                                            |
| `docs/planning/CHANGE_IMPACT_ADR0030_20260304.md`                               | Moved to `docs/archive/CHANGE_IMPACT_ADR0030_20260304.md` as historical documentation.                              |
| `docs/planning/CI_CD_ROLLBACK_PLAN_20260228.md`                                 | Moved to `docs/archive/CI_CD_ROLLBACK_PLAN_20260228.md` as historical documentation.                                |
| `docs/planning/HITO_0_ESTABILIZACION_INMEDIATA_PLAN.md`                         | Moved to `docs/archive/HITO_0_ESTABILIZACION_INMEDIATA_PLAN.md` as historical documentation.                        |
| `docs/planning/reviews/PR_301_RELAUNCH_BATCH_PLAN_20260228.md`                  | Moved to `docs/archive/PR_301_RELAUNCH_BATCH_PLAN_20260228.md` as historical documentation.                         |
| `docs/planning/reviews/PR_313_STABILIZATION_EXECUTION_REPORT_20260228.md`       | Moved to `docs/archive/PR_313_STABILIZATION_EXECUTION_REPORT_20260228.md` as historical documentation.              |
| `docs/planning/reviews/WF_REDUNDANCY_SIMPLIFICATION_PASS1_20260228.md`          | Moved to `docs/archive/WF_REDUNDANCY_SIMPLIFICATION_PASS1_20260228.md` as historical documentation.                 |
| `docs/planning/DVT_REMEDIATION_PLAN.md`                                         | Moved to `docs/archive/DVT_REMEDIATION_PLAN.md` because the active remediation plan is already canonical elsewhere. |
| `docs/planning/proposals/github-open-issues-1-144.md`                           | Removed. This working extract was discarded as non-canonical planning noise.                                        |
| `docs/planning/proposals/github-open-issues.md`                                 | Removed. This working extract was discarded as non-canonical planning noise.                                        |
| `docs/planning/DVT_engine_remediation_ai_plan.md`                               | English status table cleanup removed the remaining warning markers.                                                 |
| `docs/planning/engine-gap-to-target-migration-plan.md`                          | Rewritten in English and cleaned up duplicate frontmatter.                                                          |
| `docs/planning/execution-model/execution-state.md`                              | Rewritten in English and cleaned up duplicate frontmatter.                                                          |
| `docs/planning/execution-model/handbook-state.md`                               | Rewritten in English and cleaned up duplicate frontmatter.                                                          |
| `docs/planning/gaps/G3-TASK-SPECIFICATION.md`                                   | Residual false-positive wording cleaned up in place.                                                                |
| `docs/planning/reviews/DVT+_Architectural_Review_Pass_2.md`                     | Residual Spanish roadmap section translated in place.                                                               |
| `docs/planning/reviews/DVT_ARCH_REVIEW_CONSOLIDATED_20260305.md`                | Residual Spanish effort labels and roadmap text translated in place.                                                |
| `docs/planning/proposals/documentation-restructuring-diagnostic-and-roadmap.md` | Rewritten in English; the last temporary warning in `planning` is now closed.                                       |
| `docs/planning/archive/proposals/frontend-plan-back-alignment.md`               | Rewritten as an English archive digest after canonical integration.                                                 |
| `docs/planning/archive/proposals/frontend-sprint-tasks-and-risks.md`            | Rewritten as an English archive digest after canonical integration.                                                 |
| `docs/planning/archive/architecture/frontend-plugin-architecture-v1-hybrid.md`  | Rewritten as an English archive digest after canonical integration.                                                 |
| `docs/planning/archive/architecture/frontend-dialect-codegen-boundary.md`       | Rewritten as an English archive digest after canonical integration.                                                 |
| `docs/planning/archive/architecture/plugin-developer-guide-v1.md`               | Rewritten as an English archive digest after canonical integration.                                                 |
| `docs/planning/archive/architecture/api-prototype-evaluation.md`                | Rewritten as an English archive digest after canonical integration.                                                 |

## Current Queue

No active `planning` documents remain in the language queue.

## Suggested Execution Order

1. Keep this file updated only if new `planning` warnings appear in future checks.
