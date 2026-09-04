import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const architectureDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contextsDir = join(architectureDir, 'contexts');
const generatedDir = join(architectureDir, 'generated');
const registry = JSON.parse(readFileSync(join(contextsDir, 'registry.json'), 'utf8'));
const summary = JSON.parse(
  readFileSync(join(generatedDir, 'component-classification-summary.json'), 'utf8'),
);
const baselineSha = process.env.DVT_ARCH_BASELINE_SHA || summary.baselineSha;

if (!baselineSha) throw new Error('DVT_ARCH_BASELINE_SHA is required');

const summaryByContext = new Map(summary.ranking.map((item) => [item.contextId, item]));
const contexts = (registry.contexts ?? []).map((contextId) => {
  const baseline = JSON.parse(
    readFileSync(join(contextsDir, `${contextId}-source-baseline.json`), 'utf8'),
  );
  const logical = readFileSync(join(architectureDir, `${contextId}.c4`), 'utf8');
  const boundaryViewId = firstViewId(logical, contextId);
  const stats = summaryByContext.get(contextId);
  if (!stats) throw new Error(`No classification summary for ${contextId}`);
  return {
    contextId,
    displayName: baseline.displayName ?? contextId,
    scope: baseline.scope,
    boundaryViewId,
    ...stats,
  };
});

const apps = contexts.filter((context) => context.scope.startsWith('apps/'));
const packages = contexts.filter((context) => context.scope.startsWith('packages/@dvt/'));
const unknown = contexts.filter(
  (context) => !context.scope.startsWith('apps/') && !context.scope.startsWith('packages/@dvt/'),
);
if (unknown.length) {
  throw new Error(`Home cannot classify scopes: ${unknown.map((item) => item.scope).join(', ')}`);
}

const out = [
  '// GENERATED FILE. DO NOT EDIT.',
  `// Architecture navigation index at ${baselineSha}`,
  'model {',
  "  architectureHome = inventory 'DVT+ source-first architecture' {",
  '    #sourceDerived',
  "    description 'Navigation index generated from the registered app/@dvt workspace surface. This is not a runtime/container boundary.'",
  '    metadata {',
  "      provenance 'SOURCE-DERIVED NAVIGATION'",
  `      baselineSha '${baselineSha}'`,
  `      contextCount '${contexts.length}'`,
  `      productionCoverage '${summary.totals.coveragePercent}'`,
  `      representedTrackedFiles '${summary.totals.productionSourceFiles}'`,
  '    }',
  "    global = component 'Global evidence views' {",
  '      #sourceDerived',
  "      description 'Independent projections of package declarations, observed imports, composition reachability and logical classification coverage.'",
  "      dependencies = component 'Workspace dependencies' {",
  '        #sourceDerived',
  "        description 'Edges derived from package.json workspace dependencies.'",
  '      }',
  "      imports = component 'Observed source imports' {",
  '        #sourceDerived',
  "        description 'Edges derived from Dependency Cruiser over the exact main SHA.'",
  '      }',
  "      composition = component 'Composition-root reachability' {",
  '        #sourceDerived',
  "        description 'Source-verified application roots plus transitive same-app reachability to registered bounded contexts.'",
  '      }',
  `      coverage = component 'Logical source coverage — ${summary.totals.coveragePercent}%' {`,
  '        #sourceDerived',
  `        description '${summary.totals.mappedProductionFiles}/${summary.totals.productionSourceFiles} production source files mapped; ${summary.totals.unmappedProductionFiles} unmapped; ${summary.totals.multiMappedProductionFiles} multi-mapped.'`,
  '      }',
  '    }',
  "    applications = component 'Applications / process hosts' {",
  '      #structureDerived',
  "      description 'Registered workspaces physically located under apps/.'",
];

for (const context of apps) emitContextCard(out, context, '      ');
out.push(
  '    }',
  "    workspaces = component '@dvt workspaces' {",
  '      #structureDerived',
  "      description 'Registered workspaces physically located under packages/@dvt/.'",
);
for (const context of packages) emitContextCard(out, context, '      ');
out.push('    }', '  }', '}', '', 'views {', '  view architectureHomeView of architectureHome {');
out.push("    title 'DVT+ — Source-first architecture home'");
out.push(
  `    description 'Navigation generated at main@${baselineSha.slice(0, 8)}. Workspace/file existence is source-derived; logical component coverage is declared-and-measured.'`,
);
out.push('    include global with { navigateTo globalEvidenceHome }');
out.push('    include applications');
out.push('    include workspaces');
for (const context of contexts) {
  const group = context.scope.startsWith('apps/') ? 'applications' : 'workspaces';
  out.push(`    include ${group}.${cardId(context.contextId)} with { navigateTo ${context.boundaryViewId} }`);
}
out.push('    autoLayout LeftRight', '  }', '', '  view globalEvidenceHome of architectureHome.global {');
out.push("    title 'DVT+ — Global architecture evidence'");
out.push('    include dependencies with { navigateTo workspaceDependencyLandscape }');
out.push('    include imports with { navigateTo observedImportLandscape }');
out.push('    include composition with { navigateTo compositionReachabilityLandscape }');
out.push('    include coverage with { navigateTo componentClassificationCoverage }');
out.push('    autoLayout LeftRight', '  }', '}', '');

writeFileSync(join(generatedDir, 'architecture-home.c4'), out.join('\n'));
writeFileSync(
  join(generatedDir, 'architecture-home.json'),
  JSON.stringify(
    {
      schemaVersion: 2,
      generatedFrom: 'context-registry+component-classification-summary',
      baselineSha,
      contexts,
      globalViews: [
        'workspaceDependencyLandscape',
        'observedImportLandscape',
        'compositionReachabilityLandscape',
        'componentClassificationCoverage',
      ],
      groups: {
        apps: apps.map((item) => item.contextId),
        packages: packages.map((item) => item.contextId),
      },
    },
    null,
    2,
  ) + '\n',
);
console.log(`Generated architecture home for ${contexts.length} contexts @ ${baselineSha.slice(0, 8)}.`);

function emitContextCard(lines, context, indent) {
  lines.push(`${indent}${cardId(context.contextId)} = component '${esc(`${context.displayName} — ${context.coveragePercent}%`)}' {`);
  lines.push(`${indent}  #sourceDerived`);
  lines.push(
    `${indent}  description '${esc(`${context.scope}; ${context.productionSourceFiles} production source files; ${context.unmappedProductionFiles} unmapped.`)}'`,
  );
  lines.push(`${indent}  metadata {`);
  lines.push(`${indent}    provenance 'SOURCE-DERIVED + ARCHITECTURE-DECLARED'`);
  lines.push(`${indent}    sourceRoot '${esc(context.scope)}'`);
  lines.push(`${indent}    baselineSha '${baselineSha}'`);
  lines.push(`${indent}    coveragePercent '${context.coveragePercent}'`);
  lines.push(`${indent}  }`);
  lines.push(`${indent}}`);
}

function firstViewId(source, contextId) {
  const match = source.match(/views\s*\{[\s\S]*?\bview\s+([A-Za-z_][A-Za-z0-9_-]*)\b/);
  if (!match?.[1]) throw new Error(`Cannot resolve boundary view from architecture/${contextId}.c4`);
  return match[1];
}

function cardId(contextId) {
  return `ctx_${contextId.replace(/[^A-Za-z0-9_-]+/g, '_')}`;
}

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}
