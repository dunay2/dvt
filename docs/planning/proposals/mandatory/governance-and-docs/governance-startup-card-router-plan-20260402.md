---
title: Governance Startup Card Router Plan
status: Active
owner: Docs / Architecture / Delivery
last_reviewed: 2026-04-02
planning_type: proposal
---

# Governance Startup Card Router Plan

## Goal

Keep the mandatory governance-first startup rule, but reduce the orientation
cost for bounded tasks by turning the inventory into a real router before the
deep reference catalog.

## Problem

The repository already has the right mandatory startup document, but the
opening read path is too expensive for small or local slices:

1. the inventory mixes routing, deep reference, and enforcement in one read;
2. contributors pay the same startup cost for a docs tweak and a cross-package
   contract change;
3. local notes drift because the repo does not provide a fast enough canonical
   startup path.

## Target Operating Model

The startup path is intentionally layered:

| Layer     | Purpose                                  | Canonical surface                                    | Target time                     |
| --------- | ---------------------------------------- | ---------------------------------------------------- | ------------------------------- |
| `Layer 1` | classify the task and choose the route   | `governance-document-rule-inventory.md` startup card | `20-30s`                        |
| `Layer 2` | confirm procedure and planning rules     | `docs/guides/ai-work-protocol.md`                    | `20-30s`                        |
| `Layer 3` | deep normative and enforcement reference | remaining governance inventory sections              | only when the route requires it |

## Router Decisions

The startup card must classify every task into one of these routes:

| Route           | Open immediately                                                                        | Deep read required when                                                          | Minimum closeout baseline                                       |
| --------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `code`          | inventory startup card, `ai-work-protocol`, relevant ADR/contract, current status       | changing a public boundary, changing multiple packages, or touching CI/contracts | touched-package validation + `pnpm verify:prepush`              |
| `docs`          | inventory startup card, `docs/index.md` or relevant docs entrypoint, `ai-work-protocol` | changing governance, contracts, roadmap classification, or generated docs rules  | `pnpm docs:sync` when structure changes + `pnpm verify:prepush` |
| `planning`      | inventory startup card, `planning-control-tower`, `ai-work-protocol`                    | changing blockers, sequencing, lane ownership, or canonical planning posture     | `pnpm docs:workboard:generate` + `pnpm verify:prepush`          |
| `contracts`     | inventory startup card, `docs/contracts/index.md`, relevant ADRs, versioning policy     | always                                                                           | contract/package validation + `pnpm verify:prepush`             |
| `ci`            | inventory startup card, `package.json`, relevant workflows, testing/CI guide            | always                                                                           | relevant CI/tool validation + `pnpm verify:prepush`             |
| `cross-cutting` | all relevant route surfaces above                                                       | always                                                                           | per-slice validation + `pnpm verify:prepush`                    |

## Implementation

1. Add a `Quick Start / Startup Card` section near the top of
   `docs/planning/status/governance-document-rule-inventory.md`.
2. Add a short `Startup Router Rule` section to
   `docs/guides/ai-work-protocol.md` so the procedure points back to the
   inventory router.
3. Keep the existing inventory body as the deep reference catalog; do not split
   it into a second active document.
4. Do not create parallel notes for the same startup problem outside these
   canonical surfaces.

## Acceptance

This slice is complete when all of the following are true:

1. the inventory still remains the mandatory entry document;
2. the inventory opens with a short startup card instead of starting directly
   with the full catalog;
3. the AI work protocol explicitly tells contributors to consume that startup
   card first;
4. no second active governance inventory or startup note is introduced.

## Validation

```bash
pnpm docs:sync
pnpm verify:prepush
```

## References

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
