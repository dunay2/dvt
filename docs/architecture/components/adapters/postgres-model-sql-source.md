---
title: PostgreSQL Model SQL Source
status: Review
owner: Adapters / Canvas Model Authoring
last_reviewed: 2026-11-17
planning_type: architecture
---

# PostgreSQL Model SQL Source

## Decision and authority

This is the design for [#3944](https://github.com/dunay2/dvt/issues/3944),
admitted as `GH-3944-MODEL-SQL-AUTHORING` and its wiring supplement in Planning DB.
The two queries now have actual implementation references and proof registrations
in Planning DB. Their implementation does not attest merge acceptance; the
governing issue and exact-candidate gates own that boundary.

Under ADR-0064, pinned Substrait and its identity sidecar remain the Model's
semantic authority. SQL is an editable source proposal. PostgreSQL AST nodes
are dialect syntax, not another relational IR. The existing Model draft is the
aggregate; an SQL buffer is local editor state, not another persisted aggregate.

```mermaid
flowchart LR
    Saved[Authorized Model draft and published inputs] --> Context[ProjectCanvasModelSqlContext]
    Context --> Buffer[Local SQL buffer]
    Buffer --> Compile[CompileCanvasModelSql]
    Compile --> Candidate[Pinned Substrait proposal]
    Candidate --> Preview[PreviewCanvasTransformRows]
    Preview --> Data[Existing bounded data drawer]
    Candidate --> Generate[Explicit Generate Model]
    Generate --> Apply[Existing Apply dependency policy and CAS]
    Apply --> Semantic[Existing semantic editor]
```

## Boundaries and reasons to change

| Owner                                    | Responsibility and physical family                                          | Reason to change                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `SYS-ADAPTERS-POSTGRES-MODEL-SQL-SOURCE` | Pure AST-to-Substrait mapping in `postgres-projection/src/sqlSource`        | Admitted PostgreSQL source constructs change            |
| `SYS-API-CANVAS-MODEL-SQL-AUTHORING`     | Protected context and compilation query objects in API application services | Model SQL query admission or currentness policy changes |
| `SYS-WEB-CANVAS-MODEL-SQL-AUTHORING`     | Buffer, explicit actions and presentation in `views/canvas/model-sql`       | SQL authoring interaction changes                       |

`ProjectCanvasModelSqlContext` reads the protected saved draft without requiring
an already executable target. It resolves connected Source publications and
native/file Model publications through their real authorities. The application
context and compilation ports separate this policy from HTTP, parsing and UI.

`CompileCanvasModelSql` reauthorizes and resolves the expected context, parses one
SELECT with the existing PostgreSQL parser, and proposes a complete canonical
document or diagnostics. It neither saves a graph nor executes rows.

`PreviewCanvasTransformRows` retains its strict saved-Model GET contract. Its
explicit SQL-draft POST variant recompiles the proposal against the protected
context, renders canonical SQL and uses the existing bounded read-only probe.
SQL never enters URLs. Execute calls neither Apply, save, Publisher nor Run.

Generate uses the existing `onApplyNodeDraft` command, dependency rejection,
autosave and revision CAS. No second persistence controller, raw-SQL execution
service, connection configuration or warehouse migration is introduced.

## Source and identity admission

SQL names refer to prepared Model inputs in the current protected context.
An unqualified logical identifier takes precedence. A physical Source can also
be addressed by a unique table name, schema and table, or its published catalog,
schema and table. PostgreSQL quoting and aliases apply. Qualified columns and
stars can use the relation path supplied in FROM when that relation has no alias.
When several prepared Read occurrences share a physical name, an explicit alias
can select a unique matching logical occurrence. Ambiguous references are rejected.
The same published fields and source identity apply through either spelling.
Names are syntax;
Read occurrences, SourceRefs, producerRefs and FieldIds retain their real
identities. Unknown, ambiguous, stale, unauthorized and cross-connection inputs
fail closed. A similarly named physical table is not a fallback authority.

Context reads allocate no authoring identities. An explicit compilation proposal
reuses valid current occurrences and allocates opaque IDs for new occurrences
and operations. Output identity is retained only through a unique exact current
provenance mapping. Name, ordinal, SQL text and AST paths never mint identity.
The existing dependency policy rejects destructive output changes.

An empty or incomplete Model has an honest empty source state. Unknown published
types are not silently converted to strings. File producers remain external
publications with their existing file permission and compilation checks.

## Initial source profile

Admit direct field projections, stars in publication order, explicit aliases,
INNER/LEFT/RIGHT/FULL/CROSS joins with explicit ON, Boolean comparison and NULL
predicates, uncorrelated subqueries, sorting and bounded nonnegative Fetch.
Qualification, duplicate names, self joins, outer-join nullability, output sort
aliases/ordinals and PostgreSQL default NULL ordering require explicit proof.

Reject unsupported syntax as a whole: CTE, grouping, sets, windows, DISTINCT,
function calls, casts/coercions, correlated/lateral/USING/NATURAL/aliased joins,
parameters, writes and locking. Unsupported literal/native type meanings must
be diagnosed, not widened. Syntax validity does not imply representability.

## Worksheet proposals without physical inputs

The [bounded worksheet extension](https://github.com/dunay2/dvt/issues/3951#issuecomment-7171073963),
admitted as `GH-3951-WORKSHEET-CONSTANT-CANVAS-MODEL`, also accepts a single
explicitly aliased row of supported integer, Boolean and text literals without
`FROM`. The reported statement is `SELECT 1 AS comprobacion_editor_sql`.
Its canonical meaning is a pinned Substrait `Read` with one typed `virtualTable`
row, using the pinned expressions field. It is a real relational Model, rather
than an empty placeholder, synthetic physical table or saved raw SQL buffer.

The literal values, aliases and PostgreSQL types must survive compilation,
canonical SQL projection, preview, confirmation, save and reopen. Reject an
unsupported literal type or expression instead of widening or coercing it.
Malformed row count, schema/value mismatch and contradictory dependency facts
also reject the whole candidate. Unbound physical reads retain their existing
denial; an empty input list does not authorize a physical-table fallback.

An admitted literal row has no warehouse relation, producer reference or input
edge. Its selected connection is execution metadata and must be authorized in
the caller's tenant, project and environment before preview or execution.
Neither the absence of physical inputs nor a client-supplied connection grants
access. Keep physical Source provenance absent; do not invent a SourceRef or
claim a warehouse read to fill a provenance field.

`ProposeWorksheetCanvasModel` and `CompileCanvasModelSql` retain the existing
proposal/compiler boundary. `ProjectCanvasModelSqlContext` represents the genuine
zero-input namespace. `PreviewCanvasTransformRows` retains its protected,
bounded read-only execution path. Confirmation still revalidates context,
revision and SQL digest before the one `SaveWorkspaceGraphDraft` command.
Repeated conversion must retain existing revision/idempotency behavior and leave
no empty or orphaned Model. The dbt file destination keeps its existing contract.

```mermaid
flowchart LR
  SQL[Aliased literal SELECT without FROM] --> Proposal[Existing worksheet proposal]
  Proposal --> Compile[Existing Model SQL compiler]
  Compile --> Row[One typed Substrait virtual row]
  Row --> Projection[Canonical PostgreSQL projection]
  Connection[Authorized selected connection] --> Preview[Existing bounded preview]
  Projection --> Preview
  Proposal --> Confirm[Explicit confirmation and currentness guards]
  Confirm --> Save[One existing graph draft save]
```

Required proof includes the exact reported statement through the integrated
worksheet-to-Canvas flow and reopen, a native PostgreSQL value/type oracle,
alias preservation, repeated conversion, denied connection authority and
malformed virtual rows. The original physical-input, producer and unsupported
SQL negatives remain in force.

## Presentation and currentness

Reuse the shared Monaco surface, visual tokens, resizable panels and existing
data table. The SQL pane opens between the semantic canvas and data drawer;
the semantic Workbench stays mounted. One toolbar exposes Validate, Execute
and Generate Model. There is no nested tab stack or automatic query on typing.

The SQL disclosure follows the [W3C Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/):
the button's expanded state and controlled section agree, and the retained
section is hidden while collapsed. Its draft remains mounted and its data portal
belongs to the external drawer. The workspace's focused layout hook controls
resizing; the template remains passive.

Model SQL inspection exposes one Edit SQL action in an authoring workspace.
That explicit gesture requests the existing protected readable SQL projection
and opens the logical editor with its expanded state and controlled section.
The scoped inspector retains generated SQL, original/readable presentation and
simplification evidence. The editable source uses the protected context's
logical input names; generated physical SQL is never copied into that buffer.
Projection failure does not prevent opening authoring. A read-only host retains
its existing explicit generation action. Both paths reuse the shared Button,
icons, language catalog and existing query rails.
SQL results use the existing compact sample grid: search and actions precede
rows, with identity, counts and LIVE provenance in the footer. Revision and
execution semantics remain available in its disclosure. No additional heading,
summary block or query controller consumes the data drawer's working area.

Generate compiles the current buffer independently of loaded preview rows. If
compilation detects a stale context, the editor may refresh it once and compile
the same buffer against that context. Revision, cancellation and buffer guards
remain active across both attempts. A second stale response or other denial
leaves the SQL available to edit. Retained rows stay attributed to the previous
execution until explicitly refreshed.

Only one owner publishes into the data host at a time. Buffer, scope, Model or
input changes invalidate compilation receipts and mark retained rows stale.
Late responses cannot replace a newer buffer or context. Concurrent unapplied
visual edits block SQL generation. The existing Model navigation decision
coordinates apply/discard/stay for both editors and preserves rejected drafts.
When the protected semantic context changes, retain dirty lexical text but move
its discard baseline to the current context SQL. An acknowledged lexical source
remains the baseline only while its semantic digest matches that context.
Discard must never mark an obsolete semantic projection as clean.
Apply is a separate command phase: editing is locked while it runs, cancellation
uses its existing signal, and its actual acknowledgement survives the revision
change caused by that command. A restricted Read keeps its canonical field
ordinals while the logical SQL seed omits unpublished fields. Row dependencies
on an unpublished field reject the seed; no NULL filler or renamed identity is
introduced. Preview provenance is intersected with the actual canonical producer
closure, including transitive external producers.
The owning Model workspace synchronously blocks visual authoring while SQL Apply
is pending. The canvas remains mounted and becomes read-only/inert; cancellation
does not release that exclusion until the command settles. Namespace currentness
includes names, plugin/kind/role, placement references, path and metadata, so
renaming or rebinding an input invalidates visible receipts without rewriting
the user's SQL.

The extracted SQL browser fixture remains a controlled-runtime support module in
the existing browser ownership registry. Its admission is checked against the
actual transitive scenario imports by the shared fixture-closure contract. This
adds no scenario, runtime, wildcard or alternate routing catalog.

## Required proof

Contracts must reject forged context/provenance, unbounded SQL/rows and SQL in
the saved-Model DTO. Compiler tests cover supported constructs, identities and
whole-query rejection. A disposable native PostgreSQL oracle compares logical
source SQL with canonical rendering, including types, ordering, duplicates and
NULLs. API proof must show authorization, stale context and zero writes on
Execute. Browser proof covers validation, data, generation, navigation and
keyboard access on the actual integrated UI. Standard package checks, ARC,
governance refresh, prepush and exact-head PR acceptance remain required.
