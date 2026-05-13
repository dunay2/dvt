---
title: AR-A4 custom policy namespace freeze closeout
status: Accepted
owner: Architecture / Planner / Contracts
date: 2026-05-13
planning_type: closeout
---

# AR-A4 Custom Policy Namespace Freeze Closeout

## Governing Sources Used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/architecture/reference-architecture.md`
- `docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md`
- `docs/adr/ADR-0034-bounded-context-boundaries-and-communication-rules.md`
- `docs/adr/ADR-0035-planner-public-contract-evolution-protocol.md`

## Real Work Performed

- Added AR-A4 Fowler analysis in `buzon`.
- Added the mandatory feature plan and freeze/reaction rationale.
- Froze `ICustomPolicyNamespaceRegistry` as a compatibility seam in the planner
  port docblock.
- Marked the shared custom policy namespace DTO vocabulary as compatibility
  vocabulary in the contracts docblock.
- Updated the planner component guide and constraints with freeze invariants,
  public API posture, transitions, consumers, and extension rules.
- Added user stories covering contributor, contracts consumer, and future
  reactivation scenarios.
- Added a semantic architecture test that validates freeze behavior, not only
  barrel placement.
- Added ARC-2 evidence and risk register entry for planner/contracts changes.

## Validation Evidence

Commands run:

- `pnpm --filter @dvt/planner test -- test/unit/planner-private-ownership.architecture.test.ts` - red first; failed because the frozen compatibility seam was not documented.
- `pnpm --filter @dvt/planner test -- test/unit/planner-private-ownership.architecture.test.ts` - passed after docblock/component updates.
- `pnpm --filter @dvt/contracts test -- test/planner-private-ownership.architecture.test.ts` - passed.
- `pnpm docs:feature-mechanization -- --feature AR-A4-CUSTOM-POLICY-NAMESPACE-FREEZE` - passed.
- `pnpm docs:feature-mechanization:implementation` - passed.
- `pnpm --filter @dvt/planner typecheck` - passed.
- `pnpm --filter @dvt/contracts typecheck` - passed.
- `pnpm docs:sync` - passed.
- `pnpm docs:status:generate` - passed.
- `pnpm governance:refresh` - passed after a first stale governance query-store check was corrected by re-importing the governance DB and rerunning the full refresh.
- `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` - passed with effective `ARC-2`; evidence and risk update required and present.
- `pnpm verify:prepush` - passed.

## No-Debt Evidence

- No TODO, FIXME, placeholder, backup file, fake adapter, fake registry, or
  fake success path was added.
- No lint, type, test, hook, ARC, or quality rule was disabled or relaxed.
- No `--no-verify` or hook bypass was used.

## No-Stub Evidence

- No no-op registry implementation was added.
- No active validation behavior was invented.
- The seam is explicitly frozen with a mechanical architecture guard and
  documented reactivation path.
