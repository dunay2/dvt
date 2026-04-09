---
slice: mw-a4-step-kind-extension-guide
date: 2026-04-06
author: AI (GPT-5)
last_reviewed: 2026-04-06
status: Accepted
---

# Closeout: MW-A4 StepKind Extension Guide

## Think-First Analysis

- Problem summary:
  Step-kind extensibility had implementation pieces but lacked one governed
  contributor protocol.
- Root cause:
  Knowledge to add new kinds was spread across contracts/planner/API/adapter
  tests and runtime code.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`; lane task definition in
  `docs/planning/state/agent-lane-a.yaml`.
- Selected option:
  Publish one canonical guide in `docs/guides/` that maps required steps,
  tests, and validation gates.

## Pre-Implementation Brief

- Mode:
  Full (documentation + planning surfaces)
- Scope:
  Deliver `MW-A4` by adding the governed “How to add a new StepKind” guide and
  closing planning state.
- Touched paths:
  `docs/guides/how-to-add-step-kind-20260406.md`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260406-mw-a4-step-kind-extension-guide-closeout.md`.

## Implementation

- Added canonical guide with:
  - protocol steps from contract registration to adapter/runtime wiring
  - required test matrix (positive + negative paths)
  - required validation command baseline
  - explicit anti-pattern rules
- Updated Lane A task state for `MW-A4` to `done`.

## Validation Evidence

- `pnpm docs:workboard:generate`
- `pnpm docs:sync`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No placeholder content or TODO markers were introduced.
- No checks were bypassed.
