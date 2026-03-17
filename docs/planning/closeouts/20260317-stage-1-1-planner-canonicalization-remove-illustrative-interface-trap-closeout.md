---
slice: 20260317-stage-1-1-planner-canonicalization-remove-illustrative-interface-trap
date: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Remove Illustrative Interface Trap

## Think-First Analysis

### Problem summary

The planning proposal included non-canonical TypeScript interfaces for missing
boundaries. Even with disclaimers, those examples acted as the most detailed
specification in the repository.

### Root cause

The document tried to make missing contracts concrete by expressing them as
implementation-shaped interfaces before a canonical contract artifact existed.

### Constraints and invariants

- The planning proposal must not become the most complete implementation-facing
  source for a non-canonical boundary.
- The document still needs to state what minimum contract content is required.
- The structured manifest must stay aligned with the human proposal.

### Options considered

- Keep the interface examples and add stronger disclaimers.
- Remove interface-shaped examples and replace them with minimum contract
  content requirements.
- Canonize the interfaces immediately in contracts.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Remove interface-shaped examples and replace them with required contract
content. That removes the pseudo-spec trap without pretending the canonical
contract already exists.

### Rejected alternatives

- Stronger disclaimers would still leave the most detailed specification in a
  non-canonical doc.
- Immediate canonization would expand Stage 1.1 into a contract-delivery slice.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - remove non-canonical interface-shaped examples from the planning doc
  - replace them with minimum contract-content requirements
  - align the structured manifest illustrative-shape registry
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-remove-illustrative-interface-trap-closeout.md`
- Expected outcome:
  - the planning doc no longer acts as a pseudo-spec for missing interfaces
- Risks and mitigations:
  - Risk: make the missing boundary too vague again
  - Mitigation: keep explicit required-content lists and follow-on artifact
    requirements
- Out-of-scope items:
  - canonizing the resolver contract
  - canonizing the executability validator contract
  - changing runtime code
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                                 | Change                                                                                                | Why                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                          | Removed non-canonical interface-shaped examples and replaced them with minimum contract-content lists | Stop the planning doc from acting as a pseudo-spec for missing boundaries |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                           | Removed illustrative interface entries that no longer belong in the planning doc                      | Keep the structured artifact aligned with the human proposal              |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-remove-illustrative-interface-trap-closeout.md` | Recorded think-first analysis and evidence                                                            | Satisfy workflow requirements                                             |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                                    | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-remove-illustrative-interface-trap-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                          | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The planning doc no longer contains non-canonical interfaces as de facto
  implementation targets.
