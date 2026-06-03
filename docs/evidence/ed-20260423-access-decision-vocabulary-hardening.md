---
title: Access-decision vocabulary hardening across API and contracts validation
status: Accepted
date: 2026-04-23
owners:
  - apps/api
  - packages/@dvt/contracts
arc_level: ARC-2
breaking: false
code_refs:
  - apps/api/src/application/ports/accessDecision.ts
  - apps/api/src/application/services/authorizeCommandScopeService.ts
  - apps/api/src/application/services/authorizeWorkspaceGraphDraftCapabilityService.ts
  - apps/api/src/application/services/workspaceGraphDraftCapabilityPolicy.ts
  - apps/api/src/entrypoints/http/listRunsRouteParser.ts
  - apps/api/src/infrastructure/auth/embeddedAccessDecisionService.ts
  - apps/api/docs/protected-security-access-decision-component.md
  - apps/api/test/application/services/protectedSecurityAccessDecision.architecture.test.ts
  - packages/@dvt/contracts/test/validation/workspace-graph-draft.ts
  - docs/risk-register/quality/R-20260423-ACCESS-DECISION-VOCABULARY-HARDENING.yaml
evidence:
  tests:
    - pnpm --filter dvt-api build
    - pnpm --filter dvt-api typecheck
    - pnpm --filter dvt-api test
    - pnpm --filter @dvt/contracts build
    - pnpm --filter @dvt/contracts typecheck
    - pnpm --filter @dvt/contracts test
    - pnpm docs:status:generate
    - pnpm docs:sync
    - $env:GIT_BASE='origin/main'; $env:GIT_HEAD='HEAD'; node tools/ci/arc-check.mjs
    - pnpm verify:prepush
---

# Summary

This ARC-2 evidence closes the branch that hardened the protected API
authorization language, extracted the workspace-graph-draft capability policy
into its own companion module, added semantic component documentation and
architecture coverage, and cleaned the related contracts validation fixtures.

# What this evidence closes

1. `apps/api` now owns a single published access-decision language through
   `accessDecision.ts`, with route/application consumers reusing canonical
   actions and explicit resource scopes.
2. Workspace graph draft capability shaping is separated from orchestration:
   `AuthorizeWorkspaceGraphDraftCapabilityService` now orchestrates while
   `workspaceGraphDraftCapabilityPolicy.ts` owns capability policy material and
   typed denial translation.
3. The protected security cluster is now documented and fitness-checked as a
   component, not only as a set of thin barrels or local helpers.
4. The contracts validation fixtures for workspace graph draft capability
   outcomes no longer repeat near-identical builders, which keeps the contract
   suite readable without introducing a second semantics owner.

# What remains open

1. The first access-decision backend is still embedded by design; an external
   PDP adapter remains a later governed slice behind the same DVT contract.
2. Future changes touching `apps/api` authorization semantics or
   `@dvt/contracts` validation surfaces still need ARC-tracked evidence and a
   risk update to keep code, docs, and fitness tests aligned.
