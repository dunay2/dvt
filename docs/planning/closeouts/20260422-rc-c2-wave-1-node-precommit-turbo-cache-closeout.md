---
slice: rc-c2-wave-1-node-precommit-turbo-cache
date: 2026-04-22
last_reviewed: 2026-04-22
gap: maintenance
author: AI (Codex)
---

# Closeout: RC-C2 wave 1 node baseline, pre-commit scoping, and Turbo CI cache

## Think-First

### Problem summary

The repository already shipped shared preflight tooling and a Turbo-backed root
`build`, but the operator-facing efficiency story still had three low-risk,
high-return gaps:

- local Node selection still drifted from the actual CI/runtime baseline
- `precommit` always paid the full `pnpm lint:determinism` cost, even on
  unrelated commits
- the shared CI setup cached pnpm and `node_modules`, but not the existing
  `.turbo` output path for the root build graph

The measured local cost of the current determinism gate was non-trivial:
`pnpm lint:determinism` took `29566 ms` on the current workstation before this
slice changed pre-commit scoping.

### Root cause

The prior CI/delivery hardening landed in intentionally narrow slices:

- the root build orchestrator slice stopped at Turbo-backed `build`
- the RC-C2 operational slice focused on preflight and first-red triage
- the determinism gate remained globally wired in pre-commit because no staged
  file classifier existed for that specific guard

That left the repo with real improvements, but without a small execute-now wave
that converted the verified audit findings into a measured operator win.

### Constraints and invariants

- `AGENTS.md` requires canonical planning surfaces, truthful evidence, and
  `pnpm verify:prepush` before claiming readiness.
- `docs/guides/ai-work-protocol.md` requires think-first and
  pre-implementation material before presenting the slice as complete.
- `docs/planning/state/planning-control-tower.md` requires Lane C planning
  state and closeout surfaces to stay aligned.
- `docs/architecture/components/engine/dev/determinism-tooling.md` keeps
  deterministic-runtime enforcement mandatory for engine source and Temporal
  workflow code, so this slice must scope the guard rather than weaken it.
- `docs/planning/closeouts/20260418-rc-c2-turbo-build-orchestrator-closeout.md`
  explicitly kept Turbo `test`, Turbo `typecheck`, remote cache ownership, and
  TypeScript project references out of scope of the already-shipped root-build
  slice.

### Options considered

- keep the current pre-commit and Node posture unchanged
- execute the full 2026-04-22 audit in one branch
- ship the low-risk wave now and leave Turbo `test` / `typecheck`, coverage,
  and project references to later governed waves

### Selected option and rationale

Ship the low-risk wave now.

This delivers a real operator win without reopening the riskier parts of the
audit prematurely. The repository gets baseline alignment, avoided pre-commit
waste, and CI cache reuse for the existing root Turbo path without pretending
that package-level `typecheck` ownership or TypeScript project references are
already ready.

### Rejected alternatives

- keep everything as-is: rejected because the cost and drift are already proven
- one-branch audit rollout: rejected because it mixes low-risk config alignment
  with higher-risk compiler and task-graph work

## Pre-Implementation Brief

- Mode: `Full`
- Scope:
  - add local Node 22 pin files
  - align root `engines.node` with the real CI/runtime baseline
  - add a staged-file classifier for the deterministic-runtime pre-commit gate
  - keep the determinism guard fail-closed for engine source, Temporal
    workflows, and governing config inputs
  - add `.turbo` cache restore support to the shared CI setup action
  - update the canonical testing/CI guide
- Touched files or paths:
  - `.node-version`
  - `.nvmrc`
  - `package.json`
  - `scripts/run-determinism-precommit.cjs`
  - `tools/ci/run-determinism-precommit.test.mjs`
  - `.github/actions/setup-node-pnpm/action.yml`
  - `docs/guides/testing-and-ci-capabilities.md`
  - Lane C planning and closeout surfaces for traceability
- Expected outcome:
  - local and CI Node expectations are aligned at Node 22
  - unrelated commits no longer pay the full determinism gate cost in pre-commit
  - engine and Temporal workflow changes still trigger the same determinism lint
    command as before
  - CI can reuse the root Turbo cache path already owned by `pnpm build`
- Risks and mitigations:
  - risk: staged-file scoping misses a sensitive path
  - mitigation: keep the scope conservative and grounded in the determinism
    tooling doc plus config inputs that govern the gate
  - risk: `.turbo` cache adds complexity without benefit
  - mitigation: limit the change to the already-shipped root build path and
    record the outcome as cache reuse support, not as a fabricated timing claim
  - risk: Node pin changes drift from docs or CI
  - mitigation: update the canonical guide in the same slice
- Validation plan:
  - red/green unit test for the staged-file classifier
  - skip-path and run-path smoke checks for the new helper
  - markdown/docs validation for the updated canonical guide
  - `pnpm verify:prepush` for the integrated closeout baseline
- Test coverage plan:
  - unrelated staged files should skip the determinism gate
  - engine source changes should trigger the gate
  - Temporal workflow changes should trigger the gate
  - non-workflow Temporal adapter changes should not trigger the gate
  - config-input changes should remain fail-closed
- Libraries evaluated:
  - no new library was required

## Implementation Log

- Added `.node-version` and `.nvmrc`, both pinned to `22`.
- Updated `package.json` so `engines.node` now requires `>=22.0.0`.
- Added `scripts/run-determinism-precommit.cjs` as the staged-file classifier
  and command wrapper for the deterministic-runtime pre-commit gate.
- Added `tools/ci/run-determinism-precommit.test.mjs` and drove the helper
  through a red/green cycle before wiring it into the root `precommit` script.
- Changed `precommit` so `lint-staged` still runs on every commit, while the
  determinism gate now executes only for engine source, Temporal workflows, or
  governing config inputs.
- Added `.turbo` cache restore support to
  `.github/actions/setup-node-pnpm/action.yml`.
- Added a file-local YAML schema directive to
  `.github/actions/setup-node-pnpm/action.yml` so editors validate the file as
  a GitHub composite action instead of incorrectly applying workflow-only
  diagnostics.
- Updated `docs/guides/testing-and-ci-capabilities.md` so the canonical guide
  reflects the Node 22 baseline, the scoped pre-commit determinism gate, and
  the shared CI Turbo cache path.
- Updated the active CI/delivery proposal and Lane C planning surfaces so this
  slice is tracked as the shipped Wave 1 continuation of `RC-C2`.

## Validation Evidence

- `node --test tools/ci/run-determinism-precommit.test.mjs`
  - first run: failed in red state with `MODULE_NOT_FOUND` for the missing
    helper
  - second run after implementation: passed with `5/5` tests green
- `node scripts/run-determinism-precommit.cjs docs/guides/testing-and-ci-capabilities.md`
  - passed and printed the skip-path message for an unrelated docs file
- `node scripts/run-determinism-precommit.cjs packages/@dvt/engine/src/security/hostRiskClassifier.ts`
  - passed and executed the real `pnpm lint:determinism` command
- `pnpm test:ci-tools`
  - passed with `38/38` tests green
- `pnpm exec prettier --check .github/actions/setup-node-pnpm/action.yml docs/planning/closeouts/20260422-rc-c2-wave-1-node-precommit-turbo-cache-closeout.md`
  - passed with `All matched files use Prettier code style!`
- `pnpm lint:md`
  - passed with `0` markdownlint errors across `1268` files
- `pnpm docs:gov:locations`
  - passed with `OK`
- `pnpm docs:quality:check`
  - passed with `OK`
  - emitted inherited non-blocking warnings for pre-existing non-English
    archive and planning docs outside this slice
- `pnpm docs:sync`
  - passed
- `pnpm docs:workboard:generate`
  - passed
- `pnpm verify:prepush`
  - passed with exit `0`
  - note: this command uses changed-only guards and did not see the current
    unstaged follow-up files, so the explicit Prettier and full docs checks
    above are the real validation evidence for this follow-up

## Gain Evidence

- Measured baseline before scoping:
  - `pnpm lint:determinism` took `29566 ms`
- Verified avoided-work path after scoping:
  - a docs-only file now skips the determinism gate entirely in pre-commit
- Verified fail-closed sensitive path:
  - an engine source path still executes the full determinism gate
- Qualitative alignment gain:
  - local Node pin files, `engines.node`, and the shared CI setup now point to
    the same Node 22 baseline
- Qualitative CI gain:
  - the shared CI setup can now restore `.turbo` for the already-governed root
    Turbo build path
  - no fabricated local timing claim is recorded for this part, because reuse is
    only observable in GitHub Actions runs

## No-Debt / No-Stub Evidence

- No hooks were bypassed.
- No quality gate was removed or relaxed.
- No stub, placeholder, or fake success path was introduced.
- The determinism guard remains blocking for the engine and Temporal workflow
  surfaces that the canonical determinism tooling doc defines as sensitive.
