---
slice: docs-governance-tooling
date: 2026-03-16
gap: docs-governance
author: AI (GPT-5)
---

# Closeout: Docs Governance Tooling

## Think-First

### Problem summary

`main` currently has a narrow docs location gate plus the older sync/doctor
checks, but it still lacks repo-native governance tooling for ADR catalog
integrity, filename policy, frontmatter contract checks, link integrity, and
governance reference validation.

### Root cause

Documentation governance grew as ad hoc scripts around specific failures. The
repository has no cohesive `tools/docs` layer that turns documentation policy
into explicit, reusable checks. Once those checks exist, they also expose real
baseline drift already present in ADR indexes, evidence frontmatter, and status
doc references.

### Constraints and invariants

- AGENTS.md and AI Work Protocol require canonical docs, traceability, and real
  validation evidence.
- `docs/planning/status/governance-document-rule-inventory.md` defines docs as a
  governed surface, not informal prose.
- This slice must not regress existing gates:
  `docs:gov:locations` stays, `verify:prepush` stays, root package version
  stays.
- No behavioral changes outside docs governance tooling.

### Options considered

1. Keep only the existing `docs:gov:locations` and manual review.
   Rejected: too weak; misses ADR/index/frontmatter/reference drift.
2. Add a dedicated `tools/docs` toolkit and wire it into package scripts.
   Selected: small, repo-local, explicit, testable, and compatible with the
   current docs workflow.
3. Replace the policy with an external docs linter suite.
   Rejected: no off-the-shelf tool understands this repo's ADR catalog,
   canonical matrices, evidence frontmatter, and governance references.

### Selected option and rationale

Introduce `tools/docs/**` plus the corresponding `package.json` script surface,
keeping the existing location gate and existing CI flow. Also fix the
`ADR-Implementation-Status.md` path emitted by `sync-docs`, normalize legacy
evidence frontmatter, and close the missing `G7` evidence/reference hole that
the new tooling surfaces.

### Rejected alternatives

- Pull in the root's unrelated `mkdocs.yml` changes.
- Revert the docs location policy from `docs/CONTRIBUTING.md`.
- Downgrade or replace existing docs gates just to make the new tooling fit.

## Changes made

| File                                                          | Change                                                                                                                                            | Why                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `tools/docs/**`                                               | Added repo-native docs governance checks for filenames, frontmatter, ADR catalog integrity, governance references, links, and manifest generation | Make docs governance explicit and reusable instead of ad hoc                                     |
| `package.json`                                                | Added `docs:gov:*` scripts and wired them into `docs:ci` while preserving `docs:gov:locations`                                                    | Expose the new tooling through canonical commands without replacing existing gates               |
| `scripts/sync-docs.cjs`                                       | Fixed ADR field extraction for `- Status:` / `- Date:` style headers and corrected the generated ADR implementation-status link                   | Prevent `docs:sync` from regenerating broken ADR catalog status cells and stale links            |
| `docs/evidence/ED-20260312-g6-golden-schema-closeout.md`      | Added required evidence frontmatter keys                                                                                                          | Bring legacy evidence docs into the frontmatter contract enforced by the new tooling             |
| `docs/evidence/ED-20260312-g8-arch-tests-engine-wiring.md`    | Added required evidence frontmatter keys and normalized evidence status                                                                           | Same baseline evidence hardening for G8                                                          |
| `docs/evidence/ED-20260314-g9-step-type-registry-closeout.md` | Added required evidence frontmatter keys                                                                                                          | Same baseline evidence hardening for G9                                                          |
| `docs/evidence/ED-20260315-g10-closeout.md`                   | Added required evidence frontmatter keys and normalized evidence status                                                                           | Same baseline evidence hardening for G10                                                         |
| `docs/evidence/ED-20260315-intent-store-bug-fixes.md`         | Quoted YAML scalars that broke frontmatter parsing                                                                                                | Make the existing frontmatter parseable by the new gate                                          |
| `docs/architecture/system-delivery-status.md`                 | Repointed stale provider-run-id references to the active G7 tracker                                                                               | Remove broken links revealed by the new governance checks without fabricating a missing closeout |
| `docs/planning/gaps/GAP_EXECUTION_PLANS.md`                   | Replaced the broken G7 evidence link with the active tracker record                                                                               | Keep G7 closure references on an existing governed surface instead of a phantom file             |

## Libraries evaluated

None. This slice adds repo-specific governance checks for ADRs, frontmatter,
links, and canonical reference integrity.

## Docs synced

- [x] [docs/adr/index.md](/f:/segundodvt/dvt/.worktrees/pr-adapter-postgres-phase1-r3/docs/adr/index.md) - regenerated with correct ADR statuses and implementation-status link
- [x] [docs/evidence/index.md](/f:/segundodvt/dvt/.worktrees/pr-adapter-postgres-phase1-r3/docs/evidence/index.md) - regenerated after evidence frontmatter normalization
- [x] [docs/planning/index.md](../../index.md) - closeout indexed by docs sync
- [x] [docs/planning/closeouts/index.md](../index.md) - closeout index synced by docs sync

## Test evidence

| Command                                                                                                  | Result |
| -------------------------------------------------------------------------------------------------------- | ------ |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 install --frozen-lockfile`                          | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 docs:sync`                                          | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 exec tsx tools/docs/check-filenames.ts`             | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 exec tsx tools/docs/check-frontmatter.ts`           | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 exec tsx tools/docs/check-adr-catalog.ts`           | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 exec tsx tools/docs/check-governance-references.ts` | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 exec tsx tools/docs/check-links.ts --changed-only`  | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 docs:quality:check`                                 | PASS   |
| `pnpm --dir .worktrees/pr-adapter-postgres-phase1-r3 docs:canonical:check`                               | PASS   |

## Debt introduced

None.
