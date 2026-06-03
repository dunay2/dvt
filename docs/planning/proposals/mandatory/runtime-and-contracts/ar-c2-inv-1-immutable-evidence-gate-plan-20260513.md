---
title: AR-C2 INV-1 Immutable Evidence Gate Plan
status: Accepted
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-13
planning_type: mandatory-proposal
---

# AR-C2 INV-1 Immutable Evidence Gate Plan

## Think-First Analysis

Problem: `AR-C2` cannot be honestly marked done while dashboard and alert
evidence rows remain missing, but the evidence collector currently renders those
gaps without offering a fail-closed closure assertion.

Root cause: operational evidence is modeled as a generated report, not as a
closure gate. This leaves hidden authority in planning status and reviewer
memory.

Selected option: extend the existing `ops:ar-c2:evidence` rail with an explicit
immutable dashboard/alert evidence assertion mode. The command still renders the
artifact, but when the assertion flag is present it exits non-zero if any
dashboard panel or alert rule required by the canonical mapping is missing.

Rejected alternatives:

- Mark AR-C2 done with pending rows: rejected as false closure.
- Add a second script with duplicate parsing: rejected as duplicate semantics.
- Hand-enter dashboard or alert evidence: rejected because no immutable source
  snapshot is present in this repository slice.

## Fowler Matrix

| Scenario                         | Opportunity         | Fowler pattern         | DDD owner                       | Command/query rail                | Implementation surfaces                                          | Unit or package test                                                   | Architecture test             | User-flow test    | Out of scope                                 |
| -------------------------------- | ------------------- | ---------------------- | ------------------------------- | --------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------- | ----------------- | -------------------------------------------- |
| AR-C2 closure evidence assertion | Hidden authority    | Introduce Assertion    | AR-C2 evidence collector policy | `AR-C2OperationalEvidenceCommand` | `tools/ops/ar-c2-evidence-collector.mjs`                         | `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs` | semantic collector/docs guard | N/A - ops command | live Grafana/Alertmanager integration        |
| Component guide and stories      | Documentation drift | Single Source of Truth | Engine operations docs          | `AR-C2OperationalEvidenceCommand` | `docs/architecture/components/engine/ops/**`, `docs/runbooks/**` | same guard                                                             | same guard                    | N/A               | sustained validation windows (`AR-C2-INV-4`) |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AR-C2-INV-1-IMMUTABLE-EVIDENCE-GATE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-1-immutable-evidence-gate-plan-20260513.md
componentGuides: [docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md]
userStories: [docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/guides/ai-work-protocol.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/architecture/reference-architecture.md, docs/guides/ar-c2-observability-technical-manual-20260404.md, docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md, docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md]
allowedImplementationSurfaces: [buzon/20260513-codex-fowler-ar-c2-inv-1-immutable-evidence-gate-analysis.md, docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-1-immutable-evidence-gate-plan-20260513.md, docs/planning/closeouts/20260513-ar-c2-inv-1-immutable-evidence-gate-closeout.md, docs/architecture/components/engine/ops/index.md, docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md, docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md, docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md, docs/runbooks/ar-c2-evidence-generated-latest.md, docs/generated-docs-policy.json, tools/ops/ar-c2-evidence-collector.mjs, tools/ops/ar-c2-evidence-collector.architecture.test.mjs, scripts/governance-refresh.cjs, scripts/governance-refresh.test.cjs]
forbiddenImplementationSurfaces: [apps/web/**, apps/api/**, packages/@dvt/engine/**, packages/@dvt/contracts/**, packages/@dvt/adapter-*/**, packages/@dvt/planner/**]
commandQueryRails:
  - {name: AR-C2OperationalEvidenceCommand, type: command, dddOwner: AR-C2 evidence collector policy}
domainObjects:
  - {name: AR-C2 immutable evidence gate, type: policy, owner: tools/ops/ar-c2-evidence-collector.mjs}
fowlerSignals: [Hidden authority removed from planning status, Documentation drift fixed by executable collector assertion, Test-only confidence replaced with semantic architecture guard]
architectureGuards: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, pnpm docs:feature-mechanization:implementation]
cypressFlows: [N/A - operational command only]
completionGate: [pnpm docs:feature-mechanization -- --feature AR-C2-INV-1-IMMUTABLE-EVIDENCE-GATE, node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, pnpm ops:ar-c2:evidence, pnpm qa:artifact:check, pnpm docs:sync, pnpm docs:status:generate, pnpm governance:refresh, pnpm docs:feature-mechanization:implementation, pnpm verify:prepush]
redGreenCycles:
  - {id: missing-dashboard-alert-evidence-fails-closed, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: collector exits zero when assertion flag is requested with missing evidence, patchSurfaces: [tools/ops/ar-c2-evidence-collector.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
  - {id: complete-dashboard-alert-evidence-passes, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: collector lacks complete assertion semantics, patchSurfaces: [tools/ops/ar-c2-evidence-collector.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
  - {id: component-semantics-guard, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: component guide, stories, and owned concern are missing, patchSurfaces: [docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-component.md, docs/architecture/components/engine/ops/ar-c2-immutable-evidence-gate-user-stories.md, tools/ops/ar-c2-evidence-collector.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
  - {id: governance-refresh-imports-local-reports, redTest: node --test scripts/governance-refresh.test.cjs, expectedFailure: governance refresh validates stale coverage/remediation DB rows after local report generation, patchSurfaces: [scripts/governance-refresh.cjs, scripts/governance-refresh.test.cjs], greenTest: node --test scripts/governance-refresh.test.cjs}
symbols:
  - {name: parseArgs, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2OperationalEvidenceCommand, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [explicit assertion mode], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: hasPlaceholderToken, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 immutable evidence gate, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [fail-closed guard against template placeholders], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: collectDashboardAlertEvidenceBlockers, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 immutable evidence gate, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [fail-closed policy], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: assertImmutableDashboardAlertEvidence, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 immutable evidence gate, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [Introduce Assertion], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
```

## Red/Green cycle 1

The first test fails because the collector has no assertion flag and exits zero
while generated evidence still reports missing dashboard panels and alerts.

## Red/Green cycle 2

The second test proves a complete dashboard and alert snapshot passes the same
assertion, without requiring sustained window closure.

## Red/Green cycle 3

The semantic architecture guard proves the module owned concern, component
guide, user stories, and runbook all describe the same closure invariant.
