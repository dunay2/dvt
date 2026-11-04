---
title: Lossless dbt project root relocation
status: draft
date: 2026-11-02
owners:
  - API
  - Contracts
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/dbt-project/DbtProjectRootRelocation.v1.ts
  - apps/api/src/application/services/dbtProjectRootRelocation/relocationPlan.ts
  - apps/api/src/application/services/dbtProjectRootRelocation/RelocateDbtProjectRootCommand.ts
  - apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceRootInventory.ts
  - apps/api/src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.ts
  - apps/web/src/app/views/canvas/explorer/CanvasProjectElementsExplorer.tsx
  - apps/web/src/app/views/canvas/useDbtProjectFilePlacements.ts
  - apps/web/src/app/views/canvas/canvasResourcePlacements.ts
  - apps/web/src/app/stores/canvasInteractionStore.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api exec vitest run --config vitest.integration.config.ts test/integration/dbtProjectRootRelocation.integration.test.ts
    - pnpm --filter dvt-api exec tsc -p tsconfig.json --noEmit
    - pnpm --filter dvt-api exec tsc -p test/tsconfig.json --noEmit
    - pnpm --filter @dvt/web typecheck
    - pnpm --filter @dvt/web lint
---

# Lossless dbt Project Root Relocation

## Native Instance And Incremental Presentation Correction

The [instance correction](https://github.com/dunay2/dvt/issues/3747#issuecomment-6616425070)
and [incremental presentation design](https://github.com/dunay2/dvt/issues/3747#issuecomment-6617264511)
reuse `CreateCanvasNode`, `SaveWorkspaceGraphDraft`,
`RenderCanvasContextualGraphSurface` and `PreviewCanvasTransformRows`.
`WorkspaceNodeInstance.v1` replaces the Source-only resolver and accepts saved
`sourceDefinitionId` references. New native Source/Model instances use
`definitionId`; metadata and path remain on the registered definition. Input
dependencies are derived for queries, never persisted as definition-to-instance
connections. One factory and admission callback serve click and drag.

The four consumer cards created by the rejected experiment were corrected through
the protected draft CAS command. Their IDs, names, positions and the original
model were preserved; four automatic edges were removed. No permanent migration
or prototype metadata handler was added. Obsolete factory bindings were removed
from Planning DB and the shared contract received a focused owner.

Deleting or disconnecting another card previously put unrelated models through
`pending` again. The new tests reproduced that transition before the fix. The
existing presentation owner now computes affected consumers, retains unrelated
presentation objects and avoids repeating their schema queries. Cancellation and
pending-field recovery tests remain enabled.

Focused evidence: 54 Web presentation/admission cases passed; 55 native
definition/draft/Inspector cases passed before adding the closed-gate variant;
17 API cases passed, including a saved instance preview through `PlannerFacade`.
The full Contracts run passed 79 files / 1,015 cases before the additional
edge-ID collision case. API unit validation found one obsolete exact-import-count
assertion; it was replaced with the same contracts-only dependency boundary.
Final checks below supersede these intermediate counts when recorded.

The live authorized API returned HTTP 200 for both the original and corrected
instance: the same two output columns, five bounded rows and semantic-plan SHA.
The browser proof used the actual application on port 5173: catalogue click
created a new native instance with Input (4) / Output (2); removing that proof
card preserved the original fields and added no diagram connection.

This correction does not implement the outstanding adapter for consuming
file-owned models inside native transformations. Disabled external-model rows
are an unresolved product limitation, not an accepted prohibition from ADR-0060.

Compatibility: old saved Source references remain readable. Writers using
`definitionId` require the matching Contracts/API/Web release; strict older
readers cannot accept the new field. Roll back application and affected draft
data together from the pre-change snapshot rather than mixing reader versions.

## File Resource Placement Correction

The [prospective correction](https://github.com/dunay2/dvt/issues/3747#issuecomment-6609571907)
is admitted as `GH-3747-RESOURCE-LAYOUT-INSTANCES`. Existing `PersistCanvasLayout`
and `GetCanvasLayout` rails own independent visual references to Sources and
Models; `InspectCanvasNode` retains the accepted file-opening policy from
`GH-3610-FILE-MODEL-OPEN-AUTHORITY`. No file-authority transition or second
semantic graph is introduced.

The previous adapter linked all catalogue drops to edge editing, so it rejected
placement even with a valid project definition. The correction uses the current
authorized/fresh query and hydrated scoped layout. References carry independent
IDs and resource IDs; definition metadata is resolved at render time. Repeated
instances retain separate positions. Removal is limited to placements, and node
inspection/execution resolve to the original definition. The shared catalogue
MIME and graph-coordinate drop anchor are reused by native source placement.

Focused checks executed during implementation:

- Unit suite: resource projection, store retention/rehydration and backed node
  actions, three files / 20 cases passed.
- Presentation suite: Explorer and Viewport, two files / 42 cases passed; the
  first placement-hook run failed on an unavailable test-library import. The
  test now uses the repository's existing React root/act approach; five hook
  cases passed without adding a dependency or changing a timeout.
- File-node opening: 11 unit cases passed, including reference IDs and denied
  Code capability. Shared source drop remains on its existing admission rail.
- Strict root ESLint passed for the directly affected placement, store,
  controller, Viewport, menu and native browser consumer files.

The final affected checks total 95 cases: 20 projection/store/menu, 11 file
opening and 64 presentation cases. The scoped-envelope presentation run had one
remaining old Explorer expectation; that file was corrected and repeated with
25/25 passing. Web package lint and typecheck passed. The native implementation
check accepted 701 DB manifests for base
`650a6b24aadeaac755d5ffd4054afcfa85647c42` and head
`93595cfccb936998bfe70838f0c3ef8ca4b6104a`, after six missing helper/type
associations were admitted through the native rail.
Four affected architecture files also passed all eight cases. Exact scope
commands (including the presentation failure followed by the corrected repeat):

```text
pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasResourcePlacements.test.ts src/app/stores/canvasInteractionStore.test.ts src/app/components/canvas/canvasNodeContextMenuModel.test.ts --reporter=dot
pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasShellNodeProjection.test.ts --reporter=dot
pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useDbtProjectFilePlacements.test.tsx src/app/views/canvas/useCanvasGraphHandlers.nodeDrop.test.tsx src/app/views/canvas/explorer/CanvasExplorer.test.tsx src/app/views/canvas/CanvasViewport.test.tsx --reporter=dot
pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/explorer/CanvasExplorer.test.tsx --reporter=dot
pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/dbtProjectFileProjection.architecture.test.ts src/app/views/canvas/canvasSourceInstance.architecture.test.ts src/app/views/canvas/canvasLayoutPersistence.architecture.test.ts src/app/views/canvas/explorer/CanvasExplorer.architecture.test.ts --reporter=dot
```

The admission review found that file seeds and snapshots could advertise drag
despite the drop adapter rejecting them. The catalogue now reuses
`isPlaceableCanvasResource` and derives its drag-handler admission from the same
visible item flags. Seeds and snapshots remain inspectable without offering
unsupported placement. The refined Explorer suite passed 26/26 cases. The
pre-push attempt for `659239db6` was stopped only in its verified owned process
tree before this refinement; its partial output is retained and is not accepted
as the final gate.

### Maintenance refinement

The follow-up maintenance review removes the duplicate selected-ID comparator
and local record guard from the interaction store. Selection and inspector order
reuse `areOrderedIdsEqual`; persisted-value validation reuses the existing
canonical primitive guard already consumed by the drop adapter. The native
component command retired exactly two obsolete source associations using the
current binding-set hash. No rail refers to either removed local helper.

Four action-type aliases had no consumers outside their own module. The node
action builder now returns the existing context-menu contract directly. Its
public callable signature and command admission remain equivalent. The store
test also drops its obsolete frozen-node API cast and checks the actual store
type; the placement hook returns its filtered changes directly. No new utility,
service, CSS rule or command/query rail is introduced.

The additional read-only audit covered 76 changed production TypeScript files
and found no further normalized function-body clone candidates after local
identifier renaming. A textual consumer audit of 133 named exports in 55 changed
web files found six implementation-only types, now private to their modules.
`RelationalMovableCard` remains exported: Planning DB explicitly references it
from the producer/consumer `PersistCanvasLayout` rail, so lack of a direct named
import alone is insufficient retirement evidence. The shared explorer's
`sourceRow` CSS is also retained because the internal source catalogue uses it.

`pnpm arch:deps` passed: 412 API modules classified as 408 direct production,
three conditional production and one declared null object, with zero orphan or
misplaced test-support modules and no export cleanup candidates. The post-cleanup
store/menu unit run passed 18 cases, the placement-hook run passed five cases,
and web package lint and TypeScript passed at `b3f2cf119`.

The `43e8f3911` local prepush again passed Monaco (16 cases) and all 431 unit
files / 3,362 cases. Its partial presentation run exposed a Viewport fixture
missing the newly required file-authority metadata and a five-second JOIN-chain
timeout. The owned run was stopped after those two confirmed failures; its logs
are retained and it is not a successful final gate.

The [prospective fixture refinement](https://github.com/dunay2/dvt/issues/3747#issuecomment-6614712224)
is recorded as `GH-3747-CANONICAL-PRESENTATION-FIXTURES`, referencing the existing
`RenderCanvasContextualGraphSurface` rail and the two existing component owners.
Both test paths now have explicit ownership. The Viewport fixture uses actual
file-resource metadata. JOIN-chain starts with a validated persisted draft from
the production factories and reuses existing render/port helpers, removing
repeated setup gestures and selector code. Its real connection gestures, final
card/edge counts, no-write-before-Apply and saved-draft assertions remain; input
model immutability is asserted before and after Apply. The focused repeat passed
all 18 cases, including after helper reuse. No timeout, retry, runtime mock or
skip was added.

Before this refinement, the exact `923c92cfb` prepush passed Monaco (one file,
16 cases) and the complete unit suite (431 files, 3,362 cases). Only its owned
process tree was stopped when presentation began, following the new cleanup
request. Those passing results are retained; the interrupted prepush is not final
acceptance. The final committed refinement requires a fresh complete prepush.

### Actual user-session verification

Browser-only control of the existing Edge Raven tab verified the real project
at `localhost:5173`, Canvas `ce23643b-69fa-46d0-a902-361af7582335`, root `.`.
Dragging onto empty Canvas created `Pedidos 2`, `client 2` and `Pedidos 3`.
Removing only `Pedidos 3` preserved all eight original resources and the two
other placements. `Pedidos 2` opened the original `models/pedidos.sql` in the
read-only Code inspector. After closing the inspector and reloading, both
placement IDs and world coordinates remained identical. `Pedidos 2` and
`client 2` remain visible for review.

The seven expected project files remain present, with only three model SQL
files. `ventas_por_cliente.sql` still matches the earlier recorded SHA-256
`08b449abda600b9f4b0d412ce5fa299e8d4ac5397442451481581c18e16dc2ba`.
The observation record is
`.dvt/project-root-3747/resource-placement-live-browser-evidence.json`.
CDP image capture twice reached its existing five-second deadline; verification
used accessible state and visible DOM. No desktop control or permission change
was used.

The automated live fixture is **not green**: attempt
`20261103T171428513_26836` failed during the API migration `onReady` hook before
the browser. Attempt `20261103T172431020_77140` started the real services and
Chrome, then its `before all` reached the existing 30-second dbt import-analysis
deadline; three subsequent cases were not executed. Those artifacts are
retained. The direct user-session proof does not relabel either failed run.
Main integration still requires the full pre-push acceptance baseline.

No new debt entry, stub, fake product adapter, skipped gate or relaxed deadline
was introduced. Commits used the helper with hooks enabled. Existing
file-defined lineage remains read-only; these are local visual references to
the authoritative resources, not new SQL model definitions.

[Issue #3747](https://github.com/dunay2/dvt/issues/3747) owns delivery. Planning DB
design `GH-3747-DBT-PROJECT-ROOT-RELOCATION` and its
[prospective admission](https://github.com/dunay2/dvt/issues/3747#issuecomment-6585557351)
bound this slice. ADR-0060 governs semantic authority; the command/query and Fowler
rules govern the new location-migration intent. The complete branch evaluator
classified the diff as ARC-2: evidence, risk, lint, tests, schema validation and
contract goldens are required.

## Implemented Boundary

`PreviewDbtProjectRootRelocation` reads one persisted file owner, applies the
existing import policy, inventories every source file and returns a scoped plan
with content hashes and the current authority revision. `RelocateDbtProjectRoot`
uses the existing workspace-file write capability, CAS batch gateway and private
metadata repository. Sorted PostgreSQL authority locks serialize root changes.
The authority kind and Canvas identity remain unchanged.

The batch gateway now accepts an optional complete subtree precondition. It
rejects files added after inspection while holding its existing mutation lock.
The same bounded inventory serves preview and publication; symlinks, invalid
UTF-8, excessive traversal and oversized files fail closed. Shared HTTP scope
authorization was extracted from the existing file routes without changing their
capabilities.

A private snapshot precedes destructive file publication. Retry can finish a
proven move after database rollback. Missing or changed files produce a conflict;
the snapshot remains available rather than silently recreating a later deletion.
Completed receipts replay without rewriting later edits. Cleanup removes only
empty former source directories.

## Executed Evidence

- Contracts: 79 files, 1,012 cases passed after the case-alias refinement.
- Earlier API unit suite with isolated PostgreSQL: 249 files, 1,862 cases passed. One
  existing DuckDB recovery file, two cases, was skipped by its environment guard;
  this is not a claim that those cases ran.
- Focused application, inventory, batch and HTTP boundary: 39 cases passed.
- Authority-store PostgreSQL and protected route boundary: 20 cases passed.
- Real PostgreSQL/filesystem production composition: one integration case passed.
- API source and test TypeScript checks passed; changed API ESLint passed with
  zero warnings. The enabled pre-commit hook formatted and checked the commit.
- `pnpm validate:contracts` passed all 25 checks. `pnpm golden:validate`
  passed five paths; its existing path awaiting issue #10 remained skipped.
- A separate native dbt run after production relocation created all three fixture
  tables and returned `{client_id: 1, order_id: 10}` from the dependent model.
  This proves actual native execution, beyond parse or compilation. Its isolated
  schemas were removed after verification.

The authorized command was also applied to the actual `tenant/project/dev`
workspace. Five imported files moved from `inline_code_demo/` into the root; the
two existing source YAML files remained. All seven SHA-256 values were preserved.
The Canvas remained `ce23643b-69fa-46d0-a902-361af7582335`, now bound to `.`. The
user's SQL, including its existing text, was not normalized or repaired.

The follow-up screenshot exposed mixed folder/file ordering. The existing
`ListWorkspaceFiles` adapter now groups directories first and sorts names within
each group at every depth. Both passive explorers reuse that result without UI
sorting or CSS changes. A real-filesystem regression proves nested order, scope
isolation and unchanged bytes. Planning DB records the existing repository as
`SYS-API-LOCAL-WORKSPACE-FILES`; the
[prospective refinement](https://github.com/dunay2/dvt/issues/3747#issuecomment-6587297304)
reuses the existing query rail. The preceding prepush was stopped only in its
verified owned process tree to refreeze this user-requested revision; its partial
results are not a successful final gate.

Root-relocation plans also reject case-aliased source/destination overlaps before
publication. This avoids treating two spellings of the same Windows path as
independent files; the same conservative rule keeps plans portable.

After these refinements, the full API run reported 1,843 passing cases, 21
failures and the same two existing skips. Twenty failures were 5-second test
timeouts, including two relocation cases; one parse-reuse assertion received
`unavailable` instead of `invalid`. This run is not green and is not attributed to
the environment without further evidence. The real PostgreSQL/filesystem
integration passed again, as did both API TypeScript checks. Isolated reruns and
the final prepush outcome belong in the governing issue's final acceptance record.

Ignored local receipts and logs reside under `.dvt/project-root-3747/`. Task
completion in the governing issue records exact final Git identities and final
gate results; this document does not substitute for that acceptance.

## Project Model Navigation

The follow-up [Elements slice](https://github.com/dunay2/dvt/issues/3747#issuecomment-6588421440)
adds project model navigation through the existing scoped file and dbt graph
queries. `SYS-WEB-PROJECT-ELEMENTS-EXPLORER` owns the bounded adapter and its source
responsibility; the passive explorer owns its extension contract. No model is
copied into GraphDraft. Native selection remains local. The follow-up
[single-catalogue design](https://github.com/dunay2/dvt/issues/3747#issuecomment-6605746494)
opens the declared available model file through the existing guarded Code opener,
retaining the current Canvas route and authority. Sources and Models share one
Elements activity with independent category disclosure and delegated additions.

The focused Explorer run passed 42 cases across three suites. The eleven new
cases cover model visibility, identity deduplication, native versus external
navigation, closed-panel suppression, graph-cache reuse, rejected authority and
tenant/project/environment isolation. Web lint and TypeScript passed. The live
protected configuration read returned the persisted file Canvas binding at `.`.
The exact final prepush and native browser outcomes are recorded in GH-3747;
the preceding f2986a1b5 run was stopped for this user-requested behavior change
and is not final acceptance. The Code guide's five existing documentary source
identities were reconciled with native row CAS and read-back proved that semantic
declarations were unchanged. No Planning DB import or rebuild was performed.

## File Model Reference Admission

The latest user screenshot exposed the missing native file-model consumer.
The following design was recorded before the reference implementation. The
[reference correction](https://github.com/dunay2/dvt/issues/3747#issuecomment-6618506223)
reuses native node admission and producer Reads instead of copying SQL into a
GraphDraft or creating another dbt model file.

```mermaid
flowchart LR
  D[Current: discovered dbt model] --> U[Disabled native catalogue row]
  F[Accepted file authority] --> Q[ProjectDbtGraphFromFiles]
  Q --> R[Registered scoped model reference]
  R --> I[Independent native instance]
  I --> C[Existing consumer producerRef Read]
  R --> A[Native dbt compile through analyzer cache]
  A --> P[Validated PostgreSQL SELECT AST]
  C --> B[Existing producer graph binding]
  P --> B
  B --> V[Protected preview and provider validation]
```

The reference owns only the accepted file Canvas and dbt resource identity,
connection reference and assigned output-field identities. Field identities are
allocated once and persisted, never derived from field names or SQL content.
The current analyzer projection must verify the referenced field names/types
and the server-owned connection before use. Missing fields, changed types,
stale project revisions or different scope/connection are refusals. Added fields
do not silently change an existing consumer's selected output contract.
Nullability remains conservative: the current file-model publication does not
prove NOT NULL, so reference fields cannot claim a non-nullable output.

An external publication has a typed Substrait Read signature for composition;
this signature is query data and is never lowered as a physical table. Only the
server-resolved native dbt compilation binds its SQL result. Native parse reuse
stays with the existing analyzer cache. Compilation runs once per distinct model
group in a request and is deferred until data projection or execution needs it.
Placement and rendering do not compile dbt.
The original SQL remains file-authoritative and read-only in Code.

The owning rails remain CreateCanvasNode, SaveWorkspaceGraphDraft,
ProjectDbtGraphFromFiles, RenderCanvasContextualGraphSurface,
PreviewCanvasTransformRows and protected PreviewPlan. The external binding is
an application-port collaboration within these rails, not another endpoint,
SQL interpreter, graph authority or unverified browser-provided SQL channel.

Focused implementation evidence: 35 Web catalogue/admission cases pass,
including repeated click/drop placement, persisted reference identity,
read-only refusal and missing output refusal. The API selection test traverses
the saved draft, real planner selection, scoped producer resolver, compiled
PostgreSQL AST and row-probe port. It caught and corrected an invalid requirement
for a nonempty edge set when sampling a standalone model instance. This test
does not claim a native dbt process or live PostgreSQL execution.

The operational consistency check exposed a separate boundary: the existing
PostgreSQL workload profile requires a native consumer and its input dependency.
A standalone file-model instance is directly sampleable through
PreviewCanvasTransformRows, but does not invent an operational native consumer.
Protected PreviewPlan must preserve that profile, accept the file-model instance
as an input to a native consumer, and reject an isolated reference before
publishing SQL artifacts. The Web admission projection must express the same
condition. No workload cardinality rule is relaxed to admit an unsupported shape.

Live admission found a persistence mismatch before acceptance: a file-model
definition is registered once and intentionally has no placement, while the
draft projectability predicate required every non-source definition to have a
visible card. The result was a visible local instance without an autosave.
The existing draft projection must recognize definitions referenced by visible
instances. Unreferenced hidden transforms, missing visible nodes and edge gaps
must continue to block persistence. This is the existing CreateCanvasNode and
SaveWorkspaceGraphDraft path, with no second persistence command.

```mermaid
flowchart LR
  Instance[Visible independent instance] --> Definition[Shared model definition]
  Definition --> Projection[Existing draft payload projection]
  Instance --> Projection
  Projection --> Guard[Referenced definitions allowed; unrelated hidden transforms rejected]
  Guard --> Save[Existing protected autosave]
```

Live compilation also exposed a boundary mistake: a manifest `unique_id` such
as `model.code_inline_demo.clientes` was sent directly as a CLI selector. The
producer resolver must retain that identifier for result matching and provenance,
and pass the package-qualified model name to the existing analyzer. This adapts
the reference to dbt's [documented selection syntax](https://docs.getdbt.com/reference/node-selection/syntax);
it does not implement dbt selection or Jinja evaluation. An otherwise successful
compile with no matching compiled model remains a refusal.

The controlled catalogue browser flow must exercise the file-model DTO through
the actual Elements, admission, save and reload surfaces. Its injected API
responses establish the UI boundary only; they are not evidence of native dbt
compilation or a live PostgreSQL query. That environment acceptance remains
separate and is recorded below.

The controlled run reached create/save/reload and exposed a shared interaction
helper defect: it selected a node by any descendant text, including connection
choices naming other cards, then right-clicked the card center over embedded
controls. The shared helper must match the shell's exact accessible name or
node ID and right-click its visible title. Actionability checks remain enabled;
no forced context click is introduced.

The user authorized `local-postgres-proof` as the server-owned `dev` execution
target. After configuring the existing native analyzer/profile and restarting
the same development checkout without reseeding, the project returned HTTP 200,
eight resources and no diagnostics. Two independently clicked `clientes`
instances persisted with different placement IDs, one shared definition and no
automatic edges. Their protected sample queries both returned HTTP 200, the
columns `client_id`/`country`, five live rows and identical row digests. Model
provenance retained the file Canvas identity, `unique_id` and source/analysis
digests. Compilation took approximately 16 seconds per request on this host;
this is not evidence of a compilation performance improvement.

The real browser opened the remaining `clientes` instance's sample and displayed
20 rows, two columns and `LIVE`. Deleting only the second instance preserved the
first. All seven project-file hashes remained unchanged, as did warehouse row
counts: 202 clients, 1,003 orders and 3,003 detail rows.

At code commit `75c50855ad14e34e7e1b46c8de44b1aa3f0327a7`, validation recorded:

| Command or surface                                                           | Result                                                         |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `vitest run packages/@dvt/contracts/test/workspaceDbtModelReference.test.ts` | 15 passed                                                      |
| API `test:unit test/application/services/resolveDbtModelProducers.test.ts`   | 15 passed                                                      |
| Web `vitest.canvas-unit.config.ts` model-reference and draft-snapshot suites | 7 passed                                                       |
| Controlled `canvas-happy-path-draggable.cy.ts`                               | 2 passed, no skipped cases                                     |
| API and Web package `lint`                                                   | Passed, zero warnings                                          |
| Web typecheck and API test typecheck                                         | Passed                                                         |
| `pnpm governance:refresh`                                                    | Passed; Git-derived surfaces stable, not proof of DB ownership |
| `pnpm verify:prepush`                                                        | Failed at native component responsibility/ownership validation |

The earlier analyzer cleanup `EBUSY` did not recur in these samples. Its general
cleanup behavior has not been changed or certified by this slice. Main readiness
remains blocked by unresolved Planning DB ownership conflicts in the HTTP
composition and PostgreSQL producer surfaces. The native ownership commands
refused to reparent under a source-classified unit or revise that unit as a
component. No import, DB rebuild, ownership tie-break or relaxed validation was
used to hide those findings. Exact final validation outcomes belong in GH-3747
after the committed, hook-normalized tree is checked.

## Limits

Code remains read-only. This migration does not publish a graph-authored native
model into a file-owned root, change semantic authority, or implement Git
staging/commit/push. Native publication refusals remain enforced. A filesystem and
PostgreSQL transaction do not form one atomic storage transaction: the retained
snapshot and explicit conflict behavior cover interrupted publication. Browser
Bridge returned `Transport closed`, so the live verification used the protected
API and file hashes, without desktop control or weakened browser confirmations.

The [risk record](../risk-register/dbt-project-root-relocation-20261102.md)
documents collision, recovery and deployment boundaries. No new debt, placeholder,
fake adapter, skipped hook or relaxed quality rule was introduced.
