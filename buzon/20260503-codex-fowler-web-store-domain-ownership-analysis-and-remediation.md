---
title: Fowler Web Store Domain Ownership Analysis And Remediation
status: Active
owner: Codex
last_reviewed: 2026-05-03
---

# Fowler Web Store Domain Ownership Analysis And Remediation

## Fowler Architecture Analysis

The branch moves one concrete F-05 ownership problem from a mixed layout store
to a named query projection: `ProjectPlatformConnectionStatus`. In Fowler terms,
the improvement is a Responsibility Overload reduction. `uiLayoutStore` was
serving both as workbench shell layout and platform status read model. The cut
keeps layout mutations in the shell aggregate and moves connection display into
a read-model store owned by Platform Health.

The remaining architectural issue is explicit: `executionStore` still combines
runtime evidence (`currentPlan`, `currentRun`) with an authorization projection
(`userPermissions`). That is no longer hidden by the component guide; it is an
active F-05 drift and should be the next product-safe ownership cut.

## Mature-System Comparison

Mature frontend systems usually separate three kinds of state:

- command-side UI state, such as shell layout and local interaction;
- read-model projections, such as health, runtime evidence, and capabilities;
- adapter/cache state, such as remote query freshness and retry posture.

This branch moves closer to that posture. It does not turn every concept into a
new store for its own sake. It creates a named projection only where the owner
was wrong and adds semantic tests so the boundary is reviewable.

## Pattern Improvements

- **Separated Read Model**: `ProjectPlatformConnectionStatus` now owns
  `PlatformConnectionState` instead of layout owning platform health.
- **Explicit Component API**: the component guide lists public stores and their
  C&Q role.
- **Semantic Fitness Function**: `webStoreDomainOwnership.architecture.test.ts`
  checks docs, owned-concern docblocks, and state ownership semantics.
- **Whitelist Hydration**: `uiLayoutStore` hydrates known layout fields only.
- **Traceable Drift**: authorization remains visible as drift, not as accepted
  architecture.

## Antipatterns Detected

- **Responsibility Overload**: previously present in `uiLayoutStore`; reduced
  by moving connection status out.
- **Hidden Authority**: local persisted layout could have carried legacy status
  fields; now blocked by whitelist hydration and negative tests.
- **Anemic Documentation**: the component initially named stores but did not
  expose public API, invariants, transitions, consumers, or scenarios.
- **Residual Mixed Projection**: `executionStore.userPermissions` still mixes
  authorization with runtime evidence.

## Component Grouping

The component should be grouped by owned concern, not by generic store folder:

- Web shell session: `sessionStore.ts`.
- Canvas authoring interaction: `canvasInteractionStore.ts`.
- Workbench shell layout: `uiLayoutStore.ts`.
- Platform health projection: `platformConnectionStore.ts`.
- Runtime evidence projection: `executionStore.ts`.
- Active drift: authorization projection currently inside `executionStore.ts`.

## Repetitions

The branch did not introduce duplicate product commands. The repeated pattern
to watch is local state fields named by consumer convenience instead of owner
semantics. `connectionStatus` was corrected. `userPermissions` is the next
repeat of that pattern because it is a capability projection, not runtime
evidence.

## Opportunities

- Split authorization projection from `executionStore` behind a named query
  such as `ProjectAuthorizationCapabilities`.
- Promote a small helper for semantic architecture tests that verify component
  guide, user stories, mailbox analysis, and owned-concern docblocks.
- Consider generated method inventory only if store surfaces grow beyond the
  current manageable table.

## Drift Review

Fixed code drift:

- `connectionStatus` removed from `uiLayoutStore`.
- Layout hydration cannot revive legacy status fields.
- `Root` updates platform connection projection from Platform Health.
- `TopAppBar` reads platform status from the correct query projection.

Fixed documentation drift:

- F-05 plan names `ProjectPlatformConnectionStatus`.
- The component guide lists methods, DDD owner, rail, invariants, transitions,
  and consumers.
- User stories cover the current store scenarios.

Remaining drift:

- `executionStore.userPermissions` still belongs to Authorization projection.

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

No new ADR is needed for this slice. The change applies the existing
command/query rail governance and F-05 store ownership plan. The remaining
authorization split is a future F-05 implementation task, not a repository-wide
architectural decision.
