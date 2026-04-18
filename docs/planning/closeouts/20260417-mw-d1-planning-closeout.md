---
slice: mw-d1-planning
date: 2026-04-17
last_reviewed: 2026-04-17
task: MW-D1
author: AI (Codex)
---

# Closeout: MW-D1 Planning Slice

## Think-First

### Problem summary

The repository can already compile canonical `GenericGraphSourceV1` inputs
internally, but it does not yet expose one clean external authoring boundary
for non-dbt callers.

### Root cause

`MW-A2` generalized planner ingress and `MW-C1` generalized runtime dispatch,
but the external compile-only remote facade was never frozen. The nearest route
is `POST /plans/preview`, which still mixes compile, persistence, and
executability validation. The in-progress implementation also showed structural
drift: compile concerns were still spread across a multi-purpose route module
and a profile module with inline policy literals.

### Constraints and invariants

- `AGENTS.md` requires inventory-first work, explicit evidence, no debt, and
  no fake completion.
- `docs/guides/ai-work-protocol.md` requires think-first and a
  pre-implementation brief before implementation.
- `docs/planning/state/planning-control-tower.md` requires proposal work to be
  stored under `docs/planning/proposals/` and linked from the lane registry.
- `GenericGraphSourceV1` remains the canonical planner ingress.
- compile-only behavior must stay separate from preview-persist-run lifecycle
  behavior.
- compile must not preserve preview-era or manifest-era compatibility aliases.
- route, use case, mapper, and compile-profile policy must remain separated by
  responsibility.

### Options considered

1. Reuse `POST /plans/preview` as the external contract.
   Rejected because it couples compile to persistence and validation.
2. Add a dedicated compile-only API and keep preview for operator lifecycle.
   Selected because it gives one truthful external boundary.
3. Publish only an in-process SDK.
   Rejected because it does not solve the remote integration use case.

Libraries evaluated:

- None adopted. Existing `@dvt/contracts` and `@dvt/planner` remain the
  canonical foundation.

### Selected option and rationale

Create one `MW-D1` proposal that freezes:

- the DDD boundary map
- Fowler-style collaborator model
- current-state and target sequence diagrams
- the first canonical user stories for the external compile boundary
- the executable roadmap and backlog required to reach the target architecture
- the internal SRP split for route, parser, use case, mapper, and profile spec
- the no-legacy rule for compile ingress
- a target-state architecture package with C4, ports, aggregates, and roots
- a TDD-first implementation route for a compile-only API
- a non-dbt-first product rule for the external authoring boundary

### Rejected alternatives

- storing the design only in chat or PR text
- promoting preview semantics as the public authoring story

## Changes made

- `docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md`
  Updated the canonical `MW-D1` proposal with think-first analysis, DDD boundary
  map, Fowler-style collaborator model, current and target sequence diagrams,
  explicit English user stories for the external compile boundary, the
  canonical family-and-kind catalog model, contract-versus-code ownership
  rules, a semantic decision matrix for `stepKind` versus `family` versus
  `targetAdapter` versus worker routing, an illustrative typed profile
  configuration example, an object-relationship diagram for the catalog, a
  catalog-resolution sequence, a semantic decision sequence, SRP module
  decomposition, hardcode-elimination rules for the compile profile, the
  non-dbt-first authoring rule, the executable roadmap and backlog package,
  acceptance gates, and the delivery definition of done for the target
  architecture.
- `docs/guides/external-compile-target-architecture-technical-manual-20260417.md`
  Added the target-state architecture reference package for `MW-D1`, including
  C4 system, container, and component views; the DDD context map; aggregate
  roots, logical roots, and service roots; the ports-and-adapters inventory;
  target module ownership; port-contract definitions; class relationships;
  compile, extension, and compile-to-run sequences; and a domain glossary.
- `docs/guides/external-compile-catalog-extension-technical-manual-20260417.md`
  Added a companion technical manual that explains how to extend the external
  compile catalog with new families, new step kinds, and plugin contributions,
  including object-relationship and sequence diagrams, the compile-versus-run
  semantic split, cross-links to the target architecture manual, an
  illustrative typed profile example, and a step-by-step extension protocol.
- `docs/guides/how-to-add-step-kind-20260406.md`
  Linked the existing step-kind guide to the new family-and-catalog extension
  manual so future changes route through one explicit extension protocol.
- `docs/planning/closeouts/20260417-mw-d1-planning-closeout.md`
  Updated the closeout to record the product-facing user-story framing,
  SRP-driven redesign pass, catalog-extension documentation pass, and
  validation evidence for the planning slice.
- `docs/planning/state/agent-lane-d.yaml`
  Updated `MW-D1` progress and status reasoning to reflect that the structural
  design split, user-story framing, and family/plugin catalog model are now
  frozen, not just the functional boundary.
- generated planning views and indexes
  Refreshed after the lane and docs updates.

## Libraries evaluated

None adopted.

## Docs synced

- [x] `docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md`
- [x] `docs/guides/external-compile-target-architecture-technical-manual-20260417.md`
- [x] `docs/guides/external-compile-catalog-extension-technical-manual-20260417.md`
- [x] `docs/guides/how-to-add-step-kind-20260406.md`
- [x] `docs/planning/closeouts/20260417-mw-d1-planning-closeout.md`
- [x] `docs/planning/state/agent-lane-d.yaml`
- [x] generated planning views via `pnpm docs:workboard:generate`
- [x] docs indexes via `pnpm docs:sync`

## Test evidence

- `pnpm docs:workboard:generate` -> Passed
- `pnpm docs:sync` -> Passed
- `pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md" "docs/planning/closeouts/20260417-mw-d1-planning-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
- `pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md" "docs/planning/closeouts/20260417-mw-d1-planning-closeout.md" "docs/guides/external-compile-catalog-extension-technical-manual-20260417.md" "docs/guides/how-to-add-step-kind-20260406.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
- `pnpm exec markdownlint-cli2 "docs/planning/proposals/mandatory/runtime-and-contracts/mw-d1-external-plan-definition-sdk-api-plan-20260417.md" "docs/planning/closeouts/20260417-mw-d1-planning-closeout.md" "docs/guides/external-compile-target-architecture-technical-manual-20260417.md" "docs/guides/external-compile-catalog-extension-technical-manual-20260417.md" "docs/guides/how-to-add-step-kind-20260406.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc`
  -> Passed
- `pnpm verify:prepush` -> Passed; changed-only subchecks reported no detected
  changed files because the active `MW-D1` planning docs are still untracked in
  the worktree

## Debt introduced

None.

## No-stub evidence

No stubs, placeholders, fake implementations, or hidden contract shortcuts
were added. This slice freezes planning only and explicitly leaves code
execution for the next implementation pass.
