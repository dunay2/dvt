---
title: Review Remediation Roadmap 2026-04
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-04-02
planning_type: proposal
---

# Review Remediation Roadmap 2026-04

Subsystem roadmap for converting architectural and technical reviews into
sequenced execution boards with explicit dependencies.

## Scope

- planning review backlog converted into sprint board files
- dependency-aware execution sequencing across 3 sprints
- board-based prioritization for runtime, contracts, planner, and CI concerns

## Sprint Phases

### Phase 1: Active stabilization (Sprint 2026-04A)

Primary outcomes:

- unblock critical runtime orchestration and review-governance work
- complete CI process hardening required for RC-C2 closure
- correct the open `F-03` shell-health acceptance drift before it is treated as
  closure-ready

References:

- [Sprint 2026-04A Board](../reviews/sprints/sprint-2026-04a/index.md)

#### Phase 1 addendum: Frontend shell health remediation (`F-03`)

This frontend slice stays in Sprint `2026-04A` because it is visible product
surface work and the hard QA review exposed acceptance drift rather than a new
future roadmap item.

Execution slices:

- `F-03-A`: move shell health projection back behind the `platform-health`
  capability boundary and expose one derived shell model
- `F-03-B`: restore real retry/backoff semantics for degraded/offline shell
  health instead of a fixed polling countdown
- `F-03-C`: remove the false initial `ok` connectivity state from shared shell
  behavior before the first settled health check

References:

- [F03 shell health banner hard QA review](../reviews/20260402-f03-shell-health-banner-hard-qa-review.md)
- [Agent Lane E](../state/agent-lane-e.md)
- [Frontend Roadmap - Prototype To Operational UI](../proposals/frontend-roadmap-20260219.md)

### Phase 2: Contract and boundary hardening (Sprint 2026-04B)

Primary outcomes:

- enforce typed contracts and reduce runtime coupling risk
- establish execution boundary contracts required for scale work

References:

- [Sprint 2026-04B Board](../reviews/sprints/sprint-2026-04b/index.md)

### Phase 3: Scale and operability follow-through (Sprint 2026-04C)

Primary outcomes:

- introduce planner and admission improvements that depend on Phase 1 and 2
- close remaining high-risk findings from principal architecture reviews

References:

- [Sprint 2026-04C Board](../reviews/sprints/sprint-2026-04c/index.md)

## Prioritization Rules

- execute unblocked boards first unless a blocker board has equal severity
- no board can move to `in_progress` if listed `blocked_by` remains open
- no sprint closeout without green `pnpm verify:prepush`

## Diagram Set

- [Review Sprint Timeline 2026-04](diagrams/review-sprint-timeline-2026-04.md)
- [Review Sprint Dependency Graph 2026-04](diagrams/review-sprint-dependency-graph-2026-04.md)
- [Review Sprint Critical Path 2026-04](diagrams/review-sprint-critical-path-2026-04.md)
- [Review Sprint Capacity By Sprint 2026-04](diagrams/review-sprint-capacity-2026-04.md)
