---
title: Mandatory Work System For AI
status: Active
owner: docs
last_reviewed: 2026-03-07
---

# Mandatory Work System For AI

This guide defines the minimum workflow AI-assisted changes MUST follow in this repository.

## Canonical References

- [Engineering Playbook](../architecture/atlas/engineering/engineering_playbook.md)
- [ADR-0000: Code Generation With Enforced Normative Traceability](../adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md)
- [ADR-0004: Event Sourcing Strategy](../adr/ADR-0004-event-sourcing-strategy.md)
- [ADR-0005: Contract Formalization Tooling](../adr/ADR-0005-contract-formalization-tooling.md)
- [RunEvents Contract](../architecture/engine/contracts/engine/RunEvents.v1.md)

## Required Workflow

### Phase 0: Check Existing Material

Before starting:

- confirm whether the repository already contains documentation for the topic
- identify relevant ADRs and contracts
- check whether there are previous issues or reviews that already settled the decision
- prefer extending canonical docs instead of creating parallel notes

### Phase 1: Think-First Analysis

Before implementation, publish a short analysis in the issue or PR:

- problem summary
- constraints and invariants
- options considered
- selected option and rationale
- rejected alternatives
- expected validation evidence

### Phase 2: Pre-Implementation Brief

Document the intended change before editing code:

- scope
- touched files or paths
- expected outcome
- risks and mitigations
- out-of-scope items
- validation plan

### Phase 3: Normative Baseline Validation

Before generating or editing artifacts:

- identify the ADRs that authorize the change
- extract the specific decisions that apply
- verify that the planned output is consistent with those decisions
- record the chosen ADR set in the issue, PR, or document metadata

### Phase 4: Traceable Generation

Generated artifacts MUST remain traceable back to the approved baseline.

Use explicit traceability in:

- file headers or module comments
- commit messages when relevant
- tests that validate ADR-backed behavior

Minimum traceability fields when they make sense:

- baseline ADR id
- implemented decision
- affected contract or version
- issue or PR reference

### Phase 5: Artifact Relationship Recording

When a change produces an artifact set, document the relationship explicitly:

- canonical contract doc
- generated schema or machine-readable artifact path
- generated source path
- validation or conformance test path

If those artifacts live outside `docs/`, record them as code paths or plain literals. Do not create Markdown links to paths that are not published in the documentation tree.

### Phase 6: Documentation Update

Update the relevant index, guide, ADR reference, or status doc so readers can find:

- the governing ADRs
- the active contract
- the generated artifact set
- the validation evidence

### Phase 7: Validation And Closeout

Before closing the work:

- run the required checks
- confirm links and references resolve
- confirm the documentation reflects the shipped behavior
- leave a short closeout summary with outcome, blockers, and follow-up items

## Traceability Example

Example relationship for a contract-backed artifact set:

- ADR baseline: [ADR-0004](../adr/ADR-0004-event-sourcing-strategy.md), [ADR-0005](../adr/ADR-0005-contract-formalization-tooling.md)
- Canonical contract: [RunEvents Contract](../architecture/engine/contracts/engine/RunEvents.v1.md)
- Generated artifacts: `schemas/run-events.schema.json`, `src/run-events.types.ts`, `test/run-events.conformance.test.ts`

The artifact paths above are examples of code or build outputs. They should be documented as paths unless those artifacts are actually published under `docs/`.

## Minimum Quality Bar

AI-assisted work MUST NOT:

- bypass an existing ADR or contract
- introduce non-canonical duplicate docs
- add broken Markdown links
- point readers at generated `site/` output
- leave implementation changes without matching documentation when the behavior changed

## Suggested Issue Skeleton

```text
Think-First Analysis
- Problem summary:
- Constraints and invariants:
- Options considered:
- Selected option and rationale:
- Rejected alternatives:
- Expected validation evidence:

Pre-Implementation Brief
- Scope:
- Touched files or paths:
- Risks and mitigations:
- Validation plan:

Traceability
- Baseline ADRs:
- Canonical contract:
- Generated artifacts:
```

## Final Rule

When in doubt, prefer:

1. one canonical document
2. one canonical contract target
3. explicit ADR traceability
4. plain path literals instead of fake links
