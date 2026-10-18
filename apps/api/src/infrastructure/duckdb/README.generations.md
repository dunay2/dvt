# Transactional LOCAL generations

Owner: API / Local Data. Governing issues: #3392, #3393 and #3394 under #3388.
Planning DB design GH-3394-COMPOSED-LOCAL-CAPTURE owns this integration; the
accepted metadata contract is docs/contracts/local-data-generation-v1.md.

## Composition and application boundary

The protected runtime binds the current authorizer, warehouse catalog, credential
resolver and its single DuckDbLocalDataRuntime through buildLocalDataCaptureRuntime.
Disabled LOCAL exposes no capability. Configured LOCAL exposes ICaptureLocalDataset
and row-free ILocalDataGenerationReader. Native handles, SQL and paths stay inside
infrastructure. There is no HTTP trigger, LOCAL Preview or analytical execution.

Capture receives an explicit principal, request ID and workspace scope. Its lease
requires current capture and source-view permission before lookup, during bounded
work and immediately before promotion. Metadata reads require current view
permission before storage and before publishing the result. They resolve exact
dataset/generation IDs, without a latest fallback. Authorized cold absence returns
null without creating a workspace database; corruption/errors never become absence.
A structural checkpoint fixture is not a grant. Production consumers are bound by
the trusted composition, not arbitrary callers supplying checkpoint callbacks.

```text
current permission + catalog binding -> one PostgreSQL read-only snapshot
  -> bounded primitive batches -> unpublished DuckDB relation
  -> successful cursor / transaction / client closure
  -> binding + permission recheck -> manifest validation + atomic head CAS
authorized exact-generation query -> validated manifest, no rows/native handles
```

PostgreSQL owns preflight and native session lifetime; the domain owns primitive
batch invariants. DuckDB owns physical types, transactions and publication. The
coordinator owns policy and sequencing. Source closure failure cannot reach
promotion. A failed refresh preserves the prior READY generation.

## Catalog and recovery

initialize creates metadata only when BOTH reserved schemas dvt_meta and dvt_store
are absent. Otherwise both must exist with exactly four expected metadata BASE
TABLEs and matching version/scope. Every transaction verifies the catalog before
interpreting a missing ID. Partial, extra or view-substituted metadata rejects
with CORRUPT_METADATA. There is no automatic reconstruction over retained data.

begin reserves a generation and creates durable unpublished staging. append commits
bounded batches. promote validates manifest and physical relation, seals capture
and compares/swaps the head in one transaction. Reads validate schema and count,
including historical generations. Server-generated hexadecimal relation locators
are checked before interpolation; values/keys use parameters or typed DataChunks.

Deleting both reserved schemas removes internal evidence of initialization.
Inventory checks are not cryptographic integrity or full constraint attestation.
No garbage collection, automatic repair, catalog migration or destructive
compensation exists. A post-COMMIT error can have a persisted outcome; resolve
the capture before retrying instead of claiming rollback.

## Admitted profile and limits

PostgreSQL OIDs 20, 16, 25 and 1043 map to signed native BIGINT, BOOLEAN and
VARCHAR; NULL obeys nullability. Other types reject before acquisition. This
does not prove DECIMAL, timestamp, int2/int4 or array fidelity. Ordinals preserve
duplicate logical column names. Text must be valid UTF-8.

The protected composition caps captures at 100000 rows / 16 MiB logical bytes,
1024 rows per pull and 60000 ms. Each batch is capped at 1 MiB / 32 columns.
Logical bytes mean bigint=8, bool=1, null=1 and UTF-8 text bytes. These are not
aggregate disk, source-wire, RSS or CPU quotas; retain instance and host limits.
FIRST N remains sample coverage even when EOF precedes its target. FULL requires
observed EOF; safety or cancellation stops cannot manufacture FULL.

## Security and rollout

Default OFF is preserved. Enabled LOCAL requires POSIX private roots, mode-0700
directories, mode-0600 DB/WAL and explicit private-creation startup described in
apps/api/README.md. Windows opt-in fails closed. The existing runtime owns one
instance per workspace, short sessions, physical checks and draining shutdown.
No addon settings or default grants are widened.

Authorization and DuckDB commit remain separate authorities: the final check is
point-in-time authorization, not cross-store linearizability. Cooperative abort
does not forcibly interrupt arbitrary callbacks. Same-UID/root/mount attackers,
atomic pathname security and continuous spill inspection remain outside the host
boundary. Historical generations and failed staging consume storage; #3398 retains
retention/admission responsibility before sustained use.

Rollback disables LOCAL and drains the runtime. Retain DB/WAL and generation
metadata; no deletion, reconstruction or implicit LIVE fallback. Actual provider
evidence and compatibility/rollout details are recorded in
docs/evidence/ED-20261018-local-capture-integration.md and #3680.
