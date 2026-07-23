---
title: DVT No-Delta SQL Authority and Delivery-Handoff Fowler Review
status: Review
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-23T08:42:00+02:00
review_type: architecture-and-governance-delta
implementation_handoff_status: DELIVERY-HANDOFF-MISSING
scope: documentation-only
---

# DVT no-delta SQL authority and delivery-handoff Fowler review

## 1. Executive decision

There is **no material repository or product delta** since the previous review cycle.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

The active functional pull request remains:

- PR: [#2040 — fix(web): Prevent graph preview from overwriting DBT model SQL](https://github.com/dunay2/dvt/pull/2040)
- base: `main@8c098d6e35ce874efae81609814d99e8e60091f7`
- head: `6257745ed1ec91f1a1415585d24e319905966931`
- commits: 1
- files: 24
- additions: 2,766
- deletions: 57
- mergeable: yes
- six standard workflows: green
- unresolved inline review threads: zero

PR #2040 continues to implement the correct immediate product priority: containing model-SQL authority so that graph Preview cannot silently overwrite a divergent Project Code edit.

The implementation is technically auditable from source, tests, Planning DB changes, CI and the protected browser flow. However, the implementation agent has still not published the required consolidated `## Iteration Handoff`.

Therefore the iteration remains:

```text
DELIVERY-HANDOFF-MISSING
```

No new runtime correction is prescribed in this cycle. Repeating speculative findings would create noise and stale authority. The only current delivery blocker is the missing auditable handoff.

After #2040 delivery closeout, the next bounded product slice remains:

```text
atomic multi-file DBT publication
+ exact project content-set identity
+ exact analysis identity
+ Preview/Run/reopen bound to that revision
```

It must reuse the existing workspace batch mutation authority rather than extend the current sequential browser publisher.

---

## 2. Authority and review method

### 2.1 Operational sources of truth

This review uses, in precedence order:

1. live repository source and exact Git object identities;
2. live Planning DB design/task/dependency records represented by merged migrations;
3. [ADR-0060 — dbt Project Authoring Authority](../../../adr/ADR-0060-dbt-project-authoring-authority.md);
4. the accepted [dbt project round-trip product plan](../../proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md);
5. current tests, CI runs, review threads and runtime evidence;
6. point-in-time review Markdown only as historical evidence, never as operational authority.

The unmerged and closed `dvt-product-priority-execution-guide-20260721.md` is not present in `main` and is not treated as authority.

### 2.2 Compatibility boundary

DVT remains pre-product unless a merged contract or explicit product-owner decision states otherwise.

This review does **not** invent preservation obligations for:

- previous local development files;
- branch-only formats;
- generated fixtures;
- unreleased marker shapes;
- disposable workspaces;
- hypothetical deployed user data.

A compatibility or migration requirement is valid only if supported by one of:

- a merged contract;
- a released compatibility guarantee;
- a deployed dataset;
- a mandatory migration policy;
- an explicit product-owner decision.

No such obligation exists for pre-marker graph SQL.

### 2.3 Execution honesty

This cycle inspected the repository through GitHub and current official product documentation.

It did **not** execute locally:

- unit tests;
- integration tests;
- Cypress;
- Planning DB migrations;
- browser flows;
- GitHub Actions jobs.

CI and repository evidence are reported as evidence produced by the implementation branch, not as execution performed by this reviewer.

---

## 3. Exact repository state

### 3.1 Current `main`

Current `main` remains the release merge:

- [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- `chore(main): Release 0.5.3 (#2037)`

The immediately preceding functional merge is:

- [`9bc344578ca3ed45d09924dba4341ba41eff9b38`](https://github.com/dunay2/dvt/commit/9bc344578ca3ed45d09924dba4341ba41eff9b38)
- `fix(api): Unify run operational truth (#2035)`

No later commit exists on `main` in the inspected repository state.

### 3.2 Open pull requests before this report

Two pull requests were open:

1. [#2040](https://github.com/dunay2/dvt/pull/2040) — functional SQL-authority containment.
2. [#2045](https://github.com/dunay2/dvt/pull/2045) — the superseded point-in-time review from the previous cycle.

No release PR is open.

No separate atomic-publication implementation branch is currently visible.

### 3.3 Release state

Current public repository release state is `0.5.3`.

No release delta occurred during this cycle.

Release activity must not displace the pending product transaction after #2040.

---

## 4. Implementation-agent handoff audit

## 4.1 Required handoff

The expected end-of-iteration report must contain:

- exact base SHA;
- exact final head SHA;
- branch and PR;
- iteration goal;
- what changed;
- how it was implemented;
- why that design was chosen;
- exact domain owner;
- commands and queries;
- ports and adapters;
- contracts and migrations;
- touched files;
- user-visible behaviour;
- tests observed first in red;
- tests passed in green;
- CI evidence on the final head;
- live browser or integration proof;
- security posture;
- data-integrity posture;
- observability posture;
- compatibility posture;
- rollback posture;
- unresolved risks;
- route deviations;
- recommended next bounded iteration.

### 4.2 Located evidence

PR #2040 contains a useful PR body describing:

- root cause;
- high-level changes;
- commands claimed as validation;
- an explicit statement that no hooks or runtime paths were bypassed.

Repository evidence additionally exposes:

- exact base/head identity;
- changed files;
- unit and architecture tests;
- a protected live Cypress flow;
- Planning DB migrations 797–799;
- six successful workflow runs;
- one resolved automated review thread;
- the pre-product compatibility disposition.

### 4.3 Missing consolidated report

There is no top-level comment or committed report headed:

```markdown
## Iteration Handoff
```

The available evidence remains distributed across:

- the PR body;
- source files;
- tests;
- migrations;
- workflow records;
- review comments;
- prior reviewer corrections.

This makes the iteration reconstructable but not cleanly handed over.

### 4.4 Handoff verdict

```text
DELIVERY-HANDOFF-MISSING
```

The code may be functionally ready, but delivery closeout is incomplete.

The agent must not begin unrelated work before leaving the consolidated report.

---

## 5. Claim-to-evidence matrix for PR #2040

| Claim | Status | Evidence | Review conclusion |
| --- | --- | --- | --- |
| Base is exact current `main` at branch creation | VERIFIED | PR metadata identifies `8c098d6e...` | Identity is explicit. |
| Final head is `6257745ed1...` | VERIFIED | PR metadata and workflow heads | No later functional commit exists. |
| Preview previously overwrote accepted Project Code SQL | VERIFIED | Root cause and changed publisher path | The old path regenerated and saved graph SQL without ownership containment. |
| Proposed graph SQL is marked deterministically | VERIFIED | `createGraphManagedDbtModelSql` uses payload SHA-256 | Marker represents exact payload integrity, not creator authentication. |
| Existing marked SQL is validated before replacement | VERIFIED | `parseValidGraphManagedSql` recomputes payload hash | Corrupt marked files fail closed. |
| Divergent unmarked SQL is preserved | VERIFIED | publication classifier returns `conflict` | No silent overwrite. |
| Byte-identical unmarked graph projection can be marked | VERIFIED | `adopt_legacy_equivalent` path | Safe inside active graph-draft authority; naming is misleading but not a correctness blocker. |
| All artifact reads occur before writes | VERIFIED | `Promise.all(preflightArtifact(...))` precedes write loop | Later reads do not redefine expected revisions. |
| Publication is atomic across all files | CONTRADICTED | final writes remain a sequential loop | A later CAS failure can leave earlier files committed. |
| Expected revisions are bound once | VERIFIED | prepared artifacts retain observed revision | This is a prerequisite for batch publication. |
| Graph-owned files are read-only in Project Code | VERIFIED | Code workbench posture changes and tests | Authority is visible in the UI. |
| File-authoritative projects remain editable | VERIFIED | authority-aware edit posture and tests | No global read-only regression is evident. |
| Protected browser flow proves external edit preservation | VERIFIED | Cypress scenario changes | Evidence path exists and is claimed executed. |
| Six standard workflows are green | VERIFIED | exact-head Actions results | CI is green on `6257745ed1...`. |
| No unresolved review thread remains | VERIFIED | review-thread state | The only thread is resolved. |
| Pre-marker compatibility is supported | DISPROVED | explicit product-owner decision | No migration requirement exists. |
| Marker authenticates the writer | DISPROVED / FIXED | migration 799 corrects wording | The marker checks payload integrity only. |
| Tests were observed first in red | NOT PROVEN | no consolidated chronology | Test existence is not tests-first evidence. |
| Rollback is documented | NOT PROVEN | missing handoff section | Revert is plausible but not recorded. |
| Residual risk is documented | PARTIAL | Planning DB retains atomic gap | The PR does not consolidate it in a handoff. |
| Next iteration is bounded | PARTIAL | reviewer and Planning DB identify atomic publication | Implementation agent has not stated it in a handoff. |

---

## 6. Functional review of PR #2040

### 6.1 Root cause

The old graph Preview path performed this transaction:

```text
read current file revision
→ regenerate graph-derived SQL
→ save graph-derived SQL using the accepted revision
```

If the user edited SQL in Project Code, that edit could become the current accepted revision and still be overwritten by graph-derived SQL.

The error was not a missing CAS check. It was a missing authority classification before using CAS.

CAS answers:

```text
Did the file change after I read it?
```

It does not answer:

```text
Does this component currently own the right to replace this content?
```

### 6.2 Implemented correction

PR #2040 introduces a publication policy for graph-owned model SQL.

The policy distinguishes:

- absent file → create managed representation;
- exact managed representation → unchanged;
- valid managed representation with changed graph payload → replace using observed CAS revision;
- malformed managed representation → conflict;
- divergent unmarked representation → conflict;
- byte-identical unmarked graph projection → add current marker using observed CAS revision.

This is a valid containment boundary because the classifier is called from the graph-draft Preview path after the graph projection and target path are already governed.

Byte equality is not the sole source of ownership. It only proves that adding the marker does not replace different SQL semantics.

### 6.3 Fowler assessment

| Signal | Before | PR #2040 response | Current status |
| --- | --- | --- | --- |
| Hidden authority | File revision was treated as overwrite permission | Explicit graph-owned SQL classifier | Improved |
| Primitive obsession | Raw SQL strings and hashes had no publication posture | Typed publication decision | Improved |
| Temporal coupling | Read-now/write-later revision could be recomputed per artifact | Preflight retains one observed revision | Improved |
| Shotgun surgery | SQL safety scattered in Preview flow | Dedicated policy and publisher | Improved, although 24-file delivery remains governance-heavy |
| Test-only confidence | No protected proof of external-edit preservation | Cypress live vertical added | Improved |
| Leaky abstraction | Project Code could present graph-owned file as normal editable file | Edit posture exposes authority | Improved |
| Stale truth | Planning DB did not own containment | Migrations 797–799 register design and gap | Improved |
| Transactional integrity | Files written one at a time | Not solved in this PR | Active P1 |

### 6.4 User/product impact

The user should no longer experience:

```text
edit SQL externally
→ click Preview
→ edited SQL silently disappears
```

Instead:

```text
edit SQL externally
→ click Preview
→ explicit conflict message
→ external bytes remain unchanged
```

Graph-owned files are visible but read-only in Project Code.

File-authoritative dbt projects remain editable.

### 6.5 Security posture

The marker is not a signature, secret or authorization boundary.

It provides:

- deterministic payload identity;
- corruption detection;
- divergence detection when payload and marker disagree.

It does not prove:

- which actor wrote the file;
- that an actor with write access did not recompute the marker;
- durable project-revision ownership.

Those stronger guarantees belong to scoped authorization, exact revision receipts and the atomic publication transaction.

No signing or secret-management feature should be added to #2040.

### 6.6 Compatibility posture

There is no deployed pre-marker product population to migrate.

The term `adopt_legacy_equivalent` is misleading because it suggests a supported legacy format.

A non-blocking naming correction would be:

```text
mark_equivalent_unmarked_projection
```

This naming change should not expand into migration logic.

---

## 7. Architecture and domain ownership

### 7.1 Current authority model

ADR-0060 establishes mutually exclusive authoring modes:

- `graph-draft`;
- `dbt-project-files`.

Graph-draft mode owns graph semantics until an explicit adoption transition succeeds.

File-backed mode owns normal dbt project files and projects Canvas from server-side dbt analysis.

The modes must not become two simultaneously editable semantic authorities.

### 7.2 Owner in #2040

The immediate owner is the Web Canvas graph-draft publication boundary.

The important existing rails remain:

- graph-draft node configuration rail;
- `SaveWorkspaceFileContent` for individual file persistence;
- `ProjectDbtGraphFromFiles` for file-backed analysis;
- existing workspace query and command ports.

No duplicate SQL save rail or browser parser was introduced.

### 7.3 Remaining exact-revision gap

The accepted dbt round-trip plan requires deterministic:

- project revision;
- analysis hash;
- graph projection.

The current single-file save receipt cannot prove that Preview and Run used one exact whole-project content set.

The next slice must close this gap through one server-owned publication receipt.

---

## 8. Web behaviour review

### 8.1 Positive evidence

- graph-owned SQL is displayed as non-editable;
- file-authoritative SQL remains editable;
- divergence feedback is localized and actionable;
- Preview performs complete preflight before the first write;
- duplicate artifact paths are rejected;
- protected browser evidence traverses Canvas, Preview, Run and Project Code.

### 8.2 Active Web risks

#### Sequential publication

`publishGraphDbtWorkspaceArtifacts` still executes:

```text
for each prepared artifact
→ saveFileContent
```

A conflict or failure after one successful write can leave a partial project.

#### Runtime response casts

The generic API client still returns:

```ts
return parsedBody as TResponse;
```

New exact-revision, inventory and publication contracts must use runtime parsers from `@dvt/contracts` at the HTTP boundary.

#### Crash recovery

The Code navigation guard:

- flushes before SPA navigation;
- warns on `beforeunload`.

It does not persist a durable local authoring journal that can restore buffers after browser or machine failure.

That remains a later cohesive-session concern, not part of #2040.

---

## 9. API and runtime review

### 9.1 Run operational truth

The #2035 work remains merged and valid:

- list and detail share operational truth projection;
- non-terminal materialization is sanitized;
- status reads are bounded to eight concurrent requests.

### 9.2 Active `ListRuns` integrity defect

`ListRunsUseCase` still:

1. asks storage for tenant-level rows with a limit;
2. filters project/environment in application memory;
3. builds `nextCursor` from the filtered subset.

This can hide authorized rows behind out-of-scope rows and incorrectly report exhaustion.

The query accepts only `limit`, although the result returns `nextCursor`.

The PostgreSQL metadata repository orders by `created_at` but does not select or hydrate `created_at` into `RunMetadata`, so cursor construction can return `null` in production.

The storage query also lacks deterministic `run_id` tie-breaking.

This remains the canonical task:

```text
E-RUNS-SCOPED-KEYSET-PAGINATION-1
```

It should not interrupt the current SQL-authority delivery closeout. Its implementation must remain narrow on the existing `ListRuns` rail.

### 9.3 Runtime maturity

The runtime has strong typed internal boundaries and explicit operational truth, but still lacks uniform end-to-end runtime validation at every Web HTTP boundary.

---

## 10. Contracts review

### 10.1 Reuse strengths

The repository already contains typed contracts for:

- authority binding;
- dbt graph projection;
- workspace file revisions;
- individual save receipts;
- batch mutation requests and receipts;
- run operational truth.

### 10.2 Missing publication aggregate

The next slice should avoid inventing disconnected primitives.

A repository-compatible publication result should compose existing concepts into one aggregate, for example:

```ts
type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  idempotencyKey: string;
  projectContentSetSha256: string;
  writes: WorkspaceFileBatchReceipt['writes'];
  analysisSha256: string;
  freshness: 'fresh';
}>;
```

The exact shape must follow Planning DB design and existing contract conventions.

The essential invariant is:

```text
one publication receipt
→ one exact project content set
→ one exact dbt analysis
```

Preview and Run must consume or reject that identity; they must not silently refetch latest state.

---

## 11. Data integrity and concurrency

### 11.1 Existing strong infrastructure

The API already owns `IWorkspaceFileBatchMutationPort` with:

- complete expected-file set;
- writes and deletes;
- idempotency key;
- complete conflict result;
- immutable receipt fields.

`LocalWorkspaceFileBatchMutationGateway` already provides:

- request hashing;
- idempotency conflict detection;
- receipt replay/deduplication;
- multi-path locking;
- complete revision preflight;
- atomic file replacement;
- persisted receipt.

### 11.2 Active gap

The Web graph publisher does not use that authority.

It performs global preflight but commits individual writes sequentially.

This is a classic transaction-script split:

```text
Web decides whole-project intent
API only receives unrelated individual commands
```

The correction is not browser rollback. The correction is one application command backed by the existing batch port.

### 11.3 Rollback posture

The atomic gateway already makes partial publication rollback unnecessary at the application level: either the replacement set applies or the transaction fails.

Rollback after a successfully applied publication should be a new explicit publication using expected revisions, not filesystem mutation behind the receipt.

---

## 12. Workspace capability truth

`LocalWorkspaceFileRepository` currently:

- stops listing after 500 accepted files;
- returns no cursor;
- exposes no `complete | partial` flag;
- silently omits remaining entries;
- rejects files larger than 1 MB using `InvalidWorkspacePathError`.

This conflates:

- invalid path;
- unsupported size;
- incomplete inventory.

The import path supports materially larger project intake than the interactive workspace path can represent.

The later capability-truth slice should introduce:

- paginated or continuation-based inventory;
- explicit completeness state;
- typed `oversized` result;
- consistent policy shared across import, Explorer, Code and analysis;
- tests above 500 files and above 1 MB.

It should not merely increase constants.

---

## 13. Tests and evidence

### 13.1 PR #2040 test posture

The branch adds or changes:

- publication-policy unit tests;
- publisher tests;
- plan-action authority tests;
- Code workbench edit-posture tests;
- architecture tests;
- protected live Cypress proof;
- Planning DB mechanization.

Six workflow lanes are successful on the exact head.

### 13.2 Remaining evidence limitation

The implementation agent has not distinguished:

- tests that were observed failing before implementation;
- tests added after implementation;
- commands executed locally;
- evidence inferred from CI;
- proof generated by the protected live environment.

This is why the handoff remains mandatory.

### 13.3 Test-only confidence risks outside #2040

The following continue to need stronger product gates:

- Web coverage ratchet;
- API coverage ratchet;
- accessibility automation;
- bundle-size budget;
- large-graph performance;
- workspace inventory scale;
- multi-worker concurrency;
- injected transaction failures;
- exact-main release evidence.

---

## 14. Governance and Planning DB

### 14.1 Positive posture

PR #2040 records:

- components;
- responsibilities;
- relations;
- tests;
- evidence;
- the remaining atomic-publication gap.

The marker security wording was corrected to payload integrity rather than origin authentication.

### 14.2 Governance amplification risk

A 24-file, 2,766-addition delivery for a focused Web authority correction remains expensive.

Much of the expansion is tests and Planning DB evidence rather than runtime complexity, but the repository should monitor whether every narrow correction requires multiple migration layers and repeated status prose.

The design authority is valuable only if it reduces ambiguity. It becomes harmful if agents optimize for closing metadata rather than closing user transactions.

### 14.3 No parallel current-state authority

Point-in-time review PRs must continue to be closed when superseded rather than merged as repeated current-state documents.

Planning DB and accepted architecture sources remain the operational authority.

---

## 15. Operability, observability and recovery

### 15.1 Current strengths

- exact-head CI is available for the functional PR;
- the live browser flow exercises protected API, workspace, dbt and run paths;
- batch receipts already support idempotency diagnosis;
- operational run truth is normalized.

### 15.2 Active gaps

- no durable authoring recovery journal;
- no complete publication receipt binding Preview and Run;
- no explicit workspace-inventory completeness telemetry;
- no root performance budget for large graphs;
- no standard exact-main post-merge workflow evidence visible through the connector;
- current status documents can age while presenting themselves as current.

### 15.3 Required next-slice observability

Atomic publication should emit or record:

- publication ID;
- idempotency key;
- exact workspace scope;
- expected path count;
- applied path count;
- conflict path count;
- project content-set hash;
- analysis hash;
- duration;
- deduplicated/replayed status;
- terminal result;
- correlation to Preview and Run.

Logs must not include project SQL bodies, credentials or secrets.

---

## 16. Accessibility and performance

### 16.1 Accessibility

PR #2040 changes editability and conflict presentation.

The acceptance proof should preserve:

- focusable navigation to the affected file;
- clear read-only semantics;
- conflict feedback not encoded only by colour;
- localized screen-readable message;
- no keyboard trap in Project Code or Canvas.

No new accessibility regression is proven in this cycle, but no repository-wide accessibility gate is visible either.

### 16.2 Performance

The new preflight reads all generated artifacts concurrently using `Promise.all`.

For the current small graph-draft projection this is reasonable, but the eventual server command should enforce:

- maximum file count;
- maximum aggregate bytes;
- bounded analysis time;
- bounded error payload;
- stable hashing cost;
- cancellation or timeout posture.

The existing batch gateway already has bounded file and byte limits.

---

## 17. Security review

### 17.1 Positive controls

- workspace access remains scoped;
- CAS rejects stale writes;
- malformed marker content fails closed;
- divergent SQL is preserved;
- graph-owned files are not offered as ordinary editable files;
- no browser-side dbt parser is introduced;
- no signing secret is introduced.

### 17.2 Residual risks

- an actor with legitimate write access to both payload and marker can recompute the marker;
- generic Web response casts can accept malformed server payloads;
- oversized files are misclassified rather than represented explicitly;
- exact whole-project identity is not yet enforced across Preview and Run;
- observability must avoid SQL-body logging.

None of these requires expanding #2040.

---

## 18. Previous finding disposition

### 18.1 Fixed

- PR #2030 edit/revert pending-receipt reconciliation race.
- PR #2035 non-terminal materialization divergence between run list and detail.
- release-candidate integrity defects previously addressed by release-governance work.
- release `0.5.3` publication.
- marker wording that overstated SHA-256 as creator authentication.
- silent graph Preview overwrite containment, subject to #2040 merge.

### 18.2 Active

- missing #2040 iteration handoff.
- sequential graph artifact writes.
- exact project content-set and analysis identity.
- scoped keyset pagination for `ListRuns`.
- workspace inventory completeness and oversized-file semantics.
- generic Web HTTP response casts.
- durable authoring recovery.
- Web/API/non-functional quality ratchets.
- stale or manually maintained current-status documents.

### 18.3 Superseded

- the former recommendation to begin with the #2030 reconciliation state split.
- repeated point-in-time priority guides as operational authority.
- the earlier instruction to remove byte-identical unmarked projection marking as a functional blocker.

### 18.4 Disproved

- a requirement to migrate deployed pre-marker graph SQL.
- a requirement to preserve disposable development artifact versions.
- a claim that an unkeyed SHA-256 marker authenticates its creator.
- a need to add signing or secrets to #2040.

---

## 19. Deviations and corrective instructions

## 19.1 Blocking correction: delivery handoff

### What is wrong

The implementation agent has not consolidated the final iteration evidence.

### Why it matters

Without a handoff:

- future agents reconstruct intent from scattered sources;
- claims and executed evidence are mixed;
- residual risks disappear into comments;
- the next iteration can repeat or broaden work;
- rollback and observability posture remain implicit.

### Owner

Implementation agent / PR #2040 delivery owner.

### Required correction

Publish one top-level PR comment headed:

```markdown
## Iteration Handoff
```

Use the template in section 23.

### What must not be introduced

- no additional runtime feature;
- no compatibility migration;
- no atomic-publication code in #2040;
- no new rail;
- no signing system;
- no generic authoring framework.

### Acceptance criteria

- every required field is present;
- exact links or repository paths are included;
- claims are separated from executed evidence;
- final head identity matches CI;
- residual atomicity risk is explicit;
- next iteration is bounded to atomic publication and exact revision.

## 19.2 Non-blocking follow-up: truthful naming

Rename `adopt_legacy_equivalent` to language that describes current behaviour without implying supported legacy data, such as:

```text
mark_equivalent_unmarked_projection
```

This can be done in #2040 if it remains a tiny rename across source, tests and unmerged migrations, or deferred as a narrow truth cleanup.

It must not become a migration feature.

---

## 20. Next implementation slice: atomic publication and exact revision

## 20.1 Severity and evidence

**Severity: P1 data-integrity and reproducibility gap.**

Evidence:

- PR #2040 preflights all artifacts;
- final publication still uses individual `saveFileContent` calls in a loop;
- `IWorkspaceFileBatchMutationPort` already exists;
- the local gateway already provides atomic replacement and receipts;
- Planning DB assigns the remaining gap to `E-WEB-DBT-ATOMIC-PUBLICATION-1`.

## 20.2 Root cause

Whole-project intent is owned in Web, but the command boundary remains file-shaped.

This leaks transaction ownership into the browser and allows partial publication.

## 20.3 User impact

A late conflict or infrastructure failure can leave:

- some generated files updated;
- others stale;
- Preview based on an ambiguous project state;
- Run detached from the intended revision;
- reopen showing a mixture that was never one accepted project.

## 20.4 Exact domain owner

Proposed owner:

```text
DBT Project Publication
```

The API application service should own the transaction.

Web should own the proposal and user interaction, not the filesystem commit algorithm.

## 20.5 Proposed domain objects

Reuse:

- `WorkspaceFileBatchMutation`;
- `WorkspaceFileBatchReceipt`;
- `WorkspaceStorageScope`;
- dbt project projection and analysis hash contracts.

Add only the minimum aggregate needed to bind publication and analysis, for example:

```ts
type PublishDbtProjectArtifactsCommand = Readonly<{
  expectedFiles: readonly WorkspaceFileBatchExpectedFile[];
  writes: readonly WorkspaceFileBatchWrite[];
  deletes: readonly string[];
  idempotencyKey: string;
}>;

type DbtProjectPublicationReceipt = Readonly<{
  publicationId: string;
  workspaceReceipt: WorkspaceFileBatchReceipt;
  projectContentSetSha256: string;
  analysisSha256: string;
}>;
```

Do not finalize names outside the approved Planning DB design.

## 20.6 Command/query and port changes

### Command

Add or expose one protected command on the existing workspace mutation authority:

```text
PublishDbtProjectArtifacts
```

It must delegate to `IWorkspaceFileBatchMutationPort`.

### Query

Reuse:

```text
ProjectDbtGraphFromFiles
```

The command should return or obtain analysis bound to the resulting content set. It must not call a generic latest-state query and present it as the committed revision.

### Ports

Reuse:

- `IWorkspaceFileBatchMutationPort`;
- `IDbtProjectAnalyzerPort` or the accepted analysis boundary;
- existing scope authorization.

Do not add another storage repository.

## 20.7 Likely implementation surfaces

API:

- `apps/api/src/application/ports/workspaceFiles.ts`
- a focused application service under `apps/api/src/application/services/`
- existing protected runtime route registration
- `LocalWorkspaceFileBatchMutationGateway`
- dbt project analyzer service/adapter

Contracts:

- existing workspace batch contracts
- existing dbt projection contracts
- one publication receipt schema if required

Web:

- `dbtGraphWorkspaceArtifactPublisher.ts`
- `canvasPlanAction.ts`
- Web port/plugin for the protected publication command
- Preview/Run provenance projection

Tests:

- contract tests
- API application tests
- gateway failure-injection tests
- route tests
- Web plan-action tests
- protected Cypress vertical

Planning DB:

- claim and refine `E-WEB-DBT-ATOMIC-PUBLICATION-1`
- register only actual new components/rails/contracts
- retain one source of task truth

## 20.8 Migration and compatibility strategy

DVT is pre-product.

No historical publication-receipt migration is required.

The Web path can switch directly from sequential publication to the protected atomic command.

Individual file save remains valid for normal Project Code editing; it is not removed.

Only graph-generated multi-file publication changes command shape.

## 20.9 Rollback posture

Before merge:

- rollback is commit revert because no persisted compatibility guarantee exists.

At runtime:

- transaction failure leaves all target files unchanged;
- idempotent retry returns the same receipt when postconditions match;
- retry with a reused key and different request fails;
- a successful publication is reversed only by another revision-guarded publication.

## 20.10 Observability

Record:

- publication ID;
- scope identity without secrets;
- idempotency key hash if raw key is sensitive;
- request hash;
- expected/write/delete counts;
- conflict paths without file content;
- deduplication status;
- content-set hash;
- analysis hash;
- duration;
- outcome;
- Preview/Run correlation.

## 20.11 Security implications

- authorize the workspace scope before mutation;
- validate all paths server-side;
- enforce file and aggregate byte limits;
- do not log SQL bodies;
- do not accept browser-provided absolute paths;
- fail closed on malformed receipt or contract;
- parse HTTP responses at runtime in Web;
- do not execute arbitrary project code beyond the existing constrained dbt analysis boundary.

## 20.12 PR decomposition

Keep this vertical in one functional PR if it closes the transaction end to end:

1. approved Planning DB design and red tests;
2. publication command and API service;
3. reuse batch port/gateway;
4. exact content-set calculation;
5. exact analysis binding;
6. Web command adapter;
7. replace sequential loop;
8. Preview and Run provenance binding;
9. integration and live proof;
10. final handoff.

Do not mix:

- workspace pagination;
- ListRuns pagination;
- authoring recovery;
- accessibility framework work;
- release governance;
- dependency upgrades.

## 20.13 Red tests

Minimum red suite:

1. second-file CAS conflict leaves every file unchanged;
2. injected replacement failure leaves every file unchanged;
3. repeated identical idempotency key returns deduplicated receipt;
4. changed request with same key fails;
5. receipt lists every resulting content hash;
6. content-set hash is deterministic regardless of input ordering;
7. analysis hash belongs to the resulting content set;
8. Preview refuses a different content-set identity;
9. Run refuses or explicitly re-previews a different identity;
10. reopen projects exactly the published revision;
11. malformed server receipt fails Web runtime parsing;
12. SQL content never appears in logs.

## 20.14 Green proof

- all red tests pass;
- existing graph Preview and file-authoritative editing tests pass;
- workspace batch conformance passes;
- Planning DB integrity passes;
- Web/API architecture guards pass;
- six standard workflows pass on final head.

## 20.15 Live browser/integration proof

```text
create graph-draft project
→ configure model SQL
→ Preview
→ one atomic publication receipt
→ inspect project files
→ Run using same content-set and analysis hashes
→ reload application
→ reopen project
→ same files, graph and provenance
```

Negative live proof:

```text
introduce concurrent file change before commit
→ publication conflicts
→ zero target files changed
→ Preview not created
→ Run not started
→ actionable conflict shown
```

## 20.16 Acceptance criteria

- no sequential graph artifact publication remains;
- no partial project state is observable after failure;
- one receipt binds all writes;
- one content-set hash binds the whole project;
- one analysis hash binds semantic projection;
- Preview records both identities;
- Run uses or validates both identities;
- reopen displays the same revision;
- no duplicate command rail is created;
- final handoff is complete.

## 20.17 Release gates

- final exact-head CI green;
- no unresolved blocking review thread;
- protected live positive and negative proofs current;
- Planning DB design/evidence current on final head;
- runtime contracts parsed in Web;
- no release PR until the functional merge is stable;
- release notes describe the user transaction, not internal migration count.

---

## 21. Priority sequence after atomic publication

1. **Workspace capability truth**
   - paginated inventory;
   - complete/partial state;
   - typed oversized result;
   - shared limits.

2. **Cohesive authoring recovery**
   - durable draft journal;
   - exact accepted revision;
   - conflict recovery;
   - restart restoration.

3. **Product-wide quality gates**
   - Web/API coverage ratchets;
   - accessibility;
   - bundle budget;
   - large-graph performance;
   - injected failure testing;
   - exact-main evidence.

4. **Later differentiation**
   - asset and lineage enrichment;
   - checks and freshness;
   - revision promotion and rollback;
   - collaboration;
   - advanced orchestration views.

---

## 22. Mature-system comparison

### 22.1 dbt Studio — match

The dbt Studio IDE is documented as one interface for building, testing, running and version-controlling normal dbt projects:

- https://docs.getdbt.com/

DVT should match:

- normal dbt files as durable authority in file-backed mode;
- integrated build/test/run workflow;
- visible diagnostics and lineage;
- version-control compatibility.

DVT should differ by keeping Canvas as a first-class visual authoring surface with explicit lossless/code-only capability boundaries.

### 22.2 Professional IDE and Git — match

DVT should preserve distinct states for:

- editor buffer;
- persisted file;
- semantic diagnostics;
- project revision;
- Preview;
- Run;
- Git history.

It should not collapse those states into a single "synchronized" concept.

### 22.3 Airflow DAG Bundles — match exact revision

Airflow documents versioned DAG bundles so a run can use one specific bundle version for the whole run, even when code changes during execution:

- https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html

DVT should match that reproducibility with `projectContentSetSha256` and `analysisSha256`.

DVT should not copy Airflow's Python-DAG execution model into authoring.

### 22.4 Prefect deployment versions — defer promotion UI

Prefect Cloud documents deployment version history, rollback/promotion and exact Git commit checkout:

- https://docs.prefect.io/v3/how-to-guides/deployments/versioning

DVT should first establish exact publication identity. Promotion, rollback UI and revision history come later.

### 22.5 Dagster — defer asset enrichment

Dagster positions assets, lineage, observability, declarative modelling and testability as core capabilities:

- https://docs.dagster.io/

DVT should use this as a later product benchmark after authority and revision integrity are complete.

### 22.6 Temporal — match durable identity principles

Temporal documents crash-proof execution that resumes after infrastructure failure:

- https://docs.temporal.io/

DVT should adopt durable IDs, idempotent commands, receipts and recovery principles. It should not insert a workflow engine into the editor state machine.

### 22.7 NiFi — match visible local/version state, use Git

NiFi's Registry documentation describes versioned flows and visible local modification/revert behaviour, but NiFi Registry was deprecated in February 2026 in favour of Git-based Flow Registry clients:

- https://nifi.apache.org/projects/registry/

DVT should use Git-compatible revision history rather than create another proprietary registry.

---

## 23. Mandatory implementation-agent handoff template

The implementation agent must publish the following before #2040 merge:

```markdown
## Iteration Handoff

### Identity
- Task/design:
- Base SHA:
- Final head SHA:
- Branch:
- PR:

### Goal
- User transaction:
- Problem closed:
- Explicit out of scope:

### What changed
- Runtime behaviour:
- User-visible behaviour:
- Data or contract behaviour:

### How it was implemented
- Domain owner:
- Commands/queries reused or added:
- Ports:
- Adapters:
- Contracts:
- Planning DB migrations:
- Files/components:

### Why this design
- Alternatives rejected:
- Duplicate semantics avoided:
- Architecture guards respected:

### Red/green chronology
- Red test and observed failure:
- Implementation step:
- Green command and result:

### Executed evidence
- Local commands:
- CI links on final head:
- Live browser/integration proof:
- Planning DB evidence:

### Security and integrity
- Authorization:
- Concurrency/CAS:
- Data integrity:
- Sensitive logging:
- Marker limitation:

### Operability
- Observability:
- Failure posture:
- Rollback:
- Compatibility/pre-product decision:

### Remaining risk
- Known limitations:
- Deferred task IDs:

### Deviations
- Approved-route deviation:
- Reason:
- Disposition:

### Next iteration
- Exact bounded transaction:
- Must reuse:
- Must not include:
```

A claim without a command result, workflow link, test path or runtime proof must be labelled as a claim rather than executed evidence.

---

## 24. Current cycle report requirements for the next reviewer

The next review cycle must begin by checking:

1. whether #2040 head changed;
2. whether `## Iteration Handoff` exists;
3. whether the six workflows belong to the final head;
4. whether review threads remain resolved;
5. whether #2040 merged;
6. whether atomic-publication work began on a new branch;
7. whether that branch reuses the batch mutation authority;
8. whether any release/governance/dependency work displaced the product route.

If nothing changed, the reviewer must say so plainly and must not manufacture another correction.

---

## 25. Final verdict

The repository is stable but delivery is stalled at closeout rather than implementation.

PR #2040 provides a credible and well-tested correction to model-SQL authority containment:

- no silent divergent SQL overwrite;
- explicit authority-aware edit posture;
- complete preflight;
- bound CAS revisions;
- protected live proof;
- green CI;
- resolved review thread.

No source-backed functional blocker is currently identified.

The missing `## Iteration Handoff` is the only remaining delivery blocker.

After the handoff and merge, the implementation agent must move directly to the existing atomic multi-file publication and exact project-revision vertical.

Do not open another release, governance expansion, compatibility migration, dependency programme or generic authoring framework before that user transaction is closed.
