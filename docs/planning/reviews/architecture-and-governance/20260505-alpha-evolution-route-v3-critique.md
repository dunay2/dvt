---
title: Critique v3 - Internal Alpha Product Route Review
status: Accepted
owner: Architecture
last_reviewed: 2026-05-05
planning_type: review
---

# Critique v3 - Internal Alpha Product Route Review

**Date:** 2026-05-05
**Reviewer role:** Principal / Staff Software Architect (no-filter critique)
**Target document:** [`20260504-internal-alpha-evolution-route.md`](./20260504-internal-alpha-evolution-route.md)
**Target version:** v3 - `Internal Alpha Product Route Review` after closing the
v2 critique (post `Depends on`, `Owning lanes`, `traceability:adr0`,
`Plan/Run Readiness Blockers`, `Open Risks Riding Into Alpha`, fixture-status
admission, recovery-stage clarification).

**Method:** this pass verifies the document against actual source under
`apps/api/src/`, `docs/planning/proposals/mandatory/frontend-and-ux/`, and
`docs/risk-register/quality/`. Findings here are source-grounded, not
documentation-grounded.

**Posture:** accepted intake history. Active route authority now lives in the
internal alpha route review and
`docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md`.
Do not use this critique as an active backlog or implementation authority.

---

## v2 Critique Closure Summary

All 10 items from v2 closed:

| #   | v2 item                             | v3 status                                                                                                                                              |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | Gate decidability                   | Closed - "The gate is not decidable while `Gap` or `Partial` stages lack a concrete rail, component owner, lane owner, and `traceability:adr0` proof." |
| B   | Closure ordering                    | Closed - `Depends on` column added to `Child Slices`.                                                                                                  |
| C   | `Recovery states` stage vs concern  | Closed - Reframed as cross-stage consistency check.                                                                                                    |
| D   | Evidence with PR link               | Closed - `Landed in: #1105` column added.                                                                                                              |
| E   | Lane ownership                      | Closed - `Owning lanes` column added.                                                                                                                  |
| F   | `traceability:adr0` in closure rule | Closed - Appended to every slice closure rule.                                                                                                         |
| G   | `Plan/run readiness` enumeration    | Closed - `Plan/Run Readiness Blockers` section enumerates the five causes.                                                                             |
| H   | Risk-register linkage               | Closed - `Open Risks Riding Into Alpha` with `R-20260411`.                                                                                             |
| 9   | Cypress fixture (carryover)         | Closed - Admitted no fixture is named yet; closure condition stated.                                                                                   |
| 10  | Open Opportunities routing suffix   | Closed - Each opportunity has a routing suffix.                                                                                                        |

Closure rate is real. The shape of the document is now adequate. The remaining
defects are **source-fidelity**, **specification depth**, and **scope coverage**
issues, not structural omissions.

---

## New Defects Surfaced by Source Verification

### A. Three canonical source files missing from the wiring

The doc names `IAccessDecisionService` and `workspaceFilesRoutes.ts`. Source has
**three** canonical files for this rail:

1. `apps/api/src/application/ports/accessDecision.ts` - port + denied-reason enum.
2. `apps/api/src/application/ports/accessDecisionActions.ts` - action vocabulary
   (`AUTHORIZATION_ACTION_NAME.workspaceFilesView`, `AUTHORIZATION_ACTION.workspaceFilesView`).
3. `apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts` -
   centralized rail metadata that already binds the `workspaceFiles` rail to
   `tenant/project/environment scope` and to its read models, ports, and
   adapter surfaces.

The route review's `Authorization Wiring` section names the port but ignores
the action vocabulary file and the rail-vocabulary catalog. The Fowler reading
in the deep architectural review v2 explicitly demanded "Centralize workspace-file
rail metadata in the catalog module" - that catalog **exists** in source as
`protectedRuntimeRailVocabulary.ts`. The route review should reference it as
the canonical wiring artifact.

**Fix:** in `Authorization Wiring`, add:

> The canonical rail catalog entry lives in
> `apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts` under
> `WORKSPACE_FILES_RAIL.workspaceFiles`. Action constants live in
> `accessDecisionActions.ts`. The denied-reason enum lives in `accessDecision.ts`.

### B. `Workspace Files Slice Evidence` is incomplete

The route exists at **two** files in source, not one:

- `apps/api/src/entrypoints/http/workspaceFilesRoutes.ts` - request parsing,
  authorization invocation, response shaping.
- `apps/api/src/entrypoints/http/workspaceFilesRouteGroup.ts` - the route group
  composer that the deep architectural review's Fowler finding explicitly asked
  for ("move workspace-file composition to its own route group").

Plus the repository adapter:

- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts`.

The evidence column lists only `workspaceFilesRoutes.ts` and "web workspace
service." Three files missing for an audit trail.

### C. `DeniedReason` enum not mapped

`Authorization Wiring` names five denial modes informally: _missing token,
missing action, missing scope, tenant mismatch, denied action_. Source defines
`DeniedReason` as:

```ts
'PRINCIPAL_SUSPENDED' |
  'TENANT_NOT_GRANTED' |
  'PROJECT_NOT_GRANTED' |
  'ENVIRONMENT_NOT_GRANTED' |
  'ACTION_NOT_GRANTED' |
  'TOKEN_ASSERTION_CONFLICT';
```

The doc's informal names do not map cleanly:

| Doc says        | Closest enum                                       | Issue                                                        |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| missing token   | (none - pre-authorization auth failure)            | Authentication, not authorization. Different layer.          |
| missing action  | `ACTION_NOT_GRANTED`                               | OK.                                                          |
| missing scope   | `PROJECT_NOT_GRANTED` or `ENVIRONMENT_NOT_GRANTED` | "Missing scope" is ambiguous between project vs environment. |
| tenant mismatch | `TOKEN_ASSERTION_CONFLICT` or `TENANT_NOT_GRANTED` | Two distinct enums; the doc collapses them.                  |
| denied action   | `ACTION_NOT_GRANTED`                               | Duplicates "missing action" above.                           |

Negative tests cannot assert on copy strings. They must assert on enum values.
Map informal -> enum and require tests at the enum level. Also add the missing
`PRINCIPAL_SUSPENDED` mode (tester whose principal was suspended is a real
case).

### D. Sibling proposal misrouted in `Open Opportunities`

The route review's last opportunity says:

> Keep authored-file size policy in architecture or code-quality governance,
> not in this product route review; route any guard through architecture docs.

But the policy already exists as
`docs/planning/proposals/mandatory/frontend-and-ux/code-workbench-file-length-refactor-20260504.md`
which is a **mandatory** proposal in **frontend-and-ux**, not architecture or
code-quality. The opportunity:

1. Reroutes to "architecture docs" when the live proposal lives elsewhere.
2. Misclassifies the proposal as "Open Opportunity" when it is already a
   mandatory active surface.

**Fix:** replace the Open Opportunity with a reference: _"Authored-file size
policy is owned by [code-workbench-file-length-refactor-20260504](../../proposals/mandatory/frontend-and-ux/code-workbench-file-length-refactor-20260504.md);
the route review does not duplicate or override it."_

### E. Canvas slice undersells what is shipped

`Alpha Full Gate` lists Canvas as `Partial` with rail "Canvas graph component
and draft query rails." Source already has the **graph-draft write rail**:

- `apps/api/src/application/services/saveWorkspaceGraphDraftUseCase.ts`
- `apps/api/src/application/services/getWorkspaceGraphDraftUseCase.ts`
- `apps/api/src/application/services/authorizeWorkspaceGraphDraftCapabilityService.ts`
- `apps/api/src/application/services/workspaceGraphDraftCapabilityPolicy.ts`
- `apps/api/src/entrypoints/http/protectedRuntimeWorkspaceGraphDraftRouteGroup.ts`
- `apps/api/src/entrypoints/http/workspaceGraphDraftRoutes.ts`

`protectedRuntimeRailVocabulary.ts` defines two graph-draft rails
(`SaveWorkspaceGraphDraft`, `GetWorkspaceGraphDraft`) with full
`tenant/project/environment scope` wiring. So Canvas is **not** "partial because
the rails do not exist." It is partial because **the UI consumption is not
fully proven**.

**Fix:** rewrite the Canvas row to acknowledge the shipped rails, then state
exactly what is missing on the UI side (e.g., "draggable-node interaction
Cypress proof," "draft save retry behavior").

This matters because the doc's "no file-write behavior is part of this route"
rule may be misread as "no write behavior at all." Graph-draft writes **are
already in this route**. Distinguish file writes from graph-draft writes
explicitly.

### F. `Filesystem Safety` table underspecified for a closure rule

The table prescribes behavior categories but no concrete values:

| Threat          | Doc says                                                    | What is missing for testability                                                              |
| --------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Path traversal  | "Reject paths that resolve outside the workspace root"      | Vector list. Minimum: `..`, `%2e%2e`, double-encoded, NUL byte, Windows `\`, absolute paths. |
| Oversize file   | "Enforce a server-side cap"                                 | Concrete cap value (e.g., 1 MB) declared as a config or normative constant.                  |
| Binary content  | "Reject **or** label non-text content explicitly"           | A disjunction is not a contract. Pick one.                                                   |
| Freshness drift | "Declare read-on-render **or** cache invalidation behavior" | Same disjunction. Pick one.                                                                  |

Disjunctions cannot pass closure. Either the route review picks the answer or
it points to the proposal that picks it; the current text passes the buck
without naming the destination.

### G. Diagram inconsistency between flowchart and Alpha Full Gate

The flowchart has 7 nodes:
`Start -> Bootstrap -> Context -> Canvas -> Code -> Evidence -> Decision`.

The Alpha Full Gate has 6 stages:
`Startup gate / Context selection / Canvas / Code tab / Recovery states /
Execution posture`.

Mismatches:

- Flowchart has `Evidence` and `Decision` nodes; Gate has neither.
- Gate has `Recovery states` and `Execution posture`; Flowchart shows neither.
- Flowchart implies `Code -> Evidence` is the terminal step; Gate places
  `Execution posture` after Code.

The two diagrams are answering different questions. State this explicitly:
the flowchart is the **navigation order**; the Gate is the **stage list with
status**. Or align them.

### H. Route State Model is mostly a Code state machine

The state diagram has 4 transitions getting from `[*]` to `CodeLoading`, then 9
transitions inside the Code stage. So the diagram is a **Code workbench** state
machine with a thin prologue. The other slices (Canvas, Plan/run readiness,
Recovery cross-stage) have no state coverage.

For the document to claim "Route State Model" honestly, either:

- Label this as "Route State Model - Code workbench depth, other stages
  abbreviated"; or
- Add at least one branching state per other stage (e.g., `CanvasReady ->
CanvasNodesDraggable | CanvasNodesStuck | CanvasUnavailable`,
  `PlanRunDisabled | PlanRunEnabled | PlanRunDegraded`).

### I. `Recovery states` consistency rule is unmeasurable

Alpha Full Gate row says: _"Recovery copy is consistent across every stage."_

How is "consistent" tested? You need:

- A vocabulary of recovery copy keys (e.g., `recovery.empty`,
  `recovery.unavailable`, `recovery.unauthorized`, `recovery.notFound`).
- A single source-of-truth file (e.g., `apps/web/src/.../recoveryCopy.ts`).
- A test that asserts every stage's UI uses the same keys for equivalent
  states.

Without that scaffolding, "consistent" is editorial, not testable. Either name
the file or admit the row cannot close until it exists.

### J. `Plan/Run Readiness Blockers` causes have no rail mapping

The five causes are enumerated:

> plan integrity failure, backpressure admission, capability mismatch, adapter
> unavailable/degraded mode, and authorization denied.

Each maps to a different existing rail or known gap:

| Cause                          | Existing rail / source                                                  | Closure path                                          |
| ------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------- |
| Plan integrity failure         | `PlanIntegrityValidator` (engine) + ADR-0012                            | Surface integrity error code in run-detail UI.        |
| Backpressure admission         | `PostgresBackpressureSnapshotReader` (no accepted ADR yet - see review) | Define backpressure contract ADR (P2 in arch review). |
| Capability mismatch            | `RunExecutionPolicy.requiresCapabilities` validation                    | Surface mismatch in plan-preview readiness banner.    |
| Adapter unavailable / degraded | Not yet implemented (see arch review item A-26)                         | Implement degraded-mode admission first.              |
| Authorization denied           | `IAccessDecisionService.decide` -> `DeniedReason`                       | Map enum -> user copy.                                |

The doc names the causes but does not name the rails. Without that mapping the
section is a placeholder.

### K. `Open Risks Riding Into Alpha` lists 1 of 109

Out of 109 entries in `docs/risk-register/quality/`, the route review lists
exactly one (`R-20260411-WEB-WORKSPACE-FILE-NOT-FOUND-CONTRACT-GAP`). Either
the route only depends on one risk (improbable given the architectural review
identified at least 17 systemic risks), or others have not been triaged for
inclusion.

A complete pass would tag every active risk against the route stage it
affects. Stages without risks should be stated explicitly ("no open risk on
this stage at 2026-05-05") so absence is decisional, not accidental.

### L. No alpha duration or cadence

The doc defines what alpha is and what closes alpha, but not **how long alpha
runs** before exit decision. Even at the route level, the answer to "how
many internal testers, for how many weeks" affects the readiness of the gate.
A one-week alpha and a six-week alpha have different gates.

Add a one-paragraph cadence statement: tester audience size, expected duration,
and exit-decision authority.

### M. No mutual cross-link with the mandatory proposal

The route review references
`code-workbench-workspace-files-query-rail-plan-20260504.md`. Confirm the
proposal references back to this review. If not, the proposal-review pair
drifts and a future contributor reading the proposal will not know the route
context.

### N. No statement of what changes if the route is reordered

If product decides Plan/run readiness should be displayed pre-Code instead of
post-Code, the flowchart, dependency table, and Alpha Full Gate all change.
The doc has no change-management note. A small section "Changing the route"
naming which artifacts must update preserves coherence under iteration.

---

## Minimum Change Set (v3 -> v4)

| #   | Change                                                                                                                              | Effort             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | `Authorization Wiring`: name `accessDecisionActions.ts` and `protectedRuntimeRailVocabulary.ts` as canonical wiring artifacts.      | 3 lines            |
| 2   | `Workspace Files Slice Evidence`: add `workspaceFilesRouteGroup.ts` and `LocalWorkspaceFileRepository.ts` to evidence sources.      | 2 cells            |
| 3   | `Authorization Wiring`: replace the five informal denial modes with a `DeniedReason` enum mapping table; add `PRINCIPAL_SUSPENDED`. | small table        |
| 4   | Replace the Open Opportunity for file-length policy with a reference to the existing mandatory proposal in `frontend-and-ux/`.      | 2 lines            |
| 5   | Rewrite the Canvas row to acknowledge shipped graph-draft rails; clarify "no file-write" rule does not include graph-draft writes.  | 3 lines + 1 row    |
| 6   | `Filesystem Safety`: declare a concrete oversize cap; resolve the "reject **or** label" disjunctions to a single answer.            | 4 cells            |
| 7   | Reconcile flowchart and Alpha Full Gate: state that one is navigation, the other is stage status, or align them.                    | 2 lines            |
| 8   | Label the Route State Model as Code-depth; add one branching state per other stage, or admit they are abbreviated.                  | 5 lines            |
| 9   | Name the recovery-copy source-of-truth file (or admit the row cannot close until it exists).                                        | 2 lines            |
| 10  | Map each `Plan/Run Readiness Blockers` cause to a specific existing rail or accepted gap.                                           | 1 mapping table    |
| 11  | Triage all 109 risk-register entries against route stages; list each touched risk in `Open Risks Riding Into Alpha`.                | triage pass        |
| 12  | One-paragraph cadence statement (audience size, duration, exit authority).                                                          | 4 lines            |
| 13  | Confirm and add a back-link in the mandatory proposal to this route review.                                                         | 1 line in proposal |
| 14  | Optional: add a "Changing the route" subsection naming the artifacts that update if route order changes.                            | 5 lines            |

---

## Verdict

V3 closed every structural item from v2. The remaining defects are
**source-fidelity** (items A, B, C, D, E), **specification depth** (F, I, J),
**diagram coherence** (G, H), and **scope coverage** (K, L). None of them
prevent the document from being publishable; all of them prevent it from being
**executable as the alpha gate**.

The two highest-impact fixes for v4:

- **Item A + B** - name the three real wiring files
  (`accessDecisionActions.ts`, `protectedRuntimeRailVocabulary.ts`,
  `workspaceFilesRouteGroup.ts`) and `LocalWorkspaceFileRepository.ts`. This
  is the difference between a doc that points at intent and a doc that is
  audit-ready.
- **Item C** - map informal denial modes to `DeniedReason` enum values. This
  converts negative tests from copy assertions to enum assertions, which is
  the difference between a brittle test and a contract test.

Beyond v4, the document risks **stage saturation**: as more child slices are
added (Startup, Context, Plan/run readiness all currently have no rails), each
will pull the same review-vs-proposal mutual coupling questions. The team should
decide whether each slice gets its own route review or whether this document
absorbs them all. If absorption, the doc will grow past readability; if
delegation, the route review must explicitly state that child-slice depth lives
in child-slice reviews.

---

## Routing

This critique was intake and is now accepted as historical source-grounded
review material. The active backlog is `F-27` plus the internal alpha product
route plan; unresolved items in this file are not independent execution
authority.

Items that remain open after the route review update are routed through:

- `docs/planning/proposals/mandatory/frontend-and-ux/internal-alpha-product-route-plan-20260505.md`
- `docs/planning/state/agent-lane-e.yaml` task `F-27`
- `docs/planning/state/agent-lane-c.yaml` dependency notes for `AR-C10` and
  `TF-C4`
- the C&Q rail catalog (`protectedRuntimeRailVocabulary.ts` is its code form)
- the risk register for full route-stage risk triage
