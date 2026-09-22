---
title: Repeated Read occurrence identity and protected PostgreSQL projection
status: final
date: 2026-09-21
owners:
  - contracts
  - api
  - postgres-projection
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/planner/DvtOperationalWorkload.shared.ts
  - packages/@dvt/postgres-projection/src/join-inspection/physicalSources.ts
  - apps/api/src/application/services/dvtSourceCoverage.ts
  - apps/api/src/application/services/resolveDvtTerminalTransformClosure.ts
  - apps/api/src/application/services/dvtPostgresTransformProjection.ts
  - apps/web/src/app/views/canvas/relational-source-occurrence/joinOccurrenceIdentity.ts
  - apps/web/src/app/views/canvas/relational-source-occurrence/joinPhysicalBindings.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api test:integration:ci test/integration/dvtRepeatedSourcePostgres.integration.test.ts
    - pnpm verify:prepush
    - pnpm --filter @dvt/web test:unit:run src/app/views/canvas/relational-source-occurrence
---

# Repeated Read occurrence projection

## Authority and scope

[Issue #3342](https://github.com/dunay2/dvt/issues/3342), ADR-0064,
command/query rail governance, Fowler opportunity governance and Planning DB
`GH-3342-READ-OCCURRENCES-V1` govern this backend cut. It reuses the protected
terminal closure, `PreviewCanvasTransformRows`, target publication and existing
Preview/Compile/Run workload rails. No new semantic representation or transport
is introduced.

This is not completion of general reusable-input authoring. Source occurrence
creation, aliases, editing/reopen and linked transformed-result branches remain
open. ReferenceRel is not admitted by this cut. The separate Set hardcut is not
closed or changed.

## Root cause and rationale

Three validators conflated logical occurrences with physical dependencies:
the JOIN reader prohibited repeated source references, the API required a
bijection between Reads and Sources, and workload validation required two
physical Sources for JOIN. The correction retains unique RelationIds, FieldIds
and anchors while admitting consistent repeated physical provenance.

```text
Before: two Reads -> require two physical Sources -> reject valid reuse
After:  one protected Source -> Read A + Read B -> canonical JoinRel
                         distinct identities -> one SQL artifact/workload
```

The reader verifies that repeated source references agree on schema, table and
field names/types/nullability. The API policy requires every occurrence to map
to exactly one protected Source and every selected Source to be used. The
projector also checks the physical table for each occurrence. Selected preview
may consume a subset of the already validated closure. Source duplication,
unused dependencies, foreign bindings and mismatched physical names reject.

Source coverage has one API owner; JOIN, CROSS and Set projection reuse it.
Relation-family classification is a separate pure component and no longer
infers JOIN validity from the count of physical Sources.

## Executable evidence

- Package tests prove stable occurrence/field identity and lineage after binary
  serialization and selected-root extraction, plus inconsistent-provenance
  rejection. The API consumes the same golden canonical document as data,
  without importing another package's test implementation.
- V1/V2 contract tests prove one-physical-source JOIN admission and retain
  negative tests for missing/duplicate dependencies and stale hashes.
- Publisher tests prove exact protected dependency coverage and zero artifact
  publication on rejection. Configured Run produces one workload and rejects
  a stale target projection.
- Real PostgreSQL 16 tests exercise all eight JOIN selectors over one table.
  Expected row multisets explicitly include duplicate rows, NULL keys, missing
  counterparts and a row related to itself. Tests execute published SQL and
  selected-operation SQL; they do not infer correctness from SQL text alone.
- Each integration run creates and removes only its randomly named isolated
  test database. It does not use Planning DB or modify application tables.
- Component/scenario size checks enforce the 200-line boundary for the new
  concerns. Typed lint, typechecks, consumer tests and pre-push remain required.

The chronological command outcomes and any environment-skipped tests are
recorded in #3342. No browser or live Temporal execution is claimed for this
backend-only slice.

## Compatibility and rollout

### Authoring identity foundation

The next #3342 slice is governed by Planning DB
`GH-3342-SOURCE-OCCURRENCE-AUTHORING-V2` and the pre-implementation matrix in
[the issue journal](https://github.com/dunay2/dvt/issues/3342#issuecomment-5758553767).
Its first microcut fixes the existing JOIN builder and reopen projection, not
the still-pending Add instance UI. The constructor preserves each existing
Read by explicit RelationId and allocates fresh field identities for new Reads.
Removing a middle occurrence preserves surviving identities and lineage.
Physical binding verifies exact dependency coverage and field schemas without
requiring one physical Source per Read. No physical graph node or edge is cloned.

The reader now validates Read labels through the canonical human-name binding
schema instead of requiring equality with the physical table name. A focused
test proves unchanged SQL, plan bytes and lineage after alias changes. The old
test rejecting a valid display alias is replaced by invalid-name rejection;
foreign source, inconsistent table/type/nullability and duplicate identity
tests remain. Alias controls and the browser-to-provider acceptance for creating
instances remain pending, so this is not completion of the wider authoring slice.
Retaining one Read preserves its alias and field identities; unsupported projection
types or required-field nullability reject instead of changing the source schema.
The PostgreSQL regression also executes the aliased document through the protected
projection owner and checks real result rows, not just rendered SQL text.

The issue journal records exact validation outcomes for each microcut separately.

### Bounded occurrence controls

The [pre-implementation UI cut](https://github.com/dunay2/dvt/issues/3342#issuecomment-5763838796)
exposes Add instance for the admitted existing JOIN profile and Read aliases in
Properties. It preserves the original physical catalogue and dependency edges.
The predicate confirmation, Apply/cancel transaction, graph save and selected
data query reuse their current owners. No new transport, semantic representation
or implicit execution is introduced.

`sourceOccurrencePolicy.test.ts` checks alias-only edits, unchanged identities and
provenance, malformed-name rejection and explicit admission failures. Separate
Workbench tests cover instance creation/cancel, read-only posture and alias
Apply/reopen. The focused Cypress scenario authors through the actual UI,
inspects the serialized saved document, reopens it, and queries the selected Read.
Its API responses are controlled; it does not claim a browser-to-live-database
proof. Existing real PostgreSQL evidence remains a separate backend layer.

This cut does not close #3342. Initial repeated-source construction from a single
projection, reuse of arbitrary transformed branches and the combined live-provider
acceptance remain open. Unsupported shapes are explained and left untouched.

### Deployment

No wire member, schema version, profile selector or runtime step changes.
Existing valid workloads remain valid. Older validators reject the newly
admitted one-source JOIN, so deploy shared contracts, projection, API and worker
validators together before enabling authoring. Project/Set admission and
protected authorization/CAS remain unchanged. No compatibility fallback, fake
adapter, stub, relaxed check or new technical-debt item is introduced.
