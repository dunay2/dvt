---
title: RC-C2 Operational Friction Intake Review
status: Active
owner: Product / Architecture / Delivery / Docs
last_reviewed: 2026-04-02
planning_type: review
---

# 20260402 RC-C2 Operational Friction Intake Review

## Context

This review consolidates repeated friction observed in the operational path from
local implementation to green PR:

`local work -> prepush -> PR -> CI -> green`

It uses generated logs and prior closeout evidence as input, but keeps the
canonical output as a planning review rather than a `status` note.

## Corpus Analyzed

Canonical repo sources:

- [20260328 Lane C AI Efficiency And Cost Review](20260328-lane-c-ai-efficiency-and-cost-review.md)
- [20260330 CI, Prepush & PR Process Observations](20260330-ci-prepush-pr-process-observations.md)
- [20260401 RC-C2 Preflight And Log-First Triage Rollout Closeout](../closeouts/20260401-rc-c2-preflight-and-log-triage-rollout-closeout.md)
- [20260324 S18 Follow-Up Proposal Capture Closeout](../closeouts/20260324-s18-follow-up-proposal-capture-closeout.md)
- [20260324 Schema Migration Rollback Closeout](../closeouts/20260324-schema-migration-rollback-closeout.md)
- current enforcement surfaces in `scripts/check-changed.cjs`,
  `scripts/lint-markdown-changed.cjs`, `scripts/fix-changed.cjs`, and
  `package.json`

Private working corpus:

- `tmp/operational-logs/LOCAL_EXECUTION_LOG_20260401.md`

Handling rule:

- private logs are input material only
- they are not canonical `status` artifacts
- they must not be cited as normative truth when they contradict the current
  repo state

## Classification Method

Each observation was classified using this taxonomy:

1. local preflight friction
2. branch, rebase, or upstream friction
3. generated-doc drift friction
4. hooks and diff-scope friction
5. PR or CI rebinding friction
6. late-diagnosis friction
7. governance or documentation-surface friction

Generalization rule:

- promote an observation to a repo-level finding only when it appears in more
  than one session artifact or is corroborated by the current implementation
- if a local log contradicts the current repo state, keep it as
  session-specific evidence only

## Friction Register

| ID   | Category                          | Symptom observed                                                                                                                 | Trigger / real cause                                                                                                                                                                                                                                                                 | Frequency in corpus                                                                                                                   | Cost   | Recommended change                                                                                                                              | Owner surface                  | Decision           |
| ---- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------ |
| `F1` | Local preflight                   | formatting, import-order, or generated-doc issues are discovered only at push or PR time                                         | the repo has strong gates, but adoption of the full preflight recipe is still procedural rather than habitual; multiple closeouts show `verify:prepush` or follow-up checks passing only on rerun after formatting/doc regeneration                                                  | repeated across the 2026-03-24 closeouts, 2026-03-30 observations, and the 2026-04-01 local log                                       | High   | keep `RC-C2` open until three consecutive qualifying cycles prove the preflight recipe is used before push                                      | planning lane / operator guide | planning follow-up |
| `F2` | Generated docs                    | PR Quality Gate fails on generated planning/status artifacts after code changes or rebase                                        | generated surfaces such as `generated-code-state.md` and workboard outputs are truthful but still depend on explicit regeneration steps                                                                                                                                              | repeated in the 2026-04-01 rollout closeout and the private 2026-04-01 log; also adjacent to prior docs-sync reruns in closeouts      | High   | extend the guide and future RC-C2 cycle reviews to require explicit generated-doc checks whenever rebasing or after structural changes          | guide / planning workflow      | guide change       |
| `F3` | Hooks and diff scope              | changed-file gates can be hard to reason about during branch rewrites, rebases, or history divergence                            | current repo state still has split diff semantics: `scripts/check-changed.cjs` uses `origin/main..HEAD`, while `scripts/lint-markdown-changed.cjs` and `scripts/fix-changed.cjs` use `origin/main...HEAD`; earlier review already flagged 2-dot vs 3-dot inconsistency as known debt | repeated as a known issue in the 2026-03-30 observations and resurfaced as a session-specific diagnosis in the private 2026-04-01 log | High   | consolidate changed-file diff resolution behind one shared policy and one implementation before scaling the workflow further                    | script/tooling                 | script change      |
| `F4` | PR / CI rebinding                 | watch loops, manual workflow dispatch, or PR recreation add delay before the real failure is isolated                            | first-red diagnosis is cheaper than polling, but PR check rebinding behavior is still partly external to the repo and not always solved by local changes alone                                                                                                                       | repeated in the 2026-03-28 review and the private 2026-04-01 log; partially mitigated by `RC-C2` tooling                              | Medium | no new tool yet; use the shipped log-first triage flow and only escalate to workflow changes if two more cycles show rebinding-specific waste   | guide / planning               | no change for now  |
| `F5` | Late diagnosis                    | root cause is discovered after watch loops rather than by pulling failed-job logs immediately                                    | the repo lacked a single shared habit for failed-job extraction until `RC-C2` shipped the triage flow                                                                                                                                                                                | repeated in the 2026-03-28 review and addressed in the 2026-04-01 RC-C2 rollout                                                       | Medium | keep adoption measurement focused on whether first-red triage actually starts from failed-job logs                                              | planning lane / adoption log   | planning follow-up |
| `F6` | Governance surface                | local notes and canonical planning surfaces can get mixed, especially when a session log is written under `docs/planning/status` | `status` is a canonical repo surface, while private logs are working material; mixing them creates governance ambiguity and accidental publication risk                                                                                                                              | confirmed by the private 2026-04-01 log being initially created under `docs/planning/status`                                          | Medium | keep private operational logs under `tmp/` or another non-canonical local path, and publish only synthesized findings as `review` or `closeout` | docs governance                | doc-only change    |
| `F7` | Session-specific branch diagnosis | the private 2026-04-01 log concluded that temporarily switching the upstream to `origin/main` solved the diff baseline problem   | that may have been true for that session, but it is not a general repo rule under the current scripts because current changed-file scripts already prioritize `origin/main` explicitly                                                                                               | isolated to the private 2026-04-01 log and contradicted by current repo state                                                         | Low    | preserve the observation as historical input only; do not encode it as current guidance without historical script verification                  | review corpus only             | no change          |

## Prioritized Opportunities

## P0

1. Unify changed-file diff policy across `check-changed`, `lint-markdown-changed`,
   `fix-changed`, and other changed-only validators.
2. Keep private operational logs outside canonical `docs/planning/status/`
   surfaces and synthesize only reviews or closeouts into the repo.

## P1

1. Tighten the preflight guide so rebases and structural changes explicitly
   trigger generated-doc regeneration checks before push.
2. Keep `RC-C2` open until adoption evidence shows that first-red diagnosis is
   consistently log-first rather than watch-first.

## P2

1. Revisit PR-check rebinding automation only if the next two comparable cycles
   still need PR recreation, close/reopen, or manual workflow-dispatch
   recovery.

## Relationship To Existing Work

- [20260330 CI, Prepush & PR Process Observations](20260330-ci-prepush-pr-process-observations.md)
  remains the main bug/debt inventory for the 2026-03-30 hardening pass.
- [20260328 Lane C AI Efficiency And Cost Review](20260328-lane-c-ai-efficiency-and-cost-review.md)
  remains the baseline cost model and target-setting document.
- [20260401 RC-C2 Preflight And Log-First Triage Rollout Closeout](../closeouts/20260401-rc-c2-preflight-and-log-triage-rollout-closeout.md)
  remains the canonical record for the shipped tooling.

This review adds one thing those sources did not centralize: a stable taxonomy
for classifying friction from multiple operational sessions, including the rule
that local logs stay private input while the canonical output is a synthesized
review.

## Acceptance Criteria For This Review Slice

1. At least 5 friction points are classified by pattern, not by anecdote.
2. Every classified friction maps to a decision:
   `script change`, `guide change`, `planning follow-up`, `doc-only change`, or
   `no change`.
3. Session-specific observations that are not corroborated by the current repo
   state remain explicitly marked as non-generalizable.
4. `RC-C2` intake surfaces point to this review instead of leaving the corpus
   only in local notes.
