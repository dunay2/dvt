---
title: Fowler Web Store Domain Ownership Analysis And Remediation
status: Active
owner: Codex
last_reviewed: 2026-05-03
---

# Fowler Web Store Domain Ownership Analysis And Remediation

## Fowler Architecture Analysis

The branch closes two concrete F-05 ownership problems by replacing mixed store
responsibilities with named projections. In Fowler terms, this is a
Responsibility Overload reduction supported by a semantic fitness function.
`uiLayoutStore` no longer serves as both workbench shell layout and platform
status read model. `executionStore` no longer serves as both runtime evidence
and authorization capability projection.

The resulting posture is deliberately modest: the branch does not create a new
global store API, a compatibility bridge, or a generic barrel. It keeps command
side UI state in command-owning stores and moves read-only product posture into
named read-model stores:

- `platformConnectionStore` owns `ProjectPlatformConnectionStatus`.
- `authorizationStore` owns `Authorization capability display`.
- `executionStore` owns only current plan/run runtime evidence.
- `useCanvasStoreFacade` composes route stores explicitly without becoming a
  replacement aggregate store.

No open F-05 store ownership drift remains in this branch.

## Mature-System Comparison

Mature frontend systems usually separate three kinds of state:

- command-side UI state, such as shell layout and local interaction;
- read-model projections, such as health, runtime evidence, and authorization
  capabilities;
- adapter/cache state, such as remote query freshness and retry posture.

This branch now matches that posture for the active F-05 stores. It does not
turn every concept into a new store for its own sake. It creates named
projections only where the owner was wrong and adds semantic tests so the
boundary is reviewable.

## Pattern Improvements

- **Separated Read Model**: `ProjectPlatformConnectionStatus` now owns
  `PlatformConnectionState` instead of layout owning platform health.
- **Authorization Projection**: `Authorization capability display` now owns
  `userPermissions` instead of runtime evidence owning UI capabilities.
- **Explicit Component API**: the component guide lists public stores and their
  C&Q role.
- **Semantic Fitness Function**: `webStoreDomainOwnership.architecture.test.ts`
  checks docs, owned-concern docblocks, and state ownership semantics.
- **Whitelist Hydration**: `uiLayoutStore` hydrates known layout fields only.
- **Hard Cut Over Compatibility**: no compatibility selector, alias, bridge, or
  barrel re-exposes authorization from `executionStore`.

## Antipatterns Detected

- **Responsibility Overload**: previously present in `uiLayoutStore`; reduced
  by moving connection status out.
- **Hidden Authority**: local persisted layout could have carried legacy status
  fields; now blocked by whitelist hydration and negative tests.
- **Anemic Documentation**: the component initially named stores but did not
  expose public API, invariants, transitions, consumers, or scenarios.
- **Facade Gravity**: `useCanvasStoreFacade` can become an accidental aggregate
  if future changes add ownerless state to it. This branch adds a docblock and
  architecture assertion to keep it as a composition seam only.

## Component Grouping

The component should be grouped by owned concern, not by generic store folder:

- Web shell session: `sessionStore.ts`.
- Canvas authoring interaction: `canvasInteractionStore.ts`.
- Workbench shell layout: `uiLayoutStore.ts`.
- Platform health projection: `platformConnectionStore.ts`.
- Runtime evidence projection: `executionStore.ts`.
- Authorization capability projection: `authorizationStore.ts`.
- Route-level composition seam: `useCanvasStoreFacade.ts`.

## Repetitions

The branch did not introduce duplicate product commands. The repeated pattern
that was fixed is local state fields named by consumer convenience instead of
owner semantics. `connectionStatus` and `userPermissions` are now named by the
read model that owns them, not by the nearest consuming view.

## Opportunities

- Promote a small helper for semantic architecture tests that verify component
  guide, user stories, mailbox analysis, and owned-concern docblocks.
- Consider generated method inventory only if store surfaces grow beyond the
  current manageable table.
- Keep `useCanvasStoreFacade` narrow. If it starts adding business decisions,
  extract those decisions into named view-model/domain modules rather than
  growing the facade.

## Saved Risks

| Risk                                                             | Impact                                                                                      | Trigger                                                                   | Mitigation                                                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `useCanvasStoreFacade` becomes a replacement aggregate store.    | Recreates the retired `appStore` shape under a route-local name.                            | New durable state or product decisions are added to the facade.           | Keep the facade as composition only; extract decisions to named view-model/domain modules.       |
| Authorization projection defaults outlive the real authority.    | UI capabilities may look locally authoritative before backend/RBAC integration is explicit. | A future slice wires permission changes without a governing C&Q rail.     | Add the backend/RBAC rail before changing the source of `useAuthorizationStore`.                 |
| Store method inventory becomes stale by manual maintenance.      | Component docs stop matching code even while tests remain green.                            | Store count or method count grows past the current reviewable table.      | Generate or mechanically validate method inventory once repetition appears in another component. |
| Semantic architecture tests copy/paste into multiple components. | Repetition increases maintenance cost and weakens reviewer confidence.                      | A second or third component needs the same doc/docblock/story assertions. | Promote a shared architecture-test helper only after repeated use proves the abstraction.        |

These are saved as evolution risks, not as accepted debt. The current branch
does not require a formal risk-register entry because the risks are guarded by
existing tests or deferred to future product slices.

## Saved Opportunities

| Opportunity                                                                  | Product value                                                                        | When to use                                                                                    | First guardrail                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Connect `Authorization capability display` to a real backend/RBAC authority. | Canvas actions reflect actual user permissions instead of local projection defaults. | When product scope includes real permission sourcing.                                          | Define the C&Q rail and negative authorization tests before code.                                                 |
| Extract Canvas policy decisions from route composition if they grow.         | Keeps the Canvas route ergonomic and prevents facade gravity.                        | When `useCanvasStoreFacade` starts carrying product logic.                                     | Add a named view-model/domain module with owned-concern docblock and tests.                                       |
| Generate store method inventory.                                             | Reduces manual documentation drift.                                                  | When another component repeats the same inventory pattern or F05 grows beyond reviewable size. | Keep generated output under governance and block stale generated docs in CI.                                      |
| Promote semantic architecture-test helpers.                                  | Gives future components the same Fowler/DDD guard without copy/paste.                | After at least two more component guides need identical assertions.                            | Keep helper inputs explicit: component doc, local guide, stories, owner docblocks, and forbidden legacy surfaces. |

## Drift Review

Fixed code drift:

- `connectionStatus` removed from `uiLayoutStore`.
- Layout hydration cannot revive legacy status fields.
- `Root` updates platform connection projection from Platform Health.
- `TopAppBar` reads platform status from the correct query projection.
- `userPermissions` removed from `executionStore`.
- `authorizationStore` owns effective web UI authorization capabilities.
- Canvas facade reads authorization from `authorizationStore`.

Fixed documentation drift:

- F-05 plan names `ProjectPlatformConnectionStatus`.
- F-05 plan names `Authorization capability display`.
- The component guide lists methods, DDD owner, rail, invariants, transitions,
  and consumers.
- User stories cover the current store scenarios.

Remaining drift:

- None for the F-05 store ownership hard cut in this branch. Historical docs may
  still mention retired surfaces as historical evidence; those are not active
  governance.

## Future Lessons

- A store file is not a bounded context. The bounded context is the owned
  concern and the command/query rail behind it.
- A local UI projection still needs DDD ownership when it affects user-visible
  posture.
- Persisted UI state must be whitelisted when removing fields; otherwise legacy
  local storage can reintroduce retired ownership.
- Architecture tests should assert semantic claims, not only file presence or
  absence.

## ADR Decision

No new ADR is needed for this slice. The change applies existing
command/query rail governance and the F-05 store ownership plan. The hard cut is
component-local and does not create a repository-wide architectural decision.
