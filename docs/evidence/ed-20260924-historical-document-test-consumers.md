---
title: Historical document consumer retirement validation
status: Draft
date: 2026-09-24
owners:
  - Architecture / Docs
arc_level: ARC-2
breaking: false
code_refs:
  - apps/web/src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresRunEventRetentionPolicy.architecture.test.ts
  - packages/@dvt/adapter-postgres/test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/dbt-core-decoupling.architecture.test.ts
  - packages/@dvt/adapter-temporal/test/workflow-component-semantics.architecture.test.ts
  - packages/@dvt/contracts/test/plan-admission-matrix.architecture.test.ts
  - packages/@dvt/engine/test/architecture/enginePublicApiSurface.architecture.test.ts
  - packages/@dvt/engine/test/architecture/planSchemaVersionAdmission.architecture.test.ts
  - packages/@dvt/engine/test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineBoundaryFitness.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineFacadeUseCases.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts
  - packages/@dvt/engine/test/architecture/workflowEngineSemanticClosure.architecture.test.ts
  - packages/@dvt/plan-verifier/test/planVersionAdmission.architecture.test.ts
  - tools/ci/docs-disposition-canon.test.mjs
  - docs/risk-register/quality/r-20260311-g5-4-operability-and-fencing-residuals.md#risk-r-20260924-historical-document-test-consumers
evidence:
  tests:
    - 'pnpm --dir packages/@dvt/adapter-postgres exec vitest run test/PostgresRunEventRetentionPolicy.architecture.test.ts test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts'
    - 'pnpm --dir packages/@dvt/adapter-temporal exec vitest run test/dbt-core-decoupling.architecture.test.ts test/workflow-component-semantics.architecture.test.ts'
    - 'pnpm --dir packages/@dvt/contracts exec vitest run test/plan-admission-matrix.architecture.test.ts'
    - 'pnpm --dir packages/@dvt/engine exec vitest run test/architecture/enginePublicApiSurface.architecture.test.ts test/architecture/planSchemaVersionAdmission.architecture.test.ts test/architecture/startRunApplicationDecompositionDocs.architecture.test.ts test/architecture/workflowEngineBoundaryFitness.architecture.test.ts test/architecture/workflowEngineBoundaryOwnership.architecture.test.ts test/architecture/workflowEngineFacadeUseCases.architecture.test.ts test/architecture/workflowEngineProviderTelemetrySeams.architecture.test.ts test/architecture/workflowEngineSemanticClosure.architecture.test.ts'
    - 'pnpm --dir packages/@dvt/plan-verifier exec vitest run test/planVersionAdmission.architecture.test.ts'
    - 'pnpm --dir apps/web exec vitest run --config vitest.architecture.config.ts src/app/views/canvas/canvasStartupBootstrapPublication.architecture.test.ts'
    - 'pnpm --dir apps/web exec vitest run --config vitest.architecture.config.ts src/testing/vitestSuites.architecture.test.ts src/testing/vitestSuites.changedRouting.architecture.test.ts src/testing/vitestSuites.changedRoutingGovernance.architecture.test.ts src/testing/vitestSuites.catalog.architecture.test.ts'
    - 'pnpm test:contracts'
    - 'pnpm --filter @dvt/contracts run schema:verify'
    - 'pnpm validate:contracts'
    - 'node --test scripts/check-feature-mechanization.test.cjs scripts/documentation-publication.test.cjs scripts/planning-db-import.test.cjs scripts/planning-db-operate-tests/fowler-analysis.test.cjs scripts/planning-db-surface-inventory-check.test.cjs tools/ci/docs-disposition-canon.test.mjs tools/ci/startup-card-canon.test.mjs tools/ci/planner-package-governance.test.mjs tools/ci/architecture-doc-reconciliation-canon.test.mjs scripts/governance-refresh.test.cjs tools/ci/github-collaboration-governance.test.mjs'
    - 'pnpm test:ci-tools:static'
    - 'pnpm test:ci-tools:executable'
---

# Scope

Forty-two historical delivery documents are retired after reconciling their
consumers. Existing component, scenario, contract and runtime checks remain;
requirements that merely keep obsolete reports present are replaced by checks
on current owners. Two report-only cases now check active admission surface
existence and capacity-policy guide linkage. No runtime implementation changes.

# Executed validation

The commands above completed successfully on `b65b2f33c156fe33f39794c30758daa5d56c7035`. This is the
implementation commit before adding this required ARC record and its risk entry.
The final PR contains separately attributable final-head prepush and artifact
validation. Results are not silently transferred across commits.

# Acceptance limits

No operated Planning DB acceptance, independent review, live browser acceptance,
or deployment is claimed. Disposable CI bootstrap does not validate operated
architecture relationships. Historical test results in retained evidence stay
literal; no product risk is closed by retiring a report.

# Residual risk

[R-20260924-HISTORICAL-DOCUMENT-TEST-CONSUMERS](../risk-register/quality/r-20260311-g5-4-operability-and-fencing-residuals.md#risk-r-20260924-historical-document-test-consumers)
tracks regression and unreconciled operational relationship risk.

# Follow-up: consumers left behind by PR #3489 (2026-10-02)

This follow-up does not reattribute the historical results above. Its baseline is
`0693e5392e68025dbd66372cad92a8c7c4e90d48`; its hook-normalized test change is
`b8607940674770e7995b31eaf31c2ed4219a33da`. The complete diff evaluator reports
ARC-2 because the PostgreSQL adapter test is affected, with evidence and risk
updates required; no rollout note or compatibility matrix is required.

The [design and retirement rationale](https://github.com/dunay2/dvt/issues/2925#issuecomment-5956744219)
preceded implementation. The main PostgreSQL job had 304 passing tests and one
proposal-presence failure; the main Web architecture run had 25 failures in
16 files caused by deleted proposals, while unit and presentation tests passed.

Only test consumers change: sixteen Web architecture guards, their shared alpha
fixture and one PostgreSQL architecture guard. Retired proposal reads and
report-heading assertions are removed; current component, contract, source,
scenario and negative assertions remain. The two alpha evidence references were
test-only historical links; all seventeen alpha acceptance/rejection cases,
the nine rails, evaluator and file-existence validation remain. PostgreSQL
retains five component architecture cases and all nine rollback behavior cases.
No product implementation, database schema or data changes.

Validation performed for this test change:

- Focused Web architecture execution: 16 files, 68 cases passed. Web lint and
  typecheck passed after canonical dependency preparation. An initial typecheck
  correctly failed on two missing build outputs in the fresh worktree; preparing
  those dependencies resolved it without changing types or rules.
- `pnpm --dir packages/@dvt/adapter-postgres exec vitest run --config vitest.config.ts test/PostgresSchemaRollbackZeroDowntime.architecture.test.ts test/PostgresSchemaManager.rollback.test.ts`:
  14 cases passed; package ESLint and TypeScript checking passed.
- `pnpm --filter @dvt/contracts run schema:verify`: 25 cases passed.
- `pnpm validate:contracts`: three plan fixtures, 24 checks passed. The command
  reported its existing missing optional glossary/result artifact; this does not
  constitute a live golden-path execution or new evidence for those artifacts.
- Effective Planning DB implementation-surface and symbol checks passed before
  commit; no authority write or projection rebuild was needed for this follow-up.
- Independent inspection confirmed the alpha fixture has no product consumers.

The final documentation commit, exact base/head implementation gate, pre-push
and CI results are recorded in the implementation PR linked from issue #2925.
These initial focused results do not claim that a later candidate already passed
those gates. No test bypass, relaxed rule, added stub or new debt is introduced.

## 2026-10-14 — Consolidated acceptance scenarios

Issue #3643 consolidates 84 standalone scenario pages and 16 auxiliary domain
pages into their existing component or domain owners. The 100 source paths are
removed; their substantive requirements, scenario identifiers, negative cases,
and diagrams remain in the owning guide. This is content-preserving consolidation,
not disposal of 100 behavioral obligations.

The path-only test-reader changes retain all existing test cases and assertions.
The lineage-index assertion now checks the specific acceptance-section link.
Consolidation exposed inherited task-routing prose: its references to Planning DB
tasks were reconciled to GitHub issues under ADR-0061, without changing the
Planning DB authority for architecture and mechanization.

Validation commands and exact base/head results are recorded in issue #3643 and
the implementation PR. Full prepush and DB-backed synchronization remain explicit
acceptance facts, not inferred from routed CI. Existing Open risks remain Open.

Automated review identified a polarity regression in the planning acceptance
criterion. The correction explicitly keeps GitHub issue commands accepted and
rejects database-owned delivery-task commands. A focused regression test covers
both directions. Three adjacent imported delivery-queue sentences were also
reconciled to ADR-0061; these corrections do not change architecture ownership.

## 2026-10-14 — Manuals and orphan visual receipts

The next #3643 cut colocates 60 manuals and component references in 28 existing
owning guides and removes 40 unconsumed historical PNG receipts. The image
removals are counted separately from text-document consolidation. They have no
tracked filename or directory consumer and no direct open-issue reference.

Inherited scenario anchors remain valid. Scope/ownership sections stay distinct;
colocation does not combine runtime responsibilities. Existing Top App Bar prose
is reconciled to server-granted scope and the persisted application-language
preference. No runtime or authorization behavior changes. Historical executed
command strings remain byte-for-byte as originally recorded; active reference
paths and future evidence-generation inputs use the current owning guides.

The PR records source-to-section mappings, content preservation, actual tests,
and the continuing Planning DB/scope-validation obligations.

The Web-store guard keeps its overview/detail separation checks against two
explicit sections of the colocated guide. It asserts exactly one boundary and
nonempty content on both sides before running all original positive/negative
checks. This retains semantic separation without requiring two physical files.
