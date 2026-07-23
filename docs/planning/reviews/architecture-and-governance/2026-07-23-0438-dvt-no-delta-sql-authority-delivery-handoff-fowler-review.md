---
title: DVT no-delta SQL-authority delivery-handoff Fowler review
date: 2026-07-23
status: point-in-time-review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_product_pr: 2040
reviewed_product_head: 6257745ed1ec91f1a1415585d24e319905966931
scope: documentation-only
---

# DVT no-delta SQL-authority delivery-handoff Fowler review

## 1. Executive decision

There is **no material repository or product delta** since the previous review.

- `main` remains exactly `8c098d6e35ce874efae81609814d99e8e60091f7`.
- Product PR `#2040` remains exactly `6257745ed1ec91f1a1415585d24e319905966931`.
- The six standard pull-request workflows remain successful on that exact product head.
- The only inline review thread remains resolved.
- No complete implementation-agent `## Iteration Handoff` has been published.

The current decision is therefore unchanged:

1. PR `#2040` is functionally ready pending delivery closeout.
2. Do not reopen the disproved pre-marker migration requirement.
3. Do not require removal of byte-identical graph-projection marking as a correctness fix.
4. Prefer renaming `adopt_legacy_equivalent` because the term falsely suggests a supported legacy population, but treat this as a naming/truth follow-up rather than a functional blocker.
5. Require the complete iteration handoff before merge.
6. After `#2040`, implement atomic multi-file publication and exact project-revision identity as one bounded end-to-end product transaction.

This report is point-in-time review evidence. Planning DB, merged architecture decisions, current code, tests, and exact-head CI remain operational authority.

## 2. Exact review identity

| Item | Value |
| --- | --- |
| Repository | `dunay2/dvt` |
| Exact `main` | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| `main` commit | `chore(main): Release 0.5.3 (#2037)` |
| Active product PR | `#2040` |
| Product branch | `fix/dbt-model-sql-authority-containment` |
| Product head | `6257745ed1ec91f1a1415585d24e319905966931` |
| Product base | `main@8c098d6e35ce874efae81609814d99e8e60091f7` |
| Product PR state | open, ready for review, mergeable |
| Prior current-state review | `#2044` |
| Current handoff state | `DELIVERY-HANDOFF-MISSING` |

Primary links:

- Main commit: <https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7>
- Product PR: <https://github.com/dunay2/dvt/pull/2040>
- Product branch: <https://github.com/dunay2/dvt/tree/fix/dbt-model-sql-authority-containment>
- Product head: <https://github.com/dunay2/dvt/commit/6257745ed1ec91f1a1415585d24e319905966931>
- Release `v0.5.3`: <https://github.com/dunay2/dvt/releases/tag/v0.5.3>

## 3. Material delta since the previous cycle

### 3.1 Repository delta

None.

The latest `main` history remains:

1. `8c098d6e` — release `0.5.3`.
2. `9bc34457` — unified run operational truth.
3. `591a1ecd` — release `0.5.2`.
4. `8a39d19e` — pending reconciliation receipt truth.

No runtime, contract, workflow, dependency, migration, generated-artifact, or product-behaviour commit has landed after `8c098d6e`.

### 3.2 Product PR delta

None.

PR `#2040` still contains one implementation commit and the same 24-file surface. No implementation commit was added after the previous cycle.

### 3.3 Review-thread delta

None.

The sole Codex inline thread remains resolved. Its compatibility premise was disproved because DVT is pre-product and has no supported deployed pre-marker artifact population.

### 3.4 Handoff delta

None.

The PR body and comments still do not contain a complete top-level `## Iteration Handoff` satisfying the delivery contract.

## 4. Implementation handoff audit

### 4.1 Result

`DELIVERY-HANDOFF-MISSING`

The implementation is inspectable from code, tests, Planning DB migrations, CI, and the protected Cypress flow. It is not yet delivered as one consolidated, auditable iteration report.

### 4.2 Missing mandatory fields

The handoff still needs to record in one place:

- exact base SHA;
- exact final head SHA;
- branch and PR;
- iteration goal;
- what changed;
- how it was implemented;
- why this design was selected;
- exact domain owners;
- commands and queries reused;
- ports and adapters reused;
- contracts and value objects involved;
- migrations and files touched;
- user-visible behaviour;
- red-test chronology;
- green-test evidence;
- direct exact-head CI links;
- direct protected browser/integration proof;
- security posture;
- data-integrity posture;
- observability posture;
- compatibility decision;
- rollback posture;
- residual risks;
- deviations from the approved route;
- bounded next iteration.

A list of commands in the PR body is useful validation metadata, but it is not a complete handoff.

### 4.3 Claim-to-evidence matrix

| Claim | Status | Repository evidence | Reviewer conclusion |
| --- | --- | --- | --- |
| Exact base/head/branch/PR identity | VERIFIED | PR metadata and exact refs | Identity is unambiguous. |
| Preview could overwrite newer Project Code SQL | VERIFIED | old `canvasPlanAction.ts` read-latest-then-write loop | Root cause is real. |
| Graph-managed SQL is self-identifying | VERIFIED | `createGraphManagedDbtModelSql` and marker parser | Marker gives deterministic payload integrity. |
| Marker authenticates the creator | DISPROVED / FIXED | closeout migration says payload integrity, not origin authentication | No signing or secret is required. |
| All artefacts are preflighted before first write | VERIFIED | `publishGraphDbtWorkspaceArtifacts` uses `Promise.all` preflight | Divergence is detected before publication starts. |
| Expected revisions are retained from preflight | VERIFIED | prepared artefacts carry observed revisions | Prevents a second read from redefining CAS. |
| Divergent unmarked SQL is preserved | VERIFIED | policy returns conflict; Cypress proves rejected Preview | No silent external-edit overwrite. |
| Malformed managed SQL fails closed | VERIFIED | invalid marker returns conflict | Safe containment. |
| Graph-owned Project Code is read-only | VERIFIED | explicit edit posture and passive file surface | Removes duplicate writable representation. |
| File-authoritative projects remain editable | VERIFIED | posture branches on explicit authority | No graph policy leaks into file authority. |
| Byte-identical unmarked projection may be marked | VERIFIED | `adopt_legacy_equivalent` path | Safe in active graph-draft path; naming is misleading. |
| This is backward compatibility for deployed artefacts | DISPROVED | product-owner decision: pre-product, no preservation contract | Do not create migration/version negotiation. |
| Publication is atomic | CONTRADICTED | final writes remain sequential | Preflight is not transaction atomicity. |
| Exact project revision binds save, analysis, Preview, and Run | CONTRADICTED | save receipt is ignored by reconciliation callback; no publication receipt chain | Next canonical gap. |
| Six standard workflows are green | VERIFIED | exact-head workflow runs | CI is green on `6257745e`. |
| Protected browser flow exists | VERIFIED | `canvas-dbt-author-code-run-live.cy.ts` | Live path is represented and reported as executed. |
| Tests were written and observed failing first | NOT PROVEN | no consolidated red chronology | Must be stated in handoff. |
| Rollback is defined | NOT PROVEN | no consolidated rollback section | Must be stated in handoff. |
| Residual risk is explicitly owned | PARTIAL | Planning DB preserves atomic-publication gap | Handoff must summarize it. |
| Next iteration is bounded | PARTIAL | review comments identify atomic publication | Implementer must accept and record it. |

## 5. PR #2040: verified implementation

### 5.1 User transaction closed by the slice

The intended transaction is:

```text
Graph-draft Canvas owns model SQL
→ Preview generates the model file
→ Project Code shows graph-owned file read-only
→ an external actor changes the file
→ Preview detects divergence before any write
→ Preview stops with actionable feedback
→ external SQL remains byte-for-byte unchanged
```

That transaction is materially stronger than the current `main` behaviour.

### 5.2 Domain ownership

The branch introduces or clarifies these owners:

- `DbtGraphModelSqlPublicationPolicy`
  - owns marker serialization and total SQL publication classification;
- `DbtGraphWorkspaceArtifactPublisher`
  - owns complete preflight and sequential publication coordination;
- `CodeWorkspaceFileEditPosture`
  - owns the total editable/read-only decision from explicit authority;
- `CodeWorkspaceFileSurface`
  - owns passive editor-versus-viewer presentation;
- existing `GenerateDbtWorkspaceArtifacts`
  - remains the graph projection rail;
- existing `GetWorkspaceFileContent`
  - remains the read rail;
- existing `SaveWorkspaceFileContent`
  - remains the single-file CAS command.

No new SQL persistence rail or browser file repository is introduced.

### 5.3 Marker semantics

The marker has the form:

```text
-- dvt:graph-draft-content-sha256=<64 hexadecimal characters>
<payload>
```

Its valid semantics are:

- deterministic content identification;
- payload mismatch detection;
- safe classification of already managed content;
- no creator authentication;
- no identity proof;
- no security boundary;
- no supported historical-format contract.

### 5.4 Publication decisions

The policy currently returns:

- `create`;
- `unchanged`;
- `replace_managed`;
- `adopt_legacy_equivalent`;
- `conflict`.

The behaviour is acceptable in the current source context:

- absent file → create marked content;
- exact marked equality → unchanged;
- valid managed marker → replace with preflight CAS;
- byte-identical unmarked current graph projection → add the marker using observed CAS;
- divergent unmarked content → conflict;
- malformed or mismatched managed marker → conflict.

The name `adopt_legacy_equivalent` is poor domain language because there is no supported legacy product population. A follow-up rename such as `mark_equivalent_unmarked_projection` would make the truth clearer without changing behaviour.

### 5.5 Fowler review

| Signal | Assessment |
| --- | --- |
| Hidden authority | Improved: graph-owned and file-owned surfaces are explicit. |
| Duplicate authority | Contained: graph-owned Project Code is not writable. |
| Leaky abstraction | Acceptable: publisher depends on existing workspace query/command ports. |
| Responsibility overload | Reduced through policy/publisher/posture extraction. |
| Primitive obsession | Marker remains string-shaped but is isolated by policy functions. |
| Shotgun surgery | Moderate: 24 files and three Planning DB migrations for one vertical. Justified partly by Web, tests, evidence, and DB-first governance, but still expensive. |
| Test-only confidence | Reduced by protected Cypress proof, though direct run links belong in the handoff. |
| Stale truth | Planning DB and code align on the implemented slice; delivery report remains missing. |
| Architectural drift | No parallel command/query rail found. |
| Product dead end | Avoided: containment precedes atomic adoption and exact revision. |

## 6. CI, review, and release state

### 6.1 PR #2040 exact-head CI

All six standard workflows are successful on `6257745ed1ec91f1a1415585d24e319905966931`:

- Contracts & Determinism;
- Dependency Review;
- Test Suite;
- CI — Code Quality;
- CodeQL;
- PR Quality Gate.

This is strong build evidence, but it does not replace the missing implementation handoff.

### 6.2 Review threads

PR `#2040` has one inline thread:

- state: resolved;
- path: `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts`;
- original severity: P1;
- final disposition: DISPROVED / not applicable to supported product state.

No unresolved inline product thread remains.

### 6.3 Release

`v0.5.3` remains the current release.

The release contains the run operational truth slice, not PR `#2040`.

The final `main` squash SHA has no pull-request-triggered workflow runs directly visible through the connector. Exact-head green evidence exists on the source PR heads.

## 7. Previous findings: fixed, active, superseded, disproved

### 7.1 Fixed

#### Reconciliation edit/revert race

PR `#2030` fixed pending receipt authority when the editor diverges and returns to persisted bytes.

Do not reopen it.

#### Non-terminal materialization divergence

PR `#2035` moved non-terminal materialization sanitization into the shared run operational projection.

Do not repeat the prior list/detail finding.

#### Marker authentication overclaim

PR `#2040` closeout wording now states that the marker checks payload integrity and does not authenticate creator identity.

Do not request signing or key management in this slice.

#### Pre-marker deployed migration requirement

Disproved by product-owner decision and product phase.

DVT is pre-product and has no supported persisted pre-marker dataset to preserve.

### 7.2 Active

#### P1 — sequential multi-file publication

Current `main` writes each generated artefact independently.

PR `#2040` improves complete preflight but still loops over prepared writes.

A conflict or failure after the first successful save can leave a partial project publication.

Owner: workspace file publication / Canvas graph-draft publication.

Canonical task: `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

#### P1 — exact project revision identity

The file-save receipt is not retained as the authority for the exact whole-project analysis.

The current callback accepts `_receipt` and simply refetches the latest project projection.

A concurrent change in another file can make the returned analysis describe a different project content set.

Owner: dbt project publication and analysis revision.

#### P1 — workspace inventory truth

`LocalWorkspaceFileRepository`:

- silently stops after 500 files;
- returns no cursor;
- returns no `complete | partial` state;
- treats files larger than 1 MB as `InvalidWorkspacePathError`;
- exposes no typed `oversized` result.

The product cannot distinguish complete inventory from truncated inventory.

#### P2 — scoped `ListRuns` pagination

`ListRunsUseCase` currently:

- asks the state store for tenant plus limit;
- filters project/environment in application after the limit;
- builds a cursor from the filtered result;
- returns a cursor that `ListRunsQuery` cannot accept.

Canonical task: `E-RUNS-SCOPED-KEYSET-PAGINATION-1`.

This remains active but must not displace the current dbt authority sequence.

#### P2 — Web HTTP response validation

`createApiClient.requestJson<TResponse>` returns:

```ts
return parsedBody as TResponse;
```

The generic boundary trusts response shape without runtime schema validation.

New revision/publication/inventory endpoints must parse shared schemas from `@dvt/contracts` at the boundary.

#### P2 — crash recovery

Navigation flush and `beforeunload` warning are not durable recovery.

A browser crash, OS crash, or power loss can still lose a dirty buffer with no replay journal.

#### P2 — product-wide quality gates

Root quality orchestration remains stronger for Engine than for Web/API coverage and non-functional evidence.

Still missing or incomplete as explicit release ratchets:

- Web/API coverage thresholds;
- automated accessibility gate;
- bundle budget;
- large-graph performance budget;
- API latency/payload budget;
- fault-injection proof;
- multi-worker/concurrency proof.

#### Documentation truth

`system-delivery-status.md` presents itself as current but has an old review date. Current-state status should be generated or made explicitly historical.

### 7.3 Superseded

The repeated recommendation to split Code persistence/reconciliation solely to solve the edit/revert race is superseded by PR `#2030`.

Further refactoring may improve clarity but is not the current blocking transaction.

### 7.4 Disproved

- Supported pre-marker graph-workspace migration requirement.
- Need to preserve development fixtures as product data.
- Need for marker signatures or secrets in PR `#2040`.
- Requirement to remove byte-identical graph-projection marking as a correctness fix.

## 8. Priority 0 — delivery closeout for PR #2040

### Severity

P2 delivery/governance blocker.

It does not invalidate the implementation, but the iteration is not auditable under the agreed delivery process.

### Root cause

The implementation agent supplied a useful PR summary and command list but did not publish the complete closure report.

### Product impact

- reviewers reconstruct intent manually;
- red/green chronology is lost;
- residual risk and rollback are not explicit;
- next-agent context is weaker;
- repeated review cycles re-derive the same facts;
- work appears stalled despite green implementation evidence.

### Exact owner

Implementation-agent delivery process for PR `#2040`.

### Required correction

Add one top-level PR comment beginning exactly:

```markdown
## Iteration Handoff
```

It must include the fields listed in section 4.2.

### What must not be added

- no runtime change;
- no atomic batch change;
- no workspace inventory change;
- no signing or secrets;
- no historical migration;
- no new rail;
- no unrelated cleanup.

### Acceptance criteria

- complete handoff exists as one comment;
- all claims distinguish executed evidence from assertion;
- exact base and head are stated;
- exact workflow and live-proof links are included;
- pre-product compatibility is explicit;
- residual sequential-publication risk is explicit;
- rollback is explicit;
- next slice is atomic publication/exact revision only.

### Release gate

Do not merge before the handoff is published and reviewed.

## 9. Priority 1 — atomic publication and exact revision identity

This is the next implementation slice after PR `#2040`.

### Severity and evidence

P1 data-integrity/product-authority gap.

Evidence:

- `canvasPlanAction.ts` on `main` performs one save per artefact;
- PR `#2040` still performs final saves in a loop;
- the API already contains `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway` already provides complete preflight, multipath locking, idempotency, conflict aggregation, receipt persistence, and atomic replacement;
- the dbt project controller ignores the individual save receipt and refetches latest analysis.

### Root cause

The Web graph-draft Preview path evolved on the single-file command port even after a server-owned batch transaction was introduced for other product paths.

Publication identity and analysis identity therefore remain separate and temporally coupled.

### User/product impact

- partial project publication;
- false Preview provenance;
- Run may use a project revision different from the edit that initiated Preview;
- reopen may display newer or different bytes than the planned revision;
- recovery and audit cannot name one immutable transaction.

### Exact domain owner

`DbtProjectPublication` aggregate owned by workspace-file publication and dbt project analysis.

Do not assign atomicity to the React view or generic Code editor.

### Existing objects to reuse

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchExpectedFile`;
- `WorkspaceFileBatchWrite`;
- `WorkspaceFileBatchReceipt`;
- `WorkspaceFileBatchMutationResult`;
- `IWorkspaceFileBatchMutationPort`;
- `LocalWorkspaceFileBatchMutationGateway`;
- `ProjectDbtGraphFromFiles`;
- `DbtProjectGraphProjection`;
- `CanvasAuthoringAuthorityBinding`;
- current plan provenance structures.

### Proposed domain objects

Only introduce objects absent from the current language:

```ts
type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  workspaceBatchReceipt: WorkspaceFileBatchReceipt;
  projectContentSetSha256: string;
  analysisSha256: string;
  projectRoot: string;
  authorityKind: 'graph-draft' | 'dbt-project-files';
}>;
```

The exact shape must be reconciled with existing contracts and Planning DB before implementation. Do not duplicate existing receipt fields.

### Command/query route

Preferred transaction:

```text
PublishDbtProjectRevision command
→ server validates scope and complete expected revisions
→ applies one WorkspaceFileBatchMutation
→ analyses exactly the applied content set
→ returns one DbtProjectPublicationReceipt
→ Preview consumes that receipt
→ Run accepts only matching revision identity
```

A new public command is justified only if no existing protected command can own the complete transaction. The implementation brief must first prove that extending an existing source-import/publication command is not the correct route.

### Ports and adapters

- Web inbound port: one publication request, not N single-file saves;
- API application service: owns transaction orchestration;
- outbound mutation port: existing `IWorkspaceFileBatchMutationPort`;
- outbound analysis port: existing dbt project analyser;
- local adapter: existing atomic gateway;
- future remote adapter: same batch semantics.

### Likely files

- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.ts`;
- `apps/web/src/app/views/canvas/canvasPlanAction.ts`;
- `apps/web/src/app/ports/workspace.ts` only if a coherent publication port is missing;
- `apps/api/src/application/services/**` for publication orchestration;
- `apps/api/src/application/ports/workspaceFiles.ts` only for missing receipt identity;
- protected API route group and shared contract;
- existing batch gateway tests;
- dbt analysis use-case tests;
- protected Cypress vertical;
- Planning DB design and closeout migrations.

### Migration and compatibility

DVT is pre-product.

- no historical artefact migration;
- no compatibility negotiation for branch-only formats;
- contract may change cleanly before release;
- development workspaces may be reset;
- fail closed on unknown or incomplete state.

### Rollback posture

Before merge:

- reverting the feature commit restores sequential publication;
- no persistent schema migration should be irreversible;
- batch receipts are additive operational state;
- failed publication produces no partial target files;
- analysis failure after atomic write must have an explicit state: applied-but-analysis-failed, or compensate the batch using an equally authoritative transaction. This decision must be made in the design, not hidden in UI retry.

### Observability

Emit one structured publication signal containing:

- publication ID;
- idempotency key hash or safe correlation ID;
- scope identifiers;
- number of expected files;
- number of writes/deletes;
- conflict paths without file content;
- deduplicated flag;
- project content-set hash;
- analysis hash;
- latency by mutation and analysis stage;
- terminal outcome.

Never log SQL content, credentials, profiles, environment secrets, or raw tokens.

### Security implications

- authorize tenant/project/environment before filesystem resolution;
- validate paths server-side;
- bound number and total bytes;
- use existing allowed-file policy;
- avoid exposing absolute paths;
- do not trust browser-computed revisions as proof without server verification;
- no signing requirement for local marker containment;
- one idempotency key cannot be reused with different payload.

### PR decomposition

One vertical PR is preferable if it closes the complete transaction.

If split is unavoidable:

1. contract/application transaction with red API tests;
2. Web replacement of sequential publisher;
3. exact Preview/Run/reopen proof;
4. Planning DB closeout only after live evidence.

Do not merge an intermediate state that adds a second publication authority.

### Required red tests

1. conflict in the second file writes nothing;
2. injected failure during staging changes no target file;
3. duplicate request with same idempotency key returns deduplicated receipt;
4. same key with different request fails;
5. external edit after browser preflight is detected by server batch preflight;
6. analysis is run against the applied content set, not a later read;
7. Preview revision equals publication receipt revision;
8. Run rejects mismatching revision;
9. reopen resolves the same content-set hash;
10. logs contain correlation metadata but no SQL content;
11. unauthorised scope is rejected before mutation;
12. size/file-count limit fails before mutation.

### Green proof

- contract tests;
- API application tests;
- local gateway tests;
- HTTP route tests;
- Web unit and presentation tests;
- architecture guards;
- protected live browser flow;
- full standard CI;
- Planning DB integrity and mechanization.

### Live proof

```text
create graph model SQL
→ Preview publishes multiple artefacts atomically
→ capture publication receipt
→ inspect Project Code
→ start Run from exact receipt
→ reload browser
→ reopen Canvas/project
→ verify same projectContentSetSha256 and analysisSha256
```

A second scenario must inject a concurrent edit and prove zero writes.

### Acceptance criteria

- no sequential workspace-file loop remains in graph publication;
- one server-owned receipt names the whole publication;
- conflict is complete and typed;
- no partial target state;
- Preview, Run, and reopen use exact revision identity;
- tests and live proof operate on real API/storage/dbt paths;
- no parallel rail or duplicate aggregate;
- handoff is complete.

### Release gate

Do not release the feature without exact-head green CI, protected browser proof, Planning DB closure, rollback statement, and handoff.

## 10. Priority 2 — workspace capability truth

After exact publication identity, implement:

- paginated workspace inventory;
- opaque validated cursor;
- deterministic ordering;
- explicit `complete | partial` result;
- `oversized | not_found | unsupported | forbidden` content outcomes;
- shared effective limits exposed to Web;
- tests for 501 files, near 10,000 imported files, and >1 MB files;
- large-project performance evidence.

Do not solve this by merely raising constants.

## 11. Priority 3 — cohesive authoring recovery

After publication and inventory truth:

- durable local journal for unsaved buffers;
- scope and file revision in each journal entry;
- replay only after authority and revision validation;
- explicit discard/recover conflict UI;
- bounded storage and expiry;
- no SQL or secrets in telemetry;
- crash/reload tests;
- multi-tab conflict tests.

This may justify an authoring-session application boundary only after concrete transactions prove the required responsibilities.

Do not build a generic session framework first.

## 12. Priority 4 — product-wide quality gates

Add enforceable ratchets for:

- Web coverage;
- API coverage;
- automated accessibility;
- bundle size;
- graph rendering performance;
- API latency and payload;
- memory under large workspace inventories;
- failure injection;
- PostgreSQL and in-memory adapter conformance;
- multi-worker/concurrency;
- exact-SHA evidence.

Quality gates must prove product transactions, not only utility modules.

## 13. Comparison with mature systems

### dbt Cloud / Studio

Match:

- normal dbt files;
- clear file authority;
- integrated edit, parse, Preview/Run, and version-control posture;
- diagnostics separate from persistence.

Differentiate:

- Canvas as a governed bidirectional projection where edits are lossless;
- explicit authority binding;
- stronger transaction receipts for visual publication.

Defer:

- broad managed-SaaS collaboration and environment administration.

### Professional IDE and Git workflows

Match:

- dirty buffer is not saved file;
- saved file is not semantic freshness;
- semantic freshness is not Git commit;
- conflicts are explicit;
- revision identity is durable;
- diff and rollback are inspectable.

DVT must not collapse these states into one optimistic label.

### Airflow

Match:

- one execution uses one complete versioned bundle;
- code changes during a run do not silently redefine that run.

DVT analogue:

- `projectContentSetSha256` must remain stable from publication through Preview and Run.

### Prefect

Match:

- deployment/version identity;
- promotion and rollback after revision identity exists;
- code pinned by commit or image digest.

Defer promotion UX until exact publication receipts are reliable.

### Dagster

Match later:

- assets;
- lineage;
- checks;
- freshness;
- partitions;
- operational observability.

Do not use these as an excuse to delay authority and integrity transactions.

### Temporal

Adopt principles:

- durable IDs;
- idempotency;
- correlated results;
- explicit retries;
- recovery after failure.

Do not place a workflow engine inside the editor.

### NiFi

Use as a visual/version-state reference, not as a registry architecture template.

DVT should prefer Git and explicit publication receipts over a proprietary parallel flow registry.

## 14. Required implementation-agent handoff template

The next comment on PR `#2040` should use:

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:

### Goal

### What changed

### How it was implemented

### Why this design

### Domain ownership

### Commands and queries

### Ports and adapters

### Contracts and domain objects

### Files and migrations

### User-visible behaviour

### Red chronology

### Green evidence

### CI

### Live browser or integration proof

### Security

### Data integrity

### Observability

### Compatibility
DVT is pre-product. No support or migration is provided for unreleased development artefact shapes.

### Rollback

### Residual risks

### Deviations

### Recommended next iteration
Atomic multi-file publication and exact project-revision identity only.
```

Every evidence claim must link to the exact commit, workflow, test path, or repository artefact.

## 15. Final verdict

PR `#2040` advances the correct product priority and appears functionally sound on its exact current head.

No new code finding is introduced in this cycle because no source changed.

The only current merge blocker is delivery closeout:

`DELIVERY-HANDOFF-MISSING`.

After the handoff is published, merge may proceed subject to the existing green exact-head checks and normal review policy.

The next product branch must close atomic multi-file publication and exact project-revision identity. It must reuse the existing batch mutation authority and bind publication, analysis, Preview, Run, and reopen to one exact immutable receipt.

Do not spend the next iteration on release governance, dependency maintenance, historical compatibility, marker cryptography, generic frameworks, or another point-in-time review as product authority.
