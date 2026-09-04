import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const contextIds = registry.contexts ?? [];
const baselineSha = process.env.DVT_ARCH_BASELINE_SHA || registry.baselineSha;

if (!baselineSha) throw new Error('DVT_ARCH_BASELINE_SHA or registry.baselineSha is required');
if (!Array.isArray(contextIds) || !contextIds.length) throw new Error('Context registry is empty');

const git = (args) =>
  execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trimEnd();

git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const contexts = contextIds.map((contextId) => {
  const config = JSON.parse(
    readFileSync(join(contextsDir, `${contextId}-source-baseline.json`), 'utf8'),
  );
  const packageJsonPath = posix.join(config.scope, 'package.json');
  let packageJson;
  try {
    packageJson = JSON.parse(git(['show', `${baselineSha}:${packageJsonPath}`]));
  } catch (error) {
    throw new Error(`${contextId} has no readable package.json at ${packageJsonPath}: ${error.message}`);
  }

  if (!packageJson.name) throw new Error(`${packageJsonPath} has no package name`);
  if (!config.modelId) throw new Error(`${contextId} source baseline has no modelId`);

  return {
    contextId,
    modelId: config.modelId,
    displayName: config.displayName ?? packageJson.name,
    scope: config.scope,
    packageName: packageJson.name,
    packageJsonPath,
    packageJson,
    manifestUrl: `https://github.com/${config.repository}/blob/${baselineSha}/${urlPath(packageJsonPath)}`,
  };
});

const contextByPackage = new Map(contexts.map((context) => [context.packageName, context]));
const relationships = [];
const unmodeledWorkspaceDependencies = [];

for (const source of contexts) {
  for (const [dependencyName, versionRange] of Object.entries(source.packageJson.dependencies ?? {})) {
    if (!dependencyName.startsWith('@dvt/')) continue;

    const target = contextByPackage.get(dependencyName);
    if (!target) {
      unmodeledWorkspaceDependencies.push({
        sourceContext: source.contextId,
        sourcePackage: source.packageName,
        dependency: dependencyName,
        versionRange,
        sourceManifest: source.packageJsonPath,
      });
      continue;
    }

    relationships.push({
      sourceContext: source.contextId,
      sourcePackage: source.packageName,
      sourceModelId: source.modelId,
      targetContext: target.contextId,
      targetPackage: target.packageName,
      targetModelId: target.modelId,
      dependencyType: 'dependencies',
      versionRange,
      sourceManifest: source.packageJsonPath,
      sourceManifestUrl: source.manifestUrl,
    });
  }
}

relationships.sort((a, b) =>
  `${a.sourceContext}:${a.targetContext}`.localeCompare(`${b.sourceContext}:${b.targetContext}`),
);
unmodeledWorkspaceDependencies.sort((a, b) =>
  `${a.sourceContext}:${a.dependency}`.localeCompare(`${b.sourceContext}:${b.dependency}`),
);

const evidenceBase = {
  schemaVersion: 1,
  generatedFrom: 'workspace-package-json',
  baselineSha,
  contexts: contexts.map(({ packageJson, ...context }) => context),
  relationships,
  unmodeledWorkspaceDependencies,
};
const canonical = JSON.stringify(evidenceBase, null, 2) + '\n';
const evidence = {
  ...evidenceBase,
  evidenceSha256: createHash('sha256').update(canonical).digest('hex'),
};

mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  join(generatedDir, 'context-dependencies.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);
writeFileSync(
  join(generatedDir, 'context-dependencies.c4'),
  renderLikeC4(contexts, relationships, baselineSha),
);

console.log(
  `Derived ${relationships.length} workspace dependencies across ${contexts.length} contexts @ ${baselineSha.slice(0, 8)}; ` +
    `${unmodeledWorkspaceDependencies.length} @dvt dependencies are not yet modeled.`,
);

function renderLikeC4(contextsToRender, relations, sha) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Workspace dependency evidence derived from package.json at ${sha}`,
    'model {',
  ];

  for (const relation of relations) {
    lines.push(
      `  ${relation.sourceModelId} .uses ${relation.targetModelId} '${esc(`workspace dependency: ${relation.targetPackage}`)}'`,
    );
  }

  lines.push('}', '', 'views {', '  view workspaceDependencyLandscape {');
  lines.push("    title 'DVT+ — Workspace dependency landscape'");
  lines.push(
    `    description 'SOURCE-DERIVED from package.json dependencies at main@${sha.slice(0, 8)}. Arrows mean compile/runtime workspace dependency, not runtime call direction.'`,
  );

  for (const context of contextsToRender) lines.push(`    include ${context.modelId}`);
  lines.push('    autoLayout LeftRight', '  }', '}', '');
  return lines.join('\n');
}

function urlPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ');
}
