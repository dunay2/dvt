---
title: Closeout - GOV-S2 Doc-driven operating framework
status: Review
owner: Product / Architecture / Docs / Delivery
last_reviewed: 2026-05-07
planning_type: closeout
slice: 20260507-gov-s2-doc-driven-operating-framework
---

# Closeout: GOV-S2 Doc-Driven Operating Framework

## Think-First Analysis

### Problem summary

`GOV-S2` remained open as a broad governance umbrella after the repository had
already gained the framework proposal, startup router, planning control tower,
documentation information architecture, maintenance guide, generated-planning
rules, and the planning/governance query-store implementation path. Keeping it
open risks turning every future docs, planning, or query-store improvement into
another GOV-S2-shaped item.

### Root cause

The governance system grew incrementally. `GOV-S2` originally described the
whole target operating model, while later slices implemented parts of that model
under more concrete surfaces. The latest query-store work made the duplicate
authority visible: `GOV-S2` should close as the canonical framework and
`GOV-S3-PLANNING-STATE-QUERY-STORE` should remain the derived read-model path.

### Constraints and invariants

- `AGENTS.md`: repository governance is source-of-truth; closeout requires
  governing sources, real work, validation, no-debt, and no-stub evidence.
- `docs/planning/status/governance-document-rule-inventory.md`: canonical,
  operational, status, generated, evidence, risk, and historical surfaces must
  stay distinct.
- `docs/guides/ai-work-protocol.md`: planning changes must update the lane YAML
  registry and close with relevant validation plus `pnpm verify:prepush`.
- `docs/planning/state/planning-control-tower.md`: closing implementation work
  requires a closeout, lane status update, and affected status surfaces.
- `docs/architecture/command-query-rail-governance.md`: command/query rails
  prevent duplicate product or operational semantics.
- `docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md`:
  `GOV-S2` owns one doc-driven operating framework, not parallel governance
  systems.
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`:
  Postgres is a derived planning/governance read model; Git remains canonical.

### Options considered

1. Keep `GOV-S2` open until every future scaffold and traceability helper exists.
   Rejected because it keeps an umbrella task alive after the framework is
   accepted and encourages duplicate follow-up routing.
2. Mark `GOV-S2` done without clarifying the query-store boundary.
   Rejected because future contributors could still treat the database as a
   second planning authority.
3. Close `GOV-S2` as the framework slice, update the proposal with an explicit
   non-duplication decision, and route future work through concrete tasks and
   the query-store plan.
   Selected because it preserves one canonical framework while keeping future
   implementation work schedulable.

### Selected option and rationale

Close `GOV-S2` as accepted framework governance. The framework now points to
the existing operational sources, and future implementation must use specific
task IDs such as `GOV-S3-PLANNING-STATE-QUERY-STORE` or existing governance
gates instead of reopening the umbrella.

### Boundary correction

The original closeout language treated the query store primarily as a derived
read model from Git-tracked files. That was not enough for the operational
problem raised during closeout: local agents still collide when lane YAML and
generated governance files remain the daily write backend.

The corrected boundary is:

- `GOV-S2` closes the doc-driven operating framework and non-duplication rule.
- `GOV-S3` owns the local Postgres planning/governance store.
- Existing YAML and generated governance files can bootstrap and export state,
  but local agents should coordinate through DB commands, optimistic revisions,
  and append-only audit rows.
- Temporary validation databases are not audit storage. Durable local audit
  belongs in the shared local Postgres volume; durable review evidence belongs
  in tracked closeouts, evidence, risk records, and exported snapshots.

## Pre-Implementation Brief

- Mode: Slim
- Scope:
  - update `GOV-S2` lane status to done;
  - update the `GOV-S2` proposal with the non-duplication closure decision;
  - update the documentation IA status and domain board so closed governance is
    not still advertised as active work;
  - add this closeout and refresh generated governance/planning state.
- Touched files or paths:
  - `docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md`
  - `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
  - `docs/planning/status/documentation-information-architecture-current-vs-target-20260407.md`
  - `docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md`
  - `docs/planning/state/agent-lane-a.yaml`
  - `docs/planning/state/domain-status-board.md`
  - `docs/planning/closeouts/20260507-gov-s2-doc-driven-operating-framework-closeout.md`
  - `package.json`
  - `scripts/planning-db-run.cjs`
  - `scripts/planning-db-run.test.cjs`
  - `scripts/planning-db-operate.cjs`
  - `scripts/planning-db-operate.test.cjs`
  - `scripts/planning-db-content.integration.test.cjs`
- Expected outcome:
  - `GOV-S2` is closed as the canonical framework;
  - query-store work remains a derived read-model path, not a second governance
    authority;
  - active planning/domain surfaces no longer list closed governance umbrellas as
    active tasks.
- Risks and mitigations:
  - risk: closing the umbrella hides valid future work
    mitigation: route future work through concrete task IDs and existing rails
  - risk: treating the query store as canonical
    mitigation: document Git-tracked sources as authority in both the proposal
    and closeout
  - risk: generated governance drift after adding a closeout
    mitigation: run `pnpm governance:refresh` before validation
- Out-of-scope items:
  - adding new authoring scaffolds;
  - changing product runtime behavior;
  - moving generated governance artifacts out of Git;
  - introducing a GitHub Issues mirror.
- Validation plan:
  - `pnpm docs:workboard:generate`
  - `pnpm docs:sync`
  - `pnpm governance:refresh`
  - `pnpm planning:db:reset -- --confirm-destroy-shared-planning-db`
  - `pnpm planning:db:operate`
  - `pnpm test:planning:db`
  - `pnpm test:planning:db:integration`
  - `pnpm docs:feature-mechanization --feature GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT`
  - `pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - `pnpm docs:feature-mechanization:implementation`
  - `pnpm verify:prepush`
- Test coverage plan:
  - docs/planning governance slice; validation is through generated docs,
    governance refresh, planning/governance query-store tests, feature
    mechanization, and the pre-push gate.
- Libraries evaluated:
  - None evaluated - no custom implementation.
- Command/query rail impact:
  - no new rail added;
  - reused `RefreshGovernanceDerivedSurfaces`,
    `QuerySystemGovernanceGenerationWorkflow`, and
    `ValidateSystemGovernanceGenerationWorkflow` from the CI governance
    component;
  - reused `ManagePlanningQueryStoreRuntime` for the safe shared-DB reset route;
  - reused query-store rails in the planning/governance query-store plan.

## Final Closeout

### Governing sources used

- `AGENTS.md`
- `docs/planning/status/governance-document-rule-inventory.md`
- `docs/guides/ai-work-protocol.md`
- `docs/planning/state/planning-control-tower.md`
- `docs/planning/state/how-to-add-tasks.md`
- `docs/architecture/command-query-rail-governance.md`
- `docs/architecture/fowler-opportunity-planning-governance.md`
- `docs/planning/proposals/mandatory/governance-and-docs/doc-driven-framework-and-tooling-plan-20260404.md`
- `docs/planning/proposals/mandatory/governance-and-docs/planning-state-query-store-plan-20260506.md`
- `docs/architecture/components/ci-governance/system-governance-generation-workflow-component.md`

### Real work performed

- accepted and closed the `GOV-S2` doc-driven framework proposal;
- added an explicit `GOV-S2` non-duplication decision that keeps `GOV-S3` as a
  derived query-store path, not a parallel authority;
- added feature mechanization for
  `GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT`;
- updated `GOV-S2` in Lane A to `done`, `100%`, and refreshed its evidence
  references and lane weighted progress;
- updated the domain status board so closed governance umbrellas no longer
  appear as active blockers;
- updated the documentation IA status page so residual historical metadata work
  routes through concrete follow-up tasks rather than reopening `GOV-S2`;
- updated the query-store plan to mark refresh/check step 7 implemented and
  add step 8 for DB-first local operations under GOV-S3;
- corrected the query-store boundary so `GOV-S3` now owns DB-first local
  operation, task claims, revisions, and audit rows instead of only file-derived
  read queries;
- hardened `planning:db:operate` so default idempotency keys include the
  command payload and explicit idempotency-key replays fail closed when the
  operation shape differs;
- hardened `planning:db:operate` QA replay checks so PostgreSQL `jsonb` payload
  key ordering cannot make an identical idempotent replay fail falsely;
- hardened stale idempotent replays so reusing an old key after the task has
  advanced fails closed instead of silently returning an obsolete no-op;
- added `planning:db:reset -- --confirm-destroy-shared-planning-db` as the
  safe shared-volume repair route for stale applied migration checksums;
- hardened reset execution so it starts Compose, waits for readiness before
  backup, backs up local operation rows when present, resets only the validated
  `postgres-data` directory, and waits for readiness after the final start;
- refreshed generated governance indexes, fingerprints, coverage, remediation,
  and docs manifest outputs.

### Validation evidence

- `pnpm docs:workboard:generate` - passed.
- `pnpm docs:sync` - passed.
- `pnpm planning:db:health` - passed; the default local Postgres was accepting
  connections.
- `pnpm governance:refresh` - first run against the default persistent local DB
  failed because that DB had an older applied checksum for
  `001_content_read_model`.
- `pnpm planning:db:reset -- --confirm-destroy-shared-planning-db` - initial
  implementation failed when the container was down before backup; fixed by
  starting Compose and waiting for Postgres readiness before backup and after
  final start.
- `pnpm planning:db:reset -- --confirm-destroy-shared-planning-db` - passed
  after hardening; no local operation rows existed to back up, and
  `C:\dvt\planning-db\postgres-data` was recreated.
- `pnpm test:planning:db:integration` - passed, 2/2 live Postgres tests,
  proving Git-count parity and preservation of local operation audit rows across
  file imports.
- `pnpm test:planning:db` - passed, 40/40 tests.
- `node --test scripts/planning-db-operate.test.cjs` - passed during QA after
  adding the replay regression tests, 11/11 tests.
- `pnpm governance:refresh` - passed against the shared local DB after reset,
  importing 5 lanes, 329 tasks, 4294 governance files, 32 governance components,
  and 43 governance remediation tasks, with `planning:db:check` and
  `governance:db:check` OK.
- `pnpm docs:feature-mechanization --feature GOV-S2-DOC-DRIVEN-FRAMEWORK-CLOSEOUT`
  - passed.
- `pnpm docs:feature-mechanization --feature GOV-S3-PLANNING-STATE-QUERY-STORE`
  - passed.
- `pnpm docs:feature-mechanization:implementation` - initially failed until the
  new `GOV-S2` closeout manifest declared the changed surfaces; passed after
  the manifest was added.
- `pnpm fix:changed` - passed after `pnpm verify:prepush` found Prettier drift
  in the changed proposal/YAML files.
- `pnpm verify:prepush` - passed after formatting and governance refresh.

### No-debt evidence

- no new debt entry was created;
- no rule, hook, validation, or quality gate was disabled or relaxed;
- no `--no-verify` or equivalent bypass was used;
- the failed default-DB refresh was resolved through the governed reset command,
  not by mutating migration history or hand-editing
  `planning_query_store.schema_migrations`.

### No-stub evidence

- no stub, placeholder, fake implementation, TODO, or unfinished runtime branch
  was added;
- the query store remains explicitly derived from Git-tracked governance and
  planning sources;
- remaining query-store export, compaction, and optional mirror work is named as
  future concrete GOV-S3 follow-up, not hidden inside `GOV-S2`.
