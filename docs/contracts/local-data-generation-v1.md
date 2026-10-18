---
title: LOCAL acquisition and generation metadata v1
status: Active
owner: Contracts / Local Data
last_reviewed: 2026-10-18
---

# LOCAL acquisition and generation metadata v1

Metadata contract for [#3391](https://github.com/dunay2/dvt/issues/3391).
This is a contracts-only addition.
It does not enable LOCAL, implement a provider or publish captured rows.

The existing [LIVE/LOCAL boundary](data-access-modes.md), ConnectedSourceRef,
WorkingDataCoverage and DataAccessSelection remain authoritative. No existing
DTO, mode, preview limit or WorkingDataState transition changes.

## Identity and ownership

```text
source binding + acquisition policy + ordered schema + provider-context digest
                              -> request fingerprint
local dataset -> capture attempt -> generation metadata
LOCAL selection -> exact dataset ID + generation ID -> authorized reader
```

Dataset/capture/generation IDs use separately branded UUIDv7 families and the
existing @dvt/crypto allocator. The fingerprint uses existing JCS/SHA-256.
Neither a matching fingerprint nor an ID is authorization, proof of freshness,
or proof of a successful database commit. The shared DuckDB file is not hashed
as a generation identity. Graph layout and whole-plan semantic hashes do not
belong to a raw source acquisition request; strict parsing rejects them.

A request contains the exact ConnectedSourceRef, FULL or FIRST N policy,
ordered schema and the digest of admitted result-affecting provider context.
The provider-context digest is not a secret or an authorization decision.
Source observation and generated IDs are recorded outside the request.

## Coverage

The manifest reuses WorkingDataCoverage. FIRST N stores its positive target in
the request policy and its persisted count in rowCount. No second Sample model
or generic sampling strategy registry is introduced.

| Request | Completion fact          | Admitted metadata                          |
| ------- | ------------------------ | ------------------------------------------ |
| FULL    | Source exhausted         | full + eofObserved=true; zero rows allowed |
| FULL    | Budget/time/byte stop    | Not a successful generation                |
| FIRST N | Exactly N rows           | sample + sample-target-reached             |
| FIRST N | Fewer than N and EOF     | sample + source-exhausted                  |
| FIRST N | Fewer than N without EOF | Not a successful generation                |
| FIRST N | More than N rows         | Rejected                                   |

The parser validates declarations, not their factual truth. #3394 must prove
source EOF or completion of the sample target. #3393 must validate and commit
the data/manifest before any consumer can resolve the generation as READY.
A sample remains a sample even when EOF occurs before its target; coverage does
not silently change the user's requested policy.

Row/byte counts are canonical decimal strings in the uint64 range. No JSON
Number coercion, leading zeros, exponent notation or negative values. Counts
and logical bytes are independent; no estimate of population or disk bytes is
manufactured. logicalByteCount may be absent when not measured.

## Schema and fidelity

Columns retain their zero-based ordinal, exact name, sourceType, localType and
nullability. Names may repeat; ordinals must equal array position. Metadata is
bounded to 4096 columns and 256 characters per name/type declaration. Unknown
types and NUL are rejected. Reordering columns or changing declared types alters
the schema digest and request fingerprint.

These declarations are NOT a second global type system, SQL parser or mapping
admission policy. They do not prove that numeric precision, timezone or NULL
semantics survived transport. Actual mapping and data parity remain #3394/#3395
obligations, including DECIMAL, integers beyond 2^53 and timestamp precision.

## Capture lifecycle

One acquisition attempt has requested/capturing/completed/failed/cancelled
status. This operation record is distinct from the existing dataset-level
WorkingDataState used by DAM1.

```text
requested -> capturing -> completed (one generation ID)
requested -> failed | cancelled
capturing -> failed | cancelled
terminal  -> no transition; retry gets a NEW capture ID
```

Transitions preserve dataset/capture/request identity and requestedAt. Time
cannot go backwards. Failure codes are bounded; raw provider exception text
is not a contract field. A failed/cancelled attempt cannot contain generationId.

matchesLocalDataCaptureCompletionV1 checks IDs, fingerprint and the observation /
creation / attempt-update timeline. It does not turn a record into durable data.
The persistence adapter must commit the metadata atomically with valid data;
readiness and authorization cannot be inferred merely from a successful parse.
sourceObservation.observedAt is the service observation made during acquisition,
not an arbitrary remote business event time. Optional source version is evidence,
not a claim of global multi-source consistency.

## Scope, consumers and compatibility

The row-free ILocalDataGenerationReader receives WorkspaceGraphDraftScope
separately from DataAccessSelection. The application authorizes before lookup;
Task [#3392](https://github.com/dunay2/dvt/issues/3392) owns reauthorization and revocation. A missing authorized generation may
return null; corruption or adapter failure must not masquerade as absence.
There is no implementation, new endpoint, scheduled job or runtime registration
in this slice. Exact ID matching never authorizes cross-scope reuse.

### Planned query contract

Planning DB design `GH-3391-LOCAL-GENERATION-METADATA` governs this contract cut.
Its source admission records reconciliation of the earlier offline proposal;
it does not claim that database admission preceded that proposal.

| Field                        | Declaration                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rail / status                | `ReadLocalDataGenerationMetadata`, query, planned                                                                                                                    |
| Bounded context / read model | Local Data / `LocalDataGenerationManifestV1`                                                                                                                         |
| Application port             | `ILocalDataGenerationReader.readGeneration(scope, selection)`                                                                                                        |
| Adapter / activation         | No composed adapter, public transport or runtime consumer in this cut                                                                                                |
| Scope / authorization        | Explicit `WorkspaceGraphDraftScope`; current application authorization before lookup belongs to #3392/#3393                                                          |
| Selection / consistency      | Exact dataset and generation IDs; immutable metadata; no latest-generation substitution or freshness inferred from a fingerprint                                     |
| Negative proof               | Wrong ID families, missing/mismatched selection IDs, stale digests, unsafe counters, false FULL and terminal capture resurrection are rejected by the contract tests |

The metadata schemas and pure helpers implement value-object invariants of
this planned read contract. The port remains an interface. These declarations
do not claim an implemented, authorized storage query or actual type conversion.

Existing contracts and their tests remain unchanged. The public barrel gains
one additive export. Native DuckDB handles, local paths, SQL, raw rows and
credentials are excluded. No arbitrary extension or external access is enabled.

## Validation and delivery boundary

The checkout integration uses the pinned repository toolchain and actual
Zod/crypto/Vitest. Its validation results and the earlier offline evidence are
recorded separately in `ED-20261016-local-data-contracts.md` and PR #3671.
Runtime acquisition, authorization, type conversion and storage publication
retain their separate acceptance criteria. No Planning DB import or rebuild
is part of this reconciliation.
