---
title: Frontend Retirement Candidates
status: Active
owner: Web / Docs / Architecture
last_reviewed: 2026-09-19
planning_type: status
lane: E
task_id: E-MAND-FRONTEND-PROPOSAL-LINK-MIGRATION-1
---

# Frontend Retirement Candidates

These documents are candidates for review, not a work queue or a declaration
that their obligations are complete. Task ownership and acceptance remain in
GitHub Issues; architecture and feature mechanization remain in Planning DB.

Apply the [Historical Material Rule](../../../../status/governance-document-rule-inventory.md#historical-material-rule).
Reconcile current obligations and consumers before physically retiring an obsolete
document. History stays in Git.

| Source                                                                                                                          | Current handling                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [DVT+ workbench UX specification v0.4 draft](../dvt-workbench-ux-specification-v0-4-20260505-draft.md)                          | Historical UX input. Keep until references move to DVT workbench UX canon and implemented capability docs.           |
| [F-04 frontend data boundary hexagonal convergence draft](../f04-frontend-data-boundary-hexagonal-convergence-plan-20260403.md) | Historical draft for implemented F-04 work. Keep until hard-QA review references move to implemented technical docs. |
| [No left rail menu visual direction v2](../no-left-rail-menu-visual-direction-20260531-v2.md)                                   | Visual direction draft. Review current shell/navigation obligations and references before retirement.                |
| [TF-E2 Canvas empty authoring entrypoint design](../tf-e2-canvas-empty-authoring-entrypoint-design-20260422.md)                 | Historical story input still referenced by architecture/status docs.                                                 |
| [TF-E2-E selected-closure UX proof stories](../tf-e2-e-selected-closure-ux-proof-stories-20260423.md)                           | Historical story input for completed selected-closure proof.                                                         |
| [TF-E2 inspector authoring and lifecycle closure](../tf-e2-inspector-authoring-and-lifecycle-closure-plan-20260425.md)          | Historical story input now superseded by inspector authoring/component docs.                                         |
| [TF-E2-K playground complete-cycle stories](../tf-e2-k-playground-complete-cycle-stories-20260424.md)                           | Historical story input for completed host-cycle work.                                                                |
| [TF-E2 node and edge lifecycle closure](../tf-e2-node-and-edge-lifecycle-closure-plan-20260425.md)                              | Historical story input for completed node/edge lifecycle work.                                                       |
| [TF-E2 project playground and multi-canvas host](../tf-e2-project-playground-and-multi-canvas-host-plan-20260423.md)            | Historical story input still referenced by playground host docs.                                                     |

## Retirement Rule

A date, a closed task, or an entry in this table is not sufficient authority to
delete a document. Check its owner, current obligations and incoming references,
including feature-mechanization allowed surfaces, active component docs and
canonical status matrices. Reconcile any architectural relation through the
existing Planning DB authority; do not create task rows there.

Retire obsolete material and its live dependencies together. Do not move it into
a history folder or write a replacement preservation document. Use exact Git
revisions when provenance is required and run the existing documentation and
pre-push gates after changing paths.
