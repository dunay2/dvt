---
title: ADR-0065 - Run Event Archive Encoding and Compression
status: Proposed
date: 2026-08-28
owners:
  - architecture
  - state-store
  - operations
arc_level: ARC-1
---

# ADR-0065 - Run Event Archive Encoding and Compression

## Status

Proposed.

The architectural direction is preserved and reviewable, but DVT ADR governance
requires every `Accepted` ADR to have at least one genuinely implementing file.
Because the implementation is intentionally deferred, this ADR MUST remain
`Proposed` until a future reprioritized implementation slice provides truthful
reverse traceability.

## Context

[ADR-0037](./ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md)
already defines the run-event lifecycle: authoritative hot history in PostgreSQL,
a narrow warm tier, cold object storage, explicit verification, deferred hot
deletion, and audited restore.

The current cold exporter writes canonicalized events as uncompressed NDJSON to
`events.jsonl`. The archive contract exposes `archiveFormat: 'jsonl'`, while
integrity is calculated independently through JCS + SHA-256.

This creates avoidable storage and I/O cost. It also maintains two serialization
concerns for archived events: JSON/JCS for canonical identity and JSONL for the
physical archive.

The archive format is not required to preserve backward compatibility. There is
no requirement for a legacy JSONL reader, dual-write period, format negotiation,
or migration compatibility layer.

The goal is to reduce cold-storage bytes and transfer I/O without adding
compression work to the hot execution path, without inventing a DVT codec or
encoder, and without weakening exact event restoration.

This decision is deliberately **not implementation-ready yet**. The related
compression epics remain deferred until a future product-priority decision
explicitly reopens the measurement/benchmark gate.

## Decision

### 1. Hot runtime persistence remains storage-native

DVT MUST NOT serialize and compress hot `run_events`, `run_snapshots`, or
`outbox` payloads in application code.

Hot structured values remain PostgreSQL `JSONB` so SQL inspection, operators,
indexing, and storage-native behavior remain available.

PostgreSQL TOAST/native compression is the only compression mechanism considered
for the hot PostgreSQL representation. LZ4 may be selected for eligible
variable-length columns only after repository-supported PostgreSQL builds and
measurements prove the change useful.

No `DvtCompressionService`, generic hot codec, `BYTEA` envelope, or application
level decompression boundary is introduced.

### 2. Cold event archives use deterministic CBOR encoding

The logical archived event representation is deterministic CBOR as defined by
[RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html).

Each `EventEnvelope` is encoded deterministically before compression. DVT does
not define a proprietary binary encoding.

The existing open `payload?: Record<string, unknown>` contract is preserved;
archive encoding MUST NOT require a separately governed Protobuf, Avro, or
other schema registry merely to decode the event archive.

### 3. Archive units use CBOR Sequence framing

Archive units are represented as a CBOR Sequence following
[RFC 8742](https://www.rfc-editor.org/rfc/rfc8742.html).

Conceptually:

```text
EventEnvelope
  -> deterministic CBOR item
  -> CBOR Sequence
```

This framing keeps events independently decodable and permits a later bounded
streaming implementation without changing the archive format.

The canonical cold event object is:

```text
events.cborseq.zst
```

### 4. Zstandard is the single cold-archive compressor

The CBOR Sequence is compressed with Zstandard, using the standardized frame
format defined by [RFC 8878](https://www.rfc-editor.org/rfc/rfc8878.html).

The initial implementation uses one fixed, benchmarked low/normal compression
level. Level 3 is the baseline candidate, not a permanent tuning contract.

DVT MUST NOT initially add:

- codec selection per tenant;
- adaptive compression;
- trained dictionaries;
- a user-visible compression matrix;
- simultaneous gzip/LZ4/Zstd archive implementations.

A different Zstd level is a physical storage tuning decision and MUST NOT change
the logical archive identity.

### 5. Integrity is calculated from deterministic uncompressed bytes

Archive event integrity is derived from the deterministic CBOR representation,
not from the compressed Zstd frame.

Conceptually:

```text
EventEnvelope
     |
     v
Deterministic CBOR
     |-----------------> SHA-256 / manifest integrity
     |
     v
CBOR Sequence
     |
     v
Zstd
     |
     v
Object storage
```

Changing the Zstd level or recompressing an otherwise identical archive MUST NOT
change the logical event checksum.

The existing archive manifest remains a human-inspectable JSON artifact unless a
separate decision proves a need to change it.

### 6. JCS/JSONL archive serialization is retired, not retained as compatibility

For archived run events:

- `events.jsonl` is removed from the current archive contract;
- `archiveFormat: 'jsonl'` is removed/replaced by the new single format;
- JCS is no longer the canonicalization rule for archive-event integrity;
- no JSONL legacy reader is implemented;
- no dual write is implemented;
- no runtime format negotiation is implemented;
- no permanent compatibility adapter is implemented.

Historical development artifacts remain in Git history. They do not create a
runtime backward-compatibility requirement.

This decision does not remove JCS from unrelated DVT identities that continue
to own it under their domain contracts.

### 7. Encoding and compression remain separate responsibilities

The implementation keeps the two transformations conceptually separate:

```text
EventEnvelope -> ArchiveEncoder -> bytes -> ArchiveCompressor -> compressed bytes
```

Only one implementation is required initially:

- archive encoder: deterministic CBOR / CBOR Sequence;
- archive compressor: Zstandard.

This separation is for ownership and testability, not for building a generic
plugin framework. No factory, registry, or multiple-codec abstraction is added
without a second demonstrated consumer.

### 8. Parquet is not the canonical restore archive

Parquet may later be produced as a derived analytical projection, but it is not
the authoritative restore artifact for this decision.

The cold archive optimizes exact ordered event preservation, verification, and
restore. Analytical projection has a different lifecycle and access pattern.

### 9. Streaming is a follow-up optimization behind the same format

The current exporter materializes an archive unit in memory before object-store
write. The new format MUST be designed so a later implementation can stream:

```text
PostgreSQL cursor -> CBOR Sequence encoder -> Zstd stream -> object storage
```

The first delivery may remain buffered if measurement proves archive units are
bounded safely. Streaming is required only when memory/latency evidence justifies
it; it MUST NOT introduce another archive format.

## Consequences

Positive:

- hot execution does not pay an application-level compression tax;
- cold archives use a mature standardized binary encoder and compressor;
- one deterministic byte representation drives both archive identity and cold
  serialization;
- object-store bytes and transfer I/O should fall substantially for repetitive
  event payloads, subject to DVT benchmarks;
- restore remains exact and schema-registry independent;
- future streaming can be introduced without a format migration;
- no legacy reader, dual write, or format matrix increases maintenance cost.

Costs:

- cold archives are no longer directly readable with a text editor;
- operational tools need CBOR Sequence + Zstd decoding support;
- checksum golden vectors change because archive identity moves from JCS bytes to
  deterministic CBOR bytes;
- the implementation must prove deterministic encoding across supported runtimes;
- Zstd and CBOR dependencies become explicit archive-boundary dependencies.

## Rejected Alternatives

### Keep JSONL and only add Zstd

Rejected because it keeps JSON/JCS serialization overhead and misses the agreed
encoder layer. It also preserves two representations where one deterministic
binary representation can serve archive serialization and integrity.

### Protobuf

Rejected for the archive boundary because the current event payload is
intentionally open and would require an additional schema ownership/evolution
surface solely to decode the archive.

### Avro

Rejected for the same reason: a separately governed schema becomes part of the
archive decode contract without a demonstrated product need.

### Parquet + Zstd as the canonical archive

Rejected because columnar analytics and exact ordered event restore are different
responsibilities. Parquet remains eligible as a derived analytical format.

### LZ4 for cold object storage

Rejected as the default cold codec because the archive path prioritizes storage
ratio and I/O reduction over maximum decompression throughput. LZ4 remains a
storage-native hot candidate where PostgreSQL owns it.

### DVT-specific encoder or compressor

Rejected because it would make DVT responsible for binary framing, compatibility,
security, corruption handling, performance tuning, cross-runtime implementations,
and long-term decode tooling already solved by standardized formats.

## Readiness Gate

This ADR freezes the proposed architectural direction without making the
implementation immediately Ready.

Implementation MUST remain deferred until all of the following are true:

1. the compression work is explicitly reprioritized by current product planning;
2. a bounded benchmark/baseline task is opened at that time against current
   `main`, rather than preserving a stale benchmark plan indefinitely;
3. the current archive writer/reader/restore seams are re-audited source-first;
4. exact CBOR and Zstd implementation/library choices are frozen only from that
   fresh baseline;
5. the implementing slice adds truthful `@baseline ADR-0065` traceability, at
   which point this ADR can be promoted to `Accepted`.

Until those gates are met, Issues #2477 and #2478 remain open but
`NOT READY / DEFERRED` and no implementation child issues should be created.

## Validation

When the work is reactivated, implementation is not considered complete until
repository evidence proves:

1. deterministic CBOR bytes for representative and edge-case `EventEnvelope`
   values across every supported runtime used by the archive path;
2. encode/decode round-trip equality for all supported event payload shapes;
3. archive checksum stability for identical logical events;
4. checksum independence from Zstd compression level;
5. export -> verify -> drop-hot -> restore reproduces the exact ordered event
   sequence;
6. corrupted compressed data and corrupted decoded content fail closed before hot
   deletion/restore acceptance;
7. before/after byte size, compression ratio, encode/compress/decode throughput,
   peak memory, and restore duration are recorded on representative DVT data;
8. hot-path latency is unchanged by the cold archive implementation;
9. JSONL archive production and its current-only tests/contracts are removed;
10. repository/docs/architecture gates pass with no legacy compatibility surface.

## Related Decisions and Work

- [ADR-0004 - Event Sourcing Strategy](./ADR-0004-event-sourcing-strategy.md)
- [ADR-0037 - Run Event Lifecycle Archival, Verification, and Restore Model](./ADR-0037-run-event-lifecycle-archival-verification-and-restore-model.md)
- [ADR-0038 - Delivery Buffer Retention and Purge Policy](./ADR-0038-delivery-buffer-retention-and-purge-policy.md)
- [ADR-0018 - Shared Kernel Ownership Governance](./ADR-0018_Shared_Kernel_Ownership_Governance.md)
- Issue #2477 - cold archive encoding/compression epic (deferred)
- Issue #2478 - PostgreSQL hot-state compression measurement epic (deferred)

## Standards and References

- [RFC 8949 - Concise Binary Object Representation (CBOR)](https://www.rfc-editor.org/rfc/rfc8949.html)
- [RFC 8742 - Concise Binary Object Representation (CBOR) Sequences](https://www.rfc-editor.org/rfc/rfc8742.html)
- [RFC 8878 - Zstandard Compression and the application/zstd Media Type](https://www.rfc-editor.org/rfc/rfc8878.html)
- [PostgreSQL TOAST storage](https://www.postgresql.org/docs/current/storage-toast.html)
- [PostgreSQL CREATE TABLE column compression](https://www.postgresql.org/docs/current/sql-createtable.html)
