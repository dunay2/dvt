---
title: Architecture Governance Review Canon Plan
status: Active
owner: Architecture / Docs / Planning
last_reviewed: 2026-05-24
planning_type: proposal
---

# Architecture Governance Review Canon Plan

## Owned Concern

`GD-REV-ARCH-GOV-CANON` owns canonization of the active 2026-04-02 deep
architecture review into governed disposition rows. The concern is not to
repeat the review. It is to classify each finding into existing product,
architecture, risk, evidence, or planning ownership so that product-relevant
work can be selected from the Planning DB without re-reading advisory prose.

## Fowler Analysis

<!-- markdownlint-disable MD060 -->

| Scenario                                           | Opportunity                              | Fowler pattern                            | DDD owner                              | Command/query rail                                 | Implementation surfaces                  | Architecture test                                        | Out of scope                      |
| -------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | -------------------------------------- | -------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| Classify each review finding by current ownership  | Review backlog hidden in prose           | Replace Type Code with Published Language | Architecture review finding catalog    | `ClassifyArchitectureGovernanceReviewFinding`      | Plan, component guide, review note       | `tools/ci/architecture-governance-review-canon.test.mjs` | Runtime code changes              |
| Record disposition against task, risk, or evidence | Duplicate planning queues and stale risk | Repository plus Explicit Mapping          | Architecture review disposition ledger | `RecordArchitectureGovernanceReviewDisposition`    | Disposition matrix and Planning DB links | `tools/ci/architecture-governance-review-canon.test.mjs` | Creating parallel runtime tasks   |
| Validate future review traceability                | Drift between review text and task state | Semantic fitness function                 | Review traceability policy             | `ValidateArchitectureGovernanceReviewTraceability` | Semantic test, component guide, buzon    | `tools/ci/architecture-governance-review-canon.test.mjs` | Full review-management product UI |

<!-- markdownlint-enable MD060 -->

## Mature-System Comparison

Mature architecture organizations do not treat principal reviews as static
reports. They keep a review finding ledger whose rows point at bounded-context
owners, accepted decisions, risk entries, executable tests, and product
backlog items. This canon applies that pattern locally:

- [Task: GOV-PROP-DISP-1] closed findings point to the task, ADR, evidence, or risk that closed them;
- queued findings stay visible as product or platform backlog rows;
- blocked findings are separated from closed rows and retain their blocker;
- speculative recommendations are frozen or risk-accepted instead of becoming
  implicit work.

## Disposition Matrix

Disposition status vocabulary: `status: Closed`, `status: Queued`,
`status: Follow-up`, and `status: Risk-accepted`.

<!-- markdownlint-disable MD060 -->

| Review finding                           | status        | Governing owner / reference                                                                                                                                                     | Disposition rationale                                                                                           |
| ---------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| RunStatus state machine validation       | Closed        | `AR-B1`; `docs/planning/state/execution-workboard.md`                                                                                                                           | Write-boundary state-machine validation is recorded as done and no longer needs a duplicate review task.        |
| Admin route RBAC                         | Closed        | `AR-C1`; `docs/planning/state/agent-lane-c.md`                                                                                                                                  | Admin routes have explicit admin-scope RBAC and negative-path coverage according to Lane C closure notes.       |
| TenantId branded type                    | Closed        | `S08-3`; `docs/planning/state/agent-lane-a.md`; `ADR-0018`                                                                                                                      | Shared-kernel ID ownership now includes branded domain identifiers; the review finding is dispositioned closed. |
| StepKind JSON Schema validation          | Closed        | `S08-4`, `S08-4-A`, `S08-4-B`, `S08-4-C`, `MW-A1`                                                                                                                               | Verifier-owned per-kind semantic validation and registry closure are already done.                              |
| IRunEnrichmentService extraction         | Closed        | `ADR-0015`; `docs/planning/proposals/mandatory/runtime-and-contracts/contract-pack-and-read-boundary-reset-plan-20260410.md`                                                    | Enrichment is no longer owned by the engine read surface.                                                       |
| Distributed consistency model            | Follow-up     | `AR-C2`, `AR-C2-T3`, `docs/planning/proposals/mandatory/runtime-and-contracts/runtime-hardening-shared-kernel-and-operations-roadmap-20260410.md`                               | SLA definitions exist, but alert wiring evidence remains blocked; keep operational closure in Lane C.           |
| Temporal saturation backpressure         | Queued        | `Temporal -> API backpressure`; `docs/planning/state/execution-workboard.md`                                                                                                    | Product admission safety remains blocked behind projector invalidation; keep as scale backlog.                  |
| State-store circuit breaker              | Closed        | `AR-C5`; `docs/evidence/ed-20260512-ar-c5-adapter-circuit-breaker.md`; risk `R-20260512-AR-C5-ADAPTER-CIRCUIT-BREAKER`                                                          | Circuit breaker is implemented with residual threshold tuning risk recorded.                                    |
| Incremental snapshot projection          | Closed        | `AR-D1`; `docs/evidence/ED-20260416-ar-d1-incremental-snapshot-projection.md`; risk `R-20260416-AR-D1-INCREMENTAL-SNAPSHOT-PROJECTION`                                          | Delta projection closed the O(n) stale snapshot risk, with residual checkpoint drift recorded.                  |
| Cost attribution model                   | Queued        | `cost attribution model`; `docs/planning/state/execution-workboard.md`                                                                                                          | This is now a product-facing task because billing and finance reporting need real usage accounting.             |
| Tenant-configurable retention            | Closed        | `AR-D5`; `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d5-tenant-configurable-retention-policy-plan-20260522.md`; risk `R-20260522-AR-D5-TENANT-RETENTION-POLICY` | Retention policy is implemented with residual mixed-tenant archive risk recorded.                               |
| Zero-downtime schema rollback            | Closed        | `AR-D4`; `docs/evidence/ed-20260513-ar-d4-zero-downtime-schema-rollback.md`; risk `R-20260513-AR-D4-ZERO-DOWNTIME-SCHEMA-ROLLBACK`                                              | Online rollback classification exists; future migration misclassification remains risk-managed.                 |
| CreatedAtIso plan identity clarification | Closed        | `ADR-0042`                                                                                                                                                                      | `createdAtIso` is explicitly excluded from canonical plan identity input.                                       |
| Worker scaling strategy                  | Closed        | `AR-D3`; `docs/evidence/ed-20260514-ar-d3-worker-scaling-strategy.md`; risk `R-20260514-AR-D3-WORKER-SCALING`                                                                   | The strategy is documented and risk-managed without claiming production auto-scaling is solved.                 |
| Custom policy namespace extensibility    | Risk-accepted | `AR-A4`; `docs/evidence/ed-20260513-ar-a4-custom-policy-namespace-freeze.md`; risk `R-20260513-AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE`                                            | The seam is frozen until a real consumer exists.                                                                |
| Projector event-driven invalidation      | Queued        | `projector event-driven invalidation`; `docs/planning/state/execution-workboard.md`                                                                                             | This remains a product-enabling scale task and should precede backpressure completion.                          |

<!-- markdownlint-enable MD060 -->

## Applied Patterns

- **Review Finding Ledger:** every finding has one status and one owner.
- **Semantic Disposition:** closed, queued, follow-up, and risk-accepted are
  different states; review text cannot imply untracked work.
- [Task: GOV-PROP-DISP-1] **Published Language:** task IDs, risk IDs, and ADR IDs remain the vocabulary
  shared by architecture, planning, and product.
- **Fitness Function:** the CI test checks the semantic artifact set and the
  high-value findings, not only file existence.

## User Stories

1. As an architecture steward, I want each blocker from the 2026-04-02 review
   mapped to an existing task, evidence record, or risk so that I can select
   the next work item without maintaining a parallel review queue.
2. As a product planner, I want product-value rows separated from platform
   hygiene so that cost attribution, projection invalidation, and enterprise
   pilot work are not hidden behind security-tooling suggestions.
3. As a reviewer, I want explicit drift notes when a review finding is already
   closed so that I do not re-open old work based on stale prose.
4. As an agent, I want a Planning DB task, component guide, and semantic guard
   for review canonization so that continuation is deterministic after context
   compaction.

## Decision

Accept the active review as an architectural input, but do not treat it as a
second backlog. The canonized backlog source remains the Planning DB. The
review now carries a canonical disposition note and the component guide owns
future review-traceability semantics.

No ADR is required for this slice because no runtime, contract, adapter,
planner, or product behavior changes. Existing command/query rail governance
and Fowler opportunity planning governance already cover the work.

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: GD-REV-ARCH-GOV-CANON
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md
componentGuides:
  - docs/architecture/components/ci-governance/architecture-governance-review-canon-component.md
userStories:
  - docs/architecture/components/ci-governance/architecture-governance-review-canon-user-stories.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md
allowedImplementationSurfaces:
  - buzon/20260524-codex-fowler-architecture-governance-review-canon.md
  - docs/architecture/components/ci-governance/architecture-governance-review-canon-component.md
  - docs/architecture/components/ci-governance/architecture-governance-review-canon-user-stories.md
  - docs/architecture/components/ci-governance/index.md
  - docs/planning/domains/documentation-governance.md
  - docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md
  - docs/planning/proposals/portfolio-map-20260403.md
  - docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md
  - tools/ci/architecture-governance-review-canon.test.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: ClassifyArchitectureGovernanceReviewFinding
    type: query
    dddOwner: Architecture review finding catalog
  - name: RecordArchitectureGovernanceReviewDisposition
    type: command
    dddOwner: Architecture review disposition ledger
  - name: ValidateArchitectureGovernanceReviewTraceability
    type: query
    dddOwner: Review traceability policy
domainObjects:
  - name: ArchitectureGovernanceReviewFinding
    type: value object
    owner: Architecture / Docs / Planning
  - name: ArchitectureGovernanceReviewDisposition
    type: ledger entry
    owner: Architecture / Docs / Planning
  - name: ReviewTraceabilityPolicy
    type: policy
    owner: Architecture / Docs / Planning
fowlerSignals:
  - Review backlog hidden in prose
  - Duplicate planning queues
  - Drift between review and task state # Task: GOV-PROP-DISP-1
  - Product value hidden behind platform hygiene
architectureGuards:
  - node --test tools/ci/architecture-governance-review-canon.test.mjs
cypressFlows:
  - N/A - documentation governance semantic guard only
completionGate:
  - node --test tools/ci/architecture-governance-review-canon.test.mjs
  - node scripts/check-feature-mechanization.cjs --feature GD-REV-ARCH-GOV-CANON
  - node scripts/check-feature-mechanization.cjs --implementation --feature GD-REV-ARCH-GOV-CANON
  - pnpm docs:sync
  - pnpm docs:status:generate
  - pnpm docs:workboard:generate
  - pnpm lint:md:changed
  - pnpm test:ci-tools
  - pnpm verify:prepush
redGreenCycles:
  - id: architecture-governance-review-disposition
    redTest: node --test tools/ci/architecture-governance-review-canon.test.mjs
    expectedFailure: Architecture governance review canon plan, component guide, stories, and buzon analysis do not exist.
    patchSurfaces:
      - tools/ci/architecture-governance-review-canon.test.mjs
      - docs/planning/proposals/mandatory/governance-and-docs/architecture-governance-review-canon-plan-20260524.md
      - docs/planning/reviews/architecture-and-governance/20260402-deep-architectural-review.md
      - docs/architecture/components/ci-governance/architecture-governance-review-canon-component.md
      - docs/architecture/components/ci-governance/architecture-governance-review-canon-user-stories.md
      - docs/architecture/components/ci-governance/index.md
      - docs/planning/domains/documentation-governance.md
      - docs/planning/proposals/portfolio-map-20260403.md
      - buzon/20260524-codex-fowler-architecture-governance-review-canon.md
    greenTest: node --test tools/ci/architecture-governance-review-canon.test.mjs
symbols:
  - name: requiredFiles
    path: tools/ci/architecture-governance-review-canon.test.mjs
    dddOwner: Architecture governance review canon semantic guard
    cqRails:
      - ValidateArchitectureGovernanceReviewTraceability
    fowlerSignals:
      - Required artifact set
    architectureGuard: node --test tools/ci/architecture-governance-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: dispositionRows
    path: tools/ci/architecture-governance-review-canon.test.mjs
    dddOwner: Architecture review disposition ledger
    cqRails:
      - RecordArchitectureGovernanceReviewDisposition
    fowlerSignals:
      - Review finding coverage
    architectureGuard: node --test tools/ci/architecture-governance-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: readRepoFile
    path: tools/ci/architecture-governance-review-canon.test.mjs
    dddOwner: Architecture governance review canon semantic guard
    cqRails:
      - ValidateArchitectureGovernanceReviewTraceability
    fowlerSignals:
      - Deterministic repository artifact reads
    architectureGuard: node --test tools/ci/architecture-governance-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: assertContains
    path: tools/ci/architecture-governance-review-canon.test.mjs
    dddOwner: Architecture governance review canon semantic guard
    cqRails:
      - ValidateArchitectureGovernanceReviewTraceability
    fowlerSignals:
      - Required semantic marker validation
    architectureGuard: node --test tools/ci/architecture-governance-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
  - name: escapeRegExp
    path: tools/ci/architecture-governance-review-canon.test.mjs
    dddOwner: Architecture governance review canon semantic guard
    cqRails:
      - ValidateArchitectureGovernanceReviewTraceability
    fowlerSignals:
      - Test determinism
    architectureGuard: node --test tools/ci/architecture-governance-review-canon.test.mjs
    unitTests:
      - pnpm test:ci-tools
    cypressCoverage: N/A - docs governance semantic guard only
```

## Validation

- `node --test tools/ci/architecture-governance-review-canon.test.mjs`
