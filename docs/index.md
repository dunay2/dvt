# DVT Documentation

This is the canonical entry point for understanding, changing, operating, and
tracking DVT.

Use this home page to find the right document by intent instead of guessing by
folder name.

Do not start with engine internals by default. Start with concepts, current
status, and cross-cutting surfaces first; use engine docs when the task is
specifically about execution invariants or adapters.

## Start By Intent

- Understand the system and its language: [Concepts](./concepts/index.md)
- Read technical structure and invariants: [Architecture](./architecture/index.md),
  [Shared Package Architecture](./architecture/shared/index.md), and
  [Contracts](./contracts/index.md)
- See current implementation and delivery status:
  [System Delivery Status](./architecture/system-delivery-status.md)
- Follow active work: [GitHub Issues](https://github.com/dunay2/dvt/issues)
- Read durable product sequencing and gaps: [Roadmap Of Record](./planning/roadmap/index.md)
  and [Planning Gaps](./planning/gaps/index.md)
- Operate or troubleshoot the system: [Runbooks](./runbooks/index.md)
- Review unresolved debt and acceptance posture: [Risk Register](./risk-register/index.md)
- Review decisions and decision history: [ADRs](./adr/index.md)

## Core Entry Points

- [Concept Glossary](./concepts/glossary.md)
- [Domain Language](./concepts/domain-language.md)
- [System Map](./concepts/system-map.md)
- [Repository Map](./concepts/repository-map.md)
- [System Architecture](./architecture/system/index.md)
- [Subsystem Architecture](./architecture/system/subsystems/index.md)
- [Architecture Component Surfaces](./architecture/components/index.md)
- [Shared Package Architecture](./architecture/shared/index.md)
- [Frontend Architecture](./architecture/components/web/index.md)
- [Infra Architecture](./architecture/infra/index.md)
- [Engine Architecture](./architecture/components/engine/index.md)
- [Roadmap Of Record](./planning/roadmap/index.md)
- [GitHub MVP Issue Workflow](./planning/state/github-mvp-issue-workflow.md)
- [Planning Gaps](./planning/gaps/index.md)
- [Current Delivery Status](./architecture/system-delivery-status.md)
- [Planning Governance Inventory](./planning/status/governance-document-rule-inventory.md)
- [Evidence](./evidence/index.md)

## Reading Paths

### New contributor

1. [Concepts](./concepts/index.md)
2. [System Map](./concepts/system-map.md)
3. [Current Delivery Status](./architecture/system-delivery-status.md)
4. [Shared Package Architecture](./architecture/shared/index.md)
5. [Architecture Index](./architecture/index.md)

### Contributor changing behavior

1. [Contracts Index](./contracts/index.md)
2. [Current Delivery Status](./architecture/system-delivery-status.md)
3. [Shared Package Architecture](./architecture/shared/index.md)
4. [Architecture Index](./architecture/index.md)
5. [GitHub MVP Issue Workflow](./planning/state/github-mvp-issue-workflow.md)
6. [Risk Register](./risk-register/index.md)
7. [Evidence](./evidence/index.md)

### Operator or reviewer

1. [Runbooks](./runbooks/index.md)
2. [Current Delivery Status](./architecture/system-delivery-status.md)
3. [Risk Register](./risk-register/index.md)
4. [Planning Gaps](./planning/gaps/index.md)
5. [Planning Governance Inventory](./planning/status/governance-document-rule-inventory.md)

## Authority Notes

- GitHub Issues owns task identity and lifecycle.
- Planning DB owns architecture and mechanization.
- Code, contracts, tests, and CI on `main` own executable truth.
- [ADR-0061](./adr/ADR-0061-github-mvp-task-authority-and-planning-db-architecture-boundary.md)
  defines the planning/architecture authority boundary.
- The canonical roadmap entry point is
  [Roadmap Of Record](./planning/roadmap/index.md).
- [System Delivery Status](./architecture/system-delivery-status.md) remains the
  active status surface for current implementation truth.

## Governance and Contribution

- [Contribution Guide](./CONTRIBUTING.md)
- [Docs Structure Baseline](./DOCS_README.md)
- [Archive](./archive/index.md)
