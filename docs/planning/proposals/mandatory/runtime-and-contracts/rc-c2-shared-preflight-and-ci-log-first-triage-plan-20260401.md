---
title: RC-C2 Shared Preflight And CI Log-First Triage Plan
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-01
planning_type: proposal
---

# RC-C2 Shared Preflight And CI Log-First Triage Plan

## Task

Implement `RC-C2` as a shared repo-ready operational pattern for preflight and
first-red CI triage, validated first through Lane C and measured through a
structured adoption log.

References:

- `docs/planning/state/agent-lane-c.yaml`
- `docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md`
- `scripts/hygiene.ps1`
- `docs/guides/testing-and-ci-capabilities.md`

## Rationale

The repo already has strong correctness gates, but preflight predictability and
CI triage discipline are still partially manual. The review of recent Lane C
work showed repeated waste in four places:

1. push-time format/lint surprises
2. repeated branch triage without a default hygiene path
3. PR-watch loops before root cause extraction
4. no structured, reusable measurement of round reduction

`RC-C2` closes that gap without introducing a new CI gate or a second local
tooling surface.

## Think-First Analysis

- Problem summary:
  the repo has the raw ingredients for preflight discipline (`verify:prepush`,
  docs drift gates, `hygiene.ps1`, `gh`), but not one canonical operational
  path that teams follow consistently.
- Root cause:
  preflight and CI triage guidance is split across a review, a contribution
  note, and script comments, so the behavior is optional and hard to measure.
- Constraints and invariants:
  - `AGENTS.md` requires canonical repo governance and `pnpm verify:prepush`
    before claiming readiness
  - `docs/guides/ai-work-protocol.md` requires planning surfaces, validation,
    and no hidden workflow shortcuts
  - `docs/planning/state/planning-control-tower.md` requires planning changes
    to update the lane registry and linked proposal/closeout surfaces
  - no fake adoption evidence or placeholder closeout may be introduced
- Options considered:
  - docs-only workflow reminder
  - new standalone preflight script
  - extend `hygiene.ps1` and back it with a testable Node helper plus a
    structured adoption log
- Selected option and rationale:
  extend `hygiene.ps1`. The script already owns branch hygiene and is the
  natural operator entrypoint. Adding a Node helper keeps GitHub parsing
  deterministic and testable without duplicating shell logic.
- Rejected alternatives:
  - docs-only: insufficient because the missing behavior is partially
    operational, not just descriptive
  - new wrapper script: duplicates an existing surface and weakens adoption

## Scope

In scope:

- extend `scripts/hygiene.ps1` with shared preflight and log-first PR triage
- add a repo-native helper under `tools/ci/` with unit tests
- add a canonical guide for preflight and CI triage
- add YAML-backed adoption tracking plus a readable status companion
- update Lane C planning state and the supporting proposal/closeout surfaces

Out of scope:

- new blocking CI jobs
- changes to merge gates or workflow routing logic
- automatic GitHub metrics harvesting
- claiming `RC-C2` done before 3 qualifying Lane C cycles are logged

## Execution Plan

1. Extend `hygiene.ps1` with `-Preflight`, `-SliceCommand`,
   `-PrCheckSummary`, and `-LogFirstTriage`.
2. Add a small `tools/ci/` helper for PR check classification, first failing
   GitHub Actions job selection, and snippet extraction.
3. Add unit tests for payload classification and deterministic failed-job
   selection.
4. Publish `docs/guides/pr-preflight-and-ci-triage.md` as the canonical
   operator guide.
5. Update existing docs to point to the guide instead of repeating partial
   recipes.
6. Add YAML-backed adoption tracking and a readable status companion.
7. Move `RC-C2` from `queued` to `review` in Lane C and attach the new
   evidence surfaces.
8. Regenerate docs/planning indexes and run the required validation baseline.

## DoD Checklist (Current Slice)

- [x] `hygiene.ps1` supports shared preflight and PR triage modes
- [x] GitHub Actions check classification is implemented in `tools/ci/`
- [x] helper unit tests cover success, pending, external, and first-failure
      selection
- [x] canonical guide published under `docs/guides/`
- [x] YAML adoption log and readable status companion published
- [x] `RC-C2` lane state updated to reflect shipped tooling but open adoption
- [x] docs indexes and planning views regenerated
- [x] mechanical adoption closure check added as `pnpm docs:ai-efficiency:check`
- [ ] 3 consecutive Lane C PR cycles logged
- [ ] > =20% round reduction demonstrated
- [ ] task marked `done`

## Validation Commands

```bash
node --test tools/ci/pr-check-triage.test.mjs
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight
powershell -ExecutionPolicy Bypass -File .\scripts\hygiene.ps1 -BaseBranch main -Preflight -SliceCommand "pnpm pr:validate-title \"Fix(api): Example\""
pnpm test:ci-tools
pnpm test:ai-efficiency:adoption
pnpm docs:ai-efficiency:check
pnpm docs:sync
pnpm docs:planning:lanes:generate
pnpm docs:workboard:generate
pnpm verify:prepush
```

## Tracking Log

| Date       | Owner  | Status        | Notes                                                                 |
| ---------- | ------ | ------------- | --------------------------------------------------------------------- |
| 2026-03-28 | Lane C | Review basis  | Efficiency review established the baseline, savings model, and rules. |
| 2026-04-01 | Lane C | Implemented   | Shared tooling, guide, and structured tracking were added.            |
| 2026-04-01 | Lane C | Adoption open | Task remains open until 3 qualifying Lane C cycles are logged.        |
| 2026-05-15 | Lane C | Gate hardened | `docs:ai-efficiency:check` now prevents narrative-only closure.       |

## 2026-05-15 Adoption Gate Mechanization

```feature-mechanization
version: 1
featureId: RC-C2-AI-EFFICIENCY-ADOPTION-GATE
mechanizationStatus: implemented
noHumanDecisionsRemaining: true
implementationPlan: docs/planning/proposals/mandatory/runtime-and-contracts/rc-c2-shared-preflight-and-ci-log-first-triage-plan-20260401.md
componentGuides:
  - docs/planning/status/ai-efficiency-adoption-status.md
userStories:
  - docs/planning/status/ai-efficiency-adoption-status.md
governingSources:
  - AGENTS.md
  - docs/planning/status/governance-document-rule-inventory.md
  - docs/guides/ai-work-protocol.md
  - docs/architecture/command-query-rail-governance.md
  - docs/architecture/fowler-opportunity-planning-governance.md
  - docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md
  - docs/guides/pr-preflight-and-ci-triage.md
allowedImplementationSurfaces:
  - buzon/20260515-codex-fowler-rc-c2-adoption-gate-analysis.md
  - docs/.manifest.json
  - docs/planning/closeouts/20260515-rc-c2-adoption-gate-hardening-closeout.md
  - docs/planning/proposals/mandatory/runtime-and-contracts/rc-c2-shared-preflight-and-ci-log-first-triage-plan-20260401.md
  - docs/planning/status/ai-efficiency-adoption-log.yaml
  - docs/planning/status/ai-efficiency-adoption-status.md
  - package.json
  - scripts/check-ai-efficiency-adoption.cjs
  - scripts/check-ai-efficiency-adoption.test.cjs
  - tools/ci/policy/workflow-scope.json
  - tools/ci/repository-command-catalog.mjs
  - tools/ci/repository-command-catalog.test.mjs
  - tools/ci/scope-config.mjs
forbiddenImplementationSurfaces:
  - apps/**
  - packages/@dvt/**
commandQueryRails:
  - name: RC-C2 AI efficiency adoption status query
    type: query
    dddOwner: CI delivery governance
domainObjects:
  - name: AI efficiency adoption log
    type: governed planning status record
    owner: docs/planning/status/ai-efficiency-adoption-log.yaml
  - name: Repository command catalog
    type: command classification policy
    owner: tools/ci/repository-command-catalog.mjs
fowlerSignals:
  - Replaces narrative task closure with an executable policy query.
  - Keeps adoption measurement separate from CI workflow execution.
  - Routes new command surfaces through the repository command catalog.
architectureGuards:
  - pnpm test:ai-efficiency:adoption
  - pnpm test:ci-tools
  - pnpm docs:feature-mechanization:implementation
cypressFlows:
  - N/A - CI governance and planning status only
completionGate:
  - pnpm test:ai-efficiency:adoption
  - node scripts/check-ai-efficiency-adoption.cjs
  - pnpm test:ci-tools
  - pnpm governance:refresh
  - pnpm docs:feature-mechanization:implementation
  - pnpm verify:prepush
redGreenCycles:
  - id: rc-c2-adoption-log-fail-closed
    redTest: node --test scripts/check-ai-efficiency-adoption.test.cjs
    expectedFailure: adoption checker module does not exist and cannot prove the 0/3 open state.
    patchSurfaces:
      - scripts/check-ai-efficiency-adoption.cjs
      - scripts/check-ai-efficiency-adoption.test.cjs
    greenTest: pnpm test:ai-efficiency:adoption
  - id: rc-c2-command-catalog-classification
    redTest: pnpm test:ci-tools
    expectedFailure: repository command catalog reports scripts/check-ai-efficiency-adoption.cjs as unclassified.
    patchSurfaces:
      - tools/ci/repository-command-catalog.mjs
      - tools/ci/repository-command-catalog.test.mjs
    greenTest: pnpm test:ci-tools
  - id: temporal-dbt-plugin-workspace-scope
    redTest: pnpm test:ci-tools
    expectedFailure: workflow scope tests report @dvt/temporal-dbt-plugin missing from workspace build/test matrix ownership.
    patchSurfaces:
      - tools/ci/policy/workflow-scope.json
      - tools/ci/scope-config.mjs
    greenTest: pnpm test:ci-tools
symbols:
  - name: analyzeAdoptionLog
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Computes the closure window from the log rather than from prose.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: calculateRcu
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Encapsulates the RC-C2 cost model in one reusable policy function.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: defaultLogPath
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Binds the checker to the canonical YAML status record.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: fs
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Reads the canonical adoption log without inventing a second state store.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: isAcceptedTriageValue
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Keeps first-red triage vocabulary explicit and bounded.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: isQualifyingCycle
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Encapsulates one adoption-cycle qualification rule.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: loadAdoptionLog
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Separates file loading from policy evaluation.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: normalizeBaseline
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Keeps YAML and test fixture field styles compatible without duplicating rules.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: normalizeCycle
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Gives each cycle a single normalized shape before qualification.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: normalizeTargets
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Keeps threshold semantics in one policy boundary.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: numberFrom
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Fails closed on malformed numeric evidence.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: path
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Resolves the canonical log path relative to the repository root.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: readMetric
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Localizes snake_case and camelCase compatibility to parsing only.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: runCli
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Provides the operator-facing query command without embedding policy in package scripts.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: yaml
    path: scripts/check-ai-efficiency-adoption.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Parses the governed YAML adoption log through a structured parser.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
  - name: assert
    path: scripts/check-ai-efficiency-adoption.test.cjs
    dddOwner: RC-C2 AI efficiency adoption status query
    cqRails: [RC-C2 AI efficiency adoption status query]
    fowlerSignals: [Keeps the adoption policy test assertions explicit.]
    architectureGuard: pnpm test:ai-efficiency:adoption
    cypressCoverage: N/A
    unitTests: [pnpm test:ai-efficiency:adoption]
```

## Risks And Coordination

- `gh` output shape can drift; mitigation is to keep the parsing logic in one
  helper with unit coverage.
- Over-automation must not hide judgment; destructive branch cleanup remains
  opt-in.
- The closure window cannot be fabricated from historical PRs that did not use
  the shipped preflight flow.
