---
title: Architecture Documentation Reconciliation Canon Component
status: Active
owner: Architecture / Docs / Delivery
last_reviewed: 2026-05-23
component_type: governance
---

# Architecture Documentation Reconciliation Canon Component

> Owned concern: this component owns the classification and disposition of
> architecture documentation reconciliation work into canonical, status,
> supporting, historical, child-task, or superseded surfaces.

## Public API

- `RecordArchitectureDocumentationReconciliationCanon(input)`: records a
  reconciliation input with owner, disposition, evidence, and child-task
  linkage.
- `ClassifyArchitectureDocumentationDisposition(input)`: resolves a document or
  proposal into a truth level, owner, validation expectation, and downstream
  task posture.

## Invariants

- Planning DB is the execution queue; a mandatory proposal is not a queue by
  itself.
- Repository-wide architecture truth follows this order: reference
  architecture, system delivery status, canonical doc-code matrix, and concept
  system map.
- Drafts and snapshots must be marked supporting, historical, superseded, or
  child-task-owned before they guide implementation.
- Child remediation tasks remain separate from this parent canon task.
- Docs, domain page, component guide, user stories, canonical Fowler
  mechanization, and semantic test must name the same command/query rails.

## Transitions

```mermaid
stateDiagram-v2
  [*] --> InputFound
  InputFound --> Classified: ClassifyArchitectureDocumentationDisposition
  Classified --> Canonical
  Classified --> Status
  Classified --> Supporting
  Classified --> Historical
  Classified --> ChildTask
  Classified --> Superseded
  ChildTask --> Closed: Planning DB evidence accepted
  Canonical --> [*]
  Status --> [*]
  Supporting --> [*]
  Historical --> [*]
  Superseded --> [*]
  Closed --> [*]
```

## Consumers

- Architecture readers use the classification to know where principle, current
  implementation truth, supporting diagrams, and historical snapshots live.
- Documentation maintainers use the component before moving, rewriting, or
  archiving architecture documents.
- Planning stewards use it to keep child tasks linked to the parent
  reconciliation plan.
- Architecture reviewers use it to route review findings into task ownership
  instead of review prose.

## Command And Query Rail

| Rail                                                 | Type    | Owner                                                     | Surface                                   |
| ---------------------------------------------------- | ------- | --------------------------------------------------------- | ----------------------------------------- |
| `RecordArchitectureDocumentationReconciliationCanon` | command | Architecture documentation reconciliation canon aggregate | Planning DB and documentation domain page |
| `ClassifyArchitectureDocumentationDisposition`       | query   | Architecture documentation disposition read model         | Component guide and semantic CI test      |

## Semantic Fitness Function

`tools/ci/architecture-doc-reconciliation-canon.test.mjs` validates that the
canon plan, component guide, user stories, documentation-governance domain,
component index, and canonical Fowler mechanization tokens exist together and
name the same semantic rails.

It validates ownership and truth classification rather than only checking that
a barrel or index is thin.

## Component Grouping

```mermaid
flowchart TD
  Proposal["Architecture doc reconciliation proposal"]
  Canon["Architecture doc reconciliation canon"]
  Domain["Documentation governance domain"]
  Truth["Truth-level classifier"]
  Children["GD child task family"]
  Guides["Contributor guides"]
  Tests["Semantic CI guard"]

  Proposal --> Canon
  Canon --> Domain
  Canon --> Truth
  Canon --> Children
  Canon --> Guides
  Canon --> Tests
```

## Related Docs

- [Architecture Documentation Reconciliation Canon User Stories](architecture-doc-reconciliation-canon-component.md#section-architecture-doc-reconciliation-canon-user-stories)
- [Architecture Documentation Reconciliation Canon Plan 2026-05-23](../../../planning/proposals/mandatory/governance-and-docs/architecture-doc-reconciliation-canon-plan-20260523.md)
- [Architecture Documentation Reconciliation Mailbox Analysis](https://github.com/dunay2/dvt/blob/2df68680de46b9104282a58fd203a7eef551ca38/buzon/20260523-codex-fowler-architecture-doc-reconciliation-canon.md)

<a id="section-architecture-doc-reconciliation-canon-user-stories"></a>

## Architecture Documentation Reconciliation Canon User Stories

> Owned concern: these stories define how readers, maintainers, planners, and
> reviewers consume architecture documentation reconciliation without creating
> parallel queues or parallel truth sources.

### Stories

#### Architecture reader

As an Architecture reader, I want the repository to state which architecture
surface is canonical, status, supporting, or historical so that I do not treat a
snapshot or draft as current implementation truth.

Acceptance:

- The documentation-governance domain links the canon plan.
- The canon component names the truth-order invariant.
- Historical or child-task-owned surfaces are not presented as equal peers to
  canonical architecture.

#### Documentation maintainer

As a Documentation maintainer, I want a classification rail before moving or
rewriting architecture docs so that link fixes, archive moves, and index updates
stay aligned with governance.

Acceptance:

- `ClassifyArchitectureDocumentationDisposition` is the query rail for truth
  classification.
- Structural changes still require `pnpm docs:sync`.
- Generated status remains checked before closeout.

#### Planning steward

As a Planning steward, I want the parent reconciliation proposal to point at
child tasks so that work is planned in Planning DB rather than inferred from
proposal prose.

Acceptance:

- `GD-MAND-ARCH-DOC-RECON` owns the canonization.
- `GD-DOC-DISPOSITION-CANON`, `GD-MAND-AUTOGEN-PAGES`,
  `GD-MAND-DOC-USABILITY`, `GD-MAND-STARTUP-CARD`,
  `GD-REV-ARCH-GOV-CANON`, and `GD-REV-PLANNING-CANON` remain child work.
- The parent plan does not claim child work is already completed.

#### Architecture reviewer

As an Architecture reviewer, I want review findings to become explicit
dispositions so that an active review cannot act as a hidden backlog.

Acceptance:

- Review findings are recorded through
  `RecordArchitectureDocumentationReconciliationCanon`.
- Findings without a concrete owner become GitHub issues.
- Findings already absorbed by docs are reference evidence, not duplicate work.

> Acceptance scope status: Active. Owner: Architecture / Docs / Delivery.
