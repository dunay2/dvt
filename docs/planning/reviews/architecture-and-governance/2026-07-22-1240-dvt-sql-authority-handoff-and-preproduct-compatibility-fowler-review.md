---
title: DVT SQL Authority Handoff and Pre-Product Compatibility Fowler Review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-22T12:40:00+02:00
review_type: architecture-and-governance-delta
scope: documentation-only
---

# DVT SQL Authority Handoff and Pre-Product Compatibility Fowler Review

## 1. Executive verdict

This cycle contains a real product delta, but it is not yet ready to merge.

The exact reviewed `main` remains:

- [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- release: `v0.5.3`
- latest merged product change: run operational truth from PR #2035

One functional pull request is open:

- [PR #2040 — `fix(web): Prevent graph preview from overwriting DBT model SQL`](https://github.com/dunay2/dvt/pull/2040)
- base: `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- head: `6257745ed1ec91f1a1415585d24e319905966931`
- branch: `fix/dbt-model-sql-authority-containment`
- commits: 1
- changed files: 24
- additions: 2,766
- deletions: 57
- mergeable: yes
- six standard workflows: green

The PR advances the correct product priority: eliminate silent overwrite between graph-owned SQL and Project Code.

Its main direction is sound:

1. graph-derived model SQL receives a deterministic marker;
2. every artifact is read before the first write;
3. the revision observed during preflight is retained for compare-and-swap;
4. divergent model SQL blocks Preview before any known write begins;
5. graph-owned files are rendered read-only in Project Code;
6. file-authoritative dbt projects remain editable;
7. a protected Cypress flow proves byte-for-byte preservation after an external edit.

However, three merge gates remain:

1. `DELIVERY-HANDOFF-MISSING`;
2. an unsupported `adopt_legacy_equivalent` compatibility path contradicts the explicit pre-product decision;
3. Planning DB overstates an unkeyed SHA-256 digest as authentication instead of payload-integrity detection.

The Codex review thread that demanded migration of divergent pre-marker artifacts is correctly classified as **DISPROVED**. There is no supported deployed artifact population or compatibility contract. That finding must not be reopened.

The current branch nonetheless still contains its own legacy auto-adoption path. That is a separate, source-backed deviation and must be removed.

After PR #2040 is corrected and handed off, the next product slice is the existing atomic multi-file publication and exact project-revision task. It must reuse `IWorkspaceFileBatchMutationPort`, not extend the current sequential publisher into a second transaction framework.

---

## 2. Review authority and evidence boundaries

### 2.1 Operational authority

This report is review evidence, not implementation authority.

The operational sequencing authority remains:

1. live Planning DB task, design, dependency, component and evidence state;
2. [`docs/adr/ADR-0060-dbt-project-authoring-authority.md`](https://github.com/dunay2/dvt/blob/8c098d6e35ce874efae81609814d99e8e60091f7/docs/adr/ADR-0060-dbt-project-authoring-authority.md);
3. [`docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`](https://github.com/dunay2/dvt/blob/8c098d6e35ce874efae81609814d99e8e60091f7/docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md);
4. merged contracts, code, tests and architecture guards;
5. exact-head CI and protected live evidence.

Closed or unmerged review Markdown is not current product authority.

### 2.2 Pre-product compatibility rule

DVT is pre-product unless a merged contract or explicit product-owner decision states otherwise.

Therefore:

- local development workspaces are disposable;
- test fixtures are disposable;
- branch-only formats are disposable;
- unreleased generated artifacts are disposable;
- a semantic-version tag alone does not establish persisted-data compatibility;
- no migration is required for a format that was never a supported product contract;
- compatibility work requires evidence of a real preservation obligation.

A compatibility finding is valid only when it names at least one of:

- a merged versioned contract;
- a deployed dataset;
- a release guarantee;
- a supported upgrade path;
- an explicit product-owner preservation decision.

None exists for pre-marker graph-draft SQL artifacts.

The correct unknown-artifact behavior is fail closed.

---

## 3. Repository and release state

### 3.1 Main

Current `main` is unchanged from the previous cycle:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

No new product code has landed after release `0.5.3`.

### 3.2 Release

Release `v0.5.3` contains the merged run operational-truth slice from PR #2035.

The release lane is not currently the product bottleneck.

No new release-governance expansion is justified before the active dbt authority and publication slices close.

### 3.3 Open pull requests

Only PR #2040 was open before this review branch was created.

There is no competing functional branch visible for:

- scoped `ListRuns` keyset pagination;
- atomic dbt publication;
- exact project revision identity;
- workspace inventory truth;
- durable authoring recovery.

### 3.4 Recent review reports

PR #2039 was closed after DB-first triage.

Its `ListRuns` finding was preserved as Planning DB task:

```text
E-RUNS-SCOPED-KEYSET-PAGINATION-1
```

That task remains relevant but must not displace the currently active model-SQL authority transaction.

---

## 4. Iteration handoff status

## DELIVERY-HANDOFF-MISSING

No valid top-level `## Iteration Handoff` exists for PR #2040.

The PR body supplies:

- root cause;
- a change summary;
- validation command names;
- the branch and head through PR metadata.

It does not supply the full required delivery contract.

### 4.1 Missing fields

The agent must add one top-level PR comment beginning exactly:

```markdown
## Iteration Handoff
```

The current iteration is not fully auditable until that report includes:

1. exact base SHA;
2. exact final head SHA;
3. branch and PR;
4. iteration goal;
5. user transaction being closed;
6. what changed;
7. how it was implemented;
8. why that design was chosen;
9. rejected alternatives;
10. exact DDD/domain owners;
11. reused command/query rails;
12. ports used;
13. adapters used;
14. contracts used or deliberately not added;
15. Planning DB designs, tasks and migrations;
16. all runtime and test files touched;
17. user-visible behavior;
18. tests observed failing before implementation;
19. tests passing after implementation;
20. exact-head workflow links;
21. protected live-browser proof;
22. security posture;
23. data-integrity posture;
24. observability posture;
25. compatibility posture;
26. rollback posture;
27. unresolved risks;
28. route deviations;
29. next bounded iteration.

### 4.2 Handoff acceptance rule

A list of commands is not tests-first evidence.

The handoff must distinguish:

- executed evidence;
- repository-derived inference;
- design intent;
- work still unproved.

It must state that pre-marker development artifacts have no preservation guarantee and that no legacy migration is supported.

---

## 5. PR #2040 claim-to-evidence matrix

| Claim | Evidence inspected | Status | Review conclusion |
| --- | --- | --- | --- |
| Exact base, branch, PR and head are known | PR metadata | VERIFIED | Base and head are exact and unchanged during this review. |
| The branch addresses the approved model-SQL authority priority | Planning DB task ID, PR scope, source diff | VERIFIED | This is the correct product lane. |
| Graph-generated SQL is deterministic and marked | `canvasDbtWorkspaceArtifacts.ts`, `dbtGraphModelSqlPublicationPolicy.ts` | VERIFIED | SQL payloads receive a deterministic comment marker. |
| Marker detects payload mismatch | parser plus SHA-256 recomputation tests | VERIFIED | Modified payload without matching digest becomes conflict. |
| Marker authenticates graph ownership | unkeyed digest stored in same mutable file | CONTRADICTED | It integrity-checks bytes; it does not authenticate origin or authority. |
| Project Code cannot edit graph-owned files through the normal UI | `CodeView.tsx`, edit posture, viewer surface and tests | VERIFIED | Graph-owned paths render through `MonacoCodeViewer`. |
| File-authoritative dbt projects remain editable | explicit `dbt-project-files` posture and tests | VERIFIED | The read-only rule is scoped to graph-draft authority. |
| Every artifact is preflighted before the first write | publisher implementation and unit test | VERIFIED | `Promise.all` completes reads/classification before the write loop. |
| Expected revisions are bound once | prepared artifact captures observed revision | VERIFIED | Later writes reuse preflight revisions. |
| Known divergence prevents all writes | publisher negative test | VERIFIED | A later divergent SQL artifact causes zero writes. |
| Publication is atomic under a concurrent change during the write loop | sequential save loop | CONTRADICTED | A later CAS conflict can occur after earlier files have been written. This is explicitly the next task, not completed here. |
| External unmarked divergent SQL is preserved | live Cypress flow and policy test | VERIFIED | Preview rejects and bytes remain unchanged. |
| Existing unmarked equivalent SQL is safely supported | `adopt_legacy_equivalent` branch | CONTRADICTED | There is no supported legacy state; this is unsupported auto-adoption. |
| No duplicate command/query rail was introduced | Web publisher uses existing file query/command ports | VERIFIED | No new persistence rail is visible. |
| Protected live proof exercises real API/runtime | Cypress file and PR validation claim | PARTIAL | Source is present and CI is green; the handoff lacks a direct run/evidence link and execution transcript. |
| All six standard workflows pass | exact PR head workflow runs | VERIFIED | Contracts, Dependency Review, Test Suite, Code Quality, CodeQL and PR Quality Gate are green. |
| Planning DB accurately describes security semantics | migration 797 uses “authenticates” | CONTRADICTED | Architecture truth overclaims the digest. |
| Planning DB accurately preserves the atomic publication gap | migrations 797–799 and explicit non-goal | VERIFIED | This slice does not claim full multi-file atomicity. |
| Rollback is documented | PR body and comments | NOT PROVEN | No explicit rollback procedure is published. |
| Compatibility decision is documented | PR body | NOT PROVEN | The product-owner decision exists only in the resolved review thread and this review comment. |
| Final unresolved risks are documented | PR body | NOT PROVEN | No formal handoff exists. |
| Next iteration is bounded | PR body | NOT PROVEN | The next atomic slice is inferred from Planning DB and review evidence, not stated by the implementer. |

---

## 6. What PR #2040 does correctly

### 6.1 It attacks the actual authority bug

Before this branch, graph-draft Preview could:

1. read the current file revision;
2. accept that revision as the CAS expectation;
3. regenerate SQL from stale graph metadata;
4. overwrite a Project Code or external edit.

The new policy stops this sequence.

The root cause is correctly identified as hidden duplicate authority, not merely a missing warning.

### 6.2 It separates responsibilities better than the prior inline loop

The branch extracts:

- `DbtGraphModelSqlPublicationPolicy`;
- `DbtGraphWorkspaceArtifactPublisher`;
- `CodeWorkspaceFileEditPosture`;
- `CodeWorkspaceFileSurface`.

This is a reasonable decomposition:

- policy classifies SQL state;
- publisher coordinates read-before-write preflight;
- posture resolves editable versus read-only;
- surface renders one editor or viewer.

`CodeView` remains route orchestration rather than owning the complete authority policy.

### 6.3 It uses existing rails

The implementation reuses:

- `GenerateDbtWorkspaceArtifacts` semantics;
- `GetWorkspaceFileContent`;
- `SaveWorkspaceFileContent`;
- existing Web query and command ports;
- existing file revisions and compare-and-swap.

It does not introduce:

- a second workspace repository;
- a dbt-specific file-write rail;
- another editor model;
- a browser-side dbt parser;
- a new DSL;
- a hidden graph persistence store.

### 6.4 It improves fail-closed behavior

The policy rejects:

- unmarked divergent SQL;
- malformed managed markers;
- payloads whose digest does not match;
- a model conflict found anywhere in complete preflight.

The localized conflict result includes the exact path.

### 6.5 It improves the visible product model

Project Code now communicates authority rather than exposing a misleading writable surface.

For graph-draft files:

- the viewer is read-only;
- no editor is rendered;
- working-tree status explains graph ownership.

For file-authoritative dbt projects:

- the existing revision-guarded editor remains available.

This matches professional IDE expectations better than two apparently writable representations of one logical file.

### 6.6 It contains scope rather than pretending to finish atomicity

The branch performs complete preflight, but still writes sequentially.

That is not full atomicity, and the Planning DB design explicitly records atomic multi-file publication as a non-goal/current gap.

This is acceptable only if the PR remains a containment slice and the next slice closes the transaction.

---

## 7. Blocking deviation A — unsupported legacy auto-adoption

### 7.1 Severity

**P2 — blocking architecture and scope correction before merge.**

It does not currently destroy user data, but it contradicts the explicit supported-state model and introduces hidden ownership acquisition.

### 7.2 Evidence

`dbtGraphModelSqlPublicationPolicy.ts` includes:

```ts
kind: 'adopt_legacy_equivalent'
```

It selects that outcome when:

```text
current file is unmarked
AND current bytes equal proposed graph payload
```

The unit test requires this outcome.

Planning DB migration 797 describes classification of:

```text
legacy-equivalent
```

as a component responsibility.

### 7.3 Root cause

The implementation attempts to preserve local artifacts generated before this branch even though no product compatibility contract exists.

This is speculative compatibility engineering.

### 7.4 Product impact

Even when bytes are equal, the operation silently changes the meaning of an unknown file:

```text
unrecognized external file
→ graph-managed file
```

That is an authority transition without an explicit transition command or product decision.

The immediate byte risk is low because the payload is equal, but the semantic risk is real:

- unknown state is auto-classified;
- unsupported compatibility becomes permanent code;
- tests and Planning DB normalize a nonexistent upgrade path;
- future agents may expand the path into more heuristics.

### 7.5 Exact owner

`DbtGraphModelSqlPublicationPolicy`

Planning DB task:

```text
E-WEB-DBT-MODEL-SQL-AUTHORITY-1
```

### 7.6 Required correction

Remove:

- `adopt_legacy_equivalent` from the decision union;
- the unmarked-equality branch;
- its test expectation;
- all `legacy-equivalent` language from migrations 797–799;
- any evidence claiming legacy adoption.

The total policy should be:

```text
no file
→ create with absent precondition

exact same valid managed file
→ unchanged

valid managed file with different graph payload
→ replace_managed using observed revision

malformed managed marker
→ conflict

any existing unmarked file
→ conflict
```

### 7.7 What must not be introduced

Do not add:

- migration code;
- historical payload matching;
- previous-format parsers;
- marker versions;
- feature flags for legacy workspaces;
- fixture-preservation semantics;
- automatic deletion/restoration.

### 7.8 Likely files

- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts`
- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts`
- `tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql`
- `tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql`
- `tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql`

### 7.9 Red tests

Add or change tests so these fail before the correction:

```text
existing unmarked SQL equal to graph payload
→ conflict

existing unmarked SQL different from graph payload
→ conflict
```

### 7.10 Green proof

The corrected policy suite must prove:

- absent creation;
- valid managed equality;
- valid managed replacement;
- malformed marker conflict;
- unmarked equality conflict;
- unmarked divergence conflict.

### 7.11 Live proof

The existing external edit flow is sufficient for the divergent case.

Do not create a “legacy upgrade” Cypress flow.

A focused API/browser assertion may create an unmarked equal file and prove Preview rejects without changing bytes, but a unit/integration proof is sufficient if the protected live flow already proves the fail-closed boundary.

### 7.12 Acceptance criteria

- no source symbol contains `legacy` for this feature;
- no unmarked existing SQL is auto-adopted;
- no migration obligation is claimed;
- all current green suites remain green;
- the handoff records the pre-product compatibility decision.

### 7.13 Rollback

No persisted product data must be migrated or restored.

Rollback is code reversion before merge.

### 7.14 Security

Removing auto-adoption reduces hidden trust in unrecognized file state.

### 7.15 Why this restores the route

The model SQL authority slice becomes about current supported authority, not hypothetical upgrades.

---

## 8. Blocking deviation B — digest described as authentication

### 8.1 Severity

**P2 — blocking architecture-truth correction before merge.**

The runtime containment may remain, but Planning DB and the handoff must not misstate the security property.

### 8.2 Evidence

Migration 797 states that a SHA-256 marker:

```text
authenticates its exact payload
```

The marker is:

```text
-- dvt:graph-draft-content-sha256=<digest>
```

The digest and payload are stored in the same user-writable file.

There is no:

- secret;
- signature;
- MAC;
- server-only receipt;
- external immutable ownership record.

### 8.3 Root cause

Integrity detection and authentication are conflated.

### 8.4 Product impact

An ordinary edit that fails to update the marker is detected.

A same-principal tool can modify the payload and recompute the digest.

The marker therefore cannot independently prove:

- who wrote the file;
- that the graph owns it;
- that it came from DVT;
- that it corresponds to an immutable publication receipt.

Overclaiming this in Planning DB creates stale security truth and can lead future code to trust the marker as an authorization token.

### 8.5 Exact owner

`DbtGraphModelSqlPublicationPolicy`

Architecture design:

```text
DBT-MODEL-SQL-AUTHORITY-CONTAINMENT-20260722
```

### 8.6 Required correction

Replace authentication language with:

```text
validates payload integrity
```

or:

```text
detects payload divergence when the marker is not recomputed
```

The handoff must explicitly state:

- the marker is not secret;
- the marker is not a signature;
- the marker is not an authorization boundary;
- the active graph authority and graph-owned path are separately known;
- exact durable ownership belongs to the next atomic publication/revision slice.

### 8.7 What must not be introduced

Do not add signing, secrets or cryptographic key management to this PR.

That would be architecture expansion without a product need.

### 8.8 Red/green proof

This correction is primarily architecture truth.

Existing tests should continue proving digest mismatch detection.

The handoff should classify recomputed-marker forgery as an explicitly bounded residual risk, not claim it is impossible.

### 8.9 Acceptance criteria

- no Planning DB row says the unkeyed digest authenticates ownership;
- security posture is explicit;
- the current payload-integrity tests remain green;
- no new crypto subsystem is introduced.

### 8.10 Why this restores the route

It prevents a payload checksum from becoming hidden authority and reserves durable identity for the correct next aggregate.

---

## 9. Blocking delivery deviation — no iteration handoff

### 9.1 Severity

**Delivery gate — blocking before merge under the current review protocol.**

### 9.2 Evidence

PR #2040 contains no top-level comment headed `## Iteration Handoff`.

### 9.3 Root cause

The agent still treats PR summary plus validation commands as sufficient delivery evidence.

### 9.4 Product impact

Without the handoff, reviewers must reconstruct:

- why 24 files changed;
- which tasks and owners are authoritative;
- which proof was executed;
- which risk remains;
- why atomicity is deferred;
- what next branch must do.

That increases drift and allows Planning DB closeout to outpace verified implementation truth.

### 9.5 Required correction

Publish the full handoff after the final code correction and after final-head CI completes.

### 9.6 Acceptance criteria

- one complete top-level handoff exists;
- all links reference the final head;
- compatibility and marker-security decisions are explicit;
- residual atomicity risk is explicit;
- next slice is bounded.

---

## 10. Non-blocking but active integrity limit — sequential publication

### 10.1 Severity

**P1 product integrity gap, already assigned to the next canonical task.**

It must not be hidden, but it does not require expanding PR #2040.

### 10.2 Evidence

`publishGraphDbtWorkspaceArtifacts`:

1. preflights all artifacts;
2. then loops over prepared artifacts;
3. calls `saveFileContent` sequentially.

A concurrent change can occur after preflight:

```text
preflight A, B, C
→ write A succeeds
→ concurrent change to B
→ write B conflicts
→ A remains changed
```

### 10.3 Root cause

The Web publisher coordinates individual commands instead of one server-owned batch transaction.

### 10.4 User impact

A graph Preview can leave a partially updated dbt project under a write-time race.

### 10.5 Current owner

Planning DB task:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

Existing infrastructure:

- `WorkspaceFileBatchMutation`
- `WorkspaceFileBatchReceipt`
- `IWorkspaceFileBatchMutationPort`
- `LocalWorkspaceFileBatchMutationGateway`

### 10.6 Current PR disposition

Do not implement the atomic transaction inside #2040.

The current PR must:

- state the limit;
- preserve the open task;
- avoid claiming full atomicity;
- leave a clean handoff to the next branch.

---

## 11. Revalidated prior findings

### 11.1 Fixed

#### PR #2030 reconciliation receipt truth

Status: **FIXED**.

Do not reopen.

Receipt-correlated reconciliation and edit/revert handling remain merged.

#### PR #2035 nonterminal materialization divergence

Status: **FIXED**.

List/detail share the corrected operational projector for nonterminal materialization.

#### Release 0.5.3

Status: **FIXED / RELEASED**.

#### Codex legacy migration P1 on #2040

Status: **DISPROVED**.

No supported pre-marker deployed state exists.

### 11.2 Active

#### Model SQL authority

Status: **ACTIVE, substantially addressed by #2040 but not merge-ready**.

Remaining current-PR corrections:

- remove legacy auto-adoption;
- correct digest terminology;
- publish handoff.

#### Atomic multi-file publication

Status: **ACTIVE P1**.

Next canonical product slice.

#### Exact project revision identity

Status: **ACTIVE P1**.

The save/publication result must bind the complete content set and fresh dbt analysis consumed by Preview and Run.

#### Workspace capability truth

Status: **ACTIVE P1**.

The local repository still:

- stops listing at 500 files;
- returns no completeness indicator or cursor;
- limits content to 1 MB;
- throws `InvalidWorkspacePathError` for an oversized file.

#### `ListRuns` scoped keyset pagination

Status: **ACTIVE P2**, preserved as `E-RUNS-SCOPED-KEYSET-PAGINATION-1`.

The current source still:

- requests tenant-level `{ tenantId, limit }`;
- filters project/environment after the bounded read;
- returns a cursor the public query cannot consume;
- encodes cursor parts with a colon despite ISO timestamps containing colons.

It must be corrected, but it must not displace the active SQL/atomic route unless Planning DB explicitly reprioritizes it.

#### Runtime HTTP response validation

Status: **ACTIVE P2 for new endpoints/contracts**.

Generic Web response casting remains weaker than schema-validated boundaries.

#### Durable authoring recovery

Status: **ACTIVE P2**.

Navigation flush and `beforeunload` warnings do not restore buffers after a crash or power loss.

#### Product-wide quality gates

Status: **ACTIVE**.

Web/API coverage ratchets, accessibility, bundle budgets, large-graph performance and injected-failure gates remain incomplete compared with Engine coverage governance.

### 11.3 Superseded

#### “Split Code state before all other product work”

Status: **SUPERSEDED**.

The concrete reconciliation defect was fixed by #2030.

#### “Implement legacy marker migration”

Status: **DISPROVED / FORBIDDEN WITHOUT NEW EVIDENCE**.

---

## 12. Security review

### 12.1 Positive controls

PR #2040 improves security and integrity by:

- avoiding silent overwrite of an unmarked external edit;
- rejecting malformed markers;
- retaining compare-and-swap revisions;
- not exposing graph-owned files through the normal editor;
- preserving the exact external bytes after rejected Preview;
- returning a localized conflict path rather than raw file content.

### 12.2 Boundaries not provided by this slice

The read-only Project Code surface is not server-side authorization.

A same-user API client or direct filesystem process may still mutate a graph-owned file.

The protection is:

- CAS;
- divergence detection;
- fail-closed Preview.

It is not a prohibition on all external writes.

### 12.3 Marker threat model

The marker catches ordinary edits that do not update the digest.

It does not protect against a same-principal process that rewrites both payload and digest.

That is acceptable as a declared containment limit only if Planning DB does not call it authentication.

### 12.4 Secret handling

No new credential or secret handling is introduced.

Do not add signing keys to this slice.

---

## 13. Data-integrity and concurrency review

### 13.1 Known divergence

Complete preflight prevents writes when divergence already exists before publication begins.

### 13.2 Concurrent divergence

Per-file CAS prevents overwriting a file changed after preflight.

### 13.3 Partial commit

Sequential CAS cannot roll back earlier successful writes when a later file conflicts.

This is the precise boundary the next atomic task must close.

### 13.4 Duplicate paths

The publisher rejects duplicate artifact paths before I/O.

### 13.5 Read failure

Only explicit `not_found` becomes absence.

Other read failures propagate rather than being treated as create.

This is correct fail-closed behavior.

---

## 14. Operability and observability review

### 14.1 User-visible operation

The current PR provides:

- exact conflict path;
- localized Preview failure;
- graph-owned read-only explanation.

### 14.2 Structured operational evidence

Planning DB marks the pure policy/view signals as not applicable and delegates persistence evidence to command ports and browser proof.

That is reasonable for pure functions.

The publisher itself still lacks a durable publication receipt because it coordinates individual saves.

The next atomic slice must emit one immutable receipt containing:

- idempotency key;
- request hash;
- written paths and content hashes;
- deletion paths;
- deduplication state;
- resulting project content-set identity;
- exact analysis identity or explicit reconciliation result.

### 14.3 Logging

Do not log SQL bodies or credentials in conflict signals.

Path, receipt identity, revision hashes and outcome kind are sufficient.

---

## 15. Accessibility and performance review

### 15.1 Accessibility

The branch uses existing Monaco viewer/editor surfaces and explicit status copy.

Required final checks:

- viewer has a unique accessible label;
- read-only status is announced without relying on color;
- keyboard users can reach and leave the viewer;
- conflict message identifies the path and action;
- English and Spanish copy remain equivalent.

No new automated accessibility gate is added by this PR.

### 15.2 Performance

Complete preflight executes file reads concurrently with `Promise.all`.

That is acceptable for the small graph-derived artifact set in this slice.

It is not a scalable substitute for the server-side batch transaction when projects become large.

Potential pressure points:

- one HTTP request per file read;
- one HTTP request per changed file write;
- browser-owned coordination;
- no batch receipt;
- no payload budget gate.

These are next-slice concerns, not reasons to re-expand #2040.

---

## 16. Architecture smell assessment

| Fowler signal | Current assessment |
| --- | --- |
| Hidden authority | Reduced by read-only posture and divergence policy; reintroduced by `adopt_legacy_equivalent` until removed. |
| Duplicate authority | Contained for graph-draft Project Code; full authority transition remains future work. |
| Shotgun surgery | 24 files is high, but most changes are tests, copy and Planning DB around one vertical. Acceptable only with handoff. |
| Responsibility overload | Improved by extracting policy, publisher, posture and surface. |
| Leaky abstraction | Marker semantics leak graph ownership into file bytes; acceptable as containment, not final durable authority. |
| Primitive obsession | Marker string and decision kinds are typed locally; durable revision aggregate remains absent. |
| Test-only confidence | Reduced by protected Cypress proof; direct run link/transcript still missing from handoff. |
| Stale truth | Present where Planning DB says “authenticates” and models unsupported legacy adoption. |
| Architectural drift | No new rail, parser or repository introduced. |
| Product dead end | Avoided if the marker remains temporary containment and next work moves to server-owned atomic publication. |

---

## 17. Mature-system comparison

### 17.1 dbt Studio — match

Official dbt documentation describes Studio IDE as one interface for building, testing, running and version-controlling normal dbt projects.

DVT should match:

- normal dbt files as durable file-authoritative state;
- explicit diagnostics;
- visible conflicts;
- integrated Preview/Run;
- version-control-ready artifacts.

DVT should differ:

- Canvas may remain a differentiated visual authoring surface;
- graph-draft mode may own generated files before explicit adoption.

DVT should defer:

- broad collaboration features until authority and revision identity are complete.

Reference: <https://docs.getdbt.com/>

### 17.2 Professional IDE/Git — match

VS Code separates:

- modified files;
- staged files;
- commits;
- diffs;
- conflicts;
- branches;
- remote synchronization.

DVT should similarly avoid one ambiguous “synchronized” concept for:

- graph authority;
- file bytes;
- semantic analysis;
- publication;
- Preview;
- Run.

PR #2040 improves this by rendering graph-owned files read-only and surfacing conflict explicitly.

Reference: <https://code.visualstudio.com/docs/sourcecontrol/staging-commits>

### 17.3 Airflow DAG Bundles — match

Airflow versions the complete set of files required by a DAG run and can pin one bundle version for the whole run.

DVT must match this property in the next slice:

```text
one project content set
→ one analysis
→ one Preview
→ one Run
```

Reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

### 17.4 Prefect deployments — match later

Prefect versions deployment configuration and ties deployment versions to commit or code hashes.

DVT should later provide:

- revision history;
- promotion;
- rollback;
- exact-code execution.

That comes after atomic publication and exact revision identity.

Reference: <https://docs.prefect.io/v3/concepts/deployments>

### 17.5 Dagster — defer differentiation

Dagster assets, lineage, checks and freshness are valuable later differentiators.

They are not prerequisites for fixing file/graph authority.

### 17.6 Temporal — match principles, not product shape

DVT should reuse Temporal principles already present in the repository:

- durable identity;
- idempotency;
- retry-safe operations;
- observable outcomes.

It should not turn editor publication into another workflow engine abstraction.

### 17.7 NiFi — differ

NiFi demonstrates visual flow versioning, but Apache now recommends Git-based flow registry clients and has deprecated NiFi Registry.

DVT should not build a proprietary parallel registry for dbt files.

Reference: <https://nifi.apache.org/projects/registry/>

---

## 18. Required PR #2040 correction sequence

### Step 1 — remove unsupported legacy semantics

Delete `adopt_legacy_equivalent` and update source, tests and Planning DB.

### Step 2 — correct integrity terminology

Replace authentication claims and record the marker threat model.

### Step 3 — keep scope bounded

Do not implement atomic publication in this PR.

### Step 4 — rerun focused tests

Minimum focused commands:

```text
pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts
pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts
pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts
pnpm --filter @dvt/web test:presentation:run -- src/app/views/CodeView.test.tsx src/app/views/code/CodeWorkspaceFileSurface.test.tsx
pnpm --filter @dvt/web test:architecture:run -- src/app/views/canvas/canvasDbtAuthoringRun.architecture.test.ts src/app/views/code/codeMonacoEditableAccess.architecture.test.ts
```

### Step 5 — rerun protected live proof

```text
pnpm test:web:e2e:dbt-author-code-run:live
```

### Step 6 — reconcile Planning DB

```text
pnpm planning:db:integrity:check
pnpm docs:feature-mechanization:implementation
```

### Step 7 — full pre-push and final CI

```text
pnpm verify:prepush
```

Then require all six workflows green on the new final head.

### Step 8 — publish handoff

Only after the final head is stable.

---

## 19. Next implementation slice after #2040

## Atomic dbt project publication and exact project revision

### 19.1 Severity

**P1 — next product transaction.**

### 19.2 Root cause

The browser still coordinates multiple independent workspace-file writes.

### 19.3 User transaction

```text
Canvas graph proposal
→ complete artifact diff
→ one atomic publication
→ one immutable receipt
→ one exact project content set
→ one fresh dbt analysis
→ Preview that exact analysis
→ Run that exact revision
→ reopen the same revision
```

### 19.4 Exact owner

Use the owner already assigned by live Planning DB for:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

Do not create a second task or owner.

### 19.5 Existing domain objects to reuse

- `WorkspaceFileBatchExpectedFile`
- `WorkspaceFileBatchWrite`
- `WorkspaceFileBatchMutation`
- `WorkspaceFileBatchReceipt`
- `WorkspaceFileBatchMutationResult`
- `IWorkspaceFileBatchMutationPort`
- `DbtProjectGraphProjection`
- `WorkspaceFileSaveReceipt` where individual Code edits remain appropriate

### 19.6 Command/query and port route

Before writing code, query Planning DB for the approved command/query rail.

The implementation must expose the existing batch mutation authority to the graph publication application boundary rather than create another file-write semantic.

The server-owned application operation should:

1. authorize workspace scope;
2. validate all paths and limits;
3. validate all expected revisions;
4. apply all writes/deletes through `IWorkspaceFileBatchMutationPort`;
5. receive the immutable batch receipt;
6. run `ProjectDbtGraphFromFiles` against the resulting complete content set;
7. return publication and analysis identity together;
8. fail closed if analysis cannot be bound to the published content set.

### 19.7 Likely files/components

Exact files must follow the approved Planning DB design, but likely surfaces include:

- API application service owning graph workspace publication;
- protected HTTP route group or existing command exposure;
- `apps/api/src/application/ports/workspaceFiles.ts` only if the existing result lacks required exact identity;
- existing batch gateway and model;
- Web command port/service replacing the sequential publisher;
- Canvas plan action consuming the result;
- dbt graph query/analysis correlation;
- contracts schemas at the HTTP boundary;
- Planning DB design and evidence migrations;
- protected Cypress flow.

### 19.8 Migration and compatibility

DVT is pre-product.

No old publication format migration is required unless a new explicit preservation contract is approved.

The implementation may replace disposable local artifact state.

### 19.9 Rollback

Before production data exists, rollback is:

- revert the implementation commit;
- reset disposable local workspaces;
- forward-reconcile Planning DB if the migration framework is append-only.

Once supported data exists, rollback must be receipt-driven and non-destructive.

### 19.10 Observability

Emit one operation result with:

- operation/receipt ID;
- idempotency key;
- request hash;
- scope identity;
- changed paths and hashes, not SQL bodies;
- conflict paths;
- resulting content-set hash;
- analysis hash;
- outcome and duration;
- deduplication status.

### 19.11 Security

- authorize scope before filesystem access;
- validate paths server-side;
- bound files and bytes;
- never log SQL bodies or credentials;
- prevent idempotency-key reuse with a different request;
- validate runtime response schemas;
- isolate dbt parse outputs;
- retain explicit timeout/output limits.

### 19.12 PR decomposition

Keep one narrow end-to-end PR if repository governance permits:

```text
batch command exposure
+ publication application service
+ exact analysis binding
+ Web replacement
+ live proof
```

Do not mix:

- workspace pagination;
- authoring recovery;
- assets/lineage expansion;
- release governance;
- dependency upgrades.

### 19.13 Red tests

1. conflict in second file writes nothing;
2. injected failure during replacement restores all originals;
3. identical idempotency key and request deduplicates;
4. same idempotency key with different request fails;
5. publication receipt lists exact paths/hashes;
6. analysis content-set identity equals publication result;
7. concurrent external edit conflicts without partial publication;
8. Preview rejects analysis from another revision;
9. Run rejects Preview from another revision;
10. reopen returns the same published revision;
11. no SQL body appears in logs;
12. response schema rejects malformed identity.

### 19.14 Live proof

```text
create graph model
→ Preview publishes all files atomically
→ verify receipt and content-set identity
→ run exact revision
→ modify one file concurrently
→ next publication conflicts with zero partial changes
→ retry correct request
→ reopen and verify exact revision
```

### 19.15 Acceptance criteria

- no Canvas loop calls individual save commands for generated artifact publication;
- one server-owned batch command owns the transaction;
- one receipt binds files and analysis;
- Preview and Run consume exact revision identity;
- no partial project is externally visible;
- protected live proof and all six workflows pass;
- complete iteration handoff is published.

### 19.16 Release gates

- contracts tests;
- API unit/integration/architecture tests;
- batch gateway failure-injection tests;
- Web unit/presentation/architecture tests;
- protected Cypress vertical;
- Planning DB integrity/mechanization;
- security and dependency review;
- exact-head CI;
- no unresolved review thread;
- final handoff.

---

## 20. Required handoff template for PR #2040

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB task/design:

### Goal
- User transaction:
- Problem closed:

### What changed
- Runtime:
- UI:
- Tests:
- Planning DB:

### How it was implemented
- Domain owner:
- Existing commands/queries:
- Ports:
- Adapters:
- Contracts:
- Files/migrations:

### Why this design
- Selected option:
- Rejected alternatives:
- Why no legacy migration is required:

### User-visible behavior
- Graph-owned files:
- File-authoritative projects:
- Divergence:

### Red evidence
- Test/behavior observed failing before implementation:

### Green evidence
- Focused tests:
- Full verification:
- Exact-head workflow links:
- Live browser proof:

### Security and integrity
- Marker property and threat model:
- CAS behavior:
- Remaining partial-publication limit:
- Logging/data exposure:

### Compatibility
- Supported state:
- Explicitly disposable state:

### Observability
- Signals and ownership:

### Rollback
- Code:
- Planning DB:
- Workspace state:

### Remaining risks
- Atomic publication:
- Exact revision identity:

### Deviations
- From approved route:

### Next bounded iteration
- Task:
- Transaction:
- Out of scope:
```

---

## 21. Final decision

PR #2040 is the first recent branch that directly advances the agreed dbt product route.

It should not be rejected or redirected into migration work.

It should not merge at head `6257745ed1ec91f1a1415585d24e319905966931` because:

1. the source still auto-adopts an unsupported `legacy-equivalent` file;
2. Planning DB overclaims checksum authentication;
3. the implementation handoff is missing.

Required disposition:

```text
remove legacy auto-adoption
→ correct integrity terminology
→ rerun focused/live/full proof
→ six final-head workflows green
→ publish complete handoff
→ resolve review
→ merge normally
```

Then immediately start:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

Do not spend the next product cycle on:

- migration of nonexistent legacy artifacts;
- another release/governance expansion;
- dependency churn as the main lane;
- another point-in-time guide;
- new DSL or registry;
- assets, partitions or collaboration before exact revision identity.

The intended sequence remains:

```text
model SQL authority
→ atomic publication and exact revision
→ workspace capability truth
→ cohesive authoring recovery
→ product-wide quality gates
→ later differentiation
```
