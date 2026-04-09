---
slice: 20260318-stage-1-1-planner-canonicalization-contract-evolution-protocol
date: 2026-03-18
last_reviewed: 2026-03-18
gap: planner-stage-1-1
author: AI (GPT-5)
---

# Closeout: Stage 1.1 Contract Evolution Protocol

## Think-First Analysis

### Problem summary

Section 24 separated semantic authorship from compatibility review, but it
still did not define one canonical protocol, bounded review scope, or a worked
example that resolves a concrete PR without ambiguity.

### Root cause

The proposal stated ownership principles before choosing a single governance
surface for the protocol and before bounding the contracts owner review scope.

### Constraints and invariants

- public planner contract publication remains in `@dvt/contracts`
- planner owner remains semantic author for planner semantics
- contracts owner remains a compatibility and package-coherence gate
- the slice must stay documentation-only

### Options considered

- Keep the protocol only in the Stage 1.1 proposal.
- Put the protocol in a generic contributing guide.
- Create a dedicated ADR as the canonical protocol and make the proposal point
  to it.

Libraries evaluated:

- None. Documentation/governance slice.

### Selected option and rationale

Use a dedicated ADR as the single protocol-of-record. That makes the rule
formal, linkable, versioned, and independent from one proposal document while
still allowing the proposal to summarize it.

### Rejected alternatives

- Leaving the protocol only in the proposal would keep the rule scoped to a
  migration discussion rather than a standing governance rule.
- Using a generic contributing guide would make the protocol easier to miss and
  harder to treat as a normative architectural decision.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - create the canonical protocol for public planner contract evolution
  - bound the contracts owner review scope explicitly
  - align the proposal manifest and governance inventory to that protocol
- Touched files or paths:
  - `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`
  - `docs/adr/ADR-Index.md`
  - `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
  - `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`
  - `docs/planning/status/governance-document-rule-inventory.md`
  - `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-contract-evolution-protocol-closeout.md`
- Expected outcome:
  - one canonical answer to "How do I propose a change to `ExecutionPlanV2`?"
- Risks and mitigations:
  - Risk: duplicate the protocol between the ADR and the proposal
  - Mitigation: make the ADR canonical and keep section 24 as a summary
- Out-of-scope items:
  - CODEOWNERS changes
  - CI enforcement for role ownership
  - any code or package changes
- Validation plan:
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`
  - `pnpm docs:sync`
- Test coverage plan:
  - documentation lint plus manifest validation
- Libraries evaluated:
  - None

## Changes made

| File                                                                                                          | Change                                                                                            | Why                                                              |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`                                             | Added the canonical protocol with roles, bounded review scope, rejection rule, and worked example | Create one normative place for planner public contract evolution |
| `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`                                   | Added canonical-location pointer, review-scope table, and worked example in section 24            | Make the proposal operational without competing with the ADR     |
| `docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json`                                    | Added ADR-0035 as active governance and aligned D-01/D-02/D-03 to section 24                      | Keep the structured artifact aligned with the human proposal     |
| `docs/adr/ADR-Index.md`                                                                                       | Indexed ADR-0035                                                                                  | Keep ADR catalog rules satisfied                                 |
| `docs/planning/status/governance-document-rule-inventory.md`                                                  | Added ADR-0035 to the ADR inventory                                                               | Keep repository governance entrypoint current                    |
| `docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-contract-evolution-protocol-closeout.md` | Recorded analysis, validation plan, and worked-example rationale                                  | Satisfy workflow requirements                                    |

## Worked example

If the planner needs to add `planVersion` to `ExecutionPlanV2`, the flow is:

1. The planner owner opens or sponsors the PR in `@dvt/contracts`.
2. The planner owner provides the semantic rationale and linked planning
   context.
3. The contracts owner reviews only for import breakage, compatibility impact,
   versioning requirements, and package coherence.
4. If those checks pass, the contracts owner approves; semantic authorship does
   not transfer away from the planner owner.

## Governing sources used

- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `AGENTS.md`
- `packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md`
- `docs/adr/ADR-Index.md`

## Docs synced

- [x] `docs/adr/index.md` - regenerated via `pnpm docs:sync`

## Test evidence

| Command                                                                                                                                                                                                                                                                                                                                                                                | Result |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm docs:sync`                                                                                                                                                                                                                                                                                                                                                                       | Passed |
| `pnpm exec markdownlint-cli2 docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md docs/adr/ADR-Index.md docs/adr/index.md packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md docs/planning/status/governance-document-rule-inventory.md docs/planning/closeouts/20260318-stage-1-1-planner-canonicalization-contract-evolution-protocol-closeout.md` | Passed |
| `pnpm exec tsx tools/docs/validate-planner-stage-1-1-manifest.ts`                                                                                                                                                                                                                                                                                                                      | Passed |

## Debt introduced

None.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden debt entry was created.

## No-stub evidence

- No placeholder implementation or fake runtime path was added.
- The protocol, review scope, canonical location, and worked example are all
  expressed as repository governance, not TODO text.
