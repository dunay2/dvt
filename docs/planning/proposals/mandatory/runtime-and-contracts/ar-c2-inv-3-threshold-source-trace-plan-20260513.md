---
title: AR-C2 INV-3 Threshold Source Trace Plan
status: Accepted
owner: Runtime / SRE / Docs
last_reviewed: 2026-05-13
planning_type: mandatory-proposal
---

# AR-C2 INV-3 Threshold Source Trace Plan

## Think-First Analysis

Problem: AR-C2 alert evidence could list a threshold key without proving which
SLA or runbook text owned the numeric threshold and alert window.

Root cause: the canonical mapping owned signal names and alert posture, but it
did not carry explicit threshold keys or source references. The collector then
derived threshold keys implicitly and generated evidence without repeating the
SLA source next to each threshold.

Selected option: extend the existing `AR-C2OperationalEvidenceCommand` mapping
contract so every threshold-backed row declares canonical threshold keys and a
`docs/runbooks/**` source reference. The collector fails closed if a
threshold-backed row omits either field and renders the source beside each
threshold in generated evidence.

Rejected alternatives:

- Keep deriving threshold keys implicitly: rejected because reviewers still
  cannot trace a threshold to source text.
- Add a separate threshold-source document: rejected as duplicate authority.
- Create alert evidence rows by hand: rejected because this slice does not own
  live dashboard or alert configuration.

## Fowler Matrix

| Scenario                  | Opportunity               | Fowler pattern         | DDD owner                           | Command/query rail                | Implementation surfaces                    | Architecture test                                                      | Out of scope                       |
| ------------------------- | ------------------------- | ---------------------- | ----------------------------------- | --------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------- |
| Threshold source trace    | Implicit source authority | Single Source of Truth | AR-C2 evidence collector policy     | `AR-C2OperationalEvidenceCommand` | AR-C2 mapping, evidence runbook, collector | `node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs` | live Grafana/Alertmanager evidence |
| Missing source protection | Hidden closure risk       | Fail-closed validation | AR-C2 threshold traceability policy | `AR-C2OperationalEvidenceCommand` | collector parser and tests                 | same                                                                   | sustained validation windows       |

## Feature Mechanization

```feature-mechanization
version: 1
featureId: AR-C2-INV-3-THRESHOLD-SOURCE-TRACE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-3-threshold-source-trace-plan-20260513.md
componentGuides: [docs/guides/ar-c2-observability-technical-manual-20260404.md]
userStories: [docs/guides/ar-c2-observability-user-manual-20260404.md]
governingSources: [AGENTS.md, docs/planning/status/governance-document-rule-inventory.md, docs/guides/ai-work-protocol.md, docs/architecture/command-query-rail-governance.md, docs/architecture/fowler-opportunity-planning-governance.md, docs/runbooks/api-runtime-sla-canonical-20260404.md, docs/runbooks/read-your-writes-freshness-slo-20260330.md, docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md, docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md]
allowedImplementationSurfaces: [docs/planning/proposals/mandatory/runtime-and-contracts/ar-c2-inv-3-threshold-source-trace-plan-20260513.md, docs/planning/closeouts/20260404-ar-c2-sla-operational-closure-closeout.md, docs/planning/closeouts/20260513-ar-c2-inv-3-threshold-source-trace-closeout.md, docs/guides/ar-c2-observability-technical-manual-20260404.md, docs/guides/ar-c2-observability-user-manual-20260404.md, docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md, docs/runbooks/ar-c2-dashboard-alert-wiring-evidence-20260404.md, docs/runbooks/ar-c2-evidence-generated-latest.md, tools/ops/ar-c2-evidence-collector.mjs, tools/ops/ar-c2-evidence-collector.architecture.test.mjs]
forbiddenImplementationSurfaces: [apps/web/**, apps/api/**, packages/@dvt/engine/**, packages/@dvt/contracts/**, packages/@dvt/adapter-*/**, packages/@dvt/planner/**]
commandQueryRails:
  - {name: AR-C2OperationalEvidenceCommand, type: command, dddOwner: AR-C2 evidence collector policy}
domainObjects:
  - {name: AR-C2 threshold source trace, type: policy, owner: tools/ops/ar-c2-evidence-collector.mjs}
fowlerSignals: [Implicit source authority removed, Hidden closure risk made fail-closed, Duplicate threshold aliases replaced with canonical keys]
architectureGuards: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, pnpm docs:feature-mechanization:implementation]
cypressFlows: [N/A - operational command only]
completionGate: [pnpm docs:feature-mechanization -- --feature AR-C2-INV-3-THRESHOLD-SOURCE-TRACE, node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, pnpm ops:ar-c2:evidence, pnpm lint:md:changed, pnpm docs:sync:check, pnpm verify:prepush]
redGreenCycles:
  - {id: threshold-source-renders-in-generated-evidence, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: generated AR-C2 evidence omits source reference beside threshold keys, patchSurfaces: [docs/runbooks/ar-c2-sla-signal-threshold-mapping-20260404.md, tools/ops/ar-c2-evidence-collector.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
  - {id: missing-threshold-source-fails-closed, redTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, expectedFailure: collector accepts threshold-backed mapping rows with no SLA source reference, patchSurfaces: [tools/ops/ar-c2-evidence-collector.mjs, tools/ops/ar-c2-evidence-collector.architecture.test.mjs], greenTest: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs}
symbols:
  - {name: DEFAULT_MAPPING_PATH, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 threshold source trace, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [Single Source of Truth], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: mappingPath, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 threshold source trace, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [testable source selection], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: parseMarkdownTableRows, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 evidence collector policy, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [canonical mapping parse], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: isThresholdBackedPolicy, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 threshold source trace, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [explicit threshold classification], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: parseThresholdKeyList, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 threshold source trace, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [canonical threshold keys], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: assertThresholdTraceability, path: tools/ops/ar-c2-evidence-collector.mjs, dddOwner: AR-C2 threshold source trace, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [fail-closed validation], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
  - {name: escapeRegExp, path: tools/ops/ar-c2-evidence-collector.architecture.test.mjs, dddOwner: AR-C2 threshold source trace test helper, cqRails: [AR-C2OperationalEvidenceCommand], fowlerSignals: [semantic architecture guard], architectureGuard: node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs, cypressCoverage: N/A - ops command only, unitTests: [node --test tools/ops/ar-c2-evidence-collector.architecture.test.mjs]}
```
