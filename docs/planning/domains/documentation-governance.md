---
title: Domain - Documentation Governance
status: Review
owner: Docs / Architecture
last_reviewed: 2026-04-08
planning_type: reference
---

# Domain - Documentation Governance

Planning surfaces for documentation structure, governance checks, and quality
gates.

## Canonical Sources

- [Governance Document and Rule Inventory](../status/governance-document-rule-inventory.md)
- [Roadmap Of Record](../roadmap/index.md)
- [Planning Control Tower](../state/planning-control-tower.md)

## Active Proposal Set

- [Architecture Documentation Reconciliation Plan 2026-04-02](../proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-plan-20260402.md)
- [Architecture Documentation Reconciliation Canon Plan 2026-05-23](../proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-canon-plan-20260523.md)
- [Generated Planning Surfaces Extraction Plan 2026-04-03](../proposals/mandatory/governance-and-docs/generated-planning-surfaces-extraction-plan-20260403.md)
- [Doc-driven framework and tooling plan 2026-04-04](../proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md)
- [CI Delivery Governance Consolidated Action Plan](../proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md)

## Relevant Reviews And Closeouts

- [20260316 Docs Governance Tooling Closeout](../closeouts/20260316-docs-governance-tooling-closeout.md)
- [20260320 Planning Archive Sweep Closeout](../closeouts/20260320-planning-archive-sweep-closeout.md)

## Operational Check References

- [Testing and CI Capabilities](../../guides/testing-and-ci-capabilities.md)
- [Documentation maintenance guide](../../guides/documentation-maintenance-guide-20260407.md)
- [Contributing](../../CONTRIBUTING.md)
- `pnpm docs:planning:last-reviewed:backfill`

## Diagram Sources

- [Documentation Governance Architecture Delta](../roadmap/diagrams/documentation-governance-architecture-delta.md)
- [Planning Domain Map](../roadmap/diagrams/planning-domain-map.md)

## 2026-05-23 Architecture Documentation Reconciliation Canon

`GD-MAND-ARCH-DOC-RECON` owns canonization of the 2026-04-02 architecture
documentation reconciliation proposal.

No architecture documentation reconciliation proposal remains an orphan execution queue after this disposition.

The parent canon task records the classification rail and child-task routing.
Concrete remediation remains in the child task family:

- `GD-DOC-DISPOSITION-CANON`
- `GD-MAND-AUTOGEN-PAGES`
- `GD-MAND-DOC-USABILITY`
- `GD-MAND-STARTUP-CARD`
- `GD-REV-ARCH-GOV-CANON`
- `GD-REV-PLANNING-CANON`

## 2026-05-24 Docs Disposition Canon

`GD-DOC-DISPOSITION-CANON` owns closure of active documentation disposition
findings for Draft, Superseded, and task-like identifier rows.

[Docs Disposition Canon Plan 2026-05-24](../proposals/mandatory/governance-and-docs/docs-disposition-canon-plan-20260524.md)
records the current DB-first closure: No Draft, Superseded, or task-like identifier finding remains an open parallel documentation backlog.
Future findings must reopen through the Planning DB `docs-disposition` rail
rather than living only in status prose.
