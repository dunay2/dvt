---
title: AR-C2 INV-4 Sustained Validation Window Gate Closeout
status: Accepted
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-13
planning_type: closeout
---

# AR-C2 INV-4 Sustained Validation Window Gate Closeout

## Think-First Analysis

`AR-C2-INV-4` closes the remaining T4 hidden-authority gap in AR-C2 evidence
assembly. The repository already generated sustained validation rows, but it
did not provide a command mode that failed closed when those rows were still
pending.

The selected pattern is Fowler's **Introduce Assertion** on the existing
`AR-C2OperationalEvidenceCommand`. The slice must not fabricate production
windows; it must prove the collector rejects missing or incomplete T4 evidence.

## Pre-Implementation Brief

Mode: Full.

Scope: add a sustained-window assertion to the AR-C2 evidence collector,
document the closure command, and record validation evidence.

Touched files or paths:

- `tools/ops/ar-c2-evidence-collector.mjs`
- `tools/ops/ar-c2-evidence-collector.architecture.test.mjs`
- `docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md`
- `docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md`
- `docs/guides/ar-c2-observability-technical-manual-20260404.md`
- `docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md`
- `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-4-sustained-validation-window-gate-plan-20260513.md`
- `docs/planning/closeouts/20260513-ar-c2-inv-4-sustained-validation-window-gate-closeout.md`

Expected outcome: `pnpm ops:ar-c2:evidence --
--require-sustained-validation-windows` exits non-zero while sustained-window
evidence is missing, and exits zero when every mapped T4 row has a passing
metrics snapshot.

Risks and mitigations: this is an assertion over provided evidence snapshots,
not live Prometheus collection. The docs and tests state that missing snapshots
remain blockers.

Out-of-scope items: live dashboard provisioning, Alertmanager configuration,
production Prometheus scraping, and runtime telemetry changes.

Validation plan:

- `pnpm docs:feature-mechanization -- --feature AR-C2-INV-4-SUSTAINED-VALIDATION-WINDOW-GATE`
- `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs`
- `pnpm ops:ar-c2:evidence`
- `pnpm ops:ar-c2:evidence -- --require-sustained-validation-windows`
- `pnpm qa:artifact:check`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm governance:refresh`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`

Test coverage plan: red/green tests cover missing sustained-window evidence,
complete sustained-window evidence, and docs alignment for the new assertion
flag.

## Work Performed

- Added the governed implementation plan and feature mechanization manifest in
  `docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-4-sustained-validation-window-gate-plan-20260513.md`.
- Extended `tools/ops/ar-c2-evidence-collector.mjs` with
  `--require-sustained-validation-windows`.
- Refactored sustained-window row construction into `buildSustainedRows` so the
  generated artifact and assertion use the same mapping semantics.
- Added fail-closed and passing metrics snapshot coverage in
  `tools/ops/ar-c2-evidence-collector.architecture.test.mjs`.
- Updated the AR-C2 evidence component guide, user stories, observability
  technical manual, and dashboard/alert evidence runbook to name the sustained
  validation gate.
- Regenerated `docs/runbooks/ar-c2-evidence-generated-latest.md`.

## Validation Evidence

Commands run:

- `pnpm docs:feature-mechanization -- --feature AR-C2-INV-4-SUSTAINED-VALIDATION-WINDOW-GATE`
  - Passed after adding the required manifest fields.
- `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs`
  - RED: failed because `--require-sustained-validation-windows` exited zero
    with missing metrics snapshots.
  - GREEN: passed after adding the sustained-window assertion.
- `pnpm ops:ar-c2:evidence`
  - Passed and regenerated `docs/runbooks/ar-c2-evidence-generated-latest.md`.
- `pnpm ops:ar-c2:evidence -- --require-sustained-validation-windows`
  - Expected fail observed: `AR-C2_SUSTAINED_VALIDATION_WINDOWS_MISSING` with
    9 missing sustained windows. This is the correct closure posture because no
    real metrics snapshot is attached.
- `pnpm qa:artifact:check`
  - Returned skip mode: `No changed QA artifact docs detected in governed
paths. Skipping.` This is not treated as INV-5 closure; `AR-C2-INV-5`
    owns the required non-skip QA artifact gate.
- `pnpm docs:feature-mechanization:implementation`
  - Initially failed because `buildSustainedRows` was not declared in the
    feature manifest.
  - Passed after declaring the symbol.
- `pnpm docs:sync`
  - Passed.
- `pnpm docs:status:generate`
  - Passed.
- `pnpm governance:refresh`
  - Passed.

Final closeout gate still pending at this point in the slice:
`pnpm verify:prepush`.

## No-Debt Evidence

- No fake sustained-window evidence was added.
- No lint, type, test, governance, QA, or feature-mechanization rule was
  disabled.
- No hook bypass was used.
- The failing sustained-window assertion keeps AR-C2 open until real metrics
  windows are provided.

## No-Stub Evidence

No stub, placeholder implementation, fake adapter, fake success path, or
unfinished branch was introduced. The new assertion fails against the current
repository evidence because sustained windows are not present.
