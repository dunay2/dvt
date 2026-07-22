---
title: DVT no-delta SQL authority and iteration handoff Fowler review
status: Review
owner: Architecture / Product Delivery / Web / API
reviewed_repository: dunay2/dvt
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-22T16:40:00+02:00
planning_type: point-in-time-review
---

# DVT no-delta SQL authority and iteration handoff Fowler review

## 1. Executive verdict

There is **no material repository delta** since the previous review.

- `main` remains exactly `8c098d6e35ce874efae81609814d99e8e60091f7` (`chore(main): Release 0.5.3 (#2037)`).
- Product PR [#2040](https://github.com/dunay2/dvt/pull/2040) remains on exact head `6257745ed1ec91f1a1415585d24e319905966931`.
- PR #2040 still has one commit, 24 changed files, 2,766 additions, and 57 deletions.
- Its six standard workflows are green on that exact head.
- The only inline thread is resolved as **DISPROVED / out of scope** because it assumed a supported pre-marker artifact population that does not exist in this pre-product repository.
- No implementation-agent `## Iteration Handoff` has been published.
- The requested corrections have not been applied: `adopt_legacy_equivalent` still exists in runtime code, tests, and Planning DB closeout truth.

The current implementation is valuable containment work, but the iteration is not ready to merge. The actual blocker is not backward compatibility. The blockers are:

1. implicit ownership acquisition from an unknown unmarked SQL file;
2. Planning DB declaring the current behavior canonical and implemented while preserving that unsupported transition;
3. missing delivery handoff and direct final-head proof.

The previous review also overstated one security problem. The current branch already corrected the Planning DB language from creator “authentication” to payload-integrity verification. That finding is now **FIXED** and must not be repeated as active.

## 2. Exact reviewed state

### 2.1 Main

- SHA: [`8c098d6e35ce874efae81609814d99e8e60091f7`](https://github.com/dunay2/dvt/commit/8c098d6e35ce874efae81609814d99e8e60091f7)
- Commit: `chore(main): Release 0.5.3 (#2037)`
- Current connector-visible workflow runs directly attached to the squash SHA: none.
- Release state: `0.5.3` remains the latest merged release visible in the repository.

This does not invalidate the PR-head CI evidence used before the release merge, but exact-main execution identity remains invisible through the current connector response.

### 2.2 Open pull requests

| PR | Kind | Head | State | Material posture |
| --- | --- | --- | --- | --- |
| [#2040](https://github.com/dunay2/dvt/pull/2040) | Product | `6257745ed1ec91f1a1415585d24e319905966931` | Open, ready, mergeable | Correct priority; corrections and handoff still pending |
| [#2041](https://github.com/dunay2/dvt/pull/2041) | Documentation review | `ed67ab7ce53b744b617f013cc0b65d6420f9b4ad` | Draft, mergeable | Superseded by this cycle report after publication |

No other open product branch or release PR is visible.

### 2.3 Relevant branch work

The only current functional branch represented by an open PR is:

```text
fix/dbt-model-sql-authority-containment
```

No newer implementation head is visible. The branch has not responded to the correction posted in PR #2040.

## 3. Implementation handoff audit

### 3.1 Status

```text
DELIVERY-HANDOFF-MISSING
```

A PR summary is not an iteration handoff. PR #2040 describes root cause, high-level changes, and validation commands, but does not provide the complete delivery contract.

### 3.2 Required fields still missing

- exact base and final head in a dedicated closeout section;
- explicit iteration goal and user transaction;
- final statement of what changed, how, and why;
- exact DDD owners;
- complete command/query rail inventory;
- ports, adapters, contracts, migrations, and touched files grouped by responsibility;
- red-test chronology showing observed failure before implementation;
- green-test chronology and exact command result;
- direct links to final-head CI runs;
- direct live-browser/integration evidence rather than only a command name;
- security threat model and residual trust boundary;
- data-integrity and concurrency posture;
- observability ownership and emitted signals;
- explicit pre-product compatibility decision;
- compatibility impact limited to current supported state;
- rollback procedure;
- unresolved risks;
- deviations from the approved route;
- bounded next iteration.

### 3.3 Minimum acceptable handoff location

The implementing agent should add a top-level PR comment beginning exactly:

```markdown
## Iteration Handoff
```

It may update the PR body instead only if the body contains the complete contract and distinguishes claims from executed evidence.

## 4. Claim-to-evidence matrix for PR #2040

| Claim | Status | Source evidence | Review |
| --- | --- | --- | --- |
| PR targets exact current `main` | VERIFIED | PR metadata: base `8c098d6e...` | Correct |
| External or Project Code SQL can no longer be silently overwritten by Preview | VERIFIED for divergent unmarked SQL | `dbtGraphModelSqlPublicationPolicy.ts`; plan-action and Cypress tests | Fail-closed divergence path exists |
| Graph-generated SQL is deterministic and self-verifying | VERIFIED | `createGraphManagedDbtModelSql`; unit test | Digest checks payload consistency |
| Marker authenticates creator or ownership | DISPROVED | Unkeyed digest; migration 799 now says it is not creator authentication | Previous overclaim already corrected |
| All artifacts are inspected before first write | VERIFIED | `Promise.all` preflight in `dbtGraphWorkspaceArtifactPublisher.ts` | Prevents known divergence from causing partial writes |
| Publication is atomic | CONTRADICTED | Sequential `saveFileContent` loop after preflight | Later CAS failure can leave earlier writes |
| Observed revisions are retained from preflight | VERIFIED | Prepared artifact stores `expectedRevision` and reuses it on save | Correct CAS containment |
| Existing unmarked SQL is never adopted | CONTRADICTED | `adopt_legacy_equivalent` branch | Byte-identical unknown SQL is silently converted |
| Graph-owned Project Code files are read-only | VERIFIED by source/tests; live proof PARTIAL | edit-posture and file-surface components; Cypress path exists | Direct execution artifact not linked in handoff |
| File-authoritative dbt projects remain editable | VERIFIED by source/tests | edit-posture tests | Correct authority distinction |
| No duplicate persistence rail was created | VERIFIED | Existing `GetWorkspaceFileContent` and `SaveWorkspaceFileContent` reused | Good repository fit |
| Planning DB accurately describes final behavior | CONTRADICTED | migrations 797 and 799 retain `legacy-equivalent` transition and evidence | Must be corrected before merge |
| Planning DB closeout is final-head evidence | PARTIAL | closeout rows mark implemented/pass | Source exists, but the blocking semantic remains and handoff is absent |
| Six standard workflows pass on exact head | VERIFIED | GitHub Actions runs on `6257745ed1...` | All six green |
| Live browser test executed successfully | PARTIAL | PR body claims command; Cypress flow and Planning DB evidence exist | No direct run/artifact link in handoff |
| Tests were written and observed failing first | NOT PROVEN | No red chronology | Must be reported honestly |
| Rollback is documented | NOT PROVEN | No handoff | Expected rollback: revert the single PR before deployment |
| Compatibility obligations are satisfied | VERIFIED for supported state | Product-owner decision: pre-product, no legacy population | No migration required |

## 5. Material delta since the previous review

There is none.

The following remain unchanged:

- `main` SHA;
- PR #2040 head SHA;
- runtime decision union;
- unit test expecting `adopt_legacy_equivalent`;
- migrations 797–799;
- six green workflow conclusions;
- resolved Codex thread;
- missing implementation handoff.

No new finding is manufactured for this cycle.

## 6. Previous findings revalidated

### 6.1 Fixed

#### PR #2030 reconciliation receipt truth

Fixed and merged. Do not reopen.

#### PR #2035 non-terminal materialization contradiction

Fixed and released in `0.5.3`.

#### Legacy upgrade requirement

Disproved. DVT has no supported pre-marker deployed artifact population. No migration, historical matching, or version negotiation is required.

#### Marker creator-authentication wording

Fixed on the current PR #2040 head. Migration 799 removes the old invariant and replaces it with:

```text
A valid graph-managed marker self-verifies exact payload integrity by SHA-256;
it is not creator authentication.
```

This is truthful. Do not add signing, secrets, MACs, or a key-management subsystem to this slice.

### 6.2 Still active

#### P1 — implicit ownership acquisition

`classifyGraphModelSqlPublication` still returns:

```ts
kind: 'adopt_legacy_equivalent'
```

when an existing unmarked file happens to equal the proposed graph payload.

This is not backward compatibility. It is silent conversion of an unknown representation into graph-managed state.

Correct rule:

```text
absent file
  -> create marked graph-owned file

valid marked file
  -> unchanged or replace_managed under CAS

unmarked existing file, including byte-identical content
  -> conflict

malformed or mismatched marker
  -> conflict
```

#### P1 — non-atomic multi-file publication

The publisher performs complete preflight, then writes sequentially with the single-file command. A concurrent change discovered by a later CAS can leave earlier artifacts already updated.

Planning DB correctly assigns this to:

```text
E-WEB-DBT-ATOMIC-PUBLICATION-1
```

Do not expand #2040 into that transaction. Finish containment, then implement atomic publication as the next vertical.

#### P1 — exact project revision identity

The file-backed controller still accepts `WorkspaceFileSaveReceipt` as `_receipt` and refetches the latest project projection. That proves “latest when read,” not “the exact project revision produced by this save/publication.”

Required future chain:

```text
WorkspaceFileBatchReceipt
  -> projectContentSetSha256
  -> analysisSha256
  -> Preview
  -> Run
  -> reopen
```

#### P1 — workspace inventory truth

Interactive workspace listing:

- silently stops at 500 files;
- provides no cursor;
- provides no `complete | partial` state;
- treats files over 1 MB as invalid paths.

The dbt analysis source snapshot separately supports 10,000 files and 50 MB. These are different concerns, but the product must expose the effective interactive capability honestly.

#### P2 — `ListRuns` incomplete pagination

The use case limits tenant rows before project/environment filtering and produces a cursor the query cannot consume. PostgreSQL does not hydrate `createdAt`, so `nextCursor` can be null even for a full page. Ordering also lacks a `run_id` tie-breaker.

This remains an operational follow-up. It must not displace the approved dbt authoring transaction unless Planning DB explicitly reorders dependencies.

#### P2 — generic Web HTTP trust cast

`createApiClient` still returns:

```ts
return parsedBody as TResponse;
```

New important boundaries should parse shared schemas rather than rely on compile-time assertion.

#### P2 — crash recovery

The Code workbench flushes before SPA navigation and warns on browser unload. It has no durable buffer journal for crash, forced process termination, or power loss.

#### P2 — stale current-status document

`docs/architecture/system-delivery-status.md` remains `Active`, calls itself the current repository snapshot, and was last reviewed on 2026-04-26.

### 6.3 Superseded

The recommendation to split Code persistence and reconciliation state as the immediate product slice is superseded by the merged #2030 receipt-truth fix.

### 6.4 Disproved

- A pre-marker artifact migration is required.
- An unkeyed SHA-256 marker authenticates creator identity.
- Green standard CI proves the protected live Cypress flow executed on GitHub.

The first two are false. The third remains unproven without linked live-run evidence.

## 7. Fowler review of PR #2040

### 7.1 Improvement: hidden authority is now visible

Before #2040, Preview could read the newest file revision and still overwrite its bytes with graph-derived SQL. That confused revision freshness with write authority.

The new policy makes the decision explicit:

- create;
- unchanged;
- replace graph-managed;
- conflict.

This is a substantial improvement over route-local conditionals.

### 7.2 Active smell: hidden transition disguised as compatibility

`adopt_legacy_equivalent` is a state transition without an accepted transition contract.

It infers ownership from byte equality. Equality does not prove origin, ownership, or user intent.

Fowler signals:

- hidden authority;
- primitive obsession around raw string equality;
- leaky compatibility concept;
- policy drift between product decision and implementation.

### 7.3 Improvement: responsibility extraction

The branch extracts:

- graph SQL classification;
- all-artifact preflight/publication coordination;
- workspace-file edit posture;
- passive editor/viewer surface.

That is better than increasing `CanvasPlanAction` and `CodeView` responsibility.

### 7.4 Remaining responsibility boundary

`DbtGraphWorkspaceArtifactPublisher` currently owns a transaction-shaped concern but only has access to single-file writes. This is acceptable containment for #2040, not a complete publication aggregate.

The next slice should move the complete mutation to the existing server-side batch authority rather than adding compensating browser logic.

### 7.5 Planning DB stale truth within the branch

Migration 799 marks the design, components, responsibilities, ports, relations, and evidence as implemented/current/canonical while the branch retains the unsupported adoption path.

Because the branch is not merged, no historical migration compatibility is needed. Edit migrations 797–799 directly so the final branch truth matches the final code.

### 7.6 Test-only confidence

Source and test coverage are strong, but the delivery record is incomplete:

- standard CI is green;
- Cypress test code exists;
- the PR body claims the live command ran;
- Planning DB declares pass;
- no linked runtime output or artifact appears in the handoff because the handoff does not exist.

The correct status is `PARTIAL`, not failure and not fully verified.

## 8. Blocking correction instruction for the implementation agent

### Correction A — remove unknown-file auto-adoption

#### What is wrong

An unmarked byte-identical SQL file is silently converted to a graph-managed marked file.

#### Why it matters

It creates an implicit authority transition unsupported by ADR-0060 and the product-owner pre-product decision.

#### Exact owner

```text
DbtGraphModelSqlPublicationPolicy
```

#### How to correct it

1. Remove `adopt_legacy_equivalent` from `PublishableGraphModelSqlDecision`.
2. Remove the `currentFile.content === proposed.payload` adoption branch.
3. Return `conflict` for every existing unmarked SQL file.
4. Keep valid marked replacement under the preflight-observed CAS revision.
5. Keep malformed or payload-mismatched marked files as conflict.
6. Update the publisher only if exhaustive typing requires it; do not add another branch.
7. Update migrations 797–799 in place because they are unmerged development migrations.
8. Remove all `legacy-equivalent` responsibilities, transitions, evidence claims, and test descriptions.

#### What must not be introduced

- legacy detector;
- artifact migration;
- marker format version negotiation;
- historical projection matching;
- automatic file deletion;
- user-data preservation claims for development fixtures;
- new command/query rail.

#### Likely files

- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.ts`
- `apps/web/src/app/views/canvas/dbtGraphModelSqlPublicationPolicy.test.ts`
- `apps/web/src/app/views/canvas/dbtGraphWorkspaceArtifactPublisher.test.ts`
- `apps/web/src/app/views/canvas/canvasPlanAction.graphDraftSqlAuthority.test.ts`
- `tools/planning-db/migrations/797_dbt_model_sql_authority_containment_design.sql`
- `tools/planning-db/migrations/798_dbt_model_sql_authority_hard_fowler_design.sql`
- `tools/planning-db/migrations/799_dbt_model_sql_authority_containment_closeout.sql`

#### Red test

```text
existing unmarked file == proposed payload
  -> conflict
  -> zero writes
  -> bytes unchanged
```

#### Green proof

- absent file creates marked content;
- exact marked content is unchanged;
- valid marked old payload is replaced under its observed CAS revision;
- unmarked identical content conflicts;
- unmarked divergent content conflicts;
- malformed marker conflicts;
- mismatched digest conflicts;
- any preflight conflict yields zero writes.

#### Live proof

The protected browser flow must show:

1. graph-draft model Preview creates marked SQL;
2. Project Code shows the graph-owned file read-only;
3. an external write replaces the file with unmarked SQL;
4. Preview rejects;
5. no other artifact is written;
6. external bytes remain identical after rejection.

#### Acceptance criteria

- no `legacy` symbol remains in the publication decision or Planning DB records;
- no existing unmarked file is rewritten;
- user-visible rejection includes the conflicting path;
- final exact head has six green standard workflows;
- live proof is linked;
- full handoff is present.

#### Rollback

Before merge, rollback is deleting/reverting the PR commit. No data migration is required because DVT is pre-product and the branch is not deployed.

#### Observability

Use the existing typed conflict path and existing workspace command audit signal. Do not add a parallel telemetry channel.

#### Security

The marker is an integrity hint, not an authentication boundary. Keep this explicit. Unknown or malformed content fails closed.

### Correction B — publish the iteration handoff

The handoff must include all fields in section 3 and must explicitly state:

```text
Backward compatibility with pre-marker development artifacts: OUT OF SCOPE.
Reason: no supported deployed artifact population or preservation contract exists.
```

It must also state that atomic multi-file publication is not solved by this PR.

## 9. Follow-up implementation route

### 9.1 Priority 1 after #2040 — atomic publication and exact revision

#### Severity

P1 data integrity and execution reproducibility.

#### Root cause

The browser coordinates multiple single-file writes while the repository already has an API-side batch mutation boundary.

#### Product impact

A later CAS failure can leave a partial dbt project. Preview may analyze or execute a revision different from the intended publication.

#### Domain owner

```text
Project Workspace I/O / DBT graph workspace artifact publication
```

#### Reuse, do not duplicate

- `WorkspaceFileBatchMutation`
- `WorkspaceFileBatchReceipt`
- `IWorkspaceFileBatchMutationPort`
- `LocalWorkspaceFileBatchMutationGateway`
- `ProjectDbtGraphFromFiles`
- existing workspace scope authorization
- existing dbt project content-set hashing

#### Target transaction

```text
Graph artifact proposal
  -> complete expected-file set
  -> one idempotent batch mutation
  -> immutable batch receipt
  -> exact resulting project source snapshot
  -> ProjectDbtGraphFromFiles on that snapshot
  -> projectContentSetSha256 + analysisSha256
  -> Preview consumes exact identities
  -> Run consumes persisted Preview identity
  -> reopen resolves the same revision
```

#### Command/query posture

Extend existing canonical intents in place. Do not create:

- `SaveDbtProjectBundle` as a parallel synonym;
- browser-owned transaction semantics;
- another workspace repository;
- a second dbt analyzer;
- an editor-only revision model.

#### Red tests

1. conflict on the second expected file causes zero project changes;
2. injected failure during replacement restores every original file;
3. same idempotency key and same request deduplicates;
4. same key with a different request fails;
5. Project Code concurrent edit is returned as a typed conflict;
6. receipt write-set hashes match persisted bytes;
7. analysis content-set equals the batch result;
8. Preview rejects a mismatched content-set identity;
9. Run uses persisted Preview identity even if the project later changes;
10. protected browser flow proves publish, Preview, Run, and reopen.

#### Observability

Record one publication receipt/correlation identity, conflict paths, deduplication disposition, resulting content set, analysis identity, and Preview identity. Do not log file contents, credentials, profiles, environment variables, or dbt secrets.

#### Rollback

The batch gateway already stages and atomically replaces files. The feature rollout should remain behind the existing authority strategy, allowing revert to the prior graph-draft Preview path during development. No production migration is required.

#### Acceptance gate

- one server-owned transaction;
- no sequential browser saves for graph artifact publication;
- exact revision tuple returned and persisted;
- all contract/API/Web/architecture tests green;
- injected failure and conflict proof;
- protected browser proof;
- complete handoff;
- six workflows green on final head.

### 9.2 Priority 2 — workspace capability truth

After atomic publication:

- paginated inventory;
- explicit `complete | partial` state;
- cursor;
- typed `oversized | not_found | unsupported` results;
- consistent limits across Explorer, Code, analyzer, and publication;
- large-project and payload performance evidence.

### 9.3 Priority 3 — cohesive authoring recovery

Only after authority and inventory truth:

- durable buffer journal;
- recovery by workspace/file/revision identity;
- conflict-aware restore;
- explicit discard;
- no coupling to Git staging or commit lifecycle.

### 9.4 Priority 4 — product-wide quality gates

- explicit Web/API coverage ratchets;
- accessibility automation;
- bundle budget;
- graph-size performance budget;
- API latency/payload budgets;
- fault injection;
- exact-head evidence;
- generated current-state documentation.

## 10. Mature-system comparison

| System | DVT should match | DVT should differentiate | DVT should defer |
| --- | --- | --- | --- |
| dbt Studio / IDE | Normal dbt files, integrated build/test/run/version-control, diagnostics | Canvas as a governed projection without inventing a new dbt language | Broad collaboration and hosted platform parity |
| Professional IDE/Git | Distinguish buffer, working tree, conflicts, commit, branch, remote sync | Automatic revision-guarded workspace persistence without a manual Save button | Full Git lifecycle until a real connector and rails exist |
| Airflow DAG Bundles | Bind executions to a complete versioned file set | Use content-set and analysis hashes rather than Python DAG bundle classes | General orchestration bundle ecosystem |
| Prefect | Exact deployment/code identity, promotion and rollback principles | Authoring transaction centered on dbt project semantics | Version promotion UI until exact revision is complete |
| Dagster | Lineage, checks, freshness, asset-oriented observability | Preserve DVT graph/code round-trip and dbt-native files | Asset partition/check richness before authority integrity |
| Temporal | Durable identity, receipts, idempotency, recovery after failure | Use Temporal as runtime infrastructure, not editor state authority | Editor orchestration implemented as workflows |
| NiFi | Visual diff/version clarity and Git-based storage direction | Avoid proprietary flow registry and preserve dbt/Git semantics | Registry-like product surface before Git lifecycle |

Official references:

- dbt Studio IDE: https://docs.getdbt.com/
- Airflow DAG Bundles: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/dag-bundles.html
- Prefect deployment versioning: https://docs.prefect.io/v3/how-to-guides/deployments/versioning
- Dagster overview: https://docs.dagster.io/
- Temporal durable execution: https://docs.temporal.io/
- NiFi Registry deprecation and Git clients: https://nifi.apache.org/projects/registry/

## 11. Release and CI posture

### PR #2040

Exact head `6257745ed1ec91f1a1415585d24e319905966931`:

- Contracts & Determinism: success
- Dependency Review: success
- Test Suite: success
- CI – Code Quality: success
- CodeQL: success
- PR Quality Gate: success

No unresolved inline review thread remains. The only thread is resolved as a disproved legacy-upgrade requirement.

Green CI does not resolve the source-backed auto-adoption deviation or missing handoff.

### Main

No connector-visible workflow run or combined status is directly attached to `main@8c098d6e...`.

### Release

No new release PR is open. `0.5.3` remains current.

## 12. Required report from the next implementation iteration

The implementing agent must provide:

```markdown
## Iteration Handoff

### Identity
- Base SHA:
- Final head SHA:
- Branch:
- PR:
- Planning DB work item/design:

### Goal
- User transaction:
- Problem closed:
- Explicit out of scope:

### What changed
...

### How it was implemented
- Owners:
- Commands/queries:
- Ports:
- Adapters:
- Contracts:
- Migrations:
- Files:

### Why this design
...

### Evidence
- Red tests observed:
- Green tests:
- CI links on final head:
- Live browser/integration proof:

### Safety
- Security:
- Data integrity:
- Observability:
- Compatibility:
- Rollback:

### Residual risks
...

### Deviations
...

### Recommended next iteration
...
```

Claims must link to exact files, commits, tests, workflow runs, or evidence artifacts.

## 13. Final decision

Do not merge PR #2040 yet.

The route remains correct and no new architectural direction is needed. The implementation agent should make one small correction pass:

1. remove `adopt_legacy_equivalent` and all corresponding Planning DB/test truth;
2. keep the already-correct payload-integrity wording;
3. rerun focused tests, protected browser proof, and six standard workflows on the new exact head;
4. publish the complete handoff;
5. then merge through normal policy if all gates pass.

Afterwards, begin `E-WEB-DBT-ATOMIC-PUBLICATION-1` as a separate vertical. Do not divert into legacy migration, another review framework, release governance, dependency work, or broad IDE features.
