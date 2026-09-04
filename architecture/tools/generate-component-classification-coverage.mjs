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
    const classificationRole = component.classificationRole ?? 'owner';
    for (const path of component.files ?? []) {
      if (!productionSet.has(path)) continue;
      const fileClaims = claims.get(path) ?? [];
      fileClaims.push({ componentId: component.id, classificationRole });
      claims.set(path, fileClaims);
    }
  }

  const mappedProductionFiles = productionSourceFiles.filter((path) => claims.has(path));
  const unmappedProductionFiles = productionSourceFiles.filter((path) => !claims.has(path));
  const ownershipConflicts = [...claims.entries()]
    .map(([path, fileClaims]) => ({
      path,
      owners: fileClaims.filter((claim) => claim.classificationRole !== 'aggregate'),
      aggregates: fileClaims.filter((claim) => claim.classificationRole === 'aggregate'),
    }))
    .filter((item) => item.owners.length > 1)
    .map((item) => ({
      path: item.path,
      components: item.owners.map((claim) => claim.componentId).sort(),
      aggregateViews: item.aggregates.map((claim) => claim.componentId).sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const aggregateOverlaps = [...claims.entries()]
    .map(([path, fileClaims]) => ({
      path,
      owners: fileClaims.filter((claim) => claim.classificationRole !== 'aggregate'),
      aggregates: fileClaims.filter((claim) => claim.classificationRole === 'aggregate'),
    }))
    .filter((item) => item.aggregates.length > 0 && item.owners.length > 0)
    .map((item) => ({
      path: item.path,
      owners: item.owners.map((claim) => claim.componentId).sort(),
      aggregateViews: item.aggregates.map((claim) => claim.componentId).sort(),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const componentCoverage = (inventory.componentMappings ?? []).map((component) => ({
    id: component.id,
    title: component.title,
    classificationRole: component.classificationRole ?? 'owner',
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
    logicalModelId: inventory.logicalModelId,
    sourceModelId: inventory.sourceModelId,
    scope: baseline.scope,
    productionSourceFileCount: productionCount,
    mappedProductionFileCount: mappedCount,
    unmappedProductionFileCount: unmappedProductionFiles.length,
    ownershipConflictFileCount: ownershipConflicts.length,
    aggregateOverlapFileCount: aggregateOverlaps.length,
    multiMappedProductionFileCount: ownershipConflicts.length,
    coveragePercent,
    mappedProductionFiles,
    unmappedProductionFiles,
    ownershipConflicts,
    aggregateOverlaps,
    multiMappedFiles: ownershipConflicts,
    components: componentCoverage,
  };
});

const totals = contexts.reduce(
  (acc, context) => {
    acc.productionSourceFiles += context.productionSourceFileCount;
    acc.mappedProductionFiles += context.mappedProductionFileCount;
    acc.unmappedProductionFiles += context.unmappedProductionFileCount;
    acc.ownershipConflictFiles += context.ownershipConflictFileCount;
    acc.aggregateOverlapFiles += context.aggregateOverlapFileCount;
    return acc;
  },
  {
    productionSourceFiles: 0,
    mappedProductionFiles: 0,
    unmappedProductionFiles: 0,
    ownershipConflictFiles: 0,
    aggregateOverlapFiles: 0,
  },
);
totals.multiMappedProductionFiles = totals.ownershipConflictFiles;
totals.coveragePercent =
  totals.productionSourceFiles === 0
    ? 100
    : Number(((totals.mappedProductionFiles / totals.productionSourceFiles) * 100).toFixed(1));

const evidenceBase = {
  schemaVersion: 3,
  generatedFrom: 'source-inventory+architecture-declared-component-mappings',
  baselineSha,
  contextCount: contexts.length,
  semantics: {
    owner: 'Claims logical ownership/classification of a production source file.',
    aggregate: 'Provides a parent/overview evidence view and is not counted as a competing owner.',
    ownershipConflict: 'More than one non-aggregate component claims the same production source file.',
  },
  totals,
  contexts,
};
const canonical = JSON.stringify(evidenceBase, null, 2) + '\n';
const evidence = {
  ...evidenceBase,
  evidenceSha256: createHash('sha256').update(canonical).digest('hex'),
};

const ranking = [...contexts]
  .map((context) => ({
    contextId: context.contextId,
    displayName: context.displayName,
    scope: context.scope,
    productionSourceFiles: context.productionSourceFileCount,
    mappedProductionFiles: context.mappedProductionFileCount,
    unmappedProductionFiles: context.unmappedProductionFileCount,
    ownershipConflictFiles: context.ownershipConflictFileCount,
    aggregateOverlapFiles: context.aggregateOverlapFileCount,
    multiMappedProductionFiles: context.ownershipConflictFileCount,
    coveragePercent: context.coveragePercent,
  }))
  .sort(
    (a, b) =>
      b.unmappedProductionFiles - a.unmappedProductionFiles ||
      a.coveragePercent - b.coveragePercent ||
      b.ownershipConflictFiles - a.ownershipConflictFiles ||
      a.contextId.localeCompare(b.contextId),
  );
const summaryBase = {
  schemaVersion: 2,
  generatedFrom: 'component-classification-coverage',
  baselineSha,
  totals,
  ranking,
};
const summaryCanonical = JSON.stringify(summaryBase, null, 2) + '\n';
const summary = {
  ...summaryBase,
  evidenceSha256: createHash('sha256').update(summaryCanonical).digest('hex'),
};

mkdirSync(generatedDir, { recursive: true });
writeFileSync(
  join(generatedDir, 'component-classification-coverage.json'),
  JSON.stringify(evidence, null, 2) + '\n',
);
writeFileSync(
  join(generatedDir, 'component-classification-summary.json'),
  JSON.stringify(summary, null, 2) + '\n',
);
writeFileSync(
  join(generatedDir, 'component-classification-coverage.c4'),
  renderLikeC4(contexts, totals),
);

console.log(
  `Logical classification coverage: ${totals.mappedProductionFiles}/${totals.productionSourceFiles} production source files (${totals.coveragePercent}%) across ${contexts.length} contexts; ${totals.ownershipConflictFiles} ownership conflict(s), ${totals.aggregateOverlapFiles} intentional aggregate overlap(s).`,
);
console.log(
  `Top classification gaps: ${ranking
    .filter((item) => item.unmappedProductionFiles > 0)
    .slice(0, 8)
    .map((item) => `${item.contextId}:${item.unmappedProductionFiles} (${item.coveragePercent}%)`)
    .join(', ') || 'none'}`,
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
    `    description 'Measures how much production source is assigned to ARCHITECTURE-DECLARED logical components. Overall ${total.mappedProductionFiles}/${total.productionSourceFiles} (${total.coveragePercent}%). Aggregate evidence views do not count as competing owners.'`,
  ];

  for (const context of contextsToRender) {
    const id = coverageElementId(context.contextId);
    lines.push(`    ${id} = component '${esc(`${context.displayName} — ${context.coveragePercent}%`)}' {`);
    lines.push('      #sourceDerived');
    lines.push(
      `      description '${esc(`${context.mappedProductionFileCount}/${context.productionSourceFileCount} production source files mapped; ${context.unmappedProductionFileCount} unmapped; ${context.ownershipConflictFileCount} ownership conflict(s); ${context.aggregateOverlapFileCount} aggregate overlap(s).`)}'`,
    );
    lines.push('      metadata {');
    lines.push(`        provenance 'SOURCE-DERIVED + ARCHITECTURE-DECLARED'`);
    lines.push(`        sourceRoot '${esc(context.scope)}'`);
    lines.push(`        baselineSha '${baselineSha}'`);
    lines.push(`        coveragePercent '${context.coveragePercent}'`);
    lines.push(`        mappedProductionFiles '${context.mappedProductionFileCount}'`);
    lines.push(`        unmappedProductionFiles '${context.unmappedProductionFileCount}'`);
    lines.push(`        ownershipConflictFiles '${context.ownershipConflictFileCount}'`);
    lines.push(`        aggregateOverlapFiles '${context.aggregateOverlapFileCount}'`);
    lines.push('      }');
    lines.push('    }');
  }
  lines.push('  }', '}', '', 'views {', '  view componentClassificationCoverage of classificationCoverage {');
  lines.push("    title 'DVT+ — Logical component source coverage'");
  lines.push(
    `    description 'Coverage of production source files by ARCHITECTURE-DECLARED component mappings at main@${baselineSha.slice(0, 8)}. Click a context with gaps to inspect its unmapped production files.'`,
  );
  for (const context of contextsToRender) {
    lines.push(`    include ${coverageElementId(context.contextId)} with {`);
    lines.push(
      `      navigateTo ${context.unmappedProductionFileCount ? unmappedViewId(context.contextId) : `${context.sourceModelId}Inventory`}`,
    );
    lines.push('    }');
  }
  lines.push('    autoLayout LeftRight', '  }', '');

  for (const context of contextsToRender) {
    if (!context.unmappedProductionFileCount) continue;
    lines.push(`  view ${unmappedViewId(context.contextId)} {`);
    lines.push(`    title 'Unmapped production source — ${esc(context.displayName)}'`);
    lines.push(
      `    description '${context.unmappedProductionFileCount} production source file(s) exist in Git but are not yet claimed by any ARCHITECTURE-DECLARED logical owner.'`,
    );
    for (const path of context.unmappedProductionFiles) {
      lines.push(`    include ${sourceFileFqn(context.sourceModelId, path)}`);
    }
    lines.push('    autoLayout TopBottom', '  }', '');
  }

  lines.push('}', '');
  return lines.join('\n');
}

function sourceFileFqn(sourceModelId, relativePath) {
  const parts = relativePath.split('/');
  parts.pop();
  let fqn = sourceModelId;
  let currentPath = '';
  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    fqn += `.${elementId('dir', currentPath)}`;
  }
  return `${fqn}.${elementId('file', relativePath)}`;
}

function elementId(prefix, value) {
  const stem = value
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^([^A-Za-z_])/, '_$1')
    .slice(-48);
  return `${prefix}_${stem || 'root'}_${createHash('sha1').update(value).digest('hex').slice(0, 8)}`;
}

function coverageElementId(contextId) {
  return `coverage_${safeId(contextId)}`;
}

function unmappedViewId(contextId) {
  return `unmappedProduction_${safeId(contextId)}`;
}

function safeId(value) {
  return value.replace(/[^A-Za-z0-9_-]+/g, '_');
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
