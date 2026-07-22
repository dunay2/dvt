---
title: DVT no-delta SQL authority and delivery handoff Fowler review
status: Review
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-22T20:40:00+02:00
scope: architecture-and-governance
---

# DVT no-delta SQL authority and delivery handoff Fowler review

## 1. Executive verdict

There is **no material repository delta** since the previous cycle.

- `main` remains exactly at [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7), the `0.5.3` release commit.
- The active functional pull request remains [#2040](https://github.com/dunay2/dvt/pull/2040) at exact head [`6257745ed1ec91f1a1415585d24e319905966931`](https://github.com/dunay2/dvt/commit/6257745ed1ec91f1a1415585d24e319905966931).
- #2040 remains one commit, 24 changed files, 2,766 additions, and 57 deletions.
- Its six standard GitHub workflows are green on that exact head.
- Its sole inline review thread is resolved and correctly classified as a disproved compatibility requirement.
- The implementation agent has still not published the required complete iteration handoff.

The current delivery state is therefore:

```text
product direction: correct
implementation scope: materially useful
CI: green on the exact PR head
review threads: no unresolved inline thread
iteration handoff: DELIVERY-HANDOFF-MISSING
remaining branch deviation: heuristic unmarked-file auto-adoption
merge recommendation: do not merge yet
```

The next action is not another architecture expansion. It is one bounded closeout pass on #2040:

1. remove `adopt_legacy_equivalent` and its tests/Planning DB claims;
2. treat every existing unmarked SQL file as an explicit conflict;
3. preserve the corrected payload-integrity terminology;
4. publish the complete `## Iteration Handoff`;
5. rerun exact-head tests, live proof, and CI.

After #2040 closes, the next product slice is the already-governed atomic multi-file publication and exact project-revision transaction.

---

## 2. Exact repository snapshot

### 2.1 Main

| Field | Value |
| --- | --- |
| Branch | `main` |
| Exact SHA | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| Commit | `chore(main): Release 0.5.3 (#2037)` |
| Current release | `0.5.3` |
| New commit since previous review | No |
| Connector-visible workflows directly attached to merge SHA | None |

The absence of connector-visible runs on the squash/merge SHA is an evidence-location limitation. The relevant product evidence is attached to the pull-request head, not to the final merge SHA.

### 2.2 Open pull requests

| PR | Type | Head | State | Decision |
| --- | --- | --- | --- | --- |
| [#2040](https://github.com/dunay2/dvt/pull/2040) | Functional Web/dbt authority slice | `6257745ed1ec91f1a1415585d24e319905966931` | Open, ready, mergeable | Needs bounded correction and handoff |
| [#2042](https://github.com/dunay2/dvt/pull/2042) | Previous documentation-only review | `061ced8478017fe68d912e61bdaf0ca5967116a0` | Draft, mergeable | Superseded by this cycle report |

No other open functional pull request or release pull request was visible in the repository search.

### 2.3 Release state

- `0.5.3` is the current release in `main`.
- No new release candidate is open.
- Opening another maintenance release before closing #2040 would displace the active product transaction without a product reason.

### 2.4 Relevant branch work

The only current functional branch visible through an open pull request is:

```text
fix/dbt-model-sql-authority-containment
```

No evidence of another concurrent implementation slice was found. This is desirable: the repository should finish one authority transaction before starting atomic publication.

---

## 3. Implementation iteration handoff

## DELIVERY-HANDOFF-MISSING

No complete report headed `## Iteration Handoff` exists for #2040.

The pull-request body is useful but insufficient. It identifies root cause, high-level changes, and commands, but it does not satisfy the delivery contract required for an auditable iteration.

### 3.1 Required fields still missing

- exact base SHA stated as iteration input;
- exact final head SHA stated as completed output;
- one bounded iteration goal expressed as a user transaction;
- complete list of what changed;
- explanation of how each relevant part was implemented;
- explanation of why the chosen design was preferred;
- exact DDD/application owners;
- complete command/query rail inventory;
- complete ports and adapters inventory;
- complete contracts and migrations inventory;
- touched files grouped by owned concern;
- explicit user-visible behavior before and after;
- tests observed failing before implementation;
- tests passing after implementation;
- direct links to exact-head CI runs;
- direct path and execution result for the protected live browser proof;
- security and threat-boundary statement;
- data-integrity statement;
- observability statement;
- compatibility statement acknowledging the pre-product decision;
- rollback posture;
- residual risks;
- deviations from the approved route;
- next bounded iteration.

### 3.2 Audit consequence

The source and CI allow substantial reconstruction of the work, but the implementation agent has not closed the iteration as a single auditable delivery unit.

This does **not** mean the code is untested or valueless. It means the delivery claim is incomplete and must not be treated as final until the handoff exists.

---

## 4. Claim-to-evidence matrix for PR #2040

| Claim | Evidence inspected | Status | Review conclusion |
| --- | --- | --- | --- |
| The PR starts from current `main` | PR metadata: base SHA `8c098d6e...` | VERIFIED | Exact base is clear |
| The final head is `6257745ed1...` | PR metadata and workflow runs | VERIFIED | No newer implementation commit exists |
| Preview could overwrite Project Code SQL | Previous main used per-file current revision immediately before generated write | VERIFIED | Root cause is concrete |
| Graph-managed SQL is marked deterministically | `createGraphManagedDbtModelSql` with SHA-256 payload marker | VERIFIED | Deterministic containment exists |
| Marker validates exact payload integrity | `parseValidGraphManagedSql` recomputes payload SHA | VERIFIED | Integrity mismatch fails closed |
| Marker authenticates writer or ownership | Migration 799 explicitly says it does not | DISPROVED | Correctly not a security boundary |
| All artifacts are read before the first write | `Promise.all` preflight in publisher | VERIFIED | Known divergence blocks all writes |
| CAS revisions are bound during preflight | Prepared artifact retains observed revision | VERIFIED | Later reads do not redefine expected revision |
| Publication is atomic | Publisher still loops over single-file writes | CONTRADICTED | Partial publication remains possible |
| External divergent SQL is preserved | Unit policy plus protected Cypress replacement/rejected Preview/read-back | VERIFIED | Key user safety transaction is proven |
| Graph-owned Project Code is read-only | Edit posture plus passive viewer and Cypress proof | VERIFIED | UI prevents normal browser edit path |
| File-authoritative projects remain editable | `dbt-project-files` authority resolves editable posture | VERIFIED | Modes remain distinct |
| Unknown unmarked files fail closed | Divergent unmarked files do; byte-identical unmarked files are auto-adopted | PARTIAL | Heuristic adoption violates stated policy |
| Legacy migration is required | No supported deployed artifact population or preservation contract exists | DISPROVED | Do not add compatibility machinery |
| Live proof executes real protected runtime | Cypress declares no API stubs and exercises file replacement/read-back | VERIFIED | Direct run link is still missing from handoff |
| Tests were written and observed red first | No red chronology or failing run evidence | NOT PROVEN | Add to handoff |
| Rollback is understood | Not stated | NOT PROVEN | Add explicit revert/no-data-migration posture |
| Security posture is complete | Marker limitation partly documented; broader boundary absent from handoff | PARTIAL | Explain same-principal rewrite limitation |
| Observability posture is complete | Typed conflict path exists; Planning DB marks pure subparts N/A | PARTIAL | Handoff must identify actual user/audit signals |
| Planning DB matches runtime | It still names `adopt-legacy-equivalent` | CONTRADICTED | Reconcile before closeout |
| Next iteration is bounded | PR body does not state full next slice | NOT PROVEN | Handoff must name atomic publication only |

---

## 5. Material delta since previous cycle

There is no code, PR-head, CI, review-thread, or handoff delta.

### Unchanged facts

- `main` SHA is unchanged.
- #2040 head SHA is unchanged.
- #2040 remains one implementation commit.
- Six standard workflows remain green.
- The Codex compatibility thread remains resolved.
- No complete iteration handoff was added.
- `adopt_legacy_equivalent` remains in runtime.
- Its unit test remains in the branch.
- Planning DB still records the transition and proof.
- Atomic publication remains explicitly planned rather than implemented.

This cycle therefore introduces no new product finding. It revalidates the existing route and avoids fabricating novelty.

---

## 6. Previous finding disposition

### 6.1 Fixed

#### F-1 — Code edit/revert reconciliation receipt race

Status: **FIXED** by #2030.

Do not reopen it. The result is correlated to the pending save receipt and an older reconciliation result no longer erases newer persistence state.

#### F-2 — Run list/detail terminal-materialization contradiction

Status: **FIXED** by #2035.

The sanitizer now lives in the shared operational truth projection. The former P2 review thread is resolved.

#### F-3 — Marker described as creator authentication

Status: **FIXED in #2040 branch**.

Migration 799 replaces the earlier overclaim with truthful language:

```text
self-verifies exact payload integrity by SHA-256;
it is not creator authentication
```

Do not introduce signatures, secrets, MACs, or key management in this slice.

#### F-4 — Compatibility migration for pre-marker graph artifacts

Status: **DISPROVED / OUT OF SCOPE**.

DVT is pre-product and has no cited supported deployed population, release guarantee, or artifact-preservation contract that predates this policy.

### 6.2 Active

#### A-1 — Heuristic ownership acquisition from unmarked SQL

Status: **ACTIVE in #2040**.

Runtime returns:

```ts
kind: 'adopt_legacy_equivalent'
```

when an existing unmarked file is byte-identical to the proposed graph payload.

This is not required compatibility. It is implicit authority acquisition from an unknown representation.

#### A-2 — Multi-file publication remains non-atomic

Status: **ACTIVE, explicitly assigned to `E-WEB-DBT-ATOMIC-PUBLICATION-1`**.

The new publisher preflights all files but still performs sequential single-file saves.

#### A-3 — Save receipt is not bound to exact project revision

Status: **ACTIVE**.

The file-backed Canvas reconciliation callback ignores `_receipt` and refetches the latest graph projection. A concurrent unrelated file change can change the project content-set between save and analysis.

#### A-4 — Workspace inventory truth is incomplete

Status: **ACTIVE**.

The local workspace adapter silently stops at 500 files and returns no cursor or `complete | partial` state. Oversized files are represented as invalid paths.

#### A-5 — Generic Web API responses are trusted through casts

Status: **ACTIVE for new or critical endpoints**.

`requestJson` returns `parsedBody as TResponse` without runtime schema validation.

#### A-6 — Browser navigation protection is not durable recovery

Status: **ACTIVE**.

SPA transitions attempt a flush and `beforeunload` warns. A browser or machine crash has no durable buffer journal to restore.

#### A-7 — Root coverage ratchet is Engine-only

Status: **ACTIVE**.

`ci:full` invokes `test:coverage:engine`; no equivalent explicit root Web/API coverage ratchet is present.

#### A-8 — `ListRuns` pagination is incomplete

Status: **ACTIVE P2, queued behind current dbt authority work**.

The store applies tenant+limit before project/environment filtering, and the response emits a cursor that the query cannot accept.

### 6.3 Superseded

The former recommendation to refactor Code state as the immediate next product slice is superseded by the receipt-race fix and the live Planning DB order.

The current order remains:

1. model SQL authority;
2. atomic project publication and exact revision identity;
3. workspace capability truth;
4. cohesive authoring recovery;
5. product-wide quality gates;
6. later differentiation.

---

## 7. Fowler review of PR #2040

## 7.1 What the PR gets right

### Explicit authority containment

The PR stops treating a latest read revision as permission to overwrite content. That is the correct response to hidden authority.

### Separated policy

`DbtGraphModelSqlPublicationPolicy` is a pure classifier. It does not perform I/O.

### Application-level publisher

`DbtGraphWorkspaceArtifactPublisher` owns preflight and write sequencing instead of leaving the route action to interleave reads and writes.

### Passive UI surface

`CodeWorkspaceFileSurface` renders one editor or viewer based on an explicit posture. It does not infer authority itself.

### Fail-closed divergence

Malformed marked content and divergent unmarked content produce conflict, not overwrite.

### Protected live evidence

The Cypress flow exercises:

```text
Canvas node SQL authoring
→ Preview
→ Run
→ Project Code read-only
→ external working-tree edit
→ rejected Preview
→ byte-for-byte external SQL preservation
```

That is a real user transaction, not only a unit test.

## 7.2 Remaining design smell: primitive ownership marker

The marker is a useful containment device, but it must not become the durable source of authority.

```text
comment marker + hash
```

is still a primitive representation. The actual authority comes from:

- active `graph-draft` binding;
- graph-owned path identity;
- exact workspace revisions;
- later atomic publication receipt and project content-set identity.

The marker should remain a local divergence check, not evolve into an artifact registry or security token.

## 7.3 Remaining responsibility overload: browser publisher

The publisher is an appropriate intermediate application service, but the final atomic transaction belongs on the server-owned workspace batch rail.

Do not keep expanding the browser publisher until it becomes a transaction engine.

Its final responsibility after the next slice should be approximately:

```text
construct typed publication request
→ call atomic publication command
→ project success/conflict result for Canvas
```

## 7.4 Test-only confidence risk

The live Cypress test is strong, but the handoff does not link an executed run artifact or exact run URL. CI being green proves the standard workflows, not necessarily that the protected environment branch executed rather than skipped.

The handoff must state:

- whether live environment variables were present;
- exact command execution result;
- exact workflow/job/run link if CI executes it;
- whether the test was skipped anywhere.

---

## 8. Blocking correction for PR #2040

### C-1 — Remove unmarked-file auto-adoption

#### Severity

P1 delivery correctness within the active authority slice.

#### What is wrong

The policy treats an unmarked file as graph-owned when its payload is byte-identical to the current graph SQL.

#### Source evidence

- `dbtGraphModelSqlPublicationPolicy.ts` returns `adopt_legacy_equivalent`.
- `dbtGraphModelSqlPublicationPolicy.test.ts` requires that transition.
- Planning DB responsibility, transition, and evidence name legacy-equivalent adoption.

#### Why it matters

Ownership is inferred from coincidental byte equality rather than from the active authority binding and an explicit recognized representation.

This creates a hidden transition:

```text
unknown external file
→ inferred graph ownership
→ silent rewrite with managed marker
```

#### Exact owner

`DbtGraphModelSqlPublicationPolicy` under the graph-draft workspace publication boundary.

#### Correct implementation

Use this total policy:

```text
current file absent
→ create managed SQL with expected absent revision

current file exactly equals proposed managed SQL
→ unchanged

current file contains a valid managed marker
→ replace_managed using the observed CAS revision

current file contains malformed or mismatched marker
→ conflict

current file exists without managed marker
→ conflict, regardless of byte equality
```

#### What must not be introduced

- legacy migration;
- historical artifact detection;
- marker version negotiation;
- matching against previous graph projections;
- support for disposable development fixtures;
- a second metadata store;
- a new command/query rail.

#### Likely files

- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts`
- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts`
- `tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql`
- `tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql`
- `tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql`

#### Red tests

1. Existing unmarked file whose bytes equal the proposed payload returns `conflict`.
2. Publisher performs zero writes when that conflict exists.
3. Existing unmarked divergent file remains byte-identical after rejected Preview.
4. Valid marked replacement remains accepted.
5. File-authoritative projects remain editable.

#### Green proof

- policy unit tests;
- publisher unit tests;
- Canvas plan-action integration tests;
- Code posture and presentation tests;
- architecture tests;
- protected live Cypress flow;
- Planning DB migrations/integrity/mechanization;
- `pnpm verify:prepush`;
- six standard workflows on the new exact head.

#### Rollback

Revert the #2040 commit before merge. No deployed-data or migration rollback is required because DVT is pre-product and the migrations exist only on the unmerged branch.

#### Observability

Keep the typed conflict path and localized user message. The conflict path must identify the exact preserved file. Do not add duplicate telemetry in pure policy helpers.

#### Security

The marker detects mismatch; it does not authenticate origin. An actor able to rewrite both marker and payload is outside this containment proof. Exact durable identity belongs to atomic publication.

#### Acceptance criteria

- no `adopt_legacy_equivalent` symbol remains;
- no legacy-equivalent wording remains in Planning DB;
- every existing unmarked SQL file conflicts;
- rejected Preview performs zero writes;
- file bytes remain unchanged;
- all exact-head evidence is green;
- complete iteration handoff is published.

---

## 9. Delivery correction: mandatory iteration handoff

The implementation agent must publish one top-level PR comment with this structure before merge:

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB task/design:

### Goal
- User transaction closed:
- Explicitly out of scope:

### What changed
...

### How it was implemented
...

### Why this design
...

### Ownership and architecture
- Domain owner:
- Components:
- Commands/queries:
- Ports:
- Adapters:
- Contracts:
- Migrations:
- Files:

### User-visible behavior
...

### Red/green chronology
- Initial failing test and observed failure:
- Final passing tests:

### Executed evidence
- Exact-head CI links:
- Live browser/integration command:
- Live result/link:
- Any skipped tests:

### Security and data integrity
...

### Observability
...

### Compatibility
- DVT is pre-product.
- No pre-marker artifact compatibility is promised.
- Unknown unmarked files fail closed.

### Rollback
...

### Residual risks
...

### Deviations
...

### Recommended next iteration
- Atomic multi-file publication and exact project-revision identity only.
```

Claims must be separated from executed evidence.

---

## 10. Next implementation slice: atomic project publication and exact revision identity

This slice begins only after #2040 is corrected and merged.

### 10.1 User transaction

```text
Canvas graph proposes a complete dbt project change
→ all expected revisions are validated together
→ all files are published atomically
→ one immutable receipt identifies every written hash
→ server analyzes exactly that project content-set
→ Preview references that exact analysis
→ Run references that exact Preview/project revision
→ reopen displays the same authoritative revision
```

### 10.2 Severity

P1 data integrity and execution provenance.

### 10.3 Root cause

The browser currently preflights all artifacts but writes them one by one. A later CAS conflict can occur after earlier files have already changed.

Separately, file reconciliation ignores the save receipt and fetches whichever project graph is latest at the time of the query.

### 10.4 Exact owners

- Workspace Project Publication: application transaction owner.
- Project Workspace I/O: atomic batch adapter owner.
- dbt Project Analysis: exact content-set analysis owner.
- Canvas Execution Preview: provenance consumer.
- Run application service: exact Preview/project-revision consumer.

### 10.5 Existing semantics to reuse

#### Domain objects

- `WorkspaceFileBatchMutation`
- `WorkspaceFileBatchReceipt`
- `WorkspaceFileBatchMutationResult`
- `WorkspaceFileSaveReceipt`
- existing project content-set and analysis hashes from `DbtProjectGraphProjection`

#### Port

- `IWorkspaceFileBatchMutationPort`

#### Adapter

- `LocalWorkspaceFileBatchMutationGateway`

#### Query

- `ProjectDbtGraphFromFiles`

#### Existing guarantees

- complete expected-file revisions;
- multi-path exclusive lock;
- idempotency key;
- request hash;
- conflict list;
- atomic file replacement;
- persisted receipt;
- deduplicated retry.

### 10.6 Proposed command contract

Do not invent another storage model. Promote the existing batch capability through the protected workspace command boundary.

A repository-compatible application result should carry:

```ts
type PublishDbtProjectArtifactsResult =
  | {
      kind: 'published';
      receipt: WorkspaceFileBatchReceipt;
      projectContentSetSha256: string;
      analysisSha256: string;
    }
  | {
      kind: 'conflict';
      conflicts: readonly {
        path: string;
        currentContentSha256: string | null;
      }[];
    }
  | {
      kind: 'analysis_failed';
      publicationReceipt: WorkspaceFileBatchReceipt;
      diagnostics: readonly DbtDiagnostic[];
    };
```

The exact type names must be reconciled with current contracts and Planning DB before implementation. Do not duplicate an existing published contract if one already owns these semantics.

### 10.7 Command/query changes

- Extend the existing workspace batch mutation command into the protected API boundary.
- Publish the complete artifact set in one call.
- Analyze the resulting exact content-set server-side.
- Bind the returned content-set and analysis identity into Preview provenance.
- Require Start Run to consume the persisted Preview identity.

Do not:

- expose batch semantics as multiple browser calls;
- call `ProjectDbtGraphFromFiles` twice and claim atomicity;
- recompute project identity from a later filesystem read;
- create `SaveDbtProjectFiles` as a duplicate rail unless Planning DB explicitly promotes that canonical intent;
- create a second receipt store.

### 10.8 Red tests

1. Conflict on the second file leaves every file unchanged.
2. Injected replacement failure restores every original file and receipt state.
3. Same idempotency key plus same request deduplicates safely.
4. Same idempotency key plus different request fails closed.
5. Receipt lists exact hashes for every write.
6. Analysis content-set equals the publication content-set.
7. Concurrent unrelated file mutation cannot be mislabeled as the published analysis.
8. Preview rejects analysis for a different content-set.
9. Run rejects or cannot start from a superseded Preview.
10. Reopen projects the exact published revision.
11. Unknown or divergent graph-managed SQL remains conflict.
12. Protected live browser flow proves publish → Preview → Run → reopen identity.

### 10.9 Acceptance criteria

- zero sequential single-file publication calls for graph-derived multi-file artifacts;
- one server-owned batch receipt;
- all-or-nothing file mutation;
- exact `projectContentSetSha256` and `analysisSha256` returned together;
- Preview records them;
- Run consumes them;
- conflict and analysis failure are distinguishable;
- no hidden fallback to a latest projection;
- rollback and retry proven;
- security scope checked once at protected boundary;
- exact-head CI and live proof green;
- complete handoff published.

### 10.10 Rollback posture

The feature should be revertable as one vertical. Existing single-file APIs remain available for single-file Code edits, but the graph multi-file publisher must not silently fall back to them after the atomic path is enabled.

### 10.11 Observability

Record one correlation identity across:

```text
publication request
→ batch receipt
→ content-set analysis
→ Preview
→ Run
```

Log paths and hashes, never SQL content, credentials, profiles, or environment secrets.

### 10.12 Security

- authorize tenant/project/environment at the server boundary;
- validate every path against workspace scope;
- bound file count and byte size;
- avoid logging SQL payloads;
- keep dbt parse isolated and bounded;
- fail closed on unknown receipt or analysis identity;
- do not trust browser-generated hashes as authority.

---

## 11. Later prioritized slices

## 11.1 Workspace capability truth

Current local repository behavior:

- maximum 500 listed files;
- no cursor;
- no `complete | partial` state;
- traversal silently stops;
- maximum file size 1 MB;
- oversized file reported as invalid path.

Required route:

- typed paginated inventory;
- deterministic cursor;
- explicit completeness state;
- explicit `oversized`, `not_found`, `unsupported`, and path-policy results;
- shared limits between import, analyzer, Explorer, Code, and publication;
- >500-file and oversized-file integration proof.

## 11.2 Cohesive authoring recovery

Current behavior protects normal navigation but not crash recovery.

Required route after revision identity exists:

- durable local buffer journal keyed by workspace, path, and base revision;
- explicit recovered/superseded/conflict states;
- no automatic overwrite of newer server content;
- recovery proof after forced browser termination.

## 11.3 Product-wide quality gates

Required later:

- Web coverage ratchet;
- API coverage ratchet;
- accessibility checks for Canvas and Code transactions;
- bundle budget;
- graph-size performance budget;
- API payload and latency budget;
- failure-injection suite;
- exact-main evidence aggregation;
- generated current product-status view.

## 11.4 ListRuns pagination correction

This is a valid active P2 but must not displace the current dbt authority transaction.

Required later:

- apply project/environment scope before limit in the store;
- stable `(createdAt, runId)` keyset order;
- typed/opaque validated cursor input;
- same conformance vectors for PostgreSQL and in-memory adapters;
- multi-page mixed-scope live proof.

---

## 12. Honest comparison with mature systems

## 12.1 dbt Studio — Match

DVT should match the separation between normal dbt files, editing, parse/build diagnostics, execution, and version-control workflow.

DVT should not invent a parallel user-facing language or hide the actual dbt project.

## 12.2 Professional IDE and Git — Match

DVT should maintain distinct concepts for:

- editor buffer;
- persisted working tree;
- semantic diagnostics;
- project revision;
- Preview;
- Run;
- Git staging/commit/push.

A marker or `synchronized` label must not compress those concepts into one state.

## 12.3 Airflow DAG Bundles — Match revision pinning

Airflow binds a run to a complete bundle version. DVT should similarly pin Preview and Run to one exact project content-set rather than to a latest read.

## 12.4 Prefect — Defer promotion and rollback UX

Prefect provides deployment version history, promotion, rollback, and commit/image pinning. DVT should first establish exact revision identity, then later expose revision history and promotion.

## 12.5 Dagster — Defer richer asset semantics

Dagster's assets, lineage, checks, freshness, and partitions are useful differentiation targets. They are not prerequisites for fixing authority and transaction integrity.

## 12.6 Temporal — Match durable identity, not product shape

DVT should reuse Temporal principles of durable correlation, idempotency, and recovery. It should not place a workflow engine inside the editor or use Temporal as a substitute for atomic filesystem publication.

## 12.7 NiFi — Differentiate through Git-native files

Versioned visual flow ideas are useful, but DVT should not create a proprietary registry parallel to Git. NiFi Registry itself is deprecated in favor of Git-based registry clients.

---

## 13. Release gates

### PR #2040 gate

Do not merge until:

- `adopt_legacy_equivalent` is removed;
- Planning DB no longer claims legacy adoption;
- unmarked identical content conflicts;
- zero-write behavior is tested;
- live external edit remains preserved;
- full handoff exists;
- exact-head six-workflow CI is green.

### Atomic publication gate

Do not merge until:

- complete batch rollback proof exists;
- exact receipt/content-set/analysis correlation exists;
- Preview and Run consume exact identities;
- no sequential fallback exists;
- security and observability boundaries are documented;
- protected live transaction passes;
- Planning DB and code agree;
- complete handoff exists.

### Release gate

Do not cut another release merely because maintenance commits accumulate. Release after a coherent user transaction is integrated and exact-head evidence is complete.

---

## 14. Final instruction to the implementation agent

Finish #2040; do not broaden it.

```text
remove heuristic auto-adoption
→ reconcile tests and Planning DB
→ prove zero writes on every unmarked file
→ publish complete handoff
→ rerun exact-head evidence
→ merge only after review
```

Then start one separate vertical:

```text
atomic project publication
→ exact project revision
→ exact analysis
→ Preview identity
→ Run identity
→ reopen identity
```

Do not start workspace pagination, recovery, new release governance, asset semantics, collaboration, or another framework until that transaction is complete.

---

## 15. Review limitations

This review inspected repository state through the GitHub integration. It did not execute the repository locally and does not claim local Planning DB, browser, or runtime execution.

CI and command claims are accepted only where exact GitHub workflow evidence or repository source supports them. The missing implementation handoff remains missing regardless of green CI.
