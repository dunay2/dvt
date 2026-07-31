---
title: Historical Review Status Board
status: Archived
owner: Product / Architecture / Docs
last_reviewed: 2026-07-31
planning_type: review
---

# Historical Review Status Board

This document preserves the former review-board disposition as historical
evidence. It is not an active task or lifecycle authority. Current MVP work is
selected and updated in [GitHub Issues](https://github.com/dunay2/dvt/issues).

Use this page only to understand the recorded 2026 review taxonomy:

- which reviews remain active or reference-worthy
- which historical task IDs they referenced
- what execution status was recorded at that time
- which older reviews were moved to archive because they are superseded

Sprint execution board:

- [Review Sprint Board](./sprints/index.md)

## 2026-05-24 Planning review canonical disposition

`GD-REV-PLANNING-CANON` canonizes the review status board, review naming
policy, and sprint-board intake rules into DB-first follow-up semantics.

This board is the review navigation and intake map. It may name workboard task
linkage, but executable follow-up, claims, status, progress, dependencies, and
evidence are owned by the Planning DB command rail.

## 2026-05-25 Backlog intake reconciliation

[Backlog Intake Reconciliation Review](./architecture-and-governance/20260525-backlog-intake-reconciliation-review.md)
records the current gap between the normalized `next_task` view and the larger
intake set in mandatory proposals, active reviews, proposed knowledge actions,
and the risk register.

[Buzon Fowler Canonization Inventory](./architecture-and-governance/20260525-buzon-fowler-canonization-inventory.md)
classifies the tracked `buzon/` Fowler analyses into domain-owned
canonization tasks so mailbox analysis does not remain an informal backlog.

[Frontend Buzon Fowler Canonization Review](./architecture-and-governance/20260525-frontend-buzon-fowler-canonization-review.md)
records the Lane E disposition for frontend and workbench mailbox analyses,
including zero-reference Canvas, workbench, web API, and Runs findings.

[Architecture Buzon Fowler Canonization Review](./architecture-and-governance/20260525-architecture-buzon-fowler-canonization-review.md)
records the Lane A disposition for architecture, contracts, planner,
state-store, DDD, and hexagonal mailbox analyses. It restores the remaining
provider-registry/conformance debt as blocked Planning DB task
`EA-20260429-04`.

[Buzon Fowler DB Activation Review](./architecture-and-governance/20260605-buzon-fowler-db-activation-review.md)
records the 2026-06-05 DB-first activation pass for unclassified Fowler intake,
including safe raw `buzon/` retirements, retained active backrefs, restored
Planning DB tasks, and frontend proposal classification follow-up.

Disposition:

- `D-MAND-PROP-GAP-INTAKE-1` cleared the mandatory-proposal binding gap on
  2026-05-25: `mandatory-proposal-gaps` and `task-gaps` both return zero rows.
- `E-PROP-DISP-1`, `GOV-PROP-DISP-1`, and `RUNTIME-PROP-DISP-1` are the
  domain Planning DB reconciliation rails for the remaining proposal and
  action-level intake.
- active reviews and open risks need one explicit review/risk intake task or an
  equivalent Planning DB linkage decision.
- `buzon/` analyses are owned by `A-BUZON-FOWLER-CANON-1`,
  `C-BUZON-FOWLER-CANON-1`, `D-BUZON-GOV-CANON-1`,
  `E-BUZON-FOWLER-CANON-1`, and `D-RISK-DEBT-CANON-1`.
- mandatory proposal gaps, open docs-disposition rows, and unlinked knowledge
  actions are owned by `E-PROP-DISP-1`, `GOV-PROP-DISP-1`,
  `RUNTIME-PROP-DISP-1`, `D-DOCS-DISPOSITION-QUEUE-1`, and
  `D-KNOWLEDGE-ACTION-LINKAGE-1`.

## 2026-05-27 Docs and engine component reconciliation

[Docs And Engine Component Reconciliation Fowler Review](./architecture-and-governance/20260527-docs-engine-component-reconciliation-fowler-review.md)
records the current DB-first cleanup pass for mandatory proposal gaps,
task-like action lineage, docs-disposition rows, and the engine component
engineering pilot.

Disposition:

- current `mandatory-proposal-gaps`, `task-gaps`, and `docs-disposition`
  queries returned zero rows after task-linked updates and DB dispositions;
- `SYS-RUNTIME-ENGINE-CORE` is mechanically mapped as an aggregator with 16
  child components, 0 direct files, and no component-drift rows;
- the remaining engine component residual is semantic metadata depth, now
  tracked by `D-ENGINE-COMPONENT-METADATA-INDEX-1`;
- closeout-specific residual scanning remains owned by
  `GD-CLOSEOUT-DEBT-RECON-1`.

## 2026-05-27 Frontend UX maturity audit

[Frontend UX Maturity Audit Review](./architecture-and-governance/20260527-frontend-ux-maturity-audit-review.md)
records the current Canvas, Runs, Templates, Plugins, and Admin UX audit
against the local workbench rules and mature systems such as VS Code, dbt
Cloud, Databricks Workflows, Airflow, Snowflake Snowsight, and Oracle SQL
Developer.

Disposition:

- desktop Canvas and Templates show the right workbench direction, but the
  product flow is not yet mature enough for import/edit/save/run/export;
- narrow viewport behavior is not product-ready because route controls, tables,
  and panels clip horizontally;
- the next product route remains Planning DB-owned by
  `E-SHELL-TOP-MENU-RATIONALIZATION-1`, `E-DBT-AUTHOR-RUN-1`, and
  `E-DBT-PROJECT-ROUNDTRIP-1`;
- no Markdown-only follow-up queue is introduced by the review.

## Active Reviews

| Review                                                                                                                                            | Domain folder                     | Current review role                                     | Workboard task linkage                     | Execution status | Execution progress |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- | ------------------------------------------ | ---------------- | ------------------ |
| [20260326 DVT principal architectural review](./architecture-and-governance/20260326-dvt-principal-architectural-review.md)                       | `architecture-and-governance`     | reference baseline for cross-cutting architecture       | `none`                                     | reference        | `n/a`              |
| [20260331 Principal architecture deep review](./architecture-and-governance/20260331-principal-architecture-deep-review.md)                       | `architecture-and-governance`     | latest deep architectural reference                     | `none`                                     | reference        | `n/a`              |
| [20260407 Engine boundary current/target review](./architecture-and-governance/20260407-engine-boundary-current-target-and-migration-review.md)   | `architecture-and-governance`     | current engine-boundary and migration reference         | `none`                                     | reference        | `n/a`              |
| [20260407 Principles and target-state review](./architecture-and-governance/20260407-dvt-principles-boundaries-and-target-state-review.md)        | `architecture-and-governance`     | current product-principles and target-state reference   | `none`                                     | reference        | `n/a`              |
| [20260322 DDD and hexagonal port audit](./architecture-and-governance/20260322-ddd-hexagonal-port-audit-review.md)                                | `architecture-and-governance`     | active architecture reference cited by ADRs             | `none`                                     | reference        | `n/a`              |
| [20260314 Domain cohesion review](./architecture-and-governance/20260314-domain-cohesion-review.md)                                               | `architecture-and-governance`     | active domain-boundary reference                        | `none`                                     | reference        | `n/a`              |
| [20260321 Planner-backed StartRun QA review](./execution-runtime/20260321-planner-backed-start-run-qa-review.md)                                  | `execution-runtime`               | runtime/planner QA reference                            | `none`                                     | reference        | `n/a`              |
| [20260326 RunMaintenanceService SRP review](./execution-runtime/20260326-run-maintenance-service-srp-review.md)                                   | `execution-runtime`               | design input for runtime decomposition                  | `none`                                     | reference        | `n/a`              |
| [20260326 S03 hard QA review](./execution-runtime/20260326-s03-hard-qa-review.md)                                                                 | `execution-runtime`               | open execution-runtime critique                         | `none`                                     | reference        | `n/a`              |
| [20260328 Runtime command RBAC review](./execution-runtime/20260328-runtime-command-rbac-review.md)                                               | `execution-runtime`               | shipped authorization slice reference                   | `RBAC at operation level`, `granular RBAC` | `done`           | `100%`             |
| [20260331 MVP-A1 backend contractual inventory review](./execution-runtime/20260331-mvp-a1-backend-contractual-inventory-review.md)               | `execution-runtime`               | canonical MVP backend inventory review                  | `MVP-A1`                                   | `done`           | `100%`             |
| [20260326 Reconciler runtime SOLID QA review](./event-contract-and-traceability/20260326-reconciler-runtime-solid-qa-review.md)                   | `event-contract-and-traceability` | quality reference for reconciler health/runtime wiring  | `RC-D1`                                    | `done`           | `100%`             |
| [20260328 Lineage outbox Fowler QA hard review](./event-contract-and-traceability/20260328-lineage-outbox-fowler-qa-hard-review.md)               | `event-contract-and-traceability` | hardening reference for lineage retry semantics         | `RC-B5`, `RC-B5-F2`                        | `done`           | `100%`             |
| [20260330 MVP-B1 claim-to-evidence traceability matrix](./event-contract-and-traceability/20260330-mvp-b1-claim-evidence-traceability-matrix.md)  | `event-contract-and-traceability` | canonical MVP proof matrix                              | `MVP-B1`                                   | `done`           | `100%`             |
| [20260404 S05 envelope boundary hardening plan review](./event-contract-and-traceability/20260404-s05-envelope-boundary-hardening-plan-review.md) | `event-contract-and-traceability` | closed execution plan for envelope boundary hardening   | `S05`                                      | `done`           | `100%`             |
| [20260404 S05 envelope boundary Fowler QA review](./event-contract-and-traceability/20260404-s05-envelope-boundary-fowler-qa-review.md)           | `event-contract-and-traceability` | closed QA gate for S05 closure posture                  | `S05`                                      | `done`           | `100%`             |
| [20260404 S19-F1 snapshot optimization plan review](./engine/20260404-s19f1-snapshot-optimization-plan-review.md)                                 | `engine`                          | closure review for snapshot selector and queue claims   | `S19-F1`, `S19-F1-C`                       | `done`           | `100%`             |
| [20260329 Run event retention TTL kickoff review](./event-lifecycle-and-retention/20260329-run-event-retention-ttl-kickoff-review.md)             | `event-lifecycle-and-retention`   | kickoff and acceptance reference for retention work     | `run event log retention + TTL`            | `done`           | `100%`             |
| [20260329 Run event retention Fowler hard review](./event-lifecycle-and-retention/20260329-run-event-retention-fowler-hard-review.md)             | `event-lifecycle-and-retention`   | QA reference for retention controls                     | `run event log retention + TTL`            | `done`           | `100%`             |
| [20260329 Run event retention risks and mitigations](./event-lifecycle-and-retention/20260329-run-event-retention-risks-mitigations.md)           | `event-lifecycle-and-retention`   | risk companion for retention slice                      | `run event log retention + TTL`            | `done`           | `100%`             |
| [20260330 MVP-D1 residual risk baseline review](./event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md)                 | `event-lifecycle-and-retention`   | canonical residual-risk acceptance review               | `MVP-D1`                                   | `done`           | `100%`             |
| [20260328 Lane C AI efficiency and cost review](./ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md)                               | `ci-and-delivery`                 | first RC-C2 review of record                            | `RC-C2`                                    | `review`         | `67%`              |
| [20260330 CI performance review and action plan](./ci-and-delivery/20260330-ci-performance-review-and-action-plan.md)                             | `ci-and-delivery`                 | CI throughput improvement reference                     | `none`                                     | reference        | `n/a`              |
| [20260330 CI, prepush, and PR process observations](./ci-and-delivery/20260330-ci-prepush-pr-process-observations.md)                             | `ci-and-delivery`                 | friction log still feeding RC-C2                        | `RC-C2`                                    | `review`         | `67%`              |
| [20260401 CI process review](./ci-and-delivery/20260401-ci-process-review.md)                                                                     | `ci-and-delivery`                 | current CI process baseline review                      | `none`                                     | reference        | `n/a`              |
| [20260401 Lane C RC-C2 efficiency institutionalization review](./ci-and-delivery/20260401-lane-c-rc-c2-efficiency-institutionalization-review.md) | `ci-and-delivery`                 | RC-C2 phase-2 institutionalization review               | `RC-C2`                                    | `review`         | `67%`              |
| [20260402 RC-C2 operational friction intake review](./ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md)                       | `ci-and-delivery`                 | current RC-C2 intake review                             | `RC-C2`                                    | `review`         | `67%`              |
| [20260422 Environment configuration audit](./ci-and-delivery/20260422-environment-configuration-audit-review.md)                                  | `ci-and-delivery`                 | current monorepo environment and tooling audit baseline | `none`                                     | reference        | `n/a`              |
| [20260506 CI build config audit](./ci-and-delivery/20260506-ci-build-audit-review.md)                                                             | `ci-and-delivery`                 | CI/build/config audit intake routed to Lane C tasks     | `CI-AUDIT-*`                               | reference        | `n/a`              |

## 2026-05-23 Canvas Fowler Canonical Disposition

`F-MAND-CANVAS-FOWLER` canonizes the mandatory Canvas workbench Fowler
remediation proposal into a Planning DB-owned frontend governance task, a local
component guide, user stories, and semantic architecture proof.

No Canvas Fowler remediation proposal remains an orphan execution queue after
this disposition. Runtime Canvas behavior remains owned by the existing Canvas
component guide family; future executable behavior must be promoted to Planning
DB before code changes begin.

Canonical surfaces:

- [Canvas Fowler Canon Plan 2026-05-23](../proposals/mandatory/frontend-and-ux/canvas-fowler-canon-plan-20260523.md)
- [Canvas Fowler Canon Component](../../architecture/components/web/graph/canvas-fowler-canon-component.md)
- [Canvas Fowler Canon User Stories](../../architecture/components/web/graph/canvas-fowler-canon-user-stories.md)
- [Canvas Workbench Fowler Canon Analysis](../../../buzon/20260523-codex-fowler-canvas-workbench-canon.md)

Additional active rationale:

- [20260504 Internal alpha product route review](./architecture-and-governance/20260504-internal-alpha-evolution-route.md)
  - domain: `architecture-and-governance`
  - role: current route-level alpha gate review covering startup, context, Canvas, Code, plan/run readiness, recovery, risk, and cadence
  - linkage: `F-27`, `AR-C10`, `TF-C4`, `TF-E2-M`
  - status: `review`
  - progress: `15%`

- [20260505 Internal alpha architecture view review](./architecture-and-governance/20260505-internal-alpha-architecture-view-review.md)
  - domain: `architecture-and-governance`
  - role: architecture boundary lens for F-27 covering route, rail, state, evidence, and risk posture without creating a parallel backlog
  - linkage: `F-27`, `AR-C10`, `TF-C4`, `TF-E2-M`
  - status: `review`
  - progress: `15%`

- [20260505 Alpha route v3 critique](./architecture-and-governance/20260505-alpha-evolution-route-v3-critique.md)
  - domain: `architecture-and-governance`
  - role: accepted source-grounded intake absorbed by the internal alpha route review and route plan
  - linkage: `F-27`
  - status: `accepted`
  - progress: `100%`

- [20260422 Canvas component governance follow-up review](./architecture-and-governance/20260422-canvas-component-governance-follow-up-review.md)
  - domain: `architecture-and-governance`
  - role: current focused review for Canvas route-composition and authoring-projection component semantics, local component-guide closure, and semantic fitness-function follow-up after the runtime-truth hard cut
  - linkage: `TF-E2`, `TF-E2-A`, `TF-E2-E`
  - status: `reference`
  - progress: `n/a`

- [20260422 Canvas runtime truth hard-cut review](./architecture-and-governance/20260422-canvas-runtime-truth-hardcut-review.md)
  - domain: `architecture-and-governance`
  - role: current focused review for the no-legacy Canvas authoring cut, protected draft truth as the only remote authority, and fail-closed startup posture when runtime authoring is unavailable
  - linkage: `TF-E2`, `TF-E2-A`, `TF-E2-B`, `TF-E2-C`, `TF-E2-E`
  - status: `reference`
  - progress: `n/a`

- [20260425 Canvas graph strategy Fowler hard QA review](./architecture-and-governance/20260425-canvas-graph-strategy-fowler-hard-qa-review.md)
  - domain: `architecture-and-governance`
  - role: accepted hard QA closure for Canvas graph-strategy ownership, active canvas-kind strategy resolution, DBT fail-closed adapter validation, canonical admission versus viewport projection, and semantic architecture fitness functions
  - linkage: `TF-E2`, `TF-E2-L`
  - status: `accepted`
  - progress: `100%`

- [20260426 Canvas runtime policy architecture review](./architecture-and-governance/20260426-canvas-runtime-policy-architecture-review.md)
  - domain: `architecture-and-governance`
  - role: accepted hard QA closure for the Canvas runtime-policy boundary that unifies mutation, admission, execution, inspector, and capability posture
  - linkage: `TF-E2`, `TF-E2-POL`
  - status: `accepted`
  - progress: `100%`

- [20260421 Canvas handler seams Fowler review](./architecture-and-governance/20260421-canvas-handler-seams-fowler-review.md)
  - domain: `architecture-and-governance`
  - role: current focused review for the Canvas handler-contract component, Fowler-style seam ownership, residual adapter drift, and the semantic fitness-function follow-up on the graph route
  - linkage: `TF-E2-B`, `TF-E2-C`, `TF-E2-D`
  - status: `reference`
  - progress: `n/a`

- [20260421 Canvas route composition Fowler review](./architecture-and-governance/20260421-canvas-route-composition-fowler-review.md)
  - domain: `architecture-and-governance`
  - role: current focused review for Canvas route composition, semantic modal-host contracts, concern-scoped shell-builder inputs, and residual supervising-controller drift
  - linkage: `TF-E2-I`, `TF-E2-J`
  - status: `reference`
  - progress: `n/a`

- [20260429 DVT+ principal architect deep review — April 2026](./architecture-and-governance/20260429-dvt-plus-principal-deep-review-april-2026.md)
  - domain: `architecture-and-governance`
  - role: current post-G1–G10 full-system principal review covering conceptual soundness, risk map, engine abstraction, planner, state layer, SOLID/Hexagonal/CQRS compliance, overbuilt/underbuilt areas, 3-year scalability outlook, and a 17-task hardening action plan
  - linkage: `AR-D2`, `AR-D-PLAN-POINTER`, `R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING`
  - status: `active`
  - progress: `100%`

- [20260429 DVT engine package audit review](./architecture-and-governance/20260429-dvt-engine-package-audit-review.md)
  - domain: `architecture-and-governance`
  - role: dispositioned engine-package audit intake grounded on `main@2522f130`; promoted schema-version, attempt-semantics, provider-truth, public API, architecture-test, and start-run bootstrap follow-ups into planning DB tasks
  - linkage: `S16`, `S09`, `AR-A8`, `AR-A12`, `AR-D6`, `EA-20260429-01..08`
  - status: `reference`
  - progress: `100%`

- [20260427 AR-D plan pointer Fowler hard QA review](./architecture-and-governance/20260427-ar-d-plan-pointer-fowler-hard-qa-review.md)
  - domain: `architecture-and-governance`
  - role: hard QA baseline for the Temporal PlanRef-plus-cursor implementation, aligned Temporal adapter spec, composition-root config propagation, negative tests, and replay/cutover posture; superseded for full-system posture by the 2026-04-29 principal deep review
  - linkage: `AR-D-PLAN-POINTER`, `AR-D2`, `R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING`
  - status: `reference`
  - progress: `n/a`

- [20260421 Temporal Fowler provider-truth follow-up review](./architecture-and-governance/20260421-temporal-fowler-provider-truth-follow-up-review.md)
  - domain: `architecture-and-governance`
  - role: historical follow-up review for the Temporal branch plus the `apps/api` provider-truth correction; superseded for PlanRef workflow-payload truth by the 2026-04-27 AR-D plan pointer QA
  - linkage: `TF-C2`, `TF-A1-C18`, `AR-D-PLAN-POINTER`, `R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING`
  - status: `reference`
  - progress: `n/a`

- [20260423 DVT+ system architecture review](./architecture-and-governance/20260423-dvt-plus-system-architecture-review.md)
  - domain: `architecture-and-governance`
  - role: latest full-system principal/staff review grounded in the shipped planner, engine, state, adapter, API, and web boundary reality on 2026-04-23
  - linkage: proposed `IWorkflowEngine` contract ownership cleanup, capability fail-closed hardening, tenant identity decision, read-side contracts, DBT adapter decoupling, workflow-state evolution, cost facts, retention and restore proof
  - status: `reference`
  - progress: `n/a`

- [20260427 DVT+ deep architectural review](./architecture-and-governance/20260427-dvt-deep-architectural-review.md)
  - domain: `architecture-and-governance`
  - role: current full-system principal/staff review intake for structural execution maturity, operational contracts, risk-register load, and provider/adaptor replaceability evidence
  - linkage: `S02`, `S03`, `S08`, `ADR-0009`, `R-20260425-PRODUCTION-TENANT-ISOLATION-BASELINE`, `R-20260420-TEMPORAL-DBT-BUILTIN-COUPLING`
  - status: `reference`
  - progress: `n/a`

- [20260420 DVT+ system architecture review](./architecture-and-governance/20260420-dvt-plus-system-architecture-review.md)
  - domain: `architecture-and-governance`
  - role: prior full-system principal/staff review grounded in the shipped planner, engine, state, adapter, and route-boundary reality after the April plan-route convergence work; superseded for Temporal PlanRef workflow-payload truth by the 2026-04-27 AR-D plan pointer QA
  - linkage: `AR-A8`, `AR-C3`, `AR-D2`, `AR-D8`, `AR-D-PLAN-POINTER`, proposed `AR-A-READSIDE-CONTRACTS`, proposed `AR-C-TENANT-ISOLATION-PROPERTY`, proposed `AR-D-RESTORE-DRILL`
  - status: `reference`
  - progress: `n/a`

- [20260419 Plan-route boundary remediation review](./architecture-and-governance/20260419-plan-route-boundary-remediation-review.md)
  - domain: `architecture-and-governance`
  - role: reference review for the closed plan-route remediation and maturity slices; preview observability ownership, route-policy catalog hardening, the canonical planner-input seam, the declarative request-resolution recipe, and compile-boundary ownership convergence are closed by `TF-A1-C15..TF-A1-C19`
  - linkage: `TF-A1-C12..TF-A1-C19`
  - status: `reference`
  - progress: `n/a`

- [20260418 MW-D1 external compile boundary review](./architecture-and-governance/20260418-mw-d1-external-compile-boundary-review.md)
  - domain: `architecture-and-governance`
  - role: historical MW-D1 review retained as evidence from before the plan-compile language alignment
  - linkage: `MW-D1`
  - status: `done`
  - progress: `100%`

- [20260417 DVT artifacts review](./architecture-and-governance/20260417-dvt-artifacts-review.md)
  - domain: `architecture-and-governance`
  - role: current artifacts-boundary and consumer-gap review distilled to active execution conclusions
  - linkage: `RC-G1-C`, `F-11`, `F-17-F`
  - status: `reference`
  - progress: `n/a`

- [20260419 Post RC-G1-C architecture review](./architecture-and-governance/20260419-post-rc-g1-c-architecture-review.md)
  - domain: `architecture-and-governance`
  - role: reference intake for the remaining delivery-runtime decomposition follow-up
  - linkage: `AR-A7`
  - status: `reference`
  - progress: `n/a`

- [20260411 Project architecture strengths, weaknesses, and priority review](./architecture-and-governance/20260411-project-architecture-strengths-weaknesses-fowler-review.md)
  - domain: `architecture-and-governance`
  - role: current module-by-module architectural valuation and priority baseline
  - linkage: `none`
  - status: `reference`
  - progress: `n/a`

- [20260410 Runtime and shared-kernel risk triage review](./architecture-and-governance/20260410-runtime-and-shared-kernel-risk-triage-review.md)
  - domain: `architecture-and-governance`
  - role: current triage reference for shared-kernel and runtime risks
  - linkage: `RC-G1-B`, `AR-A7`, `AR-A12`, `AR-C6`, `AR-D8`, `AR-C2-T2..T4`
  - status: `reference`
  - progress: `n/a`

- [20260407 Execution plan and run execution policy rationale](./architecture-and-governance/20260407-execution-plan-and-run-execution-policy-rationale.md)
  - domain: `architecture-and-governance`
  - role: current plan-definition vs execution-policy rationale
  - linkage: `none`
  - status: `reference`
  - progress: `n/a`

- [20260407 Principal architecture review - progress, effort, and diagrams](./architecture-and-governance/20260407-principal-architecture-review-progress-and-diagrams.md)
  - domain: `architecture-and-governance`
  - role: current status-and-diagrams companion to the 2026-04-07 principal architecture review
  - linkage: `none`
  - status: `reference`
  - progress: `n/a`

- [20260407 PlanCore operational consumption design spike](./architecture-and-governance/20260407-plan-core-operational-consumption-design-spike.md)
  - domain: `architecture-and-governance`
  - role: design spike on whether existing `PlanCore` should become an operationally consumed split
  - linkage: `none`
  - status: `reference`
  - progress: `n/a`

- [20260407 Retry-step boundary and use-case review](./architecture-and-governance/20260407-retry-step-boundary-and-use-case-review.md)
  - domain: `architecture-and-governance`
  - role: historical boundary rationale for narrowing `RETRY_STEP`; `RETRY_RUN` is superseded separately by ADR-0049
  - linkage: `WE-HX-4-C`
  - status: `done`
  - progress: `100%`

- [20260408 Retry-run boundary and provider signal mapper review](./architecture-and-governance/20260408-retry-run-boundary-and-provider-signal-mapper-review.md)
  - domain: `architecture-and-governance`
  - role: boundary rationale and implementation review for narrowing `RETRY_RUN` out of canonical `SignalType` and making provider signal mapping explicit
  - linkage: `WE-HX-4-A`, `WE-HX-4-B`, `WE-HX-4-C`
  - status: `done`
  - progress: `100%`

- [20260410 Contract pack and read boundary reset Fowler review](./architecture-and-governance/20260410-contract-pack-and-read-boundary-reset-fowler-review.md)
  - domain: `architecture-and-governance`
  - role: current review of record for resetting the engine-runtime contract pack and the run-status read boundary
  - linkage: `AR-A12`, `AR-A12-A`, `AR-A12-B`, `AR-A12-C`
  - status: `in_progress`
  - progress: `35%`

- [20260411 AR-A12-B status model split Fowler review](./architecture-and-governance/20260411-ar-a12-b-status-model-split-fowler-review.md)
  - domain: `architecture-and-governance`
  - role: slice-specific architecture review for splitting canonical status, enrichment, and provider-live diagnostics
  - linkage: `AR-A12-B`
  - status: `done`
  - progress: `100%`

- [20260413 DVT+ architectural audit review](./architecture-and-governance/20260413-dvt-plus-architectural-audit-review.md)
  - domain: `architecture-and-governance`
  - role: principal/staff architectural audit and recommendation baseline
  - linkage: `none`
  - status: `reference`
  - progress: `n/a`

- [20260414 DVT+ principal/staff architecture review](./architecture-and-governance/20260414-principal-architect-review-dvtplus.md)
  - domain: `architecture-and-governance`
  - role: follow-up principal/staff architecture review with prioritized action plan
  - linkage: `none`
  - status: `reference`
  - progress: `n/a`

Additional active QA:

- [20260426 API tenant review](./architecture-and-governance/20260426-api-tenant-review.md)
  - domain: `architecture-and-governance`
  - role: current QA review of record for tenant RLS, migration hardening semantics, and adapter-postgres runtime bootstrap alignment
  - linkage: `none`
  - status: `review`
  - progress: `90%`

- [20260407 Execution plan and policy hard QA review](./architecture-and-governance/20260407-execution-plan-and-run-execution-policy-hard-qa-review.md)
  - domain: `architecture-and-governance`
  - role: hard QA gate for the plan-definition vs execution-policy slice
  - linkage: `QA-EP-9..QA-EP-11`
  - status: `done`
  - progress: `100%`
- [20260405 F04-RISK-A PlanRef runtime boundary hard QA review](./architecture-and-governance/20260405-f04-risk-a-hard-qa-review.md)
  - domain: `architecture-and-governance`
  - role: hard QA intake and closure record for backend-owned `planRef` handoff
  - linkage: `F-04-RISK-A`, `F-04-RISK-A-QA-03`
  - status: `done`
  - progress: `100%`
- [20260407 F-04-F capabilities-port hard QA review](./20260407-f04-f-capabilities-port-hard-qa-review.md)
  - domain: `frontend-and-ui`
  - role: documentary hard QA gate for the governed capabilities-boundary slice
  - linkage: `F-04-F`
  - status: `done`
  - progress: `100%`
- [20260407 F-04-RISK-B mock workspace isolation hard QA review](./20260407-f04-risk-b-mock-workspace-isolation-hard-qa-review.md)
  - domain: `frontend-and-ui`
  - role: documentary hard QA gate for the mock workspace determinism hardening slice
  - linkage: `F-04-RISK-B`
  - status: `done`
  - progress: `100%`
- [20260408 F-04-RESIDUAL-A Root provider guard hard QA review](./20260408-f04-residual-a-root-provider-guard-hard-qa-review.md)
  - domain: `frontend-and-ui`
  - role: documentary hard QA gate for the Root-level provider ownership guard
  - linkage: `F-04-RESIDUAL-A`
  - status: `done`
  - progress: `100%`
- [20260409 TF-C2-B runtime read-surface hard QA review](execution-runtime/20260409-tf-c2-b-read-surface-hard-qa-review.md)
  - domain: `execution-runtime`
  - role: documentary hard QA gate for TF-C2-B execution evidence projection and contract closure
  - linkage: `TF-C2-B`, `TF-C2-B-QA-01..05`
  - status: `done`
  - progress: `100%`

- [20260407 Retry-step boundary hard QA review](./architecture-and-governance/20260407-retry-step-boundary-hard-qa-review.md)
  - domain: `architecture-and-governance`
  - role: hard QA gate for narrowing `RETRY_STEP` out of canonical `SignalType`
  - linkage: `QA-RS-1..QA-RS-4`
  - status: `done`
  - progress: `100%`

- [20260408 Retry-run boundary hard QA review](./architecture-and-governance/20260408-retry-run-boundary-hard-qa-review.md)
  - domain: `architecture-and-governance`
  - role: hard QA gate for narrowing `RETRY_RUN` out of canonical `SignalType` and closing the provider signal mapper seam
  - linkage: `QA-RR-1..QA-RR-5`
  - status: `done`
  - progress: `100%`

## 2026-05-23 Runtime Review Canonical Disposition

`C-REV-RUNTIME-CANON` classifies runtime/API review inputs through
`ClassifyRuntimeReviewDisposition` and records the outcome with
`RecordRuntimeReviewCanon`. No runtime review remains an orphan execution queue;
executable follow-up belongs in Planning DB, protected runtime rails, or an
explicit closeout.

| Review input                                                                                                                                                  | Disposition                                                                                 | Canonical owner                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| [20260321 Planner-backed StartRun QA review](./execution-runtime/20260321-planner-backed-start-run-qa-review.md)                                              | reference rationale absorbed by protected runtime planner-ingress work                      | protected runtime rail catalog |
| [20260326 RunMaintenanceService SRP review](./execution-runtime/20260326-run-maintenance-service-srp-review.md)                                               | reference rationale for runtime decomposition                                               | execution-runtime domain page  |
| [20260326 S03 hard QA review](./execution-runtime/20260326-s03-hard-qa-review.md)                                                                             | superseded as active critique by AR-C10, TF-C2, and RC closeouts                            | runtime review canon component |
| [20260410 Runtime and shared-kernel risk triage review](./architecture-and-governance/20260410-runtime-and-shared-kernel-risk-triage-review.md)               | reference intake with linked Planning DB task families                                      | Lane C/A/D task families       |
| [20260410 Contract pack and read boundary reset Fowler review](./architecture-and-governance/20260410-contract-pack-and-read-boundary-reset-fowler-review.md) | future/active work remains under AR-A12 task family                                         | Lane A AR-A12 task family      |
| [20260409 TF-C2-B runtime read-surface hard QA review](execution-runtime/20260409-tf-c2-b-read-surface-hard-qa-review.md)                                     | done and evidence-backed                                                                    | TF-C2-B closeout               |
| [20260510 Web API integration gap review](./20260510-web-api-integration-gap-review.md)                                                                       | runtime side must route through protected runtime command/query rails before implementation | API/runtime rail catalog       |

Canonical component and stories:

- [Runtime review canon component](../../architecture/components/api/runtime-review-canon-component.md)
- [Runtime review canon user stories](../../architecture/components/api/runtime-review-canon-user-stories.md)
- [Runtime review canon plan 2026-05-23](../proposals/mandatory/runtime-and-contracts/runtime-review-canon-plan-20260523.md)

## 2026-05-23 CI Delivery Retention Review Canonical Disposition

`D-REV-CI-RETENTION-CANON` classifies CI, delivery, and retention review inputs
through `ClassifyCiRetentionReviewDisposition` and records the outcome with
`RecordCiRetentionReviewCanon`. No CI, delivery, or retention review remains an orphan execution queue;
executable follow-up belongs in Planning DB, measured adoption gates, component
guides, or closeouts.

| Review input                                                                                                                                      | Disposition                                                         | Canonical owner                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| [20260328 Lane C AI efficiency and cost review](./ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md)                               | blocked on measurement; still feeds `RC-C2`                         | AI efficiency adoption status        |
| [20260330 CI, prepush, and PR process observations](./ci-and-delivery/20260330-ci-prepush-pr-process-observations.md)                             | blocked on measurement; shipped tooling remains closeout evidence   | `RC-C2`                              |
| [20260401 Lane C RC-C2 efficiency institutionalization review](./ci-and-delivery/20260401-lane-c-rc-c2-efficiency-institutionalization-review.md) | blocked on measurement; no closure without three qualifying cycles  | `RC-C2`                              |
| [20260402 RC-C2 operational friction intake review](./ci-and-delivery/20260402-rc-c2-operational-friction-intake-review.md)                       | blocked on measurement; friction fixes remain closeout evidence     | `RC-C2`                              |
| [20260330 CI performance review and action plan](./ci-and-delivery/20260330-ci-performance-review-and-action-plan.md)                             | reference rationale for CI throughput                               | CI governance component              |
| [20260401 CI process review](./ci-and-delivery/20260401-ci-process-review.md)                                                                     | reference baseline for CI process                                   | CI governance component              |
| [20260422 Environment configuration audit](./ci-and-delivery/20260422-environment-configuration-audit-review.md)                                  | reference intake for config/build posture                           | CI governance and CI-AUDIT tasks     |
| [20260506 CI build config audit](./ci-and-delivery/20260506-ci-build-audit-review.md)                                                             | reference intake routed to `CI-AUDIT-*` tasks                       | CI-AUDIT task family                 |
| [20260329 Run event retention TTL kickoff review](./event-lifecycle-and-retention/20260329-run-event-retention-ttl-kickoff-review.md)             | done/reference; component owner is run-event retention policy       | event lifecycle and retention domain |
| [20260329 Run event retention Fowler hard review](./event-lifecycle-and-retention/20260329-run-event-retention-fowler-hard-review.md)             | done/reference; QA rationale absorbed by retention policy component | event lifecycle and retention domain |
| [20260329 Run event retention risks and mitigations](./event-lifecycle-and-retention/20260329-run-event-retention-risks-mitigations.md)           | done/reference; residual risk handled by retention closeouts        | event lifecycle and retention domain |
| [20260330 MVP-D1 residual risk baseline review](./event-lifecycle-and-retention/20260330-mvp-d1-residual-risk-baseline-review.md)                 | done/reference; baseline retained as evidence                       | MVP-D1 and AR-D5 closeouts           |

Canonical component and stories:

- [CI retention review canon component](../../architecture/components/ci-governance/ci-retention-review-canon-component.md)
- [CI retention review canon user stories](../../architecture/components/ci-governance/ci-retention-review-canon-user-stories.md)
- [CI retention review canon plan 2026-05-23](../proposals/mandatory/governance-and-docs/ci-retention-review-canon-plan-20260523.md)

## Newly Classified Review

- Review:
  [20260402 Deep architectural review - principal architect](./architecture-and-governance/20260402-deep-architectural-review-principal-architect.md)
- Domain folder: `architecture-and-governance`
- Current review role: active principal review feeding new lane decomposition
- Workboard task linkage: `AR-A8..AR-A11`, `AR-C5`, `AR-D7`, `AR-D8`
- Execution status: `queued`
- Execution progress: `0%`

## Archive Rule Applied

The following review families were moved to
`docs/planning/archive/reviews/architecture-and-governance/`:

- early architectural passes superseded by the 2026-03-26 and 2026-03-31
  principal reviews
- general review snapshots whose findings were absorbed by later architecture
  reviews, closeouts, ADRs, or workboard tasks
- RC-A2 and RC-A5 hard-mode reviews that no longer serve as the active topic
  entry point

The archive move is structural, not destructive. Historical references remain
valid through the archived paths.
