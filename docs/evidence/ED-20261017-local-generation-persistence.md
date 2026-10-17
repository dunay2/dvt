---
title: LOCAL generation persistence candidate evidence
status: Draft
owner: API / Data Infrastructure
last_reviewed: 2026-10-17
---

# LOCAL generation persistence candidate evidence

Task: #3393-A. Parent candidate: #3675 at
`0bb123374936f5026f6d2d86760883d33c45ca79`; not main.
Pre-implementation design is recorded in
[#3393](https://github.com/dunay2/dvt/issues/3393#issuecomment-6237253632).

## Proven baseline versus this candidate

The parent API build/test job 117437974016 passed against the pinned native
runtime. Its overall suite 39047034277 failed in browser lanes, so it is not a
merge-approved baseline. This adapter does not modify those lanes or thresholds.

Local checks for the new pure profile: 42/42 identical test bodies using a
transpiled disposable copy with the runner changed from Vitest to node:test;
strict TypeScript compilation of that dependency-free module passed with local
TS 5.8.3 / Node 22.16.0. This is not the repository TS 5.9.3/native validation.
The six new TypeScript files were syntax-transpiled without diagnostics.

Native generation, snapshot and crash tests are authored for the real pinned
addon and existing API suite. At initial publication their hosted execution is
PENDING; GitHub issue/PR comments record the exact candidate and actual outcomes.
A local direct test attempt could not load TypeScript/dependencies; it is an
environment failure, not a demonstrated failing product test or native proof.

## Acceptance boundaries

No remote source, bulk capture, LOCAL UI or generation reader route is composed.
No row/SQL/locator escapes through a new public port. Storage methods require a
trusted authorized scope; checkpoints are not a substitute for composition review.
Declared source coverage is contract-checked, not independently observed here.

The native tests must verify staging invisibility, lossless admitted primitive
values, snapshot reads, stale/concurrent head rejection, rollback after metadata
writes, exact idempotent recovery, corruption, scope separation and SIGKILL before
and after COMMIT. Remaining #3393 obligations and #3398 quotas/GC stay open.
Full lint/source+test typecheck/security/ARC/prepush and integration review remain
pending. The conversation exception allows preparation without Planning DB query;
it is not recorded as a successful architecture check and does not permit merge.
