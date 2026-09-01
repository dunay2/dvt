---
title: CUX1 and WUX1 novice Fowler QA review
status: Accepted
owner: Web / UX
last_reviewed: 2026-08-06
planning_type: review
---

# CUX1 and WUX1 novice Fowler QA review

## Decision

**GO on `429631cd4`.** A demanding reviewer who started without prior Raven
knowledge completed the governed manual and found no remaining reproducible
Blocker, Major, or Minor defect in the agreed CUX1/WUX1 matrix.

The first three passes were deliberately rejected. This document preserves
those failures instead of presenting only the final happy path.

## Governing sources

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/reviews/ci-and-delivery/20260328-lane-c-ai-efficiency-and-cost-review.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/planning/state/github-mvp-issue-workflow.md`
- `docs/architecture/components/web/screen-manuals-and-user-stories.md`
- `docs/architecture/components/web/graph/canvas-workbench-command-query-catalog.md`
- [Manual de usuario del workspace y Canvas](../../guides/canvas-workbench-user-manual-20260806.md)
- GitHub epics [CUX1 #2228](https://github.com/dunay2/dvt/issues/2228) and
  [WUX1 #2236](https://github.com/dunay2/dvt/issues/2236), including their
  vertical stories and QA issues.

## Reviewer posture and method

The reviewer acted as a technically demanding new user: no assumed knowledge
of Raven, no reliance on implementation intent, and no acceptance based only
on screenshots. The reviewer used the Spanish manual, exercised the live app
with real browser interactions, inspected accessible names and focus, ran
axe-core 4.13.0, and recorded the exact commit under test.

The matrix covered desktop, 390 x 844, equivalent 200% reflow, keyboard-only
navigation, Spanish and English, focus restoration, dialog exits, project
context, node code authority, execution selection, component grouping,
directional edges, forced colors, and reduced motion.

## Review progression

| Commit      | Decision                  | Critical evidence                                                                                                                                                                                              | Resulting microcommits                                                                                                             |
| ----------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `30f887ade` | NO-GO                     | Node code was empty, copy mixed languages, focus fell to `BODY`, mobile surfaces overlapped, Add component was not visibly discoverable, and graph text was too small.                                         | Authoritative code routing, focus restoration, reactive localization, visible Add command, responsive shell, and graph legibility. |
| `0480d9e02` | NO-GO                     | Inspector still mixed languages, Add component appeared too late in Tab order, blocked run status disappeared on narrow screens, two elements were outside landmarks, and dialog actions/names were ambiguous. | Inspector dictionaries, keyboard order, visible blocked status, header landmark, and distinct dialog contracts.                    |
| `7c1dca2d9` | NO-GO                     | Dynamic `Node Id`/`Relation`, dbt panel content, and history empty state remained in English; 390 px still ellipsized run readiness.                                                                           | `5307c6730` and `0e4dfa8a9`.                                                                                                       |
| `0e4dfa8a9` | GO with Minor copy review | All functional and accessibility criteria passed; three missing accents remained in component guidance.                                                                                                        | `429631cd4`.                                                                                                                       |
| `429631cd4` | **GO**                    | Correct accents visible at runtime; old variants absent; no errors or warnings; no prior finding reproduced.                                                                                                   | Final accepted state.                                                                                                              |

## Fowler review matrix

| Observed problem                                                        | Fowler signal                                                 | Root correction                                                                                                            | Proof                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Project context existed but project switching was unclear.              | Hidden temporal coupling and competing authorities.           | One authorized project-selection rail updates session-scoped workspace state and invalidates stale project queries.        | Selector labels the active project; automated scope test proves isolation.               |
| Project code and node code exposed competing or generated explanations. | Divergent change and duplicated presentation authority.       | Both routes resolve through the authoritative workspace file query; node Code opens its exact file.                        | Monaco displays the full SQL containing `source_1`; close restores node focus.           |
| Language changed labels but not every contextual/plugin surface.        | Shotgun surgery and parallel copy authorities.                | One application-language preference feeds shell, Canvas, graph semantics, Inspector read models, and plugin contributions. | ES/EN browser pass plus Inspector and plugin regression tests.                           |
| Play meant selection but looked like immediate execution.               | Misleading affordance and primitive boolean semantics.        | Explicit selection command with play/pause states and localized accessible names.                                          | `Seleccionar para ejecución` changes to `Quitar de la ejecución`; icon changes to pause. |
| Edge direction was visually ambiguous.                                  | Missing information scent.                                    | Destination markers and localized React Flow semantics represent direction without changing graph meaning.                 | Closed 28 x 28 markers, 2.5 px stroke, localized names.                                  |
| Component insertion was hidden, flat, and clipped.                      | Feature envy and responsibility overload in the context menu. | The governed Add command is visible before the graph and opens a grouped, searchable, wrapping catalog.                    | Fifth Tab stop, grouped catalog, no horizontal clipping, Escape restores focus.          |
| Narrow shell compressed critical readiness into ellipsis.               | Inappropriate compactness and information loss.               | Critical status is non-shrinking; the command cluster wraps below `sm`.                                                    | ES `116=116` and EN `86=86` client/scroll widths at 390 px.                              |
| Dialogs and code panels lacked reliable exits or distinct names.        | Ambiguous command semantics.                                  | Visible Cancel/Close commands, distinct accessible names, ordered mobile actions, and focus restoration.                   | `Cancelar -> Validar proyecto -> Importar proyecto`; distinct explorer close name.       |

## Final demanding-user acceptance

| Criterion                  | Result | Evidence                                                                                                                                                                               |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete Spanish Inspector | PASS   | General, columns, tests, inputs/outputs, More, summary, overview, configuration, and history are localized; `ID del nodo`, `Relación`, `Linaje`, `Estado`, and `Inactivo` are correct. |
| Keyboard order             | PASS   | Add component is focus 5, before graph, edges, nodes, and ports.                                                                                                                       |
| 390 px visibility          | PASS   | Full ES/EN readiness text, no ellipsis, no overlap, no global horizontal overflow.                                                                                                     |
| Equivalent 200% reflow     | PASS   | 720 x 450 preserves status, actions, and exits without overlap.                                                                                                                        |
| Accessibility landmarks    | PASS   | axe-core 4.13.0 reports zero violations.                                                                                                                                               |
| Dialog exits               | PASS   | Close names are distinct; Cancel is first in the mobile import action order.                                                                                                           |
| Authoritative code         | PASS   | Real workspace-file response is 200 and Monaco renders the complete node SQL.                                                                                                          |
| Play/pause semantics       | PASS   | Visible icon and accessible action change together.                                                                                                                                    |
| Catalog and arrows         | PASS   | Grouping/search/return focus and directional markers are visible and localized.                                                                                                        |
| Reviewed Spanish accents   | PASS   | `están`, `política`, and `estático` render at runtime; unaccented variants are absent.                                                                                                 |

## Visual evidence

Final accepted evidence:

- [390 px Spanish readiness](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-0e4dfa8a9-01-mobile-es-status-visible.png)
- [390 px English readiness](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-0e4dfa8a9-02-mobile-en-status-visible.png)
- [Spanish Inspector history](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-0e4dfa8a9-03-inspector-es-historial.png)
- [Equivalent 200% reflow](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-0e4dfa8a9-04-reflow-200-visible.png)
- [Keyboard order](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-7c1dca2d9-04-tab-order-add-first.png)
- [Distinct explorer close](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-7c1dca2d9-07-project-explorer-distinct-close.png)
- [Mobile import order](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-7c1dca2d9-08-mobile-import-order.png)
- [Authoritative node code](../../evidence/assets/20260806-cux1-wux1-novice-fowler-qa/qa-final2-7c1dca2d9-09-node-code-authoritative.png)

The same asset directory retains all earlier failure screenshots for auditability.

## Automated evidence

- `pnpm --filter @dvt/web test:canvas-unit:run`: 104 files, 557 tests passed.
- `pnpm --filter @dvt/web test:canvas-architecture:run`: 62 files, 133 tests passed.
- `pnpm --filter @dvt/web test:shell-session:run`: 22 files, 99 tests passed.
- `pnpm --filter @dvt/web test:monaco:run`: 18 files, 121 tests passed.
- Targeted final Inspector/plugin suite: 2 files, 31 tests passed.
- Targeted final shell suite: 1 file, 11 tests passed.
- Targeted reviewed-copy suite: 1 file, 5 tests passed.
- Native Cypress affected flow: 3 specifications, 6 tests passed; final narrow-screen
  specification: 3 tests passed.

The aggregate Canvas presentation command exhausted the local runner's memory
when it spawned multiple large Vitest workers. That environment limitation was
not classified as a product failure: the complete unit and architecture
partitions passed, and every changed presentation batch and affected native
Cypress flow passed independently.

## Explicit limitations

- The reviewer tested 200% through an equivalent CSS viewport, not native
  browser zoom.
- The fixture exposed one authorized project, so manual A -> B -> A switching
  was unavailable; the automated project-scope test covers the state boundary.
- The reviewer did not perform a destructive production import.

These limitations do not relax product behavior. They define the evidence that
was and was not available in this local review.

## Debt and stub audit

No stub, placeholder, fake success path, TODO/FIXME marker, disabled rule, or
new debt entry was introduced. Hooks remained enabled. The accepted result
uses the real workspace, session, graph, and run rails already cataloged by the
owning web bounded context.
