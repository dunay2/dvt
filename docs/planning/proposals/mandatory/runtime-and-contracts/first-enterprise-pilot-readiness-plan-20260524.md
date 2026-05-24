---
title: First Enterprise Pilot Readiness Plan
status: Active
owner: Product / Architecture / GTM
last_reviewed: 2026-05-24
planning_type: proposal
---

# First Enterprise Pilot Readiness Plan

## Owned Concern

`D/first enterprise pilot` owns the first customer-validation package for
enterprise product-market fit. It does not create runtime code by itself.

The repository-actionable outcome is a governed pilot packet: candidate profile,
entry criteria, success metrics, 90-day POC structure, exit criteria, and the
handoff boundaries that unblock billing, compliance, and acquisition
positioning work.

## Governing Sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/roadmap/strategic-product-roadmap.md`
- `docs/planning/reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md`

## Think-First Analysis

The historical roadmap explicitly says first enterprise pilot should be tracked
as go-to-market work, not as code execution. The active roadmap now says the
enterprise-packaging pillar is queued, while core prerequisites such as
operation-level RBAC, read-your-writes, MVP-D1, cost attribution, and projector
invalidation have closed.

That makes the next product action a readiness packet, not a fake implementation
or invented customer outcome. Product-market fit validation only becomes real
when an actual pilot participant runs through the POC and records results.

## Candidate Profile

Target 2-3 candidates with all of these traits:

- dbt or SQL-first transformation ownership;
- Snowflake or warehouse-centric analytics operations;
- multi-user workflow ownership where run start, cancel, signal, and review
  permissions matter;
- compliance or audit requirements around lineage, retained run evidence, and
  operational traceability;
- tolerance for a bounded 90-day POC on the current PostgreSQL-backed control
  plane.

Reject candidates whose primary ask is unrelated BI visualization, generic job
scheduling, or a procurement-only security questionnaire with no transformation
operator workflow.

## Pilot Entry Criteria

The pilot can start only when all entry criteria are true:

| Criterion                        | Evidence source                                                                                                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| MVP residual-risk baseline       | `docs/planning/reviews/event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md`         |
| Operation-level RBAC             | `docs/planning/state/execution-workboard.md` task `RBAC at operation level`                                    |
| Read-your-writes freshness       | `docs/planning/state/execution-workboard.md` task `read-your-writes contract`                                  |
| Cost attribution usage facts     | `docs/planning/proposals/mandatory/runtime-and-contracts/cost-attribution-model-plan-20260524.md`              |
| Projector queue invalidation     | `docs/planning/proposals/mandatory/runtime-and-contracts/projector-event-driven-invalidation-plan-20260524.md` |
| Internal alpha route evidence    | `docs/planning/closeouts/20260514-f27-alpha-route-acceptance-matrix-closeout.md`                               |
| Explicit pilot owner and cadence | Named in CRM or customer-facing record outside the repository before the POC begins                            |

## POC Structure

The pilot is a 90-day POC with three gates.

| Gate            | Window     | Goal                                       | Required output                                                                  |
| --------------- | ---------- | ------------------------------------------ | -------------------------------------------------------------------------------- |
| Qualification   | Days 0-14  | Prove candidate fit and workflow relevance | Signed pilot scope, named users, initial graph/run scenario, risk assumptions    |
| Operational run | Days 15-60 | Prove daily operator loop value            | At least 10 governed runs, captured run evidence, RBAC usage, freshness feedback |
| Decision        | Days 61-90 | Decide conversion, extension, or stop      | Conversion decision, top 5 blockers, billing/compliance follow-up classification |

## Success Metrics

| Metric                      | Success threshold                                                      |
| --------------------------- | ---------------------------------------------------------------------- |
| Workflow relevance          | Candidate validates one real transformation workflow end to end.       |
| Operator trust              | Candidate can explain run state, evidence, and lineage without help.   |
| Permission fit              | Candidate uses at least two distinct operator/admin permission levels. |
| Freshness confidence        | No pilot-blocking stale-read incident remains unresolved.              |
| Cost attribution usefulness | Usage summary is accepted as enough to discuss billing shape.          |
| Commercial signal           | Candidate agrees to conversion terms, paid extension, or named gaps.   |

## Exit Criteria

Close the pilot as `accepted`, `extended`, or `stopped`.

- `accepted`: candidate agrees to paid conversion or a dated paid expansion
  path.
- `extended`: candidate names concrete blockers and agrees to one bounded
  follow-up POC window.
- `stopped`: candidate rejects the product or the workflow does not match the
  product thesis.

The repository must not mark product-market fit as validated without one of
those outcomes recorded in customer-facing evidence outside the repo.

## Follow-Up Routing

| Outcome signal                          | Next task                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------- |
| Candidate accepts usage summary shape   | Unblock `billing integration`.                                             |
| Candidate requests regulated onboarding | Unblock `compliance documentation pack`.                                   |
| Candidate validates commercial urgency  | Unblock `acquisition positioning deck`.                                    |
| Candidate rejects workflow relevance    | Create a product discovery correction task instead of widening tech scope. |

## Feature Mechanization Manifest

```feature-mechanization
version: 1
featureId: D-FIRST-ENTERPRISE-PILOT-READINESS-20260524
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/first-enterprise-pilot-readiness-plan-20260524.md
componentGuides:
  - N/A - GTM readiness packet, not a repository component
userStories:
  - docs/planning/proposals/mandatory/runtime-and-contracts/first-enterprise-pilot-readiness-plan-20260524.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/roadmap/strategic-product-roadmap.md
allowedImplementationSurfaces:
  - docs/planning/proposals/mandatory/runtime-and-contracts/first-enterprise-pilot-readiness-plan-20260524.md
  - docs/planning/roadmap/strategic-product-roadmap.md
forbiddenImplementationSurfaces:
  - apps/**
  - packages/**
  - specs/**
commandQueryRails:
  - name: FirstEnterprisePilotReadiness
    type: query
    dddOwner: Enterprise pilot readiness record
domainObjects:
  - name: EnterprisePilotReadinessPacket
    type: product readiness record
    owner: Product / GTM
fowlerSignals:
  - Roadmap item masquerading as code task
  - Product-market fit claim without customer evidence
architectureGuards:
  - pnpm docs:feature-mechanization:implementation -- --feature D-FIRST-ENTERPRISE-PILOT-READINESS-20260524
cypressFlows:
  - N/A - GTM readiness packet only
completionGate:
  - pnpm docs:feature-mechanization -- --feature D-FIRST-ENTERPRISE-PILOT-READINESS-20260524
  - pnpm docs:sync
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: pilot-readiness-packet
    redTest: pnpm docs:feature-mechanization -- --feature D-FIRST-ENTERPRISE-PILOT-READINESS-20260524
    expectedFailure: Pilot readiness manifest does not exist.
    patchSurfaces:
      - docs/planning/proposals/mandatory/runtime-and-contracts/first-enterprise-pilot-readiness-plan-20260524.md
      - docs/planning/roadmap/strategic-product-roadmap.md
    greenTest: pnpm docs:feature-mechanization -- --feature D-FIRST-ENTERPRISE-PILOT-READINESS-20260524
symbols:
  - name: EnterprisePilotReadinessPacket
    path: docs/planning/proposals/mandatory/runtime-and-contracts/first-enterprise-pilot-readiness-plan-20260524.md
    dddOwner: Product / GTM
    cqRails: [FirstEnterprisePilotReadiness]
    fowlerSignals: [Product-market fit claim requires customer evidence]
    architectureGuard: pnpm docs:feature-mechanization:implementation
    unitTests: [pnpm docs:feature-mechanization -- --feature D-FIRST-ENTERPRISE-PILOT-READINESS-20260524]
    cypressCoverage: N/A - GTM readiness packet only
```

## Validation Plan

- `pnpm docs:feature-mechanization -- --feature D-FIRST-ENTERPRISE-PILOT-READINESS-20260524`
- `pnpm docs:sync`
- `pnpm docs:feature-mechanization:implementation`
- `pnpm verify:prepush`
