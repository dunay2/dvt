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
  - packages/@dvt/contracts/src/contracts/planner/DvtInputBindings.v1.ts
  - packages/@dvt/contracts/src/contracts/planner/DvtSubstraitProducerReference.v1.ts
  - packages/@dvt/substrait-analysis/src/producerGraph.ts
  - packages/@dvt/substrait-analysis/src/migrateEmbeddedProducerInput.ts
  - packages/@dvt/postgres-projection/src/relationalSql/producerGraph.ts
  - apps/web/src/app/views/canvas/canvasInputBindingAuthoring.ts
  - apps/web/src/app/views/canvas/canvasRelationOutputAuthoring.ts
  - apps/web/src/app/views/canvas/canvasModelCompositionInput.ts
  - apps/web/src/app/views/canvas/CanvasRelationOutputs.tsx
  - apps/web/src/app/views/canvas/useCanvasRelationalTreeViewport.ts
  - apps/web/src/app/views/canvas/canvasStagedOperationActions.ts
  - apps/web/src/app/views/canvas/CanvasRelationalOperationPorts.tsx
  - apps/web/src/app/views/canvas/relational-layout/RelationalTreeEdges.tsx
  - packages/@dvt/contracts/src/contracts/planner/DvtRelationalAuthoringDraft.v1.ts
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
  any order, including the same producer on both ports for an explicit
  self-join; selection is optional presentation state, never an admission
  prerequisite. Occupied-port replacement and cycles reject atomically.
- Incomplete source occurrences, operation nodes, port bindings, terminal
  Output selection and positions persist in the existing protected draft. They
  reopen without materializing a hidden Transform or copying another producer's
  operations.
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

The new mechanization references were recorded additively through
`RecordFeatureMechanizationRail` under `ConfigureCanvasDvtNode`,
`SaveWorkspaceGraphDraft` and `ProjectCanvasRelationalTree`. No duplicate rail,
direct database mutation or Planning DB import was introduced.

## Compatibility and verification limits

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

At this evidence snapshot, final `pnpm verify:prepush` remains to be completed.
Earlier presentation runs had timeout failures; those are not reported as passing.
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
