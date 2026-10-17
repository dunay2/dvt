---
title: LOCAL metadata contract candidate evidence
status: Draft
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

# LOCAL metadata contract candidate evidence

Owner: [#3391](https://github.com/dunay2/dvt/issues/3391).
Base: `8d8c241d3c1ee35c03971a5380f963a58aa8131f`.
The commands in frontmatter are required validation, NOT a claim they passed.
No code has been merged or a production capability enabled by this evidence.

## Actual local work

Add strict Zod metadata contracts, UUIDv7 IDs using @dvt/crypto, acquisition and
schema digests, generation/selection checks, capture transitions and a row-free
API read port. Reuse ConnectedSourceRef, WorkingDataCoverage and
DataAccessSelection; no replacement of DataAccess.v1, no DuckDB implementation.
The contract rationale and matrix were written before implementation.

## Results available in this conversation

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

## Validation still required

The checkout could not be cloned (github.com DNS resolution failure). pnpm,
Zod, Vitest and workspace dependencies are not installed in this runtime.
Repository versions are TypeScript 5.9.3 / Vitest 3.2.4 / Zod ^4.3.6; the
locally available TypeScript is 5.8.3. No substitute schemas, crypto or Vitest
implementation was introduced to fabricate a PASS.

Full package tests/build, API typechecks, lint/format, schema checks, dependency
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
