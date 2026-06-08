---
title: Workspace Gap Reports Governed Surface Plan
status: Accepted
date: 2026-06-07
last_reviewed: 2026-06-08
owners:
  - docs
planning_type: mandatory-plan
lane: G
---

# Workspace Gap Reports Governed Surface Plan

## Think-First Analysis

Problem summary: the workspace gap report branch arrived as raw `buzon/`
intake files. The repository retirement guard blocks new intake files because
planning knowledge must be projected from governed docs and Planning DB rails,
not from new mailbox-style markdown.

Root cause: the branch content is useful, but its original storage surface was
retired. Integrating it verbatim would reintroduce `buzon/` as an authority
surface and fail the DB-first closeout gate.

Selected option: keep the report content, move it into governed planning review
surfaces, and declare the moved documents as an implemented documentation
surface. The Planning DB import and docs governance checks can then project and
validate the material through the existing documentation and knowledge rails.

Rejected alternatives:

- Keep the files in `buzon/`. Rejected because `verify:prepush` blocks new
  intake files and the repository already treats raw intake as retired.
- Delete the branch content. Rejected because the reports contain source-grounded
  remediation evidence that should remain reviewable.
- Add a new Planning DB command for this batch. Rejected because this slice only
  relocates documentation into the existing governed docs import path.

## Command And Query Rail Impact

No new command or query rail is introduced. The governed surfaces are consumed
through the existing documentation sync, governance manifest, knowledge import,
and feature mechanization checks.

## Fowler Opportunity Matrix

| Scenario                                            | Opportunity         | Fowler pattern       | DDD owner                  | Command/query rail       | Implementation surfaces                                        | Test expectation                                          | Out of scope                        |
| --------------------------------------------------- | ------------------- | -------------------- | -------------------------- | ------------------------ | -------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| Workspace reports arrive as raw intake              | Hidden authority    | Canonical repository | Planning documentation     | Existing docs import     | `docs/planning/reviews/architecture-and-governance/20260607-*` | `pnpm docs:feature-mechanization:implementation`          | New DB writer for report creation   |
| Report references point back to the retired mailbox | Duplicate authority | Reference correction | Documentation review graph | Existing knowledge links | Same report set                                                | `pnpm ci:docs`, `pnpm verify:prepush`                     | Rewriting report findings           |
| Branch integration needs auditable scope            | Shotgun change      | Explicit manifest    | Feature mechanization      | Existing guard           | This plan and moved review files                               | Feature mechanization allows only declared moved surfaces | Closing report remediation work now |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: WORKSPACE-GAP-REPORTS-GOVERNED-SURFACE-20260607
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/workspace-gap-reports-governed-surface-plan-20260607.md
componentGuides:
  - docs/planning/proposals/mandatory/governance-and-docs/knowledge-intake-dbfirst-retirement-plan-20260604.md
userStories:
  - docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-executive-index-and-remediation-queue.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/proposals/mandatory/governance-and-docs/knowledge-intake-dbfirst-retirement-plan-20260604.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/governance-and-docs/workspace-gap-reports-governed-surface-plan-20260607.md
  - docs/planning/reviews/architecture-and-governance/20260607-*.md
forbiddenImplementationSurfaces:
  - buzon/**
  - apps/**
  - packages/**
  - specs/**
  - scripts/**
  - tools/**
  - .github/**
commandQueryRails:
  - name: ListKnowledgeIntakeRetirement
    type: query
    dddOwner: KnowledgeIntakeRetirementReadModel
domainObjects:
  - name: WorkspaceGapReportsGovernedSurface
    type: planning review surface
    owner: Documentation governance
  - name: KnowledgeIntakeRetirementReadModel
    type: DB-first query model
    owner: Planning DB
fowlerSignals:
  - Hidden authority
  - Duplicate authority
  - Shotgun change
  - Documentation drift
architectureGuards:
  - pnpm docs:sync:check
  - pnpm docs:feature-mechanization:implementation
  - pnpm ci:docs
cypressFlows:
  - N/A - this slice governs documentation relocation only.
completionGate:
  - pnpm docs:sync
  - pnpm docs:sync:check
  - pnpm docs:feature-mechanization:implementation
  - pnpm ci:docs
  - pnpm verify:prepush
redGreenCycles:
  - id: workspace-gap-reports-buzon-retirement
    redTest: pnpm verify:prepush
    expectedFailure: New workspace gap reports in buzon are rejected by the knowledge intake retirement guard.
    patchSurfaces:
      - docs/planning/proposals/mandatory/governance-and-docs/workspace-gap-reports-governed-surface-plan-20260607.md
      - docs/planning/reviews/architecture-and-governance/20260607-*.md
    greenTest: pnpm verify:prepush
symbols:
  - name: Workspace Gap Reports Governed Surface Plan
    path: docs/planning/proposals/mandatory/governance-and-docs/workspace-gap-reports-governed-surface-plan-20260607.md
    dddOwner: Documentation governance
    cqRails:
      - ListKnowledgeIntakeRetirement
    fowlerSignals:
      - Hidden authority
      - Duplicate authority
    architectureGuard: pnpm ci:docs
    cypressCoverage: N/A - documentation-only governance slice.
    unitTests:
      - pnpm docs:feature-mechanization:implementation
  - name: Workspace Gap Reports Executive Index And Remediation Queue
    path: docs/planning/reviews/architecture-and-governance/20260607-workspace-gap-reports-executive-index-and-remediation-queue.md
    dddOwner: Documentation governance
    cqRails:
      - ListKnowledgeIntakeRetirement
    fowlerSignals:
      - Documentation drift
      - Shotgun change
    architectureGuard: pnpm ci:docs
    cypressCoverage: N/A - review queue only.
    unitTests:
      - pnpm docs:sync:check
expectedTests:
  - pnpm docs:sync:check
  - pnpm docs:feature-mechanization:implementation
  - pnpm ci:docs
  - pnpm verify:prepush
```
