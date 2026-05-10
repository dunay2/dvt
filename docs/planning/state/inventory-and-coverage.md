---
title: Planning Inventory And Coverage
status: Review
owner: Product / Architecture / Docs
last_reviewed: 2026-03-22
planning_type: status
---

# Planning Inventory And Coverage

Inventory snapshot to make planning sprawl visible and navigable.

## Surface Counts

| Surface         | Markdown Files |
| --------------- | -------------- |
| Proposals       | 23             |
| Reviews         | 17             |
| Closeouts       | 89             |
| Gaps            | 18             |
| Status          | 9              |
| Roadmap         | 2              |
| Execution Model | 6              |

## Coverage Notes

- Closeouts are the largest surface. Use [Closeouts Index](../closeouts/index.md)
  plus domain pages to avoid browsing by filename alone.
- Proposals and gaps hold active sequencing; status artifacts hold current truth.
- Reviews are concentrated and should be consumed through domain mapping.
- Active execution tracking should be centralized in the planning DB command
  and query rails described by [Planning Control Tower](./planning-control-tower.md)
  to avoid dispersed follow-up. Lane YAML is a bootstrap/export snapshot.

## Current Domain Hubs

- [Planning Domains](../domains/index.md)
- [Execution Runtime](../domains/execution-runtime.md)
- [API and Admission](../domains/api-and-admission.md)
- [Planner and Contracts](../domains/planner-and-contracts.md)
- [Event Lifecycle and Retention](../domains/event-lifecycle-and-retention.md)
- [Documentation Governance](../domains/documentation-governance.md)

## Roadmap And Diagram Hubs

- [Roadmap Of Record](../roadmap/index.md)
- [Roadmap by Domain](../roadmap/roadmap-by-domain.md)
- [Planning Roadmap Diagrams](../roadmap/diagrams/index.md)
- [Planning Control Tower](./planning-control-tower.md)
