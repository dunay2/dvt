---
slice: 20260402-s08-contract-layer-hardening
date: 2026-04-02
work_item: S08 / S08-2
status: Done
---

# Closeout: S08 Contract-Layer Hardening

## Think-First Analysis

### Problem summary

The initial `S08-2` contract slice introduced the new persisted plan-record
family, but it still violated several active governance rules:

1. `PlanRecord` treated `canonicalPlanJson` as an opaque string while also
   storing duplicated top-level identity fields with no enforced parity.
2. `PlanRecord` and `PlanExecutabilityRecord` modeled state-dependent fields as
   loose optionals instead of explicit variants.
3. `PlanExecutabilityRecord.rejectionReport.code` widened to `string`, which
   broke the canonical rejection vocabulary.
4. The new schemas and parse helpers were not type-locked to the exported
   public contracts.
5. `ADR-0043` and the planner contract documentation had not been advanced to
   reflect the implementation state.

### Root cause

The first implementation pass got the files and tests into place, but it did
not yet enforce the deeper invariants that the repo already requires for
planner identity, explicit state modeling, and governed boundary ownership.

### Constraints and invariants

- `AGENTS.md`: inventory-first startup, real validation, ARC-2 evidence for
  contract changes, no hidden debt, and no stub completion.
- `docs/guides/ai-work-protocol.md`: closeout is mandatory and planning/docs
  must move with the code.
- `ADR-0017`: execution-plan schema versioning remains canonical and
  planner-record metadata cannot invent a parallel schema vocabulary.
- `ADR-0041`: boundary contracts must expose explicit state models.
- `ADR-0042`: the planner-emitted canonical `ExecutionPlan` remains the
  identity source of truth.
- `ADR-0043`: serializable planner records stay in planner contracts while
  plan-storage behavior ports belong to `@dvt/artifacts`.

### Options considered

- Keep the current contract files and only document the intended invariants.
  - Rejected because it would leave runtime-adjacent drift unchecked.
- Push the parity and state checks into future artifacts or adapter work.
  - Rejected because the contract boundary itself would still accept invalid
    persisted records.
- Harden the contracts now, accept `ADR-0043`, and ship schemas, parsers,
  tests, and docs together.
  - Selected because it closes the slice at the actual planner-contract
    boundary.

### Selected option and rationale

Keep the `S08-2` scope strictly in `@dvt/contracts`, but make the new
planner-record family enforce the canonical plan identity, explicit state
variants, and canonical rejection-code vocabulary at parse time and in JSON
schema form.

## Pre-Implementation Brief

- Mode: Full
- Scope:
  - `packages/@dvt/contracts/src/contracts/planner/PlanRecord.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityRecord.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/PlanAdmissionLink.v1.ts`
  - `packages/@dvt/contracts/src/contracts/planner/PlanExecutabilityValidation.v1.ts`
  - `packages/@dvt/contracts/src/schemas.ts`
  - `packages/@dvt/contracts/src/validation.ts`
  - `packages/@dvt/contracts/test/validation.test.ts`
  - `packages/@dvt/contracts/test/plan-store-records-schema-sync.test.ts`
  - supporting ADR, contract-doc, evidence, risk, and lane-state surfaces
- Expected outcome:
  - planner-record parsing rejects metadata drift and impossible state
    combinations
  - rejection codes stay canonical
  - public contract types remain the source of truth for the parsers and
    schemas
  - S08 governance surfaces reflect the actual slice state
- Risks and mitigations:
  - Risk: top-level planner-record fields drift from embedded canonical JSON.
    - Mitigation: reparse `canonicalPlanJson` through `parseExecutionPlan` and
      reject metadata mismatches.
  - Risk: state variants regress into optional field soup.
    - Mitigation: use discriminated unions in both TypeScript contracts and
      Zod/JSON schemas.
  - Risk: ARC tooling under-reports the slice because it only compares
    committed diff ranges.
    - Mitigation: add evidence and a risk file proactively based on
      `.arc-policy.yaml`.
- Out-of-scope items:
  - `@dvt/artifacts` plan-store ports
  - Postgres migration changes
  - API/runtime admission cutover
- Validation plan:
  - `pnpm --filter @dvt/contracts build`
  - `pnpm --filter @dvt/contracts test`
  - `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm docs:status:generate`
  - `pnpm verify:prepush`
- Libraries evaluated:
  - None evaluated. This slice stays within existing repo tooling and Zod.

## Traceability

- Baseline ADRs:
  - `ADR-0017`
  - `ADR-0041`
  - `ADR-0042`
  - `ADR-0043`
- Canonical planning and governance sources:
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/proposals/s08-plan-record-plan-store-execution-plan-20260402.md`
  - `docs/planning/reviews/20260402-s08-plan-record-plan-store-gap-review.md`
  - `.arc-policy.yaml`

## Real Work Performed

- Replaced the new `PlanRecord` and `PlanExecutabilityRecord` shapes with
  explicit discriminated unions that encode valid state-specific fields.
- Reused the canonical planner rejection vocabulary for
  `PlanExecutabilityRecord.rejectionReport.code`.
- Typed the new planner-record schemas to the exported public contract types and
  updated the parse helpers to return those public types.
- Made `parsePlanRecord` reparse `canonicalPlanJson` through the canonical
  `ExecutionPlan` parser and reject top-level metadata drift.
- Expanded validation and schema-sync tests to cover metadata mismatches,
  invalid schema versions, impossible state combinations, and non-canonical
  rejection codes.
- Accepted `ADR-0043`, documented the plan-record family, updated Lane A
  status, and added ARC evidence plus a risk-register entry.

## Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/agent-lane-a.yaml`
- `docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md`
- `docs/adr/ADR-0041-global-domain-state-model-and-boundary-contracts.md`
- `docs/adr/ADR-0042-execution-plan-canonical-identity-unification.md`
- `docs/adr/ADR-0043-plan-record-plan-store-and-artifacts-ownership.md`
- `.arc-policy.yaml`

## Validation evidence

- `pnpm --filter @dvt/contracts build`
  - Passed.
- `pnpm --filter @dvt/contracts test`
  - Passed.
  - Result: `9` test files passed and `98` tests passed.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`
  - Executed with PowerShell environment syntax.
  - Returned `ARC-0` because the tool compares `origin/main...HEAD` and does
    not see uncommitted worktree changes.
  - ARC-2 evidence and a risk update were still added because the slice touched
    `packages/@dvt/contracts/**`.
- `pnpm docs:sync`
  - Passed.
  - Regenerated `docs/adr/index.md`, `docs/contracts/planner/index.md`,
    `docs/evidence/index.md`, and `docs/planning/state/agent-lane-a.md`.
- `pnpm docs:workboard:generate`
  - Passed.
  - Updated `docs/planning/state/execution-workboard.md` and
    `docs/planning/state/open-task-route.md`.
- `pnpm docs:status:generate`
  - Passed.
  - Updated `docs/planning/status/generated-code-state.md`.
- `pnpm verify:prepush`
  - Passed.
  - Included the repo pre-push type-check chain and changed-only docs checks.
  - The changed-only governance checks operated on committed diff inputs, so
    they reported no changed files in this uncommitted worktree state.

## No-debt evidence

- No rule was disabled or relaxed.
- No hook was bypassed.
- No hidden runtime shortcut or compatibility escape hatch was introduced.
- The slice stayed inside `S08-2`; artifacts ports and runtime migration remain
  explicitly open work.

## No-stub evidence

- No placeholder record shape or fake parser path was introduced.
- `PlanRecord` now validates real canonical `ExecutionPlan` JSON, not a mocked
  metadata shell.
- The new contract doc, evidence doc, risk entry, and closeout reflect the real
  code and validation state of this slice.
