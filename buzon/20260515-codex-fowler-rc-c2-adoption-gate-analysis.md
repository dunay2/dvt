---
title: Fowler analysis for RC-C2 adoption gate hardening
task_id: RC-C2
date: 2026-05-15
status: Active
---

# Fowler Analysis For RC-C2 Adoption Gate Hardening

## Context

`RC-C2` already shipped the shared preflight tooling, log-first CI triage guide,
and YAML adoption log. The remaining acceptance gate is behavioral adoption:
three consecutive Lane C PR cycles must show the workflow reduced interactive
rounds by at least 20% while using `hygiene.ps1`, running `verify:prepush`
before push, and avoiding push-time format or lint surprises.

The current gap was not the absence of a process. It was that task closure still
depended on narrative inspection of `docs/planning/status/ai-efficiency-adoption-log.yaml`.

## Fowler View

- **Replace implicit contract with explicit assertion**: the adoption gate is now
  executable through `scripts/check-ai-efficiency-adoption.cjs`.
- **Separate domain decision from reporting**: the script owns qualification
  semantics; the status document reports the result.
- **Introduce a small policy object**: the YAML log records closure rules beside
  the baseline and target values so the status surface does not invent local
  criteria.
- **Preserve a strangler-friendly path**: historical JSONL cycle evidence
  remains untouched, while the current YAML log becomes the closure authority.

## Antipatterns Avoided

- **Speculative completion**: recent PR bodies include validation and green CI,
  but they do not all record `hygiene.ps1` usage or log-first triage posture.
  They cannot be counted as qualifying cycles without explicit evidence.
- **Duplicated process semantics**: the checker centralizes the calculation
  instead of spreading the same threshold math across docs and planning notes.
- **Status drift**: `RC-C2` remains open until the command reports readiness.

## Current Result

```text
0/3 qualifying consecutive cycles; RC-C2 must remain open.
```

## Future Teaching

When a task has adoption-based acceptance, ship the measurement command before
waiting for adoption. The command should fail closed while the task remains
open, so future agents can add evidence without renegotiating the rule.
