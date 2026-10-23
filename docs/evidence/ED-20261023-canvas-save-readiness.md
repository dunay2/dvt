---
title: Canvas save identity and execution readiness boundaries
status: draft
date: 2026-10-23
owners:
  - Web
  - API
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/useCanvasDraftAutosave.ts
  - apps/web/src/app/views/canvas/canvasRuntimePolicy.ts
  - apps/web/src/app/views/canvas/canvasPlanReadiness.ts
  - apps/web/src/app/views/canvas/canvasPlanAction.ts
  - apps/web/src/app/views/canvas/useCanvasPlanActionHandler.ts
  - apps/api/src/application/services/dvtWorkloadPublication.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalRejection.v1.ts
evidence:
  tests:
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasDraftAutosave.test.tsx src/app/views/canvas/canvasDraftAutosaveSnapshot.test.ts src/app/views/canvas/canvasDraftPersistenceRuntime.test.ts src/app/views/canvas/useCanvasDraftAutosave.architecture.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/canvasPlanReadiness.test.ts src/app/views/canvas/canvasRuntimePolicy.test.ts src/app/views/canvas/canvasOperationalDrawerContribution.test.tsx src/app/views/canvas/canvasPlanAction.dvtProtectedPreview.test.ts
    - pnpm --filter @dvt/web exec vitest run src/app/views/canvas/useCanvasExecutionActions.runStartGuards.test.tsx src/app/views/canvas/useCanvasExecutionActions.runStartSuccess.test.tsx src/app/views/canvas/canvasRunStartIdentity.architecture.test.ts
    - pnpm --filter dvt-api test:unit test/application/services/resolveAuthorizedDvtPreviewSelection.test.ts
    - pnpm --filter @dvt/contracts exec vitest run test/operational-rejection.test.ts test/schema-sync.test.ts
    - pnpm validate:contracts
---

# Canvas Save And Readiness

The governing issue is [#3115](https://github.com/dunay2/dvt/issues/3115).
Its [initial rationale](https://github.com/dunay2/dvt/issues/3115#issuecomment-6370941395)
and [component refinement](https://github.com/dunay2/dvt/issues/3115#issuecomment-6371448881)
preceded the corresponding implementation. Existing ConfigureCanvasDvtNode,
SaveWorkspaceGraphDraft, PreviewPlan and ObservePlanRunReadiness rails remain the
product boundaries. ADR-0044 and ADR-0066 govern diagnostic identity and supported
publication shapes.

The save regression test first demonstrated starvation: equivalent projection
objects reset the debounce and no request was sent. Scheduling now follows the
semantic signature and revision while retaining the committed payload. Real
edits restart debounce; unmount and denied persistence cancel it. Existing
snapshot acknowledgement, CAS and recovery guards remain active.

Runtime policy owns a discriminated Run admission value. Draft persistence
supplies its barrier without interpreting Run permission. Readiness owns each
blocker's message and label, shared by the panel and operational drawer. The old
unused global unavailable summary and duplicated label map are removed.
The same typed cause reaches the Run application command; direct invocations
cannot misreport a pending save or unavailable capability as permission denial.

Preview owns outcome and attempted draft signature as one value. Its visible
diagnostic expires on a semantic edit even when the previous request accepted no
plan. The application command owns permission/profile guards and the pre-submit
flush; its React adapter owns query invalidation and presentation. No dependency
array or ref is used to hide command dependencies.

API publication admission distinguishes unsupported terminal disposition,
ephemeral output without Sink, incompatible Sink input, and conflicting
publication targets. Invalid authoring drafts still fail before this policy;
tests use valid persisted shapes to reach each admission decision. Web translates
stable causes instead of using one ambiguous instruction for every case.

The Planning DB integrity check initially passed but the affected Web area had
only root ownership and no semantic components/source bindings. Scoped records
now describe the actual boundaries. No global import or database rebuild was
performed. During consultation PostgreSQL entered automatic recovery after a
backend exited with code 2; the log does not establish its root cause or database
corruption. The subsequent integrity check passes with the prior 101 warnings.

Exact validation results, failed invocations and the bounded browser acceptance
are recorded in the issue. Listed commands declare scope, not blanket acceptance.
No new runtime profile, rule exemption, hook bypass, debt or stub is introduced.

## Component boundaries and executable fitness

The [boundary refinement](https://github.com/dunay2/dvt/issues/3115#issuecomment-6373237186)
records current/target diagrams and the allowed implementation surfaces before
the writer and dependency tests. Six existing components retain their identities
and bindings while their concrete reasons to change and excluded concerns replace
generic metadata. Preview/Run coordination references the existing StartRun rail.

The existing ReviseGovernanceComponent command now accepts rail/semantic-owner
corrections and exact removal of superseded reasons or non-goals. Expected
revision, design scope, audit identity and unrelated metadata are preserved.
Unknown removals and invalid rail declarations reject. No raw SQL write, import
or replacement catalog is used.

Five root dependency-cruiser error rules enforce current import direction:
readiness to effects, autosave to execution, execution to route composition,
publication policy to adapters, and contracts to applications. The existing
architecture gate owns execution in CI. Negative fixtures exercise both runtime
and type-only edges; positive fixtures retain composition, ports and passive
diagnostic translation. The actual repository graph is also checked through
`pnpm arch:deps`.

Focused commands for this refinement are
`node --test scripts/planning-db-operate-tests/component-create.test.cjs` and
`node --test --test-name-pattern='Canvas component boundaries' tools/ci/architecture-dependency-guard.test.mjs`.
The issue records exact outcomes and committed base/head. This tooling and
metadata refinement does not change product runtime behavior or repeat the
previous browser acceptance.
