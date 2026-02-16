// GENERATED FILE - DO NOT EDIT MANUALLY
// Source: scripts/neo4j/neo4j-generate-cypher.cjs
// ADR-0002 Phase 2: dynamic KG Cypher generation from repository metadata

// Schema constraints
CREATE CONSTRAINT modulo_path_unique IF NOT EXISTS FOR (m:Modulo) REQUIRE m.path IS UNIQUE;
CREATE CONSTRAINT archivo_path_unique IF NOT EXISTS FOR (a:Archivo) REQUIRE a.path IS UNIQUE;
CREATE CONSTRAINT issue_key_unique IF NOT EXISTS FOR (i:Issue) REQUIRE i.key IS UNIQUE;
CREATE CONSTRAINT decision_id_unique IF NOT EXISTS FOR (d:Decision) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT funcion_key_unique IF NOT EXISTS FOR (f:Funcion) REQUIRE f.key IS UNIQUE;
CREATE CONSTRAINT roadmap_id_unique IF NOT EXISTS FOR (r:Roadmap) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT fase_roadmap_id_unique IF NOT EXISTS FOR (p:FaseRoadmap) REQUIRE p.id IS UNIQUE;

// Modules + files
MERGE (m:Modulo { path: '.editorconfig' })
SET m += { nombre: '.editorconfig', lenguaje: 'text' }
MERGE (a:Archivo { path: '.editorconfig' })
SET a += { nombre: '.editorconfig', tipo: 'none', bytes: 571, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.eslintrc.json' })
SET m += { nombre: '.eslintrc.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.eslintrc.json' })
SET a += { nombre: '.eslintrc.json', tipo: 'json', bytes: 3806, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/create_backlog_v2_github.ps1' })
SET m += { nombre: 'create_backlog_v2_github.ps1', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gh-comments/create_backlog_v2_github.ps1' })
SET a += { nombre: 'create_backlog_v2_github.ps1', tipo: 'ps1', bytes: 7569, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/create_frontend_backlog_github.ps1' })
SET m += { nombre: 'create_frontend_backlog_github.ps1', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gh-comments/create_frontend_backlog_github.ps1' })
SET a += { nombre: 'create_frontend_backlog_github.ps1', tipo: 'ps1', bytes: 7579, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/issue-117-prebrief.md' })
SET m += { nombre: 'issue-117-prebrief.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/issue-117-prebrief.md' })
SET a += { nombre: 'issue-117-prebrief.md', tipo: 'md', bytes: 1603, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/issue-14-status-refresh-2026-02-15.md' })
SET m += { nombre: 'issue-14-status-refresh-2026-02-15.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/issue-14-status-refresh-2026-02-15.md' })
SET a += { nombre: 'issue-14-status-refresh-2026-02-15.md', tipo: 'md', bytes: 990, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/issue-9-prebrief.md' })
SET m += { nombre: 'issue-9-prebrief.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/issue-9-prebrief.md' })
SET a += { nombre: 'issue-9-prebrief.md', tipo: 'md', bytes: 1915, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/normalize_issues_v2.ps1' })
SET m += { nombre: 'normalize_issues_v2.ps1', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gh-comments/normalize_issues_v2.ps1' })
SET a += { nombre: 'normalize_issues_v2.ps1', tipo: 'ps1', bytes: 5477, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-117.md' })
SET m += { nombre: 'pr-117.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-117.md' })
SET a += { nombre: 'pr-117.md', tipo: 'md', bytes: 1319, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-9.md' })
SET m += { nombre: 'pr-9.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-9.md' })
SET a += { nombre: 'pr-9.md', tipo: 'md', bytes: 1431, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
SET m += { nombre: 'pr-roadmap-status-refresh-2026-02-15.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
SET a += { nombre: 'pr-roadmap-status-refresh-2026-02-15.md', tipo: 'md', bytes: 855, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/vuelossssss.txt' })
SET m += { nombre: 'vuelossssss.txt', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gh-comments/vuelossssss.txt' })
SET a += { nombre: 'vuelossssss.txt', tipo: 'txt', bytes: 75330, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/CODEOWNERS' })
SET m += { nombre: 'CODEOWNERS', lenguaje: 'text' }
MERGE (a:Archivo { path: '.github/CODEOWNERS' })
SET a += { nombre: 'CODEOWNERS', tipo: 'none', bytes: 3632, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/COMMIT_CONVENTION.md' })
SET m += { nombre: 'COMMIT_CONVENTION.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/COMMIT_CONVENTION.md' })
SET a += { nombre: 'COMMIT_CONVENTION.md', tipo: 'md', bytes: 3173, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_MONOREPO_REFACTOR.md' })
SET m += { nombre: 'ISSUE_MONOREPO_REFACTOR.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ISSUE_MONOREPO_REFACTOR.md' })
SET a += { nombre: 'ISSUE_MONOREPO_REFACTOR.md', tipo: 'md', bytes: 1247, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/bug_report.yml' })
SET a += { nombre: 'bug_report.yml', tipo: 'yml', bytes: 3862, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/config.yml' })
SET a += { nombre: 'config.yml', tipo: 'yml', bytes: 311, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/contract_proposal.yml' })
SET a += { nombre: 'contract_proposal.yml', tipo: 'yml', bytes: 4986, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/feature_request.yml' })
SET a += { nombre: 'feature_request.yml', tipo: 'yml', bytes: 3298, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/fix-determinism-sequenceclock-datefree.md' })
SET a += { nombre: 'fix-determinism-sequenceclock-datefree.md', tipo: 'md', bytes: 1664, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/refactor-monorepo.md' })
SET a += { nombre: 'refactor-monorepo.md', tipo: 'md', bytes: 1458, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/security_threat_model_update.md' })
SET a += { nombre: 'security_threat_model_update.md', tipo: 'md', bytes: 4182, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_refactor_monorepo_OptionA.md' })
SET m += { nombre: 'ISSUE_refactor_monorepo_OptionA.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ISSUE_refactor_monorepo_OptionA.md' })
SET a += { nombre: 'ISSUE_refactor_monorepo_OptionA.md', tipo: 'md', bytes: 1032, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/MIGRATION_GUIDE.md' })
SET m += { nombre: 'MIGRATION_GUIDE.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/MIGRATION_GUIDE.md' })
SET a += { nombre: 'MIGRATION_GUIDE.md', tipo: 'md', bytes: 15294, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/PR_BODY.md' })
SET m += { nombre: 'PR_BODY.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/PR_BODY.md' })
SET a += { nombre: 'PR_BODY.md', tipo: 'md', bytes: 5277, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/PR_INSTRUCTIONS.md' })
SET m += { nombre: 'PR_INSTRUCTIONS.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/PR_INSTRUCTIONS.md' })
SET a += { nombre: 'PR_INSTRUCTIONS.md', tipo: 'md', bytes: 12690, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/PR_TEMPLATE.md' })
SET m += { nombre: 'PR_TEMPLATE.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/PR_TEMPLATE.md' })
SET a += { nombre: 'PR_TEMPLATE.md', tipo: 'md', bytes: 19418, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ROLLBACK.md' })
SET m += { nombre: 'ROLLBACK.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ROLLBACK.md' })
SET a += { nombre: 'ROLLBACK.md', tipo: 'md', bytes: 11394, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/dependabot.yml' })
SET m += { nombre: 'dependabot.yml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/dependabot.yml' })
SET a += { nombre: 'dependabot.yml', tipo: 'yml', bytes: 1573, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/labeler.yml' })
SET m += { nombre: 'labeler.yml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/labeler.yml' })
SET a += { nombre: 'labeler.yml', tipo: 'yml', bytes: 2130, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/scripts' })
SET m += { nombre: 'scripts', lenguaje: 'text' }
MERGE (a:Archivo { path: '.github/scripts/generate_pr_manifest.sh' })
SET a += { nombre: 'generate_pr_manifest.sh', tipo: 'sh', bytes: 2368, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/ci.yml' })
SET a += { nombre: 'ci.yml', tipo: 'yml', bytes: 3262, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/contracts.yml' })
SET a += { nombre: 'contracts.yml', tipo: 'yml', bytes: 13313, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/create-labels.yml' })
SET a += { nombre: 'create-labels.yml', tipo: 'yml', bytes: 957, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/golden-paths.yml' })
SET a += { nombre: 'golden-paths.yml', tipo: 'yml', bytes: 1764, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/pr-quality-gate.yml' })
SET a += { nombre: 'pr-quality-gate.yml', tipo: 'yml', bytes: 7355, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/release.yml' })
SET a += { nombre: 'release.yml', tipo: 'yml', bytes: 1229, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/test.yml' })
SET a += { nombre: 'test.yml', tipo: 'yml', bytes: 8528, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gitignore' })
SET m += { nombre: '.gitignore', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gitignore' })
SET a += { nombre: '.gitignore', tipo: 'none', bytes: 875, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.golden/README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.golden/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 3569, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.golden/hashes.json' })
SET m += { nombre: 'hashes.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.golden/hashes.json' })
SET a += { nombre: 'hashes.json', tipo: 'json', bytes: 2626, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.husky/commit-msg' })
SET m += { nombre: 'commit-msg', lenguaje: 'text' }
MERGE (a:Archivo { path: '.husky/commit-msg' })
SET a += { nombre: 'commit-msg', tipo: 'none', bytes: 36, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.husky/pre-commit' })
SET m += { nombre: 'pre-commit', lenguaje: 'text' }
MERGE (a:Archivo { path: '.husky/pre-commit' })
SET a += { nombre: 'pre-commit', tipo: 'none', bytes: 20, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.husky/pre-push' })
SET m += { nombre: 'pre-push', lenguaje: 'text' }
MERGE (a:Archivo { path: '.husky/pre-push' })
SET a += { nombre: 'pre-push', tipo: 'none', bytes: 89, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.markdownlint.json' })
SET m += { nombre: '.markdownlint.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.markdownlint.json' })
SET a += { nombre: '.markdownlint.json', tipo: 'json', bytes: 238, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.markdownlintignore' })
SET m += { nombre: '.markdownlintignore', lenguaje: 'text' }
MERGE (a:Archivo { path: '.markdownlintignore' })
SET a += { nombre: '.markdownlintignore', tipo: 'none', bytes: 114, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.prettierignore' })
SET m += { nombre: '.prettierignore', lenguaje: 'text' }
MERGE (a:Archivo { path: '.prettierignore' })
SET a += { nombre: '.prettierignore', tipo: 'none', bytes: 260, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.prettierrc.json' })
SET m += { nombre: '.prettierrc.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.prettierrc.json' })
SET a += { nombre: '.prettierrc.json', tipo: 'json', bytes: 431, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.versionrc.json' })
SET m += { nombre: '.versionrc.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.versionrc.json' })
SET a += { nombre: '.versionrc.json', tipo: 'json', bytes: 1786, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'CHANGELOG.md' })
SET m += { nombre: 'CHANGELOG.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'CHANGELOG.md' })
SET a += { nombre: 'CHANGELOG.md', tipo: 'md', bytes: 16275, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'CLAUDE.md' })
SET m += { nombre: 'CLAUDE.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'CLAUDE.md' })
SET a += { nombre: 'CLAUDE.md', tipo: 'md', bytes: 1706, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'CONTRIBUTING.md' })
SET m += { nombre: 'CONTRIBUTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'CONTRIBUTING.md' })
SET a += { nombre: 'CONTRIBUTING.md', tipo: 'md', bytes: 534, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 6907, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'ROADMAP.md' })
SET m += { nombre: 'ROADMAP.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'ROADMAP.md' })
SET a += { nombre: 'ROADMAP.md', tipo: 'md', bytes: 23241, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'commitlint.config.cjs' })
SET m += { nombre: 'commitlint.config.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'commitlint.config.cjs' })
SET a += { nombre: 'commitlint.config.cjs', tipo: 'cjs', bytes: 851, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'dev.sh' })
SET m += { nombre: 'dev.sh', lenguaje: 'text' }
MERGE (a:Archivo { path: 'dev.sh' })
SET a += { nombre: 'dev.sh', tipo: 'sh', bytes: 3782, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docker-compose.neo4j.yml' })
SET m += { nombre: 'docker-compose.neo4j.yml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'docker-compose.neo4j.yml' })
SET a += { nombre: 'docker-compose.neo4j.yml', tipo: 'yml', bytes: 539, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/ARCHITECTURE_ANALYSIS.md' })
SET m += { nombre: 'ARCHITECTURE_ANALYSIS.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/ARCHITECTURE_ANALYSIS.md' })
SET a += { nombre: 'ARCHITECTURE_ANALYSIS.md', tipo: 'md', bytes: 4401, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/CAPABILITY_VERSIONING.md' })
SET m += { nombre: 'CAPABILITY_VERSIONING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CAPABILITY_VERSIONING.md' })
SET a += { nombre: 'CAPABILITY_VERSIONING.md', tipo: 'md', bytes: 2071, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/CONTRACTS_AUTOMATION_INDEX.md' })
SET m += { nombre: 'CONTRACTS_AUTOMATION_INDEX.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CONTRACTS_AUTOMATION_INDEX.md' })
SET a += { nombre: 'CONTRACTS_AUTOMATION_INDEX.md', tipo: 'md', bytes: 2585, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/CONTRIBUTING.md' })
SET m += { nombre: 'CONTRIBUTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CONTRIBUTING.md' })
SET a += { nombre: 'CONTRIBUTING.md', tipo: 'md', bytes: 18005, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/ExecutionSemantics.v1.md' })
SET m += { nombre: 'ExecutionSemantics.v1.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/ExecutionSemantics.v1.md' })
SET a += { nombre: 'ExecutionSemantics.v1.md', tipo: 'md', bytes: 601, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/INDEX.md' })
SET m += { nombre: 'INDEX.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 2555, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/REPO_STRUCTURE_SUMMARY.md' })
SET m += { nombre: 'REPO_STRUCTURE_SUMMARY.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/REPO_STRUCTURE_SUMMARY.md' })
SET a += { nombre: 'REPO_STRUCTURE_SUMMARY.md', tipo: 'md', bytes: 3850, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/ARCHITECTURE_DIAGRAMS.mmd' })
SET a += { nombre: 'ARCHITECTURE_DIAGRAMS.mmd', tipo: 'mmd', bytes: 3321, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 23795, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/PHASE2_PROJECTOR_ENGINE_CONTRACTS.md' })
SET a += { nombre: 'PHASE2_PROJECTOR_ENGINE_CONTRACTS.md', tipo: 'md', bytes: 8059, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/VERSIONING.md' })
SET a += { nombre: 'VERSIONING.md', tipo: 'md', bytes: 18649, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/adapters/conductor/ConductorAdapter.spec.md' })
SET a += { nombre: 'ConductorAdapter.spec.md', tipo: 'md', bytes: 11749, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/adapters/state-store/postgres/StateStoreAdapter.md' })
SET a += { nombre: 'StateStoreAdapter.md', tipo: 'md', bytes: 9879, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/adapters/state-store/snowflake/StateStoreAdapter.md' })
SET a += { nombre: 'StateStoreAdapter.md', tipo: 'md', bytes: 15153, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/adapters/temporal/EnginePolicies.md' })
SET a += { nombre: 'EnginePolicies.md', tipo: 'md', bytes: 10101, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md' })
SET a += { nombre: 'TemporalAdapter.spec.md', tipo: 'md', bytes: 16431, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/CONTRACT_TEMPLATE.v1.md' })
SET a += { nombre: 'CONTRACT_TEMPLATE.v1.md', tipo: 'md', bytes: 1545, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/DECISION_AND_RISK_LOG_v2.0.0.md' })
SET a += { nombre: 'DECISION_AND_RISK_LOG_v2.0.0.md', tipo: 'md', bytes: 3183, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/MIGRATION_v1.1.1_to_v2.0.0.md' })
SET a += { nombre: 'MIGRATION_v1.1.1_to_v2.0.0.md', tipo: 'md', bytes: 5023, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 7352, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 4980, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/adapters.capabilities.json' })
SET a += { nombre: 'adapters.capabilities.json', tipo: 'json', bytes: 2659, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/capabilities.schema.json' })
SET a += { nombre: 'capabilities.schema.json', tipo: 'json', bytes: 3954, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/validation-report.schema.json' })
SET a += { nombre: 'validation-report.schema.json', tipo: 'json', bytes: 2979, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/AgnosticEventLayerStrategy.v2.0.1.md' })
SET a += { nombre: 'AgnosticEventLayerStrategy.v2.0.1.md', tipo: 'md', bytes: 2264, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md' })
SET a += { nombre: 'ExecutionSemantics.v1.md', tipo: 'md', bytes: 37833, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/ExecutionSemantics.v2.0.md' })
SET a += { nombre: 'ExecutionSemantics.v2.0.md', tipo: 'md', bytes: 3348, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/GlossaryContract.v1.md' })
SET a += { nombre: 'GlossaryContract.v1.md', tipo: 'md', bytes: 13227, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/GlossaryContract.v2.0.md' })
SET a += { nombre: 'GlossaryContract.v2.0.md', tipo: 'md', bytes: 3407, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.reference.v1.md' })
SET a += { nombre: 'IWorkflowEngine.reference.v1.md', tipo: 'md', bytes: 18483, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md' })
SET a += { nombre: 'IWorkflowEngine.v1.md', tipo: 'md', bytes: 4404, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.v2.0.md' })
SET a += { nombre: 'IWorkflowEngine.v2.0.md', tipo: 'md', bytes: 2906, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/PlanIntegrityAndPause.v1.md' })
SET a += { nombre: 'PlanIntegrityAndPause.v1.md', tipo: 'md', bytes: 2888, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEventCatalog.v1.md' })
SET a += { nombre: 'RunEventCatalog.v1.md', tipo: 'md', bytes: 1442, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEvents.v1.md' })
SET a += { nombre: 'RunEvents.v1.md', tipo: 'md', bytes: 16977, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEvents.v2.0.md' })
SET a += { nombre: 'RunEvents.v2.0.md', tipo: 'md', bytes: 22070, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.md' })
SET a += { nombre: 'SignalsAndAuth.v1.md', tipo: 'md', bytes: 18492, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/RunEventRecord.v2.0.schema.json' })
SET a += { nombre: 'RunEventRecord.v2.0.schema.json', tipo: 'json', bytes: 555, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/RunEventWrite.v2.0.schema.json' })
SET a += { nombre: 'RunEventWrite.v2.0.schema.json', tipo: 'json', bytes: 1826, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/RunStarted.schema.json' })
SET a += { nombre: 'RunStarted.schema.json', tipo: 'json', bytes: 5329, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/StepCompleted.schema.json' })
SET a += { nombre: 'StepCompleted.schema.json', tipo: 'json', bytes: 4691, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/StepFailed.schema.json' })
SET a += { nombre: 'StepFailed.schema.json', tipo: 'json', bytes: 5666, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/StepStarted.schema.json' })
SET a += { nombre: 'StepStarted.schema.json', tipo: 'json', bytes: 3044, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/extensions/PluginSandbox.v1.md' })
SET a += { nombre: 'PluginSandbox.v1.md', tipo: 'md', bytes: 6094, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/security/AuditLog.v1.md' })
SET a += { nombre: 'AuditLog.v1.md', tipo: 'md', bytes: 12321, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/security/IAuthorization.v1.md' })
SET a += { nombre: 'IAuthorization.v1.md', tipo: 'md', bytes: 9063, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/state-store/IRunStateStore.v2.0.md' })
SET a += { nombre: 'IRunStateStore.v2.0.md', tipo: 'md', bytes: 3169, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/state-store/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 8996, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1.md' })
SET a += { nombre: 'CONTRACT_TOOLING_PROPOSAL.v1.md', tipo: 'md', bytes: 12090, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/dev/determinism-tooling.md' })
SET a += { nombre: 'determinism-tooling.md', tipo: 'md', bytes: 13491, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/engine/dvt_v2_architecture.mmd' })
SET a += { nombre: 'dvt_v2_architecture.mmd', tipo: 'mmd', bytes: 15595, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/engine/iworkflowengine.png' })
SET a += { nombre: 'iworkflowengine.png', tipo: 'png', bytes: 693472, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/ops/SLOs.md' })
SET a += { nombre: 'SLOs.md', tipo: 'md', bytes: 6048, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/ops/observability.md' })
SET a += { nombre: 'observability.md', tipo: 'md', bytes: 14815, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/ops/runbooks/incident_response.md' })
SET a += { nombre: 'incident_response.md', tipo: 'md', bytes: 15005, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/ops/runbooks/severity_matrix.md' })
SET a += { nombre: 'severity_matrix.md', tipo: 'md', bytes: 7890, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/roadmap/engine-phases.md' })
SET a += { nombre: 'engine-phases.md', tipo: 'md', bytes: 23050, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/Cancel.v1.json' })
SET a += { nombre: 'Cancel.v1.json', tipo: 'json', bytes: 307, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/EmergencyStop.v1.json' })
SET a += { nombre: 'EmergencyStop.v1.json', tipo: 'json', bytes: 420, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/EscalateAlert.v1.json' })
SET a += { nombre: 'EscalateAlert.v1.json', tipo: 'json', bytes: 443, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/InjectOverride.v1.json' })
SET a += { nombre: 'InjectOverride.v1.json', tipo: 'json', bytes: 385, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/Pause.v1.json' })
SET a += { nombre: 'Pause.v1.json', tipo: 'json', bytes: 305, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/Resume.v1.json' })
SET a += { nombre: 'Resume.v1.json', tipo: 'json', bytes: 235, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/RetryRun.v1.json' })
SET a += { nombre: 'RetryRun.v1.json', tipo: 'json', bytes: 357, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/RetryStep.v1.json' })
SET a += { nombre: 'RetryStep.v1.json', tipo: 'json', bytes: 361, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/SkipStep.v1.json' })
SET a += { nombre: 'SkipStep.v1.json', tipo: 'json', bytes: 383, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/UpdateParams.v1.json' })
SET a += { nombre: 'UpdateParams.v1.json', tipo: 'json', bytes: 321, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/schemas/signal/UpdateTarget.v1.json' })
SET a += { nombre: 'UpdateTarget.v1.json', tipo: 'json', bytes: 383, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/security/PLUGIN_PROVENANCE_POLICY.APPENDICES.md' })
SET a += { nombre: 'PLUGIN_PROVENANCE_POLICY.APPENDICES.md', tipo: 'md', bytes: 29959, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/security/PLUGIN_PROVENANCE_POLICY.v1.md' })
SET a += { nombre: 'PLUGIN_PROVENANCE_POLICY.v1.md', tipo: 'md', bytes: 16473, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/security/SECURITY_INVARIANTS.v1.md' })
SET a += { nombre: 'SECURITY_INVARIANTS.v1.md', tipo: 'md', bytes: 67602, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/security/TENANT_ISOLATION_TESTS.v1.md' })
SET a += { nombre: 'TENANT_ISOLATION_TESTS.v1.md', tipo: 'md', bytes: 49236, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/security/THREAT_MODEL.md' })
SET a += { nombre: 'THREAT_MODEL.md', tipo: 'md', bytes: 51554, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 6938, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/contracts/UI_API_CONTRACT.v1.md' })
SET a += { nombre: 'UI_API_CONTRACT.v1.md', tipo: 'md', bytes: 9548, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/contracts/VIEW_MODELS.v1.md' })
SET a += { nombre: 'VIEW_MODELS.v1.md', tipo: 'md', bytes: 7044, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/golden-paths/GOLDEN_PATHS_UI.v1.md' })
SET a += { nombre: 'GOLDEN_PATHS_UI.v1.md', tipo: 'md', bytes: 11697, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/quality/A11Y_GUIDELINES.md' })
SET a += { nombre: 'A11Y_GUIDELINES.md', tipo: 'md', bytes: 17308, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/quality/PERF_BUDGET.md' })
SET a += { nombre: 'PERF_BUDGET.md', tipo: 'md', bytes: 11791, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/quality/TEST_STRATEGY_FRONT.md' })
SET a += { nombre: 'TEST_STRATEGY_FRONT.md', tipo: 'md', bytes: 20782, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/security/AUDIT_VIEWER_UX.v1.md' })
SET a += { nombre: 'AUDIT_VIEWER_UX.v1.md', tipo: 'md', bytes: 15973, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/frontend/security/RBAC_UI_RULES.v1.md' })
SET a += { nombre: 'RBAC_UI_RULES.v1.md', tipo: 'md', bytes: 12785, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/archive' })
SET m += { nombre: 'archive', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/archive/ci/CI_ISOLATION_STRATEGY.md' })
SET a += { nombre: 'CI_ISOLATION_STRATEGY.md', tipo: 'md', bytes: 714, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/archive' })
SET m += { nombre: 'archive', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/archive/ci/WORKFLOW_ISOLATION_TESTING.md' })
SET a += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', tipo: 'md', bytes: 3474, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0000-Generación de código con trazabilidad normativa obligatoria.md' })
SET a += { nombre: 'ADR-0000-Generación de código con trazabilidad normativa obligatoria.md', tipo: 'md', bytes: 8396, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0001-temporal-integration-test-policy.md' })
SET a += { nombre: 'ADR-0001-temporal-integration-test-policy.md', tipo: 'md', bytes: 3650, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md' })
SET a += { nombre: 'ADR-0002-neo4j-knowledge-graph-context-repository.md', tipo: 'md', bytes: 3508, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0003-execution-model.md' })
SET a += { nombre: 'ADR-0003-execution-model.md', tipo: 'md', bytes: 2112, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0004-event-sourcing-strategy.md' })
SET a += { nombre: 'ADR-0004-event-sourcing-strategy.md', tipo: 'md', bytes: 2238, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0005-contract-formalization-tooling.md' })
SET a += { nombre: 'ADR-0005-contract-formalization-tooling.md', tipo: 'md', bytes: 2597, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0006-contract-tooling-governance.md' })
SET a += { nombre: 'ADR-0006-contract-tooling-governance.md', tipo: 'md', bytes: 3314, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 2896, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/AI_ISSUE_RESOLUTION_PLAYBOOK.md' })
SET a += { nombre: 'AI_ISSUE_RESOLUTION_PLAYBOOK.md', tipo: 'md', bytes: 20485, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/QUALITY.md' })
SET a += { nombre: 'QUALITY.md', tipo: 'md', bytes: 16143, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md' })
SET a += { nombre: 'SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md', tipo: 'md', bytes: 12515, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/knowledge' })
SET m += { nombre: 'knowledge', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/knowledge/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 1873, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/knowledge' })
SET m += { nombre: 'knowledge', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/knowledge/REPOSITORY_MAP.md' })
SET a += { nombre: 'REPOSITORY_MAP.md', tipo: 'md', bytes: 4760, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/knowledge' })
SET m += { nombre: 'knowledge', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
SET a += { nombre: 'ROADMAP_AND_ISSUES_MAP.md', tipo: 'md', bytes: 4193, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md' })
SET a += { nombre: 'BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md', tipo: 'md', bytes: 7226, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
SET a += { nombre: 'BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md', tipo: 'md', bytes: 6783, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md' })
SET a += { nombre: 'BACKLOG_V2_EPICS_AND_STORIES.md', tipo: 'md', bytes: 4987, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md' })
SET a += { nombre: 'BACKLOG_V2_GITHUB_EXECUTION.md', tipo: 'md', bytes: 6145, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DBT_CLOUD_EXTENDIDO_V2_ALIGNMENT.md' })
SET a += { nombre: 'DBT_CLOUD_EXTENDIDO_V2_ALIGNMENT.md', tipo: 'md', bytes: 6934, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md' })
SET a += { nombre: 'DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md', tipo: 'md', bytes: 5726, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DOCKER_COMPOSE_BACKEND_SPEC.v1.md' })
SET a += { nombre: 'DOCKER_COMPOSE_BACKEND_SPEC.v1.md', tipo: 'md', bytes: 13004, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/FRONTEND_DVT_PLUS_TECHNICAL_SPEC.md' })
SET a += { nombre: 'FRONTEND_DVT_PLUS_TECHNICAL_SPEC.md', tipo: 'md', bytes: 6684, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/GTM_PLAN_DVT.md' })
SET a += { nombre: 'GTM_PLAN_DVT.md', tipo: 'md', bytes: 2133, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md' })
SET a += { nombre: 'ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md', tipo: 'md', bytes: 10800, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/NEXT_ISSUES_TEMPLATES.md' })
SET a += { nombre: 'NEXT_ISSUES_TEMPLATES.md', tipo: 'md', bytes: 3393, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/PRODUCT_OPERATIONS_APPENDIX_DVT.md' })
SET a += { nombre: 'PRODUCT_OPERATIONS_APPENDIX_DVT.md', tipo: 'md', bytes: 5034, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_DVT.md' })
SET a += { nombre: 'PRODUCT_STRATEGY_DVT.md', tipo: 'md', bytes: 1378, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_GTM_AND_FINANCIALS.md' })
SET a += { nombre: 'PRODUCT_STRATEGY_GTM_AND_FINANCIALS.md', tipo: 'md', bytes: 700, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/runbooks/outbox_replay.md' })
SET a += { nombre: 'outbox_replay.md', tipo: 'md', bytes: 1694, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/runbooks/plugin_quarantine.md' })
SET a += { nombre: 'plugin_quarantine.md', tipo: 'md', bytes: 1469, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/runbooks/rollback_and_restore.md' })
SET a += { nombre: 'rollback_and_restore.md', tipo: 'md', bytes: 1155, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md' })
SET a += { nombre: 'DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md', tipo: 'md', bytes: 16940, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/IMPLEMENTATION_NOTES_OUTBOX_WORKER.md' })
SET a += { nombre: 'IMPLEMENTATION_NOTES_OUTBOX_WORKER.md', tipo: 'md', bytes: 1624, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
SET a += { nombre: 'IMPLEMENTATION_SUMMARY.md', tipo: 'md', bytes: 5839, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'eslint.config.cjs' })
SET m += { nombre: 'eslint.config.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'eslint.config.cjs' })
SET a += { nombre: 'eslint.config.cjs', tipo: 'cjs', bytes: 9915, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'package-lock.json' })
SET m += { nombre: 'package-lock.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'package-lock.json' })
SET a += { nombre: 'package-lock.json', tipo: 'json', bytes: 345180, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'package.json' })
SET m += { nombre: 'package.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 4951, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/DESIGN.md' })
SET a += { nombre: 'DESIGN.md', tipo: 'md', bytes: 118, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 480, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
SET a += { nombre: 'PostgresStateStoreAdapter.ts', tipo: 'ts', bytes: 3081, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 302, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/src/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1864, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 2581, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 283, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-postgres' })
SET m += { nombre: 'adapter-postgres', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/adapter-postgres/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 142, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 810, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/TemporalAdapter.ts' })
SET a += { nombre: 'TemporalAdapter.ts', tipo: 'ts', bytes: 3889, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/TemporalClient.ts' })
SET a += { nombre: 'TemporalClient.ts', tipo: 'ts', bytes: 1907, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/TemporalWorkerHost.ts' })
SET a += { nombre: 'TemporalWorkerHost.ts', tipo: 'ts', bytes: 2131, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/WorkflowMapper.ts' })
SET a += { nombre: 'WorkflowMapper.ts', tipo: 'ts', bytes: 1721, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/activities/stepActivities.ts' })
SET a += { nombre: 'stepActivities.ts', tipo: 'ts', bytes: 5815, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/config.ts' })
SET a += { nombre: 'config.ts', tipo: 'ts', bytes: 2482, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/engine-types.ts' })
SET a += { nombre: 'engine-types.ts', tipo: 'ts', bytes: 4376, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1132, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/src/workflows/RunPlanWorkflow.ts' })
SET a += { nombre: 'RunPlanWorkflow.ts', tipo: 'ts', bytes: 6049, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/test/activities.test.ts' })
SET a += { nombre: 'activities.test.ts', tipo: 'ts', bytes: 9558, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/test/integration.time-skipping.test.ts' })
SET a += { nombre: 'integration.time-skipping.test.ts', tipo: 'ts', bytes: 11370, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 4798, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/test/workflow-literals.test.ts' })
SET a += { nombre: 'workflow-literals.test.ts', tipo: 'ts', bytes: 1094, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 141, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 341, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapter-temporal' })
SET m += { nombre: 'adapter-temporal', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/adapter-temporal/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 168, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 235, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/postgres/DESIGN.md' })
SET a += { nombre: 'DESIGN.md', tipo: 'md', bytes: 1706, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/postgres/test/determinism/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 1186, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/postgres/test/determinism/sample_determinism.test.ts' })
SET a += { nombre: 'sample_determinism.test.ts', tipo: 'ts', bytes: 418, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/test/setup.ts' })
SET a += { nombre: 'setup.ts', tipo: 'ts', bytes: 534, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/test/types/contract-schemas.test.ts' })
SET a += { nombre: 'contract-schemas.test.ts', tipo: 'ts', bytes: 8176, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/test/types/contract-validation.test.ts' })
SET a += { nombre: 'contract-validation.test.ts', tipo: 'ts', bytes: 6548, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/adapters-legacy' })
SET m += { nombre: 'adapters-legacy', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/adapters-legacy/test/validation/validationErrors.test.ts' })
SET a += { nombre: 'validationErrors.test.ts', tipo: 'ts', bytes: 1172, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/cli/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 97, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/cli/compare-hashes.cjs' })
SET a += { nombre: 'compare-hashes.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/cli/db-migrate.cjs' })
SET a += { nombre: 'db-migrate.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'text' }
MERGE (a:Archivo { path: 'packages/cli/enable-workflow.sh' })
SET a += { nombre: 'enable-workflow.sh', tipo: 'sh', bytes: 36, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/cli/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 526, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/cli/run-golden-paths.cjs' })
SET a += { nombre: 'run-golden-paths.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/cli/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 97, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/cli/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 97, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/cli/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 283, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/cli/validate-contracts.cjs' })
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/index.d.ts' })
SET a += { nombre: 'index.d.ts', tipo: 'ts', bytes: 377, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/index.js' })
SET a += { nombre: 'index.js', tipo: 'js', bytes: 1395, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 521, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/contracts/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 372, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.d.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.d.ts', tipo: 'ts', bytes: 910, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.js' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.js', tipo: 'js', bytes: 130, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.ts', tipo: 'ts', bytes: 857, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.d.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.d.ts', tipo: 'ts', bytes: 1291, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.js' })
SET a += { nombre: 'IProjectorAdapter.v1.js', tipo: 'js', bytes: 126, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.ts', tipo: 'ts', bytes: 1233, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IProviderAdapter.v1.ts' })
SET a += { nombre: 'IProviderAdapter.v1.ts', tipo: 'ts', bytes: 466, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.d.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.d.ts', tipo: 'ts', bytes: 402, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.js' })
SET a += { nombre: 'IStateStoreAdapter.v1.js', tipo: 'js', bytes: 127, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.ts', tipo: 'ts', bytes: 351, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.d.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.d.ts', tipo: 'ts', bytes: 1761, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.js' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.js', tipo: 'js', bytes: 131, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.ts', tipo: 'ts', bytes: 1682, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 276, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/schemas.ts' })
SET a += { nombre: 'schemas.ts', tipo: 'ts', bytes: 6474, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/artifacts.d.ts' })
SET a += { nombre: 'artifacts.d.ts', tipo: 'ts', bytes: 768, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/artifacts.js' })
SET a += { nombre: 'artifacts.js', tipo: 'js', bytes: 212, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/artifacts.ts' })
SET a += { nombre: 'artifacts.ts', tipo: 'ts', bytes: 716, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/contracts.d.ts' })
SET a += { nombre: 'contracts.d.ts', tipo: 'ts', bytes: 2069, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/contracts.js' })
SET a += { nombre: 'contracts.js', tipo: 'js', bytes: 197, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
SET a += { nombre: 'contracts.ts', tipo: 'ts', bytes: 2171, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/state-store.d.ts' })
SET a += { nombre: 'state-store.d.ts', tipo: 'ts', bytes: 1919, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/state-store.js' })
SET a += { nombre: 'state-store.js', tipo: 'js', bytes: 162, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/types/state-store.ts' })
SET a += { nombre: 'state-store.ts', tipo: 'ts', bytes: 1859, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/validation.ts' })
SET a += { nombre: 'validation.ts', tipo: 'ts', bytes: 4018, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/src/workflows.ts' })
SET a += { nombre: 'workflows.ts', tipo: 'ts', bytes: 379, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/test/errors.test.ts' })
SET a += { nombre: 'errors.test.ts', tipo: 'ts', bytes: 478, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/test/validation.test.ts' })
SET a += { nombre: 'validation.test.ts', tipo: 'ts', bytes: 1991, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/contracts/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 301, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/contracts/vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 178, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/engine/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 2596, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/engine/docs/GAPS_AND_FIXES.md' })
SET a += { nombre: 'GAPS_AND_FIXES.md', tipo: 'md', bytes: 2115, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 367, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 6479, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IOutboxStorageAdapter.v1.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.ts', tipo: 'ts', bytes: 857, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IProjectorAdapter.v1.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.ts', tipo: 'ts', bytes: 6141, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IStateStoreAdapter.v1.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.ts', tipo: 'ts', bytes: 351, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IWorkflowEngineAdapter.v1.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.ts', tipo: 'ts', bytes: 9198, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts' })
SET a += { nombre: 'InMemoryEventBus.ts', tipo: 'ts', bytes: 2034, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 222, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts' })
SET a += { nombre: 'InMemoryStateStore.ts', tipo: 'ts', bytes: 2352, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/validatingAdapter.ts' })
SET a += { nombre: 'validatingAdapter.ts', tipo: 'ts', bytes: 3025, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 1700, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 51, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/schemas/execution-plan.schema.ts' })
SET a += { nombre: 'execution-plan.schema.ts', tipo: 'ts', bytes: 2385, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/schemas/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 952, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/schemas/validation-report.schema.ts' })
SET a += { nombre: 'validation-report.schema.ts', tipo: 'ts', bytes: 3885, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1706, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/validationErrors.ts' })
SET a += { nombre: 'validationErrors.ts', tipo: 'ts', bytes: 1564, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/withValidation.ts' })
SET a += { nombre: 'withValidation.ts', tipo: 'ts', bytes: 1435, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 40, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IEventBus.ts' })
SET a += { nombre: 'IEventBus.ts', tipo: 'ts', bytes: 785, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IOutboxStorage.ts' })
SET a += { nombre: 'IOutboxStorage.ts', tipo: 'ts', bytes: 1453, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 2231, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 567, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 3899, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/artifacts.ts' })
SET a += { nombre: 'artifacts.ts', tipo: 'ts', bytes: 2545, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/contracts.ts' })
SET a += { nombre: 'contracts.ts', tipo: 'ts', bytes: 10752, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1214, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/state-store.ts' })
SET a += { nombre: 'state-store.ts', tipo: 'ts', bytes: 7814, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 8063, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 406, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/adapters/IProviderAdapter.ts' })
SET a += { nombre: 'IProviderAdapter.ts', tipo: 'ts', bytes: 488, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/adapters/conductor/ConductorAdapterStub.ts' })
SET a += { nombre: 'ConductorAdapterStub.ts', tipo: 'ts', bytes: 1050, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/adapters/mock/MockAdapter.ts' })
SET a += { nombre: 'MockAdapter.ts', tipo: 'ts', bytes: 5572, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/adapters/temporal/TemporalAdapterStub.ts' })
SET a += { nombre: 'TemporalAdapterStub.ts', tipo: 'ts', bytes: 1055, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/application/providerSelection.ts' })
SET a += { nombre: 'providerSelection.ts', tipo: 'ts', bytes: 2078, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/contracts/IWorkflowEngine.v1_1_1.ts' })
SET a += { nombre: 'IWorkflowEngine.v1_1_1.ts', tipo: 'ts', bytes: 431, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/contracts/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 54, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/contracts/executionPlan.ts' })
SET a += { nombre: 'executionPlan.ts', tipo: 'ts', bytes: 360, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 53, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/contracts/runEvents.ts' })
SET a += { nombre: 'runEvents.ts', tipo: 'ts', bytes: 1453, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/contracts/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1811, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/core/SnapshotProjector.ts' })
SET a += { nombre: 'SnapshotProjector.ts', tipo: 'ts', bytes: 2874, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/core/WorkflowEngine.ts' })
SET a += { nombre: 'WorkflowEngine.ts', tipo: 'ts', bytes: 17784, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/core/idempotency.ts' })
SET a += { nombre: 'idempotency.ts', tipo: 'ts', bytes: 1184, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/core/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 48, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/core/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 48, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1010, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/outbox/InMemoryEventBus.ts' })
SET a += { nombre: 'InMemoryEventBus.ts', tipo: 'ts', bytes: 316, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/outbox/InMemoryOutboxStorage.ts' })
SET a += { nombre: 'InMemoryOutboxStorage.ts', tipo: 'ts', bytes: 1153, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/outbox/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 908, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/outbox/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 594, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/ports/IPlanResolver.ts' })
SET a += { nombre: 'IPlanResolver.ts', tipo: 'ts', bytes: 267, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/security/AuthorizationError.ts' })
SET a += { nombre: 'AuthorizationError.ts', tipo: 'ts', bytes: 276, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/security/authorizer.ts' })
SET a += { nombre: 'authorizer.ts', tipo: 'ts', bytes: 234, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/security/planIntegrity.ts' })
SET a += { nombre: 'planIntegrity.ts', tipo: 'ts', bytes: 652, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/security/planRefPolicy.ts' })
SET a += { nombre: 'planRefPolicy.ts', tipo: 'ts', bytes: 2438, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/shims/node.d.ts' })
SET a += { nombre: 'node.d.ts', tipo: 'ts', bytes: 351, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/state/IRunStateStore.ts' })
SET a += { nombre: 'IRunStateStore.ts', tipo: 'ts', bytes: 556, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/state/InMemoryRunStateStore.ts' })
SET a += { nombre: 'InMemoryRunStateStore.ts', tipo: 'ts', bytes: 1769, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/state/InMemoryTxStore.ts' })
SET a += { nombre: 'InMemoryTxStore.ts', tipo: 'ts', bytes: 3445, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/types/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 49, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/types/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 49, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/utils/clock.ts' })
SET a += { nombre: 'clock.ts', tipo: 'ts', bytes: 4906, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/utils/jcs.ts' })
SET a += { nombre: 'jcs.ts', tipo: 'ts', bytes: 2092, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/utils/sha256.ts' })
SET a += { nombre: 'sha256.ts', tipo: 'ts', bytes: 186, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/src/workers/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 58, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/application/providerSelection.test.ts' })
SET a += { nombre: 'providerSelection.test.ts', tipo: 'ts', bytes: 2969, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/IWorkflowEngine.types.test.ts' })
SET a += { nombre: 'IWorkflowEngine.types.test.ts', tipo: 'ts', bytes: 2008, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/engine.test.ts' })
SET a += { nombre: 'engine.test.ts', tipo: 'ts', bytes: 9441, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/helpers.ts' })
SET a += { nombre: 'helpers.ts', tipo: 'ts', bytes: 544, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/plans/plan-cancel-and-resume.json' })
SET a += { nombre: 'plan-cancel-and-resume.json', tipo: 'json', bytes: 472, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/plans/plan-minimal.json' })
SET a += { nombre: 'plan-minimal.json', tipo: 'json', bytes: 271, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/plans/plan-parallel.json' })
SET a += { nombre: 'plan-parallel.json', tipo: 'json', bytes: 425, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/test/contracts/results/golden-paths-run.json' })
SET a += { nombre: 'golden-paths-run.json', tipo: 'json', bytes: 768, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/core/WorkflowEngine.test.ts' })
SET a += { nombre: 'WorkflowEngine.test.ts', tipo: 'ts', bytes: 7554, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/engine/test/determinism/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 4024, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/security/authorizer.deny.test.ts' })
SET a += { nombre: 'authorizer.deny.test.ts', tipo: 'ts', bytes: 4823, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/types/engine-types.test.ts' })
SET a += { nombre: 'engine-types.test.ts', tipo: 'ts', bytes: 983, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/test/utils/clock.test.ts' })
SET a += { nombre: 'clock.test.ts', tipo: 'ts', bytes: 2127, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 157, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 709, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/tsconfig.test.eslint.json' })
SET a += { nombre: 'tsconfig.test.eslint.json', tipo: 'json', bytes: 110, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/engine/tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 148, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/engine' })
SET m += { nombre: 'engine', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/engine/vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 157, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'pnpm-lock.yaml' })
SET m += { nombre: 'pnpm-lock.yaml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'pnpm-lock.yaml' })
SET a += { nombre: 'pnpm-lock.yaml', tipo: 'yaml', bytes: 241903, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'pnpm-workspace.yaml' })
SET m += { nombre: 'pnpm-workspace.yaml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'pnpm-workspace.yaml' })
SET a += { nombre: 'pnpm-workspace.yaml', tipo: 'yaml', bytes: 27, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'runbooks/WORKFLOW_ISOLATION_TESTING.md' })
SET m += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'runbooks/WORKFLOW_ISOLATION_TESTING.md' })
SET a += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', tipo: 'md', bytes: 204, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'scripts/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 2972, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/check-changed.cjs' })
SET m += { nombre: 'check-changed.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/check-changed.cjs' })
SET a += { nombre: 'check-changed.cjs', tipo: 'cjs', bytes: 4027, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/compare-hashes.cjs' })
SET m += { nombre: 'compare-hashes.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/compare-hashes.cjs' })
SET a += { nombre: 'compare-hashes.cjs', tipo: 'cjs', bytes: 3169, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/db-migrate.cjs' })
SET m += { nombre: 'db-migrate.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/db-migrate.cjs' })
SET a += { nombre: 'db-migrate.cjs', tipo: 'cjs', bytes: 1475, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/enable-workflow.sh' })
SET m += { nombre: 'enable-workflow.sh', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/enable-workflow.sh' })
SET a += { nombre: 'enable-workflow.sh', tipo: 'sh', bytes: 1490, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/base-schema.cypher' })
SET a += { nombre: 'base-schema.cypher', tipo: 'cypher', bytes: 8892, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/generated-repo.cypher' })
SET a += { nombre: 'generated-repo.cypher', tipo: 'cypher', bytes: 189572, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-generate-cypher.cjs' })
SET a += { nombre: 'neo4j-generate-cypher.cjs', tipo: 'cjs', bytes: 9041, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-ingest-repo.cjs' })
SET a += { nombre: 'neo4j-ingest-repo.cjs', tipo: 'cjs', bytes: 20533, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-json-to-prompt.cjs' })
SET a += { nombre: 'neo4j-json-to-prompt.cjs', tipo: 'cjs', bytes: 3333, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-query-context.cjs' })
SET a += { nombre: 'neo4j-query-context.cjs', tipo: 'cjs', bytes: 2819, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-query-roadmap-tree.cjs' })
SET a += { nombre: 'neo4j-query-roadmap-tree.cjs', tipo: 'cjs', bytes: 4674, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-seed.cjs' })
SET a += { nombre: 'neo4j-seed.cjs', tipo: 'cjs', bytes: 1689, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/roadmap-tree.cypher' })
SET a += { nombre: 'roadmap-tree.cypher', tipo: 'cypher', bytes: 875, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/run-golden-paths.cjs' })
SET m += { nombre: 'run-golden-paths.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/run-golden-paths.cjs' })
SET a += { nombre: 'run-golden-paths.cjs', tipo: 'cjs', bytes: 4121, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-contracts.cjs' })
SET m += { nombre: 'validate-contracts.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-contracts.cjs' })
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 3229, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.base.json' })
SET m += { nombre: 'tsconfig.base.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.base.json' })
SET a += { nombre: 'tsconfig.base.json', tipo: 'json', bytes: 855, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.eslint.base.json' })
SET m += { nombre: 'tsconfig.eslint.base.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.eslint.base.json' })
SET a += { nombre: 'tsconfig.eslint.base.json', tipo: 'json', bytes: 206, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.json' })
SET m += { nombre: 'tsconfig.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 1300, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.test.json' })
SET m += { nombre: 'tsconfig.test.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 195, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'vitest.config.ts' })
SET m += { nombre: 'vitest.config.ts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 551, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);

// File dependencies
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/state-store.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/state-store.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/state-store.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/workflows.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IProviderAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/schemas.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/validation.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/schemas.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/validation.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/validation.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/src/validation.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/types/state-store.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/contracts/test/errors.test.ts' })
MATCH (dst:Archivo { path: 'packages/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IOutboxStorageAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IProjectorAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IStateStoreAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IEventBus.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IOutboxStorage.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/validatingAdapter.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/withValidation.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/validatingAdapter.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/withValidation.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/validationErrors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IEventBus.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IEventBus.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IOutboxStorage.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/index.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IOutboxStorage.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IEventBus.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/index.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/state-store.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/state-store.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/state-store.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IEventBus.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/interfaces/IOutboxStorage.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' })
MATCH (dst:Archivo { path: 'packages/engine/legacy-top-level-engine/src/core/types.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/engine/test/utils/clock.test.ts' })
MATCH (dst:Archivo { path: 'packages/engine/src/utils/clock.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'scripts/neo4j/neo4j-generate-cypher.cjs' })
MATCH (dst:Archivo { path: 'scripts/neo4j/neo4j-ingest-repo.cjs' })
MERGE (src)-[:DEPENDE]->(dst);

// Class/function definitions
MERGE (f:Funcion { key: 'packages/adapter-postgres/src/PostgresStateStoreAdapter.ts::PostgresStateStoreAdapter' })
SET f += { nombre: 'PostgresStateStoreAdapter', linea_inicio: 21, path: 'packages/adapter-postgres/src/PostgresStateStoreAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/adapter-temporal/src/TemporalAdapter.ts::TemporalAdapter' })
SET f += { nombre: 'TemporalAdapter', linea_inicio: 45, path: 'packages/adapter-temporal/src/TemporalAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/adapter-temporal/src/TemporalAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/adapter-temporal/src/TemporalClient.ts::TemporalClientManager' })
SET f += { nombre: 'TemporalClientManager', linea_inicio: 11, path: 'packages/adapter-temporal/src/TemporalClient.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/adapter-temporal/src/TemporalClient.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/adapter-temporal/src/TemporalWorkerHost.ts::TemporalWorkerHost' })
SET f += { nombre: 'TemporalWorkerHost', linea_inicio: 20, path: 'packages/adapter-temporal/src/TemporalWorkerHost.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/adapter-temporal/src/TemporalWorkerHost.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/contracts/src/errors.ts::AuthorizationError' })
SET f += { nombre: 'AuthorizationError', linea_inicio: 1, path: 'packages/contracts/src/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/contracts/src/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/contracts/src/validation.ts::ContractValidationError' })
SET f += { nombre: 'ContractValidationError', linea_inicio: 39, path: 'packages/contracts/src/validation.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/contracts/src/validation.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts::InMemoryEventBus' })
SET f += { nombre: 'InMemoryEventBus', linea_inicio: 10, path: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/event-bus/InMemoryEventBus.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts::InMemoryStateStore' })
SET f += { nombre: 'InMemoryStateStore', linea_inicio: 14, path: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/state-store/InMemoryStateStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/adapters/validatingAdapter.ts::ValidatingAdapter' })
SET f += { nombre: 'ValidatingAdapter', linea_inicio: 4, path: 'packages/engine/legacy-top-level-engine/src/adapters/validatingAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/adapters/validatingAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts::DVTError' })
SET f += { nombre: 'DVTError', linea_inicio: 1, path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts::ContractViolationError' })
SET f += { nombre: 'ContractViolationError', linea_inicio: 11, path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts::DeterminismViolationError' })
SET f += { nombre: 'DeterminismViolationError', linea_inicio: 18, path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts::InvalidStateTransitionError' })
SET f += { nombre: 'InvalidStateTransitionError', linea_inicio: 25, path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts::TenantIsolationViolationError' })
SET f += { nombre: 'TenantIsolationViolationError', linea_inicio: 36, path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/contracts/validation/validationErrors.ts::ValidationException' })
SET f += { nombre: 'ValidationException', linea_inicio: 52, path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/validationErrors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/contracts/validation/validationErrors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts::OutboxWorker' })
SET f += { nombre: 'OutboxWorker', linea_inicio: 28, path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/workers/OutboxWorker.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/adapters/conductor/ConductorAdapterStub.ts::ConductorAdapterStub' })
SET f += { nombre: 'ConductorAdapterStub', linea_inicio: 16, path: 'packages/engine/src/adapters/conductor/ConductorAdapterStub.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/adapters/conductor/ConductorAdapterStub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/adapters/mock/MockAdapter.ts::MockAdapter' })
SET f += { nombre: 'MockAdapter', linea_inicio: 27, path: 'packages/engine/src/adapters/mock/MockAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/adapters/mock/MockAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/adapters/temporal/TemporalAdapterStub.ts::TemporalAdapterStub' })
SET f += { nombre: 'TemporalAdapterStub', linea_inicio: 17, path: 'packages/engine/src/adapters/temporal/TemporalAdapterStub.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/adapters/temporal/TemporalAdapterStub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/core/SnapshotProjector.ts::SnapshotProjector' })
SET f += { nombre: 'SnapshotProjector', linea_inicio: 5, path: 'packages/engine/src/core/SnapshotProjector.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/core/SnapshotProjector.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/core/WorkflowEngine.ts::WorkflowEngine' })
SET f += { nombre: 'WorkflowEngine', linea_inicio: 91, path: 'packages/engine/src/core/WorkflowEngine.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/core/WorkflowEngine.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/core/idempotency.ts::IdempotencyKeyBuilder' })
SET f += { nombre: 'IdempotencyKeyBuilder', linea_inicio: 16, path: 'packages/engine/src/core/idempotency.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/core/idempotency.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/outbox/InMemoryEventBus.ts::InMemoryEventBus' })
SET f += { nombre: 'InMemoryEventBus', linea_inicio: 4, path: 'packages/engine/src/outbox/InMemoryEventBus.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/outbox/InMemoryEventBus.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/outbox/InMemoryOutboxStorage.ts::InMemoryOutboxStorage' })
SET f += { nombre: 'InMemoryOutboxStorage', linea_inicio: 4, path: 'packages/engine/src/outbox/InMemoryOutboxStorage.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/outbox/InMemoryOutboxStorage.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/outbox/OutboxWorker.ts::OutboxWorker' })
SET f += { nombre: 'OutboxWorker', linea_inicio: 6, path: 'packages/engine/src/outbox/OutboxWorker.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/outbox/OutboxWorker.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/security/AuthorizationError.ts::AuthorizationError' })
SET f += { nombre: 'AuthorizationError', linea_inicio: 1, path: 'packages/engine/src/security/AuthorizationError.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/security/AuthorizationError.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/security/authorizer.ts::AllowAllAuthorizer' })
SET f += { nombre: 'AllowAllAuthorizer', linea_inicio: 4, path: 'packages/engine/src/security/authorizer.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/security/authorizer.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/security/planIntegrity.ts::PlanIntegrityValidator' })
SET f += { nombre: 'PlanIntegrityValidator', linea_inicio: 8, path: 'packages/engine/src/security/planIntegrity.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/security/planIntegrity.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/security/planRefPolicy.ts::PlanRefPolicy' })
SET f += { nombre: 'PlanRefPolicy', linea_inicio: 8, path: 'packages/engine/src/security/planRefPolicy.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/security/planRefPolicy.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/shims/node.d.ts::URL' })
SET f += { nombre: 'URL', linea_inicio: 11, path: 'packages/engine/src/shims/node.d.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/shims/node.d.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/state/InMemoryRunStateStore.ts::InMemoryRunStateStore' })
SET f += { nombre: 'InMemoryRunStateStore', linea_inicio: 3, path: 'packages/engine/src/state/InMemoryRunStateStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/state/InMemoryRunStateStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/state/InMemoryTxStore.ts::InMemoryTxStore' })
SET f += { nombre: 'InMemoryTxStore', linea_inicio: 4, path: 'packages/engine/src/state/InMemoryTxStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/state/InMemoryTxStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/src/utils/clock.ts::SequenceClock' })
SET f += { nombre: 'SequenceClock', linea_inicio: 150, path: 'packages/engine/src/utils/clock.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/src/utils/clock.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/engine/test/contracts/helpers.ts::InMemoryPlanFetcher' })
SET f += { nombre: 'InMemoryPlanFetcher', linea_inicio: 3, path: 'packages/engine/test/contracts/helpers.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/engine/test/contracts/helpers.ts' })
MERGE (a)-[:DEFINE]->(f);

// Issue references from files
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/issue-9-prebrief.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/normalize_issues_v2.ps1' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#98' })
SET i += { number: 98, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/98' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/normalize_issues_v2.ps1' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#106' })
SET i += { number: 106, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/106' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/normalize_issues_v2.ps1' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#117' })
SET i += { number: 117, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/117' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-117.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-9.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#11' })
SET i += { number: 11, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/11' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#89' })
SET i += { number: 89, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/89' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#90' })
SET i += { number: 90, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/90' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#94' })
SET i += { number: 94, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/94' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: '.github/COMMIT_CONVENTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#456' })
SET i += { number: 456, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/456' }
WITH i
MATCH (a:Archivo { path: '.github/COMMIT_CONVENTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#789' })
SET i += { number: 789, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/789' }
WITH i
MATCH (a:Archivo { path: '.github/COMMIT_CONVENTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: '.github/ISSUE_TEMPLATE/bug_report.yml' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: '.github/ISSUE_TEMPLATE/contract_proposal.yml' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: '.github/ISSUE_TEMPLATE/feature_request.yml' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#90' })
SET i += { number: 90, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/90' }
WITH i
MATCH (a:Archivo { path: '.github/PR_INSTRUCTIONS.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#93' })
SET i += { number: 93, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/93' }
WITH i
MATCH (a:Archivo { path: '.github/workflows/contracts.yml' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: '.golden/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: '.golden/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: '.golden/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1' })
SET i += { number: 1, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#3' })
SET i += { number: 3, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/3' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#7' })
SET i += { number: 7, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/7' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#13' })
SET i += { number: 13, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/13' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#18' })
SET i += { number: 18, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/18' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#19' })
SET i += { number: 19, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/19' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#41' })
SET i += { number: 41, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/41' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#42' })
SET i += { number: 42, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/42' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#43' })
SET i += { number: 43, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/43' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#55' })
SET i += { number: 55, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/55' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#56' })
SET i += { number: 56, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/56' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#62' })
SET i += { number: 62, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/62' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#63' })
SET i += { number: 63, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/63' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#64' })
SET i += { number: 64, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/64' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#69' })
SET i += { number: 69, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/69' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#70' })
SET i += { number: 70, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/70' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#73' })
SET i += { number: 73, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/73' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1' })
SET i += { number: 1, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#3' })
SET i += { number: 3, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/3' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#4' })
SET i += { number: 4, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/4' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#7' })
SET i += { number: 7, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/7' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#11' })
SET i += { number: 11, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/11' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#12' })
SET i += { number: 12, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/12' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#13' })
SET i += { number: 13, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/13' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#18' })
SET i += { number: 18, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/18' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#19' })
SET i += { number: 19, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/19' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#66' })
SET i += { number: 66, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/66' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#67' })
SET i += { number: 67, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/67' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#69' })
SET i += { number: 69, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/69' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#70' })
SET i += { number: 70, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/70' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#71' })
SET i += { number: 71, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/71' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#72' })
SET i += { number: 72, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/72' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#73' })
SET i += { number: 73, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/73' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#74' })
SET i += { number: 74, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/74' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#89' })
SET i += { number: 89, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/89' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#90' })
SET i += { number: 90, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/90' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#91' })
SET i += { number: 91, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/91' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#92' })
SET i += { number: 92, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/92' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#93' })
SET i += { number: 93, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/93' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#94' })
SET i += { number: 94, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/94' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#160' })
SET i += { number: 160, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/160' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#168' })
SET i += { number: 168, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/168' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#169' })
SET i += { number: 169, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/169' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#188' })
SET i += { number: 188, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/188' }
WITH i
MATCH (a:Archivo { path: 'ROADMAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'docs/REPO_STRUCTURE_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#133' })
SET i += { number: 133, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/133' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#217' })
SET i += { number: 217, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/217' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#218' })
SET i += { number: 218, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/218' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#219' })
SET i += { number: 219, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/219' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#220' })
SET i += { number: 220, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/220' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#222' })
SET i += { number: 222, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/222' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#223' })
SET i += { number: 223, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/223' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#224' })
SET i += { number: 224, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/224' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1' })
SET i += { number: 1, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/engine/ExecutionSemantics.v1.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#133' })
SET i += { number: 133, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/133' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEventCatalog.v1.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#13' })
SET i += { number: 13, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/13' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/roadmap/engine-phases.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/security/THREAT_MODEL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/security/THREAT_MODEL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#63' })
SET i += { number: 63, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/63' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/security/THREAT_MODEL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#333' })
SET i += { number: 333, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/333' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/security/THREAT_MODEL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#0' })
SET i += { number: 0, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/0' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/frontend/quality/A11Y_GUIDELINES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#888' })
SET i += { number: 888, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/888' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/frontend/quality/A11Y_GUIDELINES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#999' })
SET i += { number: 999, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/999' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/frontend/quality/A11Y_GUIDELINES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: 'docs/guides/SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#69' })
SET i += { number: 69, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/69' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#71' })
SET i += { number: 71, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/71' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#72' })
SET i += { number: 72, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/72' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#73' })
SET i += { number: 73, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/73' }
WITH i
MATCH (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#160' })
SET i += { number: 160, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/160' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#168' })
SET i += { number: 168, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/168' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#169' })
SET i += { number: 169, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/169' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#188' })
SET i += { number: 188, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/188' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#169' })
SET i += { number: 169, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/169' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#170' })
SET i += { number: 170, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/170' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#171' })
SET i += { number: 171, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/171' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#172' })
SET i += { number: 172, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/172' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#173' })
SET i += { number: 173, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/173' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#174' })
SET i += { number: 174, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/174' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#175' })
SET i += { number: 175, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/175' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#176' })
SET i += { number: 176, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/176' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#177' })
SET i += { number: 177, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/177' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#178' })
SET i += { number: 178, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/178' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#179' })
SET i += { number: 179, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/179' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#180' })
SET i += { number: 180, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/180' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#181' })
SET i += { number: 181, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/181' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#182' })
SET i += { number: 182, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/182' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#183' })
SET i += { number: 183, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/183' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#184' })
SET i += { number: 184, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/184' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#185' })
SET i += { number: 185, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/185' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#186' })
SET i += { number: 186, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/186' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#187' })
SET i += { number: 187, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/187' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#188' })
SET i += { number: 188, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/188' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_DVT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_DVT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_DVT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_DVT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/status/DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#11' })
SET i += { number: 11, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/11' }
WITH i
MATCH (a:Archivo { path: 'docs/status/DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/status/DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_NOTES_OUTBOX_WORKER.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#67' })
SET i += { number: 67, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/67' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#69' })
SET i += { number: 69, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/69' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#70' })
SET i += { number: 70, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/70' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#71' })
SET i += { number: 71, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/71' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#72' })
SET i += { number: 72, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/72' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#73' })
SET i += { number: 73, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/73' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#79' })
SET i += { number: 79, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/79' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#82' })
SET i += { number: 82, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/82' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#91' })
SET i += { number: 91, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/91' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#92' })
SET i += { number: 92, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/92' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#201' })
SET i += { number: 201, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/201' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#202' })
SET i += { number: 202, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/202' }
WITH i
MATCH (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'packages/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'packages/adapters-legacy/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'packages/adapters-legacy/postgres/DESIGN.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'packages/engine/legacy-top-level-engine/src/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'scripts/compare-hashes.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'scripts/db-migrate.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'scripts/run-golden-paths.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'scripts/validate-contracts.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);

// Roadmap root nodes
MERGE (r:Roadmap { id: 'ROADMAP_MAIN' })
SET r += { path: 'ROADMAP.md', nombre: 'DVT Engine Roadmap', topico: 'roadmap' };

// Roadmap phase nodes
MERGE (p:FaseRoadmap { id: 'PHASE_1' })
SET p += { numero: '1', nombre: 'MVP', orden: 1, path: 'ROADMAP.md' };
MERGE (p:FaseRoadmap { id: 'PHASE_1_5' })
SET p += { numero: '1.5', nombre: 'Hardening', orden: 2, path: 'ROADMAP.md' };
MERGE (p:FaseRoadmap { id: 'PHASE_2' })
SET p += { numero: '2', nombre: 'Advanced Tooling', orden: 3, path: 'ROADMAP.md' };

// Roadmap containment and unlock links
MATCH (r:Roadmap { id: 'ROADMAP_MAIN' })
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (r)-[rel:CONTIENE_FASE]->(p)
SET rel += { orden: 1 };
MATCH (p1:FaseRoadmap { id: 'PHASE_1' })
MATCH (p2:FaseRoadmap { id: 'PHASE_1_5' })
MERGE (p1)-[rel:DESBLOQUEA]->(p2)
SET rel += { orden: 101 };
MATCH (r:Roadmap { id: 'ROADMAP_MAIN' })
MATCH (p:FaseRoadmap { id: 'PHASE_1_5' })
MERGE (r)-[rel:CONTIENE_FASE]->(p)
SET rel += { orden: 2 };
MATCH (p1:FaseRoadmap { id: 'PHASE_1_5' })
MATCH (p2:FaseRoadmap { id: 'PHASE_2' })
MERGE (p1)-[rel:DESBLOQUEA]->(p2)
SET rel += { orden: 102 };
MATCH (r:Roadmap { id: 'ROADMAP_MAIN' })
MATCH (p:FaseRoadmap { id: 'PHASE_2' })
MERGE (r)-[rel:CONTIENE_FASE]->(p)
SET rel += { orden: 3 };

// Roadmap phase issue tracking
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#3' })
SET i += { number: 3, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/3' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
MERGE (i:Issue { key: 'dunay2/dvt#19' })
SET i += { number: 19, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/19' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_2' })
MERGE (i:Issue { key: 'dunay2/dvt#4' })
SET i += { number: 4, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/4' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_2' })
MERGE (i:Issue { key: 'dunay2/dvt#7' })
SET i += { number: 7, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/7' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_2' })
MERGE (i:Issue { key: 'dunay2/dvt#11' })
SET i += { number: 11, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/11' }
MERGE (p)-[:TRACKED_BY]->(i);
MATCH (p:FaseRoadmap { id: 'PHASE_2' })
MERGE (i:Issue { key: 'dunay2/dvt#12' })
SET i += { number: 12, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/12' }
MERGE (p)-[:TRACKED_BY]->(i);

// Roadmap phase status from progress metrics
MATCH (p:FaseRoadmap { id: 'PHASE_1' })
SET p += { estado: '🟡 In progress (critical path partially closed)' };
MATCH (p:FaseRoadmap { id: 'PHASE_1_5' })
SET p += { estado: '🟢 Scheduled after Phase 1' };
MATCH (p:FaseRoadmap { id: 'PHASE_2' })
SET p += { estado: '🟡 Planned / governance baseline largely closed' };

// Roadmap source file links to roadmap root
MATCH (a:Archivo { path: 'ROADMAP.md' })
MATCH (r:Roadmap { id: 'ROADMAP_MAIN' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(r);

// ADR decision nodes
MERGE (d:Decision { id: 'ADR-0000' })
SET d += { title: 'ADR-0000: ADR-0000-Generación de código con trazabilidad normativa obligatoria', date: '2026-02-14', status: 'Accepted', path: 'docs/decisions/ADR-0000-Generación de código con trazabilidad normativa obligatoria.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0000-Generación de código con trazabilidad normativa obligatoria.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0001' })
SET d += { title: 'ADR-0001: Temporal Integration Test Policy (Build Preconditions + Lifecycle Discipline)', date: '2026-02-14', status: 'Accepted', path: 'docs/decisions/ADR-0001-temporal-integration-test-policy.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0001-temporal-integration-test-policy.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0002' })
SET d += { title: 'ADR-0002: Neo4j as Central Knowledge Graph Repository', date: '2026-02-16', status: 'Accepted', path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0003' })
SET d += { title: 'ADR-0003: Execution Model Sovereignty', date: '2026-02-16', status: 'Accepted', path: 'docs/decisions/ADR-0003-execution-model.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0003-execution-model.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0004' })
SET d += { title: 'ADR-0004: Event Sourcing Strategy', date: '2026-02-16', status: 'Accepted', path: 'docs/decisions/ADR-0004-event-sourcing-strategy.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0004-event-sourcing-strategy.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0005' })
SET d += { title: 'ADR-0005: Contract Formalization Tooling', date: '2026-02-16', status: 'Accepted', path: 'docs/decisions/ADR-0005-contract-formalization-tooling.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0005-contract-formalization-tooling.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0006' })
SET d += { title: 'ADR-0006: Contract Tooling Governance (Repository-Authoritative, Editor-Supportive)', date: '2026-02-16', status: 'Accepted', path: 'docs/decisions/ADR-0006-contract-tooling-governance.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0006-contract-tooling-governance.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);

// ADR tracked-by issues

// Derived roadmap phase links to artifacts and decisions
MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:REFERENCIA_ISSUE]-(a:Archivo)
MERGE (p)-[:RELACIONA_ARTEFACTO]->(a);
MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:TRACKED_BY]-(d:Decision)
MERGE (p)-[:ANCLA_DECISION]->(d);

// End of generated graph script
