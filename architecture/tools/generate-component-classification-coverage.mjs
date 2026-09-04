import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const contextIds = registry.contexts ?? [];
const baselineSha = process.env.DVT_ARCH_BASELINE_SHA;

if (!baselineSha) throw new Error('DVT_ARCH_BASELINE_SHA is required');
if (!Array.isArray(contextIds) || !contextIds.length) throw new Error('Context registry is empty');

const contexts = contextIds.map((contextId) => {
  const inventory = JSON.parse(
    readFileSync(join(generatedDir, `${contextId}-inventory.json`), 'utf8'),
  );
  const baseline = JSON.parse(
    readFileSync(join(contextsDir, `${contextId}-source-baseline.json`), 'utf8'),
  );

  const productionSourceFiles = inventory.files
    .map((file) => file.relativePath)
    .filter(isProductionSourcePath)
    .sort();
  const productionSet = new Set(productionSourceFiles);
  const claims = new Map();

  for (const component of inventory.componentMappings ?? []) {
    for (const path of component.files ?? []) {
      if (!productionSet.has(path)) continue;
      const owners = claims.get(path) ?? [];
      owners.push(component.id);
      claims.set(path, owners);
    }
  }

  const mappedProductionFiles = productionSourceFiles.filter((path) => claims.has(path));
  const unmappedProductionFiles = productionSourceFiles.filter((path) => !claims.has(path));
  const multiMappedFiles = [...claims.entries()]
    .filter(([, owners]) => owners.length > 1)
    .map(([path, owners]) => ({ path, components: [...owners].sort() }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const componentCoverage = (inventory.componentMappings ?? []).map((component) => ({
    id: component.id,
    title: component.title,
    productionFiles: (component.files ?? []).filter((path) => productionSet.has(path)).sort(),
    productionFileCount: (component.files ?? []).filter((path) => productionSet.has(path)).length,
    evidenceFileCount: component.fileCount ?? (component.files ?? []).length,
  }));
  const mappedCount = mappedProductionFiles.length;
  const productionCount = productionSourceFiles.length;
  const coveragePercent = productionCount === 0 ? 100 : Number(((mappedCount / productionCount) * 100).toFixed(1));

  return {
    contextId,
    displayName: baseline.displayName ?? contextId,
    modelId: baseline.modelId,
    scope: baseline.scope,
    productionSourceFileCount: productionCount,
    mappedProductionFileCount: mappedCount,
    unmappedProductionFileCount: unmappedProductionFiles.length,
    multiMappedProductionFileCount: multiMappedFiles.length,
    coveragePercent,
    mappedProductionFiles,
    unmappedProductionFiles,
    multiMappedFiles,
    components: componentCoverage,
  };
});

const totals = contexts.reduce(
  (acc, context) => {
    acc.productionSourceFiles += context.productionSourceFileCount;
    acc.mappedProductionFiles += context.mappedProductionFileCount;
    acc.unmappedProductionFiles += context.unmappedProductionFileCount;
    acc.multiMappedProductionFiles += context.multiMappedProductionFileCount;
    return acc;
  },
  {
    productionSourceFiles: 0,
    mappedProductionFiles: 0,
    unmappedProductionFiles: 0,
    multiMappedProductionFiles: 0,
  },
);
totals.coveragePercent =
  totals.productionSourceFiles === 0
    ? 100
    : Number(((totals.mappedProductionFiles / totals.productionSourceFiles) * 100).toFixed(1));

const evidenceBase = {
  schemaVersion: 1,
  generatedFrom: 'source-inventory+architecture-declared-component-mappings',
  baselineSha,
  contextCount: contexts.length,
  totals,
  contexts,
};
const canonical = JSON.stringify(evidenceBase, null, 2) + '\n';
const evidence = {
  ...evidenceBase,
  evidenceSha256: createHash('sha256').update(canonical).digest('hex'),
};

mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  join(generatedDir, 'component-classification-coverage.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);
writeFileSync(
  join(generatedDir, 'component-classification-coverage.c4'),
  renderLikeC4(contexts, totals),
);

console.log(
  `Logical classification coverage: ${totals.mappedProductionFiles}/${totals.productionSourceFiles} production source files (${totals.coveragePercent}%) across ${contexts.length} contexts; ${totals.multiMappedProductionFiles} multi-mapped.`,
);

function isProductionSourcePath(path) {
  return path.startsWith('src/') && !isTestPath(path);
}

function isTestPath(path) {
  return (
    /(^|\/)(?:test|tests|__tests__)(\/|$)/.test(path) ||
    /\.(?:test|spec|cy)\.[cm]?[jt]sx?$/.test(path)
  );
}

function renderLikeC4(contextsToRender, total) {
  const lines = [
    '// GENERATED FILE. DO NOT EDIT.',
    `// Logical classification coverage at ${baselineSha}`,
    'model {',
    "  classificationCoverage = system 'Architecture source classification coverage' {",
    "    #sourceDerived",
    `    description 'Measures how much production source is assigned to ARCHITECTURE-DECLARED logical components. Overall ${total.mappedProductionFiles}/${total.productionSourceFiles} (${total.coveragePercent}%).'`,
  ];

  for (const context of contextsToRender) {
    const id = coverageElementId(context.contextId);
    lines.push(`    ${id} = component '${esc(`${context.displayName} — ${context.coveragePercent}%`)}' {`);
    lines.push('      #sourceDerived');
    lines.push(
      `      description '${esc(`${context.mappedProductionFileCount}/${context.productionSourceFileCount} production source files mapped; ${context.unmappedProductionFileCount} unmapped; ${context.multiMappedProductionFileCount} multi-mapped.`)}'`,
    );
    lines.push('      metadata {');
    lines.push(`        provenance 'SOURCE-DERIVED + ARCHITECTURE-DECLARED'`);
    lines.push(`        sourceRoot '${esc(context.scope)}'`);
    lines.push(`        baselineSha '${baselineSha}'`);
    lines.push(`        coveragePercent '${context.coveragePercent}'`);
    lines.push(`        mappedProductionFiles '${context.mappedProductionFileCount}'`);
    lines.push(`        unmappedProductionFiles '${context.unmappedProductionFileCount}'`);
    lines.push('      }');
    lines.push('    }');
  }
  lines.push('  }', '}', '', 'views {', '  view componentClassificationCoverage of classificationCoverage {');
  lines.push("    title 'DVT+ — Logical component source coverage'");
  lines.push(
    `    description 'Coverage of production source files by ARCHITECTURE-DECLARED component mappings at main@${baselineSha.slice(0, 8)}. Low coverage is visible evidence, not silently filled in.'`,
  );
  for (const context of contextsToRender) {
    lines.push(`    include ${coverageElementId(context.contextId)} with {`);
    lines.push(`      navigateTo ${context.modelId}Inventory`);
    lines.push('    }');
  }
  lines.push('    autoLayout LeftRight', '  }', '}', '');
  return lines.join('\n');
}

function coverageElementId(contextId) {
  return `coverage_${contextId.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
