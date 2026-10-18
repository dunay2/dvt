---
title: LOCAL storage permissions and physical identity
date: 2026-10-17
status: Draft
owners:
  - api
planning_type: security
---

# LOCAL storage permissions and physical identity

Integrated security boundary in #3394 / #3680 under Planning DB design
GH-3394-COMPOSED-LOCAL-CAPTURE. #3392 remains open for its broader product scope.
No Planning DB import/rebuild or process-wide request-time policy change occurs.

## Existing boundary and verified gap

`duckDbLocalDataPaths.ts` owns private, server-derived paths and rejects
symlinks, hardlinks, invalid owners and wrong file kinds. Before this change
it did not reject an existing DB/WAL with mode 0644/0660; private-directory
checks ignored special mode bits. The native runtime re-ran a preparer on reuse,
which could recreate an absent temp directory, and pinned only the DB inode.

## Candidate behavior

One API-owned instance per workspace and short-lived connections remain unchanged.
The existing helper now requires DB/WAL mode **0600** and private directories
**0700**, including special bits. It does not chmod, alter process umask,
create an empty DB, replace corrupt bytes or delete data to satisfy a check.

The new verification-only read pins root, namespace, workspace, DB and shared-temp
physical identities (device/inode), plus the resolved workspace path. The runtime
captures that identity after native open/lock, validates it before lending a
connection, and validates again after closing the connection on either outcome.
Revalidation contains no mkdir/chmod/unlink and cannot recreate missing storage.

WAL is optional and can appear/disappear between checkpoints; its owner, type,
link count and mode are checked when present, but its inode is not pinned.
The shared temp directory is never removed by a session. Its children are not
recursively enumerated on every query; these checks do not certify the permissions
or native content of every spill file.

```text
scoped bootstrap -> prepare private paths -> native open and lock
                                          -> pin physical identity
session -> verify-only -> connect -> internal callback -> close -> verify-only
```

These physical checks do not grant access. The composed capture and metadata
query authorize before lookup and obey their lease lifecycle. Native persistence
and acquisition remain internal; no public route, user SQL or new LOCAL flag is added.
The native external-access/extension/secret configuration is not widened.

## Explicit private creation entrypoint — candidate 3392-D

The integrated run of #3674 (`997e60f2286d`) failed sixteen native tests after
DB creation: the existing guard correctly rejected non-0600 files. DuckDB
v1.5.6's POSIX file opener requests mode 0666 unless the private-file flag is set.
This slice makes the process-start creation policy explicit; it does not weaken
the storage guard or infer a permission option from the Node API.

For the already-built API, use `pnpm --dir apps/api start:local` with the normal
LOCAL configuration. This invokes Node with
`--require ../../scripts/local-data-private-creation.cjs` **before** application
modules are loaded. The preload sets 0077 once on the main thread; worker threads
and child processes inherit it. It is never an application/session import, never
a temporary mask switch, and never restores a permissive mask. It does not call
the deprecated no-argument `process.umask()` getter. Failure to set the mask fails
startup; Windows still relies on the existing enabled-LOCAL rejection, not a
claim that this verifies ACLs.

```text
explicit private entrypoint -> set 0077 before application/native load
                           -> existing DuckDB create -> exact 0600/0700 checks
                           -> existing per-session physical validation
```

The ordinary `start` and `dev` commands and the feature's default OFF remain
unchanged. Custom launchers must provide an equivalent policy before starting
the process (for example an operator-configured service `UMask=0077`). This is a
precondition, not automatic repair of already-permissive DB/WAL or native files.
Default/inherited directory ACLs and mount policy still require operator review;
the runtime continues to check the actual resulting modes, owner and containment.

**Compatibility:** the selected policy applies to ALL newly created files,
directories and child processes of this API, including logs and workspace
artifacts, not just DuckDB. Deployments that require shared group-readable
artifacts must reconcile that requirement before choosing this entrypoint.
No mode of any existing file is changed and LOCAL is not enabled by the command.
The API unit and integration runners explicitly choose this same launch policy;
assertions requiring unsafe existing modes must establish and verify those modes,
not assume that a requested creation mode overrides a private mask.

`DuckDbFileCreationPolicy.test.ts` measures actual native DB/WAL modes in isolated
processes for inherited 0022, inherited 0077, and 0022 plus this preload. It checks
reopening the same database. It neither pre-creates a fake DB nor substitutes the
addon. Native creation/reopen is not proof of real spill or snapshot consistency.

References: [Node process mask](https://nodejs.org/api/process.html#processumask),
[DuckDB v1.5.6 POSIX open](https://github.com/duckdb/duckdb/blob/v1.5.6/src/common/local_file_system.cpp#L360-L378),
[design and risk before code](https://github.com/dunay2/dvt/issues/3392#issuecomment-6235741005).

## Limits and failure handling

Pathname lstat/realpath checks are not an atomic openat/O_NOFOLLOW boundary for
the native driver. Mount administrators, root and untrusted processes with the
service UID remain outside this host-isolation threat model. Device/inode checks
are boundary observations, not locks or continuous monitoring. A replaced
inode restored between observations can go undetected; inode reuse is not a
cryptographic identity. No multi-writer/shared-NAS or Windows ACL support is added.

Post-callback validation can fail after the callback's writes have committed.
It prevents reporting that low-level callback as successful; it does **not**
roll back writes or authorize destructive compensation. Storage failures can take
precedence over callback/close failures; messages are sanitized and have no native
error cause. The instance is not killed underneath other active sessions.

New DB/WAL permissions and temp-directory stability must be verified against the
pinned `@duckdb/node-api` build before integration. A private existing directory
limits exposure, but is not a substitute for native file-creation validation.
Filesystem fixtures here are opaque bytes, never a valid database or WAL proof.

## Compatibility and rollout

Default OFF is preserved. Existing files previously admitted with group/world
or special permissions will now be rejected; no automatic migration/repair occurs.
Operators should review ownership/modes with the service drained. Any operator
correction is a separate action; do not recursively chmod arbitrary trees.

Admit only the supported POSIX host after real-driver tests and inspection of the
service's file-creation policy, ACLs and encrypted-volume requirements. The code
does not silently change process-wide umask. Test actual DB/WAL creation, native
close/reopen, checkpoint lifecycle and shared spill. Do not weaken the checks to
obtain a green run; a driver incompatibility requires explicit design review.

Rollback means disabling LOCAL and draining owned sessions through the existing
lifecycle; never deleting data, recreating missing temp while leased or falling
back to LIVE automatically. No main rollout or feature activation is performed.

## Evidence and references

- Issue and prior topology: https://github.com/dunay2/dvt/issues/3392
- Design before implementation: https://github.com/dunay2/dvt/issues/3392#issuecomment-6228629157
- DuckDB security: https://duckdb.org/docs/current/operations_manual/securing_duckdb/overview
- Node filesystem API: https://nodejs.org/download/release/v22.16.0/docs/api/fs.html
- Test receipt: `docs/evidence/ED-20261017-local-data-storage-boundary.md`
