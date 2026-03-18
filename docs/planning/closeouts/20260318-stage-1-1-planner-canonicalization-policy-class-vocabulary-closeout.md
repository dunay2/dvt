---
slice: 20260318-stage-1-1-planner-canonicalization-policy-class-vocabulary
date: 2026-03-18
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Policy Class Vocabulary

## Think-First Analysis

### Problem summary

Section 13 already declared that retry, timeout, and concurrency classes must
be canonical and runtime-neutral, but it still lacked a minimum normative
vocabulary shape.

### Root cause

The proposal fixed the architectural stance before spelling out the minimum
contract form needed to keep adapters from treating policy classes as free text.

### Constraints and invariants

- policy classes must be runtime-neutral and canonized in shared contracts
- adapters must not reinterpret canonical class meaning locally
- Stage 1.1 must not pretend the final full vocabulary inventory already exists

### Options considered

- Keep the section at conceptual stance only.
- Let adapters define free-form strings and mappings.
- Add a minimum contract-equivalent shape plus explicit adapter mapping rule.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Add a minimum runtime-neutral policy vocabulary shape and require an explicit
PlannerPolicy-to-runtime mapping table plus structured rejection when unsupported.

### Rejected alternatives

- Concept-only wording leaves policy/enforcement split too weak.
- Adapter-local free strings would reintroduce semantic drift across runtimes.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - define the minimum normative vocabulary shape for retry, timeout, and
    concurrency classes
  - require explicit adapter mapping and unsupported-policy rejection
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-policy-class-vocabulary-closeout.md`
- Expected outcome:
  - the policy/enforcement split no longer depends on free-text interpretation
- Risks and mitigations:
  - Risk: overstate the exact final contract spelling
  - Mitigation: define the minimum equivalent shape and keep the final contract
    artifact as follow-on work
- Out-of-scope items:
  - implementing the vocabulary in code
  - defining all future policy variants
  - changing adapter runtime behavior
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                      | Change                                                                                                 | Why                                                          |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                               | Added minimum canonical policy vocabulary shape and adapter mapping rule in section 13                 | Prevent policy classes from remaining free-text rhetoric     |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                | Tightened `G-01.7` required artifacts to require shared vocabulary plus adapter mapping/rejection rule | Keep the structured artifact aligned with the human proposal |
| `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-policy-class-vocabulary-closeout.md` | Recorded analysis and evidence                                                                         | Satisfy workflow requirements                                |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `AGENTS.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                         | Result |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-policy-class-vocabulary-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                               | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The section now requires minimum shared vocabulary plus adapter mapping rather
  than free-text policy interpretation.
