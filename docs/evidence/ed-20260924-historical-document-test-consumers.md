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
  - docs/risk-register/quality/r-20260924-historical-document-test-consumers.yaml
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

[R-20260924-HISTORICAL-DOCUMENT-TEST-CONSUMERS](../risk-register/quality/r-20260924-historical-document-test-consumers.yaml)
tracks regression and unreconciled operational relationship risk.
