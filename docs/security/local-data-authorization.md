---
title: Local data authorization lease
status: Draft
owner: API security
date: 2026-10-17
---

# Local data authorization — #3392-A candidate

Base: proposal #3671, `0e63c6b5fcc6cdfbf2f13c3f3206f82287ad1330`.
This cut introduces the missing action vocabulary and an in-memory enforcement
boundary; it does not grant new privileges, activate LOCAL, or close #3392.
The user waived blocking Planning DB consultation for this conversation only.
No architectural acceptance is inferred, and no database is rebuilt.

## Existing and proposed responsibility

`AuthorizeCommandScopeService` remains the policy decision/audit gateway.
`EmbeddedAccessDecisionService` and the grant repository retain grant semantics.
The new lease must never evaluate grant hierarchies, mint permissions, or persist
an authorization decision as reusable permission. It selects the required actions
and enforces scope, assertion lifetime and terminal operation state.

```text
Authenticated principal + environment scope + explicit operation
  -> capture the immutable operation inputs in memory
  -> current AuthorizeCommandScopeService.authorizeMany + existing audit
  -> verify exact action/scope and assertion lifetime again
  -> permit caller to begin its authorized lookup / next bounded chunk
  -> checkpoint during capture, or beforePromotion immediately before commit
```

| Operation | Required current DVT grants |
| --- | --- |
| view | workspace:local-data:view |
| capture | workspace:local-data:capture AND workspace:source-import:view |
| delete | workspace:local-data:delete |

No grants are added to onboarding, compatibility rules, development defaults or
wildcards. Source object SELECT/credential permissions remain the acquisition
adapter's responsibility, not a consequence of `source-import:view`.

## Lifecycle and safe failure

Opening a lease checks authorization before returning it. Each checkpoint reloads
current policy; it does not cache an earlier allow decision. Every checkpoint
checks assertion expiration before and after the async decision/audit and rejects
clock regression. Input principal/IDs/arrays/dates are copied; later caller edits
must not extend the lease or substitute another tenant. Failure or close is
terminal and aborts the lease signal. Re-granting a permission requires a new
lease; concurrent checks are rejected, not deduplicated or silently joined.

`beforePromotion` is capture-only and always performs a fresh check. It does not
execute a commit or assert atomicity between two independent persistence systems.
Grant changes AFTER a successful check cannot be eliminated by another precheck;
#3393/#3394 must define their point-in-time authorization/promotion semantics and
record known committed outcomes. The lease cannot roll back already-read bytes.

Checkpoint scheduling, remote-resource cancellation and final commit are owned
by #3394/#3393. No background timer, online permission push, per-query sandbox or
automatic provider ACL revocation is claimed. DVT LOCAL views do not reconnect to
the provider to check remote permission on every page. Denials from the existing
authorizer retain its audit; local lease expiry/closure reports a safe reason,
not a fabricated grant-denied event or a second ledger.

## Test plan frozen before implementation

Deny on missing local action, missing source-view for capture, mismatch of each
scope axis, suspended/conflicting principal, expiry before/during async work,
invalid/regressed time, late approval after close, mutable caller inputs,
malformed authorizer batches, audit/decision exception and promotion by view/delete.
Prove fresh checks and unchanged action kinds; controlled decision ports are unit
fixtures, not evidence of real grant persistence or end-to-end authorization.

## Remaining #3392 responsibility

No current HTTP route consumes this helper. No claim that every LOCAL operation
is wired. Follow-on consumers must await the check before lookup and at bounded
capture checkpoints, connect its AbortSignal to real provider cleanup, and verify
requested generation/scope using #3391 metadata and the current reader.
Native DB/WAL modes, symlinks, shared-instance settings and spill protection need
real POSIX/DuckDB tests in the next security sub-cut. Keep the implemented one-file,
one-instance workspace topology; no old active/staging/run-spill directories.

## Compatibility and rollout

Action additions are explicit and default-denied. Existing action names/grants,
DataAccess.v1, #3671 contract bytes, paths, native settings and routes are unchanged.
No activation or migration is bundled. Do not roll out dependent LOCAL consumers
until #3671, this cut, native hardening and the real gates are accepted. Rollback
of this isolated proposal is a revert before any dependent consumer is shipped;
do not delete local data or modify grants to roll it back.

## Sources

- https://github.com/dunay2/dvt/issues/3392
- https://github.com/dunay2/dvt/pull/3671
- https://github.com/dunay2/dvt/issues/3392#issuecomment-5989398375
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://duckdb.org/docs/current/operations_manual/securing_duckdb/overview
