---
title: One explicit PostgreSQL Sink publication
status: final
date: 2026-10-15
owners:
  - Contracts
  - API
  - Web
  - PostgreSQL publication
arc_level: ARC-2
breaking: true
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/postgres/DvtPostgresPublicationBoundary.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/postgres/DvtPostgresRelationTarget.v1.ts
  - apps/api/src/application/services/dvtWorkloadPublication.ts
  - apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.ts
  - apps/web/src/app/views/canvas/dvtDestinationBinding.ts
  - apps/web/src/app/views/canvas/DvtPostgresDestinationFields.tsx
  - packages/@dvt/temporal-dvt-postgres-plugin/src/DvtPostgresPluginRunner.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts exec vitest run --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/contracts build
    - pnpm --filter dvt-api exec tsc -p tsconfig.json --noEmit
    - pnpm --filter dvt-api exec tsc -p test/tsconfig.json --noEmit
    - pnpm --filter @dvt/temporal-dvt-postgres-plugin exec vitest run --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/temporal-dvt-postgres-plugin exec tsc -p tsconfig.test.json --noEmit
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dvtSinkPublication.integration.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/workspaceGraphDraftSemanticPersistence.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/adapter-postgres exec vitest run test/PostgresDvtStableTablePublisher.integration.test.ts --maxWorkers=1 --no-file-parallelism
    - pnpm --filter @dvt/web test:e2e:selected-closure:live --spec apps/web/cypress/e2e/canvas/canvas-dvt-sink-publication-live.cy.ts,apps/web/cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts
    - pnpm validate:contracts
    - pnpm arch:deps
---

# One Explicit PostgreSQL Sink Publication

## Reconciliation With Accepted Main

The isolated integration starts at accepted main
`f1fa5d28bffda25604a42ed6eed7613ca925ddd1` and merges the complete product prefix
`b41f9f1babe0fb87b5d9bb5827852fca79ddf840`. The 97-path vertical retains its
contract, protected admission, persistence, runtime and UI together. Later
browser-process experiments remain on the original branch. Current main retains
its session, Source catalogue, native lifecycle, nightly and LOCAL-capture owners.
The integration plan, diagrams, classified conflicts and validation boundary
precede the merge in
[#3115](https://github.com/dunay2/dvt/issues/3115#issuecomment-6322269317).

The original inline Cypress catalogue is reconciled with main's existing
`cypress.catalog.json` authority, under the existing RunWebCypressNative and
RouteChangedWebVitestSuites rails. The owning design and exact additional path
were recorded before that edit in
[#3115](https://github.com/dunay2/dvt/issues/3115#issuecomment-6322326401).
One available Sink spec is added; all existing controlled, available, unavailable
and nightly members remain. The focused routing file first fails nine cases
with 94 passing controls because Sink is unregistered; after registration all
103 pass in 6.09 seconds. The other catalogue/shard/nightly guards pass 77 cases
in 1.24 seconds. No policy parser, runtime selection, timeout or assertion is
relaxed.

Current composed focused checks pass 95 contract cases, 36 API cases, eight
PostgreSQL-plugin cases, 61 Web unit cases, 33 presentation cases and seven
card/Inspector architecture cases. The real dependency/runtime build passes
20 tasks; the five affected package typechecks pass. API and Web lint pass.
Architecture dependency checks pass. Contract fixtures pass 24 checks; golden
paths report five successes, zero failures and the existing issue-10 skip.
These are bounded checks, not full package-suite or provider acceptance.

Review of the imported publication proof found the already-known Run-location
resampling race in a fourth consumer. The
[prior design admission](https://github.com/dunay2/dvt/issues/3115#issuecomment-6322882724)
and Planning DB design `GH-3115-PUBLICATION-RUN-CONSUMER` reuse the existing
RunWebCypressNative rail and source-executing guard. RED reports one failure
(requesting `login` instead of `accepted-run`) and 11 passing controls. Consuming
the validated subject makes all 12 pass in 2.90 seconds, retaining the real
completed-itinerary command and existing plan/scope/row assertions. This guard
observes command arguments; it does not fabricate a completed DOM or HTTP reply.

A supplemental strict compile of the three selected native specs found two
typing errors in the imported publication helper. The
[typing plan](https://github.com/dunay2/dvt/issues/3115#issuecomment-6323073407)
precedes correction: retain the real graph-response subject and narrow decoded
configuration before object comparison. No assertion, compiler rule, retry
limit or timeout changes. Remaining diagnostics are compared with exact main
and are not represented as a passing supplemental Cypress typecheck.

Earlier product/provider/browser results below retain their own source and host
attribution. Fresh composed provider and mandatory hosted acceptance are still
pending. Full local prepush has not run on this composed candidate; the explicit
local validation limit remains in force. The subsequent Source Import reload
failure on main is retained in
[#3604](https://github.com/dunay2/dvt/issues/3604#issuecomment-6322225388), without
an inferred transport or persistence cause. No complete-system acceptance or
resolution of that issue is claimed here.

## Authority And Scope

[#3115](https://github.com/dunay2/dvt/issues/3115) owns the bounded slice. The
[preimplementation design](https://github.com/dunay2/dvt/issues/3115#issuecomment-6202986156)
records current/solution diagrams, alternatives, Fowler analysis, negative paths
and allowed surfaces. Planning DB designs `GH-3115-EXPLICIT-SINK`,
`GH-3115-SINK-CONSUMERS`, `GH-3115-SINK-EVIDENCE`, `GH-3115-SINK-PERSISTENCE`,
`GH-3115-SINK-BROWSER-ADMISSION`, `GH-3115-SINK-CLOSEOUT-V2` and
`GH-3115-MATERIALIZATION-INTENT` and `GH-3115-PUBLICATION-REJECTION-V2` admit the implementation and the subsequent
consumer, persistence, materialization and browser-catalog corrections
before those edits. The local feature references existing ConfigureCanvasDvtNode,
PreviewPlan and StartRun authorities; persistence retains SaveWorkspaceGraphDraft.

Governing sources are AGENTS.md, command/query rail and Fowler governance,
ADR-0035/0064/0066, the
[workload contract](../contracts/planner/dvt-operational-workload-v1.md),
[result-target contract](../contracts/planner/dvt-transform-result-target-v1.md)
and existing protected lowering and PostgreSQL publication boundaries.

The Transform owns its semantic result and ephemeral disposition. One explicit
terminal Sink owns a same-connection table/replace publication. The Sink is the
workload step identity; the Transform remains the semantic identity. Existing
terminal table publication remains admitted. There is no additional durable
intermediate table, executor, command, query, wire version or dependency.

## Implementation Boundaries

- A neutral physical PostgreSQL target replaces Transform-only typing in the
  publisher ports. The versioned Transform target extends that same value object.
- Protected selection checks the exact terminal closure. Shared publication
  intent rejects invalid configurations before SQL artifact publication/lowering.
  A shared contract selector supplies context admission and plugin execution.
- Web uses bounded destination/choice bindings and shared passive fields. CSS
  belongs to its module; no inline styles or extra effect/state authority is added.
  Switching explicitly to ephemeral removes the Transform target atomically.
- Existing draft persistence projects the canonical disposition catalog into its
  SQL constraint. It rejects a target on an ephemeral result without rewriting
  existing drafts or deleting data.
- The retained and new LIVE proofs share public authoring gestures and the row
  oracle, removing duplicated setup from the older long test file.

## Observed RED And GREEN

- Initial contract, protected lowering and authoring RED rejected the new Sink
  shape. The focused positive and negative cases pass after implementation.
- Full Contracts suite initially exposed two obsolete ephemeral-rejection cases.
  Reconciled positive/negative matrices, including both Sink spellings, now pass
  all 840 tests in 76 files.
- API publication/context/projector tests pass 34 cases; the PostgreSQL plugin
  package passes all 14 tests. Production/test type checks passed at that stage.
- The full API unit command passes 1,347 cases. Its existing environment-gated
  PostgreSQL authority/import, onboarding and audit cases skip 27 tests; they are
  not counted as proof. The affected draft and publisher boundaries are exercised
  separately against real PostgreSQL, as listed below.
- Web binding/authoring tests pass seven cases; preview selection and retained
  JOIN/ordering tests pass 14; passive authoring presentation passes seven.
- Real PostgreSQL publication passes the canonical JOIN row oracle, NULL values,
  idempotency and stale fencing, with only the Sink table in the output schema.
  This proof uses the real publisher but an artifact receipt test double; it does
  not alone establish browser-to-Run acceptance.
- Retained stable-table integration passes three cases, including replacement
  with stable table identity and rejection of unmanaged/stale destinations.
- Initial LIVE exposed SQL 23514 on ephemeral draft persistence. The expanded
  persistence matrix reproduced two failures before correction and passes all
  11 real PostgreSQL cases after using the canonical catalog in the constraint.
- Subsequent LIVE exposed the persisted `sink` / projected `dvt:sink` boundary:
  the new selection and pre-existing field policy recognized only the qualified
  spelling. A contract-owned kind catalog now governs selection, metadata checks
  and SQL field-budget projection. Both spellings have positive/negative tests;
  the fixture uses the actual persisted spelling, not a UI-only representation.
  The final focused checks pass eight authoring-contract cases, 15 lowering/context
  cases, 13 real draft-persistence cases and the real Sink-publication case.
- LIVE public UI authoring, Apply, reload, immutable PlanRef, Temporal Run and
  published-row loading pass all three cases across the new Sink and retained
  JOIN specs. The Sink creates its explicit destination and returns the same
  three-row/NULL oracle. The retained terminal path still proves publication A/B
  stale fencing. Provider preflight also executes four real PostgreSQL checks.
  Save-wait interception was subsequently removed to satisfy the draft-boundary
  guard; the final gate repeats that proof using canonical draft GETs only.
- The changed production Web exact-body duplicate guard reports zero candidates.
  Initial lint findings were corrected rather than waived.
- Browser-routing architecture passes 100 cases after explicitly admitting the
  new LIVE spec and shared helper. No capability partition or fail-closed rule is
  relaxed; the retained JOIN proof and the Sink proof are both required consumers.
- Full presentation validation exposed two retained provenance assertions tied
  to the last `code` element instead of the connection selector. Reconciled tests
  observe the named control: common connections are offered but not selected,
  conflicting provenance offers no candidate, and neither edge order mutates the
  draft. Existing explicit-destination preservation assertions remain unchanged.
- Golden contract fixtures pass 25 checks and architecture dependencies pass.
  JSON schemas compile with the same draft/strict settings as CI. An exploratory
  broad Cypress ESLint-project TypeScript invocation exposed existing test-chain
  typing failures; it is not presented as a passing package typecheck. The
  canonical Web typecheck and production build pass separately.
- The committed presentation suite subsequently passed all 1,015 cases in 228
  files. The full unit suite passed 3,062 cases but exposed an obsolete two-mode
  card-menu expectation. Reviewing that consumer found a real transition gap:
  the card retained an existing terminal target on `ephemeral`, unlike Properties.
  A focused command test reproduced rejection before correction. Both consumers
  now delegate the explicit change to one pure materialization policy; invalid
  imported combinations still reject. The LIVE Sink flow now authors a terminal
  target through Properties, switches to ephemeral from the card, reloads and
  executes the explicit Sink. Final results are recorded on the PR and issue.
- Full controlled-browser validation exposed one further retained connection
  consumer that still required the retired inherited-connection label. Its
  replacement preserves manual Source persistence/reload and checks the unselected
  Sink candidate, no implicit writes, EN/ES and accessibility in one locale loop.
  The focused browser proof passes. The unused label was removed from types,
  catalogs and assertions. A separate binding RED reproduced a lost Spanish
  translation for retained `view/append` values; shared binding labels now preserve
  that translation while keeping unsupported choices disabled. All 22 focused
  binding/copy cases pass; no runtime admission or timeout was relaxed.

## Integration Boundary

The complete LIVE catalog subsequently exercised 69 cases: 68 passed and one
exposed lost admission metadata on an unsupported terminal view. The early
publication policy correctly prevented artifact writes but threw its cause as an
ordinary exception, which the selection service mapped to a generic projection
failure. Two real publisher-to-selection composition tests reproduced that loss
for terminal and Sink dispositions. Publication now returns an explicit typed
success/rejection result, preserving the existing rejection vocabulary; unexpected
projection/store exceptions retain the generic sanitized response. Direct test
consumers narrow the result without losing their semantic assertions. The terminal
browser assertion retains the exact cause and zero StartRun requirement, with the
already admitted table-or-Sink localized guidance. This is not a new execution
mode or a relaxed negative check. Final validation is recorded by SHA below the
issue/PR journal, not inferred from this correction.

Review then identified a missing publication-node identity in emitted evidence.
The preimplementation rationale and scope are recorded in
[the review admission](https://github.com/dunay2/dvt/issues/3115#issuecomment-6208329866)
and Planning DB design `GH-3115-PUBLICATION-NODE-EVIDENCE`. The existing strict
evidence contract now requires `publication.nodeId` for both terminal and Sink
publication. The plugin obtains it from the existing publication selector;
GetRunStatus and Web preserve it. Canvas checks the graph ID and contract-validated
explicit destination instead of guessing ownership from legacy relation names.
This removes the relation normalization/fallback code, adds no view responsibility,
and rejects unattributable evidence. The required member is a coordinated
development hard cut, not a compatibility fallback or data rewrite. Separate
contract, producer, API, decoder and pure Canvas tests cover the boundary; the
existing Sink LIVE flow also returns to Canvas to check its published row metric.
Current-head gates and the independent CI transport failures remain in the issue
and PR journal; this evidence document does not turn earlier green checks into
proof of the changed candidate.

The complete committed implementation diff was classified ARC-2 by
`tools/ci/arc-check.mjs`: evidence/risk plus lint, test, schema and golden checks.
Final full-flow evidence, hook-normalized prepush, exact-SHA Planning DB validation,
review and CI are recorded on the implementation PR and governing issue. This
record does not infer those results from the earlier focused checks.

The existing environment is development/test data, but this cut needs no reset.
Integration is not worker activation. Native plural workloads remain on #3207;
broader result dispositions/publications and integral acceptance remain on issues
3115, 2524 and 2599. No new debt, stub, fake executor, rule relaxation or bypassed
hook is accepted. See the
[rollout risk](../risk-register/explicit-postgres-sink-20261015.md).
