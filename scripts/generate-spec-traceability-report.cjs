#!/usr/bin/env node
/**
 * Owned concern: project exact feature traceability from Planning DB and Git.
 * Command/query rails: `GeneratePlanningDerivedSurfaces` and
 * `CheckFeatureMechanizationDiffSurface`.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { Client } = require('pg');

const { resolveGeneratedDate } = require('./generated-doc-date.cjs');
const {
  markdownCell,
  readArchitectureComponentDocumentRows,
  readGitTreePaths,
} = require('./generate-code-status.cjs');
const { defaultPgUrl } = require('./planning-db-run.cjs');
const {
  readDocumentationLifecycleRows,
  readFeatureMechanizationComponentRows,
  readFeatureMechanizationFeatureRows,
  readFeatureMechanizationRailRows,
  readFeatureMechanizationSymbolRows,
  readFeatureMechanizationValidationRows,
  readRepositoryCommandRows,
} = require('./planning-db-query.cjs');

const repoRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(repoRoot, '.generated-docs', 'planning', 'status');
const matrixOutputPath = path.join(generatedRoot, 'canonical-doc-code-matrix.md');
const summaryOutputPath = path.join(generatedRoot, 'generated-spec-traceability.md');
const limit = 100000;

function toPosix(value) {
  return String(value || '').replaceAll('\\', '/');
}

function normalizePath(value) {
  const repositoryPath = toPosix(value).trim();
  if (!repositoryPath) return '';
  const segments = repositoryPath.split('/');
  if (
    repositoryPath.startsWith('/') ||
    /^[A-Za-z]:\//u.test(repositoryPath) ||
    segments.includes('..')
  ) {
    throw new Error(`Unsafe repository path ${repositoryPath}.`);
  }
  return repositoryPath.replace(/^\.\//u, '').replace(/\/+$/u, '');
}

function field(row, snakeName, camelName = snakeName) {
  return row?.[snakeName] ?? row?.[camelName];
}

function featureIdOf(row) {
  return String(field(row, 'feature_id', 'featureId') ?? '').trim();
}

function uniqueSorted(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, 'en')
  );
}

function uniqueSortedSymbols(symbols) {
  const symbolsByIdentity = new Map();
  for (const symbol of symbols || []) {
    const symbolName = String(symbol?.symbolName || '').trim();
    const symbolPath = String(symbol?.symbolPath || '').trim();
    const identity = `${symbolPath}\u0000${symbolName}`;
    if (!symbolsByIdentity.has(identity)) {
      symbolsByIdentity.set(identity, { symbolName, symbolPath });
    }
  }
  return [...symbolsByIdentity.values()].sort(
    (left, right) =>
      left.symbolPath.localeCompare(right.symbolPath, 'en') ||
      left.symbolName.localeCompare(right.symbolName, 'en')
  );
}

function groupFeatureRelations(rows, featureIds, relationKind) {
  const grouped = new Map();
  for (const row of rows || []) {
    const featureId = featureIdOf(row);
    if (!featureIds.has(featureId)) {
      throw new Error(`Unknown Planning DB ${relationKind} feature ${featureId || '<empty>'}.`);
    }
    const group = grouped.get(featureId) || [];
    group.push(row);
    grouped.set(featureId, group);
  }
  return grouped;
}

function isTestPath(repositoryPath) {
  return /(^|\/)(test|tests|__tests__|cypress\/(?:e2e|component))(\/|$)|\.(test|spec|cy)\.[^/]+$/u.test(
    repositoryPath
  );
}

function stripLeadingEnvironmentAssignments(validationRef) {
  return String(validationRef || '')
    .trim()
    .replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=[^\s=;&|<>]+\s+)+/u, '');
}

function isExecutableValidation(validationRef) {
  return /^(node|npm|npx|pnpm|python|yarn)(?:\s|$)/u.test(
    stripLeadingEnvironmentAssignments(validationRef)
  );
}

function packageScriptFromValidation(validationRef) {
  const tokens = stripLeadingEnvironmentAssignments(validationRef).split(/\s+/u);
  const runner = tokens.shift();
  if (!['npm', 'pnpm', 'yarn'].includes(runner)) return null;
  const optionsWithValues = new Set(['--dir', '--filter', '--workspace-concurrency', '-C', '-F']);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === '--') return null;
    if (optionsWithValues.has(token)) {
      index += 1;
      continue;
    }
    if (token.startsWith('-')) continue;
    if (token === 'run') continue;
    if (['dlx', 'exec'].includes(token)) return null;
    return token;
  }
  return null;
}

function commandFileFromValidation(validationRef) {
  const tokens = stripLeadingEnvironmentAssignments(validationRef).split(/\s+/u);
  const runner = tokens.shift();
  if (!['node', 'python'].includes(runner)) return null;
  const commandPath = tokens.find((token) => !token.startsWith('-'));
  return commandPath ? toPosix(commandPath).replace(/^\.\//u, '') : null;
}

function isRegisteredVerificationCommand(validationRef, commands) {
  const commandSegments = String(validationRef || '')
    .trim()
    .split(/&&|\|\||[&|;]|\r?\n/u)
    .map((segment) => segment.trim());
  if (commandSegments.length === 0 || commandSegments.some((segment) => !segment)) return false;

  return commandSegments.every((segment) => {
    if (!isExecutableValidation(segment)) return false;
    const packageScript = packageScriptFromValidation(segment);
    const commandFile = commandFileFromValidation(segment);
    return (commands || []).some((command) => {
      const commandType = String(field(command, 'command_type', 'commandType') || '').trim();
      if (packageScript && commandType === 'package_script') {
        return String(field(command, 'command_name', 'commandName') || '').trim() === packageScript;
      }
      if (commandFile && commandType === 'command_file') {
        return (
          toPosix(field(command, 'command_path', 'commandPath') || '').replace(/^\.\//u, '') ===
          commandFile
        );
      }
      return false;
    });
  });
}

function isDocumentConflict(row) {
  const gapKind = String(field(row, 'lifecycle_gap_kind', 'lifecycleGapKind') || '').toLowerCase();
  const canonicalCounterpartCount = Number(
    field(row, 'canonical_counterpart_count', 'canonicalCounterpartCount') || 0
  );
  return gapKind === 'canonical_duplicate' || canonicalCounterpartCount > 1;
}

function isCurrentCanonicalDocument(row) {
  const canonicality = String(row?.canonicality || '').toLowerCase();
  const lifecycle = String(
    field(row, 'lifecycle_state', 'lifecycleState') || row?.status || ''
  ).toLowerCase();
  return (
    canonicality === 'canonical' &&
    !isDocumentConflict(row) &&
    ![
      'archive',
      'archived',
      'deprecated',
      'discarded',
      'disposable',
      'drift',
      'rejected',
      'retired',
      'superseded',
    ].includes(lifecycle)
  );
}

function repositoryBrowserUrl() {
  const repository = String(process.env.GITHUB_REPOSITORY || '').trim();
  return repository ? `https://github.com/${repository}` : 'https://github.com/dunay2/dvt';
}

function resolveFeatureTraceabilityGitInput(options = {}) {
  const gitSha = String(
    options.gitSha ||
      process.env.GIT_HEAD ||
      process.env.GITHUB_SHA ||
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: options.root || repoRoot,
        encoding: 'utf8',
      })
  ).trim();
  const readTree = options.readGitTreePaths || readGitTreePaths;
  return { gitSha, gitTreePaths: readTree({ gitSha }) };
}

function buildFeatureTraceabilityProjection(facts, options = {}) {
  const gitSha = String(options.gitSha || '').trim();
  if (!/^[0-9a-f]{40}$/u.test(gitSha)) {
    throw new Error(
      `Feature traceability requires an exact 40-character Git SHA, received ${gitSha || '<empty>'}.`
    );
  }
  const gitTreePaths = options.gitTreePaths || readGitTreePaths({ gitSha });
  const repositoryUrl = String(options.repositoryUrl || repositoryBrowserUrl()).replace(/\/$/u, '');
  const features = [...(facts.features || [])];
  const featureById = new Map();
  for (const feature of features) {
    const featureId = featureIdOf(feature);
    if (!featureId) throw new Error('Planning DB feature identity cannot be empty.');
    if (featureById.has(featureId)) {
      throw new Error(`Duplicate Planning DB feature identity ${featureId}.`);
    }
    featureById.set(featureId, feature);
  }
  const featureIds = new Set(featureById.keys());
  const componentRows = groupFeatureRelations(facts.components, featureIds, 'component');
  const symbolRows = groupFeatureRelations(facts.symbols, featureIds, 'symbol');
  const railRows = groupFeatureRelations(facts.rails, featureIds, 'rail');
  const validationRows = groupFeatureRelations(facts.validations, featureIds, 'validation');

  const lifecycleByPath = new Map();
  for (const row of facts.documents || []) {
    const documentPath = normalizePath(field(row, 'document_path', 'documentPath'));
    if (!documentPath) continue;
    const group = lifecycleByPath.get(documentPath) || [];
    group.push(row);
    lifecycleByPath.set(documentPath, group);
  }
  const componentIdsByDocument = new Map();
  for (const row of facts.componentDocuments || []) {
    const documentPath = normalizePath(field(row, 'document_path', 'documentPath'));
    const componentId = String(field(row, 'component_id', 'componentId') || '').trim();
    if (!documentPath || !componentId) continue;
    const group = componentIdsByDocument.get(documentPath) || [];
    group.push(componentId);
    componentIdsByDocument.set(documentPath, group);
  }

  const projectedFeatures = [...featureById]
    .sort(([left], [right]) => left.localeCompare(right, 'en'))
    .map(([featureId, feature]) => {
      const gaps = [];
      const guides = uniqueSorted(
        (componentRows.get(featureId) || []).map((row) =>
          normalizePath(field(row, 'component_ref', 'componentRef'))
        )
      );
      const documentPaths = [];
      const componentIds = [];
      for (const guidePath of guides) {
        const lifecycleRows = lifecycleByPath.get(guidePath) || [];
        if (lifecycleRows.length === 0) {
          gaps.push(`missing-document-lifecycle:${guidePath}`);
        } else if (lifecycleRows.some(isDocumentConflict)) {
          gaps.push(`conflicting-canonical-document:${guidePath}`);
        } else if (lifecycleRows.some(isCurrentCanonicalDocument)) {
          if (gitTreePaths.get(guidePath) === 'blob') {
            documentPaths.push(guidePath);
          } else {
            gaps.push(`missing-git-path:${guidePath}`);
          }
        } else {
          gaps.push(`missing-current-canonical-document:${guidePath}`);
        }

        const exactOwners = uniqueSorted(componentIdsByDocument.get(guidePath) || []);
        componentIds.push(...exactOwners);
        if (exactOwners.length > 1) {
          gaps.push(`conflicting-component-owner:${guidePath}`);
        }
      }
      if (documentPaths.length === 0) gaps.push(`missing-canonical-document:${featureId}`);
      if (componentIds.length === 0) gaps.push(`missing-component-owner:${featureId}`);

      const sourcePaths = [];
      const testPaths = [];
      const sourceSymbols = [];
      const testSymbols = [];
      for (const symbol of symbolRows.get(featureId) || []) {
        const symbolPath = normalizePath(field(symbol, 'symbol_path', 'symbolPath'));
        const symbolName = String(field(symbol, 'symbol_name', 'symbolName') || '<empty>').trim();
        if (!symbolPath) {
          gaps.push(`missing-symbol-path:${featureId}#${symbolName}`);
          continue;
        }
        if (gitTreePaths.get(symbolPath) !== 'blob') {
          gaps.push(`missing-git-path:${symbolPath}`);
          continue;
        }
        const exactSymbol = { symbolName, symbolPath };
        if (isTestPath(symbolPath)) {
          testPaths.push(symbolPath);
          testSymbols.push(exactSymbol);
        } else {
          sourcePaths.push(symbolPath);
          sourceSymbols.push(exactSymbol);
        }
      }
      if (sourcePaths.length === 0) gaps.push(`missing-source:${featureId}`);
      if (testPaths.length === 0) gaps.push(`missing-test:${featureId}`);

      const rails = uniqueSorted(
        (railRows.get(featureId) || []).map((row) => {
          const railType = String(field(row, 'rail_type', 'railType') || '<missing-type>');
          const railName = String(field(row, 'rail_name', 'railName') || '<missing-name>');
          const railStatus = String(field(row, 'rail_status', 'railStatus') || '<missing-status>');
          return `${railType}:${railName} (${railStatus})`;
        })
      );
      if (rails.length === 0) gaps.push(`missing-rail:${featureId}`);

      const validations = uniqueSorted(
        (validationRows.get(featureId) || []).map((row) => {
          const kind = String(field(row, 'validation_kind', 'validationKind') || '<missing-kind>');
          const ref = String(field(row, 'validation_ref', 'validationRef') || '').trim();
          return ref ? `${kind}: ${ref}` : '';
        })
      );
      if (validations.length === 0) gaps.push(`missing-validation:${featureId}`);
      const executableValidations = uniqueSorted(
        (validationRows.get(featureId) || [])
          .map((row) => String(field(row, 'validation_ref', 'validationRef') || '').trim())
          .filter(isExecutableValidation)
      );
      const verificationCommands = [];
      for (const command of executableValidations) {
        if (isRegisteredVerificationCommand(command, facts.commands)) {
          verificationCommands.push(command);
        } else {
          gaps.push(`unregistered-verification-command:${featureId}#${command}`);
        }
      }
      if (verificationCommands.length === 0) {
        gaps.push(`missing-verification-command:${featureId}`);
      }

      return {
        featureId,
        mechanizationStatus: String(
          field(feature, 'mechanization_status', 'mechanizationStatus') || '<missing>'
        ),
        componentIds: uniqueSorted(componentIds),
        documentPaths: uniqueSorted(documentPaths),
        sourcePaths: uniqueSorted(sourcePaths),
        testPaths: uniqueSorted(testPaths),
        sourceSymbols: uniqueSortedSymbols(sourceSymbols),
        testSymbols: uniqueSortedSymbols(testSymbols),
        rails,
        validations,
        verificationCommands,
        gaps: uniqueSorted(gaps),
      };
    });

  return {
    gitSha,
    repositoryUrl,
    repositoryCommandCount: (facts.commands || []).length,
    features: projectedFeatures,
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ];
}

function listCell(values, render = (value) => `\`${value}\``) {
  return values.length > 0 ? values.map(render).join('<br>') : '—';
}

function documentLink(documentPath) {
  const route = documentPath.replace(/^docs\//u, '');
  const target = path.posix.relative('planning/status', route);
  return `[\`${documentPath}\`](${target})`;
}

function repositoryLink(repositoryUrl, gitSha, repositoryPath, label = repositoryPath) {
  return `[\`${label}\`](${repositoryUrl}/blob/${gitSha}/${repositoryPath})`;
}

function generatedFrontmatter(title, generatedAt) {
  return [
    '---',
    `title: ${title}`,
    'status: Active',
    'owner: Architecture / Docs',
    `last_reviewed: ${generatedAt}`,
    'planning_type: status',
    '---',
  ];
}

function renderCanonicalDocCodeMatrix(projection, generatedAt) {
  const rows = projection.features.map((feature) => [
    `\`${feature.featureId}\``,
    feature.mechanizationStatus,
    listCell(feature.componentIds),
    listCell(feature.documentPaths, documentLink),
    listCell(feature.sourceSymbols, (symbol) =>
      repositoryLink(
        projection.repositoryUrl,
        projection.gitSha,
        symbol.symbolPath,
        `${symbol.symbolName} @ ${symbol.symbolPath}`
      )
    ),
    listCell(feature.testSymbols, (symbol) =>
      repositoryLink(
        projection.repositoryUrl,
        projection.gitSha,
        symbol.symbolPath,
        `${symbol.symbolName} @ ${symbol.symbolPath}`
      )
    ),
    listCell(feature.rails),
    listCell(feature.verificationCommands),
    listCell(feature.validations),
    listCell(feature.gaps),
  ]);
  return `${[
    ...generatedFrontmatter('Canonical Doc Code Matrix', generatedAt),
    '',
    '# Canonical Doc Code Matrix',
    '',
    `Exact feature traceability projected from Planning DB and Git commit \`${projection.gitSha}\`.`,
    '',
    'This route uses feature-mechanization IDs as subjects. It does not infer ownership, tests, commands, rails, or documentation from vocabulary similarity.',
    '',
    ...markdownTable(
      [
        'Feature',
        'State',
        'Components',
        'Canonical documents',
        'Source symbols',
        'Test symbols',
        'Rails',
        'Verification commands',
        'Validations',
        'Explicit gaps',
      ],
      rows
    ),
    '',
    '[Glossary](../../concepts/glossary.md) · [Domain Language](../../concepts/domain-language.md)',
    '',
    '> This page is auto-generated on demand by `node scripts/generate-spec-traceability-report.cjs`. Do not edit manually.',
    '',
  ].join('\n')}\n`;
}

function renderSpecTraceabilitySummary(projection, generatedAt) {
  const allGaps = projection.features.flatMap((feature) =>
    feature.gaps.map((gap) => [feature.featureId, gap])
  );
  const statuses = uniqueSorted(projection.features.map((feature) => feature.mechanizationStatus));
  const statusRows = statuses.map((status) => [
    status,
    projection.features.filter((feature) => feature.mechanizationStatus === status).length,
  ]);
  return `${[
    ...generatedFrontmatter('Generated Spec Traceability', generatedAt),
    '',
    '# Generated Spec Traceability',
    '',
    `DB-first summary for the exact feature projection at Git commit \`${projection.gitSha}\`.`,
    '',
    '## Summary',
    '',
    ...markdownTable(
      ['Metric', 'Value'],
      [
        ['Features projected', projection.features.length],
        [
          'Features with explicit gaps',
          projection.features.filter((feature) => feature.gaps.length > 0).length,
        ],
        [
          'Registered source paths',
          new Set(projection.features.flatMap((feature) => feature.sourcePaths)).size,
        ],
        [
          'Registered test paths',
          new Set(projection.features.flatMap((feature) => feature.testPaths)).size,
        ],
        ['Registered rails', new Set(projection.features.flatMap((feature) => feature.rails)).size],
        [
          'Registered validations',
          projection.features.reduce((sum, feature) => sum + feature.validations.length, 0),
        ],
        ['Repository commands available', projection.repositoryCommandCount],
      ]
    ),
    '',
    '## Mechanization states',
    '',
    ...markdownTable(['State', 'Features'], statusRows),
    '',
    '## Explicit gaps',
    '',
    ...(allGaps.length > 0
      ? markdownTable(
          ['Feature', 'Gap'],
          allGaps.map(([featureId, gap]) => [`\`${featureId}\``, `\`${gap}\``])
        )
      : ['No exact traceability gaps detected.']),
    '',
    '[Full Canonical Doc Code Matrix](./canonical-doc-code-matrix.md) · [Glossary](../../concepts/glossary.md) · [Domain Language](../../concepts/domain-language.md)',
    '',
    '> This page is auto-generated on demand by `node scripts/generate-spec-traceability-report.cjs`. Do not edit manually.',
    '',
  ].join('\n')}\n`;
}

async function readFeatureTraceabilityFacts(client, readers = {}) {
  const readFeatures =
    readers.readFeatureMechanizationFeatureRows || readFeatureMechanizationFeatureRows;
  const readComponents =
    readers.readFeatureMechanizationComponentRows || readFeatureMechanizationComponentRows;
  const readSymbols =
    readers.readFeatureMechanizationSymbolRows || readFeatureMechanizationSymbolRows;
  const readRails = readers.readFeatureMechanizationRailRows || readFeatureMechanizationRailRows;
  const readValidations =
    readers.readFeatureMechanizationValidationRows || readFeatureMechanizationValidationRows;
  const readDocuments = readers.readDocumentationLifecycleRows || readDocumentationLifecycleRows;
  const readComponentDocuments =
    readers.readArchitectureComponentDocumentRows || readArchitectureComponentDocumentRows;
  const readCommands = readers.readRepositoryCommandRows || readRepositoryCommandRows;
  const [
    features,
    components,
    symbols,
    rails,
    validations,
    documents,
    componentDocuments,
    commands,
  ] = await Promise.all([
    readFeatures(client, { limit }),
    readComponents(client, { limit }),
    readSymbols(client, { limit }),
    readRails(client, { limit }),
    readValidations(client, { limit }),
    readDocuments(client, { limit }),
    readComponentDocuments(client),
    readCommands(client, { limit }),
  ]);
  return {
    features,
    components,
    symbols,
    rails,
    validations,
    documents,
    componentDocuments,
    commands,
  };
}

function writeIfChanged(outputPath, content) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : null;
  if (current === content) return false;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, 'utf8');
  return true;
}

async function main(dependencies = {}) {
  const ClientCtor = dependencies.ClientCtor || Client;
  const client = new ClientCtor({
    connectionString: process.env.DVT_PLANNING_DB_URL || process.env.DATABASE_URL || defaultPgUrl,
  });
  await client.connect();
  try {
    const facts = await readFeatureTraceabilityFacts(client, dependencies.readers);
    const { gitSha, gitTreePaths } = resolveFeatureTraceabilityGitInput({
      gitSha: dependencies.gitSha,
      readGitTreePaths: dependencies.readGitTreePaths,
    });
    const projection = buildFeatureTraceabilityProjection(facts, {
      gitSha,
      gitTreePaths,
      repositoryUrl: dependencies.repositoryUrl,
    });
    const generatedAt = resolveGeneratedDate(matrixOutputPath, (date) =>
      renderCanonicalDocCodeMatrix(projection, date)
    );
    const matrixChanged = writeIfChanged(
      matrixOutputPath,
      renderCanonicalDocCodeMatrix(projection, generatedAt)
    );
    const summaryChanged = writeIfChanged(
      summaryOutputPath,
      renderSpecTraceabilitySummary(projection, generatedAt)
    );
    console.log(
      `[docs:traceability:generate] matrix=${matrixChanged ? 'updated' : 'current'} summary=${summaryChanged ? 'updated' : 'current'}`
    );
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

module.exports = {
  buildFeatureTraceabilityProjection,
  isCurrentCanonicalDocument,
  isExecutableValidation,
  isRegisteredVerificationCommand,
  isTestPath,
  main,
  readFeatureTraceabilityFacts,
  renderCanonicalDocCodeMatrix,
  renderSpecTraceabilitySummary,
  resolveFeatureTraceabilityGitInput,
};
