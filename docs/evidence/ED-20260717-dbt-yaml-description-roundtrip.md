---
title: dbt YAML description roundtrip
status: Accepted
date: 2026-07-17
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtYamlDescriptionEdit.v1.ts
  - apps/api/src/application/services/dbtYamlDescriptionEdit/DbtYamlDescriptionEditTransaction.ts
  - apps/api/src/infrastructure/dbtYamlDescriptionEdit/YamlCstDbtDescriptionMutator.ts
  - apps/web/src/app/components/dbtYamlDescriptionEditor/DbtYamlDescriptionEditor.tsx
  - apps/web/src/app/views/canvas/dbtYamlDescriptionWorkbenchContribution.tsx
  - apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter @dvt/web test
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
    - node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts
    - pnpm docs:feature-mechanization:implementation
    - pnpm verify:prepush
---

# Summary

This evidence records the lossless, file-authoritative dbt YAML description
roundtrip. The Canvas workbench proposes a revision-bound change, shows the
exact byte diff, applies or reverts it through the protected API, and refreshes
the dbt project projection from the resulting workspace files.

# Scope

- The transaction targets a model, source, or column description through a
  versioned contract and the existing workspace-file authority.
- The server rejects stale revisions, unsupported YAML structures, ambiguous
  targets, and files outside the authorized project root.
- The CST adapter changes only the selected description while preserving
  unrelated comments, tags, formatting, and byte content.
- Apply and revert return immutable before/after SHA-256 receipts and the UI
  keeps the review evidence visible after either outcome.
- The contextual toolbar uses icon-only localized actions, exposes exact node
  and project code, and reflects freeze state without duplicating node detail.
- The strict browser proof exercises apply, revert, reapply, exact code editing,
  project reanalysis, Preview, Temporal Run, and browser reload without API
  interception, graph-draft seeding, or a fake success path.

# Authority

ADR-0060, the mandatory dbt project roundtrip product plan, and Planning DB
design `DBT-YAML-DESCRIPTION-ROUNDTRIP-PHASE5-20260717` govern this slice. The
implementation reuses `ProposeDbtYamlDescriptionEdit`,
`ApplyDbtYamlDescriptionEdit`, `RevertDbtYamlDescriptionEdit`,
`SaveWorkspaceFileContent`, and `ProjectDbtGraphFromFiles`. This document is ARC
validation evidence, not the planning source of truth.
