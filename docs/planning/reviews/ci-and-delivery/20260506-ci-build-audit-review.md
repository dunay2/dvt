---
title: CI Build Config Audit Review 2026-05-06
status: Reference
owner: Architecture / DevOps / CI
last_reviewed: 2026-05-09
planning_type: review
---

# CI Build Config Audit Review 2026-05-06

This review records CI, build, and repository configuration findings that were
preserved in a local stash and rechecked against current `main` after PR #1115,
PR #1116, and PR #1118. It is not an accepted decision. Any remediation must go
through the owning workflow, ADR, ARC, or docs governance surface before
implementation.

## Governing Sources

- [Governance Document And Rule Inventory](../../status/governance-document-rule-inventory.md)
- [DVT Docs Structure](../../../DOCS_README.md)
- [AI Work Protocol](../../../guides/ai-work-protocol.md)
- [Review Naming Policy](../review-naming-policy.md)
- Root `package.json`
- `.github/workflows/ci.yml`
- `.github/workflows/pr-quality-gate.yml`
- `.github/workflows/test.yml`
- `.github/workflows/contracts.yml`
- `.github/workflows/release.yml`
- `.arc-policy.yaml`

## Integration Recommendation

Track this file as a CI and delivery review intake, not as a normative CI
policy. The original stash artifact contained useful evidence, but several
claims were overstated or invalidated by current workflow state. This cleaned
version keeps only findings that remain useful for owner review and explicitly
labels uncertain items as follow-up questions.

Status update 2026-05-09:

- The audit has been routed to explicit Lane C follow-up tasks.
- This file is now a reference intake. It does not authorize direct workflow,
  hook, package-script, or ARC-policy changes.
- `CI-05` does not currently need a task because `docs_structure_changed`
  already includes `docs/**`; revisit only if a generator dependency is later
  found outside that scope.

Status update 2026-05-14:

- `CI-04` is closed. `PR Quality Gate` is the single remote workflow owner for
  `pnpm traceability:adr0`; `CI - Code Quality` no longer invokes that command.
- `tools/ci/workflow-pattern-parity.test.mjs` now guards both the workflow
  ownership invariant and this review against stale duplicate-owner wording.

| Finding | Route                                                           |
| ------- | --------------------------------------------------------------- |
| `CI-01` | `CI-AUDIT-ENGINE-COVERAGE`                                      |
| `CI-02` | `CI-AUDIT-ARC-STATE-STORE`                                      |
| `CI-03` | `CI-AUDIT-CONTRACTS-SCOPE`                                      |
| `CI-04` | closed by `CI-AUDIT-ADR0-OWNER`                                 |
| `CI-05` | no task; current workflow-scope policy already covers `docs/**` |
| `CI-06` | `CI-AUDIT-RELEASE-FLOW`                                         |

## Validated Findings

| ID    | Severity | Area                         | Finding                                                                                                                                                                                                                                                                                           | Recommended next step                                                                                                                                         |
| ----- | -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI-01 | Medium   | Engine coverage gate scope   | Engine tests already run for `packages/@dvt/engine/**` through `tools/ci/emit-scope.mjs --mode test`, but the separate `Engine Coverage Gate` job still uses a local `coverage_relevant` filter that omits `packages/@dvt/engine/vitest.config.ts`.                                               | Add the engine Vitest config to the coverage-relevant scope or source the coverage filter from policy JSON.                                                   |
| CI-02 | High     | ARC policy                   | `.arc-policy.yaml` includes a `state-core` trigger for `packages/@dvt/state/**`, while the current state package path is `packages/@dvt/state-store/**`.                                                                                                                                          | Decide whether state-store changes require ARC-2, then update the trigger or remove the stale rule.                                                           |
| CI-03 | Medium   | Workflow policy ownership    | `contracts.yml` still carries inline `dorny/paths-filter` patterns while newer workflow scope is centralized through `tools/ci/policy/workflow-scope.json` and `tools/ci/emit-scope.mjs`.                                                                                                         | Consolidate contracts scope detection or document why this workflow remains an exception.                                                                     |
| CI-04 | Medium   | ADR-0000 traceability        | `PR Quality Gate` is the single remote workflow owner for `pnpm traceability:adr0` on pull requests, pushes to `main`, and explicit manual governance runs. `CI - Code Quality` owns CI tool contracts, changed-file lint/format, markdown lint, and affected workspace build/type-check fan-out. | Keep `tools/ci/workflow-pattern-parity.test.mjs` wired so `ci.yml` cannot regain duplicate ADR-0000 ownership and `pr-quality-gate.yml` cannot drop the gate. |
| CI-05 | Medium   | Docs sync gating             | `pr-quality-gate.yml` runs `pnpm docs:sync:check` only when `docs_structure_changed` is true. If generated indexes can drift from title/frontmatter changes outside that scope, CI may discover drift later than expected.                                                                        | Verify the policy inputs for `docs_structure_changed`; widen only if the generator actually depends on those changes.                                         |
| CI-06 | Medium   | Release workflow consistency | `.github/workflows/release.yml` runs release-please directly and does not use the repository `setup-node-pnpm` action.                                                                                                                                                                            | Confirm whether release-please needs repository Node/pnpm parity; add checkout/setup only if the release flow needs local repo tooling.                       |

## Follow-Up Questions

The original audit also raised broader issues around TypeScript configuration,
manual test fan-out, ESLint config coverage, CodeQL query depth, dependency
review severity, CODEOWNERS cleanup, and hook defaults. Those may still be
valid, but each needs a separate owner review because the remediation would
change build behavior, security posture, or contributor workflow.

Do not implement those changes from this audit alone. Convert accepted findings
into specific CI or build proposals with validation plans and rollback notes.

## Explicitly Corrected Stale Claims

- ADR-0000 traceability is not absent from pull request quality checks on
  current `main`; `pr-quality-gate.yml` runs it for pull requests.
- Engine tests are not absent for `packages/@dvt/engine/vitest.config.ts`
  changes; CI-01 is limited to the separate coverage-gate filter.
- The audit should not classify every duplicated workflow condition as a
  blocking defect. Some duplication is deliberate fan-out or scope isolation
  until a workflow owner accepts consolidation.
- This review does not authorize changing hooks, package scripts, workflows,
  TypeScript configs, or ARC policy. It only records audit candidates.
