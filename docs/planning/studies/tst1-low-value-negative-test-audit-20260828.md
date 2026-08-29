# TST1 — Source-first audit of low-value negative tests and redundant CI proof

**Status:** Study active; API implementation cut authorized  
**Date:** 2026-08-28 / refined 2026-08-29  
**Repository:** `dunay2/dvt`  
**Initial baseline:** `main@4bfbacdd6accc46a80060095ca30b7e20175e2fc`  
**Refreshed implementation baseline:** `main@ef3a90894ffbb8f5b884aa58dd3592084985e04d`  
**Epic:** #2697  
**First implementation:** #2734 for the approved bounded API cut under #2698

## 1. Question

DVT needs negative tests, but it does not need an unbounded blacklist of every historical field, symbol, filename, implementation detail or documentation string that must never reappear.

The question is not:

> Does this test contain `not`, `rejects`, `not.toHaveProperty` or another negative assertion?

The first question is now:

> **What is the intention of the test, and which component should own that invariant?**

Only then ask:

> What independent failure does it detect, how costly is the regression, and is this the cheapest authoritative proof?

A negative test is high value when it prevents a real security, data-integrity, lifecycle, interoperability or product failure. A source-reading test can also be high value when it protects architecture. The error is not source inspection by itself; the error is proving the same architecture separately in many package suites, or keeping historical syntactic blacklists after the architectural rule has a stronger owner.

## 2. Intent-first owner routing

The audit classifies intent **before** KEEP / CONSOLIDATE / REPLACE / REMOVE.

| Test intention | Canonical owner | Preferred proof |
| --- | --- | --- |
| product/runtime behavior | owning module | direct behavior/command/query test |
| security / tenant / integrity | owning security/domain boundary | fail-closed behavior + service-backed proof where needed |
| public protocol/schema | `@dvt/contracts` | parse/serialize/schema boundary |
| layer/package/dependency architecture | repository `arch:deps` | Dependency Cruiser |
| semantic architecture not expressible as a dependency edge | existing central architecture guard under `tools/ci` | AST/reachability rule once, centrally |
| package public surface | package/export boundary | actual consumer import/build/typecheck |
| docs/governance | docs/governance CI | canonical docs checks |
| deployment/configuration posture | deployment/CI owner | configuration/boot/deploy contract |
| test-suite routing/duplication | CI test-routing owner | semantic manifest/scope proof |

### Central architecture fact already present in the repository

The repository already has an architecture authority:

```text
pnpm arch:deps
  -> tools/ci/check-architecture-dependencies.mjs
  -> Dependency Cruiser rules
  + central semantic AST/reachability checks
```

`arch:deps` is invoked by normal code-quality/pre-push rails. Therefore a local Vitest should not scan an entire workspace merely to re-prove a dependency/layer invariant already representable there.

Important nuance: **Dependency Cruiser is not forced to express symbol-level semantics it cannot represent cleanly.** The existing central architecture guard already combines Dependency Cruiser with AST/reachability analysis. The correct rule is:

```text
plain dependency/layer rule -> Dependency Cruiser
semantic architecture rule -> central architecture guard
never -> copy the same source blacklist into every package suite
```

## 3. Source-first rule

Current code, tests and configuration are authority. Issues and historical plans are used to recover intent, not to classify a test as valuable merely because an old issue requested it.

Candidate discovery uses patterns such as `readFileSync`, repository-file readers, exact `toContain/not.toContain` source assertions, file-existence checks and historical-absence guards. These are **signals only**.

A normal behavioral test can be redundant. A source-reading architecture test can be valuable but misplaced.

## 4. Disposition rule

After the test intention and owner are known, every candidate receives one disposition:

- `KEEP`: independent high-value invariant and proof is already in the correct owner.
- `CONSOLIDATE`: useful invariant repeated across equivalent cases/layers.
- `RELOCATE`: useful invariant is in the wrong suite; move it to the existing owner without duplicating it.
- `REPLACE`: useful invariant, wrong proof mechanism; use stronger behavior/import/schema/dependency/live proof.
- `REMOVE`: no independent invariant remains or a stronger owner already proves it.

`RELOCATE/REPLACE` is preferred over `REMOVE` when architectural intent is real.

No deletion quota is defined.

## 5. Negative tests explicitly protected

These categories are presumed `KEEP` unless source inspection proves equal or stronger duplication:

- authentication and authorization denial;
- tenant/project/environment isolation;
- secret non-disclosure and forbidden credential/resource access;
- path traversal and symlink escape;
- PlanRef, ExecutionPlan and artifact hash/tamper rejection;
- invalid run-state transitions;
- idempotency/replay conflicts;
- CAS and stale-write rejection;
- destructive/unsafe SQL or execution admission;
- cross-project contamination;
- workflow cancel/pause/resume/recovery semantics;
- unsupported provider/capability fail-closed behavior;
- malformed external input with security/data-loss consequences;
- provider compatibility and version mismatch;
- lineage/evidence integrity;
- Substrait profile/version/skew/identity invariants;
- deterministic planner/runtime behavior.

Example: `packages/@dvt/planner/test/unit/dbt-step-factory.test.ts` proves that resolved Planner policy removes caller-owned retry/timeout/concurrency fields where Planner policy is authoritative. Those negative property assertions protect product semantics and are not cleanup targets.

## 6. Low-value / wrong-owner signals

Strong review candidates include:

1. one product test reads source and asserts an exact internal symbol/call/import although `arch:deps` can own the boundary;
2. many module tests repeat the same forbidden architecture dependency;
3. an old file must remain absent after a completed migration although package resolution/scanner already proves the cut;
4. exact re-export source strings replace an actual consumer import test;
5. one historical object property is blacklisted although an explicit mapper and strict schema already fail if it leaks;
6. exact test names/test filenames are treated as product contracts;
7. `Owned concern` comments are asserted inside product suites;
8. docs headings/user-story IDs/Mermaid are duplicated in Web/API tests;
9. package-script strings are tested where the real intent is suite routing or deployment posture;
10. the same parser/schema rejection branch is repeated with incidental literals;
11. local source regexes duplicate Dependency Cruiser, typecheck, build or central governance checks;
12. retired implementation names are blacklisted indefinitely;
13. CSS/copy/DOM-string absence is asserted when rendered behavior/accessibility already owns the invariant;
14. a workspace-wide AST/source scan runs inside one package suite although its concern is repository architecture.

## 7. First-pass source signals

Discovery counts from the initial baseline are not deletion counts.

| Area | Mechanical signal | Initial interpretation |
| --- | ---: | --- |
| `apps/api/test` | 6 `readFileSync` consumers | bounded residual family after prior API cleanup |
| `apps/web` | 52 `readFileSync` occurrences | broad tree; classify by intent |
| Web `readRepoFile` consumers | 22 | first bounded Web architecture family |
| `@dvt/contracts/test` | 12 `readFileSync` consumers | separate schema semantics from topology |
| `@dvt/engine/test` | 13 `readFileSync` consumers | strong package/topology signal |
| `@dvt/planner/test` | 2 `readFileSync` consumers | small audit; no artificial deletion target |
| `@dvt/state-store/test` | 0 | no source-text smell found by this signal |
| `@dvt/artifacts/test` | 0 | no source-text smell found by this signal |
| `@dvt/delivery/test` | 2 | review two architecture tests |
| `@dvt/adapter-postgres/test` | 4 | security-sensitive; preserve intent |
| `@dvt/adapter-temporal/test` | 5 | several architecture/literal guards |
| Temporal step-plugin prefix | 0 | no source-reader signal in searched prefix |
| `apps/temporal-worker` | 1 test source reader + 1 production reader | one architecture candidate |
| `tools/**` | 40 `readFileSync` occurrences | mostly legitimate repository tooling; audit duplication, not count |

## 8. Confirmed candidates and intent

### C-API-001 — dbt projection historical field blacklist

**Path:** `apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts`

The analyzer fixture intentionally includes `sourceTableDeclaration`. Production `projectAnalysisResource()` explicitly enumerates the public projected fields, and `execute()` parses the complete output using strict `DbtProjectGraphProjectionSchema`.

The test also separately asserted:

```text
not.toHaveProperty('sourceTableDeclaration')
```

**Intent:** public projection must not leak analyzer-private fields.

**Owner:** explicit API projection + strict Contracts schema.

**Disposition:** `REMOVE` the field-specific assertion while retaining the fixture field and positive use-case execution. This is stronger than deleting the scenario: if the mapper starts spreading analyzer fields, the same positive test fails during strict schema parsing before reaching the removed assertion.

**Implementation:** #2734.

### C-API-002 — deployment command posture

**Path:** `apps/api/test/app.test.ts`

The original study incorrectly described this current file as protected-runtime constructor topology. Refreshed source proves otherwise.

The source-reading portion checks:

- `Procfile`;
- root/API Nixpacks configuration;
- API Dockerfile;
- pnpm vs npm command posture and exact API build/start commands.

The same file also contains real app smoke/CORS/observability shutdown behavior.

**Intent:** deployment packaging/entrypoint consistency, not application architecture.

**Owner:** deployment/CI operations.

**Disposition:** `REVIEW` under #2707. Do **not** delete or migrate it into `arch:deps` merely because it reads files.

### C-API-003 — test execution manifest

**Path:** `apps/api/test/testExecutionManifest.test.ts`

It imports actual unit/integration Vitest configs and proves the manifests are disjoint, then reads package scripts and asserts exact command strings.

**Intent:** no omitted/duplicated API suite in full CI entrypoints.

**Owner:** CI/test-routing policy.

**Disposition:** keep the semantic manifest partition; review exact command-string assertions under #2707. Not part of the architecture cut.

### C-API-004 — State Store role-binding architecture

**Old path:** `apps/api/test/architecture/stateStoreRoleBoundary.architecture.test.ts`

The test recursively parsed all API source and mixed two intentions:

1. only `modules/` or `runtime/` composition code may import/use `bindStateStoreRoles`;
2. no other file may reconstruct one exact three-role intersection/object-literal shape.

Production `StateStoreRoleBindings` is already branded by an unexported unique symbol.

**Intent 1:** architectural dependency/composition ownership.

**Owner:** root `arch:deps` / Dependency Cruiser.

**Disposition:** `RELOCATE`. #2734 adds one central Dependency Cruiser rule that rejects non-root runtime dependencies on `stateStoreRoles.ts` while allowing type-only dependency edges.

**Intent 2:** prevent a syntactically similar aggregate from reappearing anywhere.

**Owner decision:** no automatic new owner. The old AST patterns are implementation archaeology unless independent current risk is demonstrated beyond the branded type + binding dependency rule.

**Disposition:** `REMOVE` the exact intersection/object-literal blacklists rather than reproduce them centrally by default.

#2734 also adds a small central CI-tool contract for registration/shape of the Dependency Cruiser rule; it replaces a workspace-wide API scan with a constant-size repository architecture policy check.

### C-WEB-001 — Admin route architecture archaeology

**Path:** `apps/web/src/app/views/AdminView.architecture.test.ts`

It reads production source, another test, architecture docs and a planning backlog, then asserts exact headings, Mermaid, story IDs, implementation symbols, absence of `useState`, test names and doc index/file presence.

**Valuable intent:** selected Admin tab is route-authoritative and survives refresh.

**Owner:** rendered/router behavior.

**Disposition:** `REMOVE` docs/test-name/source topology assertions; `KEEP/REPLACE` the actual refresh behavior. Docs lifecycle belongs to docs CI.

### C-WEB-002 — TopAppBar implementation blacklist

**Path:** `apps/web/src/app/components/TopAppBar.architecture.test.ts`

It requires exact component/import/data-slot symbols, `Owned concern` comments, historical setter/component absence and architecture/planning text.

**Valuable intent:** workspace context is read-only and governed changes use the approved command rail.

**Owner:** rendered behavior + command boundary; actual forbidden package dependency belongs to `arch:deps` if one exists.

**Disposition:** `REPLACE/RELOCATE`, not blind delete.

### C-WEB-003 — Web architecture support ownership

**Path:** `apps/web/src/testing/vitestSuites.architecture.support.ts`

It lists tests, counts tests/lines, reads repository files and scans raw paths.

**Disposition:** `REVIEW`. Keep only functionality consumed by current CI; helpers used solely by displaced topology tests retire with their consumers.

### C-CONTRACTS-001 — source-reading architecture family

**Scope:** 12 initial `readFileSync` consumers, including provider-adapter, plan-store-record and start-run architecture tests.

**Intent split:** protocol/schema semantics stay in Contracts; dependency/package topology migrates to package import/build/`arch:deps` proof.

### C-PLANNER-001 — private/topology guards

Two initial source-reading tests were found.

**Rule:** planner determinism/policy/selection semantics stay local. Private file/layout ownership only survives if it expresses an actual dependency boundary and then belongs centrally.

### C-ENGINE-001 — historical `IWorkflowEngine` file ownership

`package-surface.test.ts` checks a useful public surface through exact internal path presence, legacy path absence and re-export strings.

**Intent:** one supported public engine surface.

**Owner:** package export/import contract.

**Disposition:** `REPLACE` with real consumer import/build/typecheck; remove historical path archaeology.

### C-DELIVERY-001 — source-reading architecture pair

Shard assignment and outbox ownership may be high-value. Behavior stays local; exact topology moves only if it represents a real central dependency rule.

### C-PG-001 — PostgreSQL source-reading architecture family

Tenant isolation/service access are security invariants. Source-reading proof may be replaced, but the invariant cannot disappear. Prefer real RLS/service-backed proof; use central architecture only for actual dependency boundaries.

### C-TEMP-001 — Temporal workflow literal parity

`workflow-literals.test.ts` checks exact workflow names/absence, signal source literals and activity-routing call strings.

**Intent split:** workflow registration/signals/determinism are real; historical function-name vocabulary is not automatically a permanent contract.

**Disposition:** `REPLACE` with executable registration/signal/determinism/dependency proof where possible. Keep one source restriction only if Temporal determinism makes it uniquely necessary.

### C-WORKER-001 — Temporal worker SRP topology

Internal folder/helper SRP assertions should become composed worker/capability behavior or one central dependency rule, not duplicated source placement tests.

### C-CI-001 — static proof overlap

`tools/**` legitimately reads repository source. The target here is duplicate ownership, not source reading itself.

Use #2410/#2707 to consolidate:

- repeated regex vs AST/dependency checks;
- product tests repeating docs checks;
- package scripts repeated as literal assertions;
- multiple recurrence guards for one retired mechanism;
- duplicated test execution paths.

## 9. Replacement hierarchy

When a real invariant uses a brittle or misplaced proof, prefer:

1. direct behavior/command/query invocation;
2. public consumer import/export/typecheck;
3. strict schema at the contract owner;
4. Dependency Cruiser for dependency/layer architecture;
5. central semantic AST/reachability architecture guard where Dependency Cruiser cannot express the invariant;
6. service-backed/live proof;
7. docs/governance checks at their own CI owner;
8. source-text scan only when no stronger proof exists and recurring cost is justified.

## 10. Module issues

- #2698 — API + dbt/source-import
- #2699 — Web Canvas/Shell
- #2700 — Contracts
- #2701 — Planner / Plan Verifier / Plan Interpreter
- #2702 — Engine / Run Domain
- #2703 — State Store / Artifacts / Delivery
- #2704 — PostgreSQL / Temporal adapters + step plugins
- #2705 — worker applications
- #2706 — crypto / observability / traceability / DSL / CLI
- #2707 — root CI / scripts / governance / static proof

A module may correctly conclude `no material cleanup`.

## 11. Implementation discipline

Do not make one repository-wide removal PR.

```text
identify intention
-> identify current owner
-> classify overlap
-> choose KEEP | CONSOLIDATE | RELOCATE | REPLACE | REMOVE
-> record before proof/cost
-> implement one bounded cut
-> run owner-specific proof + normal gates
-> record after proof/cost
-> next cut
```

Implementation must never weaken a security/data-integrity/lifecycle invariant to save CI seconds.

## 12. Authorization state

The product owner authorized continuing with the intent-first refinement on 2026-08-29.

**Authorized now:** the bounded API cut represented by #2734.

**Not automatically authorized:** mass deletion in later modules. Each later module still needs source-first intent classification and a bounded implementation proposal before changes are made.
