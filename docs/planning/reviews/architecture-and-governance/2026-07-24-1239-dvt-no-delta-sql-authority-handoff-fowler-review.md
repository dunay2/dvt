---
title: DVT no-delta SQL-authority delivery-handoff Fowler review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-24T12:39:22+02:00
scope: architecture-and-governance
change_type: documentation-only
handoff_status: DELIVERY-HANDOFF-MISSING
---

# DVT no-delta SQL-authority delivery-handoff Fowler review

## 1. Executive decision

There is no material repository or product delta since the preceding review.

Exact reviewed `main`:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
```

That commit remains the `0.5.3` release merge. The only functional pull request still open is PR #2040, `fix(web): Prevent graph preview from overwriting DBT model SQL`, on exact head:

```text
6257745ed1ec91f1a1415585d24e319905966931
```

PR #2040 has not changed. It still has one implementation commit, 24 changed files, six successful standard workflows, no unresolved inline review thread, and no complete implementation-agent handoff.

Current disposition:

1. Do not invent another runtime defect merely because the branch has been idle.
2. Do not reopen the disproved pre-marker compatibility finding.
3. Treat the SQL-authority implementation as functionally credible on the evidence currently available.
4. Require the missing `## Iteration Handoff` before treating the iteration as auditable and closed.
5. After normal closeout of PR #2040, move directly to the existing atomic DBT publication and exact project-revision task.
6. Do not expand PR #2040 into atomic publication, inventory, recovery, release governance, or a generic authoring framework.

The most important active product gap is not another SQL-marker policy. It is the still-sequential publication transaction:

```text
complete artifact proposal
-> read expected revisions
-> save file 1
-> save file 2
-> save file N
-> preview latest project state
```

This can still leave a partially published project and does not bind Preview and Run to one exact project content-set.

---

## 2. Exact repository snapshot

### 2.1 Main branch

- Exact SHA: `8c098d6e35ce874efae81609814d99e8e60091f7`
- Commit: `chore(main): Release 0.5.3 (#2037)`
- Material delta from the previous cycle: none
- Connector-visible workflow runs on the squash SHA: none
- Connector-visible combined statuses on the squash SHA: none

The absence of connector-visible runs on the squash SHA is an evidence-location limitation, not proof that the release was untested. Exact-head CI evidence exists on the merged implementation and release PR heads.

### 2.2 Open pull requests at review time

| PR | Kind | Head | State | Decision |
| --- | --- | --- | --- | --- |
| #2040 | Functional Web / DBT authority | `6257745ed1ec91f1a1415585d24e319905966931` | Open, ready, mergeable | Functionally credible; delivery handoff missing |
| #2052 | Previous documentation review | documentation head | Draft, mergeable | Superseded by this cycle report; must not be treated as operational authority |

No open release pull request or additional functional implementation branch was visible.

### 2.3 Release state

- Current package version: `0.5.3`
- Latest main release commit: `8c098d6e35ce874efae81609814d99e8e60091f7`
- No later release candidate is open.
- Release governance is not the next product priority.

### 2.4 Relevant functional branch

PR #2040:

- Base: `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- Head: `6257745ed1ec91f1a1415585d24e319905966931`
- Commits: 1
- Changed files: 24
- Additions: 2,766
- Deletions: 57
- Draft: no
- Mergeable: yes
- Opened: 2026-07-22
- Last metadata update visible: 2026-07-22

No code commit has been added since the previous review.

---

## 3. Implementation-agent handoff audit

## 3.1 Status

```text
DELIVERY-HANDOFF-MISSING
```

The PR body is useful but is not the required complete iteration handoff.

The PR body identifies:

- root cause;
- high-level changes;
- four validation commands;
- the claim that no guardrail or runtime path was bypassed.

The PR discussion contains:

- one Codex inline finding;
- the product-owner disposition that the compatibility premise is unsupported;
- later reviewer corrections and clarifications.

No top-level comment headed `## Iteration Handoff` exists, and no equivalent single report contains the complete handoff contract.

## 3.2 Missing fields

The implementation agent must still consolidate:

1. Exact base SHA and final head SHA.
2. Branch and pull request.
3. Planning DB task and design identities.
4. Iteration goal stated as one user transaction.
5. What changed.
6. How it was implemented.
7. Why this design was selected over alternatives.
8. Exact DDD owners.
9. Existing commands and queries reused.
10. Existing ports and adapters reused.
11. Contracts introduced or changed.
12. Migrations and all implementation surfaces touched.
13. User-visible behavior before and after.
14. Tests that were observed failing before implementation.
15. Tests passing on the final head.
16. Links to exact-head CI runs.
17. Link or repository path for protected browser/integration proof.
18. Security posture.
19. Data-integrity posture.
20. Observability posture.
21. Compatibility posture, explicitly noting pre-product status.
22. Rollback posture.
23. Residual risks.
24. Deviations from the approved route.
25. Recommended bounded next iteration.

## 3.3 Handoff acceptance rule

A list of commands is not evidence that each command ran on the final head. The handoff must distinguish:

```text
claim
executed evidence
repository source
CI evidence
live proof
```

The handoff may reference PR checks, GitHub Actions run URLs, test files, Cypress specs, Planning DB migrations, and source paths. It must not claim red-first chronology unless the failed test or its recorded evidence actually exists.

---

## 4. Claim-to-evidence matrix for PR #2040

| Claim | Status | Repository evidence | Review disposition |
| --- | --- | --- | --- |
| Preview previously could overwrite accepted Project Code SQL | VERIFIED | Root-cause statement plus prior sequential regeneration path | The bug class is real |
| Graph-owned SQL is identified through a deterministic content marker | VERIFIED | `dbtGraphModelSqlPublicationPolicy.ts` | Marker is integrity metadata, not origin authentication |
| Proposed graph-owned SQL must contain a valid marker | VERIFIED | Policy throws for invalid proposed managed payload | Correct fail-fast behavior |
| Missing target file can be created using `absent` CAS | VERIFIED | `create` publication decision | Correct |
| Identical marked content produces no write | VERIFIED | `unchanged` decision | Correct |
| Valid marked content can be replaced under observed CAS | VERIFIED | `replace_managed` decision | Correct for active graph authority |
| Malformed marked content is rejected | VERIFIED | Parse failure maps to `conflict` | Correct fail-closed behavior |
| Divergent unmarked Project Code SQL is preserved | VERIFIED | Unmarked non-equivalent content maps to `conflict`; Cypress spec covers preservation | Primary user transaction closed |
| Equivalent unmarked graph projection may be marked | VERIFIED | `adopt_legacy_equivalent` decision | Safe in active graph-draft scope; the name is misleading but not a demonstrated blocker |
| All artifacts are preflighted before the first write | VERIFIED | `Promise.all(preflightArtifact)` before write loop | Removes read-after-write redefinition of expected revisions |
| Expected revisions are captured once during preflight | VERIFIED | Prepared artifact contains `expectedRevision` | Correct CAS preparation |
| Publication is multi-file atomic | CONTRADICTED | Prepared writes are executed in a sequential `for` loop | Deferred to `E-WEB-DBT-ATOMIC-PUBLICATION-1` |
| Preview is bound to the exact batch content-set | NOT PROVEN | No batch receipt/content-set identity returned from this Web publisher | Next priority |
| Run is bound to the same exact revision as Preview | NOT PROVEN | Existing Preview/Run path does not consume a server-owned publication identity | Next priority |
| Graph-owned Project Code files are read-only | VERIFIED | Code edit-posture and surface changes/tests in PR | Correct authority projection |
| File-authoritative DBT project files remain editable | VERIFIED | Edit-posture discrimination and tests | Correct separation of authority modes |
| Protected live proof exists in repository | VERIFIED | `canvas-dbt-author-code-run-live.cy.ts` changed | Execution is claimed; direct run artifact link missing from handoff |
| Protected live proof ran on final head | PARTIAL | PR body lists command; standard CI is green | Direct command log/artifact is not linked |
| Six standard workflows are green | VERIFIED | Exact-head workflow runs | Strong CI evidence |
| No unresolved inline thread remains | VERIFIED | One thread exists and is resolved | Correct |
| Compatibility with deployed pre-marker workspaces is required | DISPROVED | No deployed product-data contract or preservation obligation | Do not implement migration semantics |
| Tests were written and observed failing first | NOT PROVEN | No consolidated red evidence | Must not be invented |
| Rollback is documented | NOT PROVEN | No complete handoff | Expected posture is revert before release because DVT is pre-product |
| Security and observability are fully documented | PARTIAL | Code avoids secrets; migration terminology was corrected | Missing consolidated handoff |
| Iteration is auditable end to end | NOT PROVEN | Handoff absent | Delivery blocker only |

---

## 5. PR #2040 architecture review

## 5.1 Correct ownership decision

The PR addresses a real hidden-authority problem:

```text
Canvas graph SQL
versus
workspace model SQL
```

ADR-0060 defines two mutually exclusive authority modes:

```text
graph-draft
dbt-project-files
```

In graph-draft mode, graph nodes and edges remain semantic authority and DBT files are generated projections. In file-backed mode, project files are authority and Canvas is a projection of fresh server-side analysis.

PR #2040 does not merge those modes. It adds containment around graph-draft publication and preserves editability for file-authoritative projects.

## 5.2 Policy object

`dbtGraphModelSqlPublicationPolicy.ts` is a useful extracted policy object rather than additional route logic.

It centralizes:

- marker construction;
- marker validation;
- absent-file creation;
- unchanged detection;
- managed replacement;
- equivalent unmarked marking;
- conflict classification.

This reduces shotgun conditionals in the plan action and creates a focused test surface.

The policy correctly rejects a malformed proposed managed payload rather than allowing downstream code to publish an ungoverned SQL body.

## 5.3 Marker semantics

The marker shape is:

```text
-- dvt:graph-draft-content-sha256=<sha256>
<payload>
```

The marker proves that the declared digest matches the following payload. It does not prove:

- who created the file;
- that the file was created by DVT;
- that the current writer is authorized;
- that the marker is a signature or MAC.

The branch's later Planning DB terminology correctly treats this as exact-payload integrity/difference detection, not creator authentication. No signing system, secret, or key-management feature belongs in this slice.

## 5.4 Preflight separation

`dbtGraphWorkspaceArtifactPublisher.ts` introduces a useful separation:

```text
read/classify all artifacts
-> detect conflicts
-> prepare expected revisions
-> perform writes
```

This fixes the previous pattern where each artifact's expected revision could be read immediately before its own write, after earlier files had already changed.

It does not provide transactional atomicity. It only provides stable preflight inputs.

## 5.5 Remaining partial-publication risk

The publication implementation still executes:

```text
for each prepared write
    SaveWorkspaceFileContent
```

Failure modes include:

- CAS conflict on file 2 after file 1 was updated;
- filesystem or HTTP failure after an earlier write;
- route cancellation or browser loss during the write sequence;
- a concurrent writer changing a later path between preflight and write;
- successful generated SQL write followed by failed YAML or project-file write.

The result can be a project state that never existed as one coherent proposal.

This is the highest-priority remaining data-integrity gap.

## 5.6 Project Code posture

Making graph-owned generated SQL read-only is correct while graph-draft remains authority. It prevents the product from presenting an editable surface that cannot durably own the resulting change.

File-authoritative projects remain editable because their files are the durable source and Canvas is only a query projection.

This matches professional IDE behavior more closely than silently accepting an edit in one surface and overwriting it from another.

## 5.7 Scope discipline

PR #2040 should not absorb:

- generic batch publication UI;
- project inventory pagination;
- crash-recovery journal;
- source-control staging or commits;
- artifact signing;
- compatibility migrations;
- assets, freshness, partitions, or collaboration;
- release-governance changes.

The PR's correct boundary is SQL-authority containment only.

---

## 6. Current product and architecture review beyond PR #2040

## 6.1 Contracts and command/query rails

ADR-0060 keeps the established rails canonical:

- `ListWorkspaceFiles`
- `GetWorkspaceFileContent`
- `SaveWorkspaceFileContent`
- `GenerateDbtWorkspaceArtifacts`
- `BuildDbtPlannerGraphSource`
- `ImportWarehouseSources`
- `PreviewExecutionPlan`
- `ObservePlanRunReadiness`
- `StartRun`
- `GetRunStatus`
- `GetRunEvents`

The next slice must extend the existing publication intent and server-side workspace mutation authority. It must not introduce a second save lifecycle or a raw user-facing batch mutation command.

## 6.2 Web/API boundary

The Web plan action currently owns too much transaction orchestration:

- artifact projection;
- workspace reads;
- per-path revision preparation;
- conflict presentation;
- sequential file mutation;
- plan preview initiation.

This is a leaky transaction boundary. The browser is coordinating a multi-file publication that the API already knows how to execute atomically through `IWorkspaceFileBatchMutationPort` and `LocalWorkspaceFileBatchMutationGateway`.

The next implementation should move the mutation transaction behind the protected application boundary while keeping Canvas responsible for intent and presentation.

## 6.3 Runtime revision identity

`useDbtProjectFileCanvasController.ts` still accepts a `WorkspaceFileSaveReceipt` but names it `_receipt` and ignores it. It then asks for the latest `ProjectDbtGraphFromFiles` result.

This creates a time-of-check ambiguity:

```text
save receipt R1
-> unrelated file changes
-> latest project analysis R2
-> UI associates R2 with the save callback for R1
```

A fresh analysis can therefore be valid but belong to a different whole-project snapshot.

The open Planning DB gap correctly assigns exact whole-project revision binding to `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

## 6.4 Data integrity

Current strengths:

- per-file CAS;
- atomic single-file replacement;
- receipt-correlated Code reconciliation;
- fail-closed analyzer states;
- authority-mode separation;
- server-side isolated DBT analysis;
- existing atomic batch gateway with idempotency and multipath locking.

Current gaps:

- graph-first multi-file publication remains sequential;
- Preview/Run do not consume one immutable publication identity;
- workspace inventory may be partial without saying so;
- oversized file errors use path-invalid semantics;
- ListRuns paging can hide in-scope results after applying an earlier tenant-only limit.

## 6.5 Recovery

Current navigation guards and byte-persistence flushes reduce accidental loss during ordinary SPA navigation.

They do not provide durable crash recovery after:

- browser process termination;
- operating-system failure;
- power loss;
- storage or network interruption after local buffer mutation.

Durable authoring-session recovery remains later than atomic publication and inventory truth. It should not be built first because recovery must restore a well-defined publication/revision model, not a collection of ambiguous local states.

## 6.6 Operability and observability

The atomic-publication slice should emit only bounded operational metadata:

- tenant/project/environment identifiers already permitted by policy;
- publication idempotency key hash or safe identifier;
- artifact count;
- path list only where policy permits;
- total byte count;
- conflict count and conflicting paths;
- deduplicated or newly applied disposition;
- batch request hash;
- project content-set hash;
- analysis hash;
- duration and terminal outcome.

It must not log:

- SQL bodies;
- YAML bodies;
- credentials;
- `profiles.yml`;
- resolved secrets;
- connection passwords or tokens;
- unbounded DBT output.

## 6.7 Security

PR #2040 improves integrity by rejecting divergent SQL before writes. It does not claim that an unkeyed marker is a security boundary.

The next slice must preserve:

- authenticated workspace scope;
- path normalization and scope-root containment;
- file-name policy;
- bounded file and batch sizes;
- CAS on all expected paths;
- idempotency-key conflict rejection;
- exclusion of secrets and profiles from publication and execution bundles;
- fail-closed handling of malformed receipts;
- no raw artifact bodies in logs.

No new cryptographic signing subsystem is justified.

## 6.8 Accessibility

No material accessibility delta exists this cycle.

The current priority remains correctness of authority and publication. However, the eventual product-wide quality stage must include automated accessibility proof for:

- conflict messages;
- read-only state announcements;
- keyboard navigation between Canvas and Code;
- focus restoration after conflict resolution;
- status updates for Preview/Run revision changes;
- non-color-only stale/conflict indicators.

Accessibility must be a release gate before product readiness, not a substitute for fixing publication integrity now.

## 6.9 Performance

No material performance delta exists this cycle.

The next batch publication endpoint should avoid:

- browser-side serial round trips per file;
- repeated full-project reads to infer transaction completion;
- unbounded request payloads;
- unnecessary DBT reanalysis when an idempotent request is deduplicated and its postconditions still hold.

Performance proof should cover:

- near-limit batch file count;
- near-limit total bytes;
- conflict preflight latency;
- idempotent retry latency;
- analysis latency separated from publication latency;
- large but supported graph projection.

## 6.10 Test posture

The repository has broad unit, architecture, integration, Cypress, Planning DB, contract, CodeQL, dependency, and code-quality lanes.

Root `ci:full` still explicitly applies a coverage command only to Engine:

```text
pnpm ci:docs && pnpm ci:code && pnpm test:coverage:engine
```

Web and API have substantial suites, but the root gate does not show equivalent explicit coverage ratchets. Product-wide quality gates remain a later priority after the transaction model is correct.

Green CI on #2040 is important but does not prove red-first chronology or replace the missing handoff.

---

## 7. Fowler review

## 7.1 Hidden or duplicate authority

Status: partially fixed by PR #2040.

Before:

```text
Canvas accepts graph SQL
Project Code accepts file SQL
Preview regenerates graph SQL regardless of accepted file revision
```

After #2040:

- graph-owned SQL is visibly read-only;
- divergent external SQL blocks Preview;
- file-authoritative projects remain editable.

Still active:

- latest analysis can be associated with the wrong whole-project revision;
- Preview/Run lack one immutable publication identity.

## 7.2 Responsibility overload

Status: improved but active at the Web transaction boundary.

The policy and publisher extraction improve cohesion. The Web plan action still owns orchestration that should be server-side and transactionally atomic.

## 7.3 Leaky abstraction

Status: active.

Canvas knows individual workspace-file revision and mutation mechanics. It should submit a publication intent and receive a server-owned receipt, rather than coordinate filesystem transaction semantics one file at a time.

## 7.4 Shotgun surgery

Status: observed but not automatically a defect.

PR #2040 changes 24 files and adds 2,766 lines because the repository requires:

- runtime behavior;
- presentation posture;
- localized copy;
- unit tests;
- architecture tests;
- protected Cypress proof;
- Planning DB design and closeout.

Some amplification is deliberate governance. The risk is that narrow behavior changes become expensive enough to discourage iteration. The next slice must reuse existing batch infrastructure and avoid creating parallel contracts merely to satisfy documentation shape.

## 7.5 Primitive obsession

Status: active around revision identity.

Individual SHA-256 strings are used at several boundaries, but there is not yet one domain object representing:

```text
published project content-set
analysis identity
preview identity
run identity
```

The correction is a typed publication/provenance result composed from existing batch receipt and graph projection identities, not more unrelated string fields.

## 7.6 Test-only confidence

Status: delivery evidence incomplete.

Six green workflows and changed Cypress tests are strong evidence. The missing handoff prevents independent confirmation of:

- exact live run evidence;
- red-first chronology;
- residual risks;
- rollback and operational posture.

## 7.7 Stale truth

Status: controlled in this cycle.

No unmerged review Markdown is treated as operational authority. Planning DB, ADR-0060, accepted plans, actual code, tests, and CI remain the evidence sources.

The previous review PR is superseded by this report and should be closed without merge.

## 7.8 Architectural drift

Status: no new drift detected.

PR #2040 reuses current workspace reads/writes and does not create a new user-facing save command. The next risk would be exposing a raw generic browser batch mutation instead of extending the existing DBT publication application boundary.

## 7.9 Product dead ends

Avoid:

- a proprietary artifact registry separate from Git and workspace files;
- storing a second editable semantic graph beside file authority;
- automatic fallback from invalid file authority to graph-draft;
- browser-owned DBT parsing;
- manual multi-file rollback loops in Web;
- signing graph markers without a real threat model;
- migration frameworks for disposable pre-product artifacts;
- assets/freshness/partitions before reproducible publication and execution identity.

---

## 8. Previous finding reconciliation

| Finding | Current status | Evidence/reason |
| --- | --- | --- |
| Lost edits during in-flight DBT save | FIXED | Merged #1996 work |
| Pending receipt hidden after edit/revert | FIXED | Merged #2030 and closed Planning DB gap |
| Non-terminal materialization differs between run list/detail | FIXED | Merged #2035 common projection/sanitization |
| Release candidate integrity failures | FIXED/SUPERSEDED | Release governance merged and releases 0.5.0–0.5.3 completed |
| Need to migrate deployed pre-marker graph SQL | DISPROVED | DVT is pre-product with no preservation contract |
| SHA marker authenticates origin | FIXED | Branch terminology limits it to payload integrity/difference detection |
| Graph Preview can silently overwrite divergent SQL | ACTIVE IN MAIN / FIXED IN #2040 | PR #2040 contains the fix but is not merged |
| Graph-first DBT artifact publication is multi-file atomic | ACTIVE | Final writes remain sequential |
| Save receipt is tied to exact whole-project analysis | ACTIVE | `_receipt` remains ignored in current main |
| Workspace inventory truth is complete | ACTIVE | Silent 500-file cutoff and no completeness state |
| Oversized workspace file has correct typed error | ACTIVE | `InvalidWorkspacePathError` used for size |
| ListRuns paging is complete and consumable | ACTIVE | Scope/limit/cursor defects remain |
| Web HTTP results are runtime validated everywhere | ACTIVE | Generic casts remain on some boundaries |
| Authoring buffers survive crash/power loss | ACTIVE | No durable recovery journal |
| Root product coverage/accessibility/performance gates are balanced | ACTIVE | Explicit root coverage ratchet is Engine-only |
| Another DSL is needed | DISPROVED | Normal DBT files remain product language |
| Another persistence rail is needed | DISPROVED | Existing rails and batch port are sufficient |

---

## 9. Mature-system comparison: Match / Differentiate / Defer

## 9.1 dbt Studio IDE

Official reference: <https://docs.getdbt.com/>

Observed mature capability:

- one environment for building, testing, running, and version-controlling normal DBT projects.

DVT should match:

- normal DBT files as the file-authoritative language;
- explicit code, validation, Preview, Run, and version provenance;
- non-destructive treatment of unsupported DBT constructs.

DVT should differentiate:

- Canvas as a governed bidirectional projection where an edit is lossless;
- explicit authority mode and capability posture per resource;
- graph-draft creation as a deliberate pre-file authority mode.

DVT should defer:

- broad collaboration and hosted lifecycle parity;
- semantic-layer breadth;
- AI authoring breadth;
- deployment polish before publication identity is correct.

## 9.2 Apache Airflow DAG Bundles

Official reference: <https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html>

Observed mature capability:

- versioning all files needed by a DAG;
- running tasks against a specific bundle version so a run uses the same code even if the source changes mid-run.

DVT should match:

- Preview and Run bound to the same immutable project content-set;
- reproducible reopen/debug identity;
- clear stale behavior when files change after Preview.

DVT should differentiate:

- authoring and transaction UX rather than scheduler deployment configuration.

DVT should defer:

- broad scheduler/executor ecosystem parity.

## 9.3 Prefect deployment versions

Official reference: <https://docs.prefect.io/v3/how-to-guides/deployments/versioning>

Observed mature capability:

- deployment-version history;
- promotion and rollback;
- association with Git commit metadata;
- execution pinned to a commit SHA or image digest.

DVT should match later:

- exact code/revision identity;
- promotion and rollback of accepted project revisions;
- immutable execution provenance.

DVT must first implement:

- one atomic publication receipt and exact content-set identity.

## 9.4 Dagster

Official reference: <https://docs.dagster.io/>

Observed mature capability:

- declarative assets;
- integrated lineage;
- observability;
- strong testability.

DVT should match later:

- asset-level lineage and checks derived from authoritative DBT semantics;
- freshness and operational insight.

DVT should defer:

- asset breadth until file authority and run reproducibility are complete.

## 9.5 Temporal

Official reference: <https://docs.temporal.io/>

Observed mature capability:

- durable execution that resumes after failures.

DVT should match as principles:

- stable identities;
- idempotent commands;
- receipts;
- deterministic correlation;
- explicit retry and recovery posture.

DVT should not:

- embed another workflow engine into the editor transaction.

## 9.6 Apache NiFi

Official references:

- <https://nifi.apache.org/projects/registry/>
- <https://nifi.apache.org/components/org.apache.nifi.github.GitHubFlowRegistryClient/>

Observed mature direction:

- Git-backed flow registry clients integrate versioned flows with existing version-control infrastructure.

DVT should match:

- Git/workspace files as durable reviewable truth;
- explicit diffs and revision identity.

DVT should not:

- build another proprietary registry that competes with Git.

## 9.7 Professional IDE and Git workflow

Official reference: <https://code.visualstudio.com/docs/sourcecontrol/overview>

Observed mature capability:

- working-tree changes, staged changes, commits, branches, sync, and conflicts are distinct states.

DVT should match:

- buffer state distinct from persisted working-tree state;
- semantic analysis distinct from byte persistence;
- Preview distinct from Run;
- Git commit/push distinct from workspace-file save;
- explicit diff and conflict posture.

DVT should differentiate:

- domain-aware DBT graph/file parity and execution provenance.

---

## 10. Required closeout instruction for PR #2040

This is the only blocking correction for the current iteration.

### What is wrong

The implementation is not delivered with a complete auditable handoff.

### Why it matters

Without one consolidated report, the next agent cannot reliably determine:

- which claims were executed;
- which architecture boundaries were reused;
- which risks remain intentionally deferred;
- whether live proof ran on the final head;
- where the next slice begins and the current slice ends.

### Exact owner

- Delivery owner: implementation agent for PR #2040
- Product/architecture owners: Canvas Authoring, Project Workspace I/O, DBT Integration
- Operational authority: Planning DB task/design records

### Required action

Add one top-level PR comment:

```markdown
## Iteration Handoff
```

with the complete contract in section 14 of this report.

### What must not be introduced

- no new runtime code without a demonstrated defect;
- no migration for pre-marker fixtures;
- no signing system;
- no batch publication implementation in this PR;
- no inventory/recovery expansion;
- no new save command or persistence rail;
- no generic authoring-session framework.

### Acceptance criteria

- handoff covers every required field;
- direct links to exact-head CI are present;
- protected Cypress test path and execution evidence are present;
- pre-product compatibility decision is explicit;
- rollback is stated as revert before supported production data exists;
- residual atomicity/revision risks are assigned to the next task;
- no unresolved inline thread;
- exact head remains green.

---

## 11. Next product vertical: atomic publication and exact revision

## 11.1 User transaction

```text
user requests graph-draft Preview
-> DVT builds the complete DBT artifact proposal
-> server validates every expected revision
-> server publishes all writes atomically or none
-> server returns one immutable publication receipt
-> server analyzes the resulting exact project content-set
-> Preview records that content-set and analysis identity
-> Run consumes the same identity
-> reopen reports exact, stale, unavailable, or conflict explicitly
```

## 11.2 Severity and evidence

Severity: P1 data integrity and reproducibility.

Evidence:

- main writes artifacts sequentially;
- PR #2040 still writes prepared artifacts sequentially;
- existing API batch authority already offers atomic replacement;
- exact project revision remains an open Planning DB gap;
- current Code reconciliation callback ignores the save receipt.

## 11.3 Root cause

A browser-level orchestration path grew from a single-file working-tree command into a multi-file publication transaction without moving transaction ownership to the API application boundary.

## 11.4 User impact

Possible outcomes today:

- partial generated project;
- Preview produced from a project different from the intended proposal;
- Run based on a later or mixed snapshot;
- reopen that cannot explain whether it matches the previewed project;
- misleading success after some files changed and others did not.

## 11.5 Exact domain owners

- `DbtWorkspaceArtifactPublication`: publication transaction and receipt
- `Project Workspace I/O`: CAS, locking, atomic replacement, idempotency
- `DbtProjectAnalysis`: project content-set and analysis identity
- `Execution Preview`: acceptance of exact publication provenance
- `Run Start`: enforcement of Preview/revision consistency
- Canvas Authoring: intent and user-facing conflict/stale posture

## 11.6 Existing domain objects to reuse

- `WorkspaceFileBatchExpectedFile`
- `WorkspaceFileBatchWrite`
- `WorkspaceFileBatchMutation`
- `WorkspaceFileBatchReceipt`
- `WorkspaceFileBatchMutationResult`
- `ExpectedWorkspaceFileRevision`
- `CanvasAuthoringAuthorityBinding`
- `DbtProjectGraphProjection`
- existing project content-set and analysis SHA fields

Do not create another atomic mutation primitive.

## 11.7 Cross-boundary result

If no existing versioned response can express the result, add one narrow contract composed from existing identities, for example:

```ts
type DbtProjectPublicationResultV1 =
  | {
      kind: 'published';
      batchReceipt: WorkspaceFileBatchReceipt;
      projectRoot: string;
      projectContentSetSha256: string;
      analysisSha256: string;
      freshness: 'fresh';
    }
  | {
      kind: 'conflict';
      conflicts: readonly {
        path: string;
        currentContentSha256: string | null;
      }[];
    }
  | {
      kind: 'invalid' | 'unavailable';
      publicationApplied: boolean;
      diagnostics: readonly unknown[];
    };
```

This is a result/provenance contract, not a second mutation authority. Reuse existing schemas and diagnostic types rather than `unknown` in implementation.

## 11.8 Command/query rail changes

Keep the existing product intent:

```text
GenerateDbtWorkspaceArtifacts
```

Move execution behind a protected API application service that:

1. authorizes workspace scope;
2. receives the complete generated artifact proposal;
3. builds one `WorkspaceFileBatchMutation`;
4. calls `IWorkspaceFileBatchMutationPort.apply`;
5. handles conflict/deduplication;
6. analyzes the exact resulting content-set with `ProjectDbtGraphFromFiles` semantics;
7. returns one publication/provenance result.

Do not expose the raw filesystem batch port as a general browser command.

## 11.9 Likely implementation surfaces

Web:

- `apps/web/src/app/views/canvas/canvasPlanAction.ts`
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`
- Canvas plans/ports/plugins for protected publication
- focused unit and presentation tests
- protected Cypress flow

Contracts:

- existing workspace batch schemas or a narrow versioned publication result
- contract exports and tests

API:

- protected DBT artifact publication route group
- application service/use case
- existing workspace scope policy
- `IWorkspaceFileBatchMutationPort`
- DBT analyzer/query adapter reuse
- HTTP contract parsing and error vocabulary

Planning DB:

- claim and design for `E-WEB-DBT-ATOMIC-PUBLICATION-1`
- components, responsibilities, ports, tests, evidence, risks, closeout

## 11.10 Migration and compatibility

DVT is pre-product.

Required:

- migrate code paths, not historical user data;
- delete or reset disposable development workspaces where needed;
- no legacy artifact conversion framework;
- preserve current contract compatibility only where merged consumers require it;
- use a versioned response for new cross-boundary semantics.

## 11.11 Rollback posture

Before supported production data:

- revert the implementation PR;
- reset disposable local/test workspace state;
- do not attempt browser-side compensating writes.

The gateway itself provides all-or-none replacement. If post-publication analysis fails, the product must report whether publication was applied; it must not pretend rollback occurred unless the server transaction actually includes analysis and authority switch in the same accepted boundary.

## 11.12 Observability

Required signals:

- publication attempt id;
- safe idempotency identity;
- request hash;
- artifact count and total bytes;
- expected-path count;
- conflict count;
- deduplicated disposition;
- publication duration;
- analysis duration;
- project content-set SHA;
- analysis SHA;
- Preview id/PlanRef;
- terminal outcome.

Never log artifact bodies or secrets.

## 11.13 Security

Required:

- authenticated tenant/project/environment scope;
- normalized paths constrained to scope root;
- bounded artifact count and bytes;
- complete expected-revision preflight;
- idempotency-key reuse protection;
- fail-closed malformed receipt parsing;
- exclusion of credentials, profiles, secrets, target output, and editor layout;
- no SQL/YAML body logging.

## 11.14 Red tests

1. Conflict on the second expected path changes no files.
2. Conflict on the last expected path changes no files.
3. Filesystem failure during replacement restores every original file.
4. Same idempotency key and same request returns the same receipt with `deduplicated=true`.
5. Same idempotency key and different request fails closed.
6. Duplicate artifact path is rejected before mutation.
7. Oversized batch is rejected before mutation.
8. Out-of-scope path is rejected before mutation.
9. Publication conflict creates no Preview.
10. Failed publication starts no Run.
11. Preview rejects analysis for a different content-set.
12. Run rejects or requires new Preview after project revision changes.
13. Reopen reports exact when hashes match.
14. Reopen reports stale when files changed after Preview.
15. Logs contain hashes/counts but no SQL body.

## 11.15 Green proof

- contract tests;
- application-service unit tests;
- local gateway integration tests;
- PostgreSQL/API route tests where applicable;
- Web presentation tests for conflict/stale states;
- architecture tests proving no raw batch port leakage into Canvas;
- protected full-stack Cypress flow;
- Planning DB integrity and feature mechanization;
- `pnpm verify:prepush`;
- six standard workflows green on final head.

## 11.16 Live browser proof

Required flow:

```text
open graph-draft Canvas
-> create at least SQL + YAML + dbt_project artifact proposal
-> Preview
-> verify one server publication receipt
-> verify project content-set and analysis hashes
-> Run
-> reopen Project Code and Canvas
-> verify same revision identity
-> externally modify one expected file
-> Preview again
-> verify conflict/stale posture and zero partial writes
```

## 11.17 Acceptance criteria

- all proposed files change or none change;
- publication is server-owned;
- no second persistence rail exists;
- receipt is immutable and idempotent;
- project content-set and analysis SHA are returned together;
- Preview records the identity;
- Run enforces it;
- reopen can distinguish exact/stale/conflict/unavailable;
- file-authoritative mode remains non-regenerating;
- graph-draft SQL-authority containment from #2040 remains intact;
- no secrets or artifact bodies appear in logs;
- complete `## Iteration Handoff` is published.

## 11.18 Release gates

Do not release the slice until:

- all required tests pass;
- live proof is linked;
- exact-head CI is green;
- no unresolved P1/P2 thread remains;
- Planning DB design/evidence reflects actual behavior;
- rollback and residual risks are documented;
- no unrelated release/governance/dependency work is mixed in;
- handoff is complete.

---

## 12. Subsequent priority order

After atomic publication and exact revision identity:

1. Workspace capability truth
   - paginated inventory;
   - `complete | partial` state;
   - cursor;
   - typed oversized/not-found/unsupported outcomes;
   - shared effective limits.
2. Cohesive authoring recovery
   - durable buffer journal;
   - revision-aware restore;
   - explicit discard/rebase/conflict;
   - no shadow semantic authority.
3. Product-wide quality gates
   - Web/API coverage ratchets;
   - accessibility;
   - bundle budgets;
   - large-graph performance;
   - injected failure and concurrency proof;
   - generated current-status truth.
4. Later differentiation
   - assets and lineage enrichment;
   - checks and freshness;
   - revision promotion/rollback;
   - collaboration;
   - broader operational UX.

Secondary correctness issue `ListRuns` paging should be fixed when its run-operability lane is next claimed, but it must not displace the currently approved DBT publication transaction unless live Planning DB dependencies explicitly reorder it.

---

## 13. Material delta from the preceding review

```text
No code change.
No main change.
No PR #2040 head change.
No new implementation handoff.
No new open functional PR.
No new review thread.
No CI regression.
No release change.
```

The route remains validated. No new finding is manufactured.

---

## 14. Required iteration-handoff template

The implementation agent must publish the following at the end of the current and every subsequent iteration:

```markdown
## Iteration Handoff

### Identity
- Planning task/design:
- Base SHA:
- Final head SHA:
- Branch:
- PR:

### Goal
- User transaction closed:
- Explicit out of scope:

### What changed
- Product behavior:
- Domain behavior:
- Presentation behavior:

### How it was implemented
- DDD owner(s):
- Commands/queries reused or changed:
- Ports reused or changed:
- Adapters reused or changed:
- Contracts reused or changed:
- Migrations:
- Files/components:

### Why this design
- Selected option:
- Rejected alternatives:
- How duplicate semantics were avoided:

### User-visible result
- Before:
- After:
- Failure/conflict posture:

### Red/green chronology
- Red test and observed failure:
- Implementation step:
- Green test/result:

### Validation evidence
- Focused tests:
- Full checks:
- Exact-head CI links:
- Live browser/integration proof link/path:

### Security and data integrity
- Scope authorization:
- Input/path/size limits:
- Secret/logging posture:
- Atomicity/idempotency/CAS posture:

### Observability and operability
- Signals added or reused:
- Failure diagnosis:
- Correlation identities:

### Compatibility and migration
- Supported persisted state:
- Pre-product/disposable state decision:
- Migration required or explicitly not required:

### Rollback
- Revert/restore procedure:
- Data implications:

### Residual risks
- Open product risks:
- Open technical risks:
- Deferred tasks with IDs:

### Deviations
- From approved plan:
- Why necessary:
- Authority approving change:

### Recommended next iteration
- Exact bounded transaction:
- Entry conditions:
- Acceptance criteria:
```

A handoff that omits evidence or presents planned work as executed work is incomplete.

---

## 15. Final verdict

PR #2040 remains the right product work and has no newly demonstrated runtime blocker.

Its current state is:

```text
functionally credible
exact-head CI green
review thread resolved
iteration handoff missing
not yet merged
```

The correct action is not another redesign. The implementation agent must publish the handoff, close the iteration, and then implement the existing atomic-publication/exact-revision vertical through the server-owned batch authority.

Anything else—another compatibility framework, release-governance expansion, dependency campaign, generic authoring session, proprietary registry, or broader asset model—would be a deviation from the current highest-value transaction.
