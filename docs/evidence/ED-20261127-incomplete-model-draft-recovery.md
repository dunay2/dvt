---
title: Preserve unfinished Canvas Models across save and reopen
status: draft
date: 2026-11-27
owners:
  - Web
  - API
  - Architecture
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/canvasModelCompositionCandidate.ts
  - apps/web/src/app/views/canvas/canvasDvtPreviewProjection.ts
  - apps/api/src/application/services/dvtProtectedTransformSelection.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
evidence:
  tests:
    - pnpm --filter @dvt/web test:unit:run canvasModelCompositionCandidate canvasDvtPreviewProjection.join canvasRelationalDraftApply
    - pnpm --filter dvt-api test:unit dvtOperationalWorkloadProjector dvtProtectedTransformSelection
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/web test:e2e:native -- --browser chrome --spec cypress/e2e/canvas/canvas-model-composition.cy.ts
    - pnpm verify:prepush
---

# Preserve unfinished Canvas Models across save and reopen

[Issue #4002](https://github.com/dunay2/dvt/issues/4002) covers saving an
unfinished Model. Track its integration and verification results there.

The composition command checks the origin against the current catalogue,
including when the original isn't placed in the active Canvas. A missing or
changed origin rejects the whole candidate. Admitted copies and the receiver
save together through the existing workspace draft revision check.

The existing draft contract preserves pending cards, layouts and disconnected
output. Operational Plan and Run reuse one check for incomplete authoring. The
retained document remains available to the editor for exact reconnection. A
completed Model can still carry layout metadata without blocking execution.

The browser journey checks the protected save request, two distinct Reads of
one source and their identities after reopening. The applications check that
an operational plan can't use the retained document while the Model is
incomplete. The controlled browser transport supplies repeatable saved state.
