---
slice: phase2-arch-roadmap
date: 2026-03-16
last_reviewed: 2026-03-16
gap: planning-phase2-roadmap
author: AI (GPT-5)
---

# Closeout: Add Phase 2 architectural debt roadmap proposal

## Think-First Analysis

### Problem summary

The repository has accumulated several architectural review findings and
refactor ideas, but there is no single planning proposal that groups those
follow-up slices into an executable Phase 2 roadmap.

### Root cause

Reviews, closeouts, and ad hoc notes exist, but the planning layer does not yet
present one consolidated proposal that orders the work, records dependencies,
and keeps the structural follow-ups visible as a coherent set.

### Constraints and invariants

- `governance-document-rule-inventory.md`: planning proposals are non-normative
  but must live under the canonical planning tree.
- `docs/planning/index.md`: proposals, reviews, and status docs must remain
  distinct surfaces.
- `ai-work-protocol.md`: document slices still need explicit scope, validation,
  and closeout evidence.
- `AGENTS.md`: no hidden debt, no duplicate canonical surfaces, closeout
  required.

### Options considered

- Leave the findings distributed across reviews only.
  Rejected: keeps the next-phase work hard to navigate and easy to lose.
- Add one planning proposal that consolidates the slices and dependency graph.
  Selected: smallest clean way to make the Phase 2 follow-up visible without
  pretending it is implemented.
- Add the roadmap directly to a status doc.
  Rejected: status and roadmap are distinct planning surfaces in this repo.

### Selected option and rationale

Publish a proposal document under `docs/planning/proposals/` and register it in
the proposals index. Keep it explicitly non-normative and sourced from the
existing architectural review material.

### Rejected alternatives

- Spreading the roadmap across multiple review files.
- Treating the roadmap as implementation status.

## Pre-Implementation Brief

- Mode: `Slim`
- Scope:
  - add `phase2-arch-debt-roadmap-20260315.md`
  - update `docs/planning/proposals/index.md`
  - add this closeout
- Touched files or paths:
  - `docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md`
  - `docs/planning/proposals/index.md`
  - `docs/planning/closeouts/20260316-phase2-arch-roadmap-closeout.md`
- Expected outcome:
  - one discoverable planning proposal for the Phase 2 architectural debt work
- Risks and mitigations:
  - risk: proposal drifts into status language
  - mitigation: keep status `Proposed` and source it from the review of record
- Out-of-scope items:
  - implementation of any Phase 2 slice
  - status doc changes beyond index sync
- Validation plan:
  - `pnpm docs:sync`
  - `pnpm exec markdownlint-cli2 ...`
  - `pnpm docs:quality:check`
  - `pnpm docs:canonical:check`
- Test coverage plan:
  - docs-only slice; no runtime tests
  - negative path is structural: proposal must remain indexed and link-clean
- Libraries evaluated:
  - None; this is a planning-doc slice

## Changes made

| File                                                               | Change                                                     | Why                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md`     | Added a consolidated Phase 2 architecture roadmap proposal | Make the main post-Phase-1 follow-up slices discoverable in one planning artifact |
| `docs/planning/proposals/index.md`                                 | Indexed the new proposal                                   | Keep proposal navigation canonical                                                |
| `docs/planning/index.md`                                           | Synced the top-level planning index                        | Make the new proposal discoverable from the planning entrypoint                   |
| `docs/planning/closeouts/20260316-phase2-arch-roadmap-closeout.md` | Recorded think-first, scope, and validation evidence       | Keep the docs slice traceable under repo governance                               |

## Libraries evaluated

None.

## Docs synced

- [x] `docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md` - proposal added
- [x] `docs/planning/proposals/index.md` - proposal indexed
- [x] `docs/planning/index.md` - synced via `docs:sync`

## Test evidence

| Command                                                                                                                                                                                                                             | Result                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                                                                                                    | Passed                                                           |
| `pnpm docs:sync`                                                                                                                                                                                                                    | Passed; regenerated `docs/planning/index.md`                     |
| `pnpm exec markdownlint-cli2 "docs/planning/proposals/phase2-arch-debt-roadmap-20260315.md" "docs/planning/closeouts/20260316-phase2-arch-roadmap-closeout.md" --ignore-path .markdownlintignore --config .markdownlint-cli2.jsonc` | Passed                                                           |
| `pnpm docs:quality:check`                                                                                                                                                                                                           | Passed with pre-existing non-English warnings outside this slice |
| `pnpm docs:canonical:check`                                                                                                                                                                                                         | Passed                                                           |

## Debt introduced

None.
