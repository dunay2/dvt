---
slice: 20260317-stage-1-1-planner-canonicalization-binding-storage-contract
date: 2026-03-17
last_reviewed: 2026-03-17
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Binding Storage Contract

## Think-First Analysis

### Problem summary

The proposal distinguished logical plan identity from execution binding, but it
did not say what stored form carries `compiledCodeRef` binding material.

### Root cause

Identity semantics and verification semantics were clarified before persistence
semantics, which left the storage authority for enriched bindings ambiguous.

### Constraints and invariants

- `planId` must continue to identify the logical plan core, not the binding.
- The repository must not imply that both core plan and enriched plan are
  independent canonical plan forms.
- Execution binding integrity requires a storage contract for the binding data.

### Options considered

- Persist only the enriched plan.
- Persist only the core plan and re-enrich on each execution.
- Persist the core plan as canonical and persist binding data separately as an
  execution-binding record.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Persist the core plan as canonical and persist binding data separately as
execution-binding material. That preserves one canonical plan identity while
still giving the engine stable binding data to verify.

### Rejected alternatives

- Persisting only the enriched plan would store a plan shape that differs from
  the hashed identity.
- Re-enriching every time without stored binding data would make binding
  stability depend on repeated recomputation.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - define the persistence stance for enriched bindings
  - declare the missing execution-binding storage contract as an explicit gap
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-binding-storage-contract-closeout.md`
- Expected outcome:
  - the proposal no longer leaves it ambiguous what is persisted when
    `compiledCodeRef` enrichment exists
- Risks and mitigations:
  - Risk: imply a full storage schema that does not yet exist
  - Mitigation: define the persistence stance and declare the follow-on
    contract, not a full schema
- Out-of-scope items:
  - implementing binding persistence
  - defining the final storage schema
  - changing engine/runtime code
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                       | Change                                                                                                             | Why                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                | Added explicit persistence rule for core plan vs execution binding and declared the follow-on storage contract gap | Remove ambiguity about what is stored when `compiledCodeRef` enrichment exists |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                 | Added execution-binding storage contract to the gap register                                                       | Keep the structured artifact aligned with the human proposal                   |
| `docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-binding-storage-contract-closeout.md` | Recorded think-first analysis and evidence                                                                         | Satisfy workflow requirements                                                  |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                          | Result |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260317-stage-1-1-planner-canonicalization-binding-storage-contract-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The document now defines a single canonical stored plan form and an explicit
  follow-on gap for binding storage.
