---
id: R-20260330-WS5-ENGINE-TEST-FIXTURE-DRIFT
title: WS5 engine fixture helpers can drift from engine constructor contract
status: Open
date: 2026-03-30
owners:
  - '@dvt/engine'
severity: Low
probability: Medium
---

## Context

WS5 refactoring centralizes engine test setup through shared helper builders in
`WorkflowEngine.helpers.ts`.

## Risk

If helper defaults diverge from `WorkflowEngine` constructor expectations,
multiple tests can pass with misleading setup assumptions and hide contract
mismatches.

## Mitigation

1. Keep core intent-log and engine tests exercising helper-backed construction
   through real `startRun` paths.
2. Run package-level tests and pre-push verification on every helper edit.
3. Close this risk after repeated green cycles across future WS5 follow-up
   slices.
