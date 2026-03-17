---
slice: 20260317-stage-1-1-planner-canonicalization-manifestref-hash-rule
date: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 manifestRef Hash Rule

## Think-First Analysis

### Problem summary

The proposal said accepted input is normalized before hashing, but it did not
explicitly say whether `manifestRef` hashing is based on the locator or the
resolved content.

### Root cause

The document separated artifact resolution from domain purity, but it did not
state the canonical hash input for the `manifestRef` path.

### Constraints and invariants

- `planId` and `inputHashSha256` must describe logical plan identity, not
  storage location identity.
- The domain core must remain free of network and storage IO.
- Integrity mismatches between `manifestRef.sha256` and resolved content must be
  rejected before plan build.

### Options considered

- Hash the reference tuple (`uri` + declared digest).
- Hash the resolved canonical manifest content.
- Leave the distinction unspecified.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Hash the resolved canonical manifest content. That preserves logical-plan
stability across storage relocation and keeps `planId` content-addressable.

### Rejected alternatives

- Hashing the reference tuple would make `planId` change when storage location
  changes but content does not.
- Leaving the distinction unspecified leaves a correctness hole in plan
  identity.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - define the canonical hash basis for `manifestRef`
  - state the required integrity rejection rule before the core hashes input
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-manifestref-hash-rule-closeout.md`
- Expected outcome:
  - `manifestRef` no longer leaves plan identity ambiguous
- Risks and mitigations:
  - Risk: imply the core performs artifact resolution
  - Mitigation: make the application-service responsibility explicit
- Out-of-scope items:
  - changing runtime code
  - changing manifest schema
  - adding a new contract artifact for resolver provenance
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
- Test coverage plan:
  - documentation lint only
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                    | Change                                                                                             | Why                                       |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                             | Added explicit content-addressable hash rule for `manifestRef` and integrity rejection requirement | Close the logical-plan identity ambiguity |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-manifestref-hash-rule-closeout.md` | Recorded think-first analysis and validation evidence                                              | Satisfy workflow requirements             |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                       | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-manifestref-hash-rule-closeout.md` | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The hash rule is now explicit rather than left to implementation inference.
