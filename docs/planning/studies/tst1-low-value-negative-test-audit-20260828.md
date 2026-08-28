# TST1 — Source-first audit of low-value negative tests and redundant CI proof

**Status:** Study / proposal only  
**Date:** 2026-08-28  
**Repository:** `dunay2/dvt`  
**Baseline:** `main@4bfbacdd6accc46a80060095ca30b7e20175e2fc`  
**Epic:** #2697  
**Implementation authorization:** **NOT GRANTED**. This study proposes dispositions; it does not authorize deleting or replacing tests.

## 1. Question

DVT needs negative tests, but it does not need an unbounded blacklist of every historical field, symbol, filename, implementation detail or documentation string that must never reappear.

The question is not:

> Does this test contain `not`, `rejects`, `not.toHaveProperty` or another negative assertion?

The question is:

> What independent invariant does this test protect, how costly is a regression, and is this the cheapest authoritative proof of that invariant?

A negative test is high value when it prevents a real security, data-integrity, lifecycle, interoperability or product failure. It is low value when it permanently tests implementation archaeology already made impossible or irrelevant by a stronger owner.

## 2. Source-first rule

This study uses current code/tests/configuration as authority. Issues and historical plans are used to find prior intent, not to classify a test as valuable merely because an old issue requested it.

Candidate discovery uses source-reading patterns such as `readFileSync`, repository-file readers, exact `toContain/not.toContain` source assertions, file-existence checks and historical-absence guards. These are **signals only**. A source-reading test can still be valuable, especially for security or deterministic-runtime boundaries, and a normal behavioral test can still be redundant.

## 3. Decision rule

> A test earns recurring CI cost only when it protects a product, security, data-integrity, public-contract or architecture invariant that can actually regress and is not already proved by a cheaper authoritative check.

Every candidate receives one disposition:

- `KEEP`: independent, high-value invariant; proof is appropriately placed.
- `CONSOLIDATE`: useful invariant but repeated across equivalent cases or layers.
- `REPLACE`: useful invariant, wrong proof mechanism; replace source/topology inspection with behavior/import/schema/dependency/live proof.
- `REMOVE`: no independent invariant remains or a stronger owner already proves it.

No deletion quota is defined.

## 4. Negative tests we explicitly protect

The following categories are presumed `KEEP` unless source inspection shows they duplicate an equal or stronger proof:

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

Example of a negative assertion that is **not** a cleanup target by itself:

`packages/@dvt/planner/test/unit/dbt-step-factory.test.ts` proves that resolved Planner policy removes caller-owned retry/timeout/concurrency fields where the Planner is authoritative. The absence assertions protect real product policy precedence, not historical topology.

## 5. Low-value signals

A test becomes a strong review candidate when it does one or more of the following without an independent high-risk invariant:

1. reads production source as text and checks exact symbols/calls/imports;
2. checks that an old file no longer exists after a completed migration;
3. checks exact internal file/folder ownership instead of public behavior;
4. checks exact re-export source strings instead of importing the package as a consumer;
5. blacklists one historical object property although a strict schema plus positive mapper already owns the boundary;
6. asserts exact test names or test file names;
7. asserts `/** Owned concern:` or another documentation comment in a product test;
8. tests architecture documentation headings/user-story IDs/Mermaid inside Web/API unit suites;
9. fixes exact package-script command strings although the execution manifest/CI can be verified semantically;
10. repeats the same invalid-schema/parser branch with many incidental literals;
11. duplicates repository dependency/type/build/governance checks in package-local source regexes;
12. protects retired implementation names solely because a migration once removed them;
13. checks CSS/copy/DOM-string absence where rendered behavior/accessibility already proves the user invariant;
14. preserves current file topology through static inventories with no product/runtime consequence.

## 6. First-pass source signals at the baseline

These are discovery counts, **not proposed deletion counts**.

| Area | Mechanical signal | Initial interpretation |
| --- | ---: | --- |
| `apps/api/test` | 6 `readFileSync` consumers | bounded residual source/topology family after prior API cleanup |
| `apps/web` | 52 `readFileSync` occurrences | broad tree; includes support/config; classify, do not bulk delete |
| Web `readRepoFile` consumers | 22 | first bounded Web architecture family to inspect |
| `@dvt/contracts/test` | 12 `readFileSync` consumers | strict contract tests + architecture tests must be separated |
| `@dvt/engine/test` | 13 `readFileSync` consumers | strong source/package-topology signal |
| `@dvt/planner/test` | 2 `readFileSync` consumers | likely small audit; do not manufacture a cleanup target |
| `@dvt/state-store/test` | 0 | no source-text smell found by this signal |
| `@dvt/artifacts/test` | 0 | no source-text smell found by this signal |
| `@dvt/delivery/test` | 2 | review two architecture tests |
| `@dvt/adapter-postgres/test` | 4 | security-sensitive; replacement proof required before removal |
| `@dvt/adapter-temporal/test` | 5 | several architecture/literal guards |
| Temporal step-plugin prefix | 0 | no source-reader signal in searched plugin prefix |
| `apps/temporal-worker` | 1 test source reader + 1 production source reader | one architecture test candidate; production reader is unrelated |
| `tools/**` | 40 `readFileSync` occurrences | mostly legitimate executable tooling; audit ownership/duplication, not count |

## 7. Confirmed initial candidates

### C-API-001 — dbt graph projection historical field blacklist

**Path:** `apps/api/test/application/projectDbtGraphFromFilesUseCase.test.ts`

**Current proof:** the analyzer resource includes `sourceTableDeclaration`; `ProjectDbtGraphFromFilesUseCase.projectAnalysisResource()` explicitly projects the supported graph fields; the final payload is parsed by strict `DbtProjectGraphProjectionSchema`.

**Additional assertion:** projected source must `not.toHaveProperty('sourceTableDeclaration')`.

**Proposed disposition:** `CONSOLIDATE/REMOVE` the field-specific negative after proving that Contracts owns a generic unknown-field rejection for the strict graph node/schema. Keep the positive projection assertions and live dbt projection test.

**Why:** otherwise every future analyzer-only field can generate another permanent blacklist test even though the mapper and strict schema already define the boundary.

### C-API-002 — protected-runtime constructor/string topology

**Path:** `apps/api/test/app.test.ts`

The file contains important auth/runtime integration tests and must not be treated as disposable. Specific source-reading assertions around protected runtime construction are separate candidates.

**Proposed disposition:** `REPLACE` exact source/constructor wiring checks with executable composition behavior or a module-level identity assertion if that invariant remains uncovered.

### C-API-003 — exact test command strings

**Path:** `apps/api/test/testExecutionManifest.test.ts`

**Valuable invariant:** API test suites must not be accidentally executed twice and supported commands must resolve to the intended suite.

**Low-value mechanism:** exact package script string equality and regex parsing of Vitest config text.

**Proposed disposition:** `REPLACE` exact command literals with a semantic execution-manifest/suite partition check, ideally reusing the repository CI authority. Coordinate with #2410.

### C-WEB-001 — Admin route architecture archaeology

**Path:** `apps/web/src/app/views/AdminView.architecture.test.ts`

The test reads:

- `AdminView.tsx`;
- `AdminView.test.tsx`;
- architecture component docs;
- a planning backlog.

It asserts exact headings, Mermaid, user-story IDs, implementation symbols, an exact line of source, absence of `useState`, exact test names, route literal and documentation file/index presence.

**Valuable invariant:** selected Admin tab is route-authoritative and survives refresh.

**Proposed disposition:** `REMOVE` documentation/test-name/source-layout assertions; `KEEP/REPLACE` with the existing actual router/component refresh behavior. Docs lifecycle belongs to docs CI.

### C-WEB-002 — TopAppBar exact implementation blacklist

**Path:** `apps/web/src/app/components/TopAppBar.architecture.test.ts`

Current test checks exact component/import/data-slot symbols, requires `Owned concern` comments, blacklists historical setters/select components and checks large quantities of architecture/planning text.

**Valuable invariant:** workspace identity is read-only in the active shell; governed scope changes use the approved selection rail.

**Proposed disposition:** `REPLACE` with rendered read-only behavior, command-port effect and accessibility. Use dependency tooling for a genuinely forbidden import boundary. `REMOVE` docs/docblock/history assertions.

### C-WEB-003 — Web architecture support ownership

**Path:** `apps/web/src/testing/vitestSuites.architecture.support.ts`

This support recursively lists tests, counts tests/lines, reads repository files and scans raw paths.

**Proposed disposition:** `REVIEW`. Keep the minimum suite partition functionality actually consumed by current CI; retire source-reading/counting helpers when their only remaining consumers are low-value topology tests.

### C-CONTRACTS-001 — source-reading architecture family

**Scope:** 12 current `readFileSync` consumers, including:

- `provider-adapter.architecture.test.ts`;
- `plan-store-records.architecture.test.ts`;
- `start-run-boundary.architecture.test.ts`.

**Proposed disposition:** per-test `REVIEW`; separate protocol/schema semantics from implementation/file/export topology. Strict schemas remain strict.

### C-PLANNER-001 — source-reading private/topology guards

**Paths:**

- `packages/@dvt/planner/test/unit/executable-subgraph-deriver.architecture.test.ts`;
- `packages/@dvt/planner/test/unit/planner-private-ownership.architecture.test.ts`.

**Proposed disposition:** `REVIEW/REPLACE` only if they protect topology rather than actual facade/dependency behavior. Planner determinism and policy negatives remain protected.

### C-ENGINE-001 — historical `IWorkflowEngine` file ownership

**Path:** `packages/@dvt/engine/test/contracts/package-surface.test.ts`

Current test checks:

- root export exists;
- wildcard export does not exist;
- exact `src/ports/IWorkflowEngine.ts` file exists;
- exact legacy `src/contracts/IWorkflowEngine.v1.ts` file does not exist;
- exact export line is present;
- another index does not contain the name.

**Valuable invariant:** consumers see one supported public engine surface.

**Proposed disposition:** `REPLACE` with actual package import/export resolution and typecheck. `REMOVE` exact internal path and historical-file absence assertions once the public surface is independently proved.

### C-DELIVERY-001 — source-reading architecture pair

**Paths:**

- `packages/@dvt/delivery/test/OutboxShardAssignment.architecture.test.ts`;
- `packages/@dvt/delivery/test/OutboxInMemoryStorageOwnership.architecture.test.ts`.

**Proposed disposition:** `REVIEW`. Shard assignment and ownership can be high-value; keep them behaviorally. Retire exact implementation topology if duplicated.

### C-PG-001 — PostgreSQL source-reading architecture family

Four source-reading tests were found, including tenant-isolation, service-access capability and retention-policy architecture tests.

**Proposed disposition:** `REVIEW`, with a high bar for deletion. Tenant isolation/service access are security invariants. If current proof is brittle source inspection, prefer replacing it with real SQL/RLS/service-access tests; do not remove the invariant.

### C-TEMP-001 — Temporal workflow literal parity

**Path:** `packages/@dvt/adapter-temporal/test/workflow-literals.test.ts`

Current test reads workflow source and checks:

- exact `runPlanWorkflow` function name;
- absence of `runPlanWorkflowV2`;
- signal definition literals;
- absence of `parseDslV1`/`evaluateDslV1`;
- exact activity-routing call strings.

**Valuable invariants:** workflow registration matches public contract; PAUSE/RESUME/CANCEL are supported; non-deterministic/business DSL evaluation remains outside Temporal workflow code.

**Proposed disposition:** `REPLACE` source literals with executable registration/signal tests plus bundle/dependency/determinism checks where possible. If one source-level restriction is still uniquely required by Temporal determinism, keep one justified guard rather than a vocabulary blacklist.

### C-WORKER-001 — Temporal worker SRP topology

**Path:** `apps/temporal-worker/test/runtime/createTemporalWorkerRuntime.srp.architecture.test.ts`

**Proposed disposition:** `REVIEW/REPLACE` internal SRP/source placement with composed worker boot/capability/plugin behavior where possible.

### C-CI-001 — static proof overlap

`tools/**` has substantial source-reading because many tools legitimately analyze the repository. That is not a smell by itself.

The audit target is duplicated ownership:

- source regex duplicated by AST/dependency tooling;
- product tests repeating docs/governance checks;
- exact package script literals duplicated by CI routing;
- several recurrence guards protecting the same retired mechanism;
- suites executed twice through root and package paths.

**Proposed disposition:** use #2410 as the existing static-test routing owner, measure runner seconds, and consolidate by invariant rather than by tool count.

## 8. Replacement hierarchy

When a current test protects a real invariant but uses a brittle mechanism, prefer:

1. behavior/command/query invocation;
2. consumer package import/export/typecheck;
3. strict schema + one generic unknown-field proof;
4. dependency/reachability/AST check;
5. service-backed/live product proof;
6. dedicated docs/governance check;
7. source-text scan only when no stronger executable proof exists and recurring cost is justified.

## 9. Module issues

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

The order above is also the proposed implementation order **after approval**. Each module is audited to completion before an implementation cut is opened.

## 10. Proposed implementation shape after approval

Do not make one giant test-removal PR.

Preferred sequence:

```text
one approved module
-> record exact before test count/suite timing
-> remove/consolidate/replace only classified cases
-> run focused suite
-> run mandatory package/repo gates
-> record after count/timing + protected invariants
-> merge
-> next module
```

A module may close with `no material cleanup`.

## 11. Metrics

Per implementation cut, record when practical:

- test files removed/retained;
- test cases removed/consolidated/replaced;
- package suite wall time before/after;
- CI runner seconds for affected jobs before/after;
- number of source-text/topology assertions removed;
- replacement proof type;
- high-value negative cases deliberately retained.

Do not optimize a test count at the cost of failure detection.

## 12. Approval gate

This study deliberately stops before implementation.

No test, source file, CI check or threshold should be changed until the product owner reviews the proposed strategy and selects the first module cut.

Recommended first implementation candidate, if approved: **#2698 API**, because it contains the motivating #2404 field-specific negative plus a small bounded set of six source readers and overlaps known prior cleanup work.
