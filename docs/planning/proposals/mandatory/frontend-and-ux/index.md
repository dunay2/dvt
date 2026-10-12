---
title: Frontend And UX Mandatory Proposal Navigation
status: Active
owner: Web / Product / Architecture
last_reviewed: 2026-09-30
planning_type: status
task_id: E-PROP-DISP-1
---

# Frontend And UX Mandatory Proposal Navigation

## Purpose

This page is the current navigation boundary for frontend proposal material.

Historical, implemented, closed and superseded proposal documents are not kept
as a parallel architecture or delivery history. Git preserves that history.
Current implementation truth lives in code, contracts, tests and CI; task
lifecycle lives in GitHub Issues; governed architecture and mechanization
authority must be read from the current repository and Planning DB when the
operated read rail is available.

The 2026-09-30 retirement removes the old implemented-capability,
implemented-technical and stale pending-work catalogues. Those catalogues were
useful during migration, but retaining them permanently made historical plans
look operational.

## Retention Rule

Keep a proposal file only while it is a current input to unresolved accepted
work or an explicitly current design decision.

Retire the physical proposal when its work is implemented, closed, superseded,
absorbed or otherwise historical, after reconciling live consumers. Do not move
retired material into another history folder. Use Git history for provenance.

A filename, old priority, old roadmap statement or historical feature-
mechanization block is never sufficient current authority by itself.

## Current Navigation

- Recent active proposal inputs remain in their domain folders.
- GitHub Issues own execution status, blockers and acceptance.
- Architecture docs and ADRs own durable architectural decisions.
- Evidence documents own accepted delivery evidence.
- Risk records own surviving risk posture.
- Planning DB remains the governed read model for registered architecture and
  mechanization when the operated read rail is available.

## Retirement Safety

Before deleting any future proposal:

1. verify that it is not the current owner of unresolved work;
2. migrate or remove exact live links and required-path guards;
3. keep only commit-pinned Git provenance where historical evidence is needed;
4. do not recreate a local backlog or history catalogue;
5. run the repository documentation, governance, architecture and pre-push
   gates on the exact candidate.

History belongs in Git, not in the active proposal tree.
