import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cruisePath = process.argv[2];
const baselineSha = process.argv[3] || process.env.DVT_ARCH_BASELINE_SHA;
if (!cruisePath || !baselineSha) {
  throw new Error('Usage: node generate-composition-reachability.mjs <dependency-cruise.json> <baseline-sha>');
}

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const repoRoot = dirname(architectureDir);
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const rootsManifest = JSON.parse(readFileSync(join(architectureDir, 'composition-roots.json'), 'utf8'));
const report = JSON.parse(readFileSync(join(repoRoot, cruisePath), 'utf8'));

const contexts = (registry.contexts ?? []).map((contextId) => {
  const baseline = JSON.parse(
    readFileSync(join(contextsDir, `${contextId}-source-baseline.json`), 'utf8'),
  );
  const logical = readFileSync(join(architectureDir, `${contextId}.c4`), 'utf8');
  return {
    contextId,
    scope: baseline.scope,
    displayName: baseline.displayName ?? contextId,
    logicalModelId: parseLogicalModelId(logical, contextId),
  };
});
const contextById = new Map(contexts.map((context) => [context.contextId, context]));
const contextsByScope = [...contexts].sort((a, b) => b.scope.length - a.scope.length);
const moduleByPath = new Map(
  (report.modules ?? []).map((module) => [normalizePath(module.source), module]),
);

const roots = (rootsManifest.roots ?? []).map((declaredRoot) => {
  const context = contextById.get(declaredRoot.contextId);
  if (!context) throw new Error(`Composition root ${declaredRoot.id} references unregistered context ${declaredRoot.contextId}`);
  const rootPath = normalizePath(declaredRoot.path);
  if (!rootPath.startsWith(`${context.scope}/`)) {
    throw new Error(`Composition root ${declaredRoot.id} is outside ${context.scope}: ${rootPath}`);
  }
  if (!moduleByPath.has(rootPath)) {
    throw new Error(`Composition root ${declaredRoot.id} is not present in Dependency Cruiser output: ${rootPath}`);
  }
  return deriveRootReachability({ ...declaredRoot, path: rootPath, context });
});

const evidenceBase = {
  schemaVersion: 1,
  generatedFrom: 'declared-composition-roots+dependency-cruiser-reachability',
  baselineSha,
  rootCount: roots.length,
  roots,
};
const canonical = JSON.stringify(evidenceBase, null, 2) + '\n';
const evidence = {
  ...evidenceBase,
  evidenceSha256: createHash('sha256').update(canonical).digest('hex'),
};
writeFileSync(join(generatedDir, 'composition-reachability.json'), JSON.stringify(evidence, null, 2) + '\n');
writeFileSync(join(generatedDir, 'composition-reachability.c4'), renderLikeC4(roots));

console.log(
  `Composition reachability: ${roots.length} roots, ${roots.reduce((sum, root) => sum + root.reachableContexts.length, 0)} root→context edges @ ${baselineSha.slice(0, 8)}.`,
);
for (const root of roots) {
  console.log(
    `  ${root.id}: ${root.reachableContexts.map((item) => item.contextId).join(', ') || 'no registered cross-context reachability'}`,
  );
}

function deriveRootReachability(root) {
  const queue = [{ path: root.path, witness: [root.path] }];
  const visited = new Set();
  const reached = new Map();

  while (queue.length) {
    const current = queue.shift();
    if (!current || visited.has(current.path)) continue;
    visited.add(current.path);
    const module = moduleByPath.get(current.path);
    if (!module) continue;

    for (const dependency of module.dependencies ?? []) {
      const resolvedPath = normalizePath(dependency.resolved ?? '');
      const targetContext = contextForDependency(dependency, resolvedPath);
      const witnessTarget = resolvedPath || dependency.module || '(unresolved)';
      const witness = [...current.witness, witnessTarget];

      if (targetContext && targetContext.contextId !== root.context.contextId) {
        const existing = reached.get(targetContext.contextId);
        if (!existing || witness.length < existing.witness.length) {
          reached.set(targetContext.contextId, {
            contextId: targetContext.contextId,
            displayName: targetContext.displayName,
            logicalModelId: targetContext.logicalModelId,
            firstSpecifier: dependency.module ?? null,
            dynamic: dependency.dynamic === true,
            typeOnly: isTypeOnlyDependency(dependency),
            witness,
            internalHops: Math.max(0, witness.length - 2),
          });
        }
        continue;
      }

      if (
        resolvedPath &&
        targetContext?.contextId === root.context.contextId &&
        !visited.has(resolvedPath)
      ) {
        queue.push({ path: resolvedPath, witness });
      }
    }
  }

  return {
    id: root.id,
    contextId: root.context.contextId,
    sourceModelId: root.context.logicalModelId,
    sourceDisplayName: root.context.displayName,
    path: root.path,
    title: root.title,
    rationale: root.rationale ?? null,
    reachableContexts: [...reached.values()].sort((a, b) => a.contextId.localeCompare(b.contextId)),
  };
}

function contextForDependency(dependency, resolvedPath) {
  const specifier = dependency.module;
  if (typeof specifier === 'string' && specifier.startsWith('@dvt/')) {
    const packageSegment = specifier.split('/').slice(0, 2).join('/');
    const byPackageScope = contexts.find((context) => context.scope.endsWith(`/${packageSegment.split('/')[1]}`));
    if (byPackageScope) return byPackageScope;
  }
  return contextForPath(resolvedPath);
}

function contextForPath(path) {
  if (!path) return null;
  return contextsByScope.find((context) => path === context.scope || path.startsWith(`${context.scope}/`)) ?? null;
}

function isTypeOnlyDependency(dependency) {
  return (dependency.dependencyTypes ?? []).some(
    (type) => type === 'type-only' || type === 'type-import',
  );
}

function parseLogicalModelId(source, contextId) {
  const match = source.match(
    /model\s*\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(?:system|app|package|component|port|adapter|worker|store|external|contract|inventory)\b/,
  );
  if (!match?.[1]) throw new Error(`Cannot resolve logical model id from architecture/${contextId}.c4`);
  return match[1];
}

function normalizePath(value) {
  return String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '');
}

function renderLikeC4(derivedRoots) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Composition-root reachability derived at ${baselineSha}`,
    'model {',
    "  compositionEvidence = inventory 'Composition-root reachability' {",
    '    #sourceDerived',
    "    description 'Declared executable composition roots with cross-context reachability derived from the pinned source dependency graph. Reachable does not imply every imported symbol is instantiated.'",
  ];

  for (const root of derivedRoots) {
    const rootId = rootElementId(root.id);
    lines.push(`    ${rootId} = file '${esc(root.title)}' {`);
    lines.push('      #sourceDerived');
    lines.push(`      description '${esc(root.rationale ?? 'Source-verified composition root.')}'`);
    lines.push('      metadata {');
    lines.push("        provenance 'SOURCE-VERIFIED ROOT + DEPENDENCY-CRUISER REACHABILITY'");
    lines.push(`        sourcePath '${esc(root.path)}'`);
    lines.push(`        baselineSha '${baselineSha}'`);
    lines.push(`        reachableContexts '${root.reachableContexts.length}'`);
    lines.push('      }');
    lines.push(`      link https://github.com/dunay2/dvt/blob/${baselineSha}/${urlPath(root.path)} 'Pinned composition root'`);
    lines.push('    }');
  }
  lines.push('  }');

  for (const root of derivedRoots) {
    for (const target of root.reachableContexts) {
      const kind = target.internalHops === 0 ? 'direct' : `via ${target.internalHops} app-internal hop${target.internalHops === 1 ? '' : 's'}`;
      const qualifiers = [kind];
      if (target.typeOnly) qualifiers.push('type-only first crossing');
      if (target.dynamic) qualifiers.push('dynamic first crossing');
      lines.push(
        `  compositionEvidence.${rootElementId(root.id)} .uses ${target.logicalModelId} '${esc(`composition-reachable: ${qualifiers.join(', ')}`)}'`,
      );
    }
  }

  lines.push('}', '', 'views {', '  view compositionReachabilityLandscape {');
  lines.push("    title 'DVT+ — Composition-root reachability'");
  lines.push(
    `    description 'Source-verified roots + Dependency Cruiser reachability at main@${baselineSha.slice(0, 8)}. This view is stronger than package declarations but intentionally does not equate reachability with runtime instantiation.'`,
  );
  for (const root of derivedRoots) {
    lines.push(`    include compositionEvidence.${rootElementId(root.id)}`);
    for (const target of root.reachableContexts) lines.push(`    include ${target.logicalModelId}`);
  }
  lines.push('    autoLayout LeftRight', '  }', '}', '');
  return lines.join('\n');
}

function rootElementId(value) {
  return `root_${value.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function urlPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
