# Transactional LOCAL generations

Owner: API local data infrastructure. Governing task: #3393; candidate subcut A.
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
    validate catalog version + scope
    staged relation + capture (separate batch commits, no public visibility)
    manifest insert + sealed capture + expected-head CAS
    await beforePromotion, check abort
  COMMIT / ROLLBACK
  close short connection; existing runtime checks physical storage
```

Readers resolve the selected head and its manifest within one transaction.
Historical generations are retained. No relation deletion, filesystem rename,
whole-file hashing, second cache or application-owned native handle is introduced.

## Admitted profile and resource boundaries

BIGINT uses native bigint with signed 64-bit checks; BOOLEAN uses boolean;
VARCHAR uses well-formed UTF-8 strings; NULL obeys the declared column nullability.
All other types return `UNSUPPORTED_SCHEMA` until fidelity is demonstrated.
Physical names use ordinals (`c0`, `c1`...), preserving duplicate logical names.
The server generates relation locators and revalidates their exact hexadecimal
shape before interpolation. All values and catalog keys are bound parameters.

A batch is at most 1024 rows and 1 MiB logical bytes, with at most 32 columns.
The caller supplies a finite capture limit, capped at 100000 rows / 16 MiB in this
first profile. Logical bytes mean bigint=8, bool=1, null=1 and VARCHAR UTF-8 bytes;
they are not RSS, disk, source-wire bytes or a compression estimate. Aggregate
workspace admission, spill, GC and disk quotas remain #3398 obligations before
product enablement. Abort is cooperative between statements and before commit,
not an interrupt/deadline guarantee for a native query already executing.

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
No failure hook or raw-SQL test backdoor exists in product code.

Use the existing API build and `test:ci` scripts with the explicit private startup
policy from #3675. Full repository prepush/security/ARC and human review remain
required before integration. Lifecycle and evidence are tracked in GitHub #3393.
