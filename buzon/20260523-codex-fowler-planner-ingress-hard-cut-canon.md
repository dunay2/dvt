---
title: Fowler analysis for planner ingress hard-cut canon
status: Draft
date: 2026-05-23
owners:
  - apps/api
  - packages/@dvt/planner
---

# Fowler Analysis: Planner Ingress Hard-Cut Canon

## Scope

This review covers `C-MAND-PLANNER-HARDCUT-CANON` and the protected runtime
planner ingress hard-cut: planner-backed start-run and plan preview now admit
canonical `graphSource` only, while legacy `manifestRef`, raw `manifest`, raw
`nodes`, and ignored `targetProfile` are rejected at the HTTP boundary.

## Mature-System Comparison

Mature systems keep compatibility translation outside the canonical runtime
boundary. The current implementation now matches that posture: the live
planner-backed runtime API admits a normalized graph source and rejects legacy
source aliases instead of repairing them.

## Improved Patterns

- Shared plan-source policy across preview and start-run.
- Fail-closed parsing for legacy source fields.
- Planner kernel remains generic; source-specific translation stays outside the
  runtime route.
- Public start-run contract models `graphSource`, not source-specific DBT
  aliases.

## Anti-Patterns Detected

- The completed hard-cut was encoded in tests and status docs, but lacked one
  local component page with public API, invariants, transitions, and consumers.
- Manifest artifact resolver remains in the codebase for non-runtime surfaces,
  so semantic guards must prevent accidental re-entry into protected runtime.

## Repetitions Fixed

- Hard-cut rules are consolidated in one component guide and one user-story
  page instead of living only in the mandatory proposal and route tests.
- A semantic architecture test validates the shared policy and local docs
  together.

## Drift Fixed

- The mandatory plan's completed posture is canonized in
  `docs/architecture/components/api/planner-ingress-hard-cut-component.md`.
- Stories now cover legacy rejection, preview/start-run convergence, and future
  DBT-native ingestion as a separate product boundary.

## Opportunities Left

- If manifest-native ingestion is still needed, design it as a separate
  command/query rail with an explicit translation output into `graphSource`.
- Add observability counters for invalid legacy planner source attempts if
  caller migration tracking becomes necessary.

## ADR Assessment

No new ADR is needed. The slice implements `ADR-0035` and the accepted hard-cut
proposal without changing the architecture decision.
