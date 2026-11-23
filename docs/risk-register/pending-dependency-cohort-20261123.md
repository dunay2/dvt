---
id: R-20261123-PENDING-DEPENDENCY-COHORT
title: Test runner and runtime adapter dependency drift
status: Mitigating
date: 2026-11-23
owners:
  - Engineering
  - Web
  - Temporal
severity: High
probability: Medium
---

# Test runner and runtime adapter dependency drift

Mixed public and internal Vitest versions can invalidate test execution before
an assertion runs. Removed worker options can silently lose isolation or heap
limits. New coverage defaults can omit unexecuted source and make a passing
percentage misleading. Temporal dependency drift can affect native worker
initialization and workflow replay even when a TypeScript build succeeds.

Resolve the Vitest family to one version, use the supported configuration and
retain explicit coverage source inclusion. Prove the worker limits through the
existing catalog contract and prove both a failing low-coverage example and a
passing control with the installed runner. Preserve all coverage thresholds,
test selection, authorization, native proof and required-result fan-in rules.

Run the affected package checks and `pnpm verify:prepush`, including the real
Temporal adapter and browser obligations selected by the complete candidate.
Merge requires successful required hosted checks at the current head and fresh
Planning DB implementation evidence for the exact base/head. A skipped required
aggregate, bot mergeability or old receipt does not establish acceptance.

The [evidence](../evidence/ED-20261123-pending-dependency-cohort.md) records the
observed regressions and focused results. If a compatibility failure remains,
fix it or retain the dependency PR as unintegrated with its exact failure;
never lower a threshold or bypass a hook to admit the update.
