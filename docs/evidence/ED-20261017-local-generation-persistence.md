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

## Bounded bulk append and PostgreSQL codec (#3394-A)

This subcut builds on #3676 at
`28669388388a56f92374b1588521137ea8fc169a`, not main. Its API job
[117466392167](https://github.com/dunay2/dvt/actions/runs/39056766589/job/117466392167)
passed with 1567 unit tests (27 skipped) and nine integration tests (126 skipped).
The overall run subsequently failed; it is not an accepted merge baseline.
The design was recorded before code in
[#3394](https://github.com/dunay2/dvt/issues/3394#issuecomment-6238618039).

The original append loop issued one row INSERT per record. The new test requires
an actual DataChunk/Appender and rejects physical drift before any native cast.
The exact PostgreSQL codec is pure and supports only raw-text int8/bool/text/varchar
OIDs. No connection or source acquisition is part of this subcut.

RED commit `3e4997dcf215249aac4070475f6c5cba216e7f35` was tested as technical merge
`5051abb238f49299a9b0c8ba4b008c00b3355d60` in
[39059481016 / API 117474354521](https://github.com/dunay2/dvt/actions/runs/39059481016/job/117474354521).
Ubuntu 24.04.5, Node 22.23.3, TypeScript 5.9.3, Vitest 3.2.4 and DuckDB 1.5.6
were used with the unchanged repository lockfile. Build: 20/20 tasks, four cached.
The 12 new native tests produced six passes and six failures: three missing
Appender/chunk/close observations and three missing schema-drift rejections.
The codec passed 92/92 tests. Existing generation 19/19, catalog 9/9, SIGKILL 2/2
and primitive profile 42/42 also passed. Unit totals: 1665 passed, six failed,
27 skipped; integration did not execute after the expected RED failure.

The correction replaces the row loop inside the existing Store and extracts its
schema-only validator for reuse before append. Native flush/close precede the
same counter update, authorization checkpoint and COMMIT. The 12 native and 92
codec tests are unchanged between RED and the proposed GREEN implementation.
The GREEN hosted result is pending when this correction is committed; record the
exact SHA, job and outcomes in the issue/PR before claiming it passed.

A local transpiled copy of the pure codec tests also passed 92/92 before a runtime
reset; no retained local log is offered as native evidence. The hosted codec
result above is the durable executable proof. Full repository source/test
typecheck, lint/format, security/ARC, prepush and human review remain pending.
No workflow, dependency, lockfile, permission, threshold or LOCAL flag changes
are part of #3394-A. Raw-text fixtures and local native writes do not establish
PostgreSQL cursor behavior, source privileges, EOF or end-to-end backpressure.

## #3394-B source boundary candidate

Base `79c63c035840d2b3ca16f353017c4dbd41a86b93`, issue design
[#3394 comment](https://github.com/dunay2/dvt/issues/3394#issuecomment-6241155973).
The source reader, sequential state and shared relation helper extend the
existing bulk codec and Store. No public capture route is composed.

Pinned `pg-cursor@2.15.3` and `@types/pg-cursor@2.7.2` were generated with normal
pnpm commands in [preparation run 39070207147](https://github.com/dunay2/dvt/actions/runs/39070207147).
Existing native-package libc metadata was preserved, the parsed original lock
was compared after excluding only the two added dependencies, and a frozen
install left the resulting lock hash unchanged. The preparation workflow lives
only on its isolated auxiliary branch and is not in this product candidate.

Local: five new TypeScript files transpiled without syntax diagnostics using
TypeScript 5.8.3; 15 pure pull-state tests passed using transpiled copies and
node:test. These are not semantic typecheck, Vitest, PostgreSQL or DuckDB proof.

The added real proof uses the existing CI PostgreSQL service, an independently
verified non-superuser/non-BYPASSRLS reader, and native DuckDB private storage.
It fails without explicit loopback `dvt_test` URLs. The test creates and drops
only its uniquely named fixture schema. Cases cover 2053 rows, exact bigint,
RLS/SELECT/token, snapshot mutation, EOF/target/budgets, close/error/abort, source
timeout, identifier quoting, and unchanged real Preview. Publication occurs
only after source closure in the fixture. The capture lease/revision fingerprint
in that fixture is not production command composition or external grant proof.

Hosted results for this candidate are pending at publication; tests omitted by
the ordinary API integration profile cannot be counted as executed. Record
exact head, technical merge SHA and job URLs in the PR and governing issue.
Full CI, source/test typecheck, lint, security, ARC and prepush remain required.
