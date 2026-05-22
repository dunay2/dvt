---
title: F-17-E Fowler Analysis - Monaco Bundle Isolation
status: Accepted
owner: Frontend / Architecture
date: 2026-05-22
---

# F-17-E Fowler Analysis - Monaco Bundle Isolation

## Fowler Lens

The previous Monaco slices already improved Presentation Model and Gateway
boundaries: routes render route-owned panels, and Monaco is reached through
lazy viewer/editor gateways. The remaining weakness was a hidden build-time
decision inside `vite.config.ts`.

Fowler framing: this is not a domain behavior problem; it is a Component
Boundary and Semantic Configuration problem. The chunking rule is important
enough to name, test, and document because Monaco is a deliberately heavy
third-party surface.

## Mature-System Comparison

Mature frontend systems usually keep expensive editor/runtime vendors behind:

- lazy component boundaries;
- named vendor chunks;
- route ownership rules;
- architecture tests that fail when direct imports leak into route modules.

DVT had the lazy boundary and named chunks, but the chunk decision lacked a
small public API. Extracting a pure resolver makes the rule reviewable without
requiring a Vite build to understand the intent.

## Improved Patterns

- **Gateway**: `MonacoCodeViewer`, `MonacoCodeEditor`, and `MonacoDiffViewer`
  remain the route-safe gates.
- **Semantic configuration**: `resolveWebManualChunk()` names chunk intent in a
  pure function.
- **Fitness function**: the Monaco architecture guard checks both runtime lazy
  ownership and Vite chunk isolation.

## Antipatterns Addressed

| Antipattern             | Risk                                                        | Remediation                                             |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------- |
| Hidden config semantics | Contributors can accidentally inline or remove chunk rules. | Extract and test a named resolver.                      |
| Heavy dependency drift  | Routes can start importing Monaco directly.                 | Guard third-party imports to surface modules.           |
| Test routing drift      | Monaco config changes may run broad or wrong suites.        | Route resolver/config tests through Monaco focus suite. |

## Future Teaching

When a dependency is heavy enough to require chunking, the chunking decision is
architecture, not incidental config. Give it an owned concern, a pure API, and a
fitness function before the dependency spreads.
