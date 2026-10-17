# Transactional LOCAL generations

Owner: API local data infrastructure. Governing tasks: #3393 A/B and #3394-A.
This adapter is **not composed into a public route or enabled product capability**.
It reuses `DuckDbLocalDataRuntime`, the #3391 generation contract and the #3392
checkpoint vocabulary. It does not create another instance registry or data plane.

## Public boundary and ownership

All methods below are infrastructure-internal. No SQL, locator, connection or
filesystem path may be projected into HTTP or `ProtectedRuntimeModule`.
`ILocalDataGenerationReader` remains the existing row-free application boundary;
its authorized composition is a later cut, not a second reader port here.
A trusted composition root MUST associate the supplied scope, principal and lease.
A structural checkpoint object supplied by arbitrary caller code is not a grant.

`initialize` explicitly creates the internal catalog or verifies its version and
scope binding. `begin` creates a durable unpublished relation and capture record;
its generated generation ID is only a reservation, not READY. `append` commits
bounded primitive batches. `promote` validates the #3391 manifest and physical
relation, inserts READY, seals the capture and compare-and-swaps the head in one
transaction. `readHead`, `readGeneration` and `readCapture` return validated
manifests only; absent exact IDs return null, corruption/errors never do.

```text
one workspace-owned instance
  short connection -> BEGIN
    validate reserved schemas + base-table inventory + version + scope
    staged relation + capture (separate batch commits, no public visibility)
    manifest insert + sealed capture + expected-head CAS
    await beforePromotion, check abort
  COMMIT / ROLLBACK
  close short connection; existing runtime checks physical storage
```

Readers resolve the selected head and its manifest within one transaction.
Historical generations are retained. No relation deletion, filesystem rename,
whole-file hashing, second cache or application-owned native handle is introduced.

## Catalog initialization and recovery boundary

Initialization may create metadata only when BOTH reserved schemas, `dvt_meta`
and `dvt_store`, are absent. If either is present, both must exist and the metadata
inventory must contain exactly the four expected BASE TABLEs. Missing, extra or
view-substituted entries reject with `CORRUPT_METADATA`. This structural check and
the existing version/scope check run inside every store transaction, before an
absent ID may be interpreted as null. They do not recreate or repair a catalog.

```text
both reserved schemas absent -> explicit transactional bootstrap
complete catalog             -> validate version/scope, perform requested work
partial/altered catalog       -> reject; no DDL, no empty-head substitution
```

Removing metadata while retaining physical generations must not hide those rows
behind a newly initialized empty head. An operator must investigate the damaged
store; automatic reconstruction, deletion and migration are out of scope.
If both schemas and all their evidence are removed, this internal check cannot
distinguish that state from first initialization. No external marker is added.
Inventory checking is not full column/constraint attestation or cryptographic
integrity; manifest and physical-row validation retain their separate duties.

## Admitted profile and resource boundaries

BIGINT uses native bigint with signed 64-bit checks; BOOLEAN uses boolean;
VARCHAR uses well-formed UTF-8 strings; NULL obeys the declared column nullability.
All other types return `UNSUPPORTED_SCHEMA` until fidelity is demonstrated.
Physical names use ordinals (`c0`, `c1`...), preserving duplicate logical names.
The server generates relation locators and revalidates their exact hexadecimal
shape before interpolation. Metadata values and catalog keys are bound parameters;
row values are passed through typed native DataChunks, never SQL interpolation.

A batch is at most 1024 rows and 1 MiB logical bytes, with at most 32 columns.
The caller supplies a finite capture limit, capped at 100000 rows / 16 MiB in this
first profile. Logical bytes mean bigint=8, bool=1, null=1 and VARCHAR UTF-8 bytes;
they are not RSS, disk, source-wire bytes or a compression estimate. Aggregate
workspace admission, spill, GC and disk quotas remain #3398 obligations before
product enablement. Abort is cooperative between statements and before commit,
not an interrupt/deadline guarantee for a native query already executing.

## Bounded bulk ingestion and PostgreSQL codec (#3394-A)

`DuckDbGenerationStore.append` validates the existing batch and capture budgets,
then checks actual physical column order, names, types and nullability before
creating the Appender. This prevents an implicit native cast from concealing
schema drift. The schema-only check reuses the promotion validator without a
full row-count scan on every append; full count validation remains at promotion.

```text
raw PostgreSQL text fixture / future cursor batch
  -> positional exact codec
  -> await existing Store.append
       BEGIN + catalog/auth checks
       schema + batch + budget checks
       one DataChunk -> Appender -> flush -> close
       update conflicting capture counters
       authorization checkpoint -> COMMIT
  -> next batch may be requested by the future reader
```

Flush and close happen on the same connection inside its current transaction,
before updating counters and before COMMIT. The Appender is closed in `finally`;
a native failure, denial or cooperative abort reaches the existing rollback.
The method does not resolve until the transaction and session checks complete.
No autonomous queue, second writer/store or per-row INSERT path is added.

`postgresLocalDataBatchCodec` accepts raw-text OIDs 20 (int8), 16 (bool), 25 (text)
and 1043 (varchar). Int8 uses canonical decimal and exact signed-64-bit bigint;
bool accepts only `t`/`f`; text preserves Unicode and rejects NUL/unpaired
surrogates. NULL follows trusted metadata. Names may repeat; positions govern.
All other OIDs, including int2/int4, decimal, timestamps, arrays and unproven
domains, are refused in this first profile instead of silently coerced.

The future PostgreSQL reader must supply authorized, snapshot-consistent metadata,
array rows and query-local raw-text parsers. Global pg parsers must not be changed.
`decodedTextBytes` counts UTF-8 bytes of non-null decoded strings, not PostgreSQL
wire bytes; it is capped separately at 1 MiB. Codec limits are checked after pg
materialization and do not prove a network-level byte limit or bounded RSS.

This subcut does NOT open PostgreSQL connections or implement a cursor, source
privileges, trustworthy EOF, FULL acquisition, Preview or an exposed capability.
The sequential `await append` is the sink boundary needed for backpressure;
source-to-sink backpressure still requires the actual reader. Native chunk/flush
calls are synchronous, so this is not an event-loop latency or timeout guarantee.
No speedup claim is made without a comparable workload measurement.

## Failure and concurrency semantics

An authorization check runs before work and again before commit. Write operations
require the capture-capable `beforePromotion` method. Denial rolls back the whole
transaction. Grants and DuckDB are not one distributed transaction: a successful
checkpoint cannot guarantee atomic revocation during the final commit window.

A stale expected head rolls back manifest and sealing (`HEAD_CONFLICT`). Native
concurrent-write/constraint failures are sanitized as `TRANSACTION_FAILED`;
there is no blind automatic retry. Two writers update the same capture record,
so an append racing promotion cannot silently extend a published relation.
A sealed capture rejects appends. Exact replay of a committed manifest returns
`already_published` without moving the current head back to a historical value.
Different manifests for that capture reject. A caller can resolve `readCapture`
after an ambiguous post-commit failure, rather than creating a new generation.

Crash before promotion leaves only unpublished staging. Crash inside promotion
must recover either all committed metadata or the previous head. Staging can be
resolved after reopening using its persisted capture ID. The adapter does not
claim power-loss/filesystem durability beyond the engine/host guarantees, source
EOF authenticity, compatibility migrations, real spill or safe orphan GC.

## Validation

`DuckDbGenerationStore.test.ts` exercises the real pinned driver, persisted rows,
negative inputs, expected-head races, snapshots and reopen. The recovery test
spawns an isolated process using the built adapter, waits at a pre/post-COMMIT
barrier and kills only that test child to inspect WAL recovery. It needs the API
build and runs only on admitted POSIX hosts; Windows crash cases are explicitly
skipped, never counted as native evidence. The companion suite checks refusal.
`DuckDbGenerationStore.catalog.test.ts` removes or alters reserved catalog objects
in isolated native fixtures and verifies rejection without reconstruction or loss
of retained BIGINT data. No failure hook or raw-SQL test backdoor exists in product
code.

`DuckDbGenerationStore.appender.test.ts` observes the real Appender methods and
SQL calls without replacing their implementations. It requires one native chunk
for 1024 fixture rows, zero row INSERTs, exact values after reopen, rollback after
flush, native CHECK failure cleanup and pre-write schema refusal. Codec tests are
pure; raw-text fixtures are not a real PostgreSQL extraction.

Use the existing API build and `test:ci` scripts with the explicit private startup
policy from #3675. Full repository prepush/security/ARC and human review remain
required before integration. Lifecycle and exact evidence are tracked in GitHub
#3393 and #3394.
