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

## Hosted baseline and catalog regression (subcut B)

The existing #3676 candidate `7ae995425fe220910d6ecb3410a7fbea9f38e1b3` ran against
its technical merge `0f9b0474f2accd37ca6d337f967e72428d941ff3` in
[API job 117457638519](https://github.com/dunay2/dvt/actions/runs/39053817343/job/117457638519).
Build: 20 tasks passed, four from cache. Generation tests: 19/19; isolated native
SIGKILL recovery before/after commit: 2/2; primitive profile: 42/42.
API unit suite: 1558 passed, 27 skipped; integration: 9 passed, 126 skipped.
The overall run failed browser lanes. This is not complete provider integration
or merge acceptance, and an API success must not conceal those skips/failures.

The catalog-loss regressions are added before the fix in commit
`0e3f33f835ba330653b3c03549543c0d8223d7de`. The native suite checks missing metadata
with retained data, partial schemas, missing/extra tables and table-to-view
substitution. The RED run
[39056312440 / API job 117464916611](https://github.com/dunay2/dvt/actions/runs/39056312440/job/117464916611)
confirmed one passing case and eight failures, all missing expected rejections.
The existing 19 generation tests and two SIGKILL tests still passed. Build passed
20 tasks (19 cache hits); unit totals were 1559 passed, eight failed, 27 skipped.
Integration did not run after the unit failures. The corrected implementation
must pass these unchanged tests; its exact GREEN result is recorded in GitHub,
not inferred from source inspection or syntax transpilation.

The subcut B changes only the existing metadata owner, a native test and these
component/evidence/risk documents. It does not add another registry or storage
adapter, alter the admitted primitive profile, or enable LOCAL. Full lint,
source/test typecheck, ARC/security, prepush and final review remain required.
