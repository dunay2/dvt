---
title: Contracts compatibility schema parity
status: Accepted
date: 2026-06-12
owners:
  - '@dvt/contracts'
arc_level: ARC-2
breaking: false
code_refs:
  - contracts/compat/plan-compat.schema.json
  - contracts/compat/plan-compat.json
  - packages/@dvt/contracts/compat/plan-compat.schema.json
  - packages/test/matrix-alignment.test.ts
  - tools/ci/contracts-compat-schema-parity.test.mjs
  - tools/ci/contracts-package-governance.test.mjs
evidence:
  tests:
    - node --test tools/ci/contracts-compat-schema-parity.test.mjs
    - node --test tools/ci/contracts-package-governance.test.mjs
    - pnpm exec vitest run --config vitest.config.ts packages/test/matrix-alignment.test.ts
    - pnpm --filter @dvt/contracts test -- schema-sync.test.ts plan-admission-matrix.contract.test.ts plan-version.contract.test.ts
---

# Summary

This evidence records the ARC-2 proof for aligning the packaged
`@dvt/contracts` compatibility schema with the canonical root compatibility
schema.

# Scope

- The canonical plan compatibility matrix remains
  `contracts/compat/plan-compat.json`.
- The canonical schema remains
  `contracts/compat/plan-compat.schema.json`.
- The packaged schema under `packages/@dvt/contracts/compat/` is a parity copy
  of the canonical schema and must not introduce a second version literal style.
- CI now includes a node test that fails if the packaged schema drifts from the
  canonical root schema.
- CI now includes a node test that keeps `@dvt/contracts` package exports,
  build/test config, entrypoint delegation, and validation suite wiring visible
  to the component map.

# Validation

The commands listed in frontmatter are the targeted validation set for this
contract compatibility parity slice. The task closeout records the final
pass/fail result for the full governed baseline.
