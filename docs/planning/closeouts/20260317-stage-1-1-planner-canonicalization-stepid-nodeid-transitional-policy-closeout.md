---
slice: 20260317-stage-1-1-planner-canonicalization-stepid-nodeid-transitional-policy
date: 2026-03-17
last_reviewed: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 stepId to nodeId Transitional Policy

## Think-First Analysis

### Problem summary

The `stepId === nodeId` section was framed as a decision, but it only said what
must not be frozen. It did not clearly state the current operating rule, the
migration trigger, or the minimum verification expectation.

### Root cause

The document captured architectural caution without converting it into a
governable transitional policy.

### Constraints and invariants

- The public contract must not freeze `stepId === nodeId` as a permanent
  invariant.
- The current implementation still needs a documented operating rule.
- The transition trigger must be tied to concrete planner features, not vague
  future possibility.

### Options considered

- Leave the section as a warning only.
- Recast it as a transitional policy with current-state rule, trigger, and test
  expectation.
- Remove the section from the decision index entirely.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Recast it as a transitional policy. That keeps the architectural intent while
making the current behavior and future migration trigger explicit.

### Rejected alternatives

- Leaving it as a warning preserves the ambiguity.
- Removing it entirely would hide a real contract-evolution concern.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - convert the `stepId === nodeId` note into a transitional decision
  - add current-state rule, trigger, and minimum test expectation
  - align the structured manifest decision title and status
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-stepid-nodeid-transitional-policy-closeout.md`
- Expected outcome:
  - the section becomes a governed transitional rule rather than a cautionary
    note
- Risks and mitigations:
  - Risk: overcommitting to a specific future identifier model
  - Mitigation: define trigger conditions and contract constraints without
    prematurely freezing the future shape
- Out-of-scope items:
  - changing planner runtime code
  - introducing new identifier fields in contracts
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                                | Change                                                                                                                               | Why                                                          |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                         | Recast `stepId === nodeId` as a transitional policy with current-state rule, migration trigger, and minimum verification expectation | Turn a non-decision into a governed transition rule          |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                          | Updated the decision title and policy status for the transitional identifier rule                                                    | Keep the structured artifact aligned with the human proposal |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-stepid-nodeid-transitional-policy-closeout.md` | Recorded think-first analysis and evidence                                                                                           | Satisfy workflow requirements                                |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                                   | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-stepid-nodeid-transitional-policy-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                         | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The section now defines a governed transitional rule instead of leaving the
  identifier relationship as an implied future concern.
