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
MERGE (m:Modulo { path: '.claude/settings.local.json' })
SET m += { nombre: 'settings.local.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.claude/settings.local.json' })
SET a += { nombre: 'settings.local.json', tipo: 'json', bytes: 286, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.editorconfig' })
SET m += { nombre: '.editorconfig', lenguaje: 'text' }
MERGE (a:Archivo { path: '.editorconfig' })
SET a += { nombre: '.editorconfig', tipo: 'none', bytes: 571, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/normalize_issues_v2.ps1' })
SET m += { nombre: 'normalize_issues_v2.ps1', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gh-comments/normalize_issues_v2.ps1' })
SET a += { nombre: 'normalize_issues_v2.ps1', tipo: 'ps1', bytes: 5477, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-117.md' })
SET m += { nombre: 'pr-117.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-117.md' })
SET a += { nombre: 'pr-117.md', tipo: 'md', bytes: 1324, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-221.md' })
SET m += { nombre: 'pr-221.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-221.md' })
SET a += { nombre: 'pr-221.md', tipo: 'md', bytes: 1393, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-226-glossary-and-postgres-hardening-2026-02-19.md' })
SET m += { nombre: 'pr-226-glossary-and-postgres-hardening-2026-02-19.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-226-glossary-and-postgres-hardening-2026-02-19.md' })
SET a += { nombre: 'pr-226-glossary-and-postgres-hardening-2026-02-19.md', tipo: 'md', bytes: 1886, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-9.md' })
SET m += { nombre: 'pr-9.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-9.md' })
SET a += { nombre: 'pr-9.md', tipo: 'md', bytes: 1431, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-closure-notes-14-15.md' })
SET m += { nombre: 'pr-closure-notes-14-15.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-closure-notes-14-15.md' })
SET a += { nombre: 'pr-closure-notes-14-15.md', tipo: 'md', bytes: 766, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-postgres-hardening-p0-p2-2026-02-19.md' })
SET m += { nombre: 'pr-postgres-hardening-p0-p2-2026-02-19.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-postgres-hardening-p0-p2-2026-02-19.md' })
SET a += { nombre: 'pr-postgres-hardening-p0-p2-2026-02-19.md', tipo: 'md', bytes: 2589, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
SET m += { nombre: 'pr-roadmap-status-refresh-2026-02-15.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.gh-comments/pr-roadmap-status-refresh-2026-02-15.md' })
SET a += { nombre: 'pr-roadmap-status-refresh-2026-02-15.md', tipo: 'md', bytes: 855, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.git.bfg-report/2026-02-19' })
SET m += { nombre: '2026-02-19', lenguaje: 'text' }
MERGE (a:Archivo { path: '.git.bfg-report/2026-02-19/14-48-28/cache-stats.txt' })
SET a += { nombre: 'cache-stats.txt', tipo: 'txt', bytes: 538, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.git.bfg-report/2026-02-19' })
SET m += { nombre: '2026-02-19', lenguaje: 'text' }
MERGE (a:Archivo { path: '.git.bfg-report/2026-02-19/14-48-28/object-id-map.old-new.txt' })
SET a += { nombre: 'object-id-map.old-new.txt', tipo: 'txt', bytes: 1558, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/CODEOWNERS' })
SET m += { nombre: 'CODEOWNERS', lenguaje: 'text' }
MERGE (a:Archivo { path: '.github/CODEOWNERS' })
SET a += { nombre: 'CODEOWNERS', tipo: 'none', bytes: 3682, topico: 'other' }
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
SET a += { nombre: 'fix-determinism-sequenceclock-datefree.md', tipo: 'md', bytes: 1674, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/ISSUE_TEMPLATE' })
SET m += { nombre: 'ISSUE_TEMPLATE', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.github/ISSUE_TEMPLATE/refactor-monorepo.md' })
SET a += { nombre: 'refactor-monorepo.md', tipo: 'md', bytes: 1468, topico: 'doc' }
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
SET a += { nombre: 'PR_INSTRUCTIONS.md', tipo: 'md', bytes: 12700, topico: 'doc' }
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
SET a += { nombre: 'labeler.yml', tipo: 'yml', bytes: 2170, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/scripts' })
SET m += { nombre: 'scripts', lenguaje: 'text' }
MERGE (a:Archivo { path: '.github/scripts/generate_pr_manifest.sh' })
SET a += { nombre: 'generate_pr_manifest.sh', tipo: 'sh', bytes: 2368, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/ci.yml' })
SET a += { nombre: 'ci.yml', tipo: 'yml', bytes: 7818, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/contracts.yml' })
SET a += { nombre: 'contracts.yml', tipo: 'yml', bytes: 12894, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/create-labels.yml' })
SET a += { nombre: 'create-labels.yml', tipo: 'yml', bytes: 957, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/golden-paths.yml' })
SET a += { nombre: 'golden-paths.yml', tipo: 'yml', bytes: 1596, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/mkdocs-deploy.yml' })
SET a += { nombre: 'mkdocs-deploy.yml', tipo: 'yml', bytes: 944, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/pr-quality-gate.yml' })
SET a += { nombre: 'pr-quality-gate.yml', tipo: 'yml', bytes: 8411, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/release.yml' })
SET a += { nombre: 'release.yml', tipo: 'yml', bytes: 1200, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/test.yml' })
SET a += { nombre: 'test.yml', tipo: 'yml', bytes: 9278, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gitignore' })
SET m += { nombre: '.gitignore', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gitignore' })
SET a += { nombre: '.gitignore', tipo: 'none', bytes: 935, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.golden/README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: '.golden/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 3569, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.golden/hashes.json' })
SET m += { nombre: 'hashes.json', lenguaje: 'json' }
MERGE (a:Archivo { path: '.golden/hashes.json' })
SET a += { nombre: 'hashes.json', tipo: 'json', bytes: 2651, topico: 'config' }
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
SET a += { nombre: 'CHANGELOG.md', tipo: 'md', bytes: 9196, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'CONTRIBUTING.md' })
SET m += { nombre: 'CONTRIBUTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'CONTRIBUTING.md' })
SET a += { nombre: 'CONTRIBUTING.md', tipo: 'md', bytes: 534, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 6943, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'ROADMAP.md' })
SET m += { nombre: 'ROADMAP.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'ROADMAP.md' })
SET a += { nombre: 'ROADMAP.md', tipo: 'md', bytes: 24084, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/api/.env.example' })
SET a += { nombre: '.env.example', tipo: 'example', bytes: 154, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/api/.gitignore' })
SET a += { nombre: '.gitignore', tipo: 'none', bytes: 39, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/api/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 4592, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/api/Dockerfile' })
SET a += { nombre: 'Dockerfile', tipo: 'none', bytes: 444, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/api/Procfile' })
SET a += { nombre: 'Procfile', tipo: 'none', bytes: 20, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/api/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 1384, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/api/nixpacks.toml' })
SET a += { nombre: 'nixpacks.toml', tipo: 'toml', bytes: 265, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/api/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 616, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/app.ts' })
SET a += { nombre: 'app.ts', tipo: 'ts', bytes: 1232, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/db/pool.ts' })
SET a += { nombre: 'pool.ts', tipo: 'ts', bytes: 359, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/plugins/env.ts' })
SET a += { nombre: 'env.ts', tipo: 'ts', bytes: 1107, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/plugins/logger.ts' })
SET a += { nombre: 'logger.ts', tipo: 'ts', bytes: 170, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/routes/dbReady.ts' })
SET a += { nombre: 'dbReady.ts', tipo: 'ts', bytes: 725, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/routes/health.ts' })
SET a += { nombre: 'health.ts', tipo: 'ts', bytes: 221, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/routes/version.ts' })
SET a += { nombre: 'version.ts', tipo: 'ts', bytes: 208, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/api/src/server.ts' })
SET a += { nombre: 'server.ts', tipo: 'ts', bytes: 326, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/api' })
SET m += { nombre: 'api', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/api/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 453, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/web/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 7612, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/ATTRIBUTIONS.md' })
SET a += { nombre: 'ATTRIBUTIONS.md', tipo: 'md', bytes: 300, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/DOCUMENTATION_INDEX.md' })
SET a += { nombre: 'DOCUMENTATION_INDEX.md', tipo: 'md', bytes: 1834, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/DVT_GRAPH_CANVAS_UX_OPTIMIZATION.md' })
SET a += { nombre: 'DVT_GRAPH_CANVAS_UX_OPTIMIZATION.md', tipo: 'md', bytes: 6001, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/FRONTEND_PLAN_BACK_ALIGNMENT.md' })
SET a += { nombre: 'FRONTEND_PLAN_BACK_ALIGNMENT.md', tipo: 'md', bytes: 6317, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/FRONTEND_SPRINT_PLAN_TASKS_RISKS.md' })
SET a += { nombre: 'FRONTEND_SPRINT_PLAN_TASKS_RISKS.md', tipo: 'md', bytes: 7286, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 5240, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/apple-touch-icon.png' })
SET a += { nombre: 'apple-touch-icon.png', tipo: 'png', bytes: 28451, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/favicon-96x96.png' })
SET a += { nombre: 'favicon-96x96.png', tipo: 'png', bytes: 7099, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/favicon.ico' })
SET a += { nombre: 'favicon.ico', tipo: 'ico', bytes: 15086, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/favicon.svg' })
SET a += { nombre: 'favicon.svg', tipo: 'svg', bytes: 2189384, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/site.webmanifest' })
SET a += { nombre: 'site.webmanifest', tipo: 'webmanifest', bytes: 458, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/web-app-manifest-192x192.png' })
SET a += { nombre: 'web-app-manifest-192x192.png', tipo: 'png', bytes: 32387, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/favicon/web-app-manifest-512x512.png' })
SET a += { nombre: 'web-app-manifest-512x512.png', tipo: 'png', bytes: 209480, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'apps/web/guidelines/Guidelines.md' })
SET a += { nombre: 'Guidelines.md', tipo: 'md', bytes: 2560, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 1013, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/web/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 2614, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'apps/web/postcss.config.mjs' })
SET a += { nombre: 'postcss.config.mjs', tipo: 'mjs', bytes: 461, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/App.tsx' })
SET a += { nombre: 'App.tsx', tipo: 'tsx', bytes: 279, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/Root.tsx' })
SET a += { nombre: 'Root.tsx', tipo: 'tsx', bytes: 1947, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
SET a += { nombre: 'Console.tsx', tipo: 'tsx', bytes: 5920, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
SET a += { nombre: 'DbtExplorer.tsx', tipo: 'tsx', bytes: 5718, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
SET a += { nombre: 'GraphCanvas.tsx', tipo: 'tsx', bytes: 9853, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
SET a += { nombre: 'InspectorPanel.tsx', tipo: 'tsx', bytes: 11507, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/LeftNavigation.tsx' })
SET a += { nombre: 'LeftNavigation.tsx', tipo: 'tsx', bytes: 2143, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
SET a += { nombre: 'Modals.tsx', tipo: 'tsx', bytes: 11025, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
SET a += { nombre: 'SourceImportWizard.tsx', tipo: 'tsx', bytes: 25817, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
SET a += { nombre: 'TopAppBar.tsx', tipo: 'tsx', bytes: 9458, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.module.css' })
SET a += { nombre: 'DbtNodeComponent.module.css', tipo: 'css', bytes: 54, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
SET a += { nombre: 'DbtNodeComponent.tsx', tipo: 'tsx', bytes: 6544, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/figma/ImageWithFallback.tsx' })
SET a += { nombre: 'ImageWithFallback.tsx', tipo: 'tsx', bytes: 1160, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/accordion.tsx' })
SET a += { nombre: 'accordion.tsx', tipo: 'tsx', bytes: 2057, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/alert-dialog.tsx' })
SET a += { nombre: 'alert-dialog.tsx', tipo: 'tsx', bytes: 3781, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/alert.tsx' })
SET a += { nombre: 'alert.tsx', tipo: 'tsx', bytes: 1590, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/aspect-ratio.tsx' })
SET a += { nombre: 'aspect-ratio.tsx', tipo: 'tsx', bytes: 282, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/avatar.tsx' })
SET a += { nombre: 'avatar.tsx', tipo: 'tsx', bytes: 1046, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
SET a += { nombre: 'badge.tsx', tipo: 'tsx', bytes: 1591, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/breadcrumb.tsx' })
SET a += { nombre: 'breadcrumb.tsx', tipo: 'tsx', bytes: 2357, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
SET a += { nombre: 'button.tsx', tipo: 'tsx', bytes: 2085, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/calendar.tsx' })
SET a += { nombre: 'calendar.tsx', tipo: 'tsx', bytes: 2880, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
SET a += { nombre: 'card.tsx', tipo: 'tsx', bytes: 1892, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/carousel.tsx' })
SET a += { nombre: 'carousel.tsx', tipo: 'tsx', bytes: 5524, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/chart.tsx' })
SET a += { nombre: 'chart.tsx', tipo: 'tsx', bytes: 9693, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/checkbox.tsx' })
SET a += { nombre: 'checkbox.tsx', tipo: 'tsx', bytes: 1239, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/collapsible.tsx' })
SET a += { nombre: 'collapsible.tsx', tipo: 'tsx', bytes: 752, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/command.tsx' })
SET a += { nombre: 'command.tsx', tipo: 'tsx', bytes: 4562, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/context-menu.tsx' })
SET a += { nombre: 'context-menu.tsx', tipo: 'tsx', bytes: 8127, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/dialog.tsx' })
SET a += { nombre: 'dialog.tsx', tipo: 'tsx', bytes: 3789, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/drawer.tsx' })
SET a += { nombre: 'drawer.tsx', tipo: 'tsx', bytes: 4071, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/dropdown-menu.tsx' })
SET a += { nombre: 'dropdown-menu.tsx', tipo: 'tsx', bytes: 8175, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/form.tsx' })
SET a += { nombre: 'form.tsx', tipo: 'tsx', bytes: 3701, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/hover-card.tsx' })
SET a += { nombre: 'hover-card.tsx', tipo: 'tsx', bytes: 1522, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/input-otp.tsx' })
SET a += { nombre: 'input-otp.tsx', tipo: 'tsx', bytes: 2256, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
SET a += { nombre: 'input.tsx', tipo: 'tsx', bytes: 962, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/label.tsx' })
SET a += { nombre: 'label.tsx', tipo: 'tsx', bytes: 609, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/menubar.tsx' })
SET a += { nombre: 'menubar.tsx', tipo: 'tsx', bytes: 8340, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/navigation-menu.tsx' })
SET a += { nombre: 'navigation-menu.tsx', tipo: 'tsx', bytes: 6625, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/pagination.tsx' })
SET a += { nombre: 'pagination.tsx', tipo: 'tsx', bytes: 2677, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/popover.tsx' })
SET a += { nombre: 'popover.tsx', tipo: 'tsx', bytes: 1634, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/progress.tsx' })
SET a += { nombre: 'progress.tsx', tipo: 'tsx', bytes: 718, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/radio-group.tsx' })
SET a += { nombre: 'radio-group.tsx', tipo: 'tsx', bytes: 1470, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/resizable.tsx' })
SET a += { nombre: 'resizable.tsx', tipo: 'tsx', bytes: 2008, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
SET a += { nombre: 'scroll-area.tsx', tipo: 'tsx', bytes: 1628, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/select.tsx' })
SET a += { nombre: 'select.tsx', tipo: 'tsx', bytes: 6204, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/separator.tsx' })
SET a += { nombre: 'separator.tsx', tipo: 'tsx', bytes: 706, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/settings.json' })
SET a += { nombre: 'settings.json', tipo: 'json', bytes: 34, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/sheet.tsx' })
SET a += { nombre: 'sheet.tsx', tipo: 'tsx', bytes: 4093, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
SET a += { nombre: 'sidebar.tsx', tipo: 'tsx', bytes: 21531, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/skeleton.tsx' })
SET a += { nombre: 'skeleton.tsx', tipo: 'tsx', bytes: 275, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/slider.tsx' })
SET a += { nombre: 'slider.tsx', tipo: 'tsx', bytes: 1962, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/sonner.tsx' })
SET a += { nombre: 'sonner.tsx', tipo: 'tsx', bytes: 571, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/switch.tsx' })
SET a += { nombre: 'switch.tsx', tipo: 'tsx', bytes: 1176, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/table.tsx' })
SET a += { nombre: 'table.tsx', tipo: 'tsx', bytes: 2362, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
SET a += { nombre: 'tabs.tsx', tipo: 'tsx', bytes: 1927, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/textarea.tsx' })
SET a += { nombre: 'textarea.tsx', tipo: 'tsx', bytes: 766, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/toggle-group.tsx' })
SET a += { nombre: 'toggle-group.tsx', tipo: 'tsx', bytes: 1910, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/toggle.tsx' })
SET a += { nombre: 'toggle.tsx', tipo: 'tsx', bytes: 1552, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/tooltip.tsx' })
SET a += { nombre: 'tooltip.tsx', tipo: 'tsx', bytes: 1892, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/use-mobile.ts' })
SET a += { nombre: 'use-mobile.ts', tipo: 'ts', bytes: 576, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
SET a += { nombre: 'utils.ts', tipo: 'ts', bytes: 169, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/ui/vitest.workspace.ts' })
SET a += { nombre: 'vitest.workspace.ts', tipo: 'ts', bytes: 31, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
SET a += { nombre: 'RunView.tsx', tipo: 'tsx', bytes: 14405, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/data/mockData.ts' })
SET a += { nombre: 'mockData.ts', tipo: 'ts', bytes: 11761, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/data/mockDbtData.ts' })
SET a += { nombre: 'mockDbtData.ts', tipo: 'ts', bytes: 12252, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/routes.ts' })
SET a += { nombre: 'routes.ts', tipo: 'ts', bytes: 1023, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
SET a += { nombre: 'appStore.ts', tipo: 'ts', bytes: 5718, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/stores/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 6522, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
SET a += { nombre: 'dbt.ts', tipo: 'ts', bytes: 2865, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/types/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 3816, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
SET a += { nombre: 'AdminView.tsx', tipo: 'tsx', bytes: 11207, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
SET a += { nombre: 'ArtifactsView.tsx', tipo: 'tsx', bytes: 9004, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
SET a += { nombre: 'Canvas.tsx', tipo: 'tsx', bytes: 18111, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/CostView.tsx' })
SET a += { nombre: 'CostView.tsx', tipo: 'tsx', bytes: 10386, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
SET a += { nombre: 'DiffView.tsx', tipo: 'tsx', bytes: 11850, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
SET a += { nombre: 'LineageView.tsx', tipo: 'tsx', bytes: 10164, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
SET a += { nombre: 'PluginsView.tsx', tipo: 'tsx', bytes: 7579, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
SET a += { nombre: 'RunsView.tsx', tipo: 'tsx', bytes: 14496, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/main.tsx' })
SET a += { nombre: 'main.tsx', tipo: 'tsx', bytes: 173, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/styles/fonts.css' })
SET a += { nombre: 'fonts.css', tipo: 'css', bytes: 0, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/styles/index.css' })
SET a += { nombre: 'index.css', tipo: 'css', bytes: 623, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/styles/tailwind.css' })
SET a += { nombre: 'tailwind.css', tipo: 'css', bytes: 98, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/styles/theme.css' })
SET a += { nombre: 'theme.css', tipo: 'css', bytes: 5448, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/web/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 421, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/vite.config.ts' })
SET a += { nombre: 'vite.config.ts', tipo: 'ts', bytes: 623, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'bfg.jar' })
SET m += { nombre: 'bfg.jar', lenguaje: 'text' }
MERGE (a:Archivo { path: 'bfg.jar' })
SET a += { nombre: 'bfg.jar', tipo: 'jar', bytes: 14483456, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'commitlint.config.cjs' })
SET m += { nombre: 'commitlint.config.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'commitlint.config.cjs' })
SET a += { nombre: 'commitlint.config.cjs', tipo: 'cjs', bytes: 881, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'contracts/compat' })
SET m += { nombre: 'compat', lenguaje: 'json' }
MERGE (a:Archivo { path: 'contracts/compat/plan-compat.json' })
SET a += { nombre: 'plan-compat.json', tipo: 'json', bytes: 150, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'contracts/compat' })
SET m += { nombre: 'compat', lenguaje: 'json' }
MERGE (a:Archivo { path: 'contracts/compat/plan-compat.schema.json' })
SET a += { nombre: 'plan-compat.schema.json', tipo: 'json', bytes: 1147, topico: 'config' }
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
MERGE (m:Modulo { path: 'docs/CONTRIBUTING.md' })
SET m += { nombre: 'CONTRIBUTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CONTRIBUTING.md' })
SET a += { nombre: 'CONTRIBUTING.md', tipo: 'md', bytes: 17708, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/DOCS_README.md' })
SET m += { nombre: 'DOCS_README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/DOCS_README.md' })
SET a += { nombre: 'DOCS_README.md', tipo: 'md', bytes: 696, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/INDEX.md' })
SET m += { nombre: 'INDEX.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 2555, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md' })
SET a += { nombre: 'ADR-0000-Code-generation-with-normative-traceability-required.en.md', tipo: 'md', bytes: 11003, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0001-temporal-integration-test-policy.md' })
SET a += { nombre: 'ADR-0001-temporal-integration-test-policy.md', tipo: 'md', bytes: 3711, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0002-neo4j-knowledge-graph-context-repository.md' })
SET a += { nombre: 'ADR-0002-neo4j-knowledge-graph-context-repository.md', tipo: 'md', bytes: 3524, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0003-execution-model.md' })
SET a += { nombre: 'ADR-0003-execution-model.md', tipo: 'md', bytes: 5434, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0004-event-sourcing-strategy.md' })
SET a += { nombre: 'ADR-0004-event-sourcing-strategy.md', tipo: 'md', bytes: 8730, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0005-contract-formalization-tooling.md' })
SET a += { nombre: 'ADR-0005-contract-formalization-tooling.md', tipo: 'md', bytes: 2613, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0006-contract-tooling-governance.md' })
SET a += { nombre: 'ADR-0006-contract-tooling-governance.md', tipo: 'md', bytes: 3330, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0007_RunCancellation.md' })
SET a += { nombre: 'ADR-0007_RunCancellation.md', tipo: 'md', bytes: 3607, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0008_Signal_Idempotency.md' })
SET a += { nombre: 'ADR-0008_Signal_Idempotency.md', tipo: 'md', bytes: 2822, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0009_Outbox_Ordering.md' })
SET a += { nombre: 'ADR-0009_Outbox_Ordering.md', tipo: 'md', bytes: 3969, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0010-run-event-envelope-split.md' })
SET a += { nombre: 'ADR-0010-run-event-envelope-split.md', tipo: 'md', bytes: 7909, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0011-run-started-ownership.md' })
SET a += { nombre: 'ADR-0011-run-started-ownership.md', tipo: 'md', bytes: 2065, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0012-plan-integrity-ownership.md' })
SET a += { nombre: 'ADR-0012-plan-integrity-ownership.md', tipo: 'md', bytes: 4019, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0012a_Canonical_Error_Code_Strategy.md' })
SET a += { nombre: 'ADR-0012a_Canonical_Error_Code_Strategy.md', tipo: 'md', bytes: 1363, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0013-run-state-store-bootstrapRunTx.md' })
SET a += { nombre: 'ADR-0013-run-state-store-bootstrapRunTx.md', tipo: 'md', bytes: 2134, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0014-run-driven-adapter-model.md' })
SET a += { nombre: 'ADR-0014-run-driven-adapter-model.md', tipo: 'md', bytes: 1059, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0015-getRunStatus-read-model-separation.md' })
SET a += { nombre: 'ADR-0015-getRunStatus-read-model-separation.md', tipo: 'md', bytes: 974, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0016-logicalAttemptId-adapter-ownership.md' })
SET a += { nombre: 'ADR-0016-logicalAttemptId-adapter-ownership.md', tipo: 'md', bytes: 1228, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0017_ExecutionPlan_Schema_Versioning.md' })
SET a += { nombre: 'ADR-0017_ExecutionPlan_Schema_Versioning.md', tipo: 'md', bytes: 10335, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0018_Shared_Kernel_Ownership_Governance.md' })
SET a += { nombre: 'ADR-0018_Shared_Kernel_Ownership_Governance.md', tipo: 'md', bytes: 6202, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md' })
SET a += { nombre: 'ADR-0019_Adapter_Equivalence_and_Maintenance_Boundary.md', tipo: 'md', bytes: 2157, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-Implementation Status.md' })
SET a += { nombre: 'ADR-Implementation Status.md', tipo: 'md', bytes: 23443, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR_Status_Board_Extensive.md' })
SET a += { nombre: 'ADR_Status_Board_Extensive.md', tipo: 'md', bytes: 2010, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/_archive/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 371, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/adr/_drafts/18 pendiente revision.txt' })
SET a += { nombre: '18 pendiente revision.txt', tipo: 'txt', bytes: 4839, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/_drafts/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 349, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 680, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/engine.zip' })
SET a += { nombre: 'engine.zip', tipo: 'zip', bytes: 237560, topico: 'other' }
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
SET a += { nombre: 'EnginePolicies.md', tipo: 'md', bytes: 10136, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/adapters/temporal/TemporalAdapter.spec.md' })
SET a += { nombre: 'TemporalAdapter.spec.md', tipo: 'md', bytes: 16431, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/CONTRACT_TEMPLATE.v1.md' })
SET a += { nombre: 'CONTRACT_TEMPLATE.v1.md', tipo: 'md', bytes: 1595, topico: 'doc' }
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
SET a += { nombre: 'README.md', tipo: 'md', bytes: 11029, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 4980, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/adapters.capabilities.json' })
SET a += { nombre: 'adapters.capabilities.json', tipo: 'json', bytes: 1176, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/capabilities/capabilities.schema.json' })
SET a += { nombre: 'capabilities.schema.json', tipo: 'json', bytes: 4275, topico: 'config' }
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
SET a += { nombre: 'ExecutionSemantics.v1.md', tipo: 'md', bytes: 37819, topico: 'doc' }
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
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IProviderAdapter.v1.md' })
SET a += { nombre: 'IProviderAdapter.v1.md', tipo: 'md', bytes: 4592, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.reference.v1.md' })
SET a += { nombre: 'IWorkflowEngine.reference.v1.md', tipo: 'md', bytes: 18486, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.v1.md' })
SET a += { nombre: 'IWorkflowEngine.v1.md', tipo: 'md', bytes: 4404, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IWorkflowEngine.v2.0.md' })
SET a += { nombre: 'IWorkflowEngine.v2.0.md', tipo: 'md', bytes: 2897, topico: 'doc' }
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
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEvents.v1.idempotency_vectors.json' })
SET a += { nombre: 'RunEvents.v1.idempotency_vectors.json', tipo: 'json', bytes: 1851, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEvents.v1.md' })
SET a += { nombre: 'RunEvents.v1.md', tipo: 'md', bytes: 16972, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/RunEvents.v2.0.md' })
SET a += { nombre: 'RunEvents.v2.0.md', tipo: 'md', bytes: 22048, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/SignalsAndAuth.v1.md' })
SET a += { nombre: 'SignalsAndAuth.v1.md', tipo: 'md', bytes: 18397, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/engine/events/RunEventRecord.v2.0.schema.json' })
SET a += { nombre: 'RunEventRecord.v2.0.schema.json', tipo: 'json', bytes: 2492, topico: 'config' }
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
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/schemas/canvas-state.schema.json' })
SET a += { nombre: 'canvas-state.schema.json', tipo: 'json', bytes: 4999, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/schemas/logical-graph.schema.json' })
SET a += { nombre: 'logical-graph.schema.json', tipo: 'json', bytes: 4596, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/schemas/provenance-event.schema.json' })
SET a += { nombre: 'provenance-event.schema.json', tipo: 'json', bytes: 6401, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/security/AuditLog.v1.md' })
SET a += { nombre: 'AuditLog.v1.md', tipo: 'md', bytes: 12314, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/security/IAuthorization.v1.md' })
SET a += { nombre: 'IAuthorization.v1.md', tipo: 'md', bytes: 9073, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/state-store/IRunStateStore.v1.md' })
SET a += { nombre: 'IRunStateStore.v1.md', tipo: 'md', bytes: 4670, topico: 'doc' }
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
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/engine/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 23795, topico: 'doc' }
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
MERGE (a:Archivo { path: 'docs/architecture/frontend/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 391, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 492, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/infra/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 416, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/modulos canonicos.png' })
SET a += { nombre: 'modulos canonicos.png', tipo: 'png', bytes: 2253046, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/vision.zip' })
SET a += { nombre: 'vision.zip', tipo: 'zip', bytes: 20134, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/.github/workflows/adr-linkage.yml' })
SET a += { nombre: 'adr-linkage.yml', tipo: 'yml', bytes: 1468, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 45, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md' })
SET a += { nombre: 'DVT_Blueprint_v0.6_MASTER.md', tipo: 'md', bytes: 15660, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 471, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/lore.md' })
SET a += { nombre: 'lore.md', tipo: 'md', bytes: 3530, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/pending.txt' })
SET a += { nombre: 'pending.txt', tipo: 'txt', bytes: 1034, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/standards/development.md' })
SET a += { nombre: 'development.md', tipo: 'md', bytes: 3077, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/standards/modules-canonicos-minimos.md' })
SET a += { nombre: 'modules-canonicos-minimos.md', tipo: 'md', bytes: 7144, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/infra/ci/adr-linkage.yml' })
SET a += { nombre: 'adr-linkage.yml', tipo: 'yml', bytes: 2434, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/infra/kafka/local-compose-kafka.yaml' })
SET a += { nombre: 'local-compose-kafka.yaml', tipo: 'yaml', bytes: 1364, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/infra/rds/local-compose-rds.yaml' })
SET a += { nombre: 'local-compose-rds.yaml', tipo: 'yaml', bytes: 700, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/tooling/scripts/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 140, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/archive' })
SET m += { nombre: 'archive', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/archive/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 364, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/contracts/engine/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 375, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/contracts/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 507, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/contracts/planner/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 396, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/contracts/shared/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 377, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0002-neo4j-knowledge-graph-context-repository.md' })
SET a += { nombre: 'ADR-0002-neo4j-knowledge-graph-context-repository.md', tipo: 'md', bytes: 2889, topico: 'doc' }
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
MERGE (a:Archivo { path: 'docs/guides/SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md' })
SET a += { nombre: 'SISTEMA DE TRABAJO OBLIGATORIO PARA IA.md', tipo: 'md', bytes: 12515, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 366, topico: 'doc' }
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
SET a += { nombre: 'ROADMAP_AND_ISSUES_MAP.md', tipo: 'md', bytes: 3466, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/CI_CD_ROLLBACK_PLAN_20260228.md' })
SET a += { nombre: 'CI_CD_ROLLBACK_PLAN_20260228.md', tipo: 'md', bytes: 3784, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DVT_ARCH_REVIEW_GAP_TASKS_20260226.md' })
SET a += { nombre: 'DVT_ARCH_REVIEW_GAP_TASKS_20260226.md', tipo: 'md', bytes: 12160, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DVT_REMEDIATION_PLAN.md' })
SET a += { nombre: 'DVT_REMEDIATION_PLAN.md', tipo: 'md', bytes: 38970, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DVT_engine_remediation_ai_plan.md' })
SET a += { nombre: 'DVT_engine_remediation_ai_plan.md', tipo: 'md', bytes: 17917, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/ENGINE_DVT_ESPEC_CHECKLIST_ESTADO.md' })
SET a += { nombre: 'ENGINE_DVT_ESPEC_CHECKLIST_ESTADO.md', tipo: 'md', bytes: 4197, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/HITO_0_ESTABILIZACION_INMEDIATA_PLAN.md' })
SET a += { nombre: 'HITO_0_ESTABILIZACION_INMEDIATA_PLAN.md', tipo: 'md', bytes: 13929, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 479, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/proposals/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 381, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/reviews/PR_313_STABILIZATION_EXECUTION_REPORT_20260228.md' })
SET a += { nombre: 'PR_313_STABILIZATION_EXECUTION_REPORT_20260228.md', tipo: 'md', bytes: 7817, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/reviews/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 534, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/status/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 376, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/review' })
SET m += { nombre: 'review', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/review/DVT+_Architectural_Review_20260225.md' })
SET a += { nombre: 'DVT+_Architectural_Review_20260225.md', tipo: 'md', bytes: 44024, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/review' })
SET m += { nombre: 'review', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/review/DVT+_Architectural_Review_20260226_AI.md' })
SET a += { nombre: 'DVT+_Architectural_Review_20260226_AI.md', tipo: 'md', bytes: 9204, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/runbooks/index.md' })
SET a += { nombre: 'index.md', tipo: 'md', bytes: 371, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'eslint-issues.txt' })
SET m += { nombre: 'eslint-issues.txt', lenguaje: 'text' }
MERGE (a:Archivo { path: 'eslint-issues.txt' })
SET a += { nombre: 'eslint-issues.txt', tipo: 'txt', bytes: 0, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'eslint.config.cjs' })
SET m += { nombre: 'eslint.config.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'eslint.config.cjs' })
SET a += { nombre: 'eslint.config.cjs', tipo: 'cjs', bytes: 13836, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 346, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'infra/docker/postgres/docker-compose.yml' })
SET a += { nombre: 'docker-compose.yml', tipo: 'yml', bytes: 464, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'text' }
MERGE (a:Archivo { path: 'infra/docker/postgres/init/001_bootstrap.sql' })
SET a += { nombre: '001_bootstrap.sql', tipo: 'sql', bytes: 297, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 1446, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docker-compose.yml' })
SET a += { nombre: 'docker-compose.yml', tipo: 'yml', bytes: 606, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/DECISIONS.md' })
SET a += { nombre: 'DECISIONS.md', tipo: 'md', bytes: 667, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/adr/ADR-0001-sse-first.md' })
SET a += { nombre: 'ADR-0001-sse-first.md', tipo: 'md', bytes: 585, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/adr/ADR-0002-postgres-authority-kafka-bus.md' })
SET a += { nombre: 'ADR-0002-postgres-authority-kafka-bus.md', tipo: 'md', bytes: 531, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/adr/ADR-0003-transactional-outbox.md' })
SET a += { nombre: 'ADR-0003-transactional-outbox.md', tipo: 'md', bytes: 457, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/adr/ADR-0004-run-seq-allocation.md' })
SET a += { nombre: 'ADR-0004-run-seq-allocation.md', tipo: 'md', bytes: 417, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/adr/ADR-0005-single-service-mvp.md' })
SET a += { nombre: 'ADR-0005-single-service-mvp.md', tipo: 'md', bytes: 408, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/adr/ADR-0006-debian-node-image.md' })
SET a += { nombre: 'ADR-0006-debian-node-image.md', tipo: 'md', bytes: 391, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/docs/ai/AI-OPERATIONS.md' })
SET a += { nombre: 'AI-OPERATIONS.md', tipo: 'md', bytes: 1234, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/docker' })
SET m += { nombre: 'docker', lenguaje: 'text' }
MERGE (a:Archivo { path: 'infra/docker/postgres/redpanda/migrations/001_init.sql' })
SET a += { nombre: '001_init.sql', tipo: 'sql', bytes: 1231, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/prototypes/api/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 92, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'json' }
MERGE (a:Archivo { path: 'infra/prototypes/api/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 516, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/catchup.ts' })
SET a += { nombre: 'catchup.ts', tipo: 'ts', bytes: 685, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/config.ts' })
SET a += { nombre: 'config.ts', tipo: 'ts', bytes: 1323, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/connections/kafkaConnection.ts' })
SET a += { nombre: 'kafkaConnection.ts', tipo: 'ts', bytes: 3435, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/connections/pgConnection.ts' })
SET a += { nombre: 'pgConnection.ts', tipo: 'ts', bytes: 1146, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/contracts.ts' })
SET a += { nombre: 'contracts.ts', tipo: 'ts', bytes: 357, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/db.ts' })
SET a += { nombre: 'db.ts', tipo: 'ts', bytes: 179, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/kafka.ts' })
SET a += { nombre: 'kafka.ts', tipo: 'ts', bytes: 162, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/kafkaTail.ts' })
SET a += { nombre: 'kafkaTail.ts', tipo: 'ts', bytes: 612, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/outboxPublisher.ts' })
SET a += { nombre: 'outboxPublisher.ts', tipo: 'ts', bytes: 2178, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/runEventsRepo.ts' })
SET a += { nombre: 'runEventsRepo.ts', tipo: 'ts', bytes: 2570, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/runStreamHub.ts' })
SET a += { nombre: 'runStreamHub.ts', tipo: 'ts', bytes: 691, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/server.ts' })
SET a += { nombre: 'server.ts', tipo: 'ts', bytes: 3287, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/sse.ts' })
SET a += { nombre: 'sse.ts', tipo: 'ts', bytes: 571, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'infra/prototypes/api/src/wiring.ts' })
SET a += { nombre: 'wiring.ts', tipo: 'ts', bytes: 1386, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'json' }
MERGE (a:Archivo { path: 'infra/prototypes/api/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 380, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'infra/prototypes' })
SET m += { nombre: 'prototypes', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'infra/prototypes/api/valoracion.md' })
SET a += { nombre: 'valoracion.md', tipo: 'md', bytes: 3900, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'mkdocs.yml' })
SET m += { nombre: 'mkdocs.yml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'mkdocs.yml' })
SET a += { nombre: 'mkdocs.yml', tipo: 'yml', bytes: 1225, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'package.json' })
SET m += { nombre: 'package.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 7301, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 3640, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/DESIGN.md' })
SET a += { nombre: 'DESIGN.md', tipo: 'md', bytes: 2181, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'text' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/migrations/001_init.sql' })
SET a += { nombre: '001_init.sql', tipo: 'sql', bytes: 1515, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'text' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/migrations/002_add_claimed_at.sql' })
SET a += { nombre: '002_add_claimed_at.sql', tipo: 'sql', bytes: 642, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 520, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
SET a += { nombre: 'PostgresStateStoreAdapter.ts', tipo: 'ts', bytes: 37141, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 926, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/runStateCommandPortBridge.ts' })
SET a += { nombre: 'runStateCommandPortBridge.ts', tipo: 'ts', bytes: 1270, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/sqlUtils.ts' })
SET a += { nombre: 'sqlUtils.ts', tipo: 'ts', bytes: 750, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1234, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/test/runStateCommandPortBridge.test.ts' })
SET a += { nombre: 'runStateCommandPortBridge.test.ts', tipo: 'ts', bytes: 1905, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 13924, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 144, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 557, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 184, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 7566, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 1196, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts' })
SET a += { nombre: 'TemporalAdapter.ts', tipo: 'ts', bytes: 6014, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts' })
SET a += { nombre: 'TemporalClient.ts', tipo: 'ts', bytes: 2362, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts' })
SET a += { nombre: 'TemporalWorkerHost.ts', tipo: 'ts', bytes: 2675, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/WorkflowMapper.ts' })
SET a += { nombre: 'WorkflowMapper.ts', tipo: 'ts', bytes: 2228, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/activities/stepActivities.ts' })
SET a += { nombre: 'stepActivities.ts', tipo: 'ts', bytes: 12324, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/config.ts' })
SET a += { nombre: 'config.ts', tipo: 'ts', bytes: 3702, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/engine-types.ts' })
SET a += { nombre: 'engine-types.ts', tipo: 'ts', bytes: 472, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1643, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/versioning.ts' })
SET a += { nombre: 'versioning.ts', tipo: 'ts', bytes: 718, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts' })
SET a += { nombre: 'RunPlanWorkflow.ts', tipo: 'ts', bytes: 15643, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/activities.test.ts' })
SET a += { nombre: 'activities.test.ts', tipo: 'ts', bytes: 18203, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts' })
SET a += { nombre: 'integration.time-skipping.test.ts', tipo: 'ts', bytes: 37829, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 4958, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts' })
SET a += { nombre: 'workflow-continue-as-new.test.ts', tipo: 'ts', bytes: 2216, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts' })
SET a += { nombre: 'workflow-dag-scheduler.test.ts', tipo: 'ts', bytes: 2399, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-literals.test.ts' })
SET a += { nombre: 'workflow-literals.test.ts', tipo: 'ts', bytes: 1381, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-retry-policy.test.ts' })
SET a += { nombre: 'workflow-retry-policy.test.ts', tipo: 'ts', bytes: 712, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 144, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 344, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 210, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 184, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 495, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/index.d.ts' })
SET a += { nombre: 'index.d.ts', tipo: 'ts', bytes: 121, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/index.js' })
SET a += { nombre: 'index.js', tipo: 'js', bytes: 512, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 85, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/jcs.d.ts' })
SET a += { nombre: 'jcs.d.ts', tipo: 'ts', bytes: 446, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/jcs.js' })
SET a += { nombre: 'jcs.js', tipo: 'js', bytes: 2140, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/jcs.ts' })
SET a += { nombre: 'jcs.ts', tipo: 'ts', bytes: 2122, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/sha256.d.ts' })
SET a += { nombre: 'sha256.d.ts', tipo: 'ts', bytes: 107, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/sha256.js' })
SET a += { nombre: 'sha256.js', tipo: 'js', bytes: 345, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/src/sha256.ts' })
SET a += { nombre: 'sha256.ts', tipo: 'ts', bytes: 216, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/canonical/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 323, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 1998, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 97, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/compare-hashes.cjs' })
SET a += { nombre: 'compare-hashes.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/db-migrate.cjs' })
SET a += { nombre: 'db-migrate.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'text' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/enable-workflow.sh' })
SET a += { nombre: 'enable-workflow.sh', tipo: 'sh', bytes: 36, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 526, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/run-golden-paths.cjs' })
SET a += { nombre: 'run-golden-paths.cjs', tipo: 'cjs', bytes: 4940, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 97, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 97, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 286, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/cli/validate-contracts.cjs' })
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 8063, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 16883, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/compat/plan-compat.schema.json' })
SET a += { nombre: 'plan-compat.schema.json', tipo: 'json', bytes: 825, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
SET a += { nombre: 'index.d.ts', tipo: 'ts', bytes: 926, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/index.js' })
SET a += { nombre: 'index.js', tipo: 'js', bytes: 1661, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1364, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 550, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.d.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.d.ts', tipo: 'ts', bytes: 1341, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.js' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.js', tipo: 'js', bytes: 130, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.ts', tipo: 'ts', bytes: 1288, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.d.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.d.ts', tipo: 'ts', bytes: 1743, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.js' })
SET a += { nombre: 'IProjectorAdapter.v1.js', tipo: 'js', bytes: 126, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.ts', tipo: 'ts', bytes: 1685, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.d.ts' })
SET a += { nombre: 'IProviderAdapter.v1.d.ts', tipo: 'ts', bytes: 952, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.js' })
SET a += { nombre: 'IProviderAdapter.v1.js', tipo: 'js', bytes: 125, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts' })
SET a += { nombre: 'IProviderAdapter.v1.ts', tipo: 'ts', bytes: 904, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.d.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.d.ts', tipo: 'ts', bytes: 863, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.js' })
SET a += { nombre: 'IStateStoreAdapter.v1.js', tipo: 'js', bytes: 127, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.ts', tipo: 'ts', bytes: 812, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.d.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.d.ts', tipo: 'ts', bytes: 2201, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.js' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.js', tipo: 'js', bytes: 131, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.ts', tipo: 'ts', bytes: 2122, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/ExecutionSemantics.v2.ts' })
SET a += { nombre: 'ExecutionSemantics.v2.ts', tipo: 'ts', bytes: 165, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts' })
SET a += { nombre: 'IOutboxStorage.v1.ts', tipo: 'ts', bytes: 541, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IProjector.v1.ts' })
SET a += { nombre: 'IProjector.v1.ts', tipo: 'ts', bytes: 178, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts' })
SET a += { nombre: 'IRunStateStore.v1.ts', tipo: 'ts', bytes: 333, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IWorkflowEngine.v1.ts' })
SET a += { nombre: 'IWorkflowEngine.v1.ts', tipo: 'ts', bytes: 114, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/RunEvents.v2.ts' })
SET a += { nombre: 'RunEvents.v2.ts', tipo: 'ts', bytes: 81, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts' })
SET a += { nombre: 'ExecutionPlan.v2.ts', tipo: 'ts', bytes: 2741, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/IExecutionPlanner.v2.ts' })
SET a += { nombre: 'IExecutionPlanner.v2.ts', tipo: 'ts', bytes: 372, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/PlannerInputEnvelopeV2.schema.json' })
SET a += { nombre: 'PlannerInputEnvelopeV2.schema.json', tipo: 'json', bytes: 2771, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/PlannerPolicies.v2.schema.json' })
SET a += { nombre: 'PlannerPolicies.v2.schema.json', tipo: 'json', bytes: 800, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/engine/IRunStateStore.v1.d.ts' })
SET a += { nombre: 'IRunStateStore.v1.d.ts', tipo: 'ts', bytes: 5348, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/engine/IRunStateStore.v1.js' })
SET a += { nombre: 'IRunStateStore.v1.js', tipo: 'js', bytes: 123, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts' })
SET a += { nombre: 'IRunStateStore.v1.ts', tipo: 'ts', bytes: 5312, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/errors.d.ts' })
SET a += { nombre: 'errors.d.ts', tipo: 'ts', bytes: 570, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/errors.js' })
SET a += { nombre: 'errors.js', tipo: 'js', bytes: 857, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 685, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/planner-input.d.ts' })
SET a += { nombre: 'planner-input.d.ts', tipo: 'ts', bytes: 2114, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/planner-input.js' })
SET a += { nombre: 'planner-input.js', tipo: 'js', bytes: 1256, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/planner-input.ts' })
SET a += { nombre: 'planner-input.ts', tipo: 'ts', bytes: 967, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/schemas.d.ts' })
SET a += { nombre: 'schemas.d.ts', tipo: 'ts', bytes: 9980, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/schemas.js' })
SET a += { nombre: 'schemas.js', tipo: 'js', bytes: 8486, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
SET a += { nombre: 'schemas.ts', tipo: 'ts', bytes: 12124, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.d.ts' })
SET a += { nombre: 'artifacts.d.ts', tipo: 'ts', bytes: 1205, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.js' })
SET a += { nombre: 'artifacts.js', tipo: 'js', bytes: 649, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
SET a += { nombre: 'artifacts.ts', tipo: 'ts', bytes: 1153, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.d.ts' })
SET a += { nombre: 'contracts.d.ts', tipo: 'ts', bytes: 2878, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.js' })
SET a += { nombre: 'contracts.js', tipo: 'js', bytes: 637, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
SET a += { nombre: 'contracts.ts', tipo: 'ts', bytes: 2980, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.d.ts' })
SET a += { nombre: 'state-store.d.ts', tipo: 'ts', bytes: 2587, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.js' })
SET a += { nombre: 'state-store.js', tipo: 'js', bytes: 710, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/validation.d.ts' })
SET a += { nombre: 'validation.d.ts', tipo: 'ts', bytes: 1985, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/validation.js' })
SET a += { nombre: 'validation.js', tipo: 'js', bytes: 3960, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
SET a += { nombre: 'validation.ts', tipo: 'ts', bytes: 6547, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/workflows.d.ts' })
SET a += { nombre: 'workflows.d.ts', tipo: 'ts', bytes: 867, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/workflows.js' })
SET a += { nombre: 'workflows.js', tipo: 'js', bytes: 850, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/workflows.ts' })
SET a += { nombre: 'workflows.ts', tipo: 'ts', bytes: 788, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/test/errors.test.ts' })
SET a += { nombre: 'errors.test.ts', tipo: 'ts', bytes: 478, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/test/fixtures/planner-contract.fixtures.ts' })
SET a += { nombre: 'planner-contract.fixtures.ts', tipo: 'ts', bytes: 2810, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/test/planner.contract.test.ts' })
SET a += { nombre: 'planner.contract.test.ts', tipo: 'ts', bytes: 2636, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/test/validation.test.ts' })
SET a += { nombre: 'validation.test.ts', tipo: 'ts', bytes: 1991, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 324, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 177, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 559, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 163, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/src/v1/ast.ts' })
SET a += { nombre: 'ast.ts', tipo: 'ts', bytes: 207, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/src/v1/evaluator.ts' })
SET a += { nombre: 'evaluator.ts', tipo: 'ts', bytes: 637, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/src/v1/parser.ts' })
SET a += { nombre: 'parser.ts', tipo: 'ts', bytes: 1781, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/test/dsl-v1.test.ts' })
SET a += { nombre: 'dsl-v1.test.ts', tipo: 'ts', bytes: 1051, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 323, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/dsl/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 117, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine-contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine-contracts/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 486, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine-contracts/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 304, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 33404, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/cli/src/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 210, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 869, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/schemas/commands/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 155, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/schemas/envelope/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 165, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/schemas/events/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 151, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/IPlanFetcher.ts' })
SET a += { nombre: 'IPlanFetcher.ts', tipo: 'ts', bytes: 884, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/IProviderAdapter.ts' })
SET a += { nombre: 'IProviderAdapter.ts', tipo: 'ts', bytes: 1816, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts' })
SET a += { nombre: 'ConductorAdapterStub.ts', tipo: 'ts', bytes: 1942, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts' })
SET a += { nombre: 'MockAdapter.ts', tipo: 'ts', bytes: 4289, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts' })
SET a += { nombre: 'TemporalAdapterStub.ts', tipo: 'ts', bytes: 1466, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/application/providerSelection.ts' })
SET a += { nombre: 'providerSelection.ts', tipo: 'ts', bytes: 2477, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/composition/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 176, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/IWorkflowEngine.v1_1_1.ts' })
SET a += { nombre: 'IWorkflowEngine.v1_1_1.ts', tipo: 'ts', bytes: 1852, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/ExecutionPlan.v1.ts' })
SET a += { nombre: 'ExecutionPlan.v1.ts', tipo: 'ts', bytes: 58, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/ExecutionSemantics.v2.ts' })
SET a += { nombre: 'ExecutionSemantics.v2.ts', tipo: 'ts', bytes: 212, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/IPlanResolver.v1.ts' })
SET a += { nombre: 'IPlanResolver.v1.ts', tipo: 'ts', bytes: 81, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/IProvider.v1.ts' })
SET a += { nombre: 'IProvider.v1.ts', tipo: 'ts', bytes: 89, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/IRunStateStore.v1.ts' })
SET a += { nombre: 'IRunStateStore.v1.ts', tipo: 'ts', bytes: 133, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/IWorkflowEngine.v1.ts' })
SET a += { nombre: 'IWorkflowEngine.v1.ts', tipo: 'ts', bytes: 69, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/RunEvents.v2.ts' })
SET a += { nombre: 'RunEvents.v2.ts', tipo: 'ts', bytes: 204, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/engine/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 679, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 4456, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/executionPlan.ts' })
SET a += { nombre: 'executionPlan.ts', tipo: 'ts', bytes: 1960, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 398, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/runEvents.ts' })
SET a += { nombre: 'runEvents.ts', tipo: 'ts', bytes: 2893, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 2283, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts' })
SET a += { nombre: 'SnapshotProjector.ts', tipo: 'ts', bytes: 5497, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts' })
SET a += { nombre: 'WorkflowEngine.ts', tipo: 'ts', bytes: 23923, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/idempotency.ts' })
SET a += { nombre: 'idempotency.ts', tipo: 'ts', bytes: 2832, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 401, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 401, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/domain/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 164, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/generated/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 170, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1555, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/metrics/IMetricsCollector.ts' })
SET a += { nombre: 'IMetricsCollector.ts', tipo: 'ts', bytes: 1787, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/IOutboxRateLimiter.ts' })
SET a += { nombre: 'IOutboxRateLimiter.ts', tipo: 'ts', bytes: 1010, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts' })
SET a += { nombre: 'InMemoryEventBus.ts', tipo: 'ts', bytes: 753, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts' })
SET a += { nombre: 'InMemoryOutboxStorage.ts', tipo: 'ts', bytes: 4288, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 1607, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts' })
SET a += { nombre: 'TokenBucketRateLimiter.ts', tipo: 'ts', bytes: 2361, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1783, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/ports/IPlanResolver.ts' })
SET a += { nombre: 'IPlanResolver.ts', tipo: 'ts', bytes: 629, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/ports/IRunStateStore.ts' })
SET a += { nombre: 'IRunStateStore.ts', tipo: 'ts', bytes: 2410, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/AuthorizationError.ts' })
SET a += { nombre: 'AuthorizationError.ts', tipo: 'ts', bytes: 631, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/authorizer.ts' })
SET a += { nombre: 'authorizer.ts', tipo: 'ts', bytes: 604, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/planIntegrity.ts' })
SET a += { nombre: 'planIntegrity.ts', tipo: 'ts', bytes: 1070, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/planRefPolicy.ts' })
SET a += { nombre: 'planRefPolicy.ts', tipo: 'ts', bytes: 2807, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/state/IRunStateStore.ts' })
SET a += { nombre: 'IRunStateStore.ts', tipo: 'ts', bytes: 226, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts' })
SET a += { nombre: 'InMemoryRunStateStore.ts', tipo: 'ts', bytes: 5358, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts' })
SET a += { nombre: 'InMemoryTxStore.ts', tipo: 'ts', bytes: 9296, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/types/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 79, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/types/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 79, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/utils/clock.ts' })
SET a += { nombre: 'clock.ts', tipo: 'ts', bytes: 4936, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/utils/jcs.ts' })
SET a += { nombre: 'jcs.ts', tipo: 'ts', bytes: 80, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/utils/sha256.ts' })
SET a += { nombre: 'sha256.ts', tipo: 'ts', bytes: 74, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/workers/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 88, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/application/providerSelection.test.ts' })
SET a += { nombre: 'providerSelection.test.ts', tipo: 'ts', bytes: 2969, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/IWorkflowEngine.types.test.ts' })
SET a += { nombre: 'IWorkflowEngine.types.test.ts', tipo: 'ts', bytes: 1966, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/capabilities.contract.test.ts' })
SET a += { nombre: 'capabilities.contract.test.ts', tipo: 'ts', bytes: 8790, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/engine.test.ts' })
SET a += { nombre: 'engine.test.ts', tipo: 'ts', bytes: 10001, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/executionPlan.contract.test.ts' })
SET a += { nombre: 'executionPlan.contract.test.ts', tipo: 'ts', bytes: 7580, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/helpers.ts' })
SET a += { nombre: 'helpers.ts', tipo: 'ts', bytes: 540, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/plans/plan-cancel-and-resume.json' })
SET a += { nombre: 'plan-cancel-and-resume.json', tipo: 'json', bytes: 504, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/plans/plan-minimal.json' })
SET a += { nombre: 'plan-minimal.json', tipo: 'json', bytes: 303, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/plans/plan-parallel.json' })
SET a += { nombre: 'plan-parallel.json', tipo: 'json', bytes: 457, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts' })
SET a += { nombre: 'run-golden-paths.hash.test.ts', tipo: 'ts', bytes: 4530, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/core/WorkflowEngine.test.ts' })
SET a += { nombre: 'WorkflowEngine.test.ts', tipo: 'ts', bytes: 18459, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/determinism/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 4064, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/idempotency.vectors.test.ts' })
SET a += { nombre: 'idempotency.vectors.test.ts', tipo: 'ts', bytes: 2130, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/outbox/OutboxWorker.test.ts' })
SET a += { nombre: 'OutboxWorker.test.ts', tipo: 'ts', bytes: 4125, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/security/authorizer.deny.test.ts' })
SET a += { nombre: 'authorizer.deny.test.ts', tipo: 'ts', bytes: 8228, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/types/engine-types.test.ts' })
SET a += { nombre: 'engine-types.test.ts', tipo: 'ts', bytes: 983, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/utils/clock.test.ts' })
SET a += { nombre: 'clock.test.ts', tipo: 'ts', bytes: 2127, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 160, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 759, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/tsconfig.test.eslint.json' })
SET a += { nombre: 'tsconfig.test.eslint.json', tipo: 'json', bytes: 110, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 148, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 157, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 490, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/src/dagAnalyzer.ts' })
SET a += { nombre: 'dagAnalyzer.ts', tipo: 'ts', bytes: 6044, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/src/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 888, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 571, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/src/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1461, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/test/dagAnalyzer.test.ts' })
SET a += { nombre: 'dagAnalyzer.test.ts', tipo: 'ts', bytes: 10578, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 323, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-interpreter/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 184, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 1126, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 472, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/src/crypto.ts' })
SET a += { nombre: 'crypto.ts', tipo: 'ts', bytes: 1149, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/src/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 405, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 121, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/src/planVersion.ts' })
SET a += { nombre: 'planVersion.ts', tipo: 'ts', bytes: 1931, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/src/verify.ts' })
SET a += { nombre: 'verify.ts', tipo: 'ts', bytes: 1364, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/test/verify.test.ts' })
SET a += { nombre: 'verify.test.ts', tipo: 'ts', bytes: 2773, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 370, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/plan-verifier/tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 132, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner-contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 585, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner-contracts/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 487, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner-contracts/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 304, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/PLANNER_IMPLEMENTATION_REVIEW_v2_3_2.md' })
SET a += { nombre: 'PLANNER_IMPLEMENTATION_REVIEW_v2_3_2.md', tipo: 'md', bytes: 22474, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 1171, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0000-scope-and-compat.md' })
SET a += { nombre: 'ADR-0000-scope-and-compat.md', tipo: 'md', bytes: 238, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0001-rfc8785-jcs.md' })
SET a += { nombre: 'ADR-0001-rfc8785-jcs.md', tipo: 'md', bytes: 295, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0002-plan-core-hash.md' })
SET a += { nombre: 'ADR-0002-plan-core-hash.md', tipo: 'md', bytes: 280, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0003-typed-errors.md' })
SET a += { nombre: 'ADR-0003-typed-errors.md', tipo: 'md', bytes: 258, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0004-security-limits.md' })
SET a += { nombre: 'ADR-0004-security-limits.md', tipo: 'md', bytes: 275, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0005-metrics.md' })
SET a += { nombre: 'ADR-0005-metrics.md', tipo: 'md', bytes: 250, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/adr/ADR-0006-extensibility.md' })
SET a += { nombre: 'ADR-0006-extensibility.md', tipo: 'md', bytes: 300, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/audit/planner_v2_3_2_audit.commented.ts' })
SET a += { nombre: 'planner_v2_3_2_audit.commented.ts', tipo: 'ts', bytes: 4493, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/contracts/ExecutionPlanV2.schema.json' })
SET a += { nombre: 'ExecutionPlanV2.schema.json', tipo: 'json', bytes: 621, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/contracts/PlanCore.schema.json' })
SET a += { nombre: 'PlanCore.schema.json', tipo: 'json', bytes: 1099, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/contracts/PlannerContracts.v2.3.1.md' })
SET a += { nombre: 'PlannerContracts.v2.3.1.md', tipo: 'md', bytes: 1183, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/contracts/PlannerInputEnvelopeV2.schema.json' })
SET a += { nombre: 'PlannerInputEnvelopeV2.schema.json', tipo: 'json', bytes: 2047, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/contracts/PlannerPolicies.schema.json' })
SET a += { nombre: 'PlannerPolicies.schema.json', tipo: 'json', bytes: 743, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/docs/grimorio.md' })
SET a += { nombre: 'grimorio.md', tipo: 'md', bytes: 1869, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/examples/dbt-workflow.ts' })
SET a += { nombre: 'dbt-workflow.ts', tipo: 'ts', bytes: 1140, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/examples/generic-pipeline.ts' })
SET a += { nombre: 'generic-pipeline.ts', tipo: 'ts', bytes: 1565, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 915, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/contracts/planner/ExecutionPlan.v2.ts' })
SET a += { nombre: 'ExecutionPlan.v2.ts', tipo: 'ts', bytes: 242, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/contracts/planner/IExecutionPlanner.v2.ts' })
SET a += { nombre: 'IExecutionPlanner.v2.ts', tipo: 'ts', bytes: 241, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/Planner.ts' })
SET a += { nombre: 'Planner.ts', tipo: 'ts', bytes: 11115, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 963, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/graph/Depth.ts' })
SET a += { nombre: 'Depth.ts', tipo: 'ts', bytes: 907, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/graph/GraphBuilder.ts' })
SET a += { nombre: 'GraphBuilder.ts', tipo: 'ts', bytes: 2983, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/graph/TopoSort.ts' })
SET a += { nombre: 'TopoSort.ts', tipo: 'ts', bytes: 2551, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/hashing.ts' })
SET a += { nombre: 'hashing.ts', tipo: 'ts', bytes: 1090, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/limits.ts' })
SET a += { nombre: 'limits.ts', tipo: 'ts', bytes: 994, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/manifest.ts' })
SET a += { nombre: 'manifest.ts', tipo: 'ts', bytes: 2049, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/metrics.ts' })
SET a += { nombre: 'metrics.ts', tipo: 'ts', bytes: 552, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/policies.ts' })
SET a += { nombre: 'policies.ts', tipo: 'ts', bytes: 1983, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/sorting.ts' })
SET a += { nombre: 'sorting.ts', tipo: 'ts', bytes: 281, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/stepFactory/StepFactory.ts' })
SET a += { nombre: 'StepFactory.ts', tipo: 'ts', bytes: 350, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/stepFactory/dbtStepFactory.ts' })
SET a += { nombre: 'dbtStepFactory.ts', tipo: 'ts', bytes: 1299, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/domain/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 2779, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 693, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/src/runtime/time.ts' })
SET a += { nombre: 'time.ts', tipo: 'ts', bytes: 307, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/cross-runtime-print-planid.ts' })
SET a += { nombre: 'cross-runtime-print-planid.ts', tipo: 'ts', bytes: 406, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'text' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/cross-runtime.sh' })
SET a += { nombre: 'cross-runtime.sh', tipo: 'sh', bytes: 766, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/fixtures/dbt-manifest.fixtures.ts' })
SET a += { nombre: 'dbt-manifest.fixtures.ts', tipo: 'ts', bytes: 2025, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/slow/load.test.ts' })
SET a += { nombre: 'load.test.ts', tipo: 'ts', bytes: 1288, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/unit/determinism.test.ts' })
SET a += { nombre: 'determinism.test.ts', tipo: 'ts', bytes: 3542, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/unit/graph.test.ts' })
SET a += { nombre: 'graph.test.ts', tipo: 'ts', bytes: 987, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/unit/limits.test.ts' })
SET a += { nombre: 'limits.test.ts', tipo: 'ts', bytes: 1104, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/unit/manifest-mvp.test.ts' })
SET a += { nombre: 'manifest-mvp.test.ts', tipo: 'ts', bytes: 2670, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/unit/policies.test.ts' })
SET a += { nombre: 'policies.test.ts', tipo: 'ts', bytes: 2314, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/vectors/fixed-vector.inline.ts' })
SET a += { nombre: 'fixed-vector.inline.ts', tipo: 'ts', bytes: 591, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/test/vectors/fixed-vector.json' })
SET a += { nombre: 'fixed-vector.json', tipo: 'json', bytes: 517, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 576, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/planner/vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 230, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/state-contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 317, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/state-contracts/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 485, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/state-contracts/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 304, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/state-store/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 529, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts' })
SET a += { nombre: 'inMemoryRunStateCommandPort.ts', tipo: 'ts', bytes: 2436, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/state-store/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 352, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/state-store/src/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 355, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/state-store/test/command-port.test.ts' })
SET a += { nombre: 'command-port.test.ts', tipo: 'ts', bytes: 2054, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/state-store/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 438, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 1803, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/docs/Examples.md' })
SET a += { nombre: 'Examples.md', tipo: 'md', bytes: 889, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/docs/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 40, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/docs/Traceability-Service-Design.md' })
SET a += { nombre: 'Traceability-Service-Design.md', tipo: 'md', bytes: 914, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/docs/adr/ADR-0000.md' })
SET a += { nombre: 'ADR-0000.md', tipo: 'md', bytes: 3277, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/docs/ci/github-actions.yml' })
SET a += { nombre: 'github-actions.yml', tipo: 'yml', bytes: 919, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'text' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/docs/neo4j/constraints.cypher' })
SET a += { nombre: 'constraints.cypher', tipo: 'cypher', bytes: 404, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 479, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/pnpm-workspace.yaml' })
SET a += { nombre: 'pnpm-workspace.yaml', tipo: 'yaml', bytes: 28, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/adapters/adr-catalog-filesystem.ts' })
SET a += { nombre: 'adr-catalog-filesystem.ts', tipo: 'ts', bytes: 4209, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/adapters/graph-publisher-neo4j.ts' })
SET a += { nombre: 'graph-publisher-neo4j.ts', tipo: 'ts', bytes: 3519, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts' })
SET a += { nombre: 'header-scanner-glob.ts', tipo: 'ts', bytes: 1810, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/cli.ts' })
SET a += { nombre: 'cli.ts', tipo: 'ts', bytes: 5886, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/contracts.ts' })
SET a += { nombre: 'contracts.ts', tipo: 'ts', bytes: 2138, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/core/header-parser.ts' })
SET a += { nombre: 'header-parser.ts', tipo: 'ts', bytes: 3159, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/core/manifest.ts' })
SET a += { nombre: 'manifest.ts', tipo: 'ts', bytes: 2210, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/core/validator.ts' })
SET a += { nombre: 'validator.ts', tipo: 'ts', bytes: 4371, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 726, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/service.ts' })
SET a += { nombre: 'service.ts', tipo: 'ts', bytes: 2912, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/src/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1856, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/traceability.config.example.json' })
SET a += { nombre: 'traceability.config.example.json', tipo: 'json', bytes: 630, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/traceability-service/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 460, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/cli' })
SET m += { nombre: 'cli', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/cli/validate-contracts.cjs' })
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 7588, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/frontend' })
SET m += { nombre: 'frontend', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/frontend/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 95, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir 2' })
SET m += { nombre: 'mejora discutir 2', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir 2/ARCHITECTURE.md' })
SET a += { nombre: 'ARCHITECTURE.md', tipo: 'md', bytes: 6371, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir 2' })
SET m += { nombre: 'mejora discutir 2', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir 2/PLAN_IMPLEMENTACION_INTEGRACION_CANONICAL.md' })
SET a += { nombre: 'PLAN_IMPLEMENTACION_INTEGRACION_CANONICAL.md', tipo: 'md', bytes: 3826, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir 2' })
SET m += { nombre: 'mejora discutir 2', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir 2/allcode.md' })
SET a += { nombre: 'allcode.md', tipo: 'md', bytes: 44903, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir 2' })
SET m += { nombre: 'mejora discutir 2', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir 2/integracion.md' })
SET a += { nombre: 'integracion.md', tipo: 'md', bytes: 6576, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir' })
SET m += { nombre: 'mejora discutir', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir/DVT-Run-State-Authority-Transactional-Outbox-Architecture.md' })
SET a += { nombre: 'DVT-Run-State-Authority-Transactional-Outbox-Architecture.md', tipo: 'md', bytes: 10333, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir' })
SET m += { nombre: 'mejora discutir', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir/blueprint.md' })
SET a += { nombre: 'blueprint.md', tipo: 'md', bytes: 31483, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir' })
SET m += { nombre: 'mejora discutir', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir/ddl.md' })
SET a += { nombre: 'ddl.md', tipo: 'md', bytes: 10971, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/mejora discutir' })
SET m += { nombre: 'mejora discutir', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/mejora discutir/mejora adicional.md' })
SET a += { nombre: 'mejora adicional.md', tipo: 'md', bytes: 2481, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/test' })
SET m += { nombre: 'test', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/test/matrix-alignment.test.ts' })
SET a += { nombre: 'matrix-alignment.test.ts', tipo: 'ts', bytes: 2916, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'plans/engine-gap-to-target-migration-plan.md' })
SET m += { nombre: 'engine-gap-to-target-migration-plan.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'plans/engine-gap-to-target-migration-plan.md' })
SET a += { nombre: 'engine-gap-to-target-migration-plan.md', tipo: 'md', bytes: 5362, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'pnpm-lock.yaml' })
SET m += { nombre: 'pnpm-lock.yaml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'pnpm-lock.yaml' })
SET a += { nombre: 'pnpm-lock.yaml', tipo: 'yaml', bytes: 424607, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'pnpm-workspace.yaml' })
SET m += { nombre: 'pnpm-workspace.yaml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'pnpm-workspace.yaml' })
SET a += { nombre: 'pnpm-workspace.yaml', tipo: 'yaml', bytes: 62, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'runbooks/OUTBOX_RELAY_OPERATIONS.md' })
SET m += { nombre: 'OUTBOX_RELAY_OPERATIONS.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'runbooks/OUTBOX_RELAY_OPERATIONS.md' })
SET a += { nombre: 'OUTBOX_RELAY_OPERATIONS.md', tipo: 'md', bytes: 2137, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'runbooks/WORKFLOW_ISOLATION_TESTING.md' })
SET m += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'runbooks/WORKFLOW_ISOLATION_TESTING.md' })
SET a += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', tipo: 'md', bytes: 204, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/AI_INDEX_README.md' })
SET m += { nombre: 'AI_INDEX_README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'scripts/AI_INDEX_README.md' })
SET a += { nombre: 'AI_INDEX_README.md', tipo: 'md', bytes: 956, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'scripts/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 7876, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/check-changed.cjs' })
SET m += { nombre: 'check-changed.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/check-changed.cjs' })
SET a += { nombre: 'check-changed.cjs', tipo: 'cjs', bytes: 5154, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/compare-hashes.cjs' })
SET m += { nombre: 'compare-hashes.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/compare-hashes.cjs' })
SET a += { nombre: 'compare-hashes.cjs', tipo: 'cjs', bytes: 3174, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/db-migrate.cjs' })
SET m += { nombre: 'db-migrate.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/db-migrate.cjs' })
SET a += { nombre: 'db-migrate.cjs', tipo: 'cjs', bytes: 3019, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/enable-workflow.sh' })
SET m += { nombre: 'enable-workflow.sh', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/enable-workflow.sh' })
SET a += { nombre: 'enable-workflow.sh', tipo: 'sh', bytes: 1490, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/gen-ai-index.js' })
SET m += { nombre: 'gen-ai-index.js', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/gen-ai-index.js' })
SET a += { nombre: 'gen-ai-index.js', tipo: 'js', bytes: 2546, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/generate-contract-index.cjs' })
SET m += { nombre: 'generate-contract-index.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/generate-contract-index.cjs' })
SET a += { nombre: 'generate-contract-index.cjs', tipo: 'cjs', bytes: 9566, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/base-schema.cypher' })
SET a += { nombre: 'base-schema.cypher', tipo: 'cypher', bytes: 9042, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/generated-repo.cypher' })
SET a += { nombre: 'generated-repo.cypher', tipo: 'cypher', bytes: 384914, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-generate-cypher.cjs' })
SET a += { nombre: 'neo4j-generate-cypher.cjs', tipo: 'cjs', bytes: 9203, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-ingest-repo.cjs' })
SET a += { nombre: 'neo4j-ingest-repo.cjs', tipo: 'cjs', bytes: 20492, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-json-to-prompt.cjs' })
SET a += { nombre: 'neo4j-json-to-prompt.cjs', tipo: 'cjs', bytes: 3224, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-query-context.cjs' })
SET a += { nombre: 'neo4j-query-context.cjs', tipo: 'cjs', bytes: 2852, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-query-roadmap-tree.cjs' })
SET a += { nombre: 'neo4j-query-roadmap-tree.cjs', tipo: 'cjs', bytes: 4621, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/neo4j/neo4j-seed.cjs' })
SET a += { nombre: 'neo4j-seed.cjs', tipo: 'cjs', bytes: 2044, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/roadmap-tree.cypher' })
SET a += { nombre: 'roadmap-tree.cypher', tipo: 'cypher', bytes: 891, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/rebuild-snapshots.js' })
SET m += { nombre: 'rebuild-snapshots.js', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/rebuild-snapshots.js' })
SET a += { nombre: 'rebuild-snapshots.js', tipo: 'js', bytes: 4654, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/run-golden-paths.cjs' })
SET m += { nombre: 'run-golden-paths.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/run-golden-paths.cjs' })
SET a += { nombre: 'run-golden-paths.cjs', tipo: 'cjs', bytes: 4233, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-contracts.cjs' })
SET m += { nombre: 'validate-contracts.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-contracts.cjs' })
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 3244, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-executable-examples.cjs' })
SET m += { nombre: 'validate-executable-examples.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-executable-examples.cjs' })
SET a += { nombre: 'validate-executable-examples.cjs', tipo: 'cjs', bytes: 6469, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-glossary-usage.cjs' })
SET m += { nombre: 'validate-glossary-usage.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-glossary-usage.cjs' })
SET a += { nombre: 'validate-glossary-usage.cjs', tipo: 'cjs', bytes: 4802, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-idempotency-vectors.cjs' })
SET m += { nombre: 'validate-idempotency-vectors.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-idempotency-vectors.cjs' })
SET a += { nombre: 'validate-idempotency-vectors.cjs', tipo: 'cjs', bytes: 4115, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-references.cjs' })
SET m += { nombre: 'validate-references.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-references.cjs' })
SET a += { nombre: 'validate-references.cjs', tipo: 'cjs', bytes: 6305, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-rfc2119.cjs' })
SET m += { nombre: 'validate-rfc2119.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-rfc2119.cjs' })
SET a += { nombre: 'validate-rfc2119.cjs', tipo: 'cjs', bytes: 4534, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/404.html' })
SET m += { nombre: '404.html', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/404.html' })
SET a += { nombre: '404.html', tipo: 'html', bytes: 23112, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/DOCS_README' })
SET m += { nombre: 'DOCS_README', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/DOCS_README/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25575, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0000-Code-generation-with-normative-traceability-required.en/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 42211, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0001-temporal-integration-test-policy/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 27273, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0002-neo4j-knowledge-graph-context-repository/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 27113, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0003-execution-model/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 35076, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0004-event-sourcing-strategy/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 41500, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0005-contract-formalization-tooling/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26166, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0006-contract-tooling-governance/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26852, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0007_RunCancellation/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 32572, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0008_Signal_Idempotency/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 29621, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0009_Outbox_Ordering/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 32489, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0010-run-event-envelope-split/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 40325, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0011-run-started-ownership/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 29099, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0012-plan-integrity-ownership/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 34020, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0012a_Canonical_Error_Code_Strategy/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 27424, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0013-run-state-store-bootstrapRunTx/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 28119, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0014-run-driven-adapter-model/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25974, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0015-getRunStatus-read-model-separation/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25884, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0016-logicalAttemptId-adapter-ownership/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26207, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-0017_ExecutionPlan_Schema_Versioning/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 45410, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR-Implementation Status/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 48300, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/ADR_Status_Board_Extensive/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 28628, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/_archive/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26038, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/_drafts/18 pendiente revision.txt' })
SET a += { nombre: '18 pendiente revision.txt', tipo: 'txt', bytes: 4839, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/_drafts/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25997, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/adr' })
SET m += { nombre: 'adr', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/adr/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26466, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/adapters/conductor/ConductorAdapter.spec/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 45160, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/adapters/state-store/postgres/StateStoreAdapter/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 41200, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/adapters/state-store/snowflake/StateStoreAdapter/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 48984, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/adapters/temporal/EnginePolicies/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 44334, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/adapters/temporal/TemporalAdapter.spec/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 47438, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/CONTRACT_TEMPLATE.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 29548, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/DECISION_AND_RISK_LOG_v2.0.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 33609, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/MIGRATION_v1.1.1_to_v2.0.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 32209, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/capabilities/adapters.capabilities.json' })
SET a += { nombre: 'adapters.capabilities.json', tipo: 'json', bytes: 1176, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/capabilities/capabilities.schema.json' })
SET a += { nombre: 'capabilities.schema.json', tipo: 'json', bytes: 4275, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/capabilities/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 32748, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/capabilities/validation-report.schema.json' })
SET a += { nombre: 'validation-report.schema.json', tipo: 'json', bytes: 2979, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/AgnosticEventLayerStrategy.v2.0.1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 28601, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/ExecutionSemantics.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 81033, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/ExecutionSemantics.v2.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 33278, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/GlossaryContract.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 49541, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/GlossaryContract.v2.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 30737, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/IProviderAdapter.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 33694, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/IWorkflowEngine.reference.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 51425, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/IWorkflowEngine.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 34877, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/IWorkflowEngine.v2.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 30985, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/PlanIntegrityAndPause.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 30441, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/RunEventCatalog.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26801, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/RunEvents.v1.idempotency_vectors.json' })
SET a += { nombre: 'RunEvents.v1.idempotency_vectors.json', tipo: 'json', bytes: 1851, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/RunEvents.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 51807, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/RunEvents.v2.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 68858, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/SignalsAndAuth.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 54998, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/events/RunEventRecord.v2.0.schema.json' })
SET a += { nombre: 'RunEventRecord.v2.0.schema.json', tipo: 'json', bytes: 2492, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/events/RunEventWrite.v2.0.schema.json' })
SET a += { nombre: 'RunEventWrite.v2.0.schema.json', tipo: 'json', bytes: 1826, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/events/RunStarted.schema.json' })
SET a += { nombre: 'RunStarted.schema.json', tipo: 'json', bytes: 5329, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/events/StepCompleted.schema.json' })
SET a += { nombre: 'StepCompleted.schema.json', tipo: 'json', bytes: 4691, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/events/StepFailed.schema.json' })
SET a += { nombre: 'StepFailed.schema.json', tipo: 'json', bytes: 5666, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/engine/events/StepStarted.schema.json' })
SET a += { nombre: 'StepStarted.schema.json', tipo: 'json', bytes: 3044, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/extensions/PluginSandbox.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 40434, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 37886, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/schemas/canvas-state.schema.json' })
SET a += { nombre: 'canvas-state.schema.json', tipo: 'json', bytes: 4999, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/schemas/logical-graph.schema.json' })
SET a += { nombre: 'logical-graph.schema.json', tipo: 'json', bytes: 4596, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/schemas/provenance-event.schema.json' })
SET a += { nombre: 'provenance-event.schema.json', tipo: 'json', bytes: 6401, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/security/AuditLog.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 51530, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/security/IAuthorization.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 36832, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/state-store/IRunStateStore.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 33217, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/state-store/IRunStateStore.v2.0/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 31127, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/contracts/state-store/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 41097, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/dev/CONTRACT_TOOLING_PROPOSAL.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 53503, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/dev/determinism-tooling/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 50165, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 73932, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/ops/SLOs/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 35737, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/ops/observability/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 50976, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/ops/runbooks/incident_response/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 52236, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/ops/runbooks/severity_matrix/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 38514, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/roadmap/engine-phases/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 68154, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/Cancel.v1.json' })
SET a += { nombre: 'Cancel.v1.json', tipo: 'json', bytes: 307, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/EmergencyStop.v1.json' })
SET a += { nombre: 'EmergencyStop.v1.json', tipo: 'json', bytes: 420, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/EscalateAlert.v1.json' })
SET a += { nombre: 'EscalateAlert.v1.json', tipo: 'json', bytes: 443, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/InjectOverride.v1.json' })
SET a += { nombre: 'InjectOverride.v1.json', tipo: 'json', bytes: 385, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/Pause.v1.json' })
SET a += { nombre: 'Pause.v1.json', tipo: 'json', bytes: 305, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/Resume.v1.json' })
SET a += { nombre: 'Resume.v1.json', tipo: 'json', bytes: 235, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/RetryRun.v1.json' })
SET a += { nombre: 'RetryRun.v1.json', tipo: 'json', bytes: 357, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/RetryStep.v1.json' })
SET a += { nombre: 'RetryStep.v1.json', tipo: 'json', bytes: 361, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/SkipStep.v1.json' })
SET a += { nombre: 'SkipStep.v1.json', tipo: 'json', bytes: 383, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/UpdateParams.v1.json' })
SET a += { nombre: 'UpdateParams.v1.json', tipo: 'json', bytes: 321, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/architecture/engine/schemas/signal/UpdateTarget.v1.json' })
SET a += { nombre: 'UpdateTarget.v1.json', tipo: 'json', bytes: 383, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/security/PLUGIN_PROVENANCE_POLICY.APPENDICES/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 74707, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/security/PLUGIN_PROVENANCE_POLICY.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 50614, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/security/SECURITY_INVARIANTS.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 131313, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/security/TENANT_ISOLATION_TESTS.v1/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 94812, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/engine/security/THREAT_MODEL/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 95976, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/frontend/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26041, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26539, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/architecture/infra/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26099, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/archive' })
SET m += { nombre: 'archive', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/archive/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25858, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/assets/images/favicon.png' })
SET a += { nombre: 'favicon.png', tipo: 'png', bytes: 1870, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/bundle.79ae519e.min.js' })
SET a += { nombre: 'bundle.79ae519e.min.js', tipo: 'js', bytes: 114308, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.ar.min.js' })
SET a += { nombre: 'lunr.ar.min.js', tipo: 'js', bytes: 17074, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.da.min.js' })
SET a += { nombre: 'lunr.da.min.js', tipo: 'js', bytes: 4654, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.de.min.js' })
SET a += { nombre: 'lunr.de.min.js', tipo: 'js', bytes: 6119, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.du.min.js' })
SET a += { nombre: 'lunr.du.min.js', tipo: 'js', bytes: 6208, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.el.min.js' })
SET a += { nombre: 'lunr.el.min.js', tipo: 'js', bytes: 14950, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.es.min.js' })
SET a += { nombre: 'lunr.es.min.js', tipo: 'js', bytes: 11499, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.fi.min.js' })
SET a += { nombre: 'lunr.fi.min.js', tipo: 'js', bytes: 9342, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.fr.min.js' })
SET a += { nombre: 'lunr.fr.min.js', tipo: 'js', bytes: 10669, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.he.min.js' })
SET a += { nombre: 'lunr.he.min.js', tipo: 'js', bytes: 6882, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.hi.min.js' })
SET a += { nombre: 'lunr.hi.min.js', tipo: 'js', bytes: 3383, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.hu.min.js' })
SET a += { nombre: 'lunr.hu.min.js', tipo: 'js', bytes: 9437, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.hy.min.js' })
SET a += { nombre: 'lunr.hy.min.js', tipo: 'js', bytes: 1264, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.it.min.js' })
SET a += { nombre: 'lunr.it.min.js', tipo: 'js', bytes: 11232, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.ja.min.js' })
SET a += { nombre: 'lunr.ja.min.js', tipo: 'js', bytes: 2313, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.jp.min.js' })
SET a += { nombre: 'lunr.jp.min.js', tipo: 'js', bytes: 36, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.kn.min.js' })
SET a += { nombre: 'lunr.kn.min.js', tipo: 'js', bytes: 3494, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.ko.min.js' })
SET a += { nombre: 'lunr.ko.min.js', tipo: 'js', bytes: 7972, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.multi.min.js' })
SET a += { nombre: 'lunr.multi.min.js', tipo: 'js', bytes: 817, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.nl.min.js' })
SET a += { nombre: 'lunr.nl.min.js', tipo: 'js', bytes: 6026, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.no.min.js' })
SET a += { nombre: 'lunr.no.min.js', tipo: 'js', bytes: 4754, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.pt.min.js' })
SET a += { nombre: 'lunr.pt.min.js', tipo: 'js', bytes: 10171, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.ro.min.js' })
SET a += { nombre: 'lunr.ro.min.js', tipo: 'js', bytes: 10958, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.ru.min.js' })
SET a += { nombre: 'lunr.ru.min.js', tipo: 'js', bytes: 10331, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.sa.min.js' })
SET a += { nombre: 'lunr.sa.min.js', tipo: 'js', bytes: 4901, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.stemmer.support.min.js' })
SET a += { nombre: 'lunr.stemmer.support.min.js', tipo: 'js', bytes: 3647, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.sv.min.js' })
SET a += { nombre: 'lunr.sv.min.js', tipo: 'js', bytes: 4523, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.ta.min.js' })
SET a += { nombre: 'lunr.ta.min.js', tipo: 'js', bytes: 2406, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.te.min.js' })
SET a += { nombre: 'lunr.te.min.js', tipo: 'js', bytes: 2330, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.th.min.js' })
SET a += { nombre: 'lunr.th.min.js', tipo: 'js', bytes: 1031, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.tr.min.js' })
SET a += { nombre: 'lunr.tr.min.js', tipo: 'js', bytes: 15009, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.vi.min.js' })
SET a += { nombre: 'lunr.vi.min.js', tipo: 'js', bytes: 784, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/min/lunr.zh.min.js' })
SET a += { nombre: 'lunr.zh.min.js', tipo: 'js', bytes: 2158, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/tinyseg.js' })
SET a += { nombre: 'tinyseg.js', tipo: 'js', bytes: 22878, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/lunr/wordcut.js' })
SET a += { nombre: 'wordcut.js', tipo: 'js', bytes: 677463, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'site/assets/javascripts/workers/search.2c215733.min.js' })
SET a += { nombre: 'search.2c215733.min.js', tipo: 'js', bytes: 39481, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/assets/stylesheets/main.484c7ddc.min.css' })
SET a += { nombre: 'main.484c7ddc.min.css', tipo: 'css', bytes: 139849, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/assets/stylesheets/main.484c7ddc.min.css.map' })
SET a += { nombre: 'main.484c7ddc.min.css.map', tipo: 'map', bytes: 47588, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/assets/stylesheets/palette.ab4e12ef.min.css' })
SET a += { nombre: 'palette.ab4e12ef.min.css', tipo: 'css', bytes: 12641, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/assets' })
SET m += { nombre: 'assets', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/assets/stylesheets/palette.ab4e12ef.min.css.map' })
SET a += { nombre: 'palette.ab4e12ef.min.css.map', tipo: 'map', bytes: 3670, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/contracts/engine/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26022, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/contracts/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26557, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/contracts/planner/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26053, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/contracts/shared/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26034, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/guides' })
SET m += { nombre: 'guides', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/guides/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25912, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/index.html' })
SET m += { nombre: 'index.html', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26596, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/planning' })
SET m += { nombre: 'planning', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/planning/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26521, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/planning' })
SET m += { nombre: 'planning', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/planning/proposals/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26030, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/planning' })
SET m += { nombre: 'planning', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/planning/reviews/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26042, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/planning' })
SET m += { nombre: 'planning', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/planning/status/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 26024, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/runbooks/index.html' })
SET a += { nombre: 'index.html', tipo: 'html', bytes: 25915, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/search' })
SET m += { nombre: 'search', lenguaje: 'json' }
MERGE (a:Archivo { path: 'site/search/search_index.json' })
SET a += { nombre: 'search_index.json', tipo: 'json', bytes: 845372, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/sitemap.xml' })
SET m += { nombre: 'sitemap.xml', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/sitemap.xml' })
SET a += { nombre: 'sitemap.xml', tipo: 'xml', bytes: 111, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'site/sitemap.xml.gz' })
SET m += { nombre: 'sitemap.xml.gz', lenguaje: 'text' }
MERGE (a:Archivo { path: 'site/sitemap.xml.gz' })
SET a += { nombre: 'sitemap.xml.gz', tipo: 'gz', bytes: 127, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'traceability.config.json' })
SET m += { nombre: 'traceability.config.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'traceability.config.json' })
SET a += { nombre: 'traceability.config.json', tipo: 'json', bytes: 739, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'traceability.manifest.json' })
SET m += { nombre: 'traceability.manifest.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'traceability.manifest.json' })
SET a += { nombre: 'traceability.manifest.json', tipo: 'json', bytes: 2028, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.base.json' })
SET m += { nombre: 'tsconfig.base.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.base.json' })
SET a += { nombre: 'tsconfig.base.json', tipo: 'json', bytes: 1863, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.eslint.base.json' })
SET m += { nombre: 'tsconfig.eslint.base.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.eslint.base.json' })
SET a += { nombre: 'tsconfig.eslint.base.json', tipo: 'json', bytes: 252, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.eslint.json' })
SET m += { nombre: 'tsconfig.eslint.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 161, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.json' })
SET m += { nombre: 'tsconfig.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 1662, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.test.json' })
SET m += { nombre: 'tsconfig.test.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 241, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'vitest.config.ts' })
SET m += { nombre: 'vitest.config.ts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 602, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'x[1])' })
SET m += { nombre: 'x[1])', lenguaje: 'text' }
MERGE (a:Archivo { path: 'x[1])' })
SET a += { nombre: 'x[1])', tipo: 'none', bytes: 0, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);

// File dependencies
MATCH (src:Archivo { path: 'apps/web/src/app/App.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/sonner.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/App.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/routes.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/Root.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/Root.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/LeftNavigation.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/Root.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/Root.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/resizable.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/Root.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Console.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/accordion.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/index.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/index.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/GraphCanvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/LeftNavigation.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/LeftNavigation.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/LeftNavigation.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tooltip.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/LeftNavigation.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/checkbox.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/label.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/radio-group.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/select.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/SourceImportWizard.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/separator.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/select.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/TopAppBar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tooltip.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.module.css' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/accordion.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/alert-dialog.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/alert-dialog.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/alert.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/avatar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/breadcrumb.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/calendar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/calendar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/carousel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/carousel.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/chart.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/checkbox.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/command.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/dialog.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/command.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/context-menu.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/dialog.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/drawer.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/dropdown-menu.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/form.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/label.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/form.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/hover-card.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/input-otp.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/label.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/menubar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/navigation-menu.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/pagination.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/pagination.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/popover.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/progress.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/radio-group.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/resizable.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/select.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/separator.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sheet.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/separator.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/sheet.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/skeleton.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tooltip.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/use-mobile.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/sidebar.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/skeleton.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/slider.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/switch.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/table.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/textarea.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/toggle-group.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/toggle.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/toggle-group.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/toggle.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/ui/tooltip.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/progress.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/separator.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/components/views/RunView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/data/mockData.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/index.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/Root.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/CostView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/routes.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/stores/index.ts' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/index.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/AdminView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockDbtData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/ArtifactsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/DbtExplorer.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/InspectorPanel.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/Modals.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/resizable.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/separator.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tooltip.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockDbtData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/Canvas.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/types/dbt.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/CostView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/CostView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/CostView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/DiffView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockDbtData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/input.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/label.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/LineageView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/switch.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/switch.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/PluginsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockDbtData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/badge.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/button.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/card.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/progress.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/scroll-area.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/tabs.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/components/ui/utils.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/data/mockDbtData.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/app/views/RunsView.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/stores/appStore.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'apps/web/src/main.tsx' })
MATCH (dst:Archivo { path: 'apps/web/src/app/App.tsx' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/canonical/src/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/canonical/src/jcs.js' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/canonical/src/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/canonical/src/sha256.js' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/canonical/src/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/canonical/src/jcs.js' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/canonical/src/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/canonical/src/sha256.js' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/canonical/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/canonical/src/jcs.js' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/canonical/src/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/canonical/src/sha256.js' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/workflows.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/planner-input.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/workflows.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/planner-input.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/workflows.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/IExecutionPlanner.v2.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/planner-input.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IOutboxStorage.v1.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IProjector.v1.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/RunEvents.v2.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/engine/IRunStateStore.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/IExecutionPlanner.v2.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v2.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/engine/IRunStateStore.v1.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/engine/IRunStateStore.v1.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/validation.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/test/errors.test.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/test/planner.contract.test.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/contracts/planner/IExecutionPlanner.v2.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/engine-contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/engine/test/utils/clock.test.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/engine/src/utils/clock.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/test/matrix-alignment.test.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/adapter-temporal/src/versioning.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'scripts/neo4j/neo4j-generate-cypher.cjs' })
MATCH (dst:Archivo { path: 'scripts/neo4j/neo4j-ingest-repo.cjs' })
MERGE (src)-[:DEPENDE]->(dst);

// Class/function definitions
MERGE (f:Funcion { key: 'infra/prototypes/api/src/connections/kafkaConnection.ts::KafkaConnection' })
SET f += { nombre: 'KafkaConnection', linea_inicio: 40, path: 'infra/prototypes/api/src/connections/kafkaConnection.ts' }
WITH f
MATCH (a:Archivo { path: 'infra/prototypes/api/src/connections/kafkaConnection.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'infra/prototypes/api/src/connections/pgConnection.ts::PgConnection' })
SET f += { nombre: 'PgConnection', linea_inicio: 2, path: 'infra/prototypes/api/src/connections/pgConnection.ts' }
WITH f
MATCH (a:Archivo { path: 'infra/prototypes/api/src/connections/pgConnection.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'infra/prototypes/api/src/kafkaTail.ts::KafkaTail' })
SET f += { nombre: 'KafkaTail', linea_inicio: 3, path: 'infra/prototypes/api/src/kafkaTail.ts' }
WITH f
MATCH (a:Archivo { path: 'infra/prototypes/api/src/kafkaTail.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'infra/prototypes/api/src/outboxPublisher.ts::OutboxPublisher' })
SET f += { nombre: 'OutboxPublisher', linea_inicio: 8, path: 'infra/prototypes/api/src/outboxPublisher.ts' }
WITH f
MATCH (a:Archivo { path: 'infra/prototypes/api/src/outboxPublisher.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'infra/prototypes/api/src/runStreamHub.ts::RunStreamHub' })
SET f += { nombre: 'RunStreamHub', linea_inicio: 3, path: 'infra/prototypes/api/src/runStreamHub.ts' }
WITH f
MATCH (a:Archivo { path: 'infra/prototypes/api/src/runStreamHub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts::PostgresStateStoreAdapter' })
SET f += { nombre: 'PostgresStateStoreAdapter', linea_inicio: 231, path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-postgres/src/runStateCommandPortBridge.ts::PostgresRunStateCommandPortBridge' })
SET f += { nombre: 'PostgresRunStateCommandPortBridge', linea_inicio: 24, path: 'packages/@dvt/adapter-postgres/src/runStateCommandPortBridge.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/runStateCommandPortBridge.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts::TemporalAdapter' })
SET f += { nombre: 'TemporalAdapter', linea_inicio: 67, path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts::TemporalClientManager' })
SET f += { nombre: 'TemporalClientManager', linea_inicio: 20, path: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts::TemporalWorkerHost' })
SET f += { nombre: 'TemporalWorkerHost', linea_inicio: 32, path: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/contracts/src/errors.ts::AuthorizationError' })
SET f += { nombre: 'AuthorizationError', linea_inicio: 9, path: 'packages/@dvt/contracts/src/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/contracts/src/validation.ts::ContractValidationError' })
SET f += { nombre: 'ContractValidationError', linea_inicio: 71, path: 'packages/@dvt/contracts/src/validation.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts::ConductorAdapterStub' })
SET f += { nombre: 'ConductorAdapterStub', linea_inicio: 36, path: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts::MockAdapter' })
SET f += { nombre: 'MockAdapter', linea_inicio: 45, path: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts::TemporalAdapterStub' })
SET f += { nombre: 'TemporalAdapterStub', linea_inicio: 24, path: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::DvtError' })
SET f += { nombre: 'DvtError', linea_inicio: 15, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::RunNotFoundError' })
SET f += { nombre: 'RunNotFoundError', linea_inicio: 49, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::RunAlreadyExistsError' })
SET f += { nombre: 'RunAlreadyExistsError', linea_inicio: 56, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::AdapterNotRegisteredError' })
SET f += { nombre: 'AdapterNotRegisteredError', linea_inicio: 63, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::TenantAccessDeniedError' })
SET f += { nombre: 'TenantAccessDeniedError', linea_inicio: 70, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::CapabilitiesNotSupportedError' })
SET f += { nombre: 'CapabilitiesNotSupportedError', linea_inicio: 77, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::TargetAdapterMismatchError' })
SET f += { nombre: 'TargetAdapterMismatchError', linea_inicio: 92, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::InvalidRunIdError' })
SET f += { nombre: 'InvalidRunIdError', linea_inicio: 102, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::InvalidSchemaVersionError' })
SET f += { nombre: 'InvalidSchemaVersionError', linea_inicio: 109, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::RunMetadataNotFoundError' })
SET f += { nombre: 'RunMetadataNotFoundError', linea_inicio: 116, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::SignalNotImplementedError' })
SET f += { nombre: 'SignalNotImplementedError', linea_inicio: 123, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::OutboxRateLimitExceededError' })
SET f += { nombre: 'OutboxRateLimitExceededError', linea_inicio: 130, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/core/SnapshotProjector.ts::SnapshotProjector' })
SET f += { nombre: 'SnapshotProjector', linea_inicio: 142, path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/core/WorkflowEngine.ts::WorkflowEngine' })
SET f += { nombre: 'WorkflowEngine', linea_inicio: 114, path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/core/idempotency.ts::IdempotencyKeyBuilder' })
SET f += { nombre: 'IdempotencyKeyBuilder', linea_inicio: 29, path: 'packages/@dvt/engine/src/core/idempotency.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/core/idempotency.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts::InMemoryEventBus' })
SET f += { nombre: 'InMemoryEventBus', linea_inicio: 12, path: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts::InMemoryOutboxStorage' })
SET f += { nombre: 'InMemoryOutboxStorage', linea_inicio: 13, path: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts::OutboxWorker' })
SET f += { nombre: 'OutboxWorker', linea_inicio: 18, path: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts::TokenBucketRateLimiter' })
SET f += { nombre: 'TokenBucketRateLimiter', linea_inicio: 28, path: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/AuthorizationError.ts::AuthorizationError' })
SET f += { nombre: 'AuthorizationError', linea_inicio: 8, path: 'packages/@dvt/engine/src/security/AuthorizationError.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/AuthorizationError.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/authorizer.ts::AllowAllAuthorizer' })
SET f += { nombre: 'AllowAllAuthorizer', linea_inicio: 11, path: 'packages/@dvt/engine/src/security/authorizer.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/authorizer.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/planIntegrity.ts::PlanIntegrityValidator' })
SET f += { nombre: 'PlanIntegrityValidator', linea_inicio: 16, path: 'packages/@dvt/engine/src/security/planIntegrity.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/planIntegrity.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/planRefPolicy.ts::PlanRefPolicy' })
SET f += { nombre: 'PlanRefPolicy', linea_inicio: 15, path: 'packages/@dvt/engine/src/security/planRefPolicy.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/planRefPolicy.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts::InMemoryRunStateStore' })
SET f += { nombre: 'InMemoryRunStateStore', linea_inicio: 18, path: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts::InMemoryTxStore' })
SET f += { nombre: 'InMemoryTxStore', linea_inicio: 19, path: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/utils/clock.ts::SequenceClock' })
SET f += { nombre: 'SequenceClock', linea_inicio: 153, path: 'packages/@dvt/engine/src/utils/clock.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/utils/clock.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/test/contracts/helpers.ts::InMemoryPlanFetcher' })
SET f += { nombre: 'InMemoryPlanFetcher', linea_inicio: 3, path: 'packages/@dvt/engine/test/contracts/helpers.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/test/contracts/helpers.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/plan-interpreter/src/errors.ts::PlanValidationError' })
SET f += { nombre: 'PlanValidationError', linea_inicio: 15, path: 'packages/@dvt/plan-interpreter/src/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/plan-interpreter/src/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/plan-verifier/src/errors.ts::PlanVerifierError' })
SET f += { nombre: 'PlanVerifierError', linea_inicio: 6, path: 'packages/@dvt/plan-verifier/src/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/plan-verifier/src/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/planner/src/domain/Planner.ts::Planner' })
SET f += { nombre: 'Planner', linea_inicio: 46, path: 'packages/@dvt/planner/src/domain/Planner.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/planner/src/domain/Planner.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/planner/src/domain/errors.ts::PlannerError' })
SET f += { nombre: 'PlannerError', linea_inicio: 12, path: 'packages/@dvt/planner/src/domain/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/planner/src/domain/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts::InMemoryRunStateCommandPort' })
SET f += { nombre: 'InMemoryRunStateCommandPort', linea_inicio: 10, path: 'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/traceability-service/src/adapters/adr-catalog-filesystem.ts::FileSystemAdrCatalog' })
SET f += { nombre: 'FileSystemAdrCatalog', linea_inicio: 67, path: 'packages/@dvt/traceability-service/src/adapters/adr-catalog-filesystem.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/traceability-service/src/adapters/adr-catalog-filesystem.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/traceability-service/src/adapters/graph-publisher-neo4j.ts::Neo4jGraphPublisher' })
SET f += { nombre: 'Neo4jGraphPublisher', linea_inicio: 27, path: 'packages/@dvt/traceability-service/src/adapters/graph-publisher-neo4j.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/traceability-service/src/adapters/graph-publisher-neo4j.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts::GlobHeaderScanner' })
SET f += { nombre: 'GlobHeaderScanner', linea_inicio: 17, path: 'packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/traceability-service/src/adapters/header-scanner-glob.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/traceability-service/src/core/manifest.ts::ManifestBuilder' })
SET f += { nombre: 'ManifestBuilder', linea_inicio: 10, path: 'packages/@dvt/traceability-service/src/core/manifest.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/traceability-service/src/core/manifest.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/traceability-service/src/core/validator.ts::TraceValidator' })
SET f += { nombre: 'TraceValidator', linea_inicio: 19, path: 'packages/@dvt/traceability-service/src/core/validator.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/traceability-service/src/core/validator.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/traceability-service/src/service.ts::TraceabilityService' })
SET f += { nombre: 'TraceabilityService', linea_inicio: 27, path: 'packages/@dvt/traceability-service/src/service.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/traceability-service/src/service.ts' })
MERGE (a)-[:DEFINE]->(f);

// Issue references from files
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
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-221.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#226' })
SET i += { number: 226, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/226' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-226-glossary-and-postgres-hardening-2026-02-19.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-9.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-closure-notes-14-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-closure-notes-14-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-closure-notes-14-15.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: '.gh-comments/pr-postgres-hardening-p0-p2-2026-02-19.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#4' })
SET i += { number: 4, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/4' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#65' })
SET i += { number: 65, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/65' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#116' })
SET i += { number: 116, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/116' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#195' })
SET i += { number: 195, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/195' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#196' })
SET i += { number: 196, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/196' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#197' })
SET i += { number: 197, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/197' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#198' })
SET i += { number: 198, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/198' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#200' })
SET i += { number: 200, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/200' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#202' })
SET i += { number: 202, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/202' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#204' })
SET i += { number: 204, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/204' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#205' })
SET i += { number: 205, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/205' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#206' })
SET i += { number: 206, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/206' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#215' })
SET i += { number: 215, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/215' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#220' })
SET i += { number: 220, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/220' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#224' })
SET i += { number: 224, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/224' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#226' })
SET i += { number: 226, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/226' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#228' })
SET i += { number: 228, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/228' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#229' })
SET i += { number: 229, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/229' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#234' })
SET i += { number: 234, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/234' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#236' })
SET i += { number: 236, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/236' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#238' })
SET i += { number: 238, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/238' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#240' })
SET i += { number: 240, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/240' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#241' })
SET i += { number: 241, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/241' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#242' })
SET i += { number: 242, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/242' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#246' })
SET i += { number: 246, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/246' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#247' })
SET i += { number: 247, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/247' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#248' })
SET i += { number: 248, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/248' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#249' })
SET i += { number: 249, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/249' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#251' })
SET i += { number: 251, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/251' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#252' })
SET i += { number: 252, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/252' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#253' })
SET i += { number: 253, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/253' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#255' })
SET i += { number: 255, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/255' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#259' })
SET i += { number: 259, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/259' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#273' })
SET i += { number: 273, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/273' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#274' })
SET i += { number: 274, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/274' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#281' })
SET i += { number: 281, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/281' }
WITH i
MATCH (a:Archivo { path: 'CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#284' })
SET i += { number: 284, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/284' }
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
MERGE (i:Issue { key: 'dunay2/dvt#333' })
SET i += { number: 333, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/333' }
WITH i
MATCH (a:Archivo { path: 'docs/adr/ADR-0004-event-sourcing-strategy.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#218' })
SET i += { number: 218, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/218' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/engine/IProviderAdapter.v1.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#217' })
SET i += { number: 217, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/217' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/engine/contracts/state-store/IRunStateStore.v1.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#81' })
SET i += { number: 81, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/81' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#101' })
SET i += { number: 101, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/101' }
WITH i
MATCH (a:Archivo { path: 'docs/architecture/vision/DVT_Docs_Pack_v0.6/docs/DVT_Blueprint_v0.6_MASTER.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#313' })
SET i += { number: 313, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/313' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/reviews/PR_313_STABILIZATION_EXECUTION_REPORT_20260228.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#313' })
SET i += { number: 313, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/313' }
WITH i
MATCH (a:Archivo { path: 'docs/planning/reviews/index.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/cli/run-golden-paths.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#133' })
SET i += { number: 133, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/133' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/cli/validate-contracts.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/engine/test/contracts/engine.test.ts' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#70' })
SET i += { number: 70, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/70' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/engine/test/contracts/run-golden-paths.hash.test.ts' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#133' })
SET i += { number: 133, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/133' }
WITH i
MATCH (a:Archivo { path: 'packages/cli/validate-contracts.cjs' })
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
MERGE (i:Issue { key: 'dunay2/dvt#226' })
SET i += { number: 226, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/226' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#227' })
SET i += { number: 227, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/227' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#228' })
SET i += { number: 228, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/228' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#229' })
SET i += { number: 229, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/229' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#230' })
SET i += { number: 230, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/230' }
WITH i
MATCH (a:Archivo { path: 'scripts/README.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'scripts/compare-hashes.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#70' })
SET i += { number: 70, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/70' }
WITH i
MATCH (a:Archivo { path: 'scripts/run-golden-paths.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'scripts/validate-contracts.cjs' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#0' })
SET i += { number: 0, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/0' }
WITH i
MATCH (a:Archivo { path: 'site/assets/javascripts/bundle.79ae519e.min.js' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#39' })
SET i += { number: 39, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/39' }
WITH i
MATCH (a:Archivo { path: 'site/assets/javascripts/bundle.79ae519e.min.js' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1621' })
SET i += { number: 1621, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1621' }
WITH i
MATCH (a:Archivo { path: 'site/assets/javascripts/lunr/wordcut.js' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1929' })
SET i += { number: 1929, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1929' }
WITH i
MATCH (a:Archivo { path: 'site/assets/javascripts/lunr/wordcut.js' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1991' })
SET i += { number: 1991, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1991' }
WITH i
MATCH (a:Archivo { path: 'site/assets/javascripts/lunr/wordcut.js' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2094' })
SET i += { number: 2094, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2094' }
WITH i
MATCH (a:Archivo { path: 'site/assets/javascripts/lunr/wordcut.js' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#0' })
SET i += { number: 0, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/0' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#1' })
SET i += { number: 1, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/1' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#3' })
SET i += { number: 3, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/3' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#4' })
SET i += { number: 4, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/4' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#7' })
SET i += { number: 7, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/7' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#11' })
SET i += { number: 11, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/11' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#12' })
SET i += { number: 12, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/12' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#13' })
SET i += { number: 13, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/13' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#18' })
SET i += { number: 18, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/18' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#19' })
SET i += { number: 19, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/19' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#21' })
SET i += { number: 21, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/21' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#22' })
SET i += { number: 22, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/22' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#23' })
SET i += { number: 23, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/23' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#24' })
SET i += { number: 24, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/24' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#25' })
SET i += { number: 25, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/25' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#26' })
SET i += { number: 26, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/26' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#27' })
SET i += { number: 27, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/27' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#28' })
SET i += { number: 28, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/28' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#29' })
SET i += { number: 29, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/29' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#31' })
SET i += { number: 31, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/31' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#32' })
SET i += { number: 32, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/32' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#33' })
SET i += { number: 33, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/33' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#34' })
SET i += { number: 34, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/34' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#35' })
SET i += { number: 35, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/35' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#36' })
SET i += { number: 36, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/36' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#41' })
SET i += { number: 41, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/41' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#42' })
SET i += { number: 42, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/42' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#43' })
SET i += { number: 43, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/43' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#44' })
SET i += { number: 44, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/44' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#45' })
SET i += { number: 45, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/45' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#46' })
SET i += { number: 46, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/46' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#51' })
SET i += { number: 51, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/51' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#52' })
SET i += { number: 52, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/52' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#53' })
SET i += { number: 53, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/53' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#54' })
SET i += { number: 54, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/54' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#61' })
SET i += { number: 61, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/61' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#62' })
SET i += { number: 62, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/62' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#63' })
SET i += { number: 63, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/63' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#64' })
SET i += { number: 64, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/64' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#65' })
SET i += { number: 65, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/65' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#71' })
SET i += { number: 71, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/71' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#72' })
SET i += { number: 72, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/72' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#81' })
SET i += { number: 81, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/81' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#82' })
SET i += { number: 82, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/82' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#84' })
SET i += { number: 84, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/84' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#85' })
SET i += { number: 85, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/85' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#91' })
SET i += { number: 91, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/91' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#101' })
SET i += { number: 101, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/101' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#111' })
SET i += { number: 111, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/111' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#112' })
SET i += { number: 112, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/112' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#113' })
SET i += { number: 113, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/113' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#123' })
SET i += { number: 123, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/123' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#131' })
SET i += { number: 131, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/131' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#133' })
SET i += { number: 133, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/133' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#151' })
SET i += { number: 151, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/151' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#210' })
SET i += { number: 210, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/210' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#211' })
SET i += { number: 211, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/211' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#212' })
SET i += { number: 212, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/212' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#213' })
SET i += { number: 213, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/213' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#217' })
SET i += { number: 217, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/217' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#218' })
SET i += { number: 218, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/218' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#219' })
SET i += { number: 219, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/219' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#220' })
SET i += { number: 220, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/220' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#222' })
SET i += { number: 222, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/222' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#223' })
SET i += { number: 223, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/223' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#224' })
SET i += { number: 224, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/224' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#251' })
SET i += { number: 251, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/251' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#252' })
SET i += { number: 252, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/252' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#311' })
SET i += { number: 311, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/311' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#333' })
SET i += { number: 333, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/333' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#511' })
SET i += { number: 511, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/511' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#512' })
SET i += { number: 512, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/512' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#513' })
SET i += { number: 513, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/513' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#514' })
SET i += { number: 514, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/514' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#515' })
SET i += { number: 515, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/515' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#516' })
SET i += { number: 516, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/516' }
WITH i
MATCH (a:Archivo { path: 'site/search/search_index.json' })
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
