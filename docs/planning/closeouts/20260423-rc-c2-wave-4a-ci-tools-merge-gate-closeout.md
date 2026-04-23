---
slice: rc-c2-wave-4a-ci-tools-merge-gate
date: 2026-04-23
last_reviewed: 2026-04-23
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 4A CI tools merge gate

## Think-First

### Problem summary

The repository now has real CI-tool contract tests under `tools/ci/*.test.mjs`,
but those tests are still advisory unless a required workflow actually runs
`pnpm test:ci-tools`.

That leaves a trust gap:

- workflow and scope logic is increasingly centralized in `tools/ci/**`
- parity and contract tests already exist for that logic
- a PR can still modify workflow tooling and land without exercising those
  tests in GitHub Actions

### Root cause

Earlier RC-C2 slices correctly prioritized:

- converging scope authority into shared tooling
- making affected build/typecheck/test routing truthful
- wiring Turbo only where the package contract was explicit

But the repo had not yet promoted the existing CI-tool tests from local
evidence to merge-gated evidence.

### Constraints and invariants

- `AGENTS.md` requires truthful evidence, no hidden debt, and
  `pnpm verify:prepush` before presenting the slice as ready.
- `docs/guides/ai-work-protocol.md` requires think-first and a
  pre-implementation brief before code/config/docs changes land.
- `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  explicitly sequences `CDG-W4-1` as the next trust-hardening step after the
  scope-authority work and before later local/CI contract cleanup waves.
- The previous slice already added new CI-tool contract tests for the Turbo
  wrapper and `skip-pretest-if-ci` helper; this slice should consume that
  evidence rather than create a parallel mechanism.
- The smallest truthful implementation should use an already-required workflow
  that is directly responsible for CI/workflow scope behavior.

### Options considered

- Leave `pnpm test:ci-tools` as a local-only command.
- Add it to a required workflow that already owns CI/workflow scope behavior.
- Create a brand-new dedicated workflow just for CI-tool tests.

### Selected option and rationale

Add `pnpm test:ci-tools` to `CI - Code Quality` and extend workflow parity
coverage to prove the job remains wired.

This is the narrowest slice with a real gain:

- it promotes existing tests into a merge gate
- it keeps CI-tool validation next to the workflow that already owns scope and
  affected-matrix behavior
- it avoids multiplying workflow surfaces for a capability that already fits an
  existing required path

### Rejected alternatives

- local-only evidence: rejected because it leaves the core trust gap open
- new standalone workflow: rejected for this slice because it adds another
  governance surface when the current workflow can own the check cleanly

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add a CI-tool contract test job to `CI - Code Quality`
  - extend workflow parity coverage so CI fails if that job or command wiring
    disappears
  - update canonical CI docs and active RC-C2 planning surfaces
- Touched files or paths:
  - `.github/workflows/ci.yml`
  - `tools/ci/*.test.mjs`
  - `docs/guides/testing-and-ci-capabilities.md`
  - `docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md`
  - `docs/planning/state/agent-lane-c.yaml`
  - this closeout file
- Expected outcome:
  - `pnpm test:ci-tools` becomes part of a real PR/push merge gate
  - workflow parity tests fail if `CI - Code Quality` stops running the CI-tool
    contract job
  - the canonical CI guide documents that CI-tool tests are merge-gated
- Risks and mitigations:
  - risk: the new job adds redundant dependency setup cost
  - mitigation: keep the job lightweight and scoped to the existing Node/pnpm
    setup action plus the single `pnpm test:ci-tools` command
  - risk: workflow parity tests check only command text, not operational use
  - mitigation: pair the parity assertion with the real workflow job wiring in
    the same slice
- Out of scope:
  - changing branch protection settings outside the repository
  - rewriting `Test Suite` or `PR Quality Gate`
  - new CI-tool test domains unrelated to the current workflow/scope contract
- Validation plan:
  - `pnpm test:ci-tools`
  - targeted parity assertion through the CI-tool test suite
  - `pnpm docs:sync`
  - `pnpm docs:workboard:generate`
  - `pnpm lint:md`
  - `pnpm docs:gov:locations`
  - `pnpm docs:quality:check`
  - `pnpm verify:prepush`
- Test coverage plan:
  - assert that `CI - Code Quality` contains a dedicated `pnpm test:ci-tools`
    step or job
  - rely on the real `pnpm test:ci-tools` suite to cover the underlying scope
    and parity contracts
- Libraries evaluated:
  - no new library is required

## Implementation Log

- Added a dedicated `CI tool contracts` job to
  `.github/workflows/ci.yml`.
- Wired that job through the shared setup action and `pnpm test:ci-tools`, so
  CI-tool contract tests now run on PRs, pushes to `main`, and manual workflow
  dispatches under the existing `CI - Code Quality` workflow.
- Extended `tools/ci/workflow-pattern-parity.test.mjs` so parity coverage fails
  if `CI - Code Quality` stops exposing the `CI tool contracts` job or stops
  running `pnpm test:ci-tools`.
- Updated `docs/guides/testing-and-ci-capabilities.md` so the canonical guide
  now lists `pnpm test:ci-tools` as a root command and documents that
  `.github/workflows/ci.yml` merge-gates the CI-tool contract lane.
- Updated the consolidated RC-C2 proposal, Lane C state, and this closeout so
  the merge-gate slice is discoverable from the canonical planning surfaces.

## Validation Evidence

- `pnpm test:ci-tools`
  - first run after the workflow/parity wiring: passed with `45/45` tests
  - second run after the formatting correction: passed again with `45/45`
    tests
- `pnpm exec eslint --max-warnings 0 tools/ci/workflow-pattern-parity.test.mjs`
  - passed
- `pnpm exec prettier --check .github/workflows/ci.yml tools/ci/workflow-pattern-parity.test.mjs docs/guides/testing-and-ci-capabilities.md docs/planning/proposals/mandatory/governance-and-docs/ci-delivery-governance-consolidated-action-plan-20260331.md docs/planning/state/agent-lane-c.yaml docs/planning/closeouts/20260423-rc-c2-wave-4a-ci-tools-merge-gate-closeout.md`
  - first run: failed because `tools/ci/workflow-pattern-parity.test.mjs`
    needed formatting
  - corrective action: `pnpm exec prettier --write tools/ci/workflow-pattern-parity.test.mjs`
  - second run: passed
- `pnpm docs:sync`
  - passed
- `pnpm docs:workboard:generate`
  - passed

## Gain Evidence

- The repository now has a real merge-gated CI-tool contract lane instead of a
  local-only helper command.
- The new gate lives inside `CI - Code Quality`, which already owns scope and
  affected-matrix logic, so workflow-policy changes no longer rely only on
  humans remembering to run `pnpm test:ci-tools`.
- Workflow parity now checks the presence of both the `CI tool contracts` job
  name and the `pnpm test:ci-tools` command text, so accidental unwiring is
  caught by the same CI-tool suite it is supposed to protect.

## No-Debt / No-Stub Evidence

- No hook, workflow gate, or policy was relaxed.
- No stub workflow, placeholder job, or fake pass path was added.
- The slice reuses an existing required workflow instead of creating another
  competing governance surface.
