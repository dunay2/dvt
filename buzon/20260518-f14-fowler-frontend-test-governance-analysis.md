---
title: F-14 Fowler Frontend Test Governance Analysis
status: Accepted
date: 2026-05-18
owners:
  - apps/web
planning_type: analysis
---

# F-14 Fowler Analysis

## Scope

F-14 governs the `@dvt/web` test execution boundary. The slice does not change
product runtime behavior. It closes the gap between the existing Vitest files,
the suite catalog introduced by the web partition work, and the CI topology that
must prove web tests as a first-class frontend lane.

## Mature-System Comparison

Mature frontend systems do not treat browser tests as incidental package
commands. They maintain:

- explicit suite ownership for fast local feedback;
- a dedicated CI lane for the deployable frontend package;
- test-support placement that cannot be confused with production adapters;
- architecture tests that validate routing semantics, not only barrel shape.

The current system already improved from one full Vitest command to a suite
catalog. F-14 finishes the maturity step by making that catalog visible in CI
and documentation.

## Improved Patterns

<!-- markdownlint-disable MD060 -->

| Area         | Pattern applied             | Improvement                                                                       |
| ------------ | --------------------------- | --------------------------------------------------------------------------------- |
| Test routing | Test Suite Catalog          | One catalog owns `unit`, `presentation`, `architecture`, and focus suites.        |
| CI topology  | Dedicated CI lane           | Web tests run as `Web Frontend Tests`, not as an anonymous step in a generic job. |
| Test support | Test Support Boundary       | Harnesses and doubles are documented as test-only infrastructure.                 |
| Architecture | Semantic architecture guard | Tests assert docs, ownership, CI wiring, and suite semantics together.            |

<!-- markdownlint-enable MD060 -->

## Antipatterns Detected

- Anonymous frontend test execution inside the generic `Run Tests` job.
- Drift between roadmap text saying no governed test path exists and code that
  already exposes partitioned commands.
- Test-support files under `src/**` without a component guide explaining why
  they are not product adapters.
- Risk of duplicate suite semantics in workflow YAML, package scripts, and
  Vitest configs.

## Components To Group

The owned component is `Frontend Test Governance`.

- `apps/web/vitest.suites.ts`: suite catalog and file classifier.
- `apps/web/vitest*.config.ts`: thin suite config adapters.
- `apps/web/src/testing/**`: workspace-level test support.
- `apps/web/src/**/*.test.*`: test consumers assigned to exactly one primary
  suite.
- `.github/workflows/test.yml`: CI consumer of the web test command.

## Repetitions Fixed

- The generic CI job no longer owns web test execution on PR or push paths.
- Vitest config modules now state their owned concern instead of forcing
  readers to infer whether they own suite semantics.

## Drift Fixed

- Documentation now names the governed frontend test path.
- CI now exposes a named web frontend test lane.
- The roadmap no longer claims the lane is absent once F-14 lands.

## Opportunities Left

- F-14-A should continue from this boundary and route changed web files to the
  smallest safe suite command.
- Cypress remains a separate browser-proof lane and is not collapsed into this
  Vitest governance boundary.

## Future Teaching

For future frontend slices, add or update the suite catalog first, write a
failing architecture guard, then wire package scripts and CI. Avoid adding
route-local test commands that bypass `WebVitestSuiteCatalog`.
