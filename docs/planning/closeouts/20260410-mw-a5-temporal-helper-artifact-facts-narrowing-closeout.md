---
slice: mw-a5-temporal-helper-artifact-facts-narrowing
date: 2026-04-10
author: AI (GPT-5)
last_reviewed: 2026-04-10
status: Accepted
---

# Closeout: MW-A5 Temporal Helper Artifact Facts Narrowing

## Think-First Analysis

- Problem summary:
  `workflowHelpers.ts` parsed `DbtStepTypeConfigSchema` even though the helper
  only needed `compiledCodeRef` to shape `StepStarted.stepArtifactRef`.
- Root cause:
  runtime helper payload shaping depended on the full DBT config envelope
  instead of the narrow shared artifact fact embedded inside it.
- Constraints and invariants:
  `AGENTS.md`; `docs/planning/status/governance-document-rule-inventory.md`;
  `docs/guides/ai-work-protocol.md`;
  `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`;
  `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`;
  `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`;
  `docs/planning/proposals/mandatory/runtime-and-contracts/temporal-workflow-helper-artifact-facts-narrowing-slice-20260410.md`.
- Options considered:
  1. Keep full DBT config parsing in the helper and document the smell.
  2. Narrow the helper seam to `CompiledCodeRef` only while preserving the
     current helper file structure.
  3. Redesign the whole helper module and planner normalization flow in one
     slice.
- Selected option and rationale:
  Option 2. It removes the wrong dependency width now without expanding the
  slice into a broad workflow-helper decomposition.
- Rejected alternatives:
  Option 1 leaves the wrong boundary in place; Option 3 is too wide for the
  bounded follow-up promised by `MW-A5`.

## Pre-Implementation Brief

- Mode:
  Full
- Scope:
  Remove `DbtStepTypeConfigSchema` from the Temporal workflow helper seam and
  validate only the narrow `compiledCodeRef` fact required for payload shaping.
- Touched files or paths:
  `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts`,
  `packages/@dvt/adapter-temporal/test/workflow-compiled-code-ref.test.ts`,
  `docs/planning/state/agent-lane-a.yaml`,
  `docs/planning/closeouts/20260410-mw-a5-temporal-helper-artifact-facts-narrowing-closeout.md`.
- Risks and mitigations:
  The main risk was silently widening acceptance too far. Mitigation: keep the
  helper fail-closed on malformed `compiledCodeRef` itself while ignoring only
  unrelated DBT config width.
- Out-of-scope:
  Removing DBT step-kind gating from the Temporal adapter; splitting
  `workflowHelpers.ts` into multiple files; planner ingress redesign.

## Implementation

- Replaced `DbtStepTypeConfigSchema` parsing in
  `packages/@dvt/adapter-temporal/src/workflows/workflowHelpers.ts` with
  `CompiledCodeRefSchema` parsing of the `compiledCodeRef` property only.
- Preserved existing helper behavior for:
  - non-DBT step kinds returning `undefined`
  - absent `compiledCodeRef` returning `undefined`
  - malformed `compiledCodeRef` throwing
    `INVALID_PLAN_SCHEMA: step_compiledCodeRef_invalid`
- Added focused tests proving:
  - valid `compiledCodeRef` still works
  - unrelated invalid DBT config width no longer causes helper failure when
    `compiledCodeRef` is valid
  - unrelated invalid DBT config width is ignored when `compiledCodeRef` is
    absent

## Validation Evidence

- `pnpm --filter @dvt/adapter-temporal test -- --run test/workflow-compiled-code-ref.test.ts`
- `pnpm --filter @dvt/adapter-temporal build`
- `pnpm docs:sync`
- `pnpm docs:workboard:generate`
- `pnpm lint:md:changed`
- `pnpm verify:prepush`

## No-Debt / No-Stub Evidence

- No stubs, placeholders, or TODO markers were added.
- No rules or checks were bypassed.
- The helper still fails closed on malformed `compiledCodeRef`; the slice only
  removed dependency on unrelated DBT config width.
