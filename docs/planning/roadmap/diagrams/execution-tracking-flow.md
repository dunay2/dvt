---
title: MVP Execution Tracking Flow
status: Active
owner: Product / Architecture / Docs
last_reviewed: 2026-07-31
planning_type: reference
---

# MVP Execution Tracking Flow

Single flow for converting planning inputs into GitHub Issues, reviewed PRs,
and architecture evidence without a parallel local backlog.

```mermaid
flowchart LR
  REV[Reviews]
  PROP[Proposals]
  STATUS[Status and roadmap]
  TRIAGE[MVP triage]
  ISSUE[GitHub Issue]
  PR[Pull request]
  EVIDENCE[Validation evidence]
  DB[Planning DB architecture state]

  REV --> TRIAGE
  PROP --> TRIAGE
  STATUS --> TRIAGE
  TRIAGE --> ISSUE
  ISSUE --> PR
  PR --> EVIDENCE
  EVIDENCE --> ISSUE
  PR -->|architecture changed| DB
```

## Canonical Links

- [GitHub MVP Issue Workflow](../../state/github-mvp-issue-workflow.md)
- [Planning Control Tower](../../state/planning-control-tower.md)
- [Roadmap By Domain](../roadmap-by-domain.md)
- [Roadmap Of Record](../index.md)
