import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const cruisePath = process.argv[2];
const baselineSha = process.argv[3] || process.env.DVT_ARCH_BASELINE_SHA;
if (!cruisePath || !baselineSha) {
  throw new Error('Usage: node generate-observed-import-landscape.mjs <dependency-cruise.json> <baseline-sha>');
}

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(architectureDir);
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const report = JSON.parse(readFileSync(join(repoRoot, cruisePath), 'utf8'));
const modules = report.modules ?? [];

const git = (args) =>
  execFileSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trimEnd();

git(['cat-file', '-e', `${baselineSha}^{commit}`]);

const contexts = (registry.contexts ?? []).map((contextId) => {
  const config = JSON.parse(
    readFileSync(join(contextsDir, `${contextId}-source-baseline.json`), 'utf8'),
  );
  const logicalSource = readFileSync(join(architectureDir, `${contextId}.c4`), 'utf8');
  const logicalModelId = parseLogicalModelId(logicalSource, contextId);
  const packageJsonPath = posix.join(config.scope, 'package.json');
  const packageJson = JSON.parse(git(['show', `${baselineSha}:${packageJsonPath}`]));
  return {
    contextId,
    scope: config.scope,
    logicalModelId,
    packageName: packageJson.name,
    dependencies: packageJson.dependencies ?? {},
    devDependencies: packageJson.devDependencies ?? {},
  };
});

const contextsByLongestScope = [...contexts].sort((a, b) => b.scope.length - a.scope.length);
const contextByPackage = new Map(contexts.map((context) => [context.packageName, context]));
const edgeMap = new Map();
const unmappedDvtImports = [];

for (const module of modules) {
  const sourcePath = normalizePath(module.source);
  const sourceContext = contextForPath(sourcePath);
  if (!sourceContext) continue;
  const sourceIsTest = isTestPath(sourcePath);

  for (const dependency of module.dependencies ?? []) {
    const target = resolveTargetContext(dependency);
    if (!target || target.contextId === sourceContext.contextId) continue;

    const key = `${sourceContext.contextId}\0${target.contextId}`;
    const edge = edgeMap.get(key) ?? {
      sourceContext: sourceContext.contextId,
      sourcePackage: sourceContext.packageName,
      sourceModelId: sourceContext.logicalModelId,
      targetContext: target.contextId,
      targetPackage: target.packageName,
      targetModelId: target.logicalModelId,
      runtimeImports: 0,
      typeOnlyImports: 0,
      dynamicImports: 0,
      testImports: 0,
      sourceFiles: new Set(),
      specifiers: new Set(),
      dependencyTypes: new Set(),
    };

    const typeOnly = isTypeOnlyDependency(dependency);
    if (sourceIsTest) edge.testImports += 1;
    else if (typeOnly) edge.typeOnlyImports += 1;
    else edge.runtimeImports += 1;
    if (dependency.dynamic === true) edge.dynamicImports += 1;
    edge.sourceFiles.add(sourcePath);
    if (dependency.module) edge.specifiers.add(dependency.module);
    for (const dependencyType of dependency.dependencyTypes ?? []) {
      edge.dependencyTypes.add(dependencyType);
    }
    edgeMap.set(key, edge);
  }
}

for (const module of modules) {
  const sourcePath = normalizePath(module.source);
  const sourceContext = contextForPath(sourcePath);
  if (!sourceContext) continue;
  for (const dependency of module.dependencies ?? []) {
    const specifier = dependency.module;
    if (typeof specifier !== 'string' || !specifier.startsWith('@dvt/')) continue;
    if (!resolveTargetContext(dependency)) {
      unmappedDvtImports.push({ sourceContext: sourceContext.contextId, sourcePath, specifier });
    }
  }
}

const edges = [...edgeMap.values()]
  .map((edge) => {
    const declaration = declarationKind(edge.sourcePackage, edge.targetPackage);
    return {
      ...edge,
      sourceFiles: [...edge.sourceFiles].sort(),
      specifiers: [...edge.specifiers].sort(),
      dependencyTypes: [...edge.dependencyTypes].sort(),
      manifestDeclaration: declaration,
      productionImportCount: edge.runtimeImports + edge.typeOnlyImports,
      productionManifestDrift:
        edge.runtimeImports + edge.typeOnlyImports > 0 && declaration !== 'dependencies',
    };
  })
  .sort((a, b) => `${a.sourceContext}:${a.targetContext}`.localeCompare(`${b.sourceContext}:${b.targetContext}`));

const productionManifestDrift = edges
  .filter((edge) => edge.productionManifestDrift)
  .map((edge) => ({
    sourceContext: edge.sourceContext,
    targetContext: edge.targetContext,
    runtimeImports: edge.runtimeImports,
    typeOnlyImports: edge.typeOnlyImports,
    manifestDeclaration: edge.manifestDeclaration,
    sourceFiles: edge.sourceFiles,
  }));

const evidenceBase = {
  schemaVersion: 1,
  generatedFrom: 'dependency-cruiser@17.3.9',
  baselineSha,
  totalCruised: report.summary?.totalCruised ?? modules.length,
  contextCount: contexts.length,
  edgeCount: edges.length,
  edges,
  productionManifestDrift,
  unmappedDvtImports: dedupeObjects(unmappedDvtImports),
  dependencyCruiserSummary: {
    error: report.summary?.error ?? null,
    warn: report.summary?.warn ?? null,
    info: report.summary?.info ?? null,
    violations: (report.summary?.violations ?? []).length,
  },
};
const canonical = JSON.stringify(evidenceBase, null, 2) + '\n';
const evidence = {
  ...evidenceBase,
  evidenceSha256: createHash('sha256').update(canonical).digest('hex'),
};

mkdirSync(generatedDir, { recursive: true });
writeFileSync(join(generatedDir, 'context-imports.json'), JSON.stringify(evidence, null, 2) + '\n');
writeFileSync(join(generatedDir, 'context-imports.c4'), renderLikeC4(edges));

console.log(
  `Observed ${edges.length} cross-context import edges from ${evidence.totalCruised} cruised modules @ ${baselineSha.slice(0, 8)}; ` +
    `${productionManifestDrift.length} production manifest drift edge(s), ${evidence.unmappedDvtImports.length} unmapped @dvt import(s).`,
);

if (evidence.unmappedDvtImports.length) {
  throw new Error(`Observed @dvt imports outside registered context map: ${evidence.unmappedDvtImports.map((item) => item.specifier).join(', ')}`);
}
if (productionManifestDrift.length) {
  throw new Error(
    `Production cross-context imports not declared in dependencies: ${productionManifestDrift.map((item) => `${item.sourceContext}->${item.targetContext}(${item.manifestDeclaration})`).join(', ')}`,
  );
}

function declarationKind(sourcePackage, targetPackage) {
  const source = contextByPackage.get(sourcePackage);
  if (!source) return 'none';
  if (Object.hasOwn(source.dependencies, targetPackage)) return 'dependencies';
  if (Object.hasOwn(source.devDependencies, targetPackage)) return 'devDependencies';
  return 'none';
}

function resolveTargetContext(dependency) {
  const specifier = dependency.module;
  if (typeof specifier === 'string' && specifier.startsWith('@dvt/')) {
    const packageName = packageNameFromSpecifier(specifier);
    const targetByPackage = contextByPackage.get(packageName);
    if (targetByPackage) return targetByPackage;
  }
  const resolved = normalizePath(dependency.resolved ?? '');
  return contextForPath(resolved);
}

function packageNameFromSpecifier(specifier) {
  const segments = specifier.split('/');
  return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : specifier;
}

function contextForPath(path) {
  if (!path) return null;
  return (
    contextsByLongestScope.find(
      (context) => path === context.scope || path.startsWith(`${context.scope}/`),
    ) ?? null
  );
}

function isTypeOnlyDependency(dependency) {
  return (dependency.dependencyTypes ?? []).some(
    (type) => type === 'type-only' || type === 'type-import',
  );
}

function isTestPath(path) {
  return (
    /(^|\/)(?:test|tests|__tests__)(\/|$)/.test(path) ||
    /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/.test(path)
  );
}

function normalizePath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function dedupeObjects(items) {
  return [
    ...new Map(items.map((item) => [`${item.sourcePath}\0${item.specifier}`, item])).values(),
  ].sort((a, b) => `${a.sourcePath}:${a.specifier}`.localeCompare(`${b.sourcePath}:${b.specifier}`));
}

function parseLogicalModelId(source, contextId) {
  const match = source.match(
    /model\s*\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(?:system|app|package|component|port|adapter|worker|store|external|contract|inventory)\b/,
  );
  if (!match?.[1]) throw new Error(`Cannot resolve logical model id from architecture/${contextId}.c4`);
  return match[1];
}

function renderLikeC4(importEdges) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Observed imports derived from Dependency Cruiser at ${baselineSha}`,
    'model {',
  ];
  for (const edge of importEdges) {
    const parts = [];
    if (edge.runtimeImports) parts.push(`${edge.runtimeImports} runtime`);
    if (edge.typeOnlyImports) parts.push(`${edge.typeOnlyImports} type-only`);
    if (edge.dynamicImports) parts.push(`${edge.dynamicImports} dynamic`);
    if (edge.testImports) parts.push(`${edge.testImports} test`);
    lines.push(
      `  ${edge.sourceModelId} .uses ${edge.targetModelId} '${esc(`observed imports: ${parts.join(', ')}`)}'`,
    );
  }
  lines.push('}', '', 'views {', '  view observedImportLandscape {');
  lines.push("    title 'DVT+ — Observed source import landscape'");
  lines.push(
    `    description 'SOURCE-DERIVED with Dependency Cruiser at main@${baselineSha.slice(0, 8)}. Edges aggregate observed cross-context imports and distinguish runtime, type-only, dynamic and test usage.'`,
  );
  for (const context of contexts) lines.push(`    include ${context.logicalModelId}`);
  lines.push('    autoLayout LeftRight', '  }', '}', '');
  return lines.join('\n');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
