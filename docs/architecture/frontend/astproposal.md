---
title: AST Proposal Notes For DSL Authoring
status: Archived
owner: frontend-architecture
last_reviewed: 2026-03-31
planning_type: architecture
document_type: reference-note
---

# AST Proposal Notes For DSL Authoring

This file preserves an early design note for the DSL authoring screen. It is
kept as reference-only context and is not a canonical architecture baseline.

The active frontend baseline is defined by:

- `docs/architecture/frontend/index.md`
- `docs/architecture/frontend/frontend-ddd-target-architecture.md`
- `docs/architecture/frontend/frontend-architecture-execution-plan.md`

## Main ideas retained from the original note

- Prefer a graph-revealing DSL over an imperative mini-language.
- Keep a live graph preview panel while editing DSL blocks.
- Keep a bottom diagnostics area for problems, compiled plan, generated SQL,
  and logs.
- Support at least three authoring views: DSL, SQL, and split mode.
- Keep language and UX focused on dependency clarity and deterministic plan
  semantics.

## Historical recommendation summary

A readable declarative syntax with simple verbs is better than syntax that
hides dependency edges. The editor should behave as a graph authoring studio,
not as a generic text IDE.
