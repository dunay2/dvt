---
title: LOCAL authorization lease candidate evidence
status: Draft
date: 2026-10-17
owners:
  - dvt-api
arc_level: ARC-3
breaking: false
code_refs:
  - apps/api/src/application/ports/accessDecisionActions.ts
  - apps/api/src/application/services/localDataAuthorizationLease.ts
  - apps/api/test/application/services/localDataAuthorizationLease.test.ts
  - apps/api/test/application/services/localDataAuthorizationPolicy.test.ts
evidence:
  tests:
    - pnpm --dir apps/api test test/application/services/localDataAuthorizationLease.test.ts test/application/services/localDataAuthorizationPolicy.test.ts
    - pnpm --dir apps/api typecheck
    - pnpm --dir apps/api lint
    - pnpm verify:prepush
---

# #3392-A evidence — candidate, not security acceptance

Parent candidate: #3671 `0e63c6b5fcc6cdfbf2f13c3f3206f82287ad1330`.
Source inspection includes #3392, its topology reconciliation, the API action,
principal, scope, authorizer/audit and embedded-policy owners. The user authorized
continuation without the blocking Planning DB consultation for this conversation;
that is not permission to claim unexecuted gates or to merge into main.

## Actual changes

Three explicit LOCAL actions, an in-memory lease delegating to the existing
AuthorizeCommandScopeService, a focused test suite, a real-policy composition
test suite for the full checkout, and security/rollout/compatibility/risk notes.
No new grants or grant migration, dependency, route, native runtime, persistent
credentials, database files, data reads or storage implementation. #3392-B and
#3393/#3394 remain necessary; there is no activated LOCAL product consumer.

## Executed in this environment

| Check | Actual result and limit |
| --- | --- |
| Baseline provenance | 8 selected existing API files match GitHub Git-blob SHA byte-for-byte. Only action vocabulary is changed in this cut. |
| RED | Missing new module/actions before implementation. Initial missing Node types was an environment error, corrected before retaining the availability RED. This is not reproduction of a production data leak. |
| Strict selected-graph TypeScript | PASS with TS 5.8.3, Node 22.16.0 and real @types/node 25.1.0. strict, exactOptionalPropertyTypes, noUncheckedIndexedAccess, verbatimModuleSyntax, noEmitOnError. skipLibCheck only skips library .d.ts checking. Not full API typecheck. |
| Focused execution | 57/57 PASS, 0 skipped. The same test bodies and actual AuthorizeCommandScopeService/domain/actions/scopes/audit types run with only Vitest runner import replaced by node:test in a temporary copy. |
| Controlled dependencies | Grant decisions and audit persistence are explicit in-memory test ports. No fake implementation is added to product. This does not test PostgreSQL grant persistence, OIDC signature verification, or production EmbeddedAccessDecisionService. |
| Mutation sensitivity | 8/8 deliberately broken compiled copies detected; each had failing assertions, not merely compile errors. Original compiled file restored and 57/57 PASS repeated. |
| Mutation boundaries | Missing source-view, ignored expiry, missing post-await check, ignored tenant mismatch, late approval after close, caller-mutable principal, skipped prepromotion check, ignored policy denial. |

The reproduction package delivered in the conversation contains byte-verified
baseline sources, candidate sources, `validation/run-native.mjs`, mutation script,
patch and raw command output. It is not a full checkout, and its temporary
package.json/compiler invocation is NOT a repository configuration change.

## Not executed / not claimed

GitHub and registry.npmjs.org DNS fail from the shell. No pnpm/complete lockfile
installation is available. Thus the following remain pending: actual Vitest run,
9 tests in localDataAuthorizationPolicy.test.ts using the real embedded policy,
full API/contracts build and consumers, repository lint/Prettier, architecture
checks, native/HTTP/provider tests, doc synchronization, ARC evaluator, security
scan, compatibility/rollout gate validation, verify:prepush and CI.

ARC-3 is the expected scope because docs/security is touched, not a successful
result from the unavailable complete-diff evaluator. The front-matter commands
are the REQUIRED full-checkout commands, not a list of commands already passed.

## Publication posture

Requested as another proposal for agent review. Publication, if performed via
GitHub Git-data, does not execute git commit/push, repository helper or local
hooks. No hook or branch protection is disabled. Keep a dependent Draft PR and
both #3391/#3392 open. Do not merge the child into its proposal parent as a way of
avoiding eventual main-branch checks. Rebase/retarget after parent acceptance.

## Remaining responsibilities

Authorization must be wired before each real generation lookup, after validating
the authenticated environment, and before bounded acquisition checkpoints. The
future reader must verify dataset/generation-to-scope/source binding; an action
approval alone does not prove that binding. Native files/WAL/spill modes,
containment, real abort cleanup and final promotion remain unproven by this cut.
A prepromotion check is not an atomic transaction across the grant and data stores.
