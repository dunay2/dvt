---
title: Frontend Operability Fowler Review
status: Review
date: 2026-04-30
owner: Codex / Frontend Architecture
---

# Frontend Operability Fowler Review

## Scope

This review covers the branch work after `main` commit
`813494fc5f3828411175a555c2c566d81933dc24`:

- Admin route tab position is URL-addressable and survives browser refresh.
- Canvas card coordinates preserve operator-owned local layout after bootstrap
  and reload.
- API bearer-token handling refreshes local protected-runtime tokens before
  protected requests and retries one safe request after `401`.
- Static-analysis warnings in the touched frontend slice were reduced without
  weakening lint, typecheck, or pre-push gates.

## Fowler verdict

The branch moves the frontend closer to Fowler-style application architecture:
state transitions now live in small policy/model seams instead of being hidden
inside view rendering. The strongest improvement is the split between graph
meaning and viewport layout. In mature authoring systems, model identity and
visual placement are separate models; this branch now follows that rule.

The remaining issue is not absence of tests. The issue is coverage shape: unit
and component tests covered isolated pieces, while the user failure crossed
browser refresh, local persisted layout, remote draft hydration, and API mode.
The branch adds negative tests for that exact boundary, but the whole web
surface still needs more contract-backed browser tests.

## Comparison with mature systems

Mature workflow and data-authoring systems usually show these traits:

| Trait                               | Mature system posture                                                      | Branch posture                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| URL-owned route position            | Operator position is deep-linkable and refresh-safe.                       | Admin tabs now use `?tab=...`.                                                 |
| Separate semantic and layout models | Domain graph is authoritative for meaning; viewport layout is local state. | Canvas draft hydration no longer overwrites local card positions.              |
| Gateway-owned auth                  | Transport boundary owns bearer headers, refresh, retry limits.             | `createApiClient` and `apiAuthConfig` own this, not route views.               |
| Honest unavailable states           | Missing backend contracts fail closed with explicit state.                 | Existing Code, Diff, and Artifacts gaps remain honest 404/empty states.        |
| Contract-backed E2E                 | Browser tests prove route-to-backend contracts.                            | Partial. Existing unit coverage improved; E2E coverage remains an opportunity. |

## Pattern improvements

- **Application Controller**: route behavior is coordinated through
  controllers/hooks instead of inline view logic.
- **Policy Object**: `canvasDraftLayoutHydrationPolicy.ts` names the rule for
  when remote draft coordinates may seed local layout.
- **Presentation Model**: Canvas viewport nodes prefer persisted layout without
  changing canonical graph semantics.
- **Gateway**: `createApiClient` stays the single HTTP transport boundary for
  auth/session headers and bounded retry.
- **Intention-Revealing Interface**: Admin route position is expressed as route
  search state rather than implicit component memory.

## Antipatterns detected

- **State split-brain**: remote draft node positions were treated as if they
  could overwrite operator-local viewport layout after refresh.
- **Test coverage gap**: existing tests covered service pieces but not the
  end-user refresh path.
- **UI promise drift**: some routes consume API paths that are not verified in
  `apps/api`, notably `/workspace/files` and `/diff/changes`.
- **Static-analysis friction**: test harness code used empty DOM mock methods
  and unsafe stringification, which made the quality signal noisy.

## Repetitions and grouping

The branch improved grouping by making the following component seams explicit:

- `apiAuthConfig.ts`: token extraction, expiry and refresh eligibility.
- `createApiClient.ts`: HTTP request assembly, safe retry and session headers.
- `canvasDraftLayoutHydrationPolicy.ts`: remote-layout seeding decision.
- `useCanvasDraftInitialBootstrap.ts`: first bootstrap orchestration.
- `useCanvasDraftReloadHydration.ts`: explicit reload hydration orchestration.
- `AdminView.tsx`: Admin route composition and tab-position route binding.

Future grouping opportunity: promote route-position persistence into a small
shared route utility only after a second route needs the same URL state pattern.
Doing it now would be speculative abstraction.

## Drift fixed in this branch

- Documentation now states that Canvas layout is local operator state, not
  protected draft semantic truth.
- Tests now assert that bootstrap and reload do not overwrite persisted card
  positions.
- Admin route docs now describe URL-addressed route position instead of leaving
  the behavior implicit in `AdminView.tsx`.
- The frontend auth component doc now matches the local protected-runtime token
  refresh behavior.

## Opportunities

1. Add Cypress coverage for `move card -> reload browser -> same position`.
2. Add backend contracts or explicit product decisions for `/workspace/files`
   and `/diff/changes`; do not mask these with frontend-only mocks.
3. Extend URL-addressable position to other route tabs only when there is a
   real user journey that needs refresh/deep-link semantics.
4. Add a route-to-backend contract matrix that fails CI when a web service calls
   an endpoint absent from `apps/api`.

## Lessons for future slices

- A frontend "position" can mean route position, viewport position, selected
  graph object, or backend draft revision. Each must have a named owner.
- Local layout persistence must be defended at hydration boundaries, not only
  at drag handlers.
- A 404 from a consumed endpoint is not a frontend styling problem. It is either
  a missing backend contract or a deliberately unavailable capability.
- Static-analysis warnings in tests are worth fixing when they hide the quality
  signal for real regressions.

## User-story coverage

Covered by this branch:

- `US-FRONT-OPERABILITY-001`: Admin tab position survives F5.
- `US-FRONT-OPERABILITY-002`: Canvas card position survives remote draft reload.
- `US-FRONT-OPERABILITY-003`: Expired local protected-runtime token is refreshed.
- `US-FRONT-OPERABILITY-004`: Missing backend endpoints remain visible as gaps.

Backlog remains:

- `US-FRONT-OPERABILITY-005`: Browser E2E proof for Canvas layout refresh.
- `US-FRONT-OPERABILITY-006`: Web-to-API endpoint contract matrix.

## ADR decision

No new ADR is required for this branch. The changes are within existing
frontend component boundaries and do not introduce a new cross-package contract,
runtime execution model, persistence contract, or authorization model.
