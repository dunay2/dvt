---
title: Engine coverage must produce real threshold evidence
status: Draft
date: 2026-09-30
owners:
  - ci
arc_level: ARC-2
breaking: false
code_refs:
  - package.json
  - vitest.config.ts
  - packages/@dvt/engine/vitest.config.ts
  - .github/workflows/test.yml
  - tools/ci/engine-coverage.test.mjs
evidence:
  tests:
    - node --test tools/ci/engine-coverage.test.mjs
    - pnpm test:coverage:engine
    - pnpm --filter @dvt/engine exec tsc --noEmit -p tsconfig.json
    - pnpm validate:contracts
    - pnpm golden:validate
---

# Engine Coverage Must Produce Real Threshold Evidence

## Governing Claim

[#3494](https://github.com/dunay2/dvt/issues/3494) records the approved plan,
current/target diagrams, Fowler matrix and bounded command/query catalog before
implementation. Planning DB design `GH-3494-ENGINE-COVERAGE-EVIDENCE` registers
the allowed surfaces and `ValidateEngineCoverageEvidence` rail. The
[component guide](../architecture/components/ci-governance/engine-coverage-scope-gate-component.md)
owns the evidence contract. Existing scope routing, check names, integration
lanes, source exclusions and thresholds are preserved.

The complete implementation diff classifies as ARC-2 because it includes engine
Vitest configuration. No runtime, public contract or application data changes.

## Root Cause And Red/Green Evidence

The installed Vitest CLI interprets the extra argument separator in
`vitest run -- --coverage` as positional arguments rather than enabled coverage.
The engine config also did not inherit the root thresholds. The artifact action
warned about the absent directory instead of failing. Historical
[run evidence](https://github.com/dunay2/dvt/actions/runs/36720477890/job/109904075197)
shows 527 passing tests with no coverage report and a green job.

All four new tests failed before the fix. The executable low-coverage fixture
returned 0, reproducing the misleading green rather than merely checking YAML.
After correction, the negative fixture returns 1 with threshold diagnostics,
unexecuted source appears at zero hits, and the stale report marker disappears.
The fully covered control returns 0 and generates the JSON report. Workflow
assertions require that exact file and the upstream action's missing-file error
policy; they are not presented as a local execution of the GitHub artifact service.

The public command still invokes the package test/pretest lifecycle. One named
root policy supplies the V8 provider, reporters and unchanged 65/55/65/65
thresholds. Only source paths are adapted by the package config. No parallel
runner or coverage validator is introduced.

## Validation

- Real `pnpm test:coverage:engine`: passed all 71 files / 527 tests; V8 report
  includes 128 source files. Statements/lines 90.95%, branches 88.46%, functions
  93.57% in this run. These are coverage figures, not a CI latency claim.
- Coverage, root-config, partition, scope and workflow contracts: 54 passed.
- Engine typecheck passed. Scoped ESLint passed; root Vitest config is outside
  the existing ESLint scope and is checked by actual config loading instead.
- Contract fixtures: 25 checks passed. Existing missing glossary input is
  reported by that command and is not counted as validated.
- Golden fixture/hash command passed its existing implemented cases; it retains
  two deprecated entries and one not-implemented retry skip. No live provider
  proof is claimed from this command.

Final hook-normalized prepush, exact base/head mechanization, remote checks and
artifact identity are recorded on the issue and implementation PR.

## No Debt / Limits

No rules were relaxed, hooks bypassed, tests removed, thresholds lowered, stubs
introduced or application databases accessed. Temporary test fixtures and
reports are isolated and disposed by the test. The existing CI risk record is
updated, not used to authorize new debt. Repeated executions, dependency-guard
concerns and early local rejection remain separate approved cuts.
