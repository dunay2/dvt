---
title: DVT Fowler Review — Delivery-Control Governance Delta and Atomic Publication Red Phase
status: review
owner: Architecture and Governance
reviewed_main_sha: 8c098d6e35ce874efae81609814d99e8e60091f7
reviewed_at: 2026-07-25T08:38:00+02:00
---

# DVT Fowler Review — Delivery-Control Governance Delta and Atomic Publication Red Phase

## 1. Executive decision

There is **no material runtime implementation delta**, but there is a **material governance delta**:

- exact `main` remains `8c098d6e35ce874efae81609814d99e8e60091f7`, release `0.5.3`;
- PR #2040 remains functionally green at `6257745ed1ec91f1a1415585d24e319905966931`;
- PR #2055 remains intentionally red at `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`;
- new draft PR #2059 proposes the single-active-design and straight-forward delivery-control model at `6a6b1847b6e4886605ccbe97290bad1bdb108190`.

PR #2059 is directionally correct and directly addresses the accumulation of point-in-time review documents and Planning DB stages. It is not current authority while unmerged. Two governance corrections are blocking before it should become active:

1. an unmerged draft must not self-declare `Status: Active`;
2. the document must define how operational Planning DB writes become deterministic, reviewable and reconstructable through the existing Git bootstrap/export boundary required by ADR-0055.

The product sequence has not changed:

```text
model SQL authority containment
→ atomic project publication
→ exact project content-set and analysis identity
→ workspace capability truth
→ cohesive authoring recovery
→ product-wide quality gates
→ later differentiation
```

The governance proposal changes how this work should be controlled after merge; it does not replace or reorder the active product transaction.

---

## 2. Exact reviewed state

| Item | Exact state |
|---|---|
| `main` | `8c098d6e35ce874efae81609814d99e8e60091f7` |
| release | `0.5.3` |
| PR #2040 | open, non-draft, mergeable, head `6257745ed1ec91f1a1415585d24e319905966931` |
| PR #2055 | open, non-draft, mergeable, head `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43` |
| PR #2058 | open draft review, head `d54d931c89645d8cb15f2c995734b3499f95a60a`, superseded by this report |
| PR #2059 | open draft governance proposal, head `6a6b1847b6e4886605ccbe97290bad1bdb108190` |
| PR #2060 | this review PR |

PR #2059 changes seven instruction/documentation files only:

- `.github/copilot-instructions.md`;
- `CLAUDE.md`;
- `DELIVERY_CONTROL.md`;
- `apps/AGENTS.md`;
- `docs/planning/AGENTS.md`;
- `packages/AGENTS.md`;
- `tools/planning-db/AGENTS.md`.

It changes no product runtime, contract, schema, dependency or workflow.

---

## 3. Operational authority

Current authority remains:

- current merged Planning DB state and its command/query rails;
- `docs/adr/ADR-0060-dbt-project-authoring-authority.md`;
- `docs/planning/proposals/mandatory/frontend-and-ux/dbt-project-roundtrip-product-plan-20260527.md`;
- current source, contracts, tests, CI and review findings.

ADR-0055 remains binding for Planning DB persistence:

- Planning DB is the canonical operational source;
- Git remains the review, bootstrap and recovery boundary;
- repository sources rebuild the DB;
- `planning:db:operate`, import, export and check rails govern lifecycle changes.

PR #2059 is a proposed authority change. It becomes authoritative only when merged into `main`. The current scheduled instruction still requires a cycle report and PR, so creating this report does not violate current authority. Once #2059 merges and the scheduled instruction is aligned, no-material-delta cycles should return only `NO MATERIAL DELTA` and create no repository artifact.

The absent `dvt-product-priority-execution-guide-20260721.md` remains non-authoritative. PR #2030 remains fixed and is not reopened.

---

## 4. Implementation handoff audit

Formal status:

```text
DELIVERY-HANDOFF-MISSING
```

### PR #2040

A comprehensive reviewer-reconstructed handoff exists at:

`https://github.com/dunay2/dvt/pull/2040#issuecomment-5072979847`

Disposition:

| Aspect | Status |
|---|---|
| technical inventory and design rationale | VERIFIED/PARTIAL |
| exact base/head/branch/PR | VERIFIED |
| owners, rails, files and migrations | VERIFIED |
| exact-head CI links | VERIFIED |
| protected live-flow source and command | VERIFIED |
| retained live artifact | NOT PROVEN |
| tests observed red before implementation | NOT PROVEN |
| implementation-agent provenance | NOT PROVEN |

The reconstruction is an auditable review summary, not the missing implementer-owned handoff.

### PR #2055

The atomic-publication iteration is still active and red. No final handoff is due until it reaches a material implementation boundary, but the agent must produce one before closeout.

### PR #2059

The PR body gives purpose, changes and partial validation but is not a complete final handoff. It lacks the complete proof, security, rollback, persistence/rebuild posture, deviations and next bounded implementation commitment required by the current control contract. It is also still a draft.

The implementation agent must not begin unrelated work before:

- explicitly adopting/correcting the #2040 retrospective handoff;
- correcting and validating #2059 if this governance route is to become active;
- making #2055 green on one consolidated implementation path.

---

## 5. Material delta

## 5.1 Runtime/product

```text
NO MATERIAL RUNTIME DELTA
```

- `main` unchanged;
- #2040 head unchanged;
- #2055 head unchanged;
- no atomic publication command exists;
- no exact publication/analysis receipt exists;
- no Preview/Run exact-identity gate exists.

## 5.2 Governance

```text
MATERIAL GOVERNANCE DELTA: PR #2059
```

Verified intent:

- design remains mandatory and precedes implementation;
- one current canonical design replaces accumulated intermediate canonical states;
- Planning DB is queried before new owners/rails are named;
- one result has one active implementation path;
- executable evidence replaces synthetic/manual proof records;
- handoffs belong on the active PR/control channel;
- a no-material-delta control cycle should create no branch or review artifact;
- the immediate DBT result remains server-owned atomic publication and exact identity.

Active deviations:

1. `DELIVERY_CONTROL.md` says `Status: Active` although #2059 is unmerged and draft.
2. It forbids feature/design/status migrations correctly, but does not define the durable command-write → deterministic export/current-source → clean rebuild/import → check lifecycle required by ADR-0055.
3. It says current open work must be consolidated but does not yet name the concrete disposition of #2040/#2055.
4. The PR body explicitly states local `docs:sync`, governance refresh and `verify:prepush` were not executed.

A corrective review instruction was posted on #2059:

`https://github.com/dunay2/dvt/pull/2059#issuecomment-5077373053`

---

## 6. Claim-to-evidence matrix

| Claim | Status | Evidence | Conclusion |
|---|---|---|---|
| `main` remains release 0.5.3 | VERIFIED | exact commit `8c098d6e...` | no release delta |
| #2040 prevents silent overwrite of divergent SQL | VERIFIED | policy, complete preflight, CAS binding, read-only graph-owned Code, live-flow source | correct SQL-authority slice |
| #2040 provides atomic multi-file publication | CONTRADICTED | sequential `saveFileContent` loop | partial publication remains possible |
| #2040 exact-head CI is green | VERIFIED | six successful workflows | functionally credible |
| #2040 has a valid implementer handoff | NOT PROVEN | reviewer reconstruction only | formal handoff missing |
| #2055 isolates the atomicity red proof over #2040 | VERIFIED | two commits ahead, one test file, `+46/-0` | correct red phase |
| #2055 proves partial publication | VERIFIED | governed Web Test Suite failure | executable P1 |
| #2055 implements the green transaction | CONTRADICTED | no runtime delta, test remains red | must not merge |
| Planning DB assigns exact whole-project identity to `E-WEB-DBT-ATOMIC-PUBLICATION-1` | VERIFIED | migrations 767/768 | sequence unchanged |
| #2059 is documentation/instruction only | VERIFIED | seven changed files | no runtime product increment |
| #2059 establishes a coherent one-active-design target | VERIFIED | `DELIVERY_CONTROL.md` | direction aligns with product-owner decision |
| #2059 is current active authority | CONTRADICTED | unmerged draft but document says `Status: Active` | correct before ready |
| #2059 defines a deterministic DB-to-Git rebuild lifecycle | NOT PROVEN | lifecycle is omitted; ADR-0055 requires it | blocking governance gap |
| #2059 local validation is complete | NOT PROVEN | PR body says required local commands were not run | keep draft |
| a legacy artifact migration is required | CONTRADICTED / OUT OF SCOPE | pre-product; no deployed preservation contract | do not add migration code |

---

## 7. Findings disposition

## Fixed

- PR #2030 reconciliation defect: **FIXED**, do not reopen.
- PR #2035 run operational-truth materialization issue: **FIXED** in release 0.5.3.
- unsupported pre-marker deployed-data compatibility requirement: **DISPROVED / OUT OF SCOPE**.

## Implemented but unmerged

- model SQL authority containment on #2040: **IMPLEMENTED ON OPEN PR**.

## Active product findings

### P1 — atomic multi-file publication

Current transaction:

```text
complete preflight
→ write file 1
→ write file 2
→ late conflict/failure
→ file 1 remains changed
```

PR #2055 proves it with a red test. One unresolved P1 review thread correctly requires a server-owned batch transaction.

### P1 — exact project revision identity

Merged Planning DB keeps `GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION` open under `E-WEB-DBT-ATOMIC-PUBLICATION-1` and explicitly rejects repeated browser GETs as atomic proof.

Required identity:

- complete expected-file fence;
- complete resulting content hashes;
- idempotent immutable receipt;
- `projectContentSetSha256`;
- `analysisSha256`;
- Preview identity;
- Run identity;
- reopen exact/stale/conflict posture.

### Later active findings

After atomic publication:

1. workspace inventory/capability truth;
2. durable authoring recovery;
3. scoped `ListRuns` keyset pagination;
4. product-wide Web/API/accessibility/performance gates.

## Active governance findings on #2059

### G1 — draft self-declares active

Severity: blocking before mark-ready.

Correction: use `Status: Proposed` / `Effective: upon merge`, or an explicit draft banner. Do not create a separate approval document.

### G2 — operational Planning DB changes lack defined Git recovery projection

Severity: blocking before mark-ready.

Required lifecycle using existing rails:

```text
query current DB
→ planning:db:operate
→ deterministic export/current-source update
→ commit on same product PR
→ clean reset/import
→ query same active IDs/status/relations
→ planning/governance check and export:check
```

The export is review/bootstrap/recovery, not a second operational authority. No DB dump, historical journal, feature migration or parallel YAML write backend may be introduced.

### G3 — current branch consolidation is declarative only

Severity: follow-up before governance closeout.

Concrete route:

1. close #2040 normally after truthful delivery closeout;
2. rebase/consolidate #2055 so red and green remain on one implementation path;
3. merge no red product PR;
4. after #2059 and control-instruction alignment, stop no-delta review branches.

---

## 8. Blocking corrective implementation instruction for atomic publication

### What is wrong

`DbtGraphWorkspaceArtifactPublisher` owns correct projection/preflight policy but performs independent browser-side file commands. It does not own a valid project transaction.

### Exact owner split

- Web `DbtGraphWorkspaceArtifactPublisher`: prepare proposal and reduce typed result.
- API application command: own authorized project publication transaction.
- `IWorkspaceFileBatchMutationPort`: atomic multipath CAS.
- `LocalWorkspaceFileBatchMutationGateway`: locking, atomic replacement, conflicts and idempotency.
- `ProjectDbtGraphFromFiles`: exact retained-project analysis.
- Preview/Run application owners: admit only the exact publication receipt identity.

### Correction using existing semantics

```text
complete graph-derived artifacts
→ complete expected revisions
→ one product-specific protected application command
→ one batchMutation.apply(...)
→ validate all receipt paths/hashes
→ ProjectDbtGraphFromFiles
→ immutable versioned publication receipt
→ Preview exact receipt
→ Run exact receipt
```

### Must not be introduced

- generic browser batch endpoint;
- browser compensation/rollback loop;
- second workspace repository;
- DBT-specific save synonym;
- browser-generated analysis hash;
- SQL/YAML bodies in logs;
- legacy migration/version negotiation.

### Required red tests

- conflict on second/last path leaves every file unchanged;
- conflict returns complete typed conflict posture;
- identical idempotent retry returns same receipt;
- same key/different request fails closed;
- missing expected write in receipt fails invariant;
- analysis identity mismatch fails closed;
- Preview without/exceeding receipt identity is rejected;
- Run after project change requires a new exact Preview;
- logs contain operation IDs/paths/hashes, never bodies.

### Required green/live proof

```text
Canvas authoring
→ atomic publication
→ exact publication receipt
→ server analysis
→ Preview exact identity
→ Run exact identity
→ reopen exact/current
```

Conflict flow:

```text
external concurrent edit
→ atomic conflict
→ zero writes
→ no Preview
→ no Run
→ actionable conflict path
```

### Acceptance

- #2055 red test passes unchanged;
- all standard workflows green;
- one unresolved P1 is resolved only after code and evidence;
- Planning DB current records are updated through the governed write/export lifecycle;
- implementation-agent handoff exists.

### Rollback, observability and security

Rollback is a normal pre-product code revert; failed transactions perform zero partial writes.

Record operation ID, scope, project root, path counts, conflict paths, deduplication, content-set hash, analysis hash, duration and error category. Never record source bodies or credentials.

Retain protected authorization, server path normalization, file-count/size bounds, fail-closed receipt schemas and server-derived identity.

---

## 9. CI and review threads

### PR #2040

- exact head: `6257745ed1ec91f1a1415585d24e319905966931`;
- Contracts, Dependency Review, Test Suite, Code Quality, CodeQL and PR Quality Gate: success;
- unresolved threads: 0;
- resolved thread: 1, unsupported legacy preservation request.

### PR #2055

- exact head: `58fb694ce7602d5ae3942b5ff83881e2c3e7ec43`;
- CodeQL, Contracts, Dependency Review, Code Quality and PR Quality Gate: success;
- Test Suite: failure;
- failing job: Web Frontend Tests;
- failing step: governed changed Vitest suites;
- unresolved threads: 1 P1 atomicity finding.

### PR #2059

- exact head: `6a6b1847b6e4886605ccbe97290bad1bdb108190`;
- PR Quality Gate: success;
- CI — Code Quality: success;
- product workflows skipped for documentation/instruction-only scope;
- unresolved inline threads: 0;
- top-level Fowler correction added;
- local `docs:sync`, governance refresh and `verify:prepush`: not proven/executed according to its PR body.

### Prior review #2058

Documentation-only CI is green where applicable. It is superseded by this report because it predates the material #2059 governance delta.

---

## 10. Mature-system comparison

The comparison remains stable:

- dbt Studio/professional IDE workflows require coherent project-file and revision semantics;
- Airflow DAG Bundles demonstrate binding execution to one complete bundle version;
- Prefect deployment versions demonstrate immutable promotion/rollback identity;
- Temporal informs later durable orchestration, not file atomicity;
- Dagster informs later assets/checks/freshness differentiation;
- NiFi informs visual flow versioning but does not justify a proprietary DVT registry.

DVT must match project integrity, reproducibility and conflict honesty now. It should differentiate later through heterogeneous graph composition and deterministic executable architecture.

---

## 11. Priority and next slice

No legitimate product-priority change:

1. correct/validate #2059 before treating it as active governance;
2. close #2040 with truthful implementer adoption of the handoff;
3. consolidate #2055 as the one active atomic-publication path;
4. implement one server-owned atomic publication command;
5. bind exact project/analysis identity into Preview, Run and reopen;
6. then workspace truth, recovery and product-wide gates.

No unrelated product work should begin.

---

## 12. Required final handoff

At the end of the next material iteration, the implementation agent must report on the active PR/control channel:

- exact base/head/branch/PR/commits;
- Planning DB task/design/dependency IDs;
- goal, what changed, how and why;
- exact owners, commands, queries, ports, adapters, contracts, routes, migrations or current-state exports, and files;
- user-visible success/conflict/stale/retry/reopen behavior;
- tests observed red first and exact green commands;
- exact-head CI and protected integration/live links;
- security, data integrity, observability, input bounds and rollback;
- compatibility/pre-product disposition;
- unresolved risks;
- deviations or `NONE`;
- next bounded result or `NONE`.

Claims must be separated from executed evidence.

---

## 13. Final disposition

```text
main: unchanged at release 0.5.3
runtime implementation delta: NONE
governance delta: PR #2059, material but still draft
#2040: functionally green, open, implementer handoff missing
#2055: governed red proof, no green command, one unresolved P1
#2059: direction accepted in principle; two blocking governance corrections issued
```

Do not merge #2055 while red. Do not treat #2059 as active before merge and correction. Do not create feature/status/evidence migrations to implement the new governance model. Preserve one current design and one product implementation path, with deterministic Planning DB operational truth that remains reviewable and reconstructable from Git.
