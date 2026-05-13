---
title: Fowler analysis and remediation for runtime root subdivision
status: Accepted
owner: Codex / Architecture
last_reviewed: 2026-05-13
planning_type: analysis
---

# Fowler Analysis And Remediation For Runtime Root Subdivision

## Scope

This record reviews the runtime governance work on the branch that subdivides
`SYS-RUNTIME-ROOT`. The branch does not change run execution behavior. It
changes the architectural model that decides who owns runtime files, which
component guide explains the boundary, and which semantic architecture test
prevents a broad root owner from returning.

## Fowler Architecture Analysis

The previous runtime unit was a Fowler responsibility-overload smell: one
component owner covered engine orchestration, run-domain invariants,
state-store lifecycle, delivery movement, plan interpretation, plan
verification, deterministic utilities, DSL parsing, and CLI validation. Mature
systems avoid this because the component boundary becomes too large to answer:
"which public API owns this invariant, which consumers depend on it, and what
test proves it?"

The split applies Fowler's Service Layer, Gateway, Policy, Mapper, and Published
Interface vocabulary at the governance layer. `@dvt/engine` remains the runtime
service layer and facade. `@dvt/state-store` remains the state lifecycle port
and adapter-support surface. `@dvt/delivery` owns event movement and
projection-refresh runtime concerns. `@dvt/run-domain` owns the run aggregate
fold and transition invariants. `@dvt/plan-interpreter` and
`@dvt/plan-verifier` stop being hidden under the same broad runtime label.
`@dvt/canonical`, `@dvt/dsl`, and `@dvt/cli` each receive explicit owned
concerns.

## Mature-System Comparison

| Concern             | Before                                                                                             | Mature-system expectation                                           | Remediation                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Component ownership | `SYS-RUNTIME-ROOT` owned all runtime packages.                                                     | Root modules group; component owners own files.                     | Convert `SYS-RUNTIME-ROOT` to a module and add package-level components.      |
| Public API          | Package entrypoints did not all name their owned concern.                                          | Each module begins with a short semantic ownership header.          | Add `@ownedConcern` docblocks to runtime package entrypoints.                 |
| Test confidence     | Coverage guard only proved one owner per file.                                                     | Architecture test proves semantic component closure for real files. | Add a real-manifest runtime subdivision test.                                 |
| Documentation       | Runtime index named a target subdivision, not the current component model.                         | Current docs and generated views describe the implemented model.    | Add subsystem/component guide, user stories, and update the governance index. |
| Existing drift      | API route registrar test expected a grouping component, while the manifest now uses a source unit. | Tests assert the real owner and parent relationship.                | Update the API semantic test expectation.                                     |

## Improved Patterns

- **Published Interface:** each runtime package entrypoint now declares the
  package concern in a docblock before exports.
- **Service Layer:** `SYS-RUNTIME-ENGINE-CORE` isolates orchestration and run
  service coordination from lower-level lifecycle and utility packages.
- **Domain Model:** `SYS-RUNTIME-RUN-DOMAIN` isolates run aggregate folding and
  transition invariants from engine orchestration.
- **Gateway / Port Boundary:** `SYS-RUNTIME-STATE-STORE` owns runtime state and
  archive lifecycle ports rather than hiding under a general runtime bucket.
- **Semantic Architecture Fitness Function:** the manifest test checks concrete
  files and the plan-store exception, not only generic YAML validity.

## Antipatterns Detected

| Antipattern             | Risk                                                                                | Fix                                                          |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Responsibility overload | Runtime root could claim closure while unrelated package concerns were still mixed. | Split into package-level governance components.              |
| Documentation drift     | Human index said "next subdivision" after the split became real.                    | Update the unit index and add a runtime subsystem guide.     |
| Test-only confidence    | Unit coverage could stay green while ownership remained too broad.                  | Add semantic real-file expectations.                         |
| Placeholder export      | `@dvt/cli` exported a placeholder rather than an honest surface.                    | Replace it with script-oriented package metadata and a test. |
| Duplicate semantics     | API test expected grouping ownership while manifest had a source owner.             | Assert source owner and parent component separately.         |

## Grouping Applied

`SYS-RUNTIME-ROOT` now groups these component owners:

- `SYS-RUNTIME-ENGINE-CORE`
- `SYS-RUNTIME-RUN-DOMAIN`
- `SYS-RUNTIME-STATE-STORE`
- `SYS-RUNTIME-DELIVERY`
- `SYS-RUNTIME-PLAN-INTERPRETATION`
- `SYS-RUNTIME-PLAN-VERIFICATION`
- `SYS-RUNTIME-DSL`
- `SYS-RUNTIME-DETERMINISM-UTILITIES`
- `SYS-RUNTIME-CLI-VALIDATION`

Plan-store artifact fetch policy remains intentionally owned by
`SYS-PLANSTORE-ENGINE-FETCH`; the engine component excludes those files so the
split does not erase the existing S08 plan-store boundary decision.

## Lessons For Future Work

- Root governance units should usually be `module`, `workspace`, or `domain`
  units. File ownership belongs to the smallest component that can answer the
  API/invariant/test question.
- A broad owner should not be closed by documentation alone. It needs a
  semantic architecture test over real files.
- Entry-point docblocks are useful only when they name the component's owned
  concern, not when they restate the filename.
- Existing tests can encode drift. Red/green work must inspect the failure
  reason and fix stale expectations instead of masking the signal.

## Residual Opportunities

- `@dvt/cli` is still script-oriented and not a mature interactive CLI. The
  placeholder export is gone, but a future task should move behavior from
  `.cjs` scripts into typed command modules before calling it a user-facing CLI.
- `SYS-RUNTIME-ENGINE-CORE` is still broad inside `@dvt/engine`. The next split
  should separate application use cases, core lifecycle, security policy,
  ports, and tests when the planning DB selects that task.
- `SYS-RUNTIME-STATE-STORE` can be split later into command-port, archive
  lifecycle, object-store adapters, and tests.

## TDD Evidence

Red:

- `node --test scripts/check-governance-unit-coverage.test.cjs` failed because
  `SYS-RUNTIME-ROOT` was still a `component` owner.
- `pnpm --filter @dvt/cli test` failed because `cliPackageSurface` did not
  exist and the package exported only a placeholder.

Green:

- `node --test scripts/check-governance-unit-coverage.test.cjs` passes after
  the manifest split.
- `pnpm --filter @dvt/cli test` passes after replacing the placeholder with
  honest package metadata.

## ADR Decision

No new ADR is required. The slice implements existing governance and
architecture rules from ADR-0003, ADR-0004, ADR-0014, ADR-0034, ADR-0055,
the command/query rail governance, and the system governance unit taxonomy.
