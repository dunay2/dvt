---
slice: PR-925-TEMPORAL-ARC2
date: 2026-04-13
last_reviewed: 2026-04-13
author: AI (Codex)
---

# Closeout: ARC-2 recovery for PR 925 Temporal SDK upgrade

## Think-First Analysis

- Problem summary: PR 925 was red even though the adapter-temporal and related
  test suites were already passing in GitHub Actions.
- Root cause: the PR changes `packages/@dvt/adapter-temporal/package.json`, so
  ARC-2 applies; the Dependabot branch had no evidence document and no quality
  risk update, which caused `ARC docs / evidence validate` to fail.
- Constraints and invariants: adapter changes under `packages/@dvt/adapter-*/**`
  require ARC-2 evidence and risk material per `AGENTS.md`; the fix should stay
  minimal and should not broaden the dependency bump beyond the governed slice.
- Options considered:
  - close the PR as not worth fixing: rejected because the technical checks are
    already green and the remaining failure is governance-only
  - replace the bump with a downgrade or suppress ARC checks: rejected because
    that would mask the actual failure mode
  - add the missing ARC-2 artifacts and revalidate the touched adapter package:
    selected
- Selected option and rationale: add the missing evidence and risk entries,
  revalidate the touched adapter package locally, and push the governed fix onto
  the Dependabot branch so the PR can converge without changing product code.
- Rejected alternatives: no rebase, no dependency rollback, no CI rule changes.

## Pre-Implementation Brief

- Mode: Slim
- Scope: `docs/evidence`, `docs/risk-register/quality`, and this closeout
- Expected outcome: PR 925 satisfies ARC-2 and the remaining CI red turns green
- Risks and mitigations:
  - risk: Temporal 1.16 includes Nexus breaking changes
  - mitigation: confirm repo-level non-usage of Nexus and keep package
    validation on adapter-temporal green
  - risk: docs added without syncing indexes
  - mitigation: run `pnpm docs:sync` and `pnpm verify:prepush`
- Out-of-scope items: changing dependency versions, editing adapter runtime
  code, or altering CI policy
- Validation plan: `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs`,
  `pnpm --filter @dvt/adapter-temporal build`,
  `pnpm --filter @dvt/adapter-temporal test`, `pnpm docs:sync`,
  `pnpm verify:prepush`
- Test coverage plan: reuse the touched package build and test suite, because
  the governed fix is documentation plus ARC compliance rather than runtime code
- Libraries evaluated: none; no implementation library change was needed for
  the ARC recovery slice

## Changes Made

| File                                                                         | Change                   | Why                                              |
| ---------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------ |
| `docs/evidence/ED-20260413-temporal-sdk-1-16-adapter-upgrade.md`             | added ARC-2 evidence doc | satisfy required evidence for adapter change     |
| `docs/risk-register/quality/R-20260413-TEMPORAL-SDK-1-16-COMPATIBILITY.yaml` | added risk update        | satisfy required risk entry for adapter change   |
| `docs/planning/closeouts/20260413-pr-925-temporal-arc2-closeout.md`          | added task closeout      | record the root cause and governed recovery path |

## Validation Evidence

| Command                                                          | Result                                           |
| ---------------------------------------------------------------- | ------------------------------------------------ |
| `GIT_BASE=origin/main GIT_HEAD=HEAD node tools/ci/arc-check.mjs` | PASS - confirms ARC-2 evidence and risk required |
| `pnpm --filter @dvt/adapter-temporal build`                      | PASS                                             |
| `pnpm --filter @dvt/adapter-temporal test`                       | PASS - 13 files, 145 tests                       |
| `pnpm docs:sync`                                                 | PASS                                             |
| `pnpm verify:prepush`                                            | PASS                                             |

## Debt Introduced

None. No dependency rollback, no rule bypass, and no CI suppression were used.

## Known Residuals

- Temporal 1.16 release notes mention Nexus breaking changes, but the current
  repository does not actively use Nexus. If that changes later, the SDK line
  should be re-reviewed before assuming compatibility remains trivial.
