---
slice: 20260318-stage-1-1-planner-canonicalization-unknown-stepkind-allowlist-authority
date: 2026-03-18
last_reviewed: 2026-03-18
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Unknown StepKind Allowlist Authority

## Think-First Analysis

### Problem summary

The proposal allowed bridge-period admission of unknown `StepKind` values when
they were allowlisted, but it did not say where that allowlist lived.

### Root cause

The bridge policy named admission conditions without naming the canonical
governance surface that owns those conditions.

### Constraints and invariants

- bridge-period unknown-kind admission must remain exceptional, not default
- adapter-local lists must not become de facto governance surfaces
- Stage 1.1 must not pretend that allowlist authority is canonized when it is
  not

### Options considered

- Leave allowlist location environment-local and adapter-defined.
- Force immediate contracts-level canonization before any bridge period.
- Require one canonical runtime-capability governance surface during the bridge
  period and track missing canonization as an explicit gap.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Require one governed allowlist authority for bridge-period unknown-kind
admission and make the missing canonical source-of-truth surface explicit as a
gap.

### Rejected alternatives

- Adapter-local allowlists would distribute governance and erase a single source
  of truth.
- Immediate full contracts-level canonization would overstate what Stage 1.1
  already closes.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - define where the unknown-kind allowlist is allowed to live during the bridge
    period
  - declare missing allowlist authority as an explicit gap
- Touched files or paths:
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-unknown-stepkind-allowlist-authority-closeout.md`
- Expected outcome:
  - unknown `StepKind` allowlisting can no longer be read as adapter-local or
    vaguely environment-defined
- Risks and mitigations:
  - Risk: imply the final allowlist artifact already exists
  - Mitigation: define the authority rule and keep the artifact as explicit gap
- Out-of-scope items:
  - implementing allowlist storage
  - defining the final runtime capability schema
  - changing planner or adapter code
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                                   | Change                                                                                | Why                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                            | Added explicit allowlist authority rule for bridge-period unknown `StepKind` handling | Remove vague governance wording and prevent adapter-local policy drift |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                             | Marked unknown-step policy as selected-with-gap and added allowlist-authority gap     | Keep the structured artifact aligned with the human proposal           |
| `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-unknown-stepkind-allowlist-authority-closeout.md` | Recorded analysis and evidence                                                        | Satisfy workflow requirements                                          |

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `AGENTS.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`

## Docs synced

- [ ] `docs/planning/proposals/index.md` - not required for this existing proposal edit

## Test evidence

| Command                                                                                                                                                                                                                      | Result |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm exec markdownlint-cli2 packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-unknown-stepkind-allowlist-authority-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                            | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The missing allowlist authority is now tracked as a real gap instead of
  implicit vague wording.
