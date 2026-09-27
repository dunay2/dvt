---
title: Producer Input and passive Output boundary evidence
status: Draft
date: 2026-09-26
owners:
  - web
  - contracts
  - api
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - scripts/planning-db-operate.cjs
  - scripts/check-feature-mechanization.cjs
  - packages/@dvt/contracts/src/contracts/planner/DvtInputBindings.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitProducerReference.v1.ts
  - packages/@dvt/substrait-analysis/src/producerGraph.ts
  - packages/@dvt/substrait-analysis/src/migrateEmbeddedProducerInput.ts
  - packages/@dvt/postgres-projection/src/relationalSql/producerGraph.ts
  - apps/web/src/app/views/canvas/canvasInputBindingAuthoring.ts
  - apps/web/src/app/views/canvas/canvasRelationOutputAuthoring.ts
  - apps/web/src/app/views/canvas/canvasModelCompositionInput.ts
  - apps/web/src/app/views/canvas/CanvasRelationOutputs.tsx
  - apps/web/src/app/views/canvas/CanvasSelectedUnaryEditor.tsx
  - apps/web/src/app/views/canvas/canvasStagedBinaryConfiguration.ts
  - apps/web/src/app/views/canvas/canvasCompositionOperands.ts
  - apps/web/src/app/views/canvas/canvasRelationalCardExpansion.ts
  - apps/web/src/app/views/canvas/useCanvasRelationalTreeViewport.ts
  - apps/web/src/app/views/canvas/canvasStagedOperationActions.ts
  - apps/web/src/app/views/canvas/canvasStagedOperationDocument.ts
  - apps/web/src/app/views/canvas/canvasStagedTransformConfiguration.ts
  - apps/web/src/app/views/canvas/CanvasStagedTransformInspector.tsx
  - apps/web/src/app/views/canvas/CanvasRelationalOperationPorts.tsx
  - apps/web/src/app/views/canvas/CanvasRelationalTreeOutput.tsx
  - apps/web/src/app/views/canvas/CanvasRelationalPorts.module.css
  - apps/web/src/app/views/canvas/CanvasRelationalTreeCard.module.css
  - apps/web/src/app/views/canvas/CanvasRelationalTreeNodes.tsx
  - apps/web/src/app/views/canvas/relational-layout/RelationalTreeEdges.tsx
  - apps/web/src/app/views/canvas/relational-layout/RelationalEdgeAction.tsx
  - apps/web/src/app/views/canvas/relational-layout/useRelationalCardMovement.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
  - apps/web/src/app/views/canvas/canvasRelationalTreeApplyDraft.ts
  - apps/web/src/app/views/canvas/canvasRelationalAuthoringDraft.ts
  - apps/api/src/application/services/dvtProtectedTransformSelection.ts
  - apps/api/test/application/services/previewCanvasProducerRows.test.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts schema:verify
    - pnpm validate:contracts
    - pnpm test:contracts:compile
    - pnpm golden:validate
    - pnpm --filter @dvt/substrait-analysis test
    - pnpm --filter @dvt/substrait-analysis build
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter @dvt/postgres-projection typecheck
    - pnpm --filter dvt-api lint
    - pnpm --filter dvt-api exec tsc -p tsconfig.json --noEmit
    - pnpm --filter dvt-api exec tsc -p test/tsconfig.json --noEmit
    - pnpm --filter @dvt/web test:unit:run
    - pnpm --filter @dvt/web test:canvas-presentation:run
    - pnpm --filter @dvt/web lint
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-column-lineage-mapping.cy.ts
    - pnpm --filter @dvt/web test:e2e:native --spec cypress/e2e/canvas/canvas-relational-card-movement.cy.ts
---

# Producer Input and passive Output boundary

## Classification and governing authority

For implementation commit `92b666e21`, the repository evaluator run with
`GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` returned ARC-2
because the complete diff touches contracts. It requires evidence and a risk
update, with lint, test, schema-validate and contract-golden checks. It does not
require separate rollout notes or a compatibility matrix.

Issue [#3298](https://github.com/dunay2/dvt/issues/3298),
[ADR-0064](../adr/ADR-0064-substrait-semantic-reference-and-bounded-logical-profile.md),
the [command/query governance](../architecture/command-query-rail-governance.md)
and the [Canvas rail catalog](../architecture/components/web/graph/canvas-workbench-command-query-catalog.md)
govern the change. Planning DB identities consulted include
`GH-3342-COMPOSABLE-RELATION-ANALYSIS-V4`,
`GH-3342-SOURCE-OCCURRENCE-AUTHORING-V2`,
`GH-3237-CANVAS-TRANSFORM-ROW-PREVIEW` and
`GH-3296-SEMANTIC-EDITOR-PRODUCT-V1`.

The implementation status was also published in
[the governing issue](https://github.com/dunay2/dvt/issues/3298#issuecomment-5849632351).

The existing rails remain the owners: `CreateCanvasEdge` admits dependencies;
`ConfigureCanvasDvtNode` owns Input binding and explicit semantic edits;
`ProjectGraphNodeCardReadModel` and `ProjectCanvasRelationalTree` read those facts;
`SaveWorkspaceGraphDraft` persists the draft; `PreviewCanvasTransformRows` owns
protected preview. The shell extraction is a presentation adapter of
`ResolveCanvasWorkbenchContext`, not another authority.

## Behavioral and structural proof

- A producer field is mapped only into a consumer Input slot. Adding another
  producer does not create outputs, copy its operators, infer a JOIN or revive an
  excluded field. The outer model Output is a passive publication with source
  ports, without mapping, selection, reorder or expression controls.
- Staged relational operations expose only the Input ports required by their
  algebraic arity. Producers connect directly to any compatible free port in
  any order. Each instance has at most one consumer across canonical inputs,
  staged ports and terminal Output. A self-join requires separate instances
  with distinct aliases; selection is never an admission prerequisite.
  Occupied-port replacement, producer fan-out and cycles reject atomically.
  Only operation outputs may create a new terminal connection. Existing direct
  source-to-Output wires remain removable without deleting cards or creating
  a hidden Transform; saved drafts are not silently rewritten.
- Incomplete source occurrences, operation nodes, port bindings, terminal
  Output selection and positions persist in the existing protected draft. They
  reopen without materializing a hidden Transform or copying another producer's
  operations.
- Applying a configured operation promotes its semantic document exactly once.
  Applied relation identities are removed from the incomplete-operation graph
  while their positions remain available to the layout projection. Reopening
  therefore renders one canonical operation tree, plus only genuinely incomplete
  consumers or producers. A staged graph is no longer misclassified as an empty
  model by the legacy `cleared` predicate.
- A staged Transform materializes one owned ProjectRel over its connected
  producer, opens the existing field-transformation editor and remains in the
  graph after configuration. Unary editors update their staged operation rather
  than removing its card. Editing a producer uses the complete configured consumer
  document and the existing selected-relation rebinding command. Its staged
  subtrees are then projected atomically; consumer expressions and aliases are
  not rebuilt from defaults. Disconnection remains an explicit invalidation.
  Only the operation connected to terminal Output becomes the model authority.
- Explicit operations inside the model define its outputs. Consumers reference
  the immediate producer's published stable FieldIds through a local Read;
  producer operators are resolved for analysis/SQL, not copied into the consumer
  document. Alias changes do not replace stable identities.
- Input provenance is optional typed metadata on the existing dependency edge.
  Removing an unconsumed binding, mapping a second producer, saving and reloading
  preserve the boundary. Consumed, unavailable, excluded, foreign, read-only or
  stale bindings reject without a partial write.
- Model/physical and model/model composition reuse the shared relation analysis
  and SQL graph. Tests cover six relational operations, append, self-join aliases,
  connection mismatch and missing published FieldIds. Partial physical inputs
  require an explicitly authored Transform before JOIN/CROSS/SET; composition
  never inserts a hidden Project to change DISTINCT or set semantics.
- The protected API rereads the authorized draft and validates exact selected
  closure, direct dependencies, cycles, physical source coverage and a single
  connection before provider access. Selected-operation preview is not widened
  to the terminal consumer's output or operational Run admission.
- The duplicate automatic-mapping/output writers and unused JOIN physical reader
  were removed. The remaining output command delegates to selected-relation
  operations. Shared metadata controls, shell DTO assembly and pure working-set
  reconciliation were extracted without a second controller or store.
- Output selection keeps one stable row identity while the relation session
  acknowledges its next revision. Semantic digest changes no longer restart
  relational viewport fitting; the initial fit and explicit Fit command are
  one-shot operations, so checkbox changes preserve focus, zoom and scroll.
- Relational cards and typed ports use shared semantic CSS modules. Components
  expose interaction state through attributes; they do not assemble utility
  chains or embed visual port positions. Calculated canvas coordinates remain
  geometry data. The removed class-name facade and unused port style have no
  remaining consumers.

Mechanization was reconciled through `RecordFeatureMechanizationRail`, including
the cross-context `GH-3298-PRODUCER-CONSUMER-INPUT-BOUNDARY` declaration and the
existing shared analysis, selected-output and card-presentation declarations.
References to deleted mapping/automap/physical-reader modules and removed output
writer symbols were replaced or retired while preserving active readers and
existing rails. This registration happened after implementation; it is not
evidence of pre-implementation mechanization admission. No Planning DB import,
direct SQL mutation or authority reconstruction was used.

## Executed validation

| Command or proof                                              | Observed result                                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @dvt/contracts test`                           | 679 tests passed in 66 files                                                                                           |
| Contracts `typecheck` and `schema:verify`                     | Passed; 25 schema artifacts verified                                                                                   |
| `pnpm validate:contracts`                                     | 25 checks passed; existing missing glossary source was explicitly skipped                                              |
| `pnpm test:contracts:compile`                                 | Passed                                                                                                                 |
| `pnpm golden:validate`                                        | 5 passed, including two preserved deprecated baselines; existing retry case skipped pending #10                        |
| `pnpm --filter @dvt/substrait-analysis test` and `build`      | 103 tests passed in 18 files; build passed                                                                             |
| `pnpm --filter @dvt/postgres-projection test` and `typecheck` | 239 tests passed in 28 files; types passed                                                                             |
| API focused command below                                     | 76 tests passed in 7 files                                                                                             |
| API production/test TypeScript checks and lint listed above   | Passed                                                                                                                 |
| `pnpm --filter @dvt/web test:unit:run`                        | 2,175 tests passed in 382 files                                                                                        |
| `pnpm --filter @dvt/web test:canvas-presentation:run`         | 791 tests passed in 205 files, including Output focus and viewport-stability regressions                               |
| `pnpm --filter @dvt/web lint` and `typecheck`                 | Passed                                                                                                                 |
| Native Cypress command listed above                           | 4 tests passed, including second-producer mapping, persistence/reload, Output rejection and accessibility              |
| `pnpm docs:feature-mechanization`                             | Passed with 223 effective manifests before final retired-reference reconciliation; see current closure condition below |
| Commit helper and enabled hooks for `92b666e21`               | Passed                                                                                                                 |

The focused API command was:

```text
pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/previewCanvasProducerRows.test.ts test/application/services/previewCanvasTransformRowsUseCase.test.ts test/application/services/dvtOperationalWorkloadProjector.test.ts test/application/services/dvtNInputPreview.test.ts test/application/services/dvtPostgresTargetProjectionPublisher.test.ts test/application/services/dvtRepeatedSourceProjection.test.ts test/application/services/dvtRepeatedSourceRun.test.ts
```

Shared package lint also passed:

```text
pnpm exec eslint "packages/@dvt/contracts/**/*.{ts,tsx}" "packages/@dvt/substrait-analysis/**/*.{ts,tsx}" "packages/@dvt/postgres-projection/**/*.{ts,tsx}" --ignore-pattern vitest.config.ts --max-warnings 0
```

The freely connected relational-draft extension was validated again on
2026-09-27:

- `pnpm --filter @dvt/web test:canvas`: 2,339 tests passed in
  511 files.
- Web lint and typecheck: passed.
- Contract tests: 684 tests passed in 67 files; typecheck passed.
- `pnpm lint:md`: 1,263 Markdown files checked with no issue.
- `pnpm governance:refresh`: stable after two generation passes;
  6,250 files governed and no drift.
- `pnpm docs:feature-mechanization:implementation`: GH-3298 symbols
  accepted; the gate fails only on the disclosed historical VTX1 cycle and
  its five inherited symbols.
- `pnpm verify:prepush`: changed-file formatting, frontmatter, ARC evidence
  and Markdown checks passed; the command then failed on that same global
  VTX1 mechanization finding.

The applied-tree normalization and presentation cleanup were validated again
on 2026-09-27:

- Contract tests: 685 tests passed in 67 files; contract typecheck passed.
- Web typecheck and lint passed.
- Focused unit tests for relational draft restoration and Apply passed: 6 tests.
- Focused presentation tests for Apply/reopen/Output, card movement, disclosure,
  deletion and node shell passed: 30 tests.
- The Canvas architecture test passed its 3 checks, and every touched TypeScript,
  TSX and CSS file remains at or below 200 lines.
- The full web unit suite passed 2,197 tests in 385 files. The full presentation
  run is not counted as green: 1,357 tests passed and one untouched DBT metric
  expectation failed; its isolated rerun reproduced the same mismatch. No test,
  timeout or rule was changed to hide it.

The staged-operation semantic cycle was validated again on 2026-09-27:

- `pnpm --filter @dvt/web test:canvas`: 2,364 tests passed in 527 files.
- Focused Transform, Apply, removal, join-chain and staged-action tests: 18 tests
  passed in 6 files.
- Web lint and typecheck passed; `git diff --check` passed.
- The relational draft contract accepts a fully connected operation only when
  its semantic document owns the operation output identity. Its focused contract
  suite passed 7 tests.
- The complete contract suite passed 686 tests in 67 files; contract typecheck,
  schema verification, contract compilation, contract validation and golden
  validation passed.
- Every touched TypeScript, TSX and CSS file remains at or below 200 lines.

The new mechanization references were recorded additively through
`RecordFeatureMechanizationRail` under `ConfigureCanvasDvtNode`,
`SaveWorkspaceGraphDraft` and `ProjectCanvasRelationalTree`. No duplicate rail,
direct database mutation or Planning DB import was introduced.

## Compatibility and verification limits

### Single-consumer correction, 2026-09-27

The internal editor now admits only one consumer per relation instance across
canonical inputs, staged operation ports and terminal Output. Source/input
cards connect to operations, and operations may feed another operation or the
passive terminal. Reusing one instance on two JOIN ports is rejected; two
separately aliased instances remain valid. No outer dependency rule or saved
draft schema was changed.

The initial inspection view now delegates terminal disconnection to the same
existing command as the draft view. An occupied terminal disconnects even when
a producer was selected. Hand-mode panning no longer captures SVG button
actions. Neither disconnection nor rejected rewiring creates a Transform,
deletes a source card, resets layout or rewrites an existing saved draft.

Five command/interaction regressions failed before the admission correction;
the hand-mode regression also failed before its selector correction. The final
focused command passed 97 tests in 28 files:

```sh
pnpm --filter @dvt/web exec vitest run --config vitest.canvas.config.ts CanvasRelationalTreeWorkbench CanvasRelationalTreeView.test RelationalViewportPan.test canvasStagedOperationActions canvasCanonicalRouteAuthority.architecture canvasDraftRecoveryBoundary.architecture canvasInteractionCommandSurface.architecture --maxWorkers=2
```

The earlier `pnpm --filter @dvt/web test:canvas:run` is not counted as green:
2,334 tests passed; the run included failed expectations for retired fan-out
behavior, architecture timeouts and one worker RPC timeout. Updated connection
scenarios and the architecture checks passed in focused reruns with
unchanged test timeouts. No checks were disabled.

### Movable cards and visible disconnection, 2026-09-27

Source, operation and passive Output cards share one presentation-only movement
gesture and one position map. Output movement changes geometry only; it does not
change its producer, create an operation or write semantic state. The node overlay
now yields empty space to the underlying edge actions, while each card remains an
interactive island. Hovering or focusing a removable connection exposes its danger
stroke. Left click selects and leaves the connection intact. The contextual
Delete command or Delete/Backspace delegates to the existing disconnect command.

Focused geometry and interaction tests cover a source, canonical operation,
pending operation and Output. The Cypress test drives actual browser pointer
capture and proves that Output moves, its edge follows, and a normal line click
selects before Delete disconnects the producer. It also proves that card movement does not open editors,
request data or persist semantic writes. This browser fixture is not live-provider
verification.

The additional command `pnpm --filter @dvt/web exec vitest run --config
vitest.canvas.config.ts src/app/views/canvas/canvasAuthoringProjection.architecture.test.ts
--maxWorkers=1` passed its one test. Package commands
`pnpm --filter @dvt/web typecheck` and `pnpm --filter @dvt/web lint` also passed.

`pnpm docs:status:generate --code-state-only` and `pnpm governance:refresh`
passed without importing or rebuilding Planning DB. The existing catalog and
risk entry were updated; no debt entry, stub, new semantic rail or fallback was
introduced. The repository-wide pre-push limitation below remains separately
reported rather than hidden by the focused green result.

The new `producerRef` and `inputBindings` fields are optional. Existing documents
without them remain admitted, but this does not promise that older strict clients
can read newly authored documents. Web, API and shared packages require a
coordinated deployment. Embedded producer migration requires an exact compatible
match and never guesses producer identity from display names.

The Cypress flow uses the existing stateful transport stub. It proves the real
browser interaction boundary and draft roundtrip against that fixture, not live
PostgreSQL execution or deployed API persistence. API unit tests and SQL assertions
likewise do not prove a live database query. Complete chained `StartRun` support
is not claimed; its existing bounded admission remains enforced. Incomplete draft
persistence does not grant execution readiness.

`pnpm verify:prepush` was executed against implementation commit `37044febf`.
It is not reported as green because the global feature-mechanization step fails
on the historical VTX1 record described below. Earlier presentation runs had
timeout failures; those are not reported as passing.
Preparation repeated across JOIN/CROSS creation tests was removed, and cancel/apply
were separated into independent cases with their original assertions and timeouts.
The complete isolated presentation suite then passed. No test timeout, lint
rule, hook or required gate was disabled or relaxed. The baseline glossary and
retry-golden omissions above are disclosed rather than counted as new proof.
No new debt entry, production stub, fake-success path or hidden fallback was added.

The final implementation gate also exposed a historical mechanization cycle,
`VTX1-COLUMN-LINEAGE-MAPPING-PROJECTION/column-mapping-authority`, whose only
patch surface was the retired mapping writer. Canonical reference pruning leaves
that cycle with an empty `patchSurfaces` array; the existing record command does
not expose arbitrary cycle-ID reconciliation. Current test references and new
symbols have been registered, but this cycle is a closure blocker until resolved
through an approved canonical operation. No fake path or validation bypass is
used to claim completion.

## Integration review, 2026-09-27

The review reproduced and corrected two real browser defects: the staged
Transform inspector nested a second width-constrained panel and overflowed the
viewport; toggling output inclusion disabled the focused checkbox and moved its
DOM row. The duplicate panel was removed. Output rows now retain their position
during inclusion changes, and busy commands reject duplicate gestures without
disabling the focused control. Explicit reordering remains supported.

The review also replaced destructive consumer reconstruction with the existing
selected-relation command over the complete configured document. Regression
coverage retains consumer aliases after a producer rename, rejects an isolated
producer snapshot that omits its configured consumer, and rejects removal of a
field required downstream without advancing the accepted revision.

The Transform browser test now authors two derived fields, toggles an output
without losing focus, explicitly connects terminal Output, applies, reloads and
reopens the same operation. The producer-consumer test restores an Input mapping
and proves that neither connection nor an Output drop copies producer operations.
These tests previously asserted the retired automatic-output behavior. The DBT
header assertion was aligned with the existing content-sized materialization
rail contract; no last-run placeholder was added to production.

Observed commands in this review:

- `pnpm --filter @dvt/web test:canvas:run`: 2,364 tests in 527 files passed
  before the final consumer-preservation correction.
- Focused Canvas tests for staged editing, Transform, JOIN and output ordering:
  12 tests in 4 files passed after that correction.
- Native Cypress `canvas-relational-card-movement.cy.ts`: 4 passed.
- Native Cypress `canvas-column-lineage-mapping.cy.ts`: 4 passed.
- Native Cypress `canvas-transform-stage.cy.ts,canvas-model-chain-fields.cy.ts`:
  both passed after reproducing the clipping and focus failures.
- Web lint and typecheck passed. The full presentation run had 1,357 passing
  tests and one 5-second module-reevaluation timeout in `AppServicesContext`.
  Its unchanged isolated rerun and the corrected DBT test passed all 15 tests;
  the timed-out full run is not reported as green.
- The complete branch ARC evaluator returned ARC-2, requiring lint, tests,
  schema validation, contract golden checks, evidence and risk; no rollout or
  compatibility artifact was required.
- `GIT_BASE=0c403a023 GIT_HEAD=218b9fd83 pnpm
docs:feature-mechanization:implementation` failed on the historical empty
  VTX1 cycle, five missing historical test references and contradictory
  cross-rail forbidden surfaces. No validator or authorization rule was relaxed.

This is not integration approval. Pending binary composition of two transformed
producers, CROSS/SET staging and the remaining legacy pending-JOIN browser flows
still require closure before the complete editor scope can be declared accepted.
The governance-maintenance expansion has been requested separately; no database
import or direct mutation was used. No new stub, fake-success path, skipped test
or debt entry was introduced by this review.

## Authorized governance reconciliation, 2026-09-27

The user explicitly authorized repairing the maintenance command before integration.
The design and negative-test matrix were recorded in the existing feature-mechanization
read-model contract and in Planning DB as `GH-3298-MECHANIZATION-RECONCILIATION`
before implementation. The existing `RecordFeatureMechanizationRail` and
`ValidateFeatureMechanizationImplementation` authorities are reused by reference.

The new optional named-cycle argument updates one existing cycle under an exact
expected revision, explicit admitted patch surfaces and the existing audited,
idempotent write boundary. Unknown or ambiguous identities, missing/stale revisions
and forbidden/out-of-scope surfaces reject. Unrelated cycles remain unchanged.
No schema, import, bulk deletion or alternate write command was introduced.

The reader shares feature-wide governance and test evidence while projecting each
distinct allowed/forbidden surface set independently. This preserves both common
evidence and distinct rail permissions. The implementation guard and its specificity
rules are unchanged. Tests prove that equally specific conflicting restrictions
still reject, and missing/invalid evidence remains an error. A subsequent red test
reproduced missing citations caused by separating evidence as well as permissions;
the correction shares evidence without transferring surface authorization.

The first focused run failed three new regressions. After correction,
`node --test --test-reporter=spec scripts/check-feature-mechanization.test.cjs
scripts/planning-db-operate.test.cjs scripts/planning-db-schema.test.cjs
scripts/lib/feature-mechanization-db-reader.test.cjs` passed 181 tests.
`pnpm test:planning:db` passed 500 tests with zero skips. ESLint on the four
changed scripts passed. These CommonJS surfaces do not have a TypeScript build;
the parser, planner, writer, schema and query tests exercise their contract.

Four retained VTX1 records were reconciled through the application command with
their observed revisions: ConfigureCanvasDvtNode 1 to 2, ProjectCanvasAuthoringDraft
1 to 2, SaveCanvasAuthoringDraft 0 to 1 and GetWorkspaceGraphDraft 0 to 1. Their
allowed and forbidden scopes were retained. The empty historical cycle and five
missing test-reference declarations now point to current Input/lineage evidence.
`pnpm --filter @dvt/web test:canvas:run canvasInputBindingAuthoring.test.ts
canvasColumnLineageProjection.test.ts --maxWorkers=2` passed all 18 tests.

`pnpm docs:feature-mechanization:implementation` then passed with 422 DB
manifests. This working-tree result is not a substitute for final committed-SHA
validation or the complete pre-push gate.

The final Canvas review rerun also passed 2,364 tests in 527 files. These results
do not close the separately listed binary composition, CROSS/SET, browser-flow or
live-provider acceptance gaps. Integration still requires the complete pre-push
gate and fresh exact-base/head validation; no failed gate is bypassed.

## Binary-path retirement and interaction review, 2026-09-27

Governed by AGENTS.md, the governance inventory, ADR-0064, command/query rail
governance, the semantic-derived-output authoring plan and Planning DB designs
GH-3342-COMPOSABLE-RELATION-ANALYSIS-V4 and GH-3296-SEMANTIC-EDITOR-PRODUCT-V1.
The existing GH-3298 ConfigureCanvasDvtNode declaration records the implementation
and negative evidence; no parallel product command was created.

Retired both source-shape-specific JOIN configurators and their special decoder.
One binary configurator composes exact producer subtrees through the canonical
JOIN/CROSS/SET builder. It clones and rebases relation/function anchors without
changing stable identities. Tests reject shared occurrences, cross-connection
operands and incompatible SET fields. The common binary inspector replaces the
JOIN-only variant. Deleted tracked files remain recoverable through Git.

The review reproduced Filter Output resetting to Properties after a column edit.
The inspector is now retained by relation identity while its asynchronous form
refreshes. Reordering retains the focused row's tab stop; configured staged
unary operations reuse the same inspector instead of a properties-only variant.
Checkbox, keyboard and pointer tests use the real semantic command/revision.
The React review prompted stable frame/control identity and reuse of the shared
inspector rather than another state-owning panel.

Manual card positions previously overrode all extra spacing for lexical detail.
The visual geometry now reserves expansion space along each axis, including
pending cards and terminal Output. Collapse restores authored coordinates and
movement converts display coordinates back without accumulating offsets. Edges
use the expanded card bounds. Zoom does not remount cards, save semantics or
request provider data. The geometry types and movement conversion stay in their
shared owners; architecture size limits were not raised.

Modern Transform type labels now accept admitted NOT NULL inputs without
changing their semantic type. The full suite also caught rejection of an existing
unknown-type field alias; its original passthrough admission was restored while
function capability validation remains in place.

Observed focused validation:

- Binary composition: 25 tests passed, including all 15 binary choices with two
  transformed producers and colliding function anchors.
- Filter/geometry/edges: 19 tests passed; checkbox, pointer and keyboard gestures
  retain the same DOM frame, selected tab and focus.
- Calculated-column queue, derived output and binary composition: 32 passed
  after reproducing and correcting unknown-type alias rejection.
- Workbench architecture: 3 passed after extracting geometry responsibilities.
- Native Cypress pending binary and card movement: 10 tests passed, zero skips.
  Covers cancel, JOIN/CROSS/UNION Apply/reopen, Filter Output gestures, repeated
  zoom, card movement, terminal disconnection and no implicit data execution.
- Web lint and typecheck passed. E2E build passed with the existing chunk-size
  warning. The browser proof uses controlled API transport, not live PostgreSQL.
- Feature mechanization passed with 422 DB manifests on the working tree.
- Complete diff classification remains ARC-2: evidence/risk, lint/tests,
  schema validation and contract golden checks are required.

The first complete Canvas run overlapped active corrections and ended with
2,385 passing tests and four failures (zoom spacing, its initial DOM selector,
unknown-type alias and architecture size). It is not counted as green; the
affected reruns above passed. A fresh full run is required for committed closeout.

Integration is not approved by these focused results. The pre-push integrity
gate separately reports one duplicate ConfigureCanvasDvtNode rail, one component
path missing from its DB inventory and four missing document-source inventory
entries. These paths exist in Git; no import/rebuild or gate relaxation was used
to erase the discrepancy. Remaining legacy browser helpers and live-provider
acceptance are not silently declared complete. No new debt record, stub,
placeholder, fake-success branch or bypass was introduced.

## Committed validation and integration status, 2026-09-27

Product commits are `3ef7325cce5253cd65f76e453afeb65146d10238`
and `802a20080d7bbcf1a003203dbf1f040bd7d7e366`. The follow-up
removes duplicated configurator wiring: the staged-operation configuration hook
returns the same configurator used for initial connections and subsequent
producer availability. No architecture limits were changed.

Observed commands and results on this product state:

- `pnpm --filter @dvt/web lint` and
  `pnpm --filter @dvt/web typecheck`: passed.
- `pnpm --filter @dvt/web test:e2e:native --spec
cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts,cypress/e2e/canvas/canvas-relational-card-movement.cy.ts`:
  10 passed, zero failed/pending/skipped. The build succeeded with the existing
  chunk-size warning. The runner uses real Electron and controlled API transport.
- `pnpm --filter @dvt/web test:canvas:run --maxWorkers=4`: the preceding
  full run passed 2,388 tests and failed the coordinator's post-format line limit.
  The duplicate wiring was removed; its unchanged architecture test now passes.
- `pnpm --filter @dvt/web test:canvas:run --maxWorkers=8`: the final
  parallel full run passed 2,382 tests and hit seven 5-second timeouts in six
  files. This run is not reported as green.
- `pnpm --filter @dvt/web test:canvas:run
CanvasRelationalTreeWorkbench.join-chain.test.tsx
CanvasRelationalTreeWorkbench.output-order.test.tsx
CanvasRelationalTreeWorkbench.reopen.test.tsx
CanvasRelationalTreeWorkbench.transform.test.tsx
CanvasShell.semanticEditor.navigation.test.tsx
DvtSubstraitCompositionStartSection.predicate.test.tsx --maxWorkers=1`:
  all 10 tests in those six files passed without changing timeouts or assertions.
  A separate output-order/architecture rerun passed six tests. The difference
  supports host-concurrency contention, but does not replace a clean complete run.
- `pnpm --filter @dvt/contracts test --maxWorkers=2`: 686 passed.
- `pnpm --filter @dvt/substrait-analysis test`: 103 passed, including build.
- `pnpm --filter @dvt/postgres-projection test`: 239 passed, including build.
- `pnpm --filter dvt-api test:unit
test/application/services/previewCanvasProducerRows.test.ts --maxWorkers=1`:
  nine passed. This is not live-provider execution proof.
- `pnpm --filter @dvt/contracts typecheck`,
  `pnpm --filter @dvt/substrait-analysis typecheck` and
  `pnpm --filter @dvt/postgres-projection typecheck`: passed.
- The contracts workflow's AJV compile commands passed for both present schemas
  under `docs/contracts`, selecting draft 2020-12 or draft 7 as specified.
  AJV emitted its existing ignored-URI-format warning.
  `pnpm validate:contracts`: all 25 golden-fixture checks passed; the command
  reported its existing absent-glossary skip. No live golden-path execution was run.
- `node tools/ci/arc-check.mjs` classified the complete
  `0c403a02393388b52305c91db9844ddae4630db7...802a20080d7bbcf1a003203dbf1f040bd7d7e366`
  diff as ARC-2. `node tools/ci/doc-check.mjs` passed using the evaluator's
  actual classification/requirements and the same base/head.
- `pnpm governance:refresh`: passed, 6,283 governed files, zero drift and
  zero ungoverned files. No Planning DB import/rebuild was performed.
- `pnpm verify:prepush`: failed at `planning:db:integrity:check`.
  The same outstanding catalog violations remain: one component path without
  inventoried files, one exact duplicate rail and four missing source-file
  inventory entries. Later pre-push steps were not reached.

The initial exact-SHA mechanization check additionally identified four undeclared
geometry types. They were declared on the existing ConfigureCanvasDvtNode rail
through its revision-checked application command (revision 19), retaining its
authority and permission scopes. The rerun of
`pnpm docs:feature-mechanization:implementation` passed with 422 DB manifests,
using the exact base/head above and excluding worktree changes.
This declaration is not a repair of the
separate Planning DB inventory/integrity findings.

No push, PR or merge was performed. Integration remains blocked; legacy browser
flows and live-provider acceptance described above are not closed by these
focused results. The selected output frame/control identity follows the React
review, and zoom remains a visual projection, not a semantic write. No new debt,
stub, placeholder, disabled rule, increased timeout or bypassed hook was added.

## Hover-only Execute correction, 2026-09-27

The user's final visibility rule supersedes the earlier always-visible request.
The governing visual-token component contract was updated before implementation;
the existing GH-3298 ConfigureCanvasDvtNode reference declaration records the
browser proof on revision 20. Execute retains the existing source/transform
preview queries and authorization; showing the action does not call either query.

`CanvasNodeShell.module.css` now owns one reveal rule for outer Source/Model and
inner relational cards. `CanvasRelationalTreeGraphNode.tsx` supplies the inner
card boundary. The action remains mounted and keeps its space; hover or
keyboard-visible focus reveals it. Disabled actions share the same rule.
No React hover state, duplicate component or execution path was introduced.

Native browser pointer coordinates are shared with the existing movement helper
in `cypress/support/relationalWorkbench/pointer.ts`. The data-action spec verifies
leaving the card, crossing the card/button gap, keyboard focus, disabled actions,
stable DOM and geometry, and absence of query/save side effects.

Validation observed:

- Before the fix, the native data-action spec passed five existing tests and
  failed all three initial hover regressions: actual opacity 1, expected 0.
- `pnpm --filter @dvt/web test:e2e:native --spec
cypress/e2e/canvas/canvas-node-data-actions.cy.ts,cypress/e2e/canvas/canvas-relational-workbench-pending-join.cy.ts,cypress/e2e/canvas/canvas-relational-card-movement.cy.ts`:
  20 passed, zero failed/skipped. This includes the expanded 10-test data-action
  suite and the existing JOIN, Output gestures, movement and zoom regressions.
  Build passed with the existing chunk-size warning; transport is controlled,
  not a live PostgreSQL acceptance run.
- `pnpm --filter @dvt/web lint` and `pnpm --filter @dvt/web typecheck`: passed
  after adding the return type required by lint to the pointer helper.
- An isolated browser on the running localhost application confirmed only the
  hovered card reveals Execute; leaving hides all four actions. No execution
  was triggered and the isolated browser was closed afterward.

The React review kept visibility in CSS with stable mounted controls. No new
debt, stub, placeholder, relaxed check or bypassed hook was introduced.

Final product commit: `affa4a712f838297dbefccf7b7f5321ee3746396`.
`pnpm --filter @dvt/web test:canvas:run --maxWorkers=4` completed with
2,389 passing tests in 527 files, zero failures. The full run retained the
existing React act warnings; no timeout or assertion was relaxed.
`pnpm governance:refresh` passed after hook normalization, with 6,283 governed
files, zero ungoverned files and zero fingerprint drift.
The complete base `0c403a02393388b52305c91db9844ddae4630db7` to this product
commit remains ARC-2 under `node tools/ci/arc-check.mjs`.

`pnpm verify:prepush` still fails at Planning DB integrity: one exact duplicate
rail, one component path absent from the file inventory and four missing source
inventory entries. Later pre-push steps were not reached. No push, PR or merge
was performed. Explicit catalog recovery and publication of this additional
issue evidence await authorization; no import/rebuild, direct SQL or policy
bypass was used. This UI validation does not close the separate live-provider
acceptance or remaining legacy-flow work noted above.

## Explicitly authorized catalog recovery, 2026-09-27

The user subsequently authorized inventory recovery and reconciliation. The
recovery follows ADR-0061, ADR-0063 and the existing DB-first inventory and
operational-integrity reconciliation plans. This is an explicit recovery, not
a routine consultation import or a schema reset.

`pnpm planning:db:import` passed after the importer preservation/transaction
tests passed (two tests). Read-only count and content fingerprints of all 43
DB-owned authority tables matched before and immediately after the import.
The missing source inventory entries and component path finding disappeared.

Two remaining findings were reconciled through existing audited commands:

- `RecordFeatureMechanizationRail` changed the W4 workbench declaration of
  ConfigureCanvasDvtNode into a reference to the existing VTX2 authoring rail
  (revision 1 to 2). All 60 implementation symbols were retained; no parallel
  command or permission scope was added.
- `ReviseGovernanceComponent`, scoped by DB design
  `GH-3298-CATALOG-RECOVERY`, completed SYS-SUBSTRAIT-ANALYSIS invariants,
  transitions and actual consumers (revision 0 to 1). The current analysis
  session, producer-input refresh, Web Canvas and PostgreSQL projection code
  supplied the evidence. Component ownership, public API and review status were
  preserved; no implementation or integrity baseline was changed.

`pnpm planning:db:integrity:check` now passes: zero blockers/errors, zero rail
vocabulary findings, zero source drift and no authority-dependent skipped checks.
The existing progressive warning baseline passes unchanged (107 warnings).
Full pre-push and exact-base/head acceptance must still be rerun before
integration. These catalog operations do not close live-provider acceptance.
No direct SQL write, reset, new debt, stub, disabled check or bypassed hook was
used. Publication of the additional issue comment still awaits its separate
authorization.

## Acceptance continuation and live-proof incident, 2026-09-28

The existing chain helper still called retired source-connect/append controls.
Native Cypress reproduced all three failures in chain persistence, predicates
and append. The helper now builds the same four-source/three-JOIN chain through
explicit Input ports and connects the final operation to passive Output.
The append test disconnects terminal Output before connecting the existing JOIN
to another operation. Predicate editing uses the restored properties inspector;
pending-edit protection, nested functions and physical field lineage remain
asserted. No production compatibility route or fake data path was restored.

Changed files in this continuation are the existing `joinChain.ts` and
`navigation.ts` Cypress helpers and the chain-persistence, predicates and append
specs. The `fieldSelection.ts` migration was not retained without its own proof.

Observed validation:

- `pnpm --filter @dvt/web test:e2e:native --spec
cypress/e2e/canvas/canvas-relational-workbench-chain-persistence.cy.ts,cypress/e2e/canvas/canvas-relational-workbench-predicates.cy.ts,cypress/e2e/canvas/canvas-relational-workbench-append.cy.ts,cypress/e2e/canvas/canvas-relational-source-occurrence.cy.ts,cypress/e2e/canvas/canvas-source-composition.cy.ts,cypress/e2e/canvas/canvas-contextual-removal.cy.ts`:
  four passed, six failed, zero skipped/pending. All three updated stories pass.
  The six remaining failures concern old connect/append/operator-form gestures
  and Apply-state expectations in source-occurrence, source-composition and
  contextual-removal. They block acceptance and have not been suppressed.
- Web lint and typecheck passed on the retained changes.
- `pnpm verify:prepush` passed DB integrity, mechanization and its routed Web
  tests, then failed formatting on the in-progress Cypress edits. This run is
  not reported as green; hook normalization and a final rerun remain required.

The live JOIN proof was mistakenly started without an isolated `DATABASE_URL`:
`DVT_SELECTED_CLOSURE_CYPRESS_RUNTIME=native node
scripts/run-selected-closure-live-proof.cjs --spec
apps/web/cypress/e2e/canvas/canvas-dvt-join-preview-live.cy.ts`.
Its existing seeder recreated `public.source_1`, `raw.orders`, `raw.client` and
`raw.order_details` in the default local PostgreSQL database with example data
(3, 3, 2 and 3 rows respectively). The runner was interrupted before its API
startup completed. No live acceptance result was obtained. The original Web/API
processes remain running; no proof process remains on ports 3300/4174.

This was an execution-isolation error, not an authorized database reset. No
pre-run snapshot exists to establish whether previous contents differed or to
guarantee recovery. The user was informed of the exact tables and asked whether
they had changed them and have a backup. No blind restoration or further live
write is attempted. The testing guide explicitly requires a separate database;
future live proof must meet that requirement before seeding.

Planning DB integrity still passes after the incident. No repository rule,
baseline, hook or test assertion was disabled to close it. No new stub or fake
success path was added. This is an incomplete delivery: no push, PR or merge;
the remaining browser failures and safe live-provider acceptance stay open.
