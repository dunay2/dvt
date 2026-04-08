---
slice: 20260318-stage-1-1-planner-canonicalization-stepkind-registry-and-baseline-prereq
date: 2026-03-18
last_reviewed: 2026-03-18
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 StepKind Registry And Baseline Prerequisite

## Think-First Analysis

### Problem summary

Two migration preconditions remained too vague:

- the bridge-period authority for unknown `StepKind` allowlisting
- the concrete baseline inventory required before Phase 1 can safely freeze
  authority

### Root cause

The proposal fixed high-level governance direction before naming the canonical
contract surfaces and migration prerequisites needed to make that direction
operable.

### Constraints and invariants

- adapter-local allowlists must not become de facto governance
- the bridge period must remain centrally visible and explicitly governed
- Phase 1 must not proceed without a concrete baseline inventory of current
  duplicated contract shapes

### Options considered

- Keep runtime-policy wording and implicit baseline discovery.
- Centralize StepKind authority in contracts and make baseline inventory a hard
  migration prerequisite.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Move the bridge-period allowlist model to `@dvt/contracts` via `KnownStepKind`
plus `StepKindBridgeRegistry`, and require a published baseline snapshot before
Phase 1 begins.

### Rejected alternatives

- Runtime-local allowlists distribute governance and reduce visibility.
- Implicit baseline discovery leaves the migration start state too ambiguous to
  be safe.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - centralize unknown-`StepKind` bridge authority in contracts governance
  - add a baseline-inventory prerequisite to the migration plan
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-stepkind-registry-and-baseline-prereq-closeout.md`
- Expected outcome:
  - unknown-`StepKind` admission no longer reads as runtime-local policy
  - Phase 1 gets an explicit baseline snapshot prerequisite
- Risks and mitigations:
  - Risk: overstate final contract names
  - Mitigation: allow equivalent canonical artifacts while still naming the
    required central registry model
- Out-of-scope items:
  - implementing `KnownStepKind` in code
  - creating the baseline snapshot artifact itself
  - changing planner or adapter runtime behavior
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                                    | Change                                                                                                                                                               | Why                                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                             | Replaced runtime-local unknown-`StepKind` allowlist wording with `KnownStepKind` plus `StepKindBridgeRegistry`, and added baseline-inventory prerequisite to Phase 1 | Make the bridge and migration start state centrally governed and auditable |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                              | Tightened `G-01.11` to require `KnownStepKind` and `StepKindBridgeRegistry` or equivalents                                                                           | Keep the structured artifact aligned with the human proposal               |
| `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-stepkind-registry-and-baseline-prereq-closeout.md` | Recorded analysis and evidence                                                                                                                                       | Satisfy workflow requirements                                              |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `AGENTS.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                                       | Result |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-stepkind-registry-and-baseline-prereq-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                             | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The proposal now names central bridge governance and baseline inventory as
  explicit prerequisites instead of leaving them implicit.
