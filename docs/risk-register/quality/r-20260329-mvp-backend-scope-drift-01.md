---
id: R-20260329-MVP-BACKEND-SCOPE-DRIFT-01
title: MVP backend scope can drift from implemented operability surface
status: Open
date: 2026-03-29
owners:
  - docs
  - dvt-api
severity: Medium
probability: Medium
---

# R-20260329-MVP-BACKEND-SCOPE-DRIFT-01

## Context

The roadmap reset defines MVP as the currently implemented backend control-plane
surface. If planning docs and lane execution drift, teams may reintroduce
non-MVP commitments while core operability remains the primary delivery need.

## Risk

1. MVP claims become inconsistent across roadmap, domain board, and lane tasks.
2. Deferred deep-dive items can re-enter active scope without explicit decision.
3. Frontend expectations can diverge from backend capabilities currently shipped.

## Mitigation

1. Keep `MVP-A1` inventory and `MVP-B1` traceability matrix synchronized with
   roadmap, runbook, and lane state.
2. Require updates to `domain-status-board` and lane YAML in the same PR when
   MVP claims change.
3. Track frontend expectation alignment through `MVP-E1` before enabling new UI
   assumptions.
4. Keep `MVP-D1` residual-risk baseline explicit and synchronized:
   [20260330-mvp-d1-residual-risk-baseline-review](https://github.com/dunay2/dvt/blob/d3fe40beaa66bd8d98ae9397b76340ff5f895f21/docs/planning/reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md).

## Residual Baseline Snapshot (2026-03-31)

Accepted as non-blocking for MVP backend operability baseline:

1. Lifecycle depth beyond baseline operability (retention completion,
   deferred deletion, restore automation).
2. Scale optimization programs (partitioning, read-replica path, advanced
   concurrency tuning).
3. Admission/backpressure deepening beyond current baseline.
4. GTM/compliance/billing packaging.

Lane ownership for deferred items:

- Lane D: lifecycle depth, scale path, cost/billing, pilot/compliance tracks.
- Lane C/D: admission/backpressure maturity.

`MVP-A1` and `MVP-B1` are now closed, so this snapshot is no longer
provisional. The risk remains open until the stability criteria below are met
across subsequent planning cycles.

## Exit criteria

Close this risk when:

1. MVP capability inventory is stable and linked to executable evidence.
2. Claim-to-proof traceability is maintained for two consecutive planning cycles.
3. No out-of-MVP feature is promoted without explicit scope update in roadmap.

<a id="risk-r-20260407-f23-engine-web-alignment"></a>

## Independent risk R-20260407-F23-ENGINE-WEB-ALIGNMENT

```risk-record-v1
---
id: R-20260407-F23-ENGINE-WEB-ALIGNMENT
title: F-23 web transformation flow can drift from engine run-lifecycle contracts
status: Open
date: 2026-04-07
owners:
  - apps/web
  - packages/@dvt/engine
severity: Medium
probability: Medium
context: >
  PR 817 hardens the web transformation flow while also touching engine contract fixtures and
  frontend planning/architecture documentation. The slice spans UX behavior and lifecycle contract
  expectations across route state, run status transitions, and adapter selection surfaces.
risk: >
  Future frontend iterations can reintroduce behavior that diverges from canonical engine run
  lifecycle semantics (status progression, cancellation, or target-adapter assumptions), causing
  user-visible state inconsistencies even when backend contracts remain valid.
mitigations:
  - Keep web run-state transitions aligned with canonical engine contracts and fixtures.
  - Maintain integration and route-level tests for transformation graph validation and run flow.
  - Require ARC-2 evidence plus risk updates for cross-surface slices touching engine boundaries.
  - Revalidate docs-to-code alignment through PR Quality Gate and docs sync surfaces.
review_after: 2026-05-15
---
```

<a id="risk-r-20260407-status-head-contract-cutover"></a>

## Independent risk R-20260407-STATUS-HEAD-CONTRACT-CUTOVER

```risk-record-v1
---
id: R-20260407-STATUS-HEAD-CONTRACT-CUTOVER
title: Status-head contract cutover across adapter engine API web surfaces
status: Open
date: 2026-04-07
owners:
  - '@dvt/adapter-postgres'
  - '@dvt/contracts'
  - '@dvt/engine'
  - 'dvt-api'
  - '@dvt/web'
severity: Medium
probability: Medium
---
summary: >
  Runtime status paths were changed in one slice across adapter, contracts, engine, API, and web. A
  mismatch between status-head rollout assumptions and downstream consumers can reintroduce stale
  status reads or contract drift.

mitigations:
  - Keep `pnpm verify:prepush` required for every follow-up commit in this lane.
  - Maintain adapter and engine targeted vitest coverage for status projection paths.
  - Keep ARC evidence and risk updates synchronized for subsequent contract-touching slices.

signals:
  - CI failures in adapter/contracts/engine suites.
  - Regressions in run status payload shape at API/web boundaries.
  - Read-path latency regressions tied to replay fallback in status hot path.
```

<a id="risk-r-20260411-web-workspace-file-not-found-contract-gap"></a>

## Independent risk R-20260411-WEB-WORKSPACE-FILE-NOT-FOUND-CONTRACT-GAP

```risk-record-v1
---
id: R-20260411-WEB-WORKSPACE-FILE-NOT-FOUND-CONTRACT-GAP
title: Web workspace file-missing handling depends on a future backend canonical reason
status: Open
date: 2026-04-11
owners:
  - apps/web
  - apps/api
severity: Low
probability: Medium
context: >
  The `Code` route no longer infers missing-file state from legacy strings or generic `404`
  transport status. The web workspace adapter now requires a canonical `HttpErrorEnvelope.v1`
  payload with `error.type = not_found` and `error.reason = workspace_file_not_found` before it
  emits `WorkspaceFileLoadError('not_found')`.
risk: >
  The current repository does not yet contain an `apps/api` implementation for `/workspace/files`.
  If the eventual backend route ships with a different reason token or with a bare `404` response,
  the web client will correctly refuse to classify it as `file-missing`, but the UX will fall back
  to the generic file-preview-unavailable state until the backend contract and web adapter are
  aligned.
mitigations:
  - Keep the web adapter strict on `error.type/error.reason` and do not reintroduce status-only or
    string-message inference.
  - When `/workspace/files` is implemented in `apps/api`, emit `HttpErrorEnvelope.v1` with the
    canonical reason `workspace_file_not_found`.
  - Add backend contract and frontend integration coverage for the canonical missing-file envelope
    before declaring the route end-to-end closed.
review_after: 2026-05-15
---
```

<a id="risk-r-20260413-ar-a12-b-status-model-consumer-drift"></a>

## Independent risk R-20260413-AR-A12-B-STATUS-MODEL-CONSUMER-DRIFT

```risk-record-v1
---
id: R-20260413-AR-A12-B-STATUS-MODEL-CONSUMER-DRIFT
title:
  Downstream consumers may still depend on retired status helper exports or mixed status semantics
status: Open
date: 2026-04-13
owners:
  - packages/@dvt/contracts
  - packages/@dvt/engine
  - apps/web
severity: Medium
probability: Low
context: >
  `AR-A12-B` removes `RunStatusSnapshot` from the active shared-contract line and retires
  `AdapterScopedSubstatus` from public exports. The shipped model now reserves `CanonicalRunStatus`
  for DVT-owned lifecycle authority, `ProviderRunStatusView` for provider-native diagnostics, and
  `RunStatusEnrichment` for optional derived read-side data.
risk: >
  Any downstream consumer that still imports the retired helper types or treats `providerSubstatus`
  as canonical lifecycle state can fail to compile or render incorrect run state after upgrade.
mitigations:
  - 'Web overlay and plugin runtime consumers now read `CanonicalRunStatus` for lifecycle state and
    keep provider-native strings only inside `ProviderRunStatusView`.'
  - 'Contracts and engine public-surface tests now fail if `AdapterScopedSubstatus` reappears on the
    active exported line.'
  - 'The AR-A12-B review, closeout, and reference docs now describe the
    canonical/provider/enrichment split explicitly.'
  - 'Targeted contracts, engine, web, and verify:prepush validation ran against the shipped slice.'
review_after: 2026-06-30
---
```

<a id="risk-r-20260413-tf-a1-a-preview-contract-adoption-drift"></a>

## Independent risk R-20260413-TF-A1-A-PREVIEW-CONTRACT-ADOPTION-DRIFT

```risk-record-v1
---
id: R-20260413-TF-A1-A-PREVIEW-CONTRACT-ADOPTION-DRIFT
title: >
  Downstream planner and consumer surfaces may drift while adopting the frozen SQL-first preview
  contract
status: Open
date: 2026-04-13
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
  - packages/@dvt/planner
severity: Medium
probability: Low
context: >
  `TF-A1-A` freezes the first shared SQL-first design-graph and preview-persist boundary, including
  explicit Git-first provenance and the persisted preview response envelope. `api` and `web` consume
  the new contract line, but the deterministic compiler mapping and remaining preview route adoption
  work continue under `TF-A1-B` and `TF-C1`.
risk: >
  Additional planner, API, or UI surfaces can continue constructing older route-local DTO shapes,
  can omit required provenance for the SQL-first preview profile, or can diverge from the governed
  `source -> sql_transform -> sink` assumptions before the remaining follow-up slices finish.
mitigations:
  - >
    Shared contract exports and parse helpers now own `DesignGraphDraft`, `GitArtifactRef`, and
    preview request and response validation.
  - >
    `apps/api` and `apps/web` now consume the shared surface instead of maintaining private preview
    DTO copies for the touched paths.
  - >
    Negative-path contract tests now reject missing preview provenance and invalid graph shape for
    the SQL-first profile.
  - >
    Lane A keeps compiler mapping and remaining adoption work explicit under `TF-A1-B` and `TF-C1`
    instead of hiding it inside `TF-A1-A`.
review_after: 2026-06-30
---
```

<a id="risk-r-20260414-tf-a1-b-compiler-mapping-drift"></a>

## Independent risk R-20260414-TF-A1-B-COMPILER-MAPPING-DRIFT

```risk-record-v1
---
id: R-20260414-TF-A1-B-COMPILER-MAPPING-DRIFT
title: SQL-first compiler mapping consumers may drift from the frozen canonical contract
status: Open
date: 2026-04-14
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
  - packages/@dvt/planner
severity: Medium
probability: Low
context: >
  `TF-A1-B` freezes the SQL-first compiler mapping in the shared planner contract line: one
  canonical step chain, one required stepTypeConfig shape, and one summary derivation path from
  persisted immutable plans. The touched `web` and `api` consumers now adopt that line, but
  additional downstream consumers and future executor modes remain.
risk: >
  Future planner, API, UI, or runtime consumers can reintroduce route-local preview kinds, omit
  required SQL-first step config fields, or derive plan-summary truth from request-local assumptions
  instead of the persisted governed plan shape.
mitigations:
  - >
    `TransformationFlowCompiler.v1.ts` now publishes the canonical step chain, config schemas, and
    shared summary helper from `@dvt/contracts`.
  - >
    `schemas.ts` and `validation.ts` fail closed for malformed `transformation-sql-first-v1`
    compiler graph sources and response summaries.
  - >
    `apps/web` now emits the canonical compiler graph source instead of preview-only local step
    kinds.
  - >
    `apps/api` now validates the preview request through the shared parser and derives `planSummary`
    from the governed persisted plan shape.
review_after: 2026-06-30
---
```

<a id="risk-r-20260414-tf-a1-c-srp-hardening-drift"></a>

## Independent risk R-20260414-TF-A1-C-SRP-HARDENING-DRIFT

```risk-record-v1
---
id: R-20260414-TF-A1-C-SRP-HARDENING-DRIFT
title: SQL-first seam hardening can regress into local convenience modules as new profiles land
status: Open
date: 2026-04-14
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
severity: Medium
probability: Medium
context: >
  TF-A1-C splits the frozen SQL-first transformation pack into smaller shared-kernel, API-boundary,
  and web-presentation seams. Future work such as new preview profiles, additional step families, or
  alternative sinks could reintroduce local convenience modules that duplicate step-kind authority,
  compiler rules, or route-side policy.
risk: >
  If future slices bypass the narrowed seams and add profile-specific logic directly in
  StepTypeRegistry, previewGraphSource, useCanvasExecutionActions, or planRoutes, the repo can
  regress back to mixed authority and coupled reasons-to-change even though the public contract
  remains nominally frozen.
mitigations:
  - Keep canonical step-kind authority in StepKindRegistry and extracted planner contract seams.
  - Preserve dedicated Canvas preview/execution helpers instead of re-growing facade modules.
  - Preserve route helper seams for scope, guard, binder, and response projection.
  - Require contract, API, and web validation together on slices that touch the SQL-first pack.
review_after: 2026-06-01
---
```

<a id="risk-r-20260416-tf-a2-workspace-graph-draft-adoption-drift"></a>

## Independent risk R-20260416-TF-A2-WORKSPACE-GRAPH-DRAFT-ADOPTION-DRIFT

```risk-record-v1
---
id: R-20260416-TF-A2-WORKSPACE-GRAPH-DRAFT-ADOPTION-DRIFT
title: Workspace graph-draft callers can drift from shared capability and CAS semantics
status: Open
date: 2026-04-16
owners:
  - packages/@dvt/contracts
  - dvt-api
  - '@dvt/web'
severity: Medium
probability: Medium
context: >
  `TF-A2` freezes the shared workspace graph-draft persistence contract in `@dvt/contracts`,
  including capability posture, compare-and-swap revision semantics, idempotent retry identity,
  audit correlation, and typed format-evolution outcomes. The protected API/store slice (`TF-C4`)
  and Canvas adoption slice (`TF-E2-A`) still remain to be implemented.
risk: >
  If Lane C or Lane E reintroduce route-local DTOs, browser-local overwrite heuristics, or ad-hoc
  permission handling while wiring the new draft path, the runtime boundary can diverge from the
  frozen shared contract and silently weaken conflict handling, auditability, or read-only posture.
mitigations:
  - 'The shared contract pack now defines one typed read/write boundary in `@dvt/contracts`.'
  - 'Validation helpers and dedicated contract tests enforce capability, audit, conflict, and format
    outcomes.'
  - 'The repo-local planner contract doc makes the boundary explicit for downstream implementation
    lanes.'
  - '`TF-C4` and `TF-E2-A` are explicitly sequenced behind the shared contract freeze in planning
    state.'
review_after: 2026-06-16
---
```

<a id="risk-r-20260416-web-dvt-renderer-ownership-drift"></a>

## Independent risk R-20260416-WEB-DVT-RENDERER-OWNERSHIP-DRIFT

```risk-record-v1
---
id: R-20260416-WEB-DVT-RENDERER-OWNERSHIP-DRIFT
title: DVT authoring nodes can drift behind dbt-owned renderer and inspector behavior
status: Open
date: 2026-04-16
owners:
  - '@dvt/web'
severity: Low
probability: Low
context: >
  The follow-up fix for `dbt:source -> dvt:sql_transform -> dvt:sink` moved connection-rule
  ownership to a dedicated `dvt` plugin and registered `dvt` node kinds separately. The current UI
  surface still reuses `DbtNodeRenderer` for `dvt:sql_transform` and `dvt:sink`, and those nodes do
  not yet have `dvt`-owned inspector panels or editing affordances.
risk: >
  If future product work adds DVT-specific node properties, validation, or inspector behavior
  without first separating presentation ownership from dbt, `dvt` authoring nodes can inherit or
  leak dbt-oriented copy, panel visibility, and renderer assumptions, creating subtle UX drift even
  though connection ownership is now correct.
mitigations:
  - 'Connection ownership now lives in a dedicated `dvt` plugin instead of `dbt` cross-plugin rules.'
  - 'Canvas connection evaluation is covered by real `getPluginPortMap()` + `evaluateConnection()`
    tests.'
  - 'The current `dvt` node set is intentionally narrow: SQL transform and sink only.'
  - 'Future DVT-specific inspector or editor work should add `dvt`-owned panels instead of extending
    dbt panels further.'
review_after: 2026-06-16
---
```

<a id="risk-r-20260423-canvas-host-draft-boundary"></a>

## Independent risk R-20260423-CANVAS-HOST-DRAFT-BOUNDARY

```risk-record-v1
---
id: R-20260423-CANVAS-HOST-DRAFT-BOUNDARY
title: Canvas host can overclaim multi-canvas truth before the draft boundary supports it
status: Open
date: 2026-04-23
owners:
  - apps/web
  - packages/@dvt/contracts
severity: Medium
probability: Medium
context: >
  `TF-E2-K-A` adds a real host-owned create-canvas posture and requires a typed `canvas` document on
  the canonical workspace draft. The active backend boundary still persists one authoritative draft
  record per workspace.
risk: >
  Follow-up UI work could imply full multi-canvas persistence or host-level tab restoration before
  the protected draft contract carries a truthful document list. That would recreate the same drift
  this slice just removed: a host that looks richer than the authoritative boundary underneath it.
mitigations:
  - The first-canvas host slice hard-cuts to one persisted canvas document per workspace and rejects
    synthetic default documents.
  - The local host guide and closeout both state that multi-canvas restoration remains a later
    slice.
  - The route uses plugin-owned `CanvasKindRegistration` for typed empty state instead of inventing
    a second host-local catalog.
  - Lane E now tracks `TF-E2-K-B` explicitly as the next slice instead of letting tabs emerge as ad
    hoc UI behavior.
review_after: 2026-05-15
---
```

<a id="risk-r-20260503-canvas-empty-state-message-ambiguity"></a>

## Independent risk R-20260503-CANVAS-EMPTY-STATE-MESSAGE-AMBIGUITY

```risk-record-v1
---
id: R-20260503-CANVAS-EMPTY-STATE-MESSAGE-AMBIGUITY
title: Canvas empty-state copy is ambiguous and can be interpreted as connectivity failure
status: Open
date: 2026-05-03
owners:
  - web
  - frontend-and-ui
severity: Low
probability: High
---
summary: >
  The Canvas empty-state message can be read as backend or runtime failure even when the real state
  is simply an empty workspace graph. This creates operator confusion and false incident perception
  in the happy path.

mitigation:
  - Replace current empty-state wording with explicit "workspace/canvas empty" language.
  - Keep technical runtime limitations as secondary note, not primary headline.
  - Validate updated copy in ES/EN route catalogs and add regression screenshot proof.

monitoring:
  cadence: per PR touching Canvas empty-state copy or startup-route presentation
  signals:
    - 'apps/web/src/app/views/canvas/canvasCopyCatalog.route.ts'
    - 'apps/web/src/app/views/canvas/canvasCopyCatalog.route.es.ts'
    - 'apps/web/cypress/e2e/canvas/*empty*'
```

<a id="risk-r-20260510-web-api-ewc"></a>

## Independent risk R-20260510-WEB-API-EWC

```risk-record-v1
---
id: R-20260510-WEB-API-EWC
title: Effective workspace context drift can reappear in protected web API mode
status: Open
date: 2026-05-10
owners:
  - apps/api
  - apps/web
  - packages/@dvt/engine
severity: Low
probability: Low
---
mitigation:
  summary: >
    ADR-0055, the effective workspace context component guide, route tests, resolver tests, and
    semantic architecture tests now guard the session versus workspace-context split.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260510-web-api-effective-workspace-context.md
    - docs/adr/ADR-0062-server-owned-effective-workspace-context.md
  follow_up:
    - Continue splitting broad web workspace capabilities by command/query rail.
```
