---
title: DVT No-Delta Handoff and Run Pagination Fowler Review
status: Review
owner: Architecture / Governance / Delivery
reviewed_repository: dunay2/dvt
reviewed_ref: main
reviewed_commit: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-22T08:41:00+02:00
planning_type: point-in-time-review
supersedes_review_pr: 2038
---

# DVT no-delta handoff and run pagination Fowler review

## 1. Executive verdict

There is **no material repository delta** since the previous review.

The exact reviewed `main` remains:

```text
8c098d6e35ce874efae81609814d99e8e60091f7
chore(main): Release 0.5.3 (#2037)
```

Release `0.5.3` remains the latest integrated product state. The operational-run
truth correction delivered by PR #2035 is still present, and its prior
non-terminal materialization review finding remains fixed.

The latest implementation iteration still has no acceptable end-of-iteration
handoff.

```text
DELIVERY-HANDOFF-MISSING
```

The principal active correction is unchanged, but this cycle strengthens its
evidence materially:

> `ListRuns` does not merely calculate an unreliable cursor after filtering. In
> the PostgreSQL production adapter, listed `RunMetadata` does not hydrate
> `createdAt` at all. The application cursor builder therefore returns `null`
> even for a full page, while project and environment filtering still happens
> after the tenant-wide database limit.

This is a P2 operational-integrity defect. It can hide authorized runs, falsely
claim page exhaustion, and makes the advertised `nextCursor` unusable. It is not
a cross-tenant disclosure because the application still removes out-of-scope
rows, but the current result is incomplete and semantically false.

The required order is:

1. close the bounded `ListRuns` scoped keyset-pagination defect on the existing
   query rail;
2. leave the complete `## Iteration Handoff` on the implementation PR;
3. return immediately to the canonical dbt product sequence:
   model SQL authority, atomic project publication and exact revision identity,
   workspace capability truth, cohesive recovery, non-functional gates, then
   later product differentiation.

No new runtime rail, route, state store, DSL, browser-side over-read loop, or
parallel pagination abstraction is justified.

## 2. Evidence boundary and confidence

### 2.1 Inspected repository evidence

This review inspected the exact current source and metadata for:

- recent `main` commits;
- all visible open pull requests;
- workflow runs on the relevant PR and release heads;
- unresolved and recently resolved review threads;
- `ListRuns` API application code and contracts;
- the engine run-state read port;
- PostgreSQL and in-memory run-state read adapters;
- focused `ListRuns` tests;
- Planning DB migrations for run operational truth;
- ADR-0060 and the accepted dbt round-trip plan;
- Canvas dbt artifact publication;
- workspace batch mutation authority;
- workspace inventory and file-size limits;
- generic Web HTTP response decoding;
- Code navigation/recovery behavior;
- root quality scripts and current-status documentation.

### 2.2 Execution limitation

No local checkout, running Planning DB, browser session, PostgreSQL integration
stack, or test command was executed by this review. Existing CI and committed
runtime evidence are inspected evidence, not execution performed by this
reviewer.

The current Planning DB migration and generated authority sources were inspected
at the exact main SHA. A fresh live database query was not available through the
GitHub connector, so live task-state execution is **NOT PROVEN** in this cycle.
The implementation agent must run the canonical Planning DB query/claim and
integrity commands before changing code.

## 3. Repository snapshot

### 3.1 Main and release

| Item | State |
| --- | --- |
| Exact main | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| Latest release | `0.5.3` |
| Latest product merge | PR #2035, run operational truth |
| Main workflow evidence | no PR-triggered runs exposed on the squash SHA |
| PR #2035 final head | six standard workflows successful |
| PR #2037 release head | six standard workflows successful |

The lack of connector-visible workflow runs on the squash SHA is an evidence
identity limitation. It does not invalidate the green PR and release heads, but
it means this review does not claim that the exact squash SHA independently ran
the six standard lanes.

### 3.2 Open pull requests before this review

Only one pull request was open before this cycle created its report:

- PR #2038 — documentation-only prior Fowler review, draft, mergeable.

There was no open functional implementation pull request and no visible active
functional branch matching the current correction.

### 3.3 Review-thread state

- PR #2038: no inline review threads.
- PR #2035: its P2 materialization thread is resolved and not outdated.
- PR #2030: receipt-correlation defect remains fixed; it is not reopened.
- No current unresolved inline product review thread was found.

A resolved review thread is not a substitute for the missing implementation
handoff.

## 4. Implementation handoff audit

### 4.1 Result

```text
DELIVERY-HANDOFF-MISSING
```

The latest implementation iteration is PR #2035. Its body and thread replies
allow much of the implementation to be reconstructed, but no single report
meets the required end-of-iteration contract.

### 4.2 Missing mandatory fields

The implementation agent still has not provided one authoritative handoff that
contains all of the following:

- explicit `## Iteration Handoff` heading;
- exact base SHA and final head SHA in one closeout report;
- branch and pull request links;
- bounded iteration goal;
- what changed;
- how it was implemented;
- why that design was selected;
- exact domain owner;
- complete commands/queries, ports, adapters, contracts, migrations, and files;
- user-visible behavior;
- observed red tests before implementation;
- green tests and exact-head CI links;
- linked live browser/integration evidence;
- security posture;
- data-integrity posture;
- observability posture;
- compatibility posture;
- rollback posture;
- unresolved risks;
- route deviations;
- one bounded next iteration.

The retrospective handoff requested on PR #2035 has not appeared.

### 4.3 Claim-to-evidence matrix for PR #2035

| Claim | Status | Evidence / reason |
| --- | --- | --- |
| Exact base, branch, PR, final head can be identified | VERIFIED | GitHub PR and commit metadata |
| List and detail share `RunOperationalTruthDto` projection | VERIFIED | current API ports and projector consumers |
| Non-terminal materialization is removed centrally | VERIFIED | resolved review thread and final source/tests |
| Canonical status reads are bounded to eight | VERIFIED | `RUN_STATUS_READ_CONCURRENCY` and focused test |
| Six standard CI lanes passed on final PR head | VERIFIED | exact-head workflow runs |
| Release `0.5.3` contains the corrected implementation | VERIFIED | main and release PR history |
| Exact red-test chronology | NOT PROVEN | no handoff record of observed failure before patch |
| Live browser proof link and exact result | PARTIAL | mechanization names a Cypress command; no complete handoff evidence |
| Full owner/rail/port/adapter inventory | PARTIAL | reconstructable across migrations and code, not delivered as one closeout |
| Security analysis | PARTIAL | scope filtering exists; closeout does not state threat analysis |
| Compatibility and rollback | NOT PROVEN | absent from final handoff |
| Remaining risks and route deviation | NOT PROVEN | absent from final handoff |
| `ListRuns` is a complete usable paginated query | CONTRADICTED | query cannot consume cursor; production rows omit `createdAt`; scope filtered after limit |

## 5. Material delta since the previous review

There is no source-code or product delta.

The only material review delta is stronger evidence for the already identified
`ListRuns` pagination defect:

1. `ListRunsUseCase` requests tenant-wide metadata with `limit` only.
2. Project/environment filtering occurs after the limited read.
3. `ListRunsQuery` cannot accept a cursor.
4. `IRunStateStoreRead.ListRunsOptions` cannot express project, environment, or
   cursor.
5. PostgreSQL orders by `created_at` but omits `created_at` from the selected and
   hydrated metadata shape.
6. `buildNextCursor` refuses to emit a cursor when `RunMetadata.createdAt` is
   absent.
7. Equal creation timestamps have no `run_id` tiebreaker.
8. The in-memory adapter has different ordering semantics and no cursor.
9. Focused tests do not exercise multi-page, mixed-scope, production-adapter, or
   equal-timestamp behavior.

No new independent defect is invented in this cycle.

## 6. Finding disposition

| Finding | Disposition | Current evidence |
| --- | --- | --- |
| PR #2030 edit/revert reconciliation receipt race | FIXED | receipt-correlated outcome reduction shipped |
| PR #2035 non-terminal materialization divergence | FIXED | shared sanitizer and tests shipped in `0.5.3` |
| `ListRuns` scoped pagination and cursor truth | ACTIVE P2 | post-limit filtering, dead public cursor, missing Postgres `createdAt` |
| Model SQL authority across graph and file-backed modes | ACTIVE P1 | authority transition not yet closed end to end |
| Sequential graph-first dbt artifact writes | ACTIVE P1 | Canvas loops over single-file saves |
| Exact project revision binding | ACTIVE P1 | save receipt ignored by Canvas reconciliation callback |
| Workspace inventory/size truth | ACTIVE P1 | 500-file silent truncation and 1 MB path error vs larger import policy |
| Generic Web runtime response validation | ACTIVE P2 | generic `as TResponse` cast remains |
| Crash recovery for authoring buffers | ACTIVE P2 | navigation flush/warning exists; durable journal absent |
| Product-wide a11y/performance/coverage gates | ACTIVE P2 | root full gate has explicit Engine coverage only |
| `system-delivery-status.md` current-status claim | ACTIVE stale truth | marked active/current, reviewed 2026-04-26 |
| Reopen Code reconciliation as next product slice | SUPERSEDED | #2030 is fixed; do not reopen |
| Treat an unmerged priority guide as authority | DISPROVED | operational authority remains Planning DB + accepted ADR/plan |

## 7. Blocking correction: scoped keyset pagination for `ListRuns`

### 7.1 Severity and user impact

**Severity: P2 — operational data completeness and navigation integrity.**

A user can receive an empty or short page and `nextCursor: null` even while more
authorized runs exist. The Runs view can therefore state, implicitly, that no
more executions exist when the store has not proved exhaustion.

The defect is especially direct in PostgreSQL: `created_at` is used for ordering
but not hydrated into `RunMetadata`; the application cursor builder therefore
cannot create a cursor for production list results.

### 7.2 Concrete failure examples

#### Mixed-scope limit

```text
tenant has 26 newest runs
first 25 belong to another project/environment
26th belongs to the authorized scope
store applies LIMIT 25 under tenant only
application removes 25 rows
response = []
nextCursor = null
```

#### Full production page

```text
PostgreSQL returns 25 authorized rows
selected metadata shape omits created_at
last.createdAt = undefined
buildNextCursor(...) = null
```

#### Equal timestamps

```text
run A and run B have equal created_at
ORDER BY created_at DESC has no stable run_id tie-breaker
page boundary can duplicate or omit a run across requests
```

### 7.3 Root cause

The `ListRuns` query contract, storage read port, adapters, and application
projection do not share one page-boundary model.

Responsibilities are split incorrectly:

- storage owns tenant ordering and limit;
- application owns project/environment filtering;
- application invents a cursor from a field the production adapter does not
  hydrate;
- public result exposes continuation while public input cannot consume it.

This is a leaky abstraction and primitive obsession around an untyped colon
string.

### 7.4 Exact domain owners

| Concern | Owner |
| --- | --- |
| Existing product query | `ListRuns` / Runs read model |
| Scoped page semantics | API application Runs read model |
| Run list cursor value | engine read-contract vocabulary or existing shared run query contract owner |
| Storage-side keyset filtering | `IRunStateStoreRead` and each adapter implementation |
| PostgreSQL SQL and hydration | `PostgresRunMetadataRepository` |
| In-memory parity | `InMemoryRunStateReadSupport` |
| Protected HTTP decoding | existing runs route/query adapter |
| Operator presentation | existing Web runs query/view; no pagination policy ownership |

### 7.5 Proposed domain objects and contracts

Use typed additive objects on the existing rail:

```ts
type RunListCursorV1 = Readonly<{
  version: 1;
  createdAt: IsoUtcString;
  runId: string;
}>;

type ListRunsOptions = Readonly<{
  tenantId: string;
  projectId?: string;
  environmentId?: string;
  status?: RunStatus;
  cursor?: RunListCursorV1;
  limit?: number;
}>;
```

The public HTTP cursor should be opaque and versioned. Encode the validated
value as base64url JSON or reuse an existing repository cursor codec. Do not use
an unstructured `${createdAt}:${runId}` protocol: ISO timestamps themselves
contain colons, and hand-written splitting would create another primitive
contract.

A store result may use one of these repository-compatible shapes:

```ts
type RunMetadataPage = Readonly<{
  items: readonly RunMetadata[];
  hasMore: boolean;
}>;
```

or keep `listRuns` returning `limit + 1` rows and let one application owner form
the result. Choose one owner, document it in Planning DB, and do not duplicate
`hasMore` calculation across adapters and application.

### 7.6 Command/query and port changes

- Extend **existing** `ListRunsQuery` with optional `cursor`.
- Extend **existing** `ListRunsOptions` with project, environment, and cursor.
- Keep `ListRuns` as the only query rail.
- Do not create `ListScopedRuns`, `ListRunsPage`, or another HTTP route.
- Do not put a store-overread loop in Web.
- Keep application scope checking as a defensive assertion, not a filter that
  changes the page shape after storage has declared the boundary.

### 7.7 PostgreSQL adapter route

The PostgreSQL query must:

1. select and hydrate `created_at`;
2. apply tenant, optional project, optional environment, optional status, and
   optional cursor predicates before the limit;
3. order by `created_at DESC, run_id DESC`;
4. request `limit + 1` rows to prove whether another page exists;
5. return only `limit` rows to the caller;
6. parameterize every predicate;
7. preserve tenant context/RLS behavior.

Canonical keyset predicate for descending order:

```sql
AND (
  created_at < $cursor_created_at
  OR (created_at = $cursor_created_at AND run_id < $cursor_run_id)
)
ORDER BY created_at DESC, run_id DESC
LIMIT $limit_plus_one
```

The exact comparison direction must match the repository's run-id collation and
be proven by integration tests.

### 7.8 In-memory adapter route

The in-memory implementation must apply the same semantics:

- tenant filter;
- optional project/environment/status filters;
- deterministic `(createdAt DESC, runId DESC)` ordering;
- cursor predicate;
- `limit + 1` page proof.

Runs without `createdAt` require an explicit compatibility decision. The
preferred route is to enforce persisted `createdAt` for new metadata and define
a deterministic legacy fallback, not to silently drop legacy runs.

### 7.9 Likely files/components

At minimum inspect and likely update:

- `apps/api/src/application/ports/runtime.ts`
- `apps/api/src/application/services/listRunsUseCase.ts`
- runs HTTP query decoder/route registration
- `apps/api/test/application/services/listRunsUseCase.test.ts`
- runs route integration tests
- `packages/@dvt/engine/src/ports/IRunStateStore.ts`
- `packages/@dvt/engine/src/state/InMemoryRunStateCore.ts`
- `packages/@dvt/engine/src/state/InMemoryRunStateReadSupport.ts`
- `packages/@dvt/adapter-postgres/src/types.ts`
- `packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts`
- `packages/@dvt/adapter-postgres/src/PostgresRunStateStoreAdapter.ts`
- engine and PostgreSQL adapter tests
- existing Web runs query/view only where continuation is actually consumed
- one new Planning DB design/gap/closeout migration or an existing canonical
  task extension discovered through live DB query.

Do not mark `RunOperationalReadModel` projection invalid. That shared projection
is fixed. The new/updated task must own `ListRuns` page completeness and storage
query semantics specifically.

### 7.10 Migration and compatibility

- Public cursor input is optional: existing first-page clients remain valid.
- Port additions require coordinated updates to all adapters in one PR.
- No persisted data migration is required merely to select `created_at`, because
  the column already exists and is used for ordering.
- Legacy rows with missing or unexpected creation data need an explicit tested
  policy.
- Cursor encoding must be versioned so future fields can be added without
  accepting ambiguous strings.

### 7.11 Rollback

Rollback is a code revert:

- no schema mutation is needed for the minimum correction;
- first-page calls remain backward compatible;
- remove cursor consumption and revert port/adapters together;
- do not leave one adapter on new semantics while another uses the old contract.

### 7.12 Observability

Add or reuse bounded structured signals:

- `list_runs.page_size`;
- `list_runs.has_more`;
- `list_runs.cursor_rejected` with reason code;
- `list_runs.scope_mismatch` for defensive invariant failure;
- storage query duration and status-read duration separately;
- number of canonical status reads per page.

Do not log raw bearer tokens, full cursor payloads, SQL, connection secrets, or
unbounded identifiers. Follow the repository's existing request/scope context.

### 7.13 Security implications

- Validate cursor length, version, timestamp, and run id before store access.
- Reject malformed/tampered cursor with a stable client error.
- Keep tenant predicate and tenant context mandatory.
- Apply project/environment predicates before limit.
- Use parameterized SQL only.
- Fail closed if an adapter returns metadata outside authorized scope.
- Do not disclose the existence or cursor position of out-of-scope runs.

### 7.14 Red tests

The implementation PR must show these failing before the fix:

1. PostgreSQL list hydration includes `createdAt`.
2. A full authorized page emits a non-null cursor.
3. Rows from another project before the limit cannot hide an authorized row.
4. Rows from another environment cannot hide an authorized row.
5. Equal timestamps use `runId` as a stable tie-breaker.
6. Page two has no duplicate from page one.
7. Consecutive pages omit no scoped row.
8. Invalid cursor fails before state-store access.
9. Unsupported cursor version fails deterministically.
10. Status + scope + cursor compose in PostgreSQL.
11. In-memory and PostgreSQL adapters pass the same conformance vectors.
12. Defensive application scope assertion fails closed.
13. `limit` minimum/maximum boundaries remain enforced.
14. First-page callers without cursor remain compatible.

### 7.15 Green and live proof

Required green evidence:

- engine read-port and in-memory tests;
- PostgreSQL adapter unit/integration tests;
- API application and HTTP route tests;
- contract/typecheck/lint;
- Planning DB migration, mechanization, integrity, and governance checks;
- a protected integration or browser proof with mixed project/environment runs
  and at least two pages;
- six standard workflows green on the final exact head.

### 7.16 Acceptance criteria

The correction is complete only when:

- the store applies every authorized scope predicate before limit;
- production list metadata contains `createdAt`;
- order is deterministic across equal timestamps;
- the public query accepts the cursor it returns;
- `nextCursor` is null only after scoped exhaustion is proven;
- adapters share conformance behavior;
- no out-of-scope metadata reaches status reads or response projection;
- no new query rail exists;
- Planning DB status and evidence reference the final head behavior;
- the full implementation handoff is posted.

### 7.17 Release gate

Do not publish another release containing this correction until:

- all red vectors are green;
- the protected multi-page proof is linked;
- all review threads are resolved on the final head;
- the exact final head has six successful standard workflow runs;
- the implementation handoff is complete;
- Planning DB integrity passes and does not declare broader run behavior closed
  than the tests actually prove.

## 8. Follow-up findings after the blocking correction

### 8.1 P1 — model SQL authority

ADR-0060 accepts mutually exclusive `graph-draft` and `dbt-project-files`
authorities. File-backed projects must never be silently regenerated from a
shadow graph. Project revision and analysis hashes are provenance, not another
authority.

The next dbt vertical after the bounded run-list correction remains:

```text
create SQL G1 in Canvas
-> materialize the dbt file
-> adopt file authority explicitly
-> edit the file to F2 in Project Code
-> reopen Canvas
-> Preview
-> Run
-> reload
-> F2 remains authoritative
```

### 8.2 P1 — sequential artifact publication

Graph-first Preview still writes dbt artifacts one by one. A conflict after the
first write can leave a partially published project.

The repository already has the correct lower-level authority:

- expected revisions for all paths;
- idempotency key and request hash;
- multipath locking;
- complete conflict preflight;
- atomic replacement;
- persistent batch receipt.

Once SQL authority is correct, Canvas should reuse that batch boundary rather
than introduce another transaction model.

### 8.3 P1 — exact project revision binding

The file-backed Canvas reconciliation callback receives a
`WorkspaceFileSaveReceipt` but ignores it and refetches the latest project graph.
It therefore does not prove that the returned `projectContentSetSha256` and
`analysisSha256` correspond to the exact save/publication revision being
presented.

Required chain:

```text
publication/save receipt
-> exact project content set
-> exact dbt analysis
-> persisted Preview
-> Run
-> reopen
```

### 8.4 P1 — workspace capability truth

The interactive workspace adapter:

- silently truncates after 500 files;
- returns no cursor or `complete | partial` state;
- limits a file to 1 MB;
- maps an oversized file to `InvalidWorkspacePathError`.

The dbt import inspector accepts up to 10,000 project files and 50 MB. A project
can therefore be accepted yet be only partially visible/editable in Explorer and
Code.

This must be corrected after exact publication identity, not by merely raising
limits. The product needs paginated inventory and typed `oversized`,
`not_found`, and `unsupported` results.

### 8.5 P2 — generic Web HTTP response cast

The generic API client returns parsed JSON through `as TResponse`. Endpoint
adapters that already decode schemas are safer, but future pagination,
publication, and inventory responses must parse shared runtime schemas at the
HTTP boundary rather than rely on a TypeScript assertion.

### 8.6 P2 — authoring crash recovery

Code navigation flushes before SPA transitions and warns on `beforeunload`.
That protects ordinary navigation; it does not restore an unpersisted buffer
after a browser process crash, operating-system failure, or abrupt power loss.
A durable journal belongs to the later cohesive authoring-session slice.

### 8.7 P2 — non-functional evidence imbalance

The root `ci:full` command runs documentation checks, code checks, and explicit
Engine coverage. Web and API tests exist, as do selected Cypress lanes, but no
root-level equivalent ratchet is visible for:

- Web/API coverage;
- accessibility;
- bundle budget;
- large-graph performance;
- API payload/latency budgets;
- injected storage/analysis failures.

### 8.8 Stale current-status document

`docs/architecture/system-delivery-status.md` is titled `Current Status`, marked
`Active`, and states that it is the current repository snapshot, while its
review date remains 2026-04-26. This is stale truth. It should become generated
from Planning DB/current evidence or stop claiming current status.

## 9. Cross-system comparison: Match / Differentiate / Defer

### 9.1 dbt Studio — MATCH

Official dbt documentation describes Studio IDE as one web interface for
building, testing, running, and version-controlling dbt projects.

Reference: https://docs.getdbt.com/

DVT should match the separation and visibility of file edits, diagnostics,
project revision, execution, and version-control state. DVT should differentiate
through bidirectional graph projection and governed lossless visual operations,
not through a new language or hidden file regeneration.

### 9.2 Professional IDE and Git — MATCH

VS Code distinguishes modified changes, staged changes, commits, diffs, branch
history, conflicts, and accessible diff review.

References:

- https://code.visualstudio.com/docs/sourcecontrol/staging-commits
- https://code.visualstudio.com/docs/sourcecontrol/branches-worktrees

DVT should match the explicit states and conflict evidence. It should not label
byte persistence, semantic analysis, Git commit, and remote synchronization as a
single synchronized state.

### 9.3 Airflow — MATCH revision pinning

Airflow DAG Bundles version all files required by a DAG and allow a run to use
one specific bundle version for the whole run. Git bundles record the commit
used by the run.

Reference:
https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html

DVT should match this by binding Preview and Run to one exact project content set
and analysis identity. DVT should differ by making graph/file authoring
transitions explicit and losslessness-governed.

### 9.4 Prefect — DEFER promotion/rollback UI, MATCH exact versions

Prefect deployment versions support history, rollback/promotion, Git commit
pinning, and image-digest pinning.

Reference: https://docs.prefect.io/v3/how-to-guides/deployments/versioning

DVT should first close exact project revision identity. Revision promotion and
rollback UI are later capabilities, not a reason to delay authority and
atomicity.

### 9.5 Dagster — DEFER asset differentiation

Dagster presents integrated lineage, observability, a declarative programming
model, and strong testability.

Reference: https://docs.dagster.io/

Asset checks, freshness, partitions, and richer lineage should guide later
product differentiation. They do not precede correct SQL authority, atomic
publication, or truthful workspace capabilities.

### 9.6 Temporal — MATCH durable identities and recovery principles

Temporal documents crash-proof execution that resumes from durable state after
process, network, or infrastructure failure.

Reference: https://docs.temporal.io/

DVT should match durable receipts, idempotency, exact correlation, and recoverable
long-running operations. It should not introduce a workflow engine into the
editor merely to solve local state ownership.

### 9.7 NiFi — MATCH visual clarity, DIFFER on version registry

Apache NiFi Registry was deprecated after a February 2026 community vote, with
Git-based Flow Registry Clients recommended instead.

References:

- https://nifi.apache.org/projects/registry/
- https://nifi.apache.org/components/org.apache.nifi.github.GitHubFlowRegistryClient/

DVT should learn from NiFi's visual flow and version posture but avoid a new
proprietary registry parallel to Git and project files.

## 10. Priority impact

No legitimate Planning DB/ADR authority change was found.

The `ListRuns` correction is a bounded repair to a recently released vertical,
not a new strategic priority. It must not become another broad runtime program.

After it closes, the canonical product sequence remains:

1. model SQL authority;
2. atomic project publication and exact revision identity;
3. workspace capability truth;
4. cohesive authoring recovery;
5. product-wide quality gates;
6. later differentiation.

## 11. Required implementation-agent handoff

At the end of the next implementation iteration, post one top-level PR comment
with this exact heading:

```markdown
## Iteration Handoff
```

It must include:

### Identity

- task/design id;
- exact base SHA;
- exact final head SHA;
- branch;
- PR;
- iteration goal.

### What / how / why

- what changed;
- how it was implemented;
- why this design was selected;
- exact DDD/domain owner;
- user-visible behavior.

### Repository surfaces

- commands and queries;
- ports;
- adapters;
- contracts/domain objects;
- migrations;
- complete changed-file inventory.

### Executed evidence

- red tests observed before implementation;
- green commands and exact counts;
- six exact-head workflow links;
- live integration/browser command, environment, result, and artifact/link;
- review-thread status.

### Operational posture

- security;
- data integrity;
- observability;
- compatibility;
- rollback;
- unresolved risks;
- deviations from the approved route;
- one bounded next iteration.

Every claim must be marked as executed evidence or design reasoning. A copied PR
summary is not sufficient.

## 12. Final decision

There is no new product delta to celebrate or condemn in this cycle.

The released run operational projection remains a real improvement. Its scoped
pagination is still incomplete, and current PostgreSQL hydration makes the
returned continuation token impossible in the normal production path.

The implementation agent must close that bounded P2, reconcile Planning DB to
the exact behavior proved, and leave the mandatory handoff. The next unrelated
runtime, release, dependency, or governance expansion should not begin first.

After that repair, return directly to model SQL authority and the dbt round-trip
transaction.
