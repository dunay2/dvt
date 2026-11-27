---
id: R-20261127-INCOMPLETE-MODEL-DRAFT-EXECUTION
title: Retained Model configuration can appear operational
status: Mitigating
date: 2026-11-27
owners:
  - Web
  - API
severity: High
probability: Medium
---

# Retained Model configuration can appear operational

An unfinished Model may retain its previous semantic document for editing. A
whole-model run could use this document after the author disconnected Output
or left a pending card in the saved draft.

The governing [workspace draft contract](../contracts/planner/workspace-graph-draft-persistence-v1.md)
preserves the authoring state. The protected operational selection checks that
state before admitting a Preview Plan or Run. The same check controls the Web
projection. Proof covers retained semantics, layout-only metadata,
reopening and revision-bound persistence.

[Regression evidence](../evidence/ED-20261127-incomplete-model-draft-recovery.md).
