---
slice: rc-c2-wave-3a-docs-manifest-determinism
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 3A docs manifest determinism

## Think-First

### Problem summary

The repository already ships `tools/docs/generate-docs-manifest.ts` and the
`pnpm docs:gov:manifest` command, but that path is still not trustworthy as a
governed artifact:

- the manifest includes `generatedAt: new Date().toISOString()`
- `docs:gov` does not invoke the manifest generator or validate the output
- no stable checked-in docs manifest currently exists to act as a repository
  source of truth

That leaves the manifest capability dormant instead of enforceable.

### Root cause

The generator was added as a useful inventory helper, but not yet finished as
part of the governed docs pipeline:

- timestamp noise makes the output non-deterministic
- a non-deterministic file cannot serve as a drift artifact
- without wiring into `docs:gov`, the command remains optional local evidence
  rather than a real governance gate

### Constraints and invariants

- `AGENTS.md` requires canonical planning surfaces, truthful evidence, and
  `pnpm verify:prepush` before presenting the slice as ready.
- `docs/guides/ai-work-protocol.md` requires think-first and a
  pre-implementation brief before code/config/docs changes land.
- `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  defines `CDG-W3-1` as: make the docs manifest deterministic, then wire it
  into `docs:gov`.
- The slice is docs/governance tooling only; it should stay outside
  ARC-triggering runtime, adapter, contract, and planner code paths.
- The resulting manifest must be stable under repeated execution on an
  unchanged worktree or it is not a governance artifact.

### Options considered

- Keep the manifest as a local-only helper and defer enforcement.
- Keep writing `generatedAt`, but exclude the file from drift checks.
- Remove timestamp noise, sort any unstable collections, track the manifest as
  a stable artifact, and wire it into `docs:gov`.

### Selected option and rationale

Make the manifest deterministic and enforce it through `docs:gov`.

This is the smallest truthful version of the plan:

- it turns an existing helper into a real governance surface
- it avoids introducing a second manifest format or parallel validator
- it creates a machine-readable docs inventory that can actually participate in
  repository drift checks

### Rejected alternatives

- keep it local-only: rejected because the plan explicitly calls for
  enforcement, not another optional helper
- exclude a timestamped output from drift checks: rejected because that would
  preserve the exact trust gap the slice is supposed to close

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - make `tools/docs/generate-docs-manifest.ts` deterministic
  - create regression coverage for deterministic output and `docs:gov` wiring
  - wire `pnpm docs:gov:manifest` into `pnpm docs:gov`
  - update the canonical CI/testing guide, proposal, Lane C state, and this
    closeout
- Touched files or paths:
  - `tools/docs/generate-docs-manifest.ts`
  - possible new test under `tools/ci/` or `tools/docs/`
  - `package.json`
  - generated `docs/.manifest.json`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - this closeout file
- Expected outcome:
  - repeated manifest generation on an unchanged repo yields byte-identical
    output
  - `docs:gov` now includes the docs manifest gate
  - the repository has a checked-in docs manifest artifact that can drift-check
    cleanly
- Risks and mitigations:
  - risk: hidden ordering instability in file traversal still causes drift
  - mitigation: explicitly sort collected entries and test repeated generation
  - risk: `docs:gov` becomes noisier for local operators
  - mitigation: keep the manifest gate cheap and deterministic so failures are
    real drift, not clock noise
  - risk: the output path is unintuitive if left undocumented
  - mitigation: update the canonical guide in the same slice
- Out of scope:
  - changed-file docs fail-closed rules (`CDG-W3-2`)
  - single-writer discipline policy docs (`CDG-W3-3`)
  - merge-hotspot reduction (`CDG-W4-2`)
  - lifecycle-state planning index rules (`CDG-W4-5` / `CDG-W4-6`)
- Validation plan:
  - deterministic manifest regression test
  - `pnpm docs:gov:manifest`
  - `pnpm docs:gov`
  - `pnpm docs:ci`
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm lint:md`
  - `pnpm verify:prepush`
- Test coverage plan:
  - prove two consecutive generations on the same worktree are identical
  - prove the manifest contains stable sorted sections and no timestamp field
  - prove `docs:gov` now includes the manifest gate
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Refactored `tools/docs/generate-docs-manifest.ts` so manifest generation is
  deterministic:
  - removed the timestamp field from the output contract
  - sorted the markdown traversal input before classification
  - sorted ADR, evidence, normative, and status sections explicitly before
    serialization
  - made ADR ordering stable on `num` and `path`
  - fixed archived ADR classification so entries under `docs/archive/**` are
    recorded as archived
- Added `tools/ci/docs-manifest-contract.test.mjs` as the contract suite for
  the generator and command wiring. The new tests prove:
  - two consecutive generations on the same worktree are byte-identical
  - `generatedAt` is absent
  - section counts match summary counts
  - sorted sections remain path-stable
  - ADR archival metadata stays truthful for `docs/archive/**`
  - `docs:gov`, `docs:gov:manifest:check`, and `ci:docs` keep the local versus
    strict command split explicit
- Updated `package.json` so:
  - `pnpm docs:gov` now regenerates `docs/.manifest.json`
  - `pnpm docs:gov:manifest:check` is the strict manifest drift gate
  - `pnpm ci:docs` now fails on manifest drift through that explicit check
- Generated and tracked `docs/.manifest.json` as the governed machine-readable
  docs inventory, and refreshed
  `docs/planning/status/generated-code-state.md` so generated status surfaces
  reflect the current repository state after this slice.
- Updated the canonical CI/testing guide, the active consolidated RC-C2
  proposal, Lane C state, and this closeout so `CDG-W3-1` is visible from the
  canonical operator and planning surfaces.

## Validation Evidence

- `node --test tools/ci/docs-manifest-contract.test.mjs`
  - passed with `2/2` tests green
- `pnpm test:ci-tools`
  - passed with `52/52` tests green
- `pnpm exec prettier --check docs/guides/testing-and-ci-capabilities.md docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md docs/planning/state/agent-lane-c.yaml docs/planning/status/generated-code-state.md docs/planning/closeouts/20260423-rc-c2-wave-3a-docs-manifest-determinism-closeout.md docs/.manifest.json package.json tools/docs/generate-docs-manifest.ts tools/ci/docs-manifest-contract.test.mjs`
  - passed
- `pnpm ci:docs`
  - passed
  - `docs:planning:generated:check` regenerated the Lane C markdown view and
    workboard outputs, then verified deterministic planning-generated outputs
  - `docs:sync:check`, `docs:gov:manifest:check`, `docs:status:check`, and the
    other strict docs gates all passed
  - `docs:quality:check` and `docs:doctor` emitted inherited non-blocking
    warnings on pre-existing repository docs outside this slice, but the gate
    completed successfully
- `pnpm docs:ci`
  - failed outside this slice's touched files
  - root cause: `pnpm docs:gov:frontmatter` reports two pre-existing evidence
    docs without YAML frontmatter:
    - `docs/evidence/critical/ED-20260320-planner-r2-typed-graph-source-boundary.md`
    - `docs/evidence/critical/ED-20260331-mvp-a1-backend-contractual-inventory.md`
  - the manifest generator, manifest drift gate, and strict docs path all
    completed before that inherited failure
- `pnpm lint:md`
  - passed with `0` markdownlint errors across `1273` files
- `pnpm verify:prepush`
  - passed with exit `0`
  - `docs:planning:generated:check` stayed deterministic
  - `lint:md:changed` passed
  - the strict pre-push type-check selector chose full-root `pnpm type-check`
    because the branch still contains previously committed global TypeScript
    graph inputs in package manifests

## Gain Evidence

- The repository now has a deterministic tracked docs inventory artifact instead
  of a latent helper with clock noise.
- Local-friendly docs validation and strict docs drift enforcement are now
  explicit around the same manifest path:
  - `pnpm docs:gov` refreshes the tracked artifact
  - `pnpm ci:docs` fails if that artifact drifts
- Governance logic now converges on one machine-readable source of truth
  (`docs/.manifest.json`) that can participate in future docs automation
  without reintroducing timestamp churn or traversal-order instability.

## No-Debt / No-Stub Evidence

- No hook, docs gate, or CI gate was relaxed or bypassed.
- No placeholder manifest, fake pass path, or non-deterministic exception was
  introduced.
- The slice stayed in root docs tooling, root config, generated governance
  surfaces, and planning/docs artifacts; it did not create ARC-triggering code
  changes under contracts, adapters, engine, or planner paths.
- No hooks were bypassed.
