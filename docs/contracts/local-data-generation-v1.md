---
title: LOCAL acquisition and generation metadata v1
status: Draft
owner: Contracts / Local Data
last_reviewed: 2026-10-16
---

# LOCAL acquisition and generation metadata v1

Candidate for [#3391](https://github.com/dunay2/dvt/issues/3391), based on
`8d8c241d3c1ee35c03971a5380f963a58aa8131f`. This is a contracts-only addition.
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

| Request | Completion fact | Admitted metadata |
| --- | --- | --- |
| FULL | Source exhausted | full + eofObserved=true; zero rows allowed |
| FULL | Budget/time/byte stop | Not a successful generation |
| FIRST N | Exactly N rows | sample + sample-target-reached |
| FIRST N | Fewer than N and EOF | sample + source-exhausted |
| FIRST N | Fewer than N without EOF | Not a successful generation |
| FIRST N | More than N rows | Rejected |

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
#3392 owns reauthorization and revocation. A missing authorized generation may
return null; corruption or adapter failure must not masquerade as absence.
There is no implementation, new endpoint, scheduled job or runtime registration
in this slice. Exact ID matching never authorizes cross-scope reuse.

Existing contracts and their tests remain unchanged. The public barrel gains
one additive export. Native DuckDB handles, local paths, SQL, raw rows and
credentials are excluded. No arbitrary extension or external access is enabled.

## Validation and delivery boundary

The pure refinement suite has local Node-based evidence; Zod/crypto/Vitest,
full build, consumers, lint, docs sync, ARC and prepush remain required in a
complete checkout. See the candidate evidence record; it must not be presented
as a completed release. The user waived the Planning DB consultation gate for
this conversation only; no Planning DB import/rebuild or acceptance is claimed.
