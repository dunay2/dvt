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

<a id="risk-r-20260527-canvas-multi-worksheet"></a>

## Independent risk R-20260527-CANVAS-MULTI-WORKSHEET

```risk-record-v1
---
id: R-20260527-CANVAS-MULTI-WORKSHEET
title: Multi-canvas draft compatibility across active-graph consumers
status: Open
date: 2026-05-27
owners:
  - '@dvt/contracts'
  - '@dvt/web'
severity: Medium
probability: Low
description: >
  WorkspaceGraphAuthoringDraft.v1 now allows optional multi-canvas worksheet state while preserving
  the top-level active graph projection. A future consumer might read canvases directly and ignore
  the active projection invariant, creating divergence between the selected worksheet and runtime
  execution.
mitigation:
  - Contract validation requires the active workspace to mirror the top-level graph.
  - Web lifecycle helpers centralize selection, rename, and delete transitions in
    canvasProjectCanvasLifecycle.ts.
  - Command writes persist through protected draft CAS instead of route-local state.
  - Architecture docs name the governing ProjectCanvas rails.
---
```

<a id="risk-r-20260601-canvas-workflow-e2e-usability"></a>

## Independent risk R-20260601-CANVAS-WORKFLOW-E2E-USABILITY

```risk-record-v1
---
id: R-20260601-CANVAS-WORKFLOW-E2E-USABILITY
title: Canvas workflow E2E usability regressions across protected runtime rails
status: Open
date: 2026-06-01
owners:
  - Web
  - API
  - '@dvt/adapter-postgres'
  - '@dvt/adapter-temporal'
  - dvt-temporal-worker
severity: Medium
probability: Medium
---
summary: >
  Canvas workflow usability depends on several independently owned rails: protected graph drafts,
  workspace files, plan store, Temporal worker queues, SQL-first step activities, source import, and
  run read models. Drift in any one rail can make the route appear loaded while plan, source, or run
  actions fail with unclear user feedback.

mitigation: >
  Keep the live protected-runtime Cypress proof and focused package tests in the closeout baseline.
  The local dev stack now seeds real Postgres source data, advertises it through the warehouse
  catalog, grants source-import scopes, and starts the worker on the tenant queue so failures
  surface against the real integration path.

evidence:
  - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ed-20260601-canvas-workflow-e2e-usability.md
```

<a id="risk-r-20260711-source-object-catalog-contract"></a>

## Independent risk R-20260711-SOURCE-OBJECT-CATALOG-CONTRACT

```risk-record-v1
---
id: R-20260711-SOURCE-OBJECT-CATALOG-CONTRACT
title: Source adapters can drift from the provider-neutral catalog contract
status: Open
date: 2026-07-11
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: Medium
probability: Low
context: >
  Source discovery now uses a versioned shared SourceObject contract while the first production
  acquisition adapter is Postgres and the current DBT import strategy accepts relational objects.
risk: >
  A future file, endpoint, stream, or warehouse adapter could leak provider-specific fields into
  application or presentation code, emit incomplete metric evidence, or falsely expose an object as
  importable by the relation-only DBT strategy.
mitigations:
  - 'Validate every catalog response through `SourceObjectCatalogResponseSchema` in API/Web boundary
    tests.'
  - 'Keep provider acquisition and estimates behind adapter-owned helpers and emit the shared metric
    evidence value.'
  - 'Resolve import selections server-side by unique object ID and reject unsupported locators
    before side effects.'
  - 'Require a dedicated adapter and strategy slice before claiming non-relational import support.'
review_after: 2026-08-11
---
```

<a id="risk-r-20260715-dbt-project-roundtrip-p4"></a>

## Independent risk R-20260715-DBT-PROJECT-ROUNDTRIP-P4

```risk-record-v1
---
id: R-20260715-DBT-PROJECT-ROUNDTRIP-P4
title: dbt preview provenance can drift before runtime admission
status: Open
date: 2026-07-15
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  Phase four allows a file-authoritative dbt Canvas to preview and run a selected model from a
  server-analyzed project revision using a server-owned target and credential-reference identity.
risk: >
  Project bytes, dbt analysis, executable selection, target identity, or runtime bundle policy could
  drift after Preview and cause StartRun to execute content other than the content the user
  reviewed.
mitigations:
  - 'Persist versioned provenance containing the project root, content SHA-256, analysis SHA-256,
    dbt version, selected unique IDs, and secret-free target identity.'
  - 'Re-resolve project authority, analysis, executable closure, and target identity server-side;
    reject stale or caller-expanded values before plan persistence and run dispatch.'
  - 'Build the dbt runtime bundle from the same immutable allowed-source snapshot and verify its
    content revision against persisted preview provenance.'
  - 'Exclude profiles.yml, generated output, VCS metadata, links, editor temporaries, and credential
    material from analysis and runtime bundles.'
  - 'Exercise RT-006 through the real protected API, PostgreSQL, dbt CLI, Temporal worker, persisted
    plan, run events, and reloaded provenance without graph-draft interception or file regeneration.'
review_after: 2026-08-15
---
```

<a id="risk-r-20260717-dbt-yaml-description-roundtrip"></a>

## Independent risk R-20260717-DBT-YAML-DESCRIPTION-ROUNDTRIP

```risk-record-v1
---
id: R-20260717-DBT-YAML-DESCRIPTION-ROUNDTRIP
title: dbt YAML description edits could alter unrelated project bytes
status: Open
date: 2026-07-17
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  Phase five lets an authorized Canvas user edit model, source, and column descriptions in the
  canonical dbt YAML files while keeping the graph projection synchronized with file authority.
risk: >
  A stale, ambiguous, or lossy YAML mutation could overwrite a concurrent change, target the wrong
  resource, or alter comments, tags, formatting, and other bytes that the user did not approve.
mitigations:
  - 'Bind proposals, apply, and revert operations to exact project, file, target, and content
    revisions; reject stale or ambiguous requests before mutation.'
  - 'Use a CST-aware adapter and assert byte preservation for every region outside the selected
    description field.'
  - 'Return immutable before/after SHA-256 receipts and keep the reviewed diff visible after apply
    and revert.'
  - 'Write the workspace file once, then rebuild the dbt graph through ProjectDbtGraphFromFiles; do
    not introduce a parallel persistence path.'
  - 'Exercise apply, revert, reapply, Preview, Temporal Run, and browser reload through the real
    protected runtime without cy.intercept or graph-draft seeding.'
review_after: 2026-08-17
---
```

<a id="risk-r-20260729-graph-dbt-atomic-publication"></a>

## Independent risk R-20260729-GRAPH-DBT-ATOMIC-PUBLICATION

```risk-record-v1
---
id: R-20260729-GRAPH-DBT-ATOMIC-PUBLICATION
title: Graph-authored dbt artifacts can diverge during publication
status: Open
date: 2026-07-29
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  Graph-authority execution publishes dbt_project.yml, models/schema.yml, and managed model SQL
  files from one Canvas plan. These artifacts form one logical dbt workspace revision.
risk: >
  A regression that publishes artifacts independently, omits an expected revision, or bypasses
  idempotency could expose a partially updated dbt project or overwrite an external file edit.
mitigations:
  - 'Publish all graph-authored dbt artifacts through the protected
    PublishGraphDbtWorkspaceArtifacts command and one IWorkspaceFileBatchMutationPort mutation.'
  - 'Preflight every expected artifact revision before applying any write, including unchanged
    artifacts whose revisions define the accepted workspace snapshot.'
  - 'Use the existing atomic local batch gateway to lock the scope, roll back every replaced file
    after a write failure, and preserve original preconditions.'
  - 'Bind equivalent retries to one deterministic intent-derived idempotency key and return the
    stored batch receipt instead of repeating successful writes.'
  - 'Reject external revision conflicts with zero writes and refresh the dbt projection only after
    the publication command succeeds.'
  - 'Keep the graph publication endpoint product-specific; do not expose the generic batch mutation
    port as a browser-facing file API.'
  - 'Cover conflict, rollback, success, absent-file revision, request/result contract, and adapter
    behavior with automated tests.'
residual_risk: >
  Exact binding between a compiled or executed plan and a later workspace revision is outside this
  MVP. The publication boundary protects the files produced by one accepted client snapshot but does
  not introduce a second store, saga, or durable plan-run transaction.
review_after: 2026-08-29
---
```

<a id="risk-r-20260731-canvas-dbt-authoring-authority"></a>

## Independent risk R-20260731-CANVAS-DBT-AUTHORING-AUTHORITY

```risk-record-v1
---
id: R-20260731-CANVAS-DBT-AUTHORING-AUTHORITY
title: Canvas and dbt files can expose conflicting authoring authority
status: Open
date: 2026-07-31
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  Canvas graph drafts can publish generated dbt artifacts while imported or opened dbt projects
  remain file-backed. Only one mode may authorize mutation for a given Canvas.
risk: >
  Reconstructing authority from route state, graph shape, or marker presence could allow graph
  publication to overwrite externally authored dbt SQL or could expose plan and run actions for an
  ambiguous Canvas.
mitigations:
  - 'Return one canonical CanvasAuthoringAuthorityResolution from GetWorkspaceGraphDraft.'
  - 'Require the active canvasId on PublishGraphDbtWorkspaceArtifacts and validate persisted
    authority plus graph membership before reading or mutating workspace files.'
  - 'Fail closed for missing, mixed, file-backed, or mismatched authority.'
  - 'Treat graph-managed SQL markers as divergence evidence only, never as authority grants.'
  - 'Re-read current files and validate marker ownership server-side before the atomic
    compare-and-swap publication.'
  - 'Serialize Canvas identity and dbt project root authority from authorization through the
    complete artifact publication.'
  - 'Re-read the canonical draft authority after save before replacing the Web query cache.'
  - 'Gate Web code editing, planning, preview, and run posture on the canonical authority.'
  - 'Cover successful resolution, every refusal mode, marker integrity, revision conflict, and
    zero-mutation failure behavior with contract, API, and Web tests.'
residual_risk: >
  A future authoring mode could reintroduce ambiguity if it bypasses the canonical resolution
  contract. The closed union, fail-closed policy, and cross-layer tests make that change explicit
  rather than silently compatible.
review_after: 2026-08-31
---
```

<a id="risk-r-20260731-typed-plan-preview-outcomes"></a>

## Independent risk R-20260731-TYPED-PLAN-PREVIEW-OUTCOMES

```risk-record-v1
---
id: R-20260731-TYPED-PLAN-PREVIEW-OUTCOMES
title: Preview rejection phases can be misclassified across API and Web boundaries
status: Open
date: 2026-07-31
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: Medium
probability: Low
context: >
  PreviewExecutionPlan can refuse an invalid selection before a plan exists or reject a concrete,
  persisted plan after executability validation.
risk: >
  Treating both phases as one generic rejection can fabricate plan identity for selection errors,
  discard the real planRef for invalid plans, or cause Web clients to mistake malformed failures for
  governed product outcomes.
mitigations:
  - 'Publish a closed, versioned union for selection-rejected and plan-invalid outcomes.'
  - 'Prohibit plan identity and persistence fields on selection-rejected payloads.'
  - 'Preserve the exact plan, planRef, persistence evidence, and validation on plan-invalid.'
  - 'Parse typed 422 details strictly at the Web adapter boundary and keep malformed payloads as
    errors.'
  - 'Cover contract, use-case, HTTP, and Web mapping boundaries with focused tests.'
residual_risk: >
  Future rejection phases could require a new contract variant. The closed union and strict parser
  force that evolution to be explicit instead of silently collapsing it into an existing phase.
review_after: 2026-08-31
---
```

<a id="risk-r-20260801-plan-execution-decisions"></a>

## Independent risk R-20260801-PLAN-EXECUTION-DECISIONS

```risk-record-v1
---
id: R-20260801-PLAN-EXECUTION-DECISIONS
title: Persisted plan decisions could diverge from the authorized executable graph
status: Open
date: 2026-08-01
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  Plan Preview now exposes planner-owned RUN, SKIP, and PARTIAL decisions for the authorized graph
  and selected execution closure.
risk: >
  If caller-controlled or stale scope entered the planner, the persisted decision list could
  misrepresent which subjects are authorized or intended to execute.
mitigations:
  - 'Derive decision scope server-side from the protected draft and dbt projection.'
  - 'Reject duplicated subjects and subjects outside the canonical graph in contract and domain
    validation.'
  - 'Normalize and sort decision scope before plan hashing and projection.'
  - 'Persist decisions in the immutable execution plan instead of deriving them in the browser.'
  - 'Prove selected-closure PARTIAL, included RUN, and excluded SKIP outcomes through the live
    protected Canvas flow.'
residual_risk: >
  Future planner graph shapes must continue to derive decision scope from the same authorized graph
  authority. Contract and integration tests fail closed when that invariant is violated.
review_after: 2026-09-01
---
```

<a id="risk-r-20260805-het1-public-vertical"></a>

## Independent risk R-20260805-HET1-PUBLIC-VERTICAL

```risk-record-v1
---
id: R-20260805-HET1-PUBLIC-VERTICAL
title: Heterogeneous plan projection can drift across authoring and runtime plugins
status: Open
date: 2026-08-05
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/temporal-worker
  - packages/@dvt/temporal-dbt-plugin
  - apps/web
severity: High
probability: Low
context: >
  The retained runtime supports bounded object-file loading and dbt through independent worker
  profiles. The historical HET1 Canvas story was retired under GH-3021 after the UI hard cut; its
  removal does not retire runtime integrity, atomicity or lifecycle guarantees.
risk: >
  A regression in authoring metadata, bridge projection, artifact publication, dependency closure,
  runtime composition, or lifecycle observation could execute a relation other than the one the user
  reviewed, start downstream DBT work after an ingestion rejection or accepted cancellation, or
  expose credential or source-payload material in execution evidence.
mitigations:
  - 'Validate the strict v1 object-file/PostgreSQL contract and bridge as a published language;
    persist only scoped configuration and opaque credential references.'
  - 'Reuse BuildDbtPlannerGraphSource, PublishGraphDbtWorkspaceArtifacts, PreviewExecutionPlan,
    StartRun, GetRunStatus, GetRunEvents, CancelRun, and RecoverRun instead of adding parallel
    product rails.'
  - 'Bind the dbt source to the exact staging relation projected from the load node and preserve the
    load-to-model edge as an execution dependency.'
  - 'Keep runtime selection in the existing worker plugin registries and guard the engine,
    RunPlanWorkflow, and dispatcher against step-family conditionals.'
  - 'Retain apps/temporal-worker/test/host/objectFilePostgres.service.integration.test.ts and its PR
    Quality Gate job using real MinIO, Temporal and PostgreSQL, plus the object-file plugin,
    PostgreSQL adapter, contracts, planner, dbt-plugin and lifecycle tests.'
  - 'Preserve historical browser evidence at
    https://github.com/dunay2/dvt/blob/b00ebb72f742cf28a6c6af187c06b9ca95681b18/apps/web/cypress/e2e/canvas/canvas-het1-object-file-dbt-live.cy.ts.
    Current JOIN and Run-controls stories prove their own generic public execution rails, not an
    equivalent acquisition-to-dbt chain or HET recovery to completion.'
residual_risk: >
  No current equivalent complete HET1 browser E2E is claimed after the obsolete UI story retirement.
  Retained provider tests do not by themselves prove Canvas-to-dbt composition or recovery of that
  full chain to completion. Mapping breadth, scale and remote object-store implementations also
  require their own contract and live evidence. This risk remains open.
review_after: 2026-09-05
---
```

<a id="risk-r-20260805-het2-public-vertical"></a>

## Independent risk R-20260805-HET2-PUBLIC-VERTICAL

```risk-record-v1
---
id: R-20260805-HET2-PUBLIC-VERTICAL
title: HTTP artifact acquisition can cross network or evidence boundaries
status: Open
date: 2026-08-05
owners:
  - packages/@dvt/contracts
  - packages/@dvt/artifacts
  - packages/@dvt/temporal-http-json-plugin
  - apps/temporal-worker
  - apps/web
severity: High
probability: Low
context: >
  The retained runtime supports bounded HTTPS JSON acquisition, an immutable artifact store and
  object-file/PostgreSQL loading, with endpoint and credential resolution owned by the Temporal
  worker. GH-3021 retires the superseded HET2 Canvas story, not these runtime guarantees.
risk: >
  A regression in endpoint allowlisting, DNS/IP validation, redirect handling, response bounds,
  content-addressed publication, static loader handoff, or evidence mapping could permit SSRF,
  overwrite an immutable object, execute bytes other than those reviewed in the plan, or expose
  response and credential material in workflow history or run evidence.
mitigations:
  - 'Admit HTTPS GET only through opaque server-owned endpoint and credential references; reject
    arbitrary URLs, methods, bodies, headers and dynamic output binding.'
  - 'Validate every initial and redirected host through DNS/IP policy, pin the selected address,
    require same-origin redirects, and reject loopback/private/link-local/metadata/multicast and
    unspecified destinations outside the controlled non-production fixture, including mapped and
    compatible IPv4-in-IPv6 forms and the well-known NAT64 prefix.'
  - 'Bound connect/request time, redirect count, decoded bytes, identity encoding, status, media
    type, UTF-8, JSON/JSONL syntax, expected size and SHA-256.'
  - 'Publish by conditional create to the exact tenant-scoped content address; verify identical
    retries and refuse conflicts or loader handoff drift.'
  - 'Keep activity results receipt-only. Retain nodeHttpsJsonClient.test.ts,
    HttpJsonArtifactPlugin.test.ts and contentAddressedArtifactStore.test.ts for their adapter/port
    boundaries, plus contract, planner, plan-verifier, object-file service, dbt-plugin and generic
    lifecycle proofs.'
  - 'Preserve historical browser evidence at
    https://github.com/dunay2/dvt/blob/b00ebb72f742cf28a6c6af187c06b9ca95681b18/apps/web/cypress/e2e/canvas/canvas-het2-rest-artifact-dbt-live.cy.ts.
    Generic JOIN and Run-controls LIVE evidence is not a replacement HET2 chain.'
  - 'Guard the engine and generic Temporal adapter against HTTP-specific ownership and keep the
    network implementation in the worker adapter.'
residual_risk: >
  No current equivalent real HTTPS-to-S3-to-PostgreSQL-to-dbt browser E2E, or acquisition recovery
  to completion, is claimed after the obsolete UI story retirement. Adapter/port tests are not that
  service-backed chain. Pagination, OAuth refresh, schema inference, remote cloud-network variance
  and broader formats also require separate contracts and evidence. This risk remains open.
review_after: 2026-09-05
---
```

<a id="risk-r-20260808-pth1-connected-source-truth"></a>

## Independent risk R-20260808-PTH1-CONNECTED-SOURCE-TRUTH

```risk-record-v1
---
id: R-20260808-PTH1-CONNECTED-SOURCE-TRUTH
title: Connected source identity can collide or cross workspace boundaries
status: Open
date: 2026-08-08
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  PTH1 persists connection-qualified warehouse source identity in the workspace graph draft and
  consumes it in source YAML, Canvas presentation, dbt projection and scoped file queries.
risk: >
  A regression that deduplicates by physical object alone, accepts legacy ambiguous metadata,
  guesses a connection or file path, or omits tenant/project/environment from a query key could show
  or execute data from the wrong connection, node or workspace.
mitigations:
  - 'Use one strict versioned ConnectedSourceRef contract and reject unknown fields, credentials,
    legacy top-level identity and malformed existing draft nodes before mutation.'
  - 'Build dedupe and source-YAML identity from JCS-canonical connectionId plus sourceObjectId.'
  - 'Use the same connection-qualified sourceObjectIdentity key when building and retrieving YAML
    bindings so graph metadata cannot diverge from collision-safe generated names or paths.'
  - 'Reject repeated valid ConnectedSourceRef values in an existing draft before indexing, file
    mutation or draft persistence; never use last-write-wins identity semantics.'
  - 'Partition graph, file-tree and file-content queries by the complete server-granted workspace
    scope, with an A/B/A colliding-path regression proof.'
  - 'Project connection facts only from the validated canonical reference, show the full visible
    identifier and never infer missing truth from names or labels.'
  - 'Use the single compatible incoming edge as dbt origin; fail closed for zero, ambiguity or an
    explicitly disconnected selection.'
  - 'Require a strict ConnectedSourceRef with a currently supported warehouse provider before a
    warehouse source can project executable DBT artifacts; reject missing, malformed, legacy or
    unsupported binding state before publication and Preview.'
  - 'Route code actions only to an explicit persisted path or the exact node authoring surface;
    reject guessed paths and unrelated fallback files.'
  - 'Run the protected live source-import proof with PostgreSQL, API authorization, Temporal, two
    real connections to the same relation, a four-size Cypress visibility/cancellation matrix and
    axe serious/critical checks.'
residual_risk: >
  The MVP proves PostgreSQL source import, two colliding physical identities, and one dbt model
  within one browser session. True browser-level 200-percent zoom remains a demanding-user manual
  check beyond the automated 500x330 layout-pressure equivalent. Revoked connection reconciliation,
  cross-session collaborative edits and additional warehouse providers require their own product
  slices and evidence. Qualified YAML binding lookup, global logical-key uniqueness, duplicate
  ConnectedSourceRef rejection and fail-closed artifact readiness are covered. Both P1 review
  threads are resolved and the unrelated Temporal CI race was integrated through #2276. PR #2258
  remains governed by final required checks and branch protection.
review_after: 2026-09-08
---
```

<a id="risk-r-20260813-pth2-dvt-postgres-connection-authority"></a>

## Independent risk R-20260813-PTH2-DVT-POSTGRES-CONNECTION-AUTHORITY

```risk-record-v1
---
id: R-20260813-PTH2-DVT-POSTGRES-CONNECTION-AUTHORITY
title: SQL-first execution could drift from its governed PostgreSQL connection
status: Open
date: 2026-08-13
owners:
  - packages/@dvt/contracts
  - packages/@dvt/adapter-postgres
  - packages/@dvt/artifacts
  - apps/api
  - apps/temporal-worker
  - apps/web
severity: High
probability: Low
context: >
  PTH2 binds one source-owned PostgreSQL ConnectionRef through Canvas draft, preview, stored plan,
  StartRun context, artifact-backed status/recovery and Temporal worker execution.
risk: >
  A future fallback, inferred transform binding, stale credential alias or incomplete scope check
  could execute valid SQL against the wrong PostgreSQL connection without being obvious to the user.
mitigations:
  - Require the same strict ConnectionRef on every SQL-first step and reject mixed or missing
    bindings during contract admission.
  - Resolve the catalog entry and credential alias once at StartRun and persist only secret-free
    immutable context.
  - Provision run-context storage independently from DBT execution, defaulting to the governed
    workspace artifact boundary when no DBT bundle backend is configured.
  - Derive platform run-context creation time from the run UUIDv7 so retries persist byte-identical
    immutable context even when authorization is re-evaluated later.
  - Verify artifact integrity, workspace scope, PlanRef and exact step reference in the worker
    before resolving a credential or opening a pool.
  - Keep a separate pool per admitted binding and prove A/B routing with homonymous SQL objects.
  - Bound retained idle plan sessions with least-recently-used eviction, preserve active leases and
    close each evicted pool so connection churn cannot accumulate worker-lifetime resources.
  - Reject a missing plan resolver or alias without falling back to the capability pool or
    DATABASE_URL.
  - Persist an immutable S3 run-to-reference index with hashed scope keys, conditional writes and
    exact replay verification so status and recovery use the same trusted context as StartRun.
  - URL-encode the tenant segment through one canonical helper for S3 publication, reference
    validation and recovery trust checks.
  - Keep production file artifact reads denied by default and allow only the real-path-scoped
    run-context root provisioned by API composition.
  - Resolve the file/S3 context store once in the artifact bounded context, pass the same mounted
    workspace root to API and worker, and reject production worker startup when it is absent.
  - Declare the identical API/Temporal worker `postgres:<alias>` credential-binding map in the
    canonical operational runbooks.
  - Bind Canvas connection-test feedback to the selected connection and latest request sequence,
    discarding stale or mismatched responses and clearing visible feedback after an authoritative
    selection or node change.
residual_risk: >
  Credential rotation changes the value behind a stable alias for future worker processes. Revoked
  connection reconciliation and multi-provider SQL-first execution require separate product slices;
  neither is represented as complete here.
review_after: 2026-09-13
---
```

<a id="risk-r-20260817-source-data-sample"></a>

## Independent risk R-20260817-SOURCE-DATA-SAMPLE

```risk-record-v1
---
id: R-20260817-SOURCE-DATA-SAMPLE
title: Governed warehouse source samples can expose sensitive row values
status: Open
date: 2026-08-17
owners:
  - '@dvt/contracts'
  - dvt-api
  - '@dvt/web'
severity: Medium
probability: Low
---
The source sample intentionally exposes bounded row values to an authorized workspace user. Residual
sensitivity depends on the selected governed relation. The API mitigates the risk by resolving
credentials server-side, accepting only relation identifiers, checking SELECT privilege, using a
read-only transaction with a local statement timeout, enforcing a maximum of 50 rows, and returning
only strings or nulls. The UI requests 20 rows. Workspace authorization and governed connection
scope remain mandatory controls.
```

<a id="risk-r-20260818-dbt-target-connection-drift"></a>

## Independent risk R-20260818-DBT-TARGET-CONNECTION-DRIFT

```risk-record-v1
---
id: R-20260818-DBT-TARGET-CONNECTION-DRIFT
title: Displayed dbt target could diverge from its governed execution connection
status: Open
date: 2026-08-18
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Low
context: >
  The supported dbt runtime resolves an environment-owned target profile while Canvas also needs a
  user-visible warehouse connection identity for the same execution posture.
risk: >
  If Preview merely displays a connection label without binding it to authorized catalog state, Run
  could execute with stale configuration, use a connection outside the workspace, or expose a
  credential reference as if it were a user-facing connection.
mitigations:
  - The strict Preview provenance binds target, adapter, stable ConnectionRef, and resolution
    source.
  - Preview readiness requires the referenced connection to exist in the authorized workspace
    catalog.
  - Run repeats the catalog lookup and compares the persisted target with current server
    configuration.
  - Preview and Run resolve the effective dbt profile and require its concrete host, port, user, and
    database to match the governed catalog credential before execution is ready.
  - Canvas and Preview share one projection that omits the opaque credential reference.
  - Missing, mismatched, changed, ambiguous, templated, and partially configured targets fail closed
    with deterministic tests.
  - The live proof derives the isolated dbt profile and governed connection from the same database
    URL.
monitoring:
  - Keep the protected dbt Preview and Run live proof in the selected-closure acceptance rail.
  - Reassess this risk before adding editable targets or another dbt adapter.
---
```

<a id="risk-r-20260831-substrait-aggregate-drift"></a>

## Independent risk R-20260831-SUBSTRAIT-AGGREGATE-DRIFT

```risk-record-v1
---
id: R-20260831-SUBSTRAIT-AGGREGATE-DRIFT
title: Bounded aggregation authoring could drift from admitted Substrait semantics
status: Open
date: 2026-08-31
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The first Canvas aggregation cut admits only pinned Substrait v0.101.0 AggregateRel, the
    official functions_aggregate_generic count function with zero arguments, and core i64 output.
    Authoring, reload, card presentation, and PostgreSQL Preview inspect the same typed Plan and
    stable DVT sidecar. Unsupported grouping sets, aggregate filters, phases, invocation modes,
    signatures, types, and bindings fail closed. SUM, windows, HAVING, dbt projection, and generic
    aggregate editing remain candidate or out of scope.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260831-vtx2-substrait-grouping.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitAggregation.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitAggregation.test.ts
    - packages/@dvt/postgres-projection/test/relationalGroupedComposition.test.ts
    - apps/web/cypress/e2e/canvas/canvas-substrait-grouping.cy.ts
  follow_up:
    - Issue #2642 owns any later aggregate capability projection into Canvas.
    - Each additional aggregate or window function requires a separate #2641 admission fixture.
    - Issue #2737 owns dbt projection and external compatibility; this risk does not authorize import.
```

<a id="risk-r-20260831-substrait-union-all-drift"></a>

## Independent risk R-20260831-SUBSTRAIT-UNION-ALL-DRIFT

```risk-record-v1
---
id: R-20260831-SUBSTRAIT-UNION-ALL-DRIFT
title: Bounded set composition could drift from admitted Substrait semantics
status: Open
date: 2026-08-31
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The admitted capability catalogue owns SetRel semantics and target support. The #3271
    development hard cut gives UNION ALL and DISTINCT one ordered N-input operation with at least
    two operands; fixed-arity operators retain their shared contract limits. Authoring and reload
    retain relation, producer and output identities, aliases and explicit output selection.
    Mismatched schemas, providers, connections, unsupported operations, extensions, hashes and
    bindings fail closed. Reconnecting the same wire must not enter staged authoring. Input removal,
    cancellation and reload require browser evidence before integration. Older readers may reject
    new N-input drafts: deploy shared contracts and Web together, without truncation or silent
    migration. Coercion and additional target profiles require separate admission.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260831-vtx2-substrait-union-all.md
    - docs/evidence/ED-20261004-union-inputs-composition-concerns.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.test.ts
    - apps/web/src/app/views/canvas/canvasOutputProjectionSet.test.ts
    - packages/@dvt/contracts/src/contracts/planner/DvtRelationalOperationInputs.ts
    - apps/web/src/app/views/canvas/canvasStagedCompositionConfiguration.test.ts
    - apps/web/cypress/e2e/canvas/canvas-relational-workbench-union.cy.ts
  follow_up:
    - Issue #3271 owns ordered-input editing and the remaining full product acceptance.
    - Each additional Set operation requires separate #2641 admission and target conformance.
    - Issue #2737 owns dbt projection; this risk does not authorize reverse import.
```

<a id="risk-r-20260831-substrait-window-drift"></a>

## Independent risk R-20260831-SUBSTRAIT-WINDOW-DRIFT

```risk-record-v1
---
id: R-20260831-SUBSTRAIT-WINDOW-DRIFT
title: Bounded window authoring could drift from admitted Substrait semantics
status: Open
date: 2026-08-31
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The first Canvas window cut admits only pinned Substrait v0.101.0 Expression.WindowFunction and
    the official functions_arithmetic row_number function with zero arguments, nullable i64 output,
    one partition field, one ASC NULLS LAST ordering field, and no explicit frame. Authoring,
    reload, card presentation, and PostgreSQL Preview inspect the same typed Plan and stable DVT
    sidecar. Unsupported URNs, names, signatures, types, phases, invocations, sort semantics,
    frames, mappings, and bindings fail closed. Other window functions, multiple keys,
    aggregate/window composition, dbt projection, and generic window editing remain candidate or out
    of scope.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260831-vtx2-substrait-row-number-window.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitWindow.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitWindow.test.ts
    - packages/@dvt/postgres-projection/test/relationalGroupedComposition.test.ts
    - apps/web/cypress/e2e/canvas/canvas-substrait-window.cy.ts
  follow_up:
    - Issue #2642 owns later window capability projection into Canvas.
    - Each additional window function or frame requires a separate #2641 admission fixture.
    - Issue #2737 owns dbt projection and external compatibility; this risk does not authorize import.
```

<a id="risk-r-20260902-calculated-column-semantic-drift"></a>

## Independent risk R-20260902-CALCULATED-COLUMN-SEMANTIC-DRIFT

```risk-record-v1
---
id: R-20260902-CALCULATED-COLUMN-SEMANTIC-DRIFT
title: Calculated Canvas fields could drift from their canonical Substrait expression
status: Open
date: 2026-09-02
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    Calculated outputs are admitted only for one bounded ProjectRel shape over a connected
    PostgreSQL ReadRel. Authoring, reload, card presentation and PostgreSQL Preview inspect the same
    typed Plan and stable sidecar. The physical source schema remains unchanged. Duplicate or blank
    aliases, invalid timestamps, missing input or order fields, unsupported functions, providers,
    extensions and relation shapes fail atomically. The Source promotion preserves the original node
    identity and physical binding instead of adding a hidden Transform.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260902-canvas-calculated-column-authoring.md
    - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/frontend-and-ux/canvas-calculated-column-authoring-plan-20260902.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
    - apps/web/src/app/views/canvas/canvasCalculatedColumnAuthoring.test.ts
    - apps/web/src/app/views/canvas/canvasProjectionFunctionContract.test.ts
    - apps/web/cypress/e2e/canvas/canvas-calculated-column-authoring.cy.ts
  follow_up:
    - Issue #2833 owns this bounded authoring slice.
    - Additional expression families require separate capability admission and target conformance.
    - Provider-specific row identifiers remain out of scope; the portable option is ordered
      row_number.
```

<a id="risk-r-20260902-canvas-edge-execution-gate"></a>

## Independent risk R-20260902-CANVAS-EDGE-EXECUTION-GATE

```risk-record-v1
---
id: R-20260902-CANVAS-EDGE-EXECUTION-GATE
title: Canvas edge execution gate could diverge across authoring and execution
status: Open
date: 2026-09-02
owners:
  - packages/@dvt/contracts
  - api
  - web
severity: High
probability: Low
---
mitigation:
  summary: >
    One shared contract policy defines gate parsing, mutation and effective execution. The API
    applies it before planner derivation; Canvas persists only the exceptional closed value and uses
    a three-way reload merge. Structural execution prohibition remains independent. Unknown gate
    values fail closed, a missing edge rejects mutation, and reconnection cannot inherit a previous
    edge gate.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260902-canvas-edge-execution-gate.md
    - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/frontend-and-ux/canvas-edge-execution-gate-plan-20260902.md
    - packages/@dvt/contracts/test/workspace-graph-authoring-edge-execution.contract.test.ts
    - apps/api/test/application/services/resolveAuthorizedExecutableSubgraph.test.ts
    - apps/web/src/app/views/canvas/canvasDraftExecutionGate.test.ts
    - apps/web/src/app/views/canvas/useCanvasEdgeCommandRunner.test.tsx
  follow_up:
    - Issue #2581 owns the low-noise visual valve and its accessible interaction.
    - Any additional gate state requires a separate contract evolution.
```

<a id="risk-r-20260902-transform-column-comment-drift"></a>

## Independent risk R-20260902-TRANSFORM-COLUMN-COMMENT-DRIFT

```risk-record-v1
---
id: R-20260902-TRANSFORM-COLUMN-COMMENT-DRIFT
title: Transform column comments can drift between Inspector and card projection
status: Open
date: 2026-09-02
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    ConfigureCanvasDvtNode writes column documentation to the canonical DVT Substrait field sidecar.
    Inspector rows and card tooltips project that same description, while function and alias
    authoring retain it through the stable field identity. Unknown fields, invalid plans,
    unsupported shapes, and read-only workspaces fail closed without a metadata mirror.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260902-transform-column-comments.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitProfile.v1.ts
    - packages/@dvt/contracts/test/dvt-substrait-profile.contract.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitProjection.alias.test.ts
    - apps/web/src/app/views/canvas/CanvasColumnCommentEditor.test.tsx
    - apps/web/src/app/plugins/graph/GraphNodeColumnCommentTooltip.test.tsx
  follow_up:
    - Issue #2830 owns the bounded authoring and projection behavior.
```

<a id="risk-r-20260902-transform-function-alias-drift"></a>

## Independent risk R-20260902-TRANSFORM-FUNCTION-ALIAS-DRIFT

```risk-record-v1
---
id: R-20260902-TRANSFORM-FUNCTION-ALIAS-DRIFT
title: Transform aliases and displayed lineage can drift from canonical Substrait fields
status: Open
date: 2026-09-02
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    ConfigureCanvasDvtNode applies each function and alias atomically to the same canonical
    Substrait revision. The RelRoot name and DVT sidecar field display name must agree while the
    stable FieldId remains unchanged. Card aliases and lineage are projected from inspection of that
    revision rather than stored separately. Blank and duplicate aliases, unsupported capabilities,
    invalid plans, and provider/type mismatches fail closed. LOWER is admitted only through the
    pinned string-extension identity and proven PostgreSQL round-trip.
  evidence:
    - docs/evidence/ED-20260902-transform-function-alias-authoring.md
    - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitCapabilityCatalog.v1.ts
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitProjection.alias.test.ts
    - apps/web/src/app/views/canvas/canvasNodePresentationProjection.test.ts
    - apps/web/src/app/plugins/graph/GraphNodeColumnSection.test.tsx
  follow_up:
    - Issue #2642 governs further function projection from the canonical catalog.
    - Multi-argument functions require a governed operand-authoring contract before admission.
```

<a id="risk-r-20260903-source-filter-authority"></a>

## Independent risk R-20260903-SOURCE-FILTER-AUTHORITY

```risk-record-v1
---
id: R-20260903-SOURCE-FILTER-AUTHORITY
title: Source operations could diverge from canonical Substrait authority
status: Open
date: 2026-09-03
owners:
  - '@dvt/contracts'
  - '@dvt/web'
severity: Medium
probability: Low
---
mitigations:
  - Admit only the exact standard FilterRel capability with explicit visual and PostgreSQL evidence.
  - Persist operations through ConfigureCanvasDvtNode in the existing semantic envelope.
  - Preserve Source kind, connection authority and stable field provenance across reload.
  - Reject unsupported shapes, fields, types, providers and capabilities before draft mutation.
  - Keep broader operation parity and semantic Preview execution explicit in issue #2894.

evidence:
  - docs/evidence/ED-20260903-source-filter-capability-admission.md
  - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/frontend-and-ux/canvas-source-semantic-operations-plan-20260903.md
```

<a id="risk-r-20260903-vtx1-authoring-hardcut"></a>

## Independent risk R-20260903-VTX1-AUTHORING-HARDCUT

```risk-record-v1
---
id: R-20260903-VTX1-AUTHORING-HARDCUT
title: Removed VTX1 metadata could be mistaken for supported Transform authority
status: Open
date: 2026-09-03
owners:
  - packages/@dvt/contracts
  - web
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The shared contract admits only a strict canonical Substrait semantic document. Web reads
    removed SQL and VTX1 metadata fail closed, an uninitialized Transform must enter through one
    admitted Substrait start action, and all column mutations persist through the same projection
    authority. Existing workspace SQL remains a read-only artifact path rather than an authoring
    fallback.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260903-vtx1-authoring-hardcut.md
    - docs/planning/proposals/mandatory/frontend-and-ux/vtx2-web-vtx1-authoring-hardcut-plan-20260903.md
    - packages/@dvt/contracts/test/dvt-transform-authoring-authority.contract.test.ts
    - apps/web/src/app/views/canvas/canvasDvtTransformAuthoringAuthority.test.ts
    - apps/web/src/app/views/canvas/canvasColumnMappingAuthoring.test.ts
    - apps/web/src/app/views/canvas/canvasAuthoringProjection.architecture.test.ts
  follow_up:
    - Issue #2600 owns the remaining VTX2 convergence increments.
    - Any migration of persisted VTX1 metadata requires a separately governed command.
```

<a id="risk-r-20260903-vtx2-preview-contract-hardcut"></a>

## Independent risk R-20260903-VTX2-PREVIEW-CONTRACT-HARDCUT

```risk-record-v1
---
id: R-20260903-VTX2-PREVIEW-CONTRACT-HARDCUT
title: Preview consumers could attempt the removed SQL-first contract
status: Open
date: 2026-09-03
owners:
  - packages/@dvt/contracts
  - api
  - web
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The shared schema admits only planner-generic-v1, the API has one generic planner path, and
    Canvas no longer exposes or constructs the retired SQL-first profile. Contract, API, web, and
    runtime-proof tests exercise the remaining rail and reject malformed or retired inputs without
    compatibility aliases. The next ordered #2600 slice removes runtime-only SQL step handlers.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260903-vtx2-preview-contract-hardcut.md
    - https://github.com/dunay2/dvt/blob/f921266eaa528f9533cb5545f7678a408920935e/docs/planning/proposals/mandatory/runtime-and-contracts/vtx2-preview-contract-hardcut-plan-20260903.md
    - packages/@dvt/contracts/test/validation/preview.ts
    - apps/api/test/entrypoints/http/previewPlanRoute.inputPolicy.test.ts
    - apps/web/src/app/services/plans/plansService.preview.test.ts
  follow_up:
    - Issue #2600 owns removal of the remaining runtime-only SQL step handlers.
```

<a id="risk-r-20260905-gh-2904-stable-logical-physical-binding"></a>

## Independent risk R-20260905-GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING

```risk-record-v1
---
id: R-20260905-GH-2904-STABLE-LOGICAL-PHYSICAL-BINDING
title: Mutable physical bindings may silently become logical identity authorities
status: Mitigated
date: 2026-09-05
owners:
  - packages/@dvt/contracts
  - packages/@dvt/planner
  - apps/api
  - apps/web
severity: High
probability: Low
---
mitigation:
  summary:
    Stable logical IDs are separate from mutable bindings; existing semantic mutations are
    FieldId-only and physical Source rebind is explicit, verified, CAS-protected, and fail-closed on
    drift.
  evidence:
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260905-gh-2904-stable-logical-physical-binding.md
    - docs/planning/proposals/mandatory/runtime-and-contracts/gh-2904-stable-logical-physical-binding-hardcut-20260905.md
    - packages/@dvt/contracts/test/dvt-substrait-semantic-document-decoding.contract.test.ts
    - packages/@dvt/contracts/test/dvt-substrait-source-rebind.contract.test.ts
    - packages/@dvt/planner/test/unit/determinism.test.ts
    - apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts
    - apps/api/test/application/services/rebindWarehouseSourceUseCase.test.ts
    - apps/api/test/entrypoints/http/warehouseSourceRebindRoute.test.ts
    - apps/web/src/app/views/canvas/canvasColumnProjectionAuthority.identity.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSourceSemanticAuthoring.test.ts
  follow_up:
    - Final PR CI, current-main overlap, and review-thread audit passed on the final implementation
      head.
    - Never restore name, path, ordinal, provider, alias, physical-binding, or compatibility
      fallbacks as logical identity.
```

<a id="risk-r-20260906-opaque-dvt-authoring-identity"></a>

## Independent risk R-20260906-OPAQUE-DVT-AUTHORING-IDENTITY

```risk-record-v1
---
id: R-20260906-OPAQUE-DVT-AUTHORING-IDENTITY
title: Identifier-derived consumers could misbind opaque semantic identities
status: Open
date: 2026-09-06
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    All new production semantic identities use one contracts allocator backed by the existing UUIDv7
    primitive. Existing persisted identities are preserved. Graph context and explicit sidecar
    provenance resolve operands independently of identifier text. Negative and stability tests cover
    clean Source reads, creation results, source replacement, rename, reorder, reload, JOIN and SET.
    Invalid or ambiguous bindings fail closed through existing admission paths.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260906-opaque-dvt-authoring-identity.md
    - docs/architecture/system/subsystems/semantic-transformation/index.md
    - packages/@dvt/contracts/test/dvt-substrait-authoring-identity.contract.test.ts
    - apps/web/src/app/views/canvas/canvasCalculatedColumnAuthoring.test.ts
    - apps/web/src/app/views/canvas/canvasInspectorAuthoringModel.test.ts
    - apps/web/src/app/views/canvas/canvasColumnLineageProjection.test.ts
```

<a id="risk-r-20260907-gh-2173-lazy-source-catalog"></a>

## Independent risk R-20260907-GH-2173-LAZY-SOURCE-CATALOG

```risk-record-v1
---
id: R-20260907-GH-2173-LAZY-SOURCE-CATALOG
title: Partial source catalog pages may hide or misidentify warehouse objects
status: Open
date: 2026-09-07
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: High
probability: Medium
---
mitigation:
  summary:
    Replace eager discovery with one canonical schema-first query contract whose opaque cursors are
    scope-bound, whose global search preserves qualified identity, and whose object pages retain
    explicit row-count and byte-size evidence.
  evidence:
    - docs/adr/ADR-0058-warehouse-source-import-rails.md
    - docs/architecture/components/web/frontend-command-query-rail-inventory.md
    - docs/evidence/ED-20260907-gh-2173-lazy-source-catalog.md
  follow_up:
    - Keep the risk Open until final implementation evidence records bounded provider query count,
      response bytes, latency, cursor rejection and large-catalog truncation.
    - Reject any suffixed contract family, compatibility parser, forwarding export, dual read, dual
      write, client-only global search or exact row COUNT scan during catalog browsing.
```

<a id="risk-r-20260908-algebraic-derived-output-drift"></a>

## Independent risk R-20260908-ALGEBRAIC-DERIVED-OUTPUT-DRIFT

```risk-record-v1
---
id: R-20260908-ALGEBRAIC-DERIVED-OUTPUT-DRIFT
title: Binary Canvas composition could drift from admitted Substrait semantics
status: Open
date: 2026-09-08
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The capability catalog retains the official variadic concat:str identity while the DVT
    invocation profile admits exactly two ordered string operands with ACCEPT_NULLS. Canvas writes
    through ConfigureCanvasDvtNode, allocates a new stable FieldId, preserves both operands, and
    re-inspects the recursive expression after mutation. PostgreSQL rendering consumes that same
    expression through the governed AST. Incompatible types, malformed arity or options, duplicate
    aliases, unknown FieldIds, unsupported providers, Cancel, and read-only scope fail closed.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260908-algebraic-derived-output.md
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - apps/web/src/app/views/canvas/canvasColumnFunctionAuthoring.test.ts
    - apps/web/src/app/views/canvas/canvasProjectionFunctionComposition.test.ts
    - apps/web/cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
  follow_up:
    - Further arities or functions require their own governed capability admission and target proof.
```

<a id="risk-r-20260908-canvas-authoring-field-drift"></a>

## Independent risk R-20260908-CANVAS-AUTHORING-FIELD-DRIFT

```risk-record-v1
---
id: R-20260908-CANVAS-AUTHORING-FIELD-DRIFT
title: Canvas field budgets can drift between semantic and persistence boundaries
status: Mitigated
date: 2026-09-08
owners:
  - packages/@dvt/contracts
  - apps/api
  - apps/web
severity: Medium
probability: Low
context: >
  Canvas authoring previously admitted unbounded human text, PostgreSQL identifiers and Substrait
  values through local validators and unbounded JSONB.
risk: >
  A new editable PCV1 field could omit the shared policy, or a direct database writer could bypass
  the API and persist a value that the product cannot render or publish safely. Existing rows
  written before the CHECK may be incompatible with the v1 hard cut.
mitigations:
  - >
    Keep limits and units in CanvasAuthoringFieldPolicy.v1 and consume those schemas from draft,
    Substrait and Web authoring commands.
  - >
    Keep route tests proving invalid requests are rejected before authorization and persistence, and
    PostgreSQL integration tests proving the named CHECK rejects direct invalid writes.
  - >
    Keep rejected input visible and block Apply without truncation or fallback.
  - >
    Exercise both native transform and namespaced dvt:transform identities for DVT materialization
    policy in shared command/node schemas and the PostgreSQL CHECK; retain foreign-plugin isolation
    and unchanged draft/revision after rejection.
  - >
    Exercise canonical semantic admission and sidecar field-budget rejection with the actual native
    Transform identity; corruption tests must mutate that node, and valid save/reload must preserve
    exact semantic identity.
  - >
    Keep the PostgreSQL constraint NOT VALID so migration does not silently rewrite data; contract
    reads fail closed for incompatible existing rows until an explicit operator cleanup.
review_after: 2026-12-08
---
```

<a id="risk-r-20260910-timestamp-function-drift"></a>

## Independent risk R-20260910-TIMESTAMP-FUNCTION-DRIFT

```risk-record-v1
---
id: R-20260910-TIMESTAMP-FUNCTION-DRIFT
title: Timestamp derivation could drift by target timezone or invocation shape
status: Open
date: 2026-09-10
owners:
  - web
  - packages/@dvt/contracts
severity: Medium
probability: Low
---
mitigation:
  summary: >
    The catalog admits only Substrait v0.101.0 extract:req_ptstz_str with YEAR and UTC. Canvas
    persists the enum, field and timezone literal in the canonical plan, re-inspects the exact
    shape, and PostgreSQL renders that shape through the governed AST with an integral result.
    Unsupported provider, type, signature, arguments, alias or FieldId fails closed.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260910-timestamp-column-function.md
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - packages/@dvt/postgres-projection/test/relationalTemporalScalar.test.ts
    - apps/web/cypress/e2e/canvas/canvas-structured-transform-fields.cy.ts
  follow_up:
    - Every additional temporal component or timezone requires its own governed invocation proof.
```

<a id="risk-r-20260911-semantic-workbench-join-drift"></a>

## Independent risk R-20260911-SEMANTIC-WORKBENCH-JOIN-DRIFT

```risk-record-v1
---
id: R-20260911-SEMANTIC-WORKBENCH-JOIN-DRIFT
title: Join predicates could drift between Canvas, Substrait, samples, and PostgreSQL
status: Open
date: 2026-09-11
owners:
  - web
  - api
  - packages/@dvt/contracts
  - packages/@dvt/postgres-projection
severity: Medium
probability: Low
---
mitigation:
  summary: >
    One typed Substrait expression remains authoritative for editor projection, deterministic graph
    layout, sample rows, and PostgreSQL rendering. Each JOIN stage retains its exact admitted type;
    LEFT, RIGHT and FULL OUTER output nullability follows stable field provenance through Canvas,
    PostgreSQL schema and protected Preview/Run projection. RIGHT remains exact and never swaps its
    operands to mimic LEFT. SEMI and ANTI selectors keep both inputs in predicate scope while only
    the retained input enters emitted-field scope; EXISTS/NOT EXISTS lowering preserves retained
    multiplicity and NULL behavior without DISTINCT, IN, or NOT IN rewrites. Unsupported operands,
    selectors, capability identities, condition groups, source fields, and data types fail closed.
    CROSS uses the exact predicate-free CrossRel identity and preserves both sides in SQL even when
    one contributes no output fields. Left-associated chains and the admitted outer-JOIN subtree are
    rendered without reassociation. Grouping and grouped-window wrappers delegate to that same
    JOIN-family projector, so they cannot downgrade a LEFT stage to INNER. The single V1 contract
    rejects historical INNER workload identities before context or provider effects; current
    producers emit only the JOIN-family profile. Affected plans must be recreated through protected
    Preview, without read-time normalization. Cardinality remains unknown until execution and no
    hidden COUNT or per-input LIMIT is introduced.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - https://github.com/dunay2/dvt/blob/5d0a5952bb7ba76e5bfe5456aec27b61f4b54d09/docs/evidence/ED-20260911-semantic-workbench-join-composition.md
    - docs/evidence/ED-20260919-left-join-end-to-end.md
    - docs/evidence/ED-20261004-single-operational-workload-v1.md
    - docs/evidence/ED-20260919-right-full-join-end-to-end.md
    - docs/evidence/ED-20260919-semi-anti-join-end-to-end.md
    - docs/evidence/ED-20260919-cross-join-end-to-end.md
    - apps/web/src/app/views/canvas/canvasDvtSubstraitJoinComposition.test.ts
    - apps/web/src/app/views/canvas/canvasOutputProjectionComposition.test.ts
    - apps/api/test/integration/dvtSemiAntiJoinPostgres.integration.test.ts
    - apps/api/test/integration/dvtCrossJoinPostgres.integration.test.ts
    - apps/api/test/integration/dvtWrappedLeftJoinPostgres.integration.test.ts
    - packages/@dvt/postgres-projection/test/joinPostgresProjection.test.ts
  follow_up:
    - Each newly admitted operator or function needs contract, inspection, mutation, and
      target-rendering proof.
    - Future JOIN-family admission must prove cumulative nullability across mixed trees without
      introducing another JOIN model or workload profile.
    - Retained-side selectors must continue to prove duplicate preservation, empty-input behavior,
      NULL predicate behavior, ordinal rebasing, and both physical dependencies end to end.
    - Future CrossRel nesting must prove association boundaries, emitted-field multiplicity, and
      closure authorization before entering the supported profile.
```

<a id="risk-r-20260914-transform-result-target"></a>

## Independent risk R-20260914-TRANSFORM-RESULT-TARGET

```risk-record-v1
---
id: R-20260914-TRANSFORM-RESULT-TARGET
title: Authored destination mistaken for authorized runtime publication
status: Open
date: 2026-09-14
owners:
  - '@dvt/contracts'
  - '@dvt/web'
severity: Low
probability: Low
---
description: >-
  An explicit Transform destination is configuration, not evidence of connection authorization,
  existing storage, or completed execution.
mitigations:
  - Strict non-secret references and protected graph persistence
  - No inferred target, unchanged Run capability gate and no SQL in authoring
  - Future admission binds authorization and exact workload identity under issue 3115 and ADR-0066
  - Contract, UI and graph round-trip regressions guard the current boundary
```

<a id="risk-r-20260919-substrait-set-projection-drift"></a>

## Independent risk R-20260919-SUBSTRAIT-SET-PROJECTION-DRIFT

```risk-record-v1
---
id: R-20260919-SUBSTRAIT-SET-PROJECTION-DRIFT
title: Set semantics could drift between Canvas, Substrait, and PostgreSQL
status: Open
date: 2026-09-19
owners:
  - web
  - api
  - packages/@dvt/contracts
  - packages/@dvt/postgres-projection
severity: Medium
probability: Low
---
mitigation:
  summary: >
    One exact Substrait SetRel selector remains authoritative for Canvas presentation, persistence,
    output lineage, PostgreSQL rendering, Preview, and Run. UNION ALL, UNION DISTINCT, INTERSECT
    DISTINCT, EXCEPT DISTINCT, INTERSECT ALL, and EXCEPT ALL share N-input identity and schema
    validation while retaining exact target AST operators, duplicate multiplicity, and primary-input
    orientation. Output projection stays outside Set tuple comparison. Unsupported selectors, stale
    semantic hashes, mismatched ordered schemas, repeated sources, mixed connections, and
    physical-binding drift fail closed.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260831-vtx2-substrait-union-all.md
    - docs/evidence/ED-20260919-union-distinct-end-to-end.md
    - docs/evidence/ED-20260920-intersect-except-distinct-end-to-end.md
    - docs/evidence/ED-20260920-intersect-except-all-end-to-end.md
    - packages/@dvt/postgres-projection/test/setPostgresProjection.test.ts
    - apps/api/test/application/services/dvtSetPreview.test.ts
    - apps/api/test/integration/dvtSetDistinctPostgres.integration.test.ts
    - apps/web/src/app/views/canvas/canvasDvtSubstraitSetComposition.test.ts
    - apps/web/cypress/e2e/canvas/canvas-substrait-set-distinct.cy.ts
  follow_up:
    - Each newly admitted Set selector needs contract, construction, inspection, persistence,
      PostgreSQL, Preview, Run, and browser proof.
    - Schema coercion or name-based alignment must remain a separately governed capability and
      cannot be introduced as an implicit Set fallback.
```

<a id="risk-r-20260920-substrait-order-fetch-drift"></a>

## Independent risk R-20260920-SUBSTRAIT-ORDER-FETCH-DRIFT

```risk-record-v1
---
id: R-20260920-SUBSTRAIT-ORDER-FETCH-DRIFT
title: Ordered relation semantics could drift across Canvas, Preview, Run, and PostgreSQL
status: Open
date: 2026-09-20
owners:
  - web
  - api
  - packages/@dvt/contracts
  - packages/@dvt/postgres-projection
severity: High
probability: Low
---
mitigation:
  summary: >
    One canonical Substrait SortRel/FetchRel tree owns ordering and row selection. Stable FieldIds
    resolve the authored keys, exact i64 values survive transport, the recursive PostgreSQL AST
    projection preserves wrapper position, and the Preview sample cap is applied only after the
    semantic query while repeating its final order at the outer boundary. Unsupported expressions,
    directions, stale identities, negative limits, overflow, and non-admitted compositions fail
    closed.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260920-sort-fetch-end-to-end.md
    - packages/@dvt/postgres-projection/test/sortFetchPostgresProjection.test.ts
    - apps/api/test/integration/dvtSortFetchPostgres.integration.test.ts
    - apps/web/cypress/e2e/canvas/canvas-relational-tree-operators.cy.ts
  follow_up:
    - Every additional sortable expression or provider needs explicit capability admission and
      ordered-sequence proof.
    - TopN, WITH TIES, keyset pagination, durable snapshots, and publication-order claims remain
      separate governed capabilities.
```

<a id="risk-r-20260928-transform-divide-drift"></a>

## Independent risk R-20260928-TRANSFORM-DIVIDE-DRIFT

```risk-record-v1
---
id: R-20260928-TRANSFORM-DIVIDE-DRIFT
title: Transform DIVIDE could drift from admitted Substrait or PostgreSQL bigint semantics
status: Open
date: 2026-09-28
owners:
  - web
  - packages/@dvt/contracts
  - packages/@dvt/postgres-projection
severity: Medium
probability: Low
---
mitigation:
  summary: >
    DVT admits only the exact Substrait v0.101.0 divide:i64_i64 invocation with binary arity, i64
    output, overflow=ERROR, on_domain_error=ERROR, and on_division_by_zero=ERROR. PostgreSQL
    lowering casts both operands to bigint and emits the native division operator. The formula
    compiler and formula editor resolve DIVIDE only through the governed capability catalog. fp64,
    decimal, mixed numeric types, alternative error policies, malformed invocations and unsupported
    providers fail closed.
  evidence:
    - docs/adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md
    - docs/evidence/ED-20260928-transform-bigint-divide.md
    - packages/@dvt/contracts/test/dvt-substrait-capability-catalog.contract.test.ts
    - packages/@dvt/postgres-projection/test/relationalArithmetic.test.ts
    - packages/@dvt/adapter-postgres/test/PostgresAppRoleRuntime.integration.test.ts
    - apps/web/src/app/views/canvas/canvasDerivedOutputFormula.test.ts
    - apps/web/src/app/views/canvas/CanvasDerivedOutputSection.test.tsx
  follow_up:
    - Any fp64 or decimal DIVIDE overload requires independent target-semantic proof and admission.
```

<a id="risk-r-20260929-pending-source-identity"></a>

## Independent risk R-20260929-PENDING-SOURCE-IDENTITY

```risk-record-v1
---
id: R-20260929-PENDING-SOURCE-IDENTITY
title: Pending source restore could silently rebind fields after producer drift
status: Open
date: 2026-09-29
owners:
  - apps/web
  - packages/@dvt/contracts
severity: High
probability: Low
---
mitigation:
  summary: >
    Persist the canonical Read and provenance in the existing authoring contract. Restore exact
    saved identities only after physical-source or model-producer validation. Reject incompatible
    sources explicitly without implicit writes. Retire the positional snapshot shape in place; no
    parallel reader or migration. Keep React coordination, pure Apply policy, identity validation
    and view projection separate, with direct behavior tests and architecture guards. Pending Read
    schemas also require complete root and nested struct identity coverage through one shared
    contract-owned policy. Persistence and schema derivation reject missing, duplicate, out-of-range
    or extra bindings. Restore runs existing schema derivation before exposing fields; previously
    incomplete saved state fails explicitly without repair, migration or write.
  evidence:
    - docs/contracts/planner/workspace-graph-draft-persistence-v1.md
    - https://github.com/dunay2/dvt/blob/c751d0946371f69cd0d001bd5690a92596e8f2c0/docs/evidence/ED-20260929-pending-source-identity.md
    - https://github.com/dunay2/dvt/blob/c751d0946371f69cd0d001bd5690a92596e8f2c0/docs/evidence/ED-20261001-pending-read-coverage.md
    - packages/@dvt/contracts/test/dvt-read-field-coverage.test.ts
    - packages/@dvt/substrait-analysis/test/schemaHierarchy.test.ts
    - apps/web/cypress/e2e/canvas/canvas-pending-read-coverage.cy.ts
    - packages/@dvt/contracts/test/dvt-relational-authoring-draft.contract.test.ts
    - apps/web/src/app/views/canvas/canvasRelationalAuthoringDraft.test.ts
    - apps/web/src/app/views/canvas/CanvasRelationalTreeWorkbench.architecture.test.ts
    - apps/web/cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts
  follow_up:
    - Preserve negative producer-drift tests when extending source admission.
    - Deploy the current reader and writer together; never restore positional binding.
```

<a id="risk-r-20261001-relational-layout-authority"></a>

## Independent risk R-20261001-RELATIONAL-LAYOUT-AUTHORITY

```risk-record-v1
---
id: R-20261001-RELATIONAL-LAYOUT-AUTHORITY
title: Retained relational layout must not become terminal or automatic-position authority
status: Open
date: 2026-10-01
owners:
  - '@dvt/contracts'
  - '@dvt/web'
severity: Medium
probability: Low
description: >
  Completed authoring retains manual layout in the existing v1 DTO. Confusing absent terminal intent
  with disconnection could reopen stale graph wiring. Publishing a provisional visible map as manual
  positions could pin automatic Output before a later root insertion. Older clients do not
  understand the layout-only omission.
mitigation:
  - The schema permits absent terminal intent only with no pending sources or operations.
  - Completion removes terminal authority; restoration uses the current canonical root.
  - Layout-only hydration stays in inspection mode and does not open an edit session.
  - Pointer and keyboard acceptance retain only explicit manual identities; cancellation restores
    the prior map and automatic cards reflow from the current graph.
  - Contract, authoring, mounted and native Apply/reload/root-insertion tests guard the boundary,
    including no implicit Preview or Run and Output non-overlap.
  - Deploy the current API and web contract together; no mixed-client compatibility, migration,
    alias or historical-position rewrite is introduced.
---
```

<a id="risk-r-20261003-canvas-retained-configuration"></a>

## Independent risk R-20261003-CANVAS-RETAINED-CONFIGURATION

```risk-record-v1
---
id: R-20261003-CANVAS-RETAINED-CONFIGURATION
title: Retained disconnected configuration must not become executable against changed Inputs
status: Open
date: 2026-10-03
owners:
  - dvt-web
  - '@dvt/contracts'
severity: High
probability: Low
description: >
  Canonical edge disconnection retains expressions and predicates for later authoring. Treating that
  configuration as executable, or restoring it against a producer with different contents, could
  publish stale fields or predicates.
mitigation:
  - configurationDocument is distinct from semanticDocument in the existing strict contract.
  - Both documents cannot coexist on one operation; configuration ownership is checked.
  - Missing Inputs invalidate the consumer and downstream semantic authority.
  - Producer removal computes downstream reachability before detaching direct inputs.
  - Exact reconnect requires original relation IDs and identical canonical producer documents.
  - Apply removes the former complete document when the selected output is incomplete.
  - Canonical disconnection rejects failed, stale, disposed, and read-only analysis before mutation.
  - Unit, contract, and real-browser evidence is recorded in
    https://github.com/dunay2/dvt/blob/c751d0946371f69cd0d001bd5690a92596e8f2c0/docs/evidence/ED-20261003-canonical-relation-edge-disconnection.md.
---
```

<a id="risk-r-20261005-transform-dependencies"></a>

## Independent risk R-20261005-TRANSFORM-DEPENDENCIES

```risk-record-v1
---
id: R-20261005-TRANSFORM-DEPENDENCIES
title: Calculated-field dependencies must survive edits without snapshot semantics
status: Open
date: 2026-10-05
owners:
  - dvt-web
  - '@dvt/contracts'
  - '@dvt/substrait-analysis'
severity: High
probability: Low
description: >
  Treating aliases as copied expressions can leave consumers using stale logic. Losing group
  ownership or remapping only public field IDs can also change meaning after duplication,
  reordering, hiding outputs or restoring a disconnected graph.
mitigation:
  - Canonical ProjectRel dependencies own execution; no second expression AST is persisted.
  - Explicit V1 ownership validates contiguous Project chains under one public root.
  - Stable producer and public identities are distinct and remapped together on duplication.
  - Cycle, dependent type conflict and referenced-definition deletion reject atomically.
  - Hiding a public output retains its definition and source dependency protection.
  - Legacy copied expressions are never guessed into new dependencies.
  - Readers and writers deploy together as a development hard cut, without migration or V2.
  - Mutation, roundtrip, composition, browser and validation evidence is recorded in
    https://github.com/dunay2/dvt/blob/c751d0946371f69cd0d001bd5690a92596e8f2c0/docs/evidence/ED-20261005-transform-alias-dependencies.md.
---
```

<a id="risk-r-20261011-source-instance-configuration"></a>

## Independent risk R-20261011-SOURCE-INSTANCE-CONFIGURATION

```risk-record-v1
---
id: R-20261011-SOURCE-INSTANCE-CONFIGURATION
title: Source instances could diverge from their configuration owner
status: Open
date: 2026-10-11
owners:
  - dvt-web
  - dvt-api
  - '@dvt/contracts'
severity: Medium
probability: Low
---
mitigations:
  - Reject missing, self, chained, cross-kind and cross-plugin references in the existing v1 draft
    schema.
  - Reject persisted metadata and path overrides on instances.
  - Reuse one definition resolver in Web projections and protected API selection.
  - Route configuration edits and source rebind through the definition while retaining independent
    aliases and placements.
  - Prove repeated drag, save, reload, sibling retention and configuration propagation before
    integration.
  - Deploy updated contract readers before the Web begins writing instance references.
  - Allocate placement identities through the existing secure UUID primitive and reject absent
    entropy; prove both the non-secure browser origin and injected-ID roundtrip without weak
    fallbacks.
  - Keep canonical JOIN type labels separate from sidecar names in shared presentation; omit exact
    operation-code subtitles without rewriting aliases or introducing naming provenance.
evidence:
  - docs/architecture/components/web/code-workbench-workspace-files-component.md
  - docs/evidence/ED-20261011-source-instance-identity.md
```
