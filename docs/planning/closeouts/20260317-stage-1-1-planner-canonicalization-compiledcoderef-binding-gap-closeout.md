---
slice: 20260317-stage-1-1-planner-canonicalization-compiledcoderef-binding-gap
date: 2026-03-17
last_reviewed: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 compiledCodeRef Binding Gap Hardening

## Think-First Analysis

### Problem summary

The proposal correctly keeps `compiledCodeRef` outside hashed plan identity,
but it leaves the execution-binding verification mechanism too implicit. That
creates a traceability and safety gap around stale or incorrect artifact
bindings.

### Root cause

The document resolved placement and ownership, but it did not promote binding
verification into an explicit follow-on contract gap.

### Constraints and invariants

- `compiledCodeRef` must stay outside `planId` and `inputHashSha256`.
- The proposal must not imply a shipped verification contract if it does not
  exist yet.
- The missing mechanism must be visible enough that runtime rejection cannot be
  hand-waved away.

### Options considered

- Leave the current caveat as prose only.
- Add an explicit binding-integrity rule plus a follow-on gap.
- Move `compiledCodeRef` into hashed plan identity.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Add an explicit binding-integrity rule plus a follow-on gap. That preserves the
logical-plan/execution-binding split while making the missing verification
mechanism governable.

### Rejected alternatives

- Leaving it as prose keeps the traceability hole open.
- Moving `compiledCodeRef` into plan identity collapses two different concepts
  into one mechanism.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - harden the `compiledCodeRef` section with a stale-binding rejection rule
  - add an explicit follow-on gap for execution-binding verification
  - mirror that gap in the structured manifest
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-compiledcoderef-binding-gap-closeout.md`
- Expected outcome:
  - the proposal no longer treats execution-time binding checks as an implied
    mechanism
- Risks and mitigations:
  - Risk: over-expanding Stage 1.1 into a full binding contract
  - Mitigation: keep the added shape illustrative and declare the mechanism as
    a follow-on gap
- Out-of-scope items:
  - implementing the engine-side binding check
  - changing `planId` semantics
  - canonizing a full execution-binding schema
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                          | Change                                                                                               | Why                                                                              |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                   | Added explicit binding-integrity rule, illustrative verification shape, and a declared follow-on gap | Close the traceability hole around stale or incorrect compiled artifact bindings |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                    | Added execution-binding verification to the gap register                                             | Keep the structured governance index aligned with the human proposal             |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-compiledcoderef-binding-gap-closeout.md` | Recorded think-first analysis and evidence                                                           | Satisfy workflow requirements                                                    |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                             | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-compiledcoderef-binding-gap-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                   | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The missing binding-verification mechanism is now declared as an explicit gap.
