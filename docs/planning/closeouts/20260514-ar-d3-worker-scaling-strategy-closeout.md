---
title: AR-D3 Worker Scaling Strategy Closeout
status: Accepted
owner: Runtime / SRE / Delivery
last_reviewed: 2026-05-14
planning_type: closeout
---

# AR-D3 Worker Scaling Strategy Closeout

## Think-First Analysis

Problem summary: AR-D3 already had current-state worker scaling documentation,
but the task remained open because the docs still treated the 1000+ tenant
posture as unresolved instead of naming the production constraint and the
operator decision. The missing piece is not a new worker runtime. It is an
explicit, testable scaling strategy that tells operators how tenant queues,
capability queues, replica density, cold-start targets, and autoscaling signals
fit together without claiming a global shared pool that the code does not own.

Root cause: older review language asked for "per-tenant workers vs shared pool"
as if those were the only two choices. The current adapter model is more
specific: `TemporalAdapter` dispatches non-empty tenants to
`<baseQueue>-<tenantId>`, and `TemporalWorkerHost` creates one SDK worker for
one configured `TEMPORAL_TASK_QUEUE`. Documentation drift came from preserving
the useful strategy while leaving the close condition ambiguous.

Constraints and invariants:

- `AGENTS.md` requires governance-first execution, real validation, no hidden
  debt, and no stubbed completion.
- `docs/architecture/fowler-opportunity-planning-governance.md` requires a
  Fowler matrix before non-trivial architecture-test or boundary work.
- `docs/architecture/command-query-rail-governance.md` applies no new
  externally observable command or query rail here; this slice documents and
  guards an existing operator posture.
- `docs/guides/ai-work-protocol.md` requires Think-First analysis,
  documentation alignment, negative/architecture tests, and closeout evidence.
- `ADR-0001` keeps Temporal integration lifecycle and worker operation explicit.
- `ADR-0003` keeps DVT lifecycle authority inside the DVT execution model.

Options considered:

- Implement a multi-queue worker host now. Rejected: it would change runtime
  behavior outside AR-D3's documented target and needs admission/provisioning
  design.
- Claim a global shared pool operationally. Rejected: current code does not
  poll all tenant queues from one worker process.
- Close AR-D3 as a production constraint decision: many queue-local worker
  pools, explicit tenant queue assignment, capability activity queues for
  specialized runtimes, and KEDA/HPA-style scaling driven by queue delay,
  backlog, ready workers, CPU, and memory. Selected because it matches the
  current adapter and gives operators a mature, measurable plan.

Selected option and rationale: close AR-D3 as an architecture/operations
strategy, not a hidden runtime rewrite. The current product can scale by adding
replicas per task queue and by provisioning tenant queue pools from the
deterministic queue naming policy. The residual 1000+ tenant automation work is
tracked as future provisioning automation rather than folded into this task.

Rejected alternatives:

- A shared subscription set in prose: would be false against the executable
  worker host.
- A static "one tenant equals one deployment forever" policy: too expensive for
  low-volume tenants and too rigid for future tenant-to-queue assignment.
- CPU-only autoscaling: misses Temporal queue delay and schedule-to-start
  pressure, which are the operator signals that show undersized pollers or
  execution slots.

## Pre-Implementation Brief

Mode: Slim.

Scope:

- Update the active Temporal worker scaling architecture document.
- Update the Temporal worker scaling operations runbook.
- Add a semantic architecture test that prevents AR-D3 from regressing into
  vague or unsupported shared-pool claims.
- Add ARC-2 evidence and risk material because the slice touches Temporal
  adapter test surfaces.
- Update Planning DB state after validation.

Touched files or paths:

- `docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md`
- `docs/runbooks/temporal-worker-scaling-operations.md`
- `packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts`
- `docs/evidence/ed-20260514-ar-d3-worker-scaling-strategy.md`
- `docs/risk-register/quality/R-20260514-AR-D3-WORKER-SCALING.yaml`
- planning closeout and generated docs indexes

Expected outcome: AR-D3 has a closed, current-state strategy: queue-local
worker pools are the supported unit, tenant queue assignment is explicit,
capability queues are scoped to `executeStep` activities, cold-start and
autoscaling signals are measurable, and 1000+ tenant provisioning automation is
named as residual future work rather than implied as complete runtime behavior.

Risks and mitigations:

- Risk: documentation overclaims global shared-pool behavior. Mitigation:
  architecture test asserts that active docs state the global pool is not
  implemented and avoid the old "AR-D3 remains in progress" posture.
- Risk: docs close the task without operator proof. Mitigation: evidence names
  this as a strategy closeout and leaves load-testing/provisioning automation
  as explicit residual work.

Out-of-scope items:

- Implementing a tenant-to-queue assignment service.
- Implementing a worker host that manages multiple SDK `Worker` instances.
- Adding Kubernetes manifests or KEDA ScaledObject YAML.
- Claiming production load evidence for 1000+ live tenant queues.

Validation plan:

- Red/green targeted architecture test:
  `pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts`
- Adapter package validation:
  `pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts`
- ARC and docs validation:
  `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  and `pnpm docs:sync`
- Final closeout baseline: `pnpm governance:refresh`, `pnpm verify:prepush`,
  and `pnpm planning:db:export:check`.

Test coverage plan: the new architecture test verifies the active strategy and
runbook contain the required decision sections, state the unsupported global
pool boundary, include tenant assignment/capacity/autoscaling semantics, and do
not keep AR-D3 in an in-progress posture after this closeout.

Libraries evaluated: Temporal official documentation for workers, task queues,
worker performance, worker tuning, and the Temporal KEDA scaler announcement.
No runtime library is adopted in this slice.

Command/query rail impact: no new product command or query. The affected rail is
the planning DB task lifecycle command used to claim and close `D/AR-D3`.

Fowler opportunity matrix:

| scenario                                                                                   | opportunity         | Fowler pattern                          | DDD owner                            | command/query rail                 | implementation surfaces               | unit or package test                               | architecture test                              | user-flow test | out of scope                 |
| ------------------------------------------------------------------------------------------ | ------------------- | --------------------------------------- | ------------------------------------ | ---------------------------------- | ------------------------------------- | -------------------------------------------------- | ---------------------------------------------- | -------------- | ---------------------------- |
| Operator needs to scale worker capacity for 1000+ tenants without false shared-pool claims | Documentation drift | Explicit operational policy             | Runtime / SRE worker topology policy | none - operator documentation only | Temporal scaling strategy and runbook | none - no runtime behavior change                  | `worker-scaling-strategy.architecture.test.ts` | none           | multi-queue worker host      |
| Tenant queue assignment must be deterministic and measurable                               | Boundary drift      | Policy object by documentation contract | Temporal adapter queue mapping       | existing adapter queue mapping     | strategy/runbook docs                 | existing adapter tests cover `toTemporalTaskQueue` | architecture doc guard                         | none           | tenant assignment service    |
| Autoscaling should react to Temporal queue pressure, not CPU only                          | Primitive obsession | Threshold policy                        | Runtime / SRE scaling policy         | none - operations policy           | runbook thresholds                    | none                                               | architecture doc guard                         | none           | KEDA manifest implementation |

## Closeout Evidence

## Work Performed

- Added `packages/@dvt/adapter-temporal/test/worker-scaling-strategy.architecture.test.ts`
  to guard the active strategy and runbook against unsupported shared-pool
  claims.
- Updated
  `docs/architecture/components/engine/adapters/temporal/temporal-worker-scaling-strategy.md`
  with the AR-D3 closure decision, tenant queue assignment policy, capacity
  model, autoscaling policy, production readiness contract, and industry
  references.
- Updated `docs/runbooks/temporal-worker-scaling-operations.md` with the same
  queue-local operator semantics.
- Added ARC-2 evidence in
  `docs/evidence/ed-20260514-ar-d3-worker-scaling-strategy.md`.
- Added residual risk entry in
  `docs/risk-register/quality/R-20260514-AR-D3-WORKER-SCALING.yaml`.
- Added Fowler analysis in
  `buzon/20260514-codex-fowler-ar-d3-worker-scaling-analysis.md`.
- Added mandatory feature mechanization plan in
  `docs/planning/proposals/mandatory/runtime-and-contracts/ar-d3-worker-scaling-strategy-plan-20260514.md`
  after `verify:prepush` correctly rejected undeclared test symbols.

## Validation Evidence

- Red:
  `pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts`
  failed before the docs had the AR-D3 closure sections.
- Green:
  `pnpm --filter @dvt/adapter-temporal test -- test/worker-scaling-strategy.architecture.test.ts`
  passed after the strategy/runbook update.
- `pnpm --filter @dvt/adapter-temporal typecheck` passed.
- `pnpm lint:md:changed` passed.
- `pnpm docs:feature-mechanization -- --feature AR-D3-WORKER-SCALING-STRATEGY`
  passed after the mandatory plan declared allowed surfaces and test symbols.
- `pnpm docs:feature-mechanization:implementation` passed.
- `pnpm governance:refresh` passed after regenerating docs and governance DB
  projections.
- `pnpm verify:prepush` initially failed on undeclared feature-mechanization
  symbols, proving the gate was active. The follow-up plan update fixed the
  root cause. Final post-commit `verify:prepush` is recorded in the task
  closeout response.

## No-Debt And No-Stub Evidence

- No runtime stub, fake adapter, placeholder implementation, or TODO was added.
- No global shared worker pool was claimed.
- No lint, type, test, architecture, docs, or governance rule was relaxed.
- No hooks were bypassed.
