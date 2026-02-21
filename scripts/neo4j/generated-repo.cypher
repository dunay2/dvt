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
SET a += { nombre: 'CODEOWNERS', tipo: 'none', bytes: 3574, topico: 'other' }
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
SET a += { nombre: 'ci.yml', tipo: 'yml', bytes: 7202, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/contracts.yml' })
SET a += { nombre: 'contracts.yml', tipo: 'yml', bytes: 15596, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/create-labels.yml' })
SET a += { nombre: 'create-labels.yml', tipo: 'yml', bytes: 957, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/golden-paths.yml' })
SET a += { nombre: 'golden-paths.yml', tipo: 'yml', bytes: 1779, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/mkdocs-deploy.yml' })
SET a += { nombre: 'mkdocs-deploy.yml', tipo: 'yml', bytes: 758, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/pr-quality-gate.yml' })
SET a += { nombre: 'pr-quality-gate.yml', tipo: 'yml', bytes: 7790, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/release.yml' })
SET a += { nombre: 'release.yml', tipo: 'yml', bytes: 1229, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.github/workflows' })
SET m += { nombre: 'workflows', lenguaje: 'yaml' }
MERGE (a:Archivo { path: '.github/workflows/test.yml' })
SET a += { nombre: 'test.yml', tipo: 'yml', bytes: 8568, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: '.gitignore' })
SET m += { nombre: '.gitignore', lenguaje: 'text' }
MERGE (a:Archivo { path: '.gitignore' })
SET a += { nombre: '.gitignore', tipo: 'none', bytes: 869, topico: 'other' }
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
MERGE (m:Modulo { path: 'CONTRIBUTING.md' })
SET m += { nombre: 'CONTRIBUTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'CONTRIBUTING.md' })
SET a += { nombre: 'CONTRIBUTING.md', tipo: 'md', bytes: 534, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'Project Context for AI Assistants.md' })
SET m += { nombre: 'Project Context for AI Assistants.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'Project Context for AI Assistants.md' })
SET a += { nombre: 'Project Context for AI Assistants.md', tipo: 'md', bytes: 1711, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 6943, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'ROADMAP.md' })
SET m += { nombre: 'ROADMAP.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'ROADMAP.md' })
SET a += { nombre: 'ROADMAP.md', tipo: 'md', bytes: 23241, topico: 'doc' }
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
SET a += { nombre: 'site.webmanifest', tipo: 'webmanifest', bytes: 456, topico: 'other' }
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
SET a += { nombre: 'index.html', tipo: 'html', bytes: 989, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'json' }
MERGE (a:Archivo { path: 'apps/web/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 2614, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'apps/web/postcss.config.mjs' })
SET a += { nombre: 'postcss.config.mjs', tipo: 'mjs', bytes: 460, topico: 'code' }
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
SET a += { nombre: 'GraphCanvas.tsx', tipo: 'tsx', bytes: 9287, topico: 'code' }
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
SET m += { nombre: 'web', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx' })
SET a += { nombre: 'DbtNodeComponent.tsx', tipo: 'tsx', bytes: 6324, topico: 'code' }
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
SET a += { nombre: 'RunView.tsx', tipo: 'tsx', bytes: 14398, topico: 'code' }
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
SET a += { nombre: 'appStore.ts', tipo: 'ts', bytes: 5692, topico: 'code' }
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
SET a += { nombre: 'Canvas.tsx', tipo: 'tsx', bytes: 18008, topico: 'code' }
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
SET a += { nombre: 'index.css', tipo: 'css', bytes: 621, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/styles/tailwind.css' })
SET a += { nombre: 'tailwind.css', tipo: 'css', bytes: 102, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'apps/web' })
SET m += { nombre: 'web', lenguaje: 'text' }
MERGE (a:Archivo { path: 'apps/web/src/styles/theme.css' })
SET a += { nombre: 'theme.css', tipo: 'css', bytes: 5629, topico: 'other' }
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
MERGE (m:Modulo { path: 'docs/AI_INDEX.json' })
SET m += { nombre: 'AI_INDEX.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 52332, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/CAPABILITY_VERSIONING.md' })
SET m += { nombre: 'CAPABILITY_VERSIONING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CAPABILITY_VERSIONING.md' })
SET a += { nombre: 'CAPABILITY_VERSIONING.md', tipo: 'md', bytes: 2071, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/CONTRACTS_AUTOMATION_INDEX.md' })
SET m += { nombre: 'CONTRACTS_AUTOMATION_INDEX.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CONTRACTS_AUTOMATION_INDEX.md' })
SET a += { nombre: 'CONTRACTS_AUTOMATION_INDEX.md', tipo: 'md', bytes: 2610, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/CONTRIBUTING.md' })
SET m += { nombre: 'CONTRIBUTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/CONTRIBUTING.md' })
SET a += { nombre: 'CONTRIBUTING.md', tipo: 'md', bytes: 18020, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/ExecutionSemantics.v1.md' })
SET m += { nombre: 'ExecutionSemantics.v1.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/ExecutionSemantics.v1.md' })
SET a += { nombre: 'ExecutionSemantics.v1.md', tipo: 'md', bytes: 601, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/INDEX.md' })
SET m += { nombre: 'INDEX.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 2683, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/PROJECT_STRUCTURE.md' })
SET m += { nombre: 'PROJECT_STRUCTURE.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/PROJECT_STRUCTURE.md' })
SET a += { nombre: 'PROJECT_STRUCTURE.md', tipo: 'md', bytes: 6862, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/PROJECT_STRUCTURE_TREE.md' })
SET m += { nombre: 'PROJECT_STRUCTURE_TREE.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/PROJECT_STRUCTURE_TREE.md' })
SET a += { nombre: 'PROJECT_STRUCTURE_TREE.md', tipo: 'md', bytes: 4393, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/REPO_STRUCTURE_SUMMARY.md' })
SET m += { nombre: 'REPO_STRUCTURE_SUMMARY.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/REPO_STRUCTURE_SUMMARY.md' })
SET a += { nombre: 'REPO_STRUCTURE_SUMMARY.md', tipo: 'md', bytes: 3870, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
SET m += { nombre: 'ROADMAP_ISSUES_SUMMARY.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
SET a += { nombre: 'ROADMAP_ISSUES_SUMMARY.md', tipo: 'md', bytes: 3453, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0000-Code-generation-with-normative-traceability-required.en.md' })
SET a += { nombre: 'ADR-0000-Code-generation-with-normative-traceability-required.en.md', tipo: 'md', bytes: 3221, topico: 'doc' }
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
SET a += { nombre: 'ADR-0003-execution-model.md', tipo: 'md', bytes: 2128, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/adr' })
SET m += { nombre: 'adr', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/adr/ADR-0004-event-sourcing-strategy.md' })
SET a += { nombre: 'ADR-0004-event-sourcing-strategy.md', tipo: 'md', bytes: 2254, topico: 'doc' }
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
MERGE (a:Archivo { path: 'docs/adr/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 182, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/api' })
SET m += { nombre: 'api', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/api/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 92, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/ARCHITECTURE_ANALYSIS.md' })
SET a += { nombre: 'ARCHITECTURE_ANALYSIS.md', tipo: 'md', bytes: 4406, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/architecture/ARCHITECTURE_DIAGRAMS.mmd' })
SET a += { nombre: 'ARCHITECTURE_DIAGRAMS.mmd', tipo: 'mmd', bytes: 3321, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 171, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/ddd-cqrs.md' })
SET a += { nombre: 'ddd-cqrs.md', tipo: 'md', bytes: 1245, topico: 'doc' }
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
SET a += { nombre: 'CONTRACT_TEMPLATE.v1.md', tipo: 'md', bytes: 1596, topico: 'doc' }
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
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/schemas/canvas-state.schema.json' })
SET a += { nombre: 'canvas-state.schema.json', tipo: 'json', bytes: 4975, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/schemas/logical-graph.schema.json' })
SET a += { nombre: 'logical-graph.schema.json', tipo: 'json', bytes: 4596, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'json' }
MERGE (a:Archivo { path: 'docs/architecture/engine/contracts/schemas/provenance-event.schema.json' })
SET a += { nombre: 'provenance-event.schema.json', tipo: 'json', bytes: 6293, topico: 'config' }
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
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/infra/infra-architecture.md' })
SET a += { nombre: 'infra-architecture.md', tipo: 'md', bytes: 1559, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/temporal/TD-0012-pr1-p0-conformance.md' })
SET a += { nombre: 'TD-0012-pr1-p0-conformance.md', tipo: 'md', bytes: 2092, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/architecture' })
SET m += { nombre: 'architecture', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/architecture/temporal/worker-topology.md' })
SET a += { nombre: 'worker-topology.md', tipo: 'md', bytes: 2068, topico: 'doc' }
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
MERGE (m:Modulo { path: 'docs/contracts' })
SET m += { nombre: 'contracts', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/contracts/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 282, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0000-Generación de código con trazabilidad normativa obligatoria.md' })
SET a += { nombre: 'ADR-0000-Generación de código con trazabilidad normativa obligatoria.md', tipo: 'md', bytes: 8396, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0001-temporal-integration-test-policy.md' })
SET a += { nombre: 'ADR-0001-temporal-integration-test-policy.md', tipo: 'md', bytes: 3695, topico: 'doc' }
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
MERGE (a:Archivo { path: 'docs/decisions/ADR-0007-temporal-retry-policy-mvp.md' })
SET a += { nombre: 'ADR-0007-temporal-retry-policy-mvp.md', tipo: 'md', bytes: 3389, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md' })
SET a += { nombre: 'ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md', tipo: 'md', bytes: 5817, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0010-run-event-envelope-split.md' })
SET a += { nombre: 'ADR-0010-run-event-envelope-split.md', tipo: 'md', bytes: 3253, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0011-run-started-ownership.md' })
SET a += { nombre: 'ADR-0011-run-started-ownership.md', tipo: 'md', bytes: 2067, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0012-plan-integrity-ownership.md' })
SET a += { nombre: 'ADR-0012-plan-integrity-ownership.md', tipo: 'md', bytes: 1561, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0013-run-state-store-bootstrapRunTx.md' })
SET a += { nombre: 'ADR-0013-run-state-store-bootstrapRunTx.md', tipo: 'md', bytes: 2134, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0014-run-driven-adapter-model.md' })
SET a += { nombre: 'ADR-0014-run-driven-adapter-model.md', tipo: 'md', bytes: 1064, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0015-getRunStatus-read-model-separation.md' })
SET a += { nombre: 'ADR-0015-getRunStatus-read-model-separation.md', tipo: 'md', bytes: 974, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-0016-logicalAttemptId-adapter-ownership.md' })
SET a += { nombre: 'ADR-0016-logicalAttemptId-adapter-ownership.md', tipo: 'md', bytes: 1228, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/ADR-TEMPLATE.md' })
SET a += { nombre: 'ADR-TEMPLATE.md', tipo: 'md', bytes: 1261, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/decisions' })
SET m += { nombre: 'decisions', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/decisions/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 3380, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/AI_ISSUE_RESOLUTION_PLAYBOOK.md' })
SET a += { nombre: 'AI_ISSUE_RESOLUTION_PLAYBOOK.md', tipo: 'md', bytes: 21956, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/QUALITY.md' })
SET a += { nombre: 'QUALITY.md', tipo: 'md', bytes: 16173, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/guides/TECHNICAL_DEBT_REGISTER.md' })
SET a += { nombre: 'TECHNICAL_DEBT_REGISTER.md', tipo: 'md', bytes: 18096, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/guides' })
SET m += { nombre: 'guides', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/guides/resolution.txt' })
SET a += { nombre: 'resolution.txt', tipo: 'txt', bytes: 13998, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/knowledge' })
SET m += { nombre: 'knowledge', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/knowledge/INDEX.md' })
SET a += { nombre: 'INDEX.md', tipo: 'md', bytes: 1851, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/knowledge' })
SET m += { nombre: 'knowledge', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/knowledge/REPOSITORY_MAP.md' })
SET a += { nombre: 'REPOSITORY_MAP.md', tipo: 'md', bytes: 4860, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/knowledge' })
SET m += { nombre: 'knowledge', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/knowledge/ROADMAP_AND_ISSUES_MAP.md' })
SET a += { nombre: 'ROADMAP_AND_ISSUES_MAP.md', tipo: 'md', bytes: 3987, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md' })
SET a += { nombre: 'BACKLOG_FRONTEND_DVT_PLUS_EPICS_AND_STORIES.md', tipo: 'md', bytes: 10530, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md' })
SET a += { nombre: 'BACKLOG_FRONTEND_DVT_PLUS_GITHUB_EXECUTION.md', tipo: 'md', bytes: 6926, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_V2_EPICS_AND_STORIES.md' })
SET a += { nombre: 'BACKLOG_V2_EPICS_AND_STORIES.md', tipo: 'md', bytes: 5117, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/BACKLOG_V2_GITHUB_EXECUTION.md' })
SET a += { nombre: 'BACKLOG_V2_GITHUB_EXECUTION.md', tipo: 'md', bytes: 6273, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DBT_CLOUD_EXTENDIDO_V2_ALIGNMENT.md' })
SET a += { nombre: 'DBT_CLOUD_EXTENDIDO_V2_ALIGNMENT.md', tipo: 'md', bytes: 7068, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md' })
SET a += { nombre: 'DBT_CLOUD_EXTENDIDO_V2_SPEC_SOURCE.md', tipo: 'md', bytes: 5862, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DDD_CQRS_migration_plan.md' })
SET a += { nombre: 'DDD_CQRS_migration_plan.md', tipo: 'md', bytes: 3133, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DOCKER_COMPOSE_BACKEND_SPEC.v1.md' })
SET a += { nombre: 'DOCKER_COMPOSE_BACKEND_SPEC.v1.md', tipo: 'md', bytes: 13136, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/DOCUMENTATION_INDEX.md' })
SET a += { nombre: 'DOCUMENTATION_INDEX.md', tipo: 'md', bytes: 1525, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/FRONTEND_DVT_PLUS_TECHNICAL_SPEC.md' })
SET a += { nombre: 'FRONTEND_DVT_PLUS_TECHNICAL_SPEC.md', tipo: 'md', bytes: 6818, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/GTM_PLAN_DVT.md' })
SET a += { nombre: 'GTM_PLAN_DVT.md', tipo: 'md', bytes: 2200, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md' })
SET a += { nombre: 'ISSUE_5_TEMPORAL_ADAPTER_STATUS_AND_IMPLEMENTATION_PROPOSAL.md', tipo: 'md', bytes: 11052, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/NEXT_ISSUES_TEMPLATES.md' })
SET a += { nombre: 'NEXT_ISSUES_TEMPLATES.md', tipo: 'md', bytes: 3484, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/PRODUCT_OPERATIONS_APPENDIX_DVT.md' })
SET a += { nombre: 'PRODUCT_OPERATIONS_APPENDIX_DVT.md', tipo: 'md', bytes: 5101, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_DVT.md' })
SET a += { nombre: 'PRODUCT_STRATEGY_DVT.md', tipo: 'md', bytes: 1450, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/planning' })
SET m += { nombre: 'planning', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/planning/PRODUCT_STRATEGY_GTM_AND_FINANCIALS.md' })
SET a += { nombre: 'PRODUCT_STRATEGY_GTM_AND_FINANCIALS.md', tipo: 'md', bytes: 767, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/proposal' })
SET m += { nombre: 'proposal', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/proposal/DVT_Architecture_v1.md' })
SET a += { nombre: 'DVT_Architecture_v1.md', tipo: 'md', bytes: 3167, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/proposal' })
SET m += { nombre: 'proposal', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/proposal/DVT_Infrastructure_Architecture_v1.md' })
SET a += { nombre: 'DVT_Infrastructure_Architecture_v1.md', tipo: 'md', bytes: 3364, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/proposal' })
SET m += { nombre: 'proposal', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/proposal/image.png' })
SET a += { nombre: 'image.png', tipo: 'png', bytes: 36204, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/proposal' })
SET m += { nombre: 'proposal', lenguaje: 'text' }
MERGE (a:Archivo { path: 'docs/proposal/proposal 1.txt' })
SET a += { nombre: 'proposal 1.txt', tipo: 'txt', bytes: 7569, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/release' })
SET m += { nombre: 'release', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/release/CHANGELOG.md' })
SET a += { nombre: 'CHANGELOG.md', tipo: 'md', bytes: 6174, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/runbooks/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 88, topico: 'doc' }
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
MERGE (m:Modulo { path: 'docs/runbooks' })
SET m += { nombre: 'runbooks', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/runbooks/snapshot_backfill.md' })
SET a += { nombre: 'snapshot_backfill.md', tipo: 'md', bytes: 1333, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md' })
SET a += { nombre: 'DVT_PLUS_ENGINE_TEMPORAL_QUALITY_PACK_2026-02-14.md', tipo: 'md', bytes: 16950, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/IMPLEMENTATION_NOTES_OUTBOX_WORKER.md' })
SET a += { nombre: 'IMPLEMENTATION_NOTES_OUTBOX_WORKER.md', tipo: 'md', bytes: 1644, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/IMPLEMENTATION_SUMMARY.md' })
SET a += { nombre: 'IMPLEMENTATION_SUMMARY.md', tipo: 'md', bytes: 20616, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/ISSUE_226_PLAYBOOK_DRAFT.md' })
SET a += { nombre: 'ISSUE_226_PLAYBOOK_DRAFT.md', tipo: 'md', bytes: 4142, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/ISSUE_227_PLAYBOOK_DRAFT.md' })
SET a += { nombre: 'ISSUE_227_PLAYBOOK_DRAFT.md', tipo: 'md', bytes: 4744, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/ISSUE_228_PLAYBOOK_DRAFT.md' })
SET a += { nombre: 'ISSUE_228_PLAYBOOK_DRAFT.md', tipo: 'md', bytes: 4089, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/ISSUE_229_PLAYBOOK_DRAFT.md' })
SET a += { nombre: 'ISSUE_229_PLAYBOOK_DRAFT.md', tipo: 'md', bytes: 4150, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'docs/status' })
SET m += { nombre: 'status', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'docs/status/ISSUE_6_PLAYBOOK_DRAFT.md' })
SET a += { nombre: 'ISSUE_6_PLAYBOOK_DRAFT.md', tipo: 'md', bytes: 6555, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'eslint.config.cjs' })
SET m += { nombre: 'eslint.config.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'eslint.config.cjs' })
SET a += { nombre: 'eslint.config.cjs', tipo: 'cjs', bytes: 11873, topico: 'code' }
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
MERGE (m:Modulo { path: 'mkdocs.yml' })
SET m += { nombre: 'mkdocs.yml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'mkdocs.yml' })
SET a += { nombre: 'mkdocs.yml', tipo: 'yml', bytes: 676, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'package.json' })
SET m += { nombre: 'package.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 6743, topico: 'config' }
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
SET a += { nombre: 'package.json', tipo: 'json', bytes: 554, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
SET a += { nombre: 'PostgresStateStoreAdapter.ts', tipo: 'ts', bytes: 29775, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 302, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/sqlUtils.ts' })
SET a += { nombre: 'sqlUtils.ts', tipo: 'ts', bytes: 305, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 4689, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 3704, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 144, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 286, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-postgres/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 182, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 7566, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 809, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts' })
SET a += { nombre: 'TemporalAdapter.ts', tipo: 'ts', bytes: 4022, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts' })
SET a += { nombre: 'TemporalClient.ts', tipo: 'ts', bytes: 1907, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts' })
SET a += { nombre: 'TemporalWorkerHost.ts', tipo: 'ts', bytes: 2131, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/WorkflowMapper.ts' })
SET a += { nombre: 'WorkflowMapper.ts', tipo: 'ts', bytes: 1721, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/activities/stepActivities.ts' })
SET a += { nombre: 'stepActivities.ts', tipo: 'ts', bytes: 7195, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/config.ts' })
SET a += { nombre: 'config.ts', tipo: 'ts', bytes: 3274, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/engine-types.ts' })
SET a += { nombre: 'engine-types.ts', tipo: 'ts', bytes: 5135, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1132, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow.ts' })
SET a += { nombre: 'RunPlanWorkflow.ts', tipo: 'ts', bytes: 13172, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/activities.test.ts' })
SET a += { nombre: 'activities.test.ts', tipo: 'ts', bytes: 13688, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/integration.time-skipping.test.ts' })
SET a += { nombre: 'integration.time-skipping.test.ts', tipo: 'ts', bytes: 16595, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/smoke.test.ts' })
SET a += { nombre: 'smoke.test.ts', tipo: 'ts', bytes: 4958, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-continue-as-new.test.ts' })
SET a += { nombre: 'workflow-continue-as-new.test.ts', tipo: 'ts', bytes: 1328, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-dag-scheduler.test.ts' })
SET a += { nombre: 'workflow-dag-scheduler.test.ts', tipo: 'ts', bytes: 2414, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/test/workflow-literals.test.ts' })
SET a += { nombre: 'workflow-literals.test.ts', tipo: 'ts', bytes: 1094, topico: 'code' }
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
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/adapter-temporal/vitest.config.cjs' })
SET a += { nombre: 'vitest.config.cjs', tipo: 'cjs', bytes: 182, topico: 'code' }
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
SET a += { nombre: 'run-golden-paths.cjs', tipo: 'cjs', bytes: 36, topico: 'code' }
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
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 8084, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 16883, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
SET a += { nombre: 'index.d.ts', tipo: 'ts', bytes: 377, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/index.js' })
SET a += { nombre: 'index.js', tipo: 'js', bytes: 1395, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 521, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 550, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.d.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.d.ts', tipo: 'ts', bytes: 910, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.js' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.js', tipo: 'js', bytes: 130, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IOutboxStorageAdapter.v1.ts' })
SET a += { nombre: 'IOutboxStorageAdapter.v1.ts', tipo: 'ts', bytes: 857, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.d.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.d.ts', tipo: 'ts', bytes: 1291, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.js' })
SET a += { nombre: 'IProjectorAdapter.v1.js', tipo: 'js', bytes: 126, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProjectorAdapter.v1.ts' })
SET a += { nombre: 'IProjectorAdapter.v1.ts', tipo: 'ts', bytes: 1233, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IProviderAdapter.v1.ts' })
SET a += { nombre: 'IProviderAdapter.v1.ts', tipo: 'ts', bytes: 466, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.d.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.d.ts', tipo: 'ts', bytes: 402, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.js' })
SET a += { nombre: 'IStateStoreAdapter.v1.js', tipo: 'js', bytes: 127, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IStateStoreAdapter.v1.ts' })
SET a += { nombre: 'IStateStoreAdapter.v1.ts', tipo: 'ts', bytes: 351, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.d.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.d.ts', tipo: 'ts', bytes: 1761, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.js' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.js', tipo: 'js', bytes: 131, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
SET a += { nombre: 'IWorkflowEngineAdapter.v1.ts', tipo: 'ts', bytes: 1682, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 276, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
SET a += { nombre: 'schemas.ts', tipo: 'ts', bytes: 6474, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.d.ts' })
SET a += { nombre: 'artifacts.d.ts', tipo: 'ts', bytes: 768, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.js' })
SET a += { nombre: 'artifacts.js', tipo: 'js', bytes: 212, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
SET a += { nombre: 'artifacts.ts', tipo: 'ts', bytes: 716, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.d.ts' })
SET a += { nombre: 'contracts.d.ts', tipo: 'ts', bytes: 2069, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.js' })
SET a += { nombre: 'contracts.js', tipo: 'js', bytes: 197, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
SET a += { nombre: 'contracts.ts', tipo: 'ts', bytes: 2171, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.d.ts' })
SET a += { nombre: 'state-store.d.ts', tipo: 'ts', bytes: 1919, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.js' })
SET a += { nombre: 'state-store.js', tipo: 'js', bytes: 162, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.ts' })
SET a += { nombre: 'state-store.ts', tipo: 'ts', bytes: 1859, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
SET a += { nombre: 'validation.ts', tipo: 'ts', bytes: 4018, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/src/workflows.ts' })
SET a += { nombre: 'workflows.ts', tipo: 'ts', bytes: 379, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/contracts/test/errors.test.ts' })
SET a += { nombre: 'errors.test.ts', tipo: 'ts', bytes: 478, topico: 'code' }
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
MERGE (a:Archivo { path: 'packages/@dvt/engine/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 33404, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/docs/GAPS_AND_FIXES.md' })
SET a += { nombre: 'GAPS_AND_FIXES.md', tipo: 'md', bytes: 2115, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/package.json' })
SET a += { nombre: 'package.json', tipo: 'json', bytes: 458, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/IPlanFetcher.ts' })
SET a += { nombre: 'IPlanFetcher.ts', tipo: 'ts', bytes: 515, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/IProviderAdapter.ts' })
SET a += { nombre: 'IProviderAdapter.ts', tipo: 'ts', bytes: 691, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts' })
SET a += { nombre: 'ConductorAdapterStub.ts', tipo: 'ts', bytes: 1104, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts' })
SET a += { nombre: 'MockAdapter.ts', tipo: 'ts', bytes: 4484, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts' })
SET a += { nombre: 'TemporalAdapterStub.ts', tipo: 'ts', bytes: 1109, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/application/providerSelection.ts' })
SET a += { nombre: 'providerSelection.ts', tipo: 'ts', bytes: 2078, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/IWorkflowEngine.v1_1_1.ts' })
SET a += { nombre: 'IWorkflowEngine.v1_1_1.ts', tipo: 'ts', bytes: 431, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
SET a += { nombre: 'errors.ts', tipo: 'ts', bytes: 3842, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/executionPlan.ts' })
SET a += { nombre: 'executionPlan.ts', tipo: 'ts', bytes: 560, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 53, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/runEvents.ts' })
SET a += { nombre: 'runEvents.ts', tipo: 'ts', bytes: 1876, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/contracts/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 1811, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts' })
SET a += { nombre: 'SnapshotProjector.ts', tipo: 'ts', bytes: 3957, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts' })
SET a += { nombre: 'WorkflowEngine.ts', tipo: 'ts', bytes: 19206, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/idempotency.ts' })
SET a += { nombre: 'idempotency.ts', tipo: 'ts', bytes: 1795, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 48, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/core/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 48, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 1241, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/metrics/IMetricsCollector.ts' })
SET a += { nombre: 'IMetricsCollector.ts', tipo: 'ts', bytes: 1408, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/IOutboxRateLimiter.ts' })
SET a += { nombre: 'IOutboxRateLimiter.ts', tipo: 'ts', bytes: 616, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts' })
SET a += { nombre: 'InMemoryEventBus.ts', tipo: 'ts', bytes: 328, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts' })
SET a += { nombre: 'InMemoryOutboxStorage.ts', tipo: 'ts', bytes: 1779, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 908, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts' })
SET a += { nombre: 'TokenBucketRateLimiter.ts', tipo: 'ts', bytes: 1983, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/outbox/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 898, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/ports/IPlanResolver.ts' })
SET a += { nombre: 'IPlanResolver.ts', tipo: 'ts', bytes: 267, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/AuthorizationError.ts' })
SET a += { nombre: 'AuthorizationError.ts', tipo: 'ts', bytes: 276, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/authorizer.ts' })
SET a += { nombre: 'authorizer.ts', tipo: 'ts', bytes: 234, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/planIntegrity.ts' })
SET a += { nombre: 'planIntegrity.ts', tipo: 'ts', bytes: 722, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/security/planRefPolicy.ts' })
SET a += { nombre: 'planRefPolicy.ts', tipo: 'ts', bytes: 2438, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/shims/node.d.ts' })
SET a += { nombre: 'node.d.ts', tipo: 'ts', bytes: 351, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/state/IRunStateStore.ts' })
SET a += { nombre: 'IRunStateStore.ts', tipo: 'ts', bytes: 1535, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts' })
SET a += { nombre: 'InMemoryRunStateStore.ts', tipo: 'ts', bytes: 4300, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts' })
SET a += { nombre: 'InMemoryTxStore.ts', tipo: 'ts', bytes: 6772, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/types/index.ts' })
SET a += { nombre: 'index.ts', tipo: 'ts', bytes: 49, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/types/types.ts' })
SET a += { nombre: 'types.ts', tipo: 'ts', bytes: 49, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/utils/clock.ts' })
SET a += { nombre: 'clock.ts', tipo: 'ts', bytes: 4906, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/utils/jcs.ts' })
SET a += { nombre: 'jcs.ts', tipo: 'ts', bytes: 2092, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/utils/sha256.ts' })
SET a += { nombre: 'sha256.ts', tipo: 'ts', bytes: 186, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/src/workers/OutboxWorker.ts' })
SET a += { nombre: 'OutboxWorker.ts', tipo: 'ts', bytes: 58, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/application/providerSelection.test.ts' })
SET a += { nombre: 'providerSelection.test.ts', tipo: 'ts', bytes: 2969, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/IWorkflowEngine.types.test.ts' })
SET a += { nombre: 'IWorkflowEngine.types.test.ts', tipo: 'ts', bytes: 2008, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/engine.test.ts' })
SET a += { nombre: 'engine.test.ts', tipo: 'ts', bytes: 9426, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/helpers.ts' })
SET a += { nombre: 'helpers.ts', tipo: 'ts', bytes: 550, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/plans/plan-cancel-and-resume.json' })
SET a += { nombre: 'plan-cancel-and-resume.json', tipo: 'json', bytes: 472, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/plans/plan-minimal.json' })
SET a += { nombre: 'plan-minimal.json', tipo: 'json', bytes: 271, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/contracts/plans/plan-parallel.json' })
SET a += { nombre: 'plan-parallel.json', tipo: 'json', bytes: 425, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/core/WorkflowEngine.test.ts' })
SET a += { nombre: 'WorkflowEngine.test.ts', tipo: 'ts', bytes: 7890, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/determinism/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 4044, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/idempotency.vectors.test.ts' })
SET a += { nombre: 'idempotency.vectors.test.ts', tipo: 'ts', bytes: 2130, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'packages/@dvt' })
SET m += { nombre: '@dvt', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'packages/@dvt/engine/test/security/authorizer.deny.test.ts' })
SET a += { nombre: 'authorizer.deny.test.ts', tipo: 'ts', bytes: 4823, topico: 'code' }
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
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 735, topico: 'config' }
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
MERGE (m:Modulo { path: 'packages/frontend' })
SET m += { nombre: 'frontend', lenguaje: 'json' }
MERGE (a:Archivo { path: 'packages/frontend/AI_INDEX.json' })
SET a += { nombre: 'AI_INDEX.json', tipo: 'json', bytes: 95, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'pnpm-lock.yaml' })
SET m += { nombre: 'pnpm-lock.yaml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'pnpm-lock.yaml' })
SET a += { nombre: 'pnpm-lock.yaml', tipo: 'yaml', bytes: 419995, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'pnpm-workspace.yaml' })
SET m += { nombre: 'pnpm-workspace.yaml', lenguaje: 'yaml' }
MERGE (a:Archivo { path: 'pnpm-workspace.yaml' })
SET a += { nombre: 'pnpm-workspace.yaml', tipo: 'yaml', bytes: 62, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'runbooks/WORKFLOW_ISOLATION_TESTING.md' })
SET m += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'runbooks/WORKFLOW_ISOLATION_TESTING.md' })
SET a += { nombre: 'WORKFLOW_ISOLATION_TESTING.md', tipo: 'md', bytes: 204, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/AI_INDEX_README.md' })
SET m += { nombre: 'AI_INDEX_README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'scripts/AI_INDEX_README.md' })
SET a += { nombre: 'AI_INDEX_README.md', tipo: 'md', bytes: 987, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/README.md' })
SET m += { nombre: 'README.md', lenguaje: 'markdown' }
MERGE (a:Archivo { path: 'scripts/README.md' })
SET a += { nombre: 'README.md', tipo: 'md', bytes: 7876, topico: 'doc' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/check-changed.cjs' })
SET m += { nombre: 'check-changed.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/check-changed.cjs' })
SET a += { nombre: 'check-changed.cjs', tipo: 'cjs', bytes: 4997, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/compare-hashes.cjs' })
SET m += { nombre: 'compare-hashes.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/compare-hashes.cjs' })
SET a += { nombre: 'compare-hashes.cjs', tipo: 'cjs', bytes: 3174, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/db-migrate.cjs' })
SET m += { nombre: 'db-migrate.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/db-migrate.cjs' })
SET a += { nombre: 'db-migrate.cjs', tipo: 'cjs', bytes: 3087, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/enable-workflow.sh' })
SET m += { nombre: 'enable-workflow.sh', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/enable-workflow.sh' })
SET a += { nombre: 'enable-workflow.sh', tipo: 'sh', bytes: 1490, topico: 'script' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/gen-ai-index.js' })
SET m += { nombre: 'gen-ai-index.js', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/gen-ai-index.js' })
SET a += { nombre: 'gen-ai-index.js', tipo: 'js', bytes: 2598, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/generate-contract-index.cjs' })
SET m += { nombre: 'generate-contract-index.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/generate-contract-index.cjs' })
SET a += { nombre: 'generate-contract-index.cjs', tipo: 'cjs', bytes: 9608, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/base-schema.cypher' })
SET a += { nombre: 'base-schema.cypher', tipo: 'cypher', bytes: 8838, topico: 'other' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/neo4j' })
SET m += { nombre: 'neo4j', lenguaje: 'text' }
MERGE (a:Archivo { path: 'scripts/neo4j/generated-repo.cypher' })
SET a += { nombre: 'generated-repo.cypher', tipo: 'cypher', bytes: 285999, topico: 'other' }
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
SET a += { nombre: 'neo4j-seed.cjs', tipo: 'cjs', bytes: 2107, topico: 'code' }
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
SET a += { nombre: 'run-golden-paths.cjs', tipo: 'cjs', bytes: 4126, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-contracts.cjs' })
SET m += { nombre: 'validate-contracts.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-contracts.cjs' })
SET a += { nombre: 'validate-contracts.cjs', tipo: 'cjs', bytes: 3244, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-executable-examples.cjs' })
SET m += { nombre: 'validate-executable-examples.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-executable-examples.cjs' })
SET a += { nombre: 'validate-executable-examples.cjs', tipo: 'cjs', bytes: 6532, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-glossary-usage.cjs' })
SET m += { nombre: 'validate-glossary-usage.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-glossary-usage.cjs' })
SET a += { nombre: 'validate-glossary-usage.cjs', tipo: 'cjs', bytes: 4865, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-idempotency-vectors.cjs' })
SET m += { nombre: 'validate-idempotency-vectors.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-idempotency-vectors.cjs' })
SET a += { nombre: 'validate-idempotency-vectors.cjs', tipo: 'cjs', bytes: 4178, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-references.cjs' })
SET m += { nombre: 'validate-references.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-references.cjs' })
SET a += { nombre: 'validate-references.cjs', tipo: 'cjs', bytes: 6368, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'scripts/validate-rfc2119.cjs' })
SET m += { nombre: 'validate-rfc2119.cjs', lenguaje: 'javascript' }
MERGE (a:Archivo { path: 'scripts/validate-rfc2119.cjs' })
SET a += { nombre: 'validate-rfc2119.cjs', tipo: 'cjs', bytes: 4597, topico: 'code' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.base.json' })
SET m += { nombre: 'tsconfig.base.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.base.json' })
SET a += { nombre: 'tsconfig.base.json', tipo: 'json', bytes: 890, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.eslint.base.json' })
SET m += { nombre: 'tsconfig.eslint.base.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.eslint.base.json' })
SET a += { nombre: 'tsconfig.eslint.base.json', tipo: 'json', bytes: 252, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.eslint.json' })
SET m += { nombre: 'tsconfig.eslint.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.eslint.json' })
SET a += { nombre: 'tsconfig.eslint.json', tipo: 'json', bytes: 302, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.json' })
SET m += { nombre: 'tsconfig.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.json' })
SET a += { nombre: 'tsconfig.json', tipo: 'json', bytes: 1368, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'tsconfig.test.json' })
SET m += { nombre: 'tsconfig.test.json', lenguaje: 'json' }
MERGE (a:Archivo { path: 'tsconfig.test.json' })
SET a += { nombre: 'tsconfig.test.json', tipo: 'json', bytes: 205, topico: 'config' }
MERGE (m)-[:CONTIENE]->(a);
MERGE (m:Modulo { path: 'vitest.config.ts' })
SET m += { nombre: 'vitest.config.ts', lenguaje: 'typescript' }
MERGE (a:Archivo { path: 'vitest.config.ts' })
SET a += { nombre: 'vitest.config.ts', tipo: 'ts', bytes: 571, topico: 'code' }
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
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.d.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.ts' })
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
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.js' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.ts' })
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
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.ts' })
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
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/index.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
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
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/schemas.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/contracts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/adapters/IWorkflowEngineAdapter.v1.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/artifacts.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/types/state-store.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/contracts/test/errors.test.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'packages/@dvt/engine/test/utils/clock.test.ts' })
MATCH (dst:Archivo { path: 'packages/@dvt/engine/src/utils/clock.ts' })
MERGE (src)-[:DEPENDE]->(dst);
MATCH (src:Archivo { path: 'scripts/neo4j/neo4j-generate-cypher.cjs' })
MATCH (dst:Archivo { path: 'scripts/neo4j/neo4j-ingest-repo.cjs' })
MERGE (src)-[:DEPENDE]->(dst);

// Class/function definitions
MERGE (f:Funcion { key: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts::PostgresStateStoreAdapter' })
SET f += { nombre: 'PostgresStateStoreAdapter', linea_inicio: 162, path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts::TemporalAdapter' })
SET f += { nombre: 'TemporalAdapter', linea_inicio: 46, path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts::TemporalClientManager' })
SET f += { nombre: 'TemporalClientManager', linea_inicio: 12, path: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalClient.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts::TemporalWorkerHost' })
SET f += { nombre: 'TemporalWorkerHost', linea_inicio: 21, path: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/adapter-temporal/src/TemporalWorkerHost.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/contracts/src/errors.ts::AuthorizationError' })
SET f += { nombre: 'AuthorizationError', linea_inicio: 1, path: 'packages/@dvt/contracts/src/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/contracts/src/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/contracts/src/validation.ts::ContractValidationError' })
SET f += { nombre: 'ContractValidationError', linea_inicio: 40, path: 'packages/@dvt/contracts/src/validation.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/contracts/src/validation.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts::ConductorAdapterStub' })
SET f += { nombre: 'ConductorAdapterStub', linea_inicio: 11, path: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/adapters/conductor/ConductorAdapterStub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts::MockAdapter' })
SET f += { nombre: 'MockAdapter', linea_inicio: 16, path: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/adapters/mock/MockAdapter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts::TemporalAdapterStub' })
SET f += { nombre: 'TemporalAdapterStub', linea_inicio: 11, path: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/adapters/temporal/TemporalAdapterStub.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::DvtError' })
SET f += { nombre: 'DvtError', linea_inicio: 7, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::RunNotFoundError' })
SET f += { nombre: 'RunNotFoundError', linea_inicio: 41, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::RunAlreadyExistsError' })
SET f += { nombre: 'RunAlreadyExistsError', linea_inicio: 48, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::AdapterNotRegisteredError' })
SET f += { nombre: 'AdapterNotRegisteredError', linea_inicio: 55, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::TenantAccessDeniedError' })
SET f += { nombre: 'TenantAccessDeniedError', linea_inicio: 62, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::CapabilitiesNotSupportedError' })
SET f += { nombre: 'CapabilitiesNotSupportedError', linea_inicio: 69, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::TargetAdapterMismatchError' })
SET f += { nombre: 'TargetAdapterMismatchError', linea_inicio: 79, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::InvalidRunIdError' })
SET f += { nombre: 'InvalidRunIdError', linea_inicio: 89, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::InvalidSchemaVersionError' })
SET f += { nombre: 'InvalidSchemaVersionError', linea_inicio: 96, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::RunMetadataNotFoundError' })
SET f += { nombre: 'RunMetadataNotFoundError', linea_inicio: 103, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::SignalNotImplementedError' })
SET f += { nombre: 'SignalNotImplementedError', linea_inicio: 110, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/contracts/errors.ts::OutboxRateLimitExceededError' })
SET f += { nombre: 'OutboxRateLimitExceededError', linea_inicio: 117, path: 'packages/@dvt/engine/src/contracts/errors.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/contracts/errors.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/core/SnapshotProjector.ts::SnapshotProjector' })
SET f += { nombre: 'SnapshotProjector', linea_inicio: 116, path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/core/SnapshotProjector.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/core/WorkflowEngine.ts::WorkflowEngine' })
SET f += { nombre: 'WorkflowEngine', linea_inicio: 115, path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/core/WorkflowEngine.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/core/idempotency.ts::IdempotencyKeyBuilder' })
SET f += { nombre: 'IdempotencyKeyBuilder', linea_inicio: 20, path: 'packages/@dvt/engine/src/core/idempotency.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/core/idempotency.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts::InMemoryEventBus' })
SET f += { nombre: 'InMemoryEventBus', linea_inicio: 3, path: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryEventBus.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts::InMemoryOutboxStorage' })
SET f += { nombre: 'InMemoryOutboxStorage', linea_inicio: 4, path: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/InMemoryOutboxStorage.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts::OutboxWorker' })
SET f += { nombre: 'OutboxWorker', linea_inicio: 6, path: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/OutboxWorker.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts::TokenBucketRateLimiter' })
SET f += { nombre: 'TokenBucketRateLimiter', linea_inicio: 20, path: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/AuthorizationError.ts::AuthorizationError' })
SET f += { nombre: 'AuthorizationError', linea_inicio: 1, path: 'packages/@dvt/engine/src/security/AuthorizationError.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/AuthorizationError.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/authorizer.ts::AllowAllAuthorizer' })
SET f += { nombre: 'AllowAllAuthorizer', linea_inicio: 4, path: 'packages/@dvt/engine/src/security/authorizer.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/authorizer.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/planIntegrity.ts::PlanIntegrityValidator' })
SET f += { nombre: 'PlanIntegrityValidator', linea_inicio: 8, path: 'packages/@dvt/engine/src/security/planIntegrity.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/planIntegrity.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/security/planRefPolicy.ts::PlanRefPolicy' })
SET f += { nombre: 'PlanRefPolicy', linea_inicio: 8, path: 'packages/@dvt/engine/src/security/planRefPolicy.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/security/planRefPolicy.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/shims/node.d.ts::URL' })
SET f += { nombre: 'URL', linea_inicio: 11, path: 'packages/@dvt/engine/src/shims/node.d.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/shims/node.d.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts::InMemoryRunStateStore' })
SET f += { nombre: 'InMemoryRunStateStore', linea_inicio: 10, path: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryRunStateStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts::InMemoryTxStore' })
SET f += { nombre: 'InMemoryTxStore', linea_inicio: 12, path: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/state/InMemoryTxStore.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/src/utils/clock.ts::SequenceClock' })
SET f += { nombre: 'SequenceClock', linea_inicio: 151, path: 'packages/@dvt/engine/src/utils/clock.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/src/utils/clock.ts' })
MERGE (a)-[:DEFINE]->(f);
MERGE (f:Funcion { key: 'packages/@dvt/engine/test/contracts/helpers.ts::InMemoryPlanFetcher' })
SET f += { nombre: 'InMemoryPlanFetcher', linea_inicio: 2, path: 'packages/@dvt/engine/test/contracts/helpers.ts' }
WITH f
MATCH (a:Archivo { path: 'packages/@dvt/engine/test/contracts/helpers.ts' })
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
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#226' })
SET i += { number: 226, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/226' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#227' })
SET i += { number: 227, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/227' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#228' })
SET i += { number: 228, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/228' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#229' })
SET i += { number: 229, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/229' }
WITH i
MATCH (a:Archivo { path: 'docs/AI_INDEX.json' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#76' })
SET i += { number: 76, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/76' }
WITH i
MATCH (a:Archivo { path: 'docs/REPO_STRUCTURE_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#3' })
SET i += { number: 3, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/3' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#4' })
SET i += { number: 4, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/4' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#7' })
SET i += { number: 7, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/7' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#11' })
SET i += { number: 11, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/11' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#12' })
SET i += { number: 12, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/12' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#18' })
SET i += { number: 18, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/18' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#19' })
SET i += { number: 19, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/19' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#90' })
SET i += { number: 90, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/90' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#91' })
SET i += { number: 91, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/91' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#92' })
SET i += { number: 92, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/92' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#93' })
SET i += { number: 93, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/93' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#94' })
SET i += { number: 94, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/94' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#98' })
SET i += { number: 98, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/98' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#106' })
SET i += { number: 106, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/106' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#117' })
SET i += { number: 117, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/117' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#217' })
SET i += { number: 217, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/217' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#218' })
SET i += { number: 218, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/218' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#219' })
SET i += { number: 219, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/219' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#220' })
SET i += { number: 220, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/220' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#222' })
SET i += { number: 222, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/222' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#224' })
SET i += { number: 224, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/224' }
WITH i
MATCH (a:Archivo { path: 'docs/ROADMAP_ISSUES_SUMMARY.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/decisions/ADR-0007-temporal-retry-policy-mvp.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/guides/TECHNICAL_DEBT_REGISTER.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#220' })
SET i += { number: 220, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/220' }
WITH i
MATCH (a:Archivo { path: 'docs/guides/TECHNICAL_DEBT_REGISTER.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#221' })
SET i += { number: 221, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/221' }
WITH i
MATCH (a:Archivo { path: 'docs/guides/TECHNICAL_DEBT_REGISTER.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#2' })
SET i += { number: 2, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/2' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#3' })
SET i += { number: 3, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/3' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#5' })
SET i += { number: 5, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/5' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#7' })
SET i += { number: 7, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/7' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#8' })
SET i += { number: 8, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/8' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#9' })
SET i += { number: 9, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/9' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#13' })
SET i += { number: 13, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/13' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#16' })
SET i += { number: 16, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/16' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#17' })
SET i += { number: 17, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/17' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#19' })
SET i += { number: 19, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/19' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#41' })
SET i += { number: 41, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/41' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#56' })
SET i += { number: 56, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/56' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#62' })
SET i += { number: 62, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/62' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#63' })
SET i += { number: 63, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/63' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#64' })
SET i += { number: 64, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/64' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#69' })
SET i += { number: 69, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/69' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#70' })
SET i += { number: 70, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/70' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#73' })
SET i += { number: 73, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/73' }
WITH i
MATCH (a:Archivo { path: 'docs/release/CHANGELOG.md' })
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
MERGE (i:Issue { key: 'dunay2/dvt#10' })
SET i += { number: 10, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/10' }
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
MERGE (i:Issue { key: 'dunay2/dvt#226' })
SET i += { number: 226, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/226' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_226_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#227' })
SET i += { number: 227, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/227' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_227_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#228' })
SET i += { number: 228, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/228' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_228_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#226' })
SET i += { number: 226, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/226' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_229_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#227' })
SET i += { number: 227, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/227' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_229_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#228' })
SET i += { number: 228, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/228' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_229_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#229' })
SET i += { number: 229, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/229' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_229_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_6_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#14' })
SET i += { number: 14, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/14' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_6_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_6_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#68' })
SET i += { number: 68, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/68' }
WITH i
MATCH (a:Archivo { path: 'docs/status/ISSUE_6_PLAYBOOK_DRAFT.md' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#6' })
SET i += { number: 6, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/6' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/adapter-postgres/src/PostgresStateStoreAdapter.ts' })
MERGE (a)-[:REFERENCIA_ISSUE]->(i);
MERGE (i:Issue { key: 'dunay2/dvt#133' })
SET i += { number: 133, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/133' }
WITH i
MATCH (a:Archivo { path: 'packages/@dvt/cli/validate-contracts.cjs' })
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
MERGE (d:Decision { id: 'ADR-0007' })
SET d += { title: 'ADR-0007: Temporal Retry Policy for MVP Interpreter Runtime', date: '2026-02-18', status: 'Accepted', path: 'docs/decisions/ADR-0007-temporal-retry-policy-mvp.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0007-temporal-retry-policy-mvp.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0008' })
SET d += { title: 'ADR-0008: Source Import Wizard (Warehouse → dbt Sources)', date: '2026-02-18', status: 'Accepted', path: 'docs/decisions/ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0008-source-import-wizard-warehouse-to-dbt-sources.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0010' })
SET d += { title: 'ADR-0010 — Run Event Envelope Split', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0010-run-event-envelope-split.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0010-run-event-envelope-split.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0011' })
SET d += { title: 'ADR-0011 — RunStarted Ownership', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0011-run-started-ownership.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0011-run-started-ownership.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0012' })
SET d += { title: 'ADR-0012 — Plan Integrity Ownership', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0012-plan-integrity-ownership.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0012-plan-integrity-ownership.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0013' })
SET d += { title: 'ADR-0013 — IRunStateStore.bootstrapRunTx', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0013-run-state-store-bootstrapRunTx.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0013-run-state-store-bootstrapRunTx.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0014' })
SET d += { title: 'ADR-0014 — Run-Driven Adapter Model', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0014-run-driven-adapter-model.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0014-run-driven-adapter-model.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0015' })
SET d += { title: 'ADR-0015 — getRunStatus Read Model Separation', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0015-getRunStatus-read-model-separation.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0015-getRunStatus-read-model-separation.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);
MERGE (d:Decision { id: 'ADR-0016' })
SET d += { title: 'ADR-0016 — logicalAttemptId Ownership by Adapter', date: '2026-02-20', status: 'Proposed', path: 'docs/decisions/ADR-0016-logicalAttemptId-adapter-ownership.md' }
REMOVE d.titulo, d.fecha, d.estado
WITH d
MATCH (a:Archivo { path: 'docs/decisions/ADR-0016-logicalAttemptId-adapter-ownership.md' })
MERGE (a)-[:IMPLEMENTA_DECISION]->(d);

// ADR tracked-by issues
MATCH (d:Decision { id: 'ADR-0007' })
MERGE (i:Issue { key: 'dunay2/dvt#15' })
SET i += { number: 15, repo: 'dunay2/dvt', url: 'https://github.com/dunay2/dvt/issues/15' }
MERGE (d)-[:TRACKED_BY]->(i);

// Derived roadmap phase links to artifacts and decisions
MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:REFERENCIA_ISSUE]-(a:Archivo)
MERGE (p)-[:RELACIONA_ARTEFACTO]->(a);
MATCH (p:FaseRoadmap)-[:TRACKED_BY]->(i:Issue)<-[:TRACKED_BY]-(d:Decision)
MERGE (p)-[:ANCLA_DECISION]->(d);

// End of generated graph script
