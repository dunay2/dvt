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

The protected runtime binds capture and exact-generation metadata to the current
authorization lease. Those checks do not authorize every future LOCAL operation.
No public data path or default grant is introduced by this cut.

The approved topology uses one API-owned workspace instance and shared spill.
The historical per-run spill and separate active/staging databases in older
Tasks #3392 prose are not implementation instructions. Physical validation belongs to
the native runtime; current evidence is in ED-20261018-local-capture-integration.md.

## Mandatory mitigation / next owner

Tasks #3393/#3394 must consume current authentication and exact environment scope,
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
Keep default OFF. Acceptance requires affected API tests and grant-policy tests,
ARC-3 requirements, native checks and exact-candidate prepush/CI.

## Evidence limitations

Lease tests use the actual authorization service with controlled decision and
audit ports. Embedded-policy composition uses controlled grant persistence.
Native proof uses the production capture/metadata factory with actual PostgreSQL
and DuckDB; it does not prove production identity-provider/grant persistence.
Current results and remaining gates are recorded in the integration evidence.
