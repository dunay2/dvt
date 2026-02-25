# Árbol completo del repositorio DVT (salvo `node_modules` y `dist`)

./
├─ CHANGELOG.md
├─ CLAUDE.md
├─ commitlint.config.cjs
├─ CONTRIBUTING.md
├─ dev.sh
├─ docker-compose.neo4j.yml
├─ eslint.config.cjs
├─ package.json
├─ pnpm-lock.yaml
├─ pnpm-workspace.yaml
├─ README.md
├─ ROADMAP.md
├─ tsconfig.base.json
├─ tsconfig.eslint.base.json
├─ tsconfig.json
├─ tsconfig.test.json
├─ vitest.config.ts
├─ PROJECT_STRUCTURE.md
├─ docs/
│ ├─ PROJECT_STRUCTURE.md
│ ├─ ARCHITECTURE_ANALYSIS.md
│ ├─ CAPABILITY_VERSIONING.md
│ ├─ CONTRACTS_AUTOMATION_INDEX.md
│ ├─ CONTRIBUTING.md
│ ├─ ExecutionSemantics.v1.md
│ ├─ INDEX.md
│ ├─ REPO_STRUCTURE_SUMMARY.md
│ ├─ architecture/
│ │ ├─ ARCHITECTURE_DIAGRAMS.mmd
│ │ ├─ engine/
│ │ ├─ frontend/
│ │ └─ infra/
│ ├─ archive/
│ ├─ ci/
│ ├─ decisions/
│ │ ├─ ADR-0000-Generación de código con trazabilidad normativa obligatoria.md
│ │ ├─ ADR-0001-temporal-integration-test-policy.md
│ │ ├─ ADR-0002-neo4j-knowledge-graph-context-repository.md
│ │ ├─ ADR-0003-execution-model.md
│ │ ├─ ADR-0004-event-sourcing-strategy.md
│ │ ├─ ADR-0005-contract-formalization-tooling.md
│ │ ├─ ADR-0006-contract-tooling-governance.md
│ │ ├─ ADR-0007-temporal-retry-policy-mvp.md
│ │ ├─ ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md
│ │ └─ INDEX.md
│ ├─ guides/
│ │ ├─ AI_ISSUE_RESOLUTION_PLAYBOOK.md
│ │ ├─ QUALITY.md
│ │ └─ TECHNICAL_DEBT_REGISTER.md
│ ├─ knowledge/
│ ├─ planning/
│ ├─ proposal/
│ └─ status/
├─ infra/
│ ├─ README.md
│ └─ docker/
├─ runbooks/
│ └─ WORKFLOW_ISOLATION_TESTING.md
├─ scripts/
│ ├─ README.md
│ ├─ check-changed.cjs
│ ├─ compare-hashes.cjs
│ ├─ db-migrate.cjs
│ ├─ enable-workflow.sh
│ ├─ generate-contract-index.cjs
│ ├─ run-golden-paths.cjs
│ ├─ validate-contracts.cjs
│ ├─ validate-executable-examples.cjs
│ ├─ validate-glossary-usage.cjs
│ ├─ validate-idempotency-vectors.cjs
│ ├─ validate-references.cjs
│ ├─ validate-rfc2119.cjs
│ └─ neo4j/
├─ .gh-comments/
├─ .github/
│ └─ workflows/
│ ├─ contracts.yml
│ ├─ test.yml
│ ├─ lint.yml
│ └─ determinism.yml
├─ .husky/
├─ .eslintrc.json
├─ apps/
│ ├─ api/
│ │ ├─ Dockerfile
│ │ ├─ nixpacks.toml
│ │ ├─ package.json
│ │ ├─ Procfile
│ │ ├─ README.md
│ │ ├─ tsconfig.json
│ │ └─ src/
│ └─ web/
│ ├─ ATTRIBUTIONS.md
│ ├─ "cambios barra.txt"
│ ├─ DVT_GRAPH_CANVAS_UX_OPTIMIZATION.md
│ ├─ FRONTEND_PLAN_BACK_ALIGNMENT.md
│ ├─ FRONTEND_SPRINT_PLAN_TAREAS_RIESGOS.md
│ ├─ index.html
│ ├─ package.json
│ ├─ postcss.config.mjs
│ ├─ README.md
│ ├─ tsconfig.json
│ ├─ vite.config.ts
│ ├─ favicon/
│ ├─ guidelines/
│ └─ src/
├─ packages/
│ ├─ adapter-postgres/
│ │ ├─ package.json
│ │ ├─ src/
│ │ │ └─ PostgresStateStoreAdapter.ts
│ │ ├─ test/
│ │ └─ dist/
│ ├─ adapter-temporal/
│ │ ├─ src/
│ │ │ ├─ workflows/
│ │ │ │ └─ RunPlanWorkflow.ts
│ │ │ └─ activities/
│ │ ├─ test/
│ │ └─ dist/
│ ├─ adapters-legacy/
│ │ ├─ postgres/
│ │ └─ test/
│ ├─ cli/
│ │ └─ validate-contracts.cjs
│ ├─ contracts/
│ │ ├─ package.json
│ │ ├─ src/
│ │ │ ├─ schemas.ts
│ │ │ ├─ validation.ts
│ │ │ └─ types/
│ │ ├─ test/
│ │ └─ dist/
│ └─ engine/
│ ├─ package.json
│ ├─ src/
│ │ ├─ core/
│ │ │ └─ WorkflowEngine.ts
│ │ ├─ adapters/
│ │ └─ contracts/
│ ├─ test/
│ └─ dist/
└─ apps/web/src/
├─ app/
│ ├─ components/
│ ├─ views/
│ └─ ui/
└─ other frontend files

Notes:

- Omitidos intencionalmente: `node_modules/`, `dist/` build outputs y ficheros temporales.
- Este árbol se generó a partir del estado del workspace provisto y resume la estructura y ficheros clave.
