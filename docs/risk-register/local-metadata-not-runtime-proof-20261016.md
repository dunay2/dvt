---
title: LOCAL metadata is not authorization or runtime proof
status: Open
date: 2026-10-16
owners:
  - packages/@dvt/contracts
  - apps/api
---

# LOCAL metadata is not authorization or runtime proof

Tracks the candidate contract boundary in #3391; not a waiver of validation.

## Risk

A consumer could mistake structurally valid metadata, a matching fingerprint
or an explicit source-exhausted declaration for an authorized, losslessly
captured, durably committed READY dataset. These facts are distinct.

## Mitigation in the candidate

Strict schemas reject unknown fields, swapped identities, stale digests,
inconsistent counts, terminal resurrection and conflicting completion metadata.
The row-free read port passes scope separately and documents current
application authorization. No runtime consumer or public route is enabled.
Source coverage and timestamps have explicit meanings; arbitrary SQL, paths,
row payloads and credentials are not contract fields.

## Required follow-up evidence

#3392 must verify current authorization, scope isolation and revocation.
#3393 must prove atomic generation publication and pinned-reader behavior.
#3394/#3395 must prove actual type fidelity, completion/EOF, budgets, cancellation
and storage failures with real providers/engines. #3391 itself still requires
its real dependency-backed contract/build/lint/prepush gates.

## Exit criterion

Close only when the applicable consumers verify these facts independently,
the candidate passes the canonical gates, and review confirms no consumer
interprets parsing or ID correspondence as permission/readiness. No prediction
of performance, cost saving, global snapshot or exactly-once acquisition follows
from this metadata-only implementation.
