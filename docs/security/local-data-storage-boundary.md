---
title: LOCAL storage permissions and physical identity
date: 2026-10-17
status: Draft
owners:
  - api
planning_type: security
---

# LOCAL storage permissions and physical identity

Candidate subcut #3392-B, stacked on #3672 at
`678705b7b1271f81674a5fd89154df5344f40f99`. The user waived the blocking
Planning DB consultation for this conversation, not security or merge validation.
No architectural acceptance or completed #3392 is asserted.

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

These are physical checks, not access grants. #3392-A still owns reauthorization;
future consumers must authorize before lookup and obey cancellation. This cut
adds no product route, acquisition, generation persistence, user SQL or LOCAL flag.
The native external-access/extension/secret configuration is not widened.

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
