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

## Risks And Coordination

- `gh` output shape can drift; mitigation is to keep the parsing logic in one
  helper with unit coverage.
- Over-automation must not hide judgment; destructive branch cleanup remains
  opt-in.
- The closure window cannot be fabricated from historical PRs that did not use
  the shipped preflight flow.
