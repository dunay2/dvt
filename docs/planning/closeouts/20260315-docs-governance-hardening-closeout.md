---
slice: docs-governance-hardening
date: 2026-03-15
last_reviewed: 2026-03-15
gap: docs-governance
author: AI (GPT-5)
---

# Closeout: Docs Governance Hardening

## Think-First

### Problem summary

Documentation governance is enforced inconsistently. The repo still carries
space-bearing filenames, duplicated guide paths, and no dedicated docs CI layer
for ADR catalog integrity, frontmatter, or governance references.

### Root cause

Docs quality has relied mostly on markdown lint plus manual review. That leaves
structural rules under-enforced and allows stale links or non-canonical
filenames to persist.

### Constraints and invariants

- ADR-0005: contract formalization tooling must stay repository-authoritative.
- ADR-0006: governance checks must be enforceable from repo tooling, not editor
  convention.
- `AGENTS.md`: inventory-first startup, think-first before edits, closeout
  mandatory, no hidden debt.

### Options considered

- Reuse only existing `markdownlint` plus `docs:sync`.
  Rejected: catches style/index drift, but not filename policy, ADR catalog
  integrity, or governance references.
- Add a single monolithic docs checker.
  Rejected: lower clarity, harder to maintain, and weaker failure reporting.
- Add focused docs governance scripts plus a dedicated workflow.
  Selected: smallest enforceable set with explicit failure modes and clean CI
  wiring.

### Selected option and rationale

Normalize the renamed docs paths, switch governance references to the new
`ai-work-protocol.md` canonical guide, and align the docs indexes/navigation so
the canonical paths are the only ones referenced.

### Rejected alternatives

- Keep legacy filenames with spaces and rely on redirects.
- Leave governance references split across old and new guide names.

## Changes made

| File                                                                                                                                                              | Change                                                                              | Why                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| [AGENTS.md](../../../AGENTS.md)                                                                                                                                   | Align startup sentence and operational quick-reference with canonical workflow docs | Keep agent bootstrap rules and docs governance consistent |
| [docs/guides/ai-work-protocol.md](./20260315-docs-governance-hardening-closeout.md)                                                                               | Add canonical AI procedure guide                                                    | Replace legacy duplicated workflow guide                  |
| [docs/guides/index.md](./20260315-docs-governance-hardening-closeout.md)                                                                                          | Point guides index to `ai-work-protocol.md`                                         | Make the new guide discoverable                           |
| [docs/adr/ADR-Implementation-Status.md](./20260315-docs-governance-hardening-closeout.md)                                                                         | Normalize ADR status filename                                                       | Remove space-bearing path and support filename policy     |
| [docs/adr/ADR-Index.md](./20260315-docs-governance-hardening-closeout.md)                                                                                         | Update ADR status link                                                              | Keep ADR navigation valid after rename                    |
| [docs/adr/index.md](./20260315-docs-governance-hardening-closeout.md)                                                                                             | Include normalized ADR status entry                                                 | Keep ADR catalog coherent                                 |
| [docs/planning/index.md](./20260315-docs-governance-hardening-closeout.md)                                                                                        | Update renamed review links and pending-fix index                                   | Preserve planning navigation                              |
| [docs/planning/status/governance-document-rule-inventory.md](./20260315-docs-governance-hardening-closeout.md)                                                    | Swap legacy AI guide references to canonical path                                   | Keep the inventory authoritative                          |
| [docs/planning/status/index.md](./20260315-docs-governance-hardening-closeout.md)                                                                                 | Surface pending-fix docs                                                            | Make operational follow-ups discoverable                  |
| [docs/planning/status/pending-admin-route-flag-strict-parsing.md](./20260315-docs-governance-hardening-closeout.md)                                               | Add explicit status note for admin-flag parsing bug                                 | Track unresolved operational risk                         |
| [docs/planning/status/pending-intent-resolution-provider-verification.md](./20260315-docs-governance-hardening-closeout.md)                                       | Add explicit status note for intent reconciliation bug                              | Track unresolved ADR-0030 risk                            |
| [docs/planning/archive/reviews/architecture-and-governance/20260305-general-review.md](../archive/reviews/architecture-and-governance/20260305-general-review.md) | Normalize filename                                                                  | Satisfy filename policy                                   |
| [docs/planning/archive/reviews/architecture-and-governance/20260314-general-review.md](../archive/reviews/architecture-and-governance/20260314-general-review.md) | Normalize filename                                                                  | Satisfy filename policy                                   |
| [zensical.yml](../../../zensical.yml)                                                                                                                             | Point the How-To docs entry to `ai-work-protocol.md`                                | Keep docs site aligned with the canonical guide path      |

## Libraries evaluated

None. This slice adds repo-local governance scripts and CI wiring rather than a
new runtime dependency.

## Docs synced

- [x] [docs/planning/status/governance-document-rule-inventory.md](../status/governance-document-rule-inventory.md) — canonical operational references updated
- [x] [docs/planning/status/index.md](../status/index.md) — pending-fix docs indexed
- [x] [docs/planning/index.md](../index.md) — renamed review links and new status references surfaced

## Test evidence

| Command                                                                                                                                  | Result                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `pnpm docs:sync`                                                                                                                         | Pending in this closeout until validation run in PR worktree    |
| `pnpm docs:sync`                                                                                                                         | PASS                                                            |
| `pnpm docs:quality:check`                                                                                                                | PASS, with pre-existing non-English warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                              | PASS                                                            |
| `pnpm exec markdownlint-cli2 "docs/**/*.md" "README.md" "AGENTS.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | PASS                                                            |
| `pnpm verify:prepush`                                                                                                                    | PASS                                                            |

## Debt introduced

None.
