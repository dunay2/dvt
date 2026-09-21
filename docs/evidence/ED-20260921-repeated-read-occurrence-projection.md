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
evidence:
  tests:
    - pnpm --filter @dvt/contracts test
    - pnpm --filter @dvt/postgres-projection test
    - pnpm --filter dvt-api test:unit
    - pnpm --filter dvt-api test:integration:ci test/integration/dvtRepeatedSourcePostgres.integration.test.ts
    - pnpm verify:prepush
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

No wire member, schema version, profile selector or runtime step changes.
Existing valid workloads remain valid. Older validators reject the newly
admitted one-source JOIN, so deploy shared contracts, projection, API and worker
validators together before enabling authoring. Project/Set admission and
protected authorization/CAS remain unchanged. No compatibility fallback, fake
adapter, stub, relaxed check or new technical-debt item is introduced.
