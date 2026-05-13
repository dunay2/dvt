---
title: AR-C2 INV-4 Sustained Validation Window Gate Plan
status: Active
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-13
planning_type: proposal
---

# AR-C2 INV-4 Sustained Validation Window Gate Plan

## Think-First Analysis

Problem summary: `AR-C2-INV-4` requires sustained validation windows as
mandatory closure evidence. The collector already renders T4 rows, but closure
reviewers can only inspect those rows manually; there is no fail-closed command
mode equivalent to `AR-C2-INV-1`.

Root cause: the generated evidence artifact treats missing sustained-window
data as a row status, not as an executable closure assertion. That leaves a
hidden-authority gap where a reviewer could mark AR-C2 complete without running
a command that proves every required validation window passed.

Constraints and invariants: `AGENTS.md`,
`docs/planning/status/governance-document-rule-inventory.md`,
`docs/guides/ai-work-protocol.md`,
`docs/architecture/command-query-rail-governance.md`, and
`docs/guides/ar-c2-observability-technical-manual-20260404.md` govern this
slice. `AR-C2OperationalEvidenceCommand` remains the rail; no new product
command, route, adapter, or runtime contract is introduced.

Options considered:

- Extend `ops:ar-c2:evidence` with a sustained-window assertion flag.
- Treat T4 rows as manually reviewed closeout text only.
- Add a separate script just for sustained validation.

Selected option and rationale: extend the existing collector with
`--require-sustained-validation-windows`. This keeps AR-C2 closure evidence on
one command rail, makes missing T4 data mechanically visible, and avoids a
parallel script with duplicate mapping semantics.

Rejected alternatives: manual-only review leaves the hidden-authority gap open.
A separate script would duplicate mapping and snapshot parsing semantics already
owned by the collector.

## Pre-Implementation Brief

Mode: Full.

Scope:

- Add a T4 assertion mode to `tools/ops/ar-c2-evidence-collector.mjs`.
- Add red/green coverage in
  `tools/ops/ar-c2-evidence-collector.architecture.test.mjs`.
- Update AR-C2 operational docs to name the sustained-window gate.
- Record closeout evidence for `AR-C2-INV-4` without fabricating live metric
  windows.

Touched files or paths:

- `tools/ops/ar-c2-evidence-collector.mjs`
- `tools/ops/ar-c2-evidence-collector.architecture.test.mjs`
- `docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md`
- `docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md`
- `docs/guides/ar-c2-observability-technical-manual-20260404.md`
- `docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md`
- `docs/planning/closeouts/20260513-ar-c2-inv-4-sustained-validation-window-gate-closeout.md`

Expected outcome: reviewers can run
`pnpm ops:ar-c2:evidence -- --require-sustained-validation-windows` and get a
non-zero result while any T4 row lacks a passing sustained validation window.

Risks and mitigations: the gate may be mistaken for live validation. The docs
will state that it validates supplied snapshots and fails closed when snapshots
are missing or incomplete.

Out-of-scope items: provisioning dashboards, configuring Alertmanager,
collecting live Prometheus data, and changing runtime telemetry.

Validation plan:

- `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs`
- `pnpm docs:feature-mechanization -- --feature AR-C2-INV-4-SUSTAINED-VALIDATION-WINDOW-GATE`
- `pnpm ops:ar-c2:evidence`
- `pnpm ops:ar-c2:evidence -- --require-sustained-validation-windows`
- `pnpm qa:artifact:check`
- `pnpm docs:sync`
- `pnpm docs:status:generate`
- `pnpm governance:refresh`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`

Test coverage plan: negative coverage proves missing sustained-window data
exits non-zero and names blocker counts. Positive coverage proves complete
metrics snapshots can satisfy the new assertion without requiring dashboard or
alert snapshots.

Libraries evaluated: None evaluated - no custom implementation beyond the
existing Node collector path.

Command/query rail impact: reuse `AR-C2OperationalEvidenceCommand` through
`pnpm ops:ar-c2:evidence`; no new rail is added.

Fowler planning impact: hidden authority is addressed with Introduce Assertion.
Duplicate semantics are avoided by keeping T4 evaluation in the existing
collector.

```feature-mechanization
version: 1
featureId: AR-C2-INV-4-SUSTAINED-VALIDATION-WINDOW-GATE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-4-sustained-validation-window-gate-plan-20260513.md
componentGuides: [docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md]
userStories: [docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/guides/ai-work-protocol.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/architecture/reference-architecture.md, docs/guides/ar-c2-observability-technical-manual-20260404.md, docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md, docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md]
mode: Full
owner: Runtime / SRE / Docs
canonicalRail: AR-C2OperationalEvidenceCommand
allowedImplementationSurfaces: [docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-4-sustained-validation-window-gate-plan-20260513.md, docs/planning/closeouts/20260513-ar-c2-inv-4-sustained-validation-window-gate-closeout.md, docs/planning/closeouts/20260513-ar-c2-inv-5-non-skip-qa-artifact-gate-closeout.md, docs/planning/reviews/architecture-and-governance/20260404-ar-c2-fowler-hard-qa-review.md, docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md, docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md, docs/guides/ar-c2-observability-technical-manual-20260404.md, docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md, docs/runbooks/ar-c2-evidence-generated-latest.md, tools/ops/ar-c2-evidence-collector.mjs, tools/ops/ar-c2-evidence-collector.architecture.test.mjs]
forbiddenImplementationSurfaces: [apps/**, packages/**]
commandQueryRails:
  - {name: AR-C2OperationalEvidenceCommand, type: command, dddOwner: AR-C2 evidence collector policy}
domainObjects:
  - {name: AR-C2 sustained validation policy, type: policy, owner: tools/ops/ar-c2-evidence-collector.mjs}
fowlerSignals: [Hidden authority removed from T4 closure status, Documentation drift fixed by executable collector assertion, Manual-only confidence replaced with semantic architecture guard]
cypressFlows: [N/A - operational command only]
redGreenCycles:
  - {id: missing-sustained-window-data-fails-closed, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: collector exits zero when sustained-window assertion is requested with missing metrics snapshots, patchSurfaces: [tools/ops/ar-c2-evidence-collector.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
  - {id: complete-sustained-window-data-passes, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: collector lacks complete sustained-window assertion semantics, patchSurfaces: [tools/ops/ar-c2-evidence-collector.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
architectureGuards: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, pnpm docs:feature-mechanization:implementation]
completionGate: [pnpm docs:feature-mechanization -- --feature AR-C2-INV-4-SUSTAINED-VALIDATION-WINDOW-GATE, node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, pnpm ops:ar-c2:evidence, pnpm qa:artifact:check, pnpm docs:sync, pnpm docs:status:generate, pnpm governance:refresh, pnpm docs:feature-mechanization:implementation, pnpm verify:prepush]
symbols:
  - {name: parseArgs, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2OperationalEvidenceCommand, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [explicit assertion mode], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: buildSustainedRows, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 sustained validation policy, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [Extract Function for assertion reuse], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: collectSustainedValidationWindowBlockers, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 sustained validation policy, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [fail-closed policy], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: assertSustainedValidationWindows, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 sustained validation policy, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [Introduce Assertion], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
```
