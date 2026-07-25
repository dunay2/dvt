---
title: DVT Fowler Review — Atomic Publication Red Phase, No Implementation Delta
status: review
owner: Architecture and Governance
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-25T08:38:00+02:00
---

# DVT Fowler Review — Atomic Publication Red Phase, No Implementation Delta

## 1. Executive decision

There is **no material implementation delta** since the previous cycle.

The exact current `main` remains:

- `8c098d6e35ce874efae81609814d99e8e60091f7`
- `chore(main): Release 0.5.3 (#2037)`

The active product work remains split across:

1. PR #2040 — model SQL authority containment, exact head
   `6257745ed1ec91f1a1415585d24e319905966931`;
2. PR #2055 — governed red proof for atomic DBT artifact publication, exact head
   `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`.

PR #2040 is functionally green on its exact head and has zero unresolved inline
threads. PR #2055 remains intentionally red and has one unresolved P1 requiring a
server-owned atomic batch publication command.

The repository is not blocked by missing architecture analysis. It is blocked by
missing green implementation of `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

The immediate product route remains:

```text
model SQL authority containment closeout
→ atomic project publication
→ exact project content-set and analysis identity
→ Preview and Run admission bound to that identity
→ workspace capability truth
→ cohesive authoring recovery
→ product-wide quality gates
→ later differentiation
```

No evidence justifies changing this sequence.

---

## 2. Review identity and sources

### 2.1 Exact repository state

| Item | Exact state |
|---|---|
| Reviewed branch | `main` |
| Reviewed main SHA | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| Release commit | `chore(main): Release 0.5.3 (#2037)` |
| Open product PR | #2040 |
| #2040 head | `6257745ed1ec91f1a1415585d24e319905966931` |
| Open atomicity PR | #2055 |
| #2055 head | `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43` |
| Current review PR before this cycle | #2058 |
| Current review commit before this cycle | `d54d931c89645d8cb15f2c995734b3499f95a60a` |

### 2.2 Canonical sequencing authority

This review uses the following as authority:

- live Planning DB task/design/dependency semantics represented by current merged
  migrations and current active implementation migrations;
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`;
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`;
- current runtime source, contracts, ports, adapters and tests;
- exact-head GitHub Actions results;
- current PR threads and discussion.

The following are not treated as operational authority:

- closed point-in-time review PRs;
- unmerged review Markdown;
- the absent `dvt-product-priority-execution-guide-20260721.md`;
- remembered intent not represented by current code, ADR or Planning DB truth.

PR #2030 remains fixed and is not reopened.

### 2.3 External comparison sources

Current comparison references:

- Airflow DAG Bundles:
  https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html
- Prefect deployment versioning:
  https://docs.prefect.io/v3/how-to-guides/deployments/versioning
- NiFi flow versioning:
  https://nifi.apache.org/nifi-docs/user-guide.html

These references are comparison inputs only. They do not define DVT domain
semantics.

---

## 3. Iteration handoff audit

## 3.1 Formal status

```text
DELIVERY-HANDOFF-MISSING
```

Reason: the implementation agent did not produce a complete end-of-iteration
handoff for PR #2040. A reviewer-reconstructed `## Iteration Handoff` exists at:

https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847

That reconstruction is useful evidence and contains most required fields, but it
cannot prove implementation-agent provenance or red-first chronology. It
explicitly marks tests-first history as `NOT PROVEN`.

Therefore it is classified as:

```text
reviewer reconstruction: PARTIAL / auditable technical summary
implementation-agent handoff: MISSING
```

PR #2055 is an active red iteration and has not reached an end-of-iteration
handoff point. Its final handoff remains required before the atomic publication
iteration can close.

## 3.2 Missing handoff fields that cannot be reconstructed

The following remain missing from the implementation agent:

1. direct confirmation that the exact final branch state was intentionally
   selected by the implementer;
2. contemporaneous failing-test output before implementation for #2040;
3. direct retained live-browser artifact link for the protected Cypress run;
4. implementer-owned deviation statement;
5. implementer-owned final residual-risk acceptance;
6. implementer-owned recommendation and scope commitment for the next iteration.

The reconstructed report must not be represented as proof of those facts.

## 3.3 Instruction to the implementation agent

Before beginning unrelated work, the agent must either:

- close #2040 with its own complete handoff, or
- explicitly adopt and correct the retrospective handoff, recording which claims
  it personally confirms and which remain historical `NOT PROVEN` evidence.

At the end of #2055, the agent must publish a new handoff containing the complete
contract defined in section 14 of this report.

---

## 4. Material delta

## 4.1 Main and release

No delta:

- `main` remains at release `0.5.3`;
- no new release commit exists;
- no implementation PR has merged;
- no runtime, contract or migration change has entered `main`.

## 4.2 PR #2040

No delta:

- head remains `6257745ed1ec91f1a1415585d24e319905966931`;
- branch remains `fix/dbt-model-sql-authority-containment`;
- exact-head six-workflow CI remains green;
- unresolved inline threads remain zero;
- the pre-marker compatibility request remains disproved/out of scope;
- the internal `adopt_legacy_equivalent` name remains optional truth debt, not a
  runtime blocker.

## 4.3 PR #2055

No delta:

- head remains `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`;
- compared with #2040 head, it is two commits ahead, zero behind;
- the isolated delta is one file:
  `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts`;
- isolated delta size is `+46/-0`;
- the red test remains failing in governed Web CI;
- no green application command, contract, API adapter or runtime implementation
  has been added;
- one P1 thread remains unresolved.

This means there is no new progress to reward and no new defect to invent.

---

## 5. Claim-to-evidence matrix

| Claim | Status | Evidence | Review conclusion |
|---|---|---|---|
| Current `main` is release 0.5.3 | VERIFIED | `main@8c098d6e...`, commit message `chore(main): Release 0.5.3 (#2037)` | No release delta |
| #2040 contains model SQL overwrite containment | VERIFIED | exact diff, policy, publisher, Code posture, live-flow source | Correct current priority |
| #2040 preflights all artifacts before the first write | VERIFIED | `dbtGraphWorkspaceArtifactPublisher.ts` | Containment works for known divergence |
| #2040 binds per-file CAS revisions observed during preflight | VERIFIED | publisher source and tests | Avoids revision refresh masking |
| #2040 provides atomic multi-file publication | CONTRADICTED | publisher performs sequential `saveFileContent` calls | Partial publication remains possible |
| #2040 keeps graph-owned Project Code read-only | VERIFIED | Code posture/surface changes and tests | Correct authority presentation |
| #2040 keeps file-authoritative DBT projects editable | VERIFIED | Code route scope tests | No duplicate authority introduced |
| #2040 exact-head CI is green | VERIFIED | six successful workflow runs on `6257745e...` | Functional evidence is strong |
| #2040 unresolved inline threads are zero | VERIFIED | review thread query | Legacy thread resolved |
| #2040 has a valid implementation-agent handoff | NOT PROVEN | only reviewer-reconstructed comment exists | Formal handoff remains missing |
| #2055 is isolated red proof over #2040 | VERIFIED | compare `6257745e...58fb694c`: one test file, +46 | Correct tests-first start for next slice |
| #2055 proves partial publication | VERIFIED | Test Suite failure in governed changed-suite job | Concern is executable, not speculative |
| #2055 has a green atomic command | CONTRADICTED | no runtime delta beyond #2040; test remains red | Main blocker remains active |
| #2055 must remain unmerged while red | VERIFIED | PR body, failing Test Suite, unresolved P1 | Correct governance posture |
| Exact project publication and analysis identity exists | NOT PROVEN | merged Planning DB keeps `GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION` open | Next transaction still required |
| A backward-compatibility migration is required | CONTRADICTED / OUT OF SCOPE | pre-product decision; no deployed preservation contract | Do not add migration code |
| Existing batch authority can implement the transaction | VERIFIED | `IWorkspaceFileBatchMutationPort`, `LocalWorkspaceFileBatchMutationGateway`, Source Import and YAML edit command patterns | Reuse, do not duplicate |
| Planning sequence has legitimately changed | NOT PROVEN | exact-revision gap remains assigned to `E-WEB-DBT-ATOMIC-PUBLICATION-1` | Keep current order |

---

## 6. Fixed, active, superseded and disproved findings

## 6.1 Fixed

### F-1 — pending reconciliation receipt race

Status: **FIXED** by PR #2030 and merged Planning DB closeout.

Do not reopen.

### F-2 — run list/detail materialization drift

Status: **FIXED** by PR #2035 / release 0.5.3 for the previously identified
shared projector discrepancy.

This does not automatically close separate pagination concerns.

### F-3 — graph Preview silently overwrites divergent SQL

Status: **IMPLEMENTED ON OPEN PR #2040**, not merged.

Evidence:

- deterministic self-verifying graph-managed payload marker;
- complete preflight before writes;
- fail-closed conflict on divergent/malformed model SQL;
- graph-owned Project Code read-only posture;
- protected flow proves external bytes are retained after rejected Preview;
- six exact-head workflows green.

Release state remains pending because #2040 is still open.

## 6.2 Active

### A-1 — atomic multi-file DBT artifact publication

Severity: **P1**.

Current source performs:

```text
complete preflight
→ save artifact 1
→ save artifact 2
→ ...
```

If a later write rejects, earlier writes remain.

PR #2055 now proves the defect with a failing governed test. The unresolved P1
thread is correct and must stay open until the same test is green.

### A-2 — exact project revision identity

Severity: **P1**.

Merged Planning DB explicitly retains:

- `GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION`;
- owning task `E-WEB-DBT-ATOMIC-PUBLICATION-1`;
- required proof: one server-owned receipt binds writes and exact analysis
  identity;
- forbidden shortcut: repeated GET operations represented as atomic proof.

The target identity must bind at least:

- complete expected file set;
- complete resulting write set;
- `projectContentSetSha256`;
- `analysisSha256`;
- Preview admission;
- Run admission;
- reopen posture.

### A-3 — workspace capability truth

Severity: **P1 after atomic publication**.

Known active constraints remain:

- file listing capped at 500 without completeness/cursor truth;
- file content limit conflated with invalid-path semantics;
- incomplete dbt-compatible extension/capability posture;
- limits can omit resources instead of returning explicit diagnostics.

Do not start this before the current transaction is green.

### A-4 — cohesive authoring recovery

Severity: **P1/P2 after workspace truth**.

Current save/flush behavior does not yet establish a durable crash-recovery
journal equivalent to a professional IDE working-copy recovery model.

Do not hide this with browser-local optimistic labels.

### A-5 — scoped run keyset pagination

Severity: **P2**.

The validated issue remains a distinct task on the existing `ListRuns` query
rail. It must not displace the current DBT integrity transaction.

### A-6 — product-wide quality gates

Severity: **P2**.

Coverage and quality enforcement remain stronger for Engine than for the complete
Web/API product path. Accessibility, performance, large-graph and contract-runtime
parity gates remain incomplete.

## 6.3 Superseded

- Repeated requests to preserve branch-only or local pre-marker artifacts are
  superseded by the explicit pre-product decision.
- Closed review PRs are historical evidence only.
- The old priority-guide Markdown is absent and cannot override Planning DB.
- A browser compensation loop is superseded by the existing server batch mutation
  authority.

## 6.4 Disproved or out of scope

- mandatory migration for unreleased local artifacts;
- version negotiation for pre-marker development files;
- cryptographic signature/key management for the SQL integrity marker;
- a second DBT file repository;
- a generic browser batch mutation API;
- another DBT-specific Preview or Run synonym;
- reopening #2030.

---

## 7. Fowler-style architecture review

## 7.1 Current smell: transaction script without transaction ownership

The current Web publisher has legitimate responsibility for:

- complete artifact projection consumption;
- graph-owned SQL classification;
- divergence preflight;
- observed revision binding.

It does not have a valid atomic storage boundary. Performing multiple browser-side
commands creates a transaction script whose consistency depends on a sequence of
independent side effects.

The correction is not to add compensation to that script. The correction is to
move mutation ownership behind one application command backed by the existing
batch mutation gateway.

## 7.2 Correct owner split

### Web owner

`DbtGraphWorkspaceArtifactPublisher` should own:

- prepare complete artifact proposal;
- invoke one dedicated publication command;
- reduce typed conflict/success outcome;
- pass the exact receipt into Preview orchestration.

It must not own:

- filesystem locking;
- multipath replacement;
- durable idempotency receipt storage;
- rollback loops;
- project analysis internals.

### API application owner

A dedicated command such as
`PublishGraphDbtWorkspaceArtifactsCommand` should own:

- authorized scope;
- request integrity and idempotency identity;
- complete expected-file fence;
- one `IWorkspaceFileBatchMutationPort.apply(...)` call;
- batch receipt validation;
- exact project analysis after publication;
- immutable publication receipt creation.

The exact final name must follow repository command vocabulary and Planning DB
catalog rules. The design must not manufacture a generic batch UI rail.

### Infrastructure owner

`LocalWorkspaceFileBatchMutationGateway` should continue to own:

- multipath locking;
- complete compare-and-swap;
- atomic replacement;
- idempotency mismatch detection;
- durable batch receipt behavior.

### Analysis owner

`ProjectDbtGraphFromFiles` should continue to own:

- server-side DBT project analysis;
- `projectContentSetSha256`;
- `analysisSha256`;
- diagnostics and projection.

No browser parser is acceptable.

## 7.3 Required receipt

The publication receipt should be versioned and include only operational identity,
not SQL bodies.

Minimum semantic shape:

```text
schemaVersion
operationId / receiptId
idempotencyKey
requestHash
deduplicated
scope identity
canvasId
project root / authority binding
written paths and resulting content hashes
unchanged paths and hashes when relevant
projectContentSetSha256
analysisSha256
analysis status / diagnostics reference
createdAt
```

The contract must define whether the complete project content set includes only
DBT project files or every supported file under the bound project root. That
decision must be aligned with ADR-0060 and `ProjectDbtGraphFromFiles`; it must not
be inferred separately in Web.

## 7.4 Shotgun surgery risk

A single giant PR touching Web orchestration, API routes, contracts, adapters,
Preview, Run, reopen and recovery would create shotgun surgery and make the
transaction impossible to review.

Recommended decomposition:

1. contract and application command with API unit/integration proof;
2. protected HTTP adapter and Web command port;
3. Canvas publisher adoption that makes the existing red test green;
4. exact receipt binding into Preview;
5. Run/reopen exact-identity gate;
6. protected live browser proof and Planning DB closeout.

Each PR may be stacked, but each must have a truthful handoff.

---

## 8. Corrective implementation instruction

## 8.1 Blocking correction C-1 — replace sequential writes with one batch command

### What is wrong

`dbtGraphWorkspaceArtifactPublisher.ts` performs independent
`saveFileContent(...)` calls after preflight. A late failure leaves earlier
artifacts modified.

### Source evidence

- PR #2055 red test;
- failing Test Suite run `30116154817`;
- Web Frontend Tests job `89557248590`;
- unresolved P1 thread on publisher lines 117–121;
- current publisher loop in #2040.

### Why it matters

The user transaction is “publish this DBT project revision”, not “attempt each
file independently”. Partial publication creates a project state that was never
accepted, analyzed or previewed as a whole.

### Exact owner

- API application command: complete publication transaction;
- `IWorkspaceFileBatchMutationPort`: atomic storage mutation;
- `DbtGraphWorkspaceArtifactPublisher`: Web orchestration only.

### How to correct using existing semantics

1. Build the complete artifact proposal and expected revisions.
2. Send one dedicated protected application command with one idempotency key.
3. Convert every revision into the batch `expectedFiles` set.
4. Send every required write in one `writes` set.
5. Call `IWorkspaceFileBatchMutationPort.apply(...)` once.
6. On conflict, return a typed conflict outcome; write nothing.
7. On success, validate every expected write exists in the batch receipt.
8. Run `ProjectDbtGraphFromFiles` for the same bound project.
9. Build a versioned publication receipt containing exact content-set and analysis
   identity.
10. Allow Preview only from that receipt.

### What must not be introduced

- browser compensation;
- sequential rollback writes;
- generic batch mutation endpoint;
- second file repository;
- DBT-specific save synonym;
- client-generated analysis hash;
- SQL bodies in logs;
- unsupported artifact migration.

### Likely files/components

Exact final paths must be selected by repository ownership rules, but the likely
surfaces are:

- `packages/@dvt/contracts/src/contracts/...` for a versioned receipt/request;
- `apps/api/src/application/services/...` for the specific command;
- `apps/api/src/application/ports/workspaceFiles.ts` only if current types are
  insufficient;
- `apps/api/src/entrypoints/http/...` for the protected route;
- `apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts`
  as reused adapter, not rewritten owner;
- `apps/web/src/app/ports/workspace.ts` for a capability-specific command port;
- `apps/web/src/app/adapters/...` for the HTTP client;
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`;
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`;
- Planning DB design/closeout migrations.

### Red tests

1. Existing PR #2055 test: second artifact failure leaves every original byte
   unchanged.
2. API command: any expected-file conflict returns zero writes.
3. API command: conflicts include every conflicting path required by the contract.
4. Idempotent retry returns the same receipt.
5. Same idempotency key with a different request fails closed.
6. Batch receipt missing an expected path fails as a persistence invariant.
7. Analysis identity differing from the retained project fails closed.
8. Preview invoked without a publication receipt is rejected.
9. Preview invoked with a stale receipt is rejected.
10. Logs never include SQL/YAML content bodies.

### Green proof

- existing red Web test becomes green without weakening assertions;
- focused API application tests pass;
- route integration tests pass through the real batch gateway;
- contract schemas reject malformed/missing identity;
- all standard workflows green on final head.

### Live/integration proof

Protected flow:

```text
Canvas graph-draft authoring
→ complete generated DBT artifact proposal
→ atomic publication command
→ exact publication receipt
→ ProjectDbtGraphFromFiles
→ Preview admitted for receipt identity
→ Run admitted for same identity
→ reopen displays exact/current posture
```

Injected conflict flow:

```text
external edit after proposal
→ atomic command conflict
→ zero files changed
→ no Preview
→ no Run
→ conflict path displayed
```

### Acceptance criteria

- conflict on any path means zero writes;
- no partial DBT project can be observed;
- identical retry deduplicates;
- mismatched retry fails closed;
- receipt contains exact resulting hashes;
- `projectContentSetSha256` and `analysisSha256` are server-derived;
- Preview and Run require the exact receipt identity;
- reopen can distinguish exact/current, stale and conflict;
- no body logging or new secret exposure;
- Planning DB marks the task complete only after live proof;
- implementation-agent handoff exists.

### Rollback

Rollback is a normal revert of the atomic-publication implementation while DVT
remains pre-product. The command must not require a deployed-data migration.

A failed command performs no partial writes, so operational rollback is “retry or
correct conflict”, not browser compensation.

### Observability

Record:

- operation/receipt ID;
- scope IDs;
- project root;
- path count;
- conflict paths;
- result/deduplicated posture;
- project content-set hash;
- analysis hash;
- duration/error category.

Never record:

- SQL bodies;
- YAML bodies;
- credentials;
- environment secrets.

### Security

- retain existing authentication/authorization scope;
- normalize and validate every path server-side;
- enforce file count and payload bounds;
- fail closed on unknown/malformed receipt versions;
- do not accept client-provided analysis identity as authoritative;
- do not expand the SQL marker into a security credential.

### Why this restores the intended route

It converts the current per-file implementation into the approved project-level
transaction without creating another authority, language, repository or runtime
rail.

## 8.2 Follow-up correction C-2 — truthful internal naming

Rename `adopt_legacy_equivalent` to a term such as
`mark_equivalent_unmarked_projection` when the atomic branch next touches the
policy.

This is not a compatibility implementation and must not delay the P1 transaction
unless the same file is already modified.

---

## 9. CI and review-thread state

## 9.1 PR #2040

Exact head: `6257745ed1ec91f1a1415585d24e319905966931`.

Six standard workflows remain green:

- Contracts & Determinism — run `29904512631`;
- Dependency Review — run `29904512456`;
- Test Suite — run `29904512339`;
- CI — Code Quality — run `29904512227`;
- CodeQL — run `29904512379`;
- PR Quality Gate — run `29904512388`.

Review threads:

- unresolved: 0;
- resolved: 1;
- resolved finding: unsupported pre-marker preservation requirement;
- disposition: `DISPROVED / OUT OF SCOPE`.

## 9.2 PR #2055

Exact head: `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`.

Current workflow posture:

- CodeQL: success;
- Contracts & Determinism: success;
- Dependency Review: success;
- CI — Code Quality: success;
- PR Quality Gate: success;
- Test Suite: failure, intentionally exposing the atomicity gap.

The failing job is `Web Frontend Tests`; the failed step is
`Run governed web Vitest changed suites (PR)`.

Review threads:

- unresolved: 1;
- severity: P1;
- finding: sequential writes can leave a partially generated DBT project;
- disposition: active and blocking.

## 9.3 Current review PR #2058

Documentation-only CI completed with:

- PR Quality Gate: success;
- CI — Code Quality: success;
- product workflows skipped for documentation-only scope.

This report supersedes #2058 as the newest point-in-time review once its new PR is
created. Neither review is operational product authority.

---

## 10. Product and nonfunctional review

## 10.1 Web/API/runtime behavior

No new code exists to review beyond the stable #2040 red/green split.

Current truth:

- Web owns correct preflight policy but an invalid mutation boundary;
- API already owns a correct batch gateway used by other application commands;
- runtime Preview/Run are not yet bound to an exact publication receipt;
- the right fix is application-level transaction reuse, not another UI workflow.

## 10.2 Contracts

No new atomic publication request/receipt contract exists.

This is a current gap, not permission to expose raw batch mutation DTOs directly
to the browser. The contract must describe the product command and its exact
identity.

## 10.3 Data integrity

Current containment prevents known divergent SQL from being overwritten before
publication starts. It does not protect against a failure during the subsequent
sequence.

Data-integrity posture is therefore:

- known divergence before first write: protected;
- concurrent conflict during a later write: partial-publication risk;
- whole-project analysis identity: not bound;
- Preview/Run reproducibility: not yet proven.

## 10.4 Recovery

Atomic publication will remove the need to recover from partial file writes for
this transaction. It does not by itself implement durable editor-buffer crash
recovery.

Keep those concerns separate.

## 10.5 Accessibility

No accessibility delta is present. The atomic transaction is backend/application
integrity work. User-visible conflict feedback must remain perceivable and
localized, but an accessibility redesign is not part of this slice.

## 10.6 Performance

The command must place explicit bounds on:

- artifact count;
- total request bytes;
- individual file bytes;
- project analysis duration;
- idempotency receipt retention.

One batch should reduce repeated HTTP overhead, but performance improvement is
secondary to correctness. Do not weaken full-project fencing to optimize early.

## 10.7 Security

Primary risks:

- path traversal or normalization mismatch across multiple paths;
- oversized/unbounded publication payload;
- logging source bodies;
- accepting client-generated hashes as trusted analysis identity;
- idempotency collision/mismatch;
- route authorization drift.

The existing gateway and protected route composition patterns should be reused.

## 10.8 Operability and observability

The final transaction needs one operation-level outcome rather than N unrelated
file-write events. Operational diagnosis should answer:

- what project/scope was requested;
- which operation/receipt was involved;
- how many paths were fenced/written;
- whether it deduplicated;
- which paths conflicted;
- which project/analysis hashes resulted;
- why Preview/Run admission was rejected.

---

## 11. Honest comparison with mature systems

## 11.1 dbt Cloud/Studio and professional IDE workflows

DVT should match the professional expectation that project files, validation,
execution and version-control posture are coherent. It should not pretend that a
series of successful per-file writes constitutes a project revision.

DVT differentiates through graph-based heterogeneous component composition, not
through weaker file/revision semantics.

## 11.2 Airflow

Airflow DAG Bundles allow a run to use a specific version of the complete bundle
for the whole run. That is directly relevant: DVT Preview and Run must reference
one exact project content set rather than “whatever files are current after the
last individual save”.

DVT does not need to copy Airflow’s bundle implementation. It must match the
reproducibility invariant.

## 11.3 Prefect

Prefect deployment versioning tracks deployment changes, permits rollback and can
pin Git commits or image digests. DVT should similarly expose exact immutable
execution identity, but its identity is a project content set plus analysis
receipt rather than a Prefect deployment object.

## 11.4 Dagster

Dagster’s asset/check model remains relevant for later differentiation around
lineage, checks, freshness and observability. It does not supersede the current
publication transaction.

## 11.5 Temporal

Temporal is relevant to later durable orchestration, retries and recovery. It
must not be used to disguise a non-atomic file publication command. Storage
atomicity must be owned at the storage/application transaction boundary first.

## 11.6 NiFi

NiFi provides visual flow composition and flow versioning. DVT should learn from
its explicit version-control posture but must not create a proprietary flow
registry while normal project files and Git-compatible workflows already exist.

## 11.7 Match / differentiate / defer

### Match now

- exact project revision identity;
- atomic publication;
- reproducible Preview/Run;
- honest conflict and stale posture;
- professional file authority behavior.

### Differentiate later

- heterogeneous executable architecture graph;
- deterministic graph-to-task projection;
- architecture-aware planning and evidence;
- integrated lineage/check insight.

### Defer

- broad orchestration feature parity;
- proprietary registry;
- advanced lineage UI;
- deployment promotion UI;
- large-scale collaboration features.

---

## 12. Priority impact

No legitimate authority change is detected.

Current order remains:

1. finish/merge model SQL authority containment with truthful handoff;
2. make #2055 green through one server-owned atomic publication command;
3. bind exact project content-set and analysis identity into Preview and Run;
4. implement workspace capability truth;
5. implement cohesive authoring recovery;
6. expand product-wide quality gates;
7. pursue later differentiation.

The red test is useful progress, but it is not product completion. It does not
justify starting workspace inventory, recovery or visual differentiation in
parallel.

---

## 13. Next implementation slice

The next slice is narrowly defined:

```text
complete graph-derived artifact proposal
→ complete expected-file fence
→ one idempotent server-owned batch mutation
→ validated immutable publication receipt
→ ProjectDbtGraphFromFiles for retained project
→ projectContentSetSha256
→ analysisSha256
→ Preview admitted for exact receipt
→ Run admitted for exact receipt
```

### Required first green result

The existing PR #2055 test must pass unchanged:

```text
second artifact conflict/failure
→ no artifact changes
→ no Preview
→ no Run
```

### Required implementation discipline

- preserve one domain owner per concern;
- reuse existing batch gateway;
- add a product-specific command, not generic mutation exposure;
- use runtime schemas at HTTP boundaries;
- keep source content out of logs;
- update Planning DB before claiming closeout;
- leave the final implementation handoff.

---

## 14. Required final iteration handoff

At the end of the atomic-publication iteration, the implementation agent must
publish one `## Iteration Handoff` containing all of the following.

## 14.1 Identity

- exact base SHA;
- exact final head SHA;
- branch;
- PR;
- commits;
- Planning DB task/design/dependency IDs.

## 14.2 Goal and design

- iteration goal;
- what changed;
- how it was implemented;
- why the design was selected;
- exact domain owner for each responsibility;
- explicitly rejected alternatives.

## 14.3 Repository inventory

- commands and queries;
- ports;
- adapters;
- contracts/schema versions;
- routes;
- migrations;
- files changed;
- architecture and Planning DB records.

## 14.4 Behavior

- user-visible success behavior;
- conflict behavior;
- stale behavior;
- retry/deduplication behavior;
- Preview behavior;
- Run behavior;
- reopen behavior.

## 14.5 Evidence

Separate claims from executed evidence:

- red tests observed before implementation;
- exact test commands;
- green tests passed;
- exact-head CI links;
- protected integration/live proof;
- retained artifacts/log links when available;
- Planning DB integrity/mechanization output.

## 14.6 Risk posture

- security;
- data integrity;
- observability;
- performance/input bounds;
- compatibility/pre-product decision;
- rollback;
- unresolved risks;
- deviations;
- recommended next iteration.

A PR body is acceptable only if it contains this complete contract.

---

## 15. Final disposition

### Material delta

```text
NONE
```

### Current delivery status

```text
#2040: functionally green, open, implementation-agent handoff still missing
#2055: governed red proof, no green implementation, one unresolved P1
main: unchanged at release 0.5.3
```

### Blocking decision

Do not merge #2055 while Test Suite is red and the P1 is unresolved.

Do not begin unrelated product work. Implement the existing server-owned atomic
publication route, bind exact analysis identity, make the same red test green,
and produce the required handoff.

### Reviewer honesty statement

This review claims no local execution. Repository state, diffs, workflow results,
threads and source were inspected through GitHub. External comparisons were
checked against current official documentation. No unsupported compatibility,
migration or green-runtime claim has been added.
