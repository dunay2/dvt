---
title: LOCAL storage boundary candidate evidence
status: Draft
date: 2026-10-17
owners:
  - api
arc_level: ARC-3
breaking: true
code_refs:
  - apps/api/src/infrastructure/duckdb/duckDbLocalDataPaths.ts
  - apps/api/src/infrastructure/duckdb/DuckDbLocalDataRuntime.ts
  - apps/api/test/infrastructure/duckDbLocalDataStorageBoundary.test.ts
  - apps/api/test/infrastructure/DuckDbLocalDataRuntime.storage.test.ts
evidence:
  tests:
    - node validation/run-fs.mjs baseline RED-real
    - node validation/run-fs.mjs candidate GREEN-complete
    - node validation/mutation-check.mjs
    - node validation/run-fs.mjs candidate GREEN-final
---

# LOCAL storage boundary candidate evidence

## Scope and base

#3392-B on proposal #3672, exact base
`678705b7b1271f81674a5fd89154df5344f40f99`. This is not a completed
security cut or permission to merge. ARC-3 is expected from the existing
`docs/security/**` policy; the actual ARC evaluator has not been run here.
The `breaking` flag records the stricter acceptance of existing storage modes.

## Executed evidence

Five base source files were fetched from GitHub and checked byte-for-byte by
Git blob SHA. Tests execute the actual paths module, Node fs and scope path
helper on real temporary POSIX directories. No DuckDB mock is used.

The local package's `validation/run-fs.mjs` copies those files and changes only
the test-runner import from Vitest to `node:test`. It compiles the reachable
graph with strict TypeScript, exactOptionalPropertyTypes and noUncheckedIndexedAccess.
Toolchain: Node 22.16.0, TypeScript 5.8.3, real @types/node 25.1.0.
These are not the complete repository lockfile/toolchain or Vitest execution.

- Initial environment attempt: missing Node typeRoot, compilation FAILED.
  Corrected to the installed real ts-node/@types/node; no fake declarations.
- RED against the unchanged paths implementation: typecheck PASS;
  **25 tests: 3 PASS / 22 FAIL**. Failures were missing expected rejections
  for unsafe DB/WAL/private-directory modes, not missing production modules.
- GREEN for those same 25 cases: **25 PASS**.
- Expanded physical-identity, missing/replaced paths, WAL lifecycle, symlink,
  hardlink, no-repair, scope and concurrent validation matrix: **53 PASS,
  0 FAIL, 0 SKIP**. These tests do not grant or test user authorization.
- Eight deliberate mutations of disposable compiled copies were detected:
  file modes, directory special bits, WAL checking, temp/DB/root/namespace
  identity and hardlinks. Restored compiled copy: **53 PASS**.
- Final rerun after source review: strict selected-graph typecheck PASS,
  **53 PASS / 0 FAIL / 0 SKIP**.
- All four changed/new TS files transpiled without syntactic diagnostics.
  This is not semantic typechecking of the native runtime or driver tests.

The validation scripts and complete receipts accompany the conversation archive;
commands above run from that archive, not the repository root.

## Prepared, NOT executed

`DuckDbLocalDataRuntime.storage.test.ts` contains eight POSIX real-addon cases
(Windows has an explicit rejection case), covering native DB/WAL modes,
reopen, callback gating, post-failure checking, replaced/missing temp and
non-deletion of a shared-directory sentinel, plus retained security settings.
The sentinel is not proof that a workload actually spilled.

The pinned addon is absent locally and GitHub/npm DNS resolution fails.
NOT RUN: these native tests, existing native regression suite, actual spill,
Vitest, full API build/typecheck/lint/format, architecture checks, ARC evaluator,
security scan, docs sync, verify:prepush and CI. Native lifecycle compatibility
is a mandatory remaining gate, not inferred from filesystem PASS.

## Publication and completion

The user requested continued reviewable proposals. Publication uses GitHub
Git-data API because console Git is unavailable; the API does not execute the
local commit helper/hooks. No hook, branch protection, workflow or security rule
is disabled. Keep Draft and main unchanged; the API publication is not a gate
waiver or accepted implementation. Planning DB consultation exception is limited
to this conversation; no import/rebuild or fabricated architecture record.

Before integration use a full checkout with the actual dependencies, run both
filesystem and native suites plus existing runtime/path regression tests, evaluate
ARC, complete security/compatibility/rollout review and prepush/CI on the exact SHA.
See `docs/security/local-data-storage-boundary.md` and the linked risk record.
