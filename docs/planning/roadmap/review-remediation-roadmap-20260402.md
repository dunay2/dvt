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

References:

- [Sprint 2026-04A Board](../reviews/sprints/sprint-2026-04a/index.md)

### Phase 2: Contract and boundary hardening (Sprint 2026-04B)

Primary outcomes:

- enforce typed contracts and reduce runtime coupling risk
- establish execution boundary contracts required for scale work
- execute `AR-B1` write-boundary state-machine hardening with docs-first TDD
  (`AR-B1-A..E`)

References:

- [Sprint 2026-04B Board](../reviews/sprints/sprint-2026-04b/index.md)
- [AR-B1 quality hardening roadmap 2026-04-04](ar-b1-quality-hardening-roadmap-20260404.md)

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
