---
title: Documentation information architecture current vs target
status: Active
owner: Architecture / Docs
last_reviewed: 2026-04-07
planning_type: status
---

# Documentation information architecture current vs target

## Purpose

Specify the documentation model that exists after `DOC-ARCH-01`, show the
target operating model required by `GOV-S2`, and make the active documentation
surface auditable against real code and planning sources.

## Governing sources

- [Governance document rule inventory](governance-document-rule-inventory.md)
- [Architecture surface inventory 2026-04-02](../../architecture/architecture-surface-inventory-20260402.md)
- [AI work protocol](../../guides/ai-work-protocol.md)
- [Planning control tower](../state/planning-control-tower.md)
- [Documentation maintenance guide](../../guides/documentation-maintenance-guide-20260407.md)

## Current-state model

```mermaid
flowchart TB
  Repo["Repository truth: apps/, packages/, workflows/, scripts/"]

  subgraph Active["Active docs surface"]
    Canonical["Canonical specs and entrypoints
    docs/architecture
    docs/contracts
    docs/concepts"]
    Planning["Planning truth
    docs/planning/status
    docs/planning/reviews
    docs/planning/state/*.yaml"]
    Ops["Operational docs
    docs/guides
    docs/runbooks"]
    Evidence["Evidence and risk
    docs/evidence
    docs/risk-register"]
  end

  subgraph Supporting["Supporting maps"]
    ComponentMaps["docs/architecture/components/*"]
    Matrices["canonical-doc-code-matrix.md
    repository-map.md
    system-delivery-status.md"]
  end

  subgraph Historical["Historical and archived"]
    Archive["docs/archive/**"]
    PlanningArchive["docs/planning/archive/**"]
    HistoricalNotes["historical snapshots and superseded proposals"]
  end

  Repo --> Canonical
  Repo --> Planning
  Repo --> Ops
  Repo --> Evidence
  Canonical --> ComponentMaps
  Planning --> Matrices
  ComponentMaps --> Archive
  Matrices --> Archive
  Archive -. reference only .-> Active
  PlanningArchive -. reference only .-> Planning
```

## Current code-alignment facts

| Area                        | Current active entrypoint                                                | Code-alignment action in this slice                                                                    |
| --------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| API runtime surface         | `docs/architecture/components/api/api-current-to-target-architecture.md` | promoted as the canonical repo-map and infra entrypoint instead of the old `G8` gap spec               |
| Engine component map        | `docs/architecture/components/engine/*`                                  | rebuilt as summary-only navigation to canonical engine docs; removed dead local links                  |
| Planner component map       | `docs/architecture/components/planner/*`                                 | rewritten around `PlannerFacade`, `PlannerInputEnvelopeV1`, and `ExecutionPlan.v1.ts`                  |
| Archived architecture packs | `docs/archive/architecture/components/*`                                 | stale component packs moved out of the active tree                                                     |
| Active planning reviews     | `docs/planning/reviews/*`                                                | repaired relative links after archive moves and proposal reclassification                              |
| Docs validation             | `tools/docs/check-links.ts`                                              | checker now skips historical sources by taxonomy instead of surfacing archive noise as active failures |

## Target-state model

```mermaid
flowchart LR
  Change["Code, docs, or planning change"] --> Classify{"What changed?"}

  Classify -->|runtime or contract behavior| CanonicalUpdate["Update canonical spec + supporting maps"]
  Classify -->|planning posture| PlanningUpdate["Update lane YAML + status/review/closeout"]
  Classify -->|historical or superseded material| ArchiveMove["Move to archive and add archive index route"]
  Classify -->|docs structure| Sync["Run docs:sync and refresh indexes"]

  CanonicalUpdate --> Matrix["Update canonical doc code matrix / repository map when routes change"]
  PlanningUpdate --> Workboard["Regenerate workboard views from lane YAML"]
  ArchiveMove --> Pointer["Keep only minimal active pointers from current docs"]
  Sync --> Validate["Run docs checks and prepush baseline"]
  Matrix --> Validate
  Workboard --> Validate
  Pointer --> Validate

  Validate --> Ready["Ready: active docs route to current code and historical docs stay reference-only"]
```

## Operational specification

- Active component trees are summaries only. They must point to canonical docs
  instead of reintroducing local structure packs.
- Historical documents may remain link targets, but they are not maintained as
  active source files and should not dominate link-check results.
- When an active doc refers to code, the path must match the real shipped file
  and the real contract version.
- Archive moves require an archive index or active pointer so readers can still
  discover historical context deliberately.
- Planning execution truth lives in `docs/planning/state/agent-lane-*.yaml`;
  generated workboard views are derived artifacts.
- Docs validation must prove the active tree, not overwhelm contributors with
  archive-only drift.

## Remaining follow-up space

- Frontmatter normalization and `last_reviewed` coverage across the historical
  corpus remain broader `GOV-S2` work.
- A few historical narrative docs still mention superseded names for context;
  they are acceptable only when the file is explicitly historical or archived.
