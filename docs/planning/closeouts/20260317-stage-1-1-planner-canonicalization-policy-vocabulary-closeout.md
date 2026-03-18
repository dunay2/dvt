---
slice: 20260317-stage-1-1-planner-canonicalization-policy-vocabulary
date: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Declarative Policy Vocabulary

## Think-First Analysis

### Problem summary

The proposal split planner policy from runtime enforcement, but it did not say
whether retry, timeout, and concurrency classes are canonical semantics or
adapter-local strings.

### Root cause

The document fixed the boundary between policy and enforcement but left the
semantic status of policy classes themselves underdefined.

### Constraints and invariants

- Planner policy must stay runtime-neutral.
- Runtimes must not reinterpret one policy class into different semantics
  without explicit rejection or degradation.
- The architectural stance should be fixed now, even if the full vocabulary
  artifact remains follow-on work.

### Options considered

- Leave policy classes as runtime-local strings.
- Define policy classes as canonical runtime-neutral vocabulary references.
- Replace policy classes with provider parameters in planner output.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Define policy classes as canonical runtime-neutral vocabulary references. That
preserves planner authority over semantics while keeping provider-specific knob
mapping in the runtime.

### Rejected alternatives

- Runtime-local strings would let adapters reinterpret the same plan
  differently.
- Provider parameters in planner output would collapse the planner-engine
  boundary.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - define the semantic status of declarative policy classes
  - add rejection or degradation rule for runtimes that cannot preserve class
    semantics
  - declare the remaining follow-on artifact for the policy vocabulary
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-policy-vocabulary-closeout.md`
- Expected outcome:
  - the proposal no longer leaves policy classes semantically undefined
- Risks and mitigations:
  - Risk: imply the full vocabulary inventory is already canonized
  - Mitigation: separate the architectural stance from the still-pending
    vocabulary artifact
- Out-of-scope items:
  - publishing the final enum set
  - implementing runtime mappings
  - changing planner runtime code
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                | Change                                                                                                                                          | Why                                                          |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                         | Added explicit rule that declarative policy classes belong to a canonical runtime-neutral vocabulary and cannot be adapter-local opaque strings | Close the semantic hole in the planner/runtime split         |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                          | Added a follow-on gap for the canonical policy vocabulary artifact                                                                              | Keep the structured artifact aligned with the human proposal |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-policy-vocabulary-closeout.md` | Recorded think-first analysis and evidence                                                                                                      | Satisfy workflow requirements                                |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                   | Result |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-policy-vocabulary-closeout.md` | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The document now defines policy-class semantics as a canonical vocabulary
  concern rather than leaving them as implied adapter behavior.
