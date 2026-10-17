---
title: LOCAL authorization requires admitted consumers and native isolation
status: Open
date: 2026-10-17
owner: API security
severity: High
related_issues:
  - 3392
  - 3393
  - 3394
  - 3671
---

# Candidate security boundary is not end-to-end enforcement

## Risk and current exposure

The proposed lease is not wired into a public LOCAL feature. Passing isolated
permission checks must not be used to enable LOCAL or to claim all reads are
authorized. No new public data path is introduced by this candidate.

The approved topology uses one API-owned workspace instance and shared spill.
The historical per-run spill and separate active/staging databases in older
#3392 prose are not implementation instructions. Physical native validation
remains the subsequent #3392-B responsibility.

## Mandatory mitigation / next owner

#3393/#3394 must consume current authentication and exact environment scope,
verify generation/source bindings, await authorization before lookup and before
promotion, define checkpoint cadence, and route abort to real resource cleanup.
They must not persist/replay this lease or an approval as permission. Tests must
include scope substitution, revoked grants, expired assertions and late results.

A revocation between the final check and a separate DuckDB commit is a remaining
consistency window, not fixed by adding repeated checks. Document the allowed
point-in-time authorization semantics and preserve confirmed commit outcomes;
do not describe a committed generation as rolled back solely due to a later
permission check. Cross-store linearizability would require a separate design.

## Rollout / compatibility

Default action grants are unchanged. No initial LOCAL grant is inferred from
catalog or creator permissions. No new automatic provider ACL revalidation,
automatic capture, offline-client topology or native sandbox is promised.
Keep inactive until parent contracts, full API tests, actual grant-policy tests,
ARC-3 requirements, native checks and exact-candidate prepush/CI are completed.

## Evidence limitations

57 focused tests use the actual API authorization service but controlled decision
and audit ports. 9 real embedded-policy composition tests await full dependencies.
There is no production authorization, storage or native-OS proof in this cut.
The code, test evidence and Draft publication state must remain explicit.
