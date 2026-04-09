---
slice: 20260318-stage-1-1-planner-canonicalization-input-path-lifecycle
date: 2026-03-18
last_reviewed: 2026-03-18
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Input Path Lifecycle

## Think-First Analysis

### Problem summary

The proposal named `manifestRef` as preferred and `manifest` and `nodes` as
compatibility paths, but it did not say whether those compatibility paths were
transitional or permanent.

### Root cause

Input normalization strategy was defined before the repository declared a
lifecycle rule for compatibility-only graph sources.

### Constraints and invariants

- `PlannerInputEnvelopeV2` may keep one stable public envelope while still
  distinguishing canonical from compatibility-only paths
- `manifestRef` remains the canonical forward-looking graph source
- Stage 1.1 must not silently elevate compatibility paths into permanent
  first-class contract citizens

### Options considered

- Treat all three graph sources as permanently equal.
- Deprecate `manifest` and `nodes` immediately.
- Declare `manifestRef` canonical and keep `manifest` and `nodes` as
  compatibility-only modes pending an explicit deprecation policy.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Declare `manifestRef` as the only forward-looking canonical graph source and
mark `manifest` and `nodes` as compatibility-only modes that require explicit
retention or deprecation governance.

### Rejected alternatives

- Permanent equality would turn compatibility modes into undeclared contract
  debt.
- Immediate deprecation would overstate what Stage 1.1 currently governs.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - define lifecycle stance for `manifestRef`, `manifest`, and `nodes`
  - mark missing deprecation policy as an explicit gap
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-input-path-lifecycle-closeout.md`
- Expected outcome:
  - the proposal no longer leaves three graph sources looking like permanent
    equal-precedence paths
- Risks and mitigations:
  - Risk: imply a removal schedule that is not yet approved
  - Mitigation: declare lifecycle stance now and keep exact deprecation window
    as explicit gap
- Out-of-scope items:
  - removing any input path from code
  - defining the final compatibility window
  - changing planner runtime behavior
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                   | Change                                                                       | Why                                                                      |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                            | Added lifecycle rule for graph sources and explicit deprecation-policy gap   | Prevent compatibility paths from reading as permanent first-class inputs |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                             | Marked D-06 as selected-with-gap and added input-path deprecation policy gap | Keep the manifest aligned with the human proposal                        |
| `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-input-path-lifecycle-closeout.md` | Recorded analysis and evidence                                               | Satisfy workflow requirements                                            |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `AGENTS.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                      | Result |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-input-path-lifecycle-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                            | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The lifecycle stance is explicit and the missing deprecation window is tracked
  as a real gap rather than left implicit.
