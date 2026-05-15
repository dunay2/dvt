---
title: Fowler analysis for CI-AUDIT-ENGINE-COVERAGE
task_id: CI-AUDIT-ENGINE-COVERAGE
date: 2026-05-15
status: Active
---

# Fowler Analysis For CI-AUDIT-ENGINE-COVERAGE

## Context

The Test Suite workflow already uses `tools/ci/emit-scope.mjs --mode test` for
package tests, determinism, adapter-postgres, and engine coverage. The remaining
finding from the CI build audit is narrower: `coverage_relevant` is still a
local sub-scope of engine source and test files, while the actual engine
workspace scope is `packages/@dvt/engine/**`.

That means `packages/@dvt/engine/vitest.config.ts` can change the coverage
runner behavior without opening the Engine Coverage Gate on pull requests.

## Fowler View

| Finding                                                                                              | Fowler signal                                     | Mature-system comparison                                                                | Applied response                                                               |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Coverage scope repeats a narrower engine package definition.                                         | Duplicate semantics and primitive path obsession. | Mature CI systems keep one package ownership policy and derive gate sub-scopes from it. | Reuse the engine workspace policy as the coverage gate package trigger.        |
| Workflow docs say coverage consumes shared semantic scope, but one sub-scope is still hand narrowed. | Documentation drift.                              | Mature systems document the current executable contract, not the desired endpoint.      | Add component guide and proposal language for the concrete coverage invariant. |
| Existing tests prove the workflow consumes `coverage_relevant` but not what the output means.        | Test-only confidence.                             | Mature systems test the semantic mapping that protects the failure mode.                | Add a semantic architecture test for engine config coverage routing.           |

## Patterns Improved

- **Single source of truth:** engine package ownership remains in the governed
  workflow scope policy and coverage consumes it.
- **Intention-revealing query:** `coverage_relevant` becomes the read-model
  output for "does this PR require engine coverage threshold enforcement?"
- **Semantic architecture guard:** CI tool tests assert the path-to-output
  behavior, not only the presence of workflow strings.

## Antipatterns Detected

- **Duplicate path taxonomy:** `packages/@dvt/engine/src/**` and
  `packages/@dvt/engine/test/**` repeated a subset of
  `workspace_engine`.
- **Hidden authority:** coverage behavior was partly decided by a private array
  instead of the package ownership policy.
- **Docs/code drift:** existing CI scope docs described shared semantic scope,
  but the failing canary path was not mechanically covered.

## Component Grouping

The affected code belongs to one component:

- `Engine Coverage Scope Gate`
  - query owner: `Repository CI scope policy`;
  - read model: `WorkflowModeScopeOutputs.coverage_relevant`;
  - adapter surfaces: `.github/workflows/test.yml`,
    `tools/ci/emit-scope.mjs`;
  - policy source: `tools/ci/scope-config.mjs` plus
    `tools/ci/policy/workflow-scope.json`.

## Teachings

- Package-level coverage gates should use package ownership as the trigger and
  leave threshold details to the coverage command.
- A workflow parity test is insufficient when the risk is a false-negative
  changed-path decision.
- When a CI optimization narrows fan-out, add a negative canary for every
  package-level config file that can change the skipped command.

## Repetitions Removed

- The engine coverage path set stops carrying its own source/test-only version
  of the engine workspace.
- The engine test scope and coverage scope can share the same package policy
  source for engine ownership.

## Opportunities Left

- Move other package-specific `TEST_SCOPE_PATTERNS` entries to named constants
  only when a concrete drift appears.
- Generate workflow scope documentation from `scope-config.mjs` if future CI
  drift becomes frequent.

## Drift Fixed

- Code drift: coverage gate now aligns with `workspace_engine`.
- Documentation drift: local component docs and testing guide state the
  concrete invariant.
- Test drift: CI tool tests prove `packages/@dvt/engine/vitest.config.ts`
  activates coverage threshold enforcement.
