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
Mixed Radix interaction modules can also create independent layer and focus
registries, allowing an exiting Tooltip to consume Escape before an active Dialog.

Resolve the Vitest family to one version, use the supported configuration and
retain explicit coverage source inclusion. Prove the worker limits through the
existing catalog contract and prove both a failing low-coverage example and a
passing control with the installed runner. Preserve all coverage thresholds,
test selection, authorization, native proof and required-result fan-in rules.
Resolve the existing Radix DismissableLayer and FocusScope consumers to one
compatible patch version each. Retain the real animated-tooltip/Dialog Escape
regression and its focus restoration assertion.

Run the affected package checks and `pnpm verify:prepush`, including the real
Temporal adapter and browser obligations selected by the complete candidate.
Merge requires successful required hosted checks at the current head and fresh
Planning DB implementation evidence for the exact base/head. A skipped required
aggregate, bot mergeability or old receipt does not establish acceptance.

The [evidence](../evidence/ED-20261123-pending-dependency-cohort.md) records the
observed regressions and focused results. If a compatibility failure remains,
fix it or retain the dependency PR as unintegrated with its exact failure;
never lower a threshold or bypass a hook to admit the update.

Complexity reduction can accidentally duplicate admission, detach session
lifetime from its owner, lose partial artifact-write evidence, or weaken browser
proof. Keep the existing command/query rails and state cells; project passive
contributions without adding sessions, subscriptions or side-effect handlers.
Retain negative scope, revision, cancellation and exactly-once assertions.
Compare CodeScene findings against the same integration base after hook
formatting. An improved score alone does not establish behavioral acceptance.
The recorded review removes all introduced or degraded findings while retaining
the inherited findings and the engine's two unscored authority scripts explicitly.
