---
title: LOCAL generation metadata contract evidence
status: final
date: 2026-10-16
owners:
  - packages/@dvt/contracts
  - apps/api
planning_type: evidence
arc_level: ARC-2
breaking: false
code_refs:
  - packages/@dvt/contracts/src/contracts/local-data/index.ts
  - packages/@dvt/contracts/src/contracts/local-data/localDataInvariants.ts
  - packages/@dvt/contracts/src/contracts/local-data/LocalDataGeneration.v1.ts
  - apps/api/src/application/ports/localDataPlane.ts
evidence:
  tests:
    - pnpm --filter @dvt/contracts test test/local-data
    - pnpm --filter @dvt/contracts build
    - pnpm verify:prepush
---

# LOCAL generation metadata contract evidence

Owner: [#3391](https://github.com/dunay2/dvt/issues/3391).
Base: `8d8c241d3c1ee35c03971a5380f963a58aa8131f`.
Results are attributed to their recorded stage below. The original offline
proposal evidence does not substitute for the checkout integration results.
No production capability is enabled by this metadata contract.

## Actual local work

Add strict Zod metadata contracts, UUIDv7 IDs using @dvt/crypto, acquisition and
schema digests, generation/selection checks, capture transitions and a row-free
API read port. Reuse ConnectedSourceRef, WorkingDataCoverage and
DataAccessSelection; no replacement of DataAccess.v1, no DuckDB implementation.
The contract rationale and matrix were written before implementation.

## Original offline proposal results

- Initial RED: native test command failed with missing unimplemented module.
  This is an import/availability RED, not an observed application regression.
- Actual pure product module and its test bodies: strict TypeScript compilation
  succeeded with TypeScript 5.8.3 and the real Node type declarations.
- 84 native tests passed; a property-style test covered 1320 small-state sample
  combinations. The same bodies are included in the repository Vitest test file;
  the offline harness replaces only the test-runner import and module path.
- Six deliberate defects in a disposable compiled copy were all detected.
  After restoring the compiled module, all 84 tests passed again.
- All 11 candidate TypeScript files transpiled without syntax diagnostics.
  This is NOT a semantic typecheck of Zod, crypto or the API consumer graph.
- Two independent canonical-JSON SHA-256 vectors were generated for schema and
  request tests. The real @dvt/crypto integration assertions remain unexecuted.

## Original offline validation boundary

At that proposal stage, the checkout could not be cloned (github.com DNS resolution failure). pnpm,
Zod, Vitest and workspace dependencies are not installed in this runtime.
Repository versions are TypeScript 5.9.3 / Vitest 3.2.4 / Zod ^4.3.6; the
locally available TypeScript is 5.8.3. No substitute schemas, crypto or Vitest
implementation was introduced to fabricate a PASS.

At that stage, full package tests/build, API typechecks, lint/format, schema checks, dependency
architecture, docs sync, ARC evaluation and pnpm verify:prepush have NOT run.
At the time of the local checks no commit had been made. The candidate is not
ready for merge and #3391 remains open.

## Proposal publication requested on 2026-10-17

The user subsequently requested a commit and remote publication so other agents
can review the proposal. Git transport still fails DNS resolution in the local
environment. Publication therefore uses the connected GitHub Git-data API into
an isolated proposal branch and a draft PR, not a local git commit/push command.
The repository commit helper, local hooks and verify:prepush are NOT executed by
that API. Their successful execution is not claimed, and no hook, workflow,
branch protection or security configuration is modified. Those validations and
review remain required before any integration into main.

Before publication, the offline validation was repeated: strict pure-core/native
test compilation PASS with TypeScript 5.8.3 / Node 22.16.0; 84/84 native tests
PASS; syntax-only transpilation of 11 candidate TypeScript files PASS. Real
Zod/crypto/Vitest, full build/consumer checks, lint/format, ARC and prepush remain
unexecuted. No synthetic PASS is assigned to the pending checks.

The operator waived Planning DB consultation for this conversation; its
architecture authority was not imported, rebuilt or marked as verified.
Persisted generations, EOF truth, authorization and actual type-conversion
fidelity require the subsequent real-adapter slices.

## Checkout integration on 2026-10-18

Governing issue #3391 / PR #3671. The original proposal was reconciled with
current main in a complete checkout using the unchanged workspace lockfile.
No product behavior correction was necessary for the actual dependency-backed
contracts tests or contracts build.

- `pnpm --filter @dvt/contracts test test/local-data`: PASS, two files,
  149 tests, 3.08 seconds. Actual Zod/crypto/Vitest; 84 invariant cases and
  65 schema/crypto integration cases. The existing golden digest assertions
  use the real `@dvt/crypto` implementation. No runner substitution or new
  offline harness.
- `pnpm --filter @dvt/contracts build`: PASS with repository TypeScript 5.9.3.
- `pnpm --filter @dvt/contracts typecheck`: PASS.
- `pnpm --filter dvt-api typecheck`: PASS for production and test TypeScript
  consumers, including the declared row-free port. Its normal dependency builds
  ran; no prebuild or hook bypass was used.
- `pnpm --filter @dvt/contracts schema:verify`: PASS, 25 schema-sync tests.
- `pnpm --filter @dvt/cli build` and `pnpm validate:contracts`: PASS, 24 checks
  over three existing plan fixtures. The validator reports its pre-existing
  missing glossary source and optional result fixture; those omissions are not
  claimed as exercised golden cases. The two affected metadata digest golden
  assertions ran in the 149-test dependency-backed suite.
- `pnpm arch:deps`: PASS. The reachability report identifies the uncomposed
  `ILocalDataGenerationReader` as an orphan/unused-export candidate, consistent
  with its planned, type-only boundary; no runtime consumer is claimed.
- The exact-base/head Planning DB implementation baseline initially failed
  on 48 undeclared proposal symbols. Audited `CreateArchitectureDesign` and
  `RecordFeatureMechanizationRail` operations reconciled that specific scope
  before checkout corrections. No import/rebuild or fabricated earlier
  admission. Design `GH-3391-LOCAL-GENERATION-METADATA` is in review; the
  row-free storage query remains planned and has no runtime adapter.

The admission and its Fowler/DDD scope, negative matrix and validation boundary
are recorded at https://github.com/dunay2/dvt/issues/3391#issuecomment-6251920732.
Final formatting/lint, documentation, ARC, prepush and clean exact-base/head
Planning DB results are recorded on the final PR comparison before integration.
The metadata contract has no storage query implementation, row conversion,
capture endpoint or runtime activation. Subsequent issues retain those criteria.
