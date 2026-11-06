---
id: R-20261102-DBT-PROJECT-ROOT-RELOCATION
title: Project root relocation must preserve bytes and persisted authority
status: Mitigating
date: 2026-11-02
owners:
  - API
  - Contracts
severity: High
probability: Low
---

# dbt Project Root Relocation

## Risk

A cosmetic move can strand a persisted Canvas binding, omit newly added files,
overwrite destination content or change graph/file authority. A process failure
between filesystem publication and database commit can leave moved files with
the previous authority root. A blind retry could then overwrite later user edits.

## Controls

Native node instances keep configuration on a registered definition and persist
only the reference plus their own identity and presentation fields. The protected
contract rejects missing, chained, self, type-mismatched and competing metadata
references. Query-derived instance dependencies preserve existing execution
metadata and never create a persisted connection to the original model.
Definition context survives removal of its card; removing an instance preserves
the shared definition. New reference writers and strict readers must be released
together; saved Source references remain backward-readable.

Presentation reuse follows both old and new dependency edges. Only unaffected
cards may retain an accepted result, and stale asynchronous completions remain
cancelled. Deletion, disconnection, changed input bindings and concurrent schema
updates are covered independently from viewport geometry.

Native references to file-owned models require both graph access and file-view
authorization in the same tenant/project/environment. The server resolves the
persisted file authority and current model schema/connection before binding a
native dbt compiled result. A signature alone cannot become a warehouse table
or execute browser-provided SQL. The existing PostgreSQL parser rejects multiple
statements, nested writes, SELECT INTO and locking statements. Upstream relation
availability remains a provider readiness requirement; creating a placement
does not run `dbt build` or materialize its dependencies.

Compilation reuse is local to one immutable analyzer runtime generation and
bounded by entries and serialized bytes. Only the existing conservative static
subset is eligible. Identity includes the full scoped project revision, managed
profile and effective environment, operation and selected models. Every hit
rechecks current source and context; authorization, model binding and connection
checks remain per request. Dynamic inputs execute normally. Errors are not
retained, eviction causes fresh work and row samples are always queried again.

Assigned relation/field IDs survive save/reload. Removed or changed declared
fields refuse consumption; added fields do not silently widen existing output
contracts. Model sample provenance names the actual model revision without
inventing physical Source identities. Deploy its API writer and strict Web
reader together. Existing physical Source samples retain their prior contract.

File resource placement retains the same authority boundary after relocation.
Only instance/resource IDs and coordinates enter scoped browser layout. A
fresh authorized query resolves definitions; missing references do not render.
Placement does not grant semantic edge or file writes. Inspector and execution
callbacks resolve original resource IDs, so repeated cards cannot submit
invented dbt identities. Removal rejects original resources and preserves
sibling placements. Position persistence retains newly placed references while
React Flow completes its first frame.

- Preview binds exact tenant/project/environment, Canvas, authority revision,
  source paths and file hashes to a deterministic versioned plan.
- Apply uses the existing protected workspace-file write capability. It refuses
  multiple owners, graph/mixed/missing authority, stale revisions, differing
  destination bytes, private files, symlinks and unsupported text.
- Reuse the existing scoped CAS batch and its mutation coordinator. The complete
  subtree inventory is rechecked under that lock; later files cannot disappear
  silently during cleanup.
- Keep original bytes in private, revision-guarded metadata before deleting any
  source file. Recover only when current source/destination hashes prove the
  original move. Ambiguous recovery retains the snapshot and returns conflict.
- Serialize binding changes with sorted existing PostgreSQL advisory locks and
  a conditional revision update. Never run dbt inside that transaction.
- Preserve historical completed receipts and subsequent edits. Remove empty
  directories only, never recursively remove user files or the scoped root.

## Evidence And Residual Boundary

Ownership reconciliation uses native commands with the same component identity.
Explicit source-to-component classification requires an admitted design, a
matching revision and a compatible effective parent; it does not certify SRP or
approve responsibilities automatically. Parent and target reads retain current
local overrides. Missing parents, cycles, stale revisions and ambiguous file
ownership remain refusals. No SQL level constraint or validation threshold is
relaxed, and no inventory import is used to repair the integration candidate.

[ED-20261102-dbt-project-root-relocation](../evidence/ED-20261102-dbt-project-root-relocation.md)
records real filesystem/PostgreSQL integration, denied access, collision,
concurrent authority, rollback/retry and native dbt materialization evidence.
The actual workspace retained all seven file hashes after relocation.

The local filesystem coordinator serializes cooperating operations in one API
process. Multiple independent writers against the same local directory are not
admitted by this local adapter. A crash is recoverable from proven postconditions;
it is not a claim of a distributed atomic transaction. Operators must retain the
private snapshot when recovery reports conflict. Original import receipts remain
historical; the current persisted authority is the active root reference.

Git lifecycle and graph-to-dbt publication are separate governed intents. This
location migration does not remove their authority checks or claim those features
are delivered. These are explicit design boundaries, not accepted hidden debt.

Explicit Code compilation projects the existing scoped, revision-bound query
evidence. It does not add a persisted status authority or promise that private
cache contents survive an API restart. A changed project/configuration context
requires a new explicit request; old and late evidence stays withheld. SQL AST
equivalence alone cannot validate Jinja, macro, profile or environment changes.
Valid typed file-model references are excluded from graph-generated path ownership;
malformed metadata and actual graph-owned files retain their existing guards.
Controlled browser evidence uses the same schema-validated fixture as the Code
presentation tests. It proves public interaction and transport scope, while the
native analyzer tests and real-system proof cover dbt execution; a controlled
response alone does not certify native compilation.
Signed card coordinates widen the existing presentation DTO admission without
changing its shape or semantic authority. Existing nonnegative snapshots remain
valid. A consumer that admits signed finite coordinates must be deployed before
the emitting UI; an old validator rejects such positions rather than clamping or
discarding them. Non-finite values stay invalid. Explicit Fit, detail expansion,
drop projection and save/read must share this boundary so a free camera does not
conceal another coordinate floor.

Browser reload recovery stores only ready selected-model evidence under the full
scoped revision key. Fresh authorized file/project context and the existing
byte/hash projector remain necessary; the cache is not authorization. Its eight
entry / 4 MiB bound, browser storage denial or quota, and malformed storage can
produce a cache miss. Such a miss must not claim compiled evidence or discard the
live query result. No credentials, row samples, compiled boolean or parallel
reactive store are introduced. UI session navigation and the Model camera remain
transient; saved document/layout data use their existing persistence rails.

Transaction dirtiness and output dirtiness are derived for different consumers.
Disconnected authoring work must not clear a valid saved output sample; a changed
terminal, semantic document or active output edit must still block that sample.
The existing canonicalized draft comparator and saved output-plan membership
checks own this distinction. No detached relation is executed, no implicit Apply
is added and no second cache or compiler state is introduced.

Saved sample input revisions exclude catalogue entries without a canonical Read
identity. They still include the current fields and input bindings of used
producers; missing or changed used inputs retain invalidation and admission
guards. The complete catalogue remains available for authoring. The route test
harness consumes the existing normalized controller once; removing its duplicate
normalizers does not change product document admission or introduce a test adapter.

Shared HTTP scope parsing must preserve the different dbt combined-query error
contract and the existing action at each authorization boundary. Output formatting
must return the same caller-owned reader and leave process retirement unchanged.
The nine older runner method duplicates discovered by the complete scan are
existing code, not a new fallback or competing implementation introduced here;
their consolidation needs proof of bootstrap, lease and shutdown equivalence.

Destination provenance treats validated dbt references as sealed producers in the
same pure resolver as physical Sources. Incoming lineage, unsupported plugins,
malformed references and conflicting connections cannot supply destination
options. The result is a scoped read model, not authorization or an automatic
target choice. Native source ownership and the required graph test use the
existing inspector component and InspectCanvasNode/ConfigureCanvasDvtNode rails.

The live sales model includes PostgreSQL `numeric`, which the existing bounded
publication schema cannot fingerprint. Sampling is available, but Execution
Preview for configured publication remains rejected. Admission now rejects before
artifact storage and does not recommend an ineffective retry. Supporting numeric
requires a coherent provider/profile contract extension; silently converting to
floating point or inventing a digest would risk precision and CAS correctness.
This is an exposed existing limitation, not newly accepted debt or delivered
numeric publication support.

Native operation-preview evidence must complete its local Model session before
returning browser lifetime to Cypress. A proof that intentionally disconnects
Output must retain its admission/sample assertions, then cancel through the
public action and observe Model closure without another graph write. The
reproduced native completion wait does not authorize removing draft protection,
globally dismissing dialogs, weakening isolation or increasing test deadlines.
Focused and full-gate outcomes remain separate; partial passing cases cannot
certify a completed browser run.

Normative contract provenance must satisfy ADR-0000 with the accepted authoring
and semantic-identity ADRs. Adding the two missing contract headers does not
change their wire version or implementation. The traceability issue baseline,
scope and CI gate must not be weakened to admit missing provenance; the existing
contract suites remain the behavioral evidence for the unchanged declarations.

A placed file-model's captured path must not survive relocation as authoritative
Code identity. Current file-tree/configuration authority and a fresh model
projection resolve its stable Canvas/model reference; missing, ambiguous, stale
or other-owner context rejects inspection without a historic-path fallback.
Elements and Properties Code share this composition and the existing scoped query
keys. This correction does not expand the catalogue's multi-project discovery or
alter native model persistence, dbt execution or explicit compilation.
