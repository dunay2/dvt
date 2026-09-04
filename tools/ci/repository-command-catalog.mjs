import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

export const REPOSITORY_COMMAND_DOMAINS = Object.freeze([
  'runtime-root',
  'runtime-package',
  'runtime-capability',
  'contracts',
  'docs-governance',
  'planning-db',
  'ci-tooling',
  'test-tooling',
  'developer-workflow',
  'dev-local',
  'release-ops',
  'unknown',
]);

export const REPOSITORY_COMMAND_SENSITIVITIES = Object.freeze([
  'root-build',
  'package-runtime',
  'capability',
  'contract',
  'governance',
  'planning-query-store',
  'ci-policy',
  'test-contract',
  'developer-workflow',
  'local-dev',
  'release-ops',
  'unknown',
]);

const COMMAND_FILE_EXTENSIONS = new Set(['.cjs', '.js', '.mjs', '.ps1', '.sh']);
const COMMAND_FILE_ROOTS = [
  'scripts/',
  'tools/ci/',
  'tools/docs/',
  'tools/ops/',
  '.github/scripts/',
];
const GOVERNANCE_TOOLING_DOMAINS = new Set([
  'docs-governance',
  'planning-db',
  'ci-tooling',
  'test-tooling',
  'developer-workflow',
  'release-ops',
]);

const EXACT_PACKAGE_SCRIPT_DOMAINS = new Map([
  ['build', 'runtime-root'],
  ['build:clean', 'runtime-root'],
  ['build:apps', 'runtime-root'],
  ['type-check', 'runtime-root'],
  ['type-check:apps', 'runtime-root'],
  ['test', 'runtime-root'],
  ['test:coverage', 'runtime-root'],
  ['test:coverage:engine', 'runtime-root'],
  ['ci:code', 'runtime-root'],
  ['ci:full', 'runtime-root'],
  ['preflight:affected', 'runtime-root'],
  ['preflight:affected:ci', 'runtime-root'],
  ['commit', 'developer-workflow'],
  ['ai:preflight', 'developer-workflow'],
  ['lint', 'developer-workflow'],
  ['lint:fix', 'developer-workflow'],
  ['lint:determinism', 'developer-workflow'],
  ['format', 'developer-workflow'],
  ['format:check', 'developer-workflow'],
  ['format:md:changed', 'developer-workflow'],
  ['fix:changed', 'developer-workflow'],
  ['verify:changed', 'developer-workflow'],
  ['verify:prepush', 'developer-workflow'],
  ['closeout:changed', 'developer-workflow'],
  ['pr:closeout', 'developer-workflow'],
  ['pr:checks', 'developer-workflow'],
  ['pr:checks:json', 'developer-workflow'],
  ['pr:checks:first-failure', 'developer-workflow'],
  ['test:ai-preflight', 'test-tooling'],
  ['test:verify-prepush', 'test-tooling'],
  ['test:pr-closeout', 'test-tooling'],
  ['pr:validate-title', 'developer-workflow'],
  ['precommit:determinism', 'developer-workflow'],
  ['hooks:precommit', 'developer-workflow'],
  ['prepare', 'developer-workflow'],
  ['arch:deps', 'ci-tooling'],
  ['test:ci-tools', 'ci-tooling'],
  ['test:ci-tools:static', 'ci-tooling'],
  ['test:ci-tools:executable', 'ci-tooling'],
  ['ci:docs', 'docs-governance'],
  ['versioning-check', 'release-ops'],
  ['release', 'release-ops'],
  ['ops:ar-c2:evidence', 'release-ops'],
  ['db:migrate', 'runtime-capability'],
]);

const PACKAGE_PREFIX_DOMAINS = [
  [/^planning:db:/u, 'planning-db'],
  [/^governance:db:/u, 'planning-db'],
  [/^docs:/u, 'docs-governance'],
  [/^test:docs:/u, 'docs-governance'],
  [/^lint:md/u, 'docs-governance'],
  [/^qa:artifact/u, 'docs-governance'],
  [/^traceability:adr0$/u, 'docs-governance'],
  [/^gen:ai-index$/u, 'docs-governance'],
  [/^validate:glossary$/u, 'docs-governance'],
  [/^contracts:/u, 'contracts'],
  [/^golden:/u, 'contracts'],
  [/^validate:contracts$/u, 'contracts'],
  [/^rebuild:snapshots$/u, 'contracts'],
  [/^test:contracts/u, 'contracts'],
  [/^postgres:local:/u, 'dev-local'],
  [/^test:adapter-(postgres|temporal)(:integration)?/u, 'runtime-capability'],
  [/^test:(engine|api|cli|planner|web)(:|$)/u, 'runtime-package'],
  [/^ci:affected:/u, 'runtime-root'],
  [/^dev:/u, 'dev-local'],
  [/^test:planning:db/u, 'planning-db'],
  [/^test:governance:refresh/u, 'planning-db'],
  [/^test:closeout-changed$/u, 'test-tooling'],
];

const SCRIPT_FILE_RULES = [
  [/^scripts\/build-workspace-runtime-deps\.cjs$/u, 'runtime-root'],
  [/^scripts\/run-turbo-workspace-task\.cjs$/u, 'runtime-root'],
  [/^scripts\/skip-pre(build|test)-if-.+\.cjs$/u, 'runtime-root'],
  [/^scripts\/db-migrate\.cjs$/u, 'runtime-capability'],
  [/^scripts\/provision-postgres-app-role\.cjs$/u, 'runtime-capability'],
  [/^scripts\/run-local-postgres(\.test)?\.cjs$/u, 'dev-local'],
  [/^scripts\/compare-hashes\.cjs$/u, 'contracts'],
  [/^scripts\/generate-contract-index\.cjs$/u, 'contracts'],
  [/^scripts\/rebuild-snapshots\.js$/u, 'contracts'],
  [
    /^scripts\/validate-(contracts|executable-examples|glossary-usage|idempotency-vectors|references|rfc2119)\.cjs$/u,
    'contracts',
  ],
  [/^scripts\/policy-validation-(files|text)\.cjs$/u, 'contracts'],
  [/^scripts\/planning-db-[\w-]+(\.test)?\.cjs$/u, 'planning-db'],
  [/^scripts\/planning-db\/(?:[\w-]+\/)*[\w-]+(\.test)?\.cjs$/u, 'planning-db'],
  [/^scripts\/planning-db-operate-tests\/[\w-]+\.cjs$/u, 'planning-db'],
  [/^scripts\/planning-db-query-tests\/[\w-]+\.cjs$/u, 'planning-db'],
  [/^scripts\/governance-db-(check|import|export)(\.test)?\.cjs$/u, 'planning-db'],
  [/^scripts\/governance-generated-paths(\.test)?\.cjs$/u, 'planning-db'],
  [/^scripts\/governance-refresh(\.test)?\.cjs$/u, 'planning-db'],
  [
    /^scripts\/generate-(db-surface-inventory|dbt-project-roundtrip-capability-status|knowledge-intake-literature)(\.test)?\.cjs$/u,
    'planning-db',
  ],
  [
    /^scripts\/(align-markdown-tables|backfill-planning-last-reviewed|(docs|documentation)-[\w-]+|sync-docs|generate-(capability-coverage|code-status|governance-[\w-]+|planning-lanes|spec-traceability-report)|generated-doc-date|gen-ai-index|check-(ai-efficiency-adoption|feature-mechanization|generated-docs-policy|governance-[\w-]+|markdown-locations)|validate-arc-evidence-frontmatter|qa-artifact-check|lint-markdown-changed)(\.test)?\.(cjs|js)$/u,
    'docs-governance',
  ],
  [/^scripts\/lib\/feature-mechanization-manifest\.cjs$/u, 'docs-governance'],
  [/^tools\/docs\/.+\.ts$/u, 'docs-governance'],
  [
    /^scripts\/(ai-preflight|closeout-changed|commit|fix-changed|format-markdown-changed|git-local-changes|local-validation-plan|pr-closeout|run-determinism-precommit|setup-git-hooks|validate-pr-title|verify-changed|verify-prepush)\.cjs$/u,
    'developer-workflow',
  ],
  [
    /^scripts\/(check-changed|check-forbidden-tracked-files|type-check-prepush)\.cjs$/u,
    'ci-tooling',
  ],
  [/^scripts\/run-dev-stack(\.[\w-]+)?(\.test)?\.cjs$/u, 'dev-local'],
  [
    /^scripts\/run-(canvas-first-authoring|canvas-source-import|het[12]-public-vertical|selected-closure)-live-proof\.cjs$/u,
    'dev-local',
  ],
  [
    /^scripts\/(enable-workflow\.sh|hygiene\.ps1|outbox-worker-canary-evidence\.ps1)$/u,
    'release-ops',
  ],
  [/^tools\/ops\/.+\.mjs$/u, 'release-ops'],
  [/^tools\/ci\/eslint-precommit\.config\.cjs$/u, 'developer-workflow'],
  [/^tools\/ci\/.+\.test\.mjs$/u, 'test-tooling'],
  [/^tools\/ci\/.+\.(mjs|js)$/u, 'ci-tooling'],
  [/^\.github\/scripts\/.+\.(js|sh)$/u, 'ci-tooling'],
  [/^scripts\/.+\.test\.cjs$/u, 'test-tooling'],
];

function normalizePath(filePath) {
  return filePath.replaceAll('\\', '/').replace(/^\.\/+/u, '');
}

function commandClass(domain, overrides = {}) {
  const sensitivityByDomain = {
    'runtime-root': 'root-build',
    'runtime-package': 'package-runtime',
    'runtime-capability': 'capability',
    contracts: 'contract',
    'docs-governance': 'governance',
    'planning-db': 'planning-query-store',
    'ci-tooling': 'ci-policy',
    'test-tooling': 'test-contract',
    'developer-workflow': 'developer-workflow',
    'dev-local': 'local-dev',
    'release-ops': 'release-ops',
    unknown: 'unknown',
  };
  const normalizedDomain = REPOSITORY_COMMAND_DOMAINS.includes(domain) ? domain : 'unknown';

  return {
    domain: normalizedDomain,
    sensitivity: sensitivityByDomain[normalizedDomain],
    runtimeFanout: normalizedDomain === 'runtime-root' || normalizedDomain === 'unknown',
    changedFileValidationRelevant:
      normalizedDomain !== 'dev-local' && normalizedDomain !== 'runtime-package',
    ...overrides,
  };
}

function firstMatchingDomain(rules, value) {
  return rules.find(([pattern]) => pattern.test(value))?.[1];
}

function classifyCommandByReferencedFiles(command) {
  const referencedFiles = extractReferencedCommandFiles(command);
  if (referencedFiles.length === 0) {
    return undefined;
  }

  const fileClasses = referencedFiles.map((filePath) => classifyScriptFilePath(filePath));
  if (fileClasses.some(({ domain }) => domain === 'unknown')) {
    return 'unknown';
  }
  if (fileClasses.some(({ runtimeFanout }) => runtimeFanout)) {
    return 'runtime-root';
  }
  if (fileClasses.some(({ domain }) => domain === 'runtime-capability')) {
    return 'runtime-capability';
  }
  if (fileClasses.some(({ domain }) => domain === 'contracts')) {
    return 'contracts';
  }
  if (fileClasses.some(({ domain }) => domain === 'planning-db')) {
    return 'planning-db';
  }
  if (fileClasses.some(({ domain }) => domain === 'docs-governance')) {
    return 'docs-governance';
  }
  if (fileClasses.some(({ domain }) => domain === 'release-ops')) {
    return 'release-ops';
  }
  if (fileClasses.some(({ domain }) => domain === 'ci-tooling')) {
    return 'ci-tooling';
  }
  if (fileClasses.some(({ domain }) => domain === 'developer-workflow')) {
    return 'developer-workflow';
  }
  if (fileClasses.some(({ domain }) => domain === 'test-tooling')) {
    return 'test-tooling';
  }
  if (fileClasses.some(({ domain }) => domain === 'dev-local')) {
    return 'dev-local';
  }

  return undefined;
}

export function classifyPackageScriptCommand(name, command = '') {
  if (EXACT_PACKAGE_SCRIPT_DOMAINS.has(name)) {
    return commandClass(EXACT_PACKAGE_SCRIPT_DOMAINS.get(name));
  }

  const prefixedDomain = firstMatchingDomain(PACKAGE_PREFIX_DOMAINS, name);
  if (prefixedDomain) {
    return commandClass(prefixedDomain);
  }

  const referencedDomain = classifyCommandByReferencedFiles(command);
  if (referencedDomain) {
    return commandClass(referencedDomain);
  }

  if (/\b(turbo|tsc|vitest|vite|cypress|pnpm\s+-r)\b/u.test(command)) {
    return commandClass('runtime-root');
  }
  if (/\b(eslint|prettier|markdownlint-cli2|lint-staged|commitlint)\b/u.test(command)) {
    return commandClass('developer-workflow');
  }
  if (/^test:/u.test(name)) {
    return commandClass('runtime-package');
  }

  return commandClass('unknown');
}

export function classifyScriptFilePath(filePath) {
  const normalizedPath = normalizePath(filePath);
  const domain = firstMatchingDomain(SCRIPT_FILE_RULES, normalizedPath);

  return commandClass(domain ?? 'unknown', {
    path: normalizedPath,
  });
}

export function extractReferencedCommandFiles(command = '') {
  return command
    .split(/\s+/u)
    .map((token) => token.trim().replace(/^['"]|['",;]+$/gu, ''))
    .map(normalizePath)
    .filter((token) => COMMAND_FILE_ROOTS.some((root) => token.startsWith(root)))
    .filter((token) => isRepositoryCommandFile(token));
}

export function isRepositoryCommandFile(filePath) {
  const normalizedPath = normalizePath(filePath);
  if (normalizedPath.startsWith('tools/docs/') && normalizedPath.endsWith('.ts')) {
    return true;
  }
  if (!COMMAND_FILE_ROOTS.some((root) => normalizedPath.startsWith(root))) {
    return false;
  }

  return COMMAND_FILE_EXTENSIONS.has(path.posix.extname(normalizedPath));
}

function* walkCommandFiles(rootDir, relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  if (!existsSync(absoluteDir)) {
    return;
  }

  for (const entry of readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = normalizePath(path.posix.join(relativeDir, entry.name));
    const absolutePath = path.join(rootDir, relativePath);

    if (entry.isDirectory()) {
      yield* walkCommandFiles(rootDir, relativePath);
      continue;
    }

    if (isRepositoryCommandFile(relativePath)) {
      yield normalizePath(path.relative(rootDir, absolutePath));
    }
  }
}

export function discoverRepositoryCommandFiles(rootDir = process.cwd()) {
  return ['scripts', 'tools/ci', 'tools/docs', 'tools/ops', '.github/scripts']
    .flatMap((relativeDir) => [...walkCommandFiles(rootDir, relativeDir)])
    .map(normalizePath)
    .sort((left, right) => left.localeCompare(right));
}

export function buildRepositoryCommandCatalog(
  packageJson,
  scriptFiles = discoverRepositoryCommandFiles()
) {
  const packageScripts = Object.entries(packageJson?.scripts ?? {})
    .map(([name, command]) => ({
      name,
      command,
      classification: classifyPackageScriptCommand(name, command),
      referencedFiles: extractReferencedCommandFiles(command),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const fileCommands = scriptFiles
    .map((filePath) => ({
      path: normalizePath(filePath),
      classification: classifyScriptFilePath(filePath),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    packageScripts,
    fileCommands,
  };
}

export function assertRepositoryCommandCatalogCoverage(catalog) {
  const unknownPackageScripts = catalog.packageScripts
    .filter(({ classification }) => classification.domain === 'unknown')
    .map(({ name }) => name);
  const unknownFiles = catalog.fileCommands
    .filter(({ classification }) => classification.domain === 'unknown')
    .map(({ path: filePath }) => filePath);
  const unknownReferences = catalog.packageScripts.flatMap(({ name, referencedFiles }) =>
    referencedFiles
      .filter((filePath) => classifyScriptFilePath(filePath).domain === 'unknown')
      .map((filePath) => `${name} -> ${filePath}`)
  );

  if (unknownPackageScripts.length > 0 || unknownFiles.length > 0 || unknownReferences.length > 0) {
    throw new Error(
      [
        'Repository command catalog has unclassified entries.',
        `packageScripts=${unknownPackageScripts.join(',')}`,
        `files=${unknownFiles.join(',')}`,
        `references=${unknownReferences.join(',')}`,
      ].join('\n')
    );
  }
}

export function isGovernanceToolingCommand(commandClass) {
  return GOVERNANCE_TOOLING_DOMAINS.has(commandClass.domain) && !commandClass.runtimeFanout;
}
