---
slice: 20260421-web-xyflow-12-10-2
date: 2026-04-21
author: AI (GPT-5)
last_reviewed: 2026-04-21
status: Completed
---

# Closeout: Web XYFlow 12.10.2 maintenance bump

## Think-First Analysis

- Problem summary:
  `apps/web` is locked to `@xyflow/react` `12.10.1` in `pnpm-lock.yaml` while
  upstream has a patch release `12.10.2` with fixes in graph-remount and
  viewport-helper behavior on the same canvas surface we actively use.
- Root cause:
  The repo consumes `@xyflow/react` through a floating semver range in
  `apps/web/package.json`, but the lockfile still resolves to the older patch.
- Constraints and invariants:
  `AGENTS.md`;
  `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/guides/testing-and-ci-capabilities.md`.
- Options considered:
  1. Leave the lockfile unchanged and defer the patch.
  2. Apply the patch upgrade and validate only the affected web workspace plus
     the repository pre-push gate.
- Selected option and rationale:
  Option 2. The update is a narrow patch on a heavily used canvas dependency
  with plausible stability fixes and low expected migration cost.
- Rejected alternatives:
  Option 1 preserves known stale dependency state without a compensating
  benefit.

## Pre-Implementation Brief

- Mode:
  Slim
- Scope:
  Update `@xyflow/react` for `apps/web` to `12.10.2`, keep the slice limited to
  dependency resolution files and the closeout record, and validate the web
  workspace.
- Touched files or paths:
  `apps/web/package.json`,
  `pnpm-lock.yaml`,
  `docs/planning/closeouts/20260421-web-xyflow-12-10-2-closeout.md`,
  `docs/planning/closeouts/index.md`.
- Expected outcome:
  `apps/web` resolves `@xyflow/react` to `12.10.2` with no regressions in
  workspace type-check, tests, or repository pre-push checks.
- Risks and mitigations:
  Patch releases can still change interactive graph behavior. Mitigation: run
  package-local tests and type-check in `apps/web`.
- Out-of-scope:
  Any refactor of canvas code, broader dependency batches, or unrelated web UI
  maintenance.
- Validation plan:
  `pnpm --filter @dvt/web typecheck`;
  `pnpm --filter @dvt/web test`;
  `pnpm docs:sync`;
  `pnpm verify:prepush`.
- Test coverage plan:
  Rely on existing `apps/web` Vitest coverage for canvas/controller surfaces.
- Libraries evaluated:
  None evaluated - maintenance update to an existing adopted dependency.

## Implementation Outcome

- `apps/web/package.json` now requests `@xyflow/react` `^12.10.2`.
- `pnpm-lock.yaml` now resolves `@xyflow/react` to `12.10.2` and updates the
  transitive `@xyflow/system` package to `0.0.76`.
- During validation, `apps/web` exposed one unrelated stale test expectation in
  `src/app/plugins/dvt/dvtContributions.connectionRules.test.ts`: the runtime
  already returns `reasonCode: 'plugin_rule_blocked'`, but the test still
  asserted only the human-readable message. The test was aligned to the current
  contract without changing runtime behavior.

## Actual Files Changed In This Slice

- `apps/web/package.json`
- `apps/web/src/app/plugins/dvt/dvtContributions.connectionRules.test.ts`
- `pnpm-lock.yaml`
- `docs/planning/closeouts/20260421-web-xyflow-12-10-2-closeout.md`

## Validation Results

- Passed: `pnpm --filter @dvt/web typecheck`
- Passed: `pnpm --filter @dvt/web test -- src/app/plugins/dvt/dvtContributions.connectionRules.test.ts`
- Passed: `pnpm --filter @dvt/web test`
- Passed: `pnpm docs:sync`
- Passed: `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No hook, lint, type-check, or repository rule was bypassed.
- No placeholder or fake implementation was introduced.
- The only code-path change is a dependency resolution bump; the extra source
  edit is a stale test correction required to recover package-local validation.
