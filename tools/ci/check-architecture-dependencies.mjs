/**
 * @file tools/ci/check-architecture-dependencies.mjs
 * @ownedConcern Repository architecture dependency and semantic ownership guard.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cruise } from 'dependency-cruiser';

import { listChangedFilesBetween } from './git-diff-files.mjs';

export const ARCHITECTURE_DEPENDENCY_TARGETS = ['apps', 'packages'];
export const ADAPTER_CANONICAL_CONTRACT_RULE_NAME = 'no-adapters-own-canonical-contracts';
export const ADAPTER_SOURCE_FILE_PATTERN = /\.(?:cjs|js|mjs|ts|tsx)$/;
export const SKIPPED_DIRECTORY_NAMES = new Set([
  '.generated-docs',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);
export const VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN =
  /^packages\/@dvt\/adapter-[^/]+\/src\/.*\.v\d+\.(?:cjs|js|mjs|ts|tsx)$/;
export const ADAPTER_CONTRACT_FOLDER_PATTERN =
  /^packages\/@dvt\/adapter-[^/]+\/src\/contracts(?:\/|$)/;
export const VERSIONED_CANONICAL_EXPORT_PATTERN =
  /^\s*export\s+(?:interface|type|const|class|enum)\s+\w+(?:Contract|Schema|Dto|DTO|Envelope)V\d+\b/m;
export const API_PRODUCTION_ROOTS = ['apps/api/src/app.ts', 'apps/api/src/server.ts'];
export const API_REACHABILITY_CLASSIFICATIONS = Object.freeze({
  production: 'production',
  conditionalProduction: 'conditional-production',
  validNullObject: 'valid-null-object',
  testSupport: 'test-support-misplaced',
  orphan: 'orphan',
});
export const REQUIRED_API_DEPLOYMENT_PROFILES = Object.freeze([
  'observability-noop',
  'observability-otel',
  'oidc-protected-runtime',
  'oidc-public-only',
  'postgres-protected-storage',
  'reconciler-disabled',
  'reconciler-enabled',
  'temporal-provider',
]);

const localRequire = createRequire(import.meta.url);
const ts = localRequire('typescript');
const API_SOURCE_FILE_PATTERN = /^apps\/api\/src\/.*\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;
const API_TEST_FILE_PATTERN = /^apps\/api\/test\/.*\.(?:cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;

export function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

export function readArchitectureDependencyConfig(baseDir = process.cwd()) {
  return localRequire(resolve(baseDir, '.dependency-cruiser.cjs'));
}

export function listFilesRecursive(rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  return readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) {
      return [];
    }

    const absolutePath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      return listFilesRecursive(absolutePath);
    }

    return entry.isFile() ? [absolutePath] : [];
  });
}

export function getAdapterCanonicalContractReason(relativePath, contents) {
  if (ADAPTER_CONTRACT_FOLDER_PATTERN.test(relativePath)) {
    return 'adapter source owns a contracts folder';
  }

  if (VERSIONED_CANONICAL_CONTRACT_FILE_PATTERN.test(relativePath)) {
    return 'adapter source owns a versioned canonical contract file';
  }

  if (VERSIONED_CANONICAL_EXPORT_PATTERN.test(contents)) {
    return 'adapter source exports a versioned canonical contract symbol';
  }

  return null;
}

export function collectAdapterCanonicalContractFindings(baseDir = process.cwd()) {
  const adapterRoot = join(baseDir, 'packages', '@dvt');

  return listFilesRecursive(adapterRoot)
    .map((absolutePath) => ({
      absolutePath,
      relativePath: normalizePath(relative(baseDir, absolutePath)),
    }))
    .filter(({ relativePath }) => /^packages\/@dvt\/adapter-[^/]+\/src\//.test(relativePath))
    .filter(({ relativePath }) => ADAPTER_SOURCE_FILE_PATTERN.test(relativePath))
    .flatMap(({ absolutePath, relativePath }) => {
      const reason = getAdapterCanonicalContractReason(
        relativePath,
        readFileSync(absolutePath, 'utf8')
      );

      return reason === null
        ? []
        : [
            {
              ruleName: ADAPTER_CANONICAL_CONTRACT_RULE_NAME,
              filePath: relativePath,
              reason,
            },
          ];
    });
}

function parseCruiseOutput(output) {
  return typeof output === 'string' ? JSON.parse(output) : output;
}

function normalizeCruiseModules(modules) {
  return (modules ?? [])
    .map((module) => ({
      ...module,
      source: normalizePath(module.source),
      dependencies: (module.dependencies ?? []).map((dependency) => ({
        ...dependency,
        resolved: dependency.resolved ? normalizePath(dependency.resolved) : dependency.resolved,
      })),
    }))
    .sort((left, right) => left.source.localeCompare(right.source));
}

function traverseReachability(moduleMap, roots) {
  const staticReachable = new Set();
  const conditionalReachable = new Set();
  const visitedStates = new Set();
  const queue = roots.map((source) => ({ source: normalizePath(source), conditional: false }));

  while (queue.length > 0) {
    const current = queue.shift();
    const stateKey = `${current.source}\0${current.conditional ? 'conditional' : 'static'}`;
    if (visitedStates.has(stateKey)) continue;
    visitedStates.add(stateKey);

    if (current.conditional) conditionalReachable.add(current.source);
    else staticReachable.add(current.source);

    for (const dependency of moduleMap.get(current.source)?.dependencies ?? []) {
      const target = dependency.resolved;
      if (!target?.startsWith('apps/api/')) continue;
      queue.push({
        source: target,
        conditional: current.conditional || dependency.dynamic === true,
      });
    }
  }

  return { staticReachable, conditionalReachable };
}

export function classifyApiSourceReachability({
  modules,
  sourceFiles,
  productionRoots = API_PRODUCTION_ROOTS,
  testRoots,
}) {
  const normalizedModules = normalizeCruiseModules(modules);
  const moduleMap = new Map(normalizedModules.map((module) => [module.source, module]));
  const normalizedSourceFiles = [...new Set(sourceFiles.map(normalizePath))].sort();
  const normalizedTestRoots = [...new Set((testRoots ?? []).map(normalizePath))].sort();
  const productionReachability = traverseReachability(moduleMap, productionRoots);
  const testReachability = traverseReachability(moduleMap, normalizedTestRoots);

  const classifications = normalizedSourceFiles.map((source) => {
    let classification = API_REACHABILITY_CLASSIFICATIONS.orphan;
    if (productionReachability.staticReachable.has(source)) {
      classification = API_REACHABILITY_CLASSIFICATIONS.production;
    } else if (productionReachability.conditionalReachable.has(source)) {
      classification = API_REACHABILITY_CLASSIFICATIONS.conditionalProduction;
    } else if (
      testReachability.staticReachable.has(source) ||
      testReachability.conditionalReachable.has(source)
    ) {
      classification = API_REACHABILITY_CLASSIFICATIONS.testSupport;
    }

    return { source, classification };
  });

  return {
    modules: normalizedModules,
    classifications,
    productionSources: new Set([
      ...productionReachability.staticReachable,
      ...productionReachability.conditionalReachable,
    ]),
    testSources: new Set([
      ...testReachability.staticReachable,
      ...testReachability.conditionalReachable,
    ]),
  };
}

function combinedProductionSource(productionSources, sourceContents) {
  return [...productionSources]
    .sort()
    .map((source) => sourceContents.get(source) ?? '')
    .join('\n');
}

function dynamicPackageImports(modules, productionSources, sourceContents = new Map()) {
  const graphImports = modules
    .filter((module) => productionSources.has(module.source))
    .flatMap((module) =>
      (module.dependencies ?? [])
        .filter((dependency) => dependency.dynamic === true)
        .map((dependency) => ({
          source: module.source,
          target: dependency.module,
        }))
    )
    .filter(({ target }) => typeof target === 'string');
  const syntaxImports = [];
  for (const source of [...productionSources].sort()) {
    const contents = sourceContents.get(source);
    if (!contents) continue;
    const parsed = sourceFileFor(source, contents);
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        syntaxImports.push({ source, target: node.arguments[0].text });
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }

  return [
    ...new Map(
      [...graphImports, ...syntaxImports].map((item) => [`${item.source}\0${item.target}`, item])
    ).values(),
  ].sort((left, right) =>
    `${left.target}\0${left.source}`.localeCompare(`${right.target}\0${right.source}`)
  );
}

export function collectApiDeploymentProfileEvidence({
  modules,
  productionSources,
  sourceContents,
}) {
  const source = combinedProductionSource(productionSources, sourceContents);
  const dynamicImports = dynamicPackageImports(modules, productionSources, sourceContents);
  const dynamicTargets = new Set(dynamicImports.map(({ target }) => target));
  const evidence = [];
  const add = (profile, classification, proof) => evidence.push({ profile, classification, proof });

  if (/OBS_ENABLED/u.test(source) && /createNoopObservability\s*\(/u.test(source)) {
    add(
      'observability-noop',
      API_REACHABILITY_CLASSIFICATIONS.validNullObject,
      'OBS_ENABLED=false selects createNoopObservability()'
    );
  }
  if (/OBS_ENABLED/u.test(source) && /new\s+OtelObservability\s*\(/u.test(source)) {
    add(
      'observability-otel',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'OBS_ENABLED=true selects OtelObservability'
    );
  }
  if (
    /OIDC_JWKS_URI/u.test(source) &&
    /OIDC_ISSUER/u.test(source) &&
    /OIDC_AUDIENCE/u.test(source) &&
    /buildProtectedRuntimeModule\s*\(/u.test(source)
  ) {
    add(
      'oidc-protected-runtime',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'complete OIDC configuration composes the protected runtime'
    );
    add(
      'oidc-public-only',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'incomplete OIDC configuration leaves protected runtime routes disabled'
    );
  }
  if (dynamicTargets.has('@dvt/adapter-postgres')) {
    add(
      'postgres-protected-storage',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'protected runtime dynamically loads @dvt/adapter-postgres'
    );
  }
  if (/DVT_INTENT_RECONCILER_ENABLED/u.test(source) && /return\s+null/u.test(source)) {
    add(
      'reconciler-disabled',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'disabled reconciler configuration returns no runtime handle'
    );
  }
  if (
    /DVT_INTENT_RECONCILER_ENABLED/u.test(source) &&
    /(?:createIntentReconcilerRuntimeComposition|new\s+IntentReconcilerWorker)\s*\(/u.test(source)
  ) {
    add(
      'reconciler-enabled',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'enabled reconciler configuration composes the worker runtime'
    );
  }
  if (dynamicTargets.has('@dvt/adapter-temporal') && /TEMPORAL_ADDRESS/u.test(source)) {
    add(
      'temporal-provider',
      API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
      'configured Temporal address dynamically loads @dvt/adapter-temporal'
    );
  }

  return evidence.sort((left, right) => left.profile.localeCompare(right.profile));
}

function sourceFileFor(source, contents) {
  return ts.createSourceFile(source, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function exportedNames(sourceFile) {
  const names = [];
  for (const statement of sourceFile.statements) {
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      hasExportModifier(statement) &&
      statement.name
    ) {
      names.push(statement.name.text);
    } else if (ts.isVariableStatement(statement) && hasExportModifier(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    } else if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          names.push((element.propertyName ?? element.name).text);
        }
      }
    }
  }
  return [...new Set(names)].sort();
}

function countIdentifier(sourceFile, name) {
  let count = 0;
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === name) count += 1;
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return count;
}

function importedNamesByTarget(module, sourceFile) {
  const dependenciesBySpecifier = new Map(
    (module?.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
  );
  const imports = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const target = dependenciesBySpecifier.get(statement.moduleSpecifier.text);
      if (!target) continue;
      if (!statement.exportClause) imports.push({ target, symbol: '*' });
      else if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          imports.push({ target, symbol: (element.propertyName ?? element.name).text });
        }
      }
      continue;
    }
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const target = dependenciesBySpecifier.get(statement.moduleSpecifier.text);
    if (!target || !statement.importClause) continue;

    if (statement.importClause.name) imports.push({ target, symbol: 'default' });
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) imports.push({ target, symbol: '*' });
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        imports.push({ target, symbol: (element.propertyName ?? element.name).text });
      }
    }
  }
  return imports;
}

export function collectApiExportReachabilityEvidence({
  modules,
  productionSources,
  testSources = new Set(),
  sourceContents,
}) {
  const moduleMap = new Map(
    normalizeCruiseModules(modules).map((module) => [module.source, module])
  );
  const consumersByExport = new Map();

  for (const [consumer, contents] of sourceContents) {
    const module = moduleMap.get(consumer);
    if (!module) continue;
    const parsed = sourceFileFor(consumer, contents);
    for (const { target, symbol } of importedNamesByTarget(module, parsed)) {
      const key = `${target}\0${symbol}`;
      const consumers = consumersByExport.get(key) ?? new Set();
      consumers.add(consumer);
      consumersByExport.set(key, consumers);
    }
  }

  const evidence = [];
  for (const [source, contents] of [...sourceContents.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (!API_SOURCE_FILE_PATTERN.test(source)) continue;
    const parsed = sourceFileFor(source, contents);
    for (const symbol of exportedNames(parsed)) {
      const directConsumers = consumersByExport.get(`${source}\0${symbol}`) ?? new Set();
      const namespaceConsumers = consumersByExport.get(`${source}\0*`) ?? new Set();
      const consumers = [...new Set([...directConsumers, ...namespaceConsumers])].sort();
      const hasProductionConsumer = consumers.some((consumer) => productionSources.has(consumer));
      const hasInternalProductionUse =
        productionSources.has(source) && countIdentifier(parsed, symbol) > 1;
      const classification =
        hasProductionConsumer || hasInternalProductionUse || API_PRODUCTION_ROOTS.includes(source)
          ? 'production-export'
          : consumers.some(
                (consumer) => API_TEST_FILE_PATTERN.test(consumer) || testSources.has(consumer)
              )
            ? 'test-support-export'
            : 'unused-export';
      evidence.push({ source, symbol, classification, consumers });
    }
  }

  return evidence.sort((left, right) =>
    `${left.source}\0${left.symbol}`.localeCompare(`${right.source}\0${right.symbol}`)
  );
}

function collectSideEffectLocalImports(module, contents) {
  const parsed = sourceFileFor(module.source, contents);
  const dependenciesBySpecifier = new Map(
    (module.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
  );
  const findings = [];

  for (const statement of parsed.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      !statement.importClause &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      /^\.\.?\//u.test(statement.moduleSpecifier.text)
    ) {
      const target = dependenciesBySpecifier.get(statement.moduleSpecifier.text);
      if (target?.startsWith('apps/api/src/')) findings.push(target);
    }
  }
  return findings;
}

export function collectApiReachabilityFindings({
  modules,
  classifications,
  productionSources,
  changedSourceFiles = [],
  sourceContents = new Map(),
  profileEvidence = [],
}) {
  const changed = new Set(changedSourceFiles.map(normalizePath));
  const findings = [];

  for (const item of classifications) {
    if (!changed.has(item.source)) continue;
    if (item.classification === API_REACHABILITY_CLASSIFICATIONS.testSupport) {
      findings.push({
        ruleName: 'no-new-api-test-support-source',
        source: item.source,
        reason: 'changed src module is reachable only from tests',
      });
    } else if (item.classification === API_REACHABILITY_CLASSIFICATIONS.orphan) {
      findings.push({
        ruleName: 'no-new-api-orphan-source',
        source: item.source,
        reason: 'changed src module is unreachable from production and tests',
      });
    }
  }

  for (const module of modules) {
    if (!productionSources.has(module.source)) continue;
    for (const dependency of module.dependencies ?? []) {
      if (dependency.resolved?.startsWith('apps/api/test/')) {
        findings.push({
          ruleName: 'no-api-production-to-test-support',
          source: module.source,
          target: dependency.resolved,
          reason: 'production source imports API test support',
        });
      }
    }
    for (const target of collectSideEffectLocalImports(
      module,
      sourceContents.get(module.source) ?? ''
    )) {
      findings.push({
        ruleName: 'no-api-fake-reachability-import',
        source: module.source,
        target,
        reason: 'side-effect-only local import cannot prove product reachability',
      });
    }
  }

  const provenProfiles = new Set(profileEvidence.map(({ profile }) => profile));
  for (const profile of REQUIRED_API_DEPLOYMENT_PROFILES) {
    if (!provenProfiles.has(profile)) {
      findings.push({
        ruleName: 'api-supported-profile-unproven',
        source: profile,
        reason: 'supported deployment profile lacks semantic composition evidence',
      });
    }
  }

  return findings.sort((left, right) =>
    `${left.ruleName}\0${left.source}\0${left.target ?? ''}`.localeCompare(
      `${right.ruleName}\0${right.source}\0${right.target ?? ''}`
    )
  );
}

function readSourceContents(baseDir, sourcePaths) {
  return new Map(
    [...new Set(sourcePaths)].sort().flatMap((source) => {
      const absolutePath = resolve(baseDir, source);
      return existsSync(absolutePath) ? [[source, readFileSync(absolutePath, 'utf8')]] : [];
    })
  );
}

function listChangedApiSources() {
  try {
    return listChangedFilesBetween({ diffFilter: 'ACMR' }).filter((source) =>
      API_SOURCE_FILE_PATTERN.test(source)
    );
  } catch (error) {
    if (process.env.CI || process.env.GITHUB_ACTIONS) throw error;
    console.error(
      `[api-production-reachability] Git diff unavailable locally; regression comparison skipped: ${error.message}`
    );
    return [];
  }
}

export async function collectApiProductionReachability(baseDir = process.cwd(), options = {}) {
  const cruiseResult = options.cruiseResult ?? (await runApiReachabilityCruiseReport(baseDir));
  const modules = normalizeCruiseModules(cruiseResult.modules);
  const sourceFiles = listFilesRecursive(resolve(baseDir, 'apps/api/src'))
    .map((absolutePath) => normalizePath(relative(baseDir, absolutePath)))
    .filter((source) => API_SOURCE_FILE_PATTERN.test(source))
    .sort();
  const testRoots = modules
    .map(({ source }) => source)
    .filter((source) => API_TEST_FILE_PATTERN.test(source));
  const sourceContents = readSourceContents(baseDir, [
    ...sourceFiles,
    ...modules.map(({ source }) => source).filter((source) => API_TEST_FILE_PATTERN.test(source)),
  ]);
  const classified = classifyApiSourceReachability({ modules, sourceFiles, testRoots });
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: classified.modules,
    productionSources: classified.productionSources,
    testSources: classified.testSources,
    sourceContents,
  });
  const exportEvidence = collectApiExportReachabilityEvidence({
    modules: classified.modules,
    productionSources: classified.productionSources,
    sourceContents,
  });
  const changedSourceFiles = options.changedSourceFiles ?? listChangedApiSources();
  const findings = collectApiReachabilityFindings({
    ...classified,
    changedSourceFiles,
    sourceContents,
    profileEvidence,
  });
  const dynamicImports = dynamicPackageImports(
    classified.modules,
    classified.productionSources,
    sourceContents
  );

  return {
    ...classified,
    profileEvidence,
    dynamicImports,
    exportEvidence,
    findings,
  };
}

export function formatApiReachabilityFindings(findings) {
  return findings.map(
    (finding) =>
      `${finding.ruleName}: ${finding.source}${finding.target ? ` -> ${finding.target}` : ''} (${finding.reason})`
  );
}

export function formatApiReachabilityReport(result) {
  const counts = Object.values(API_REACHABILITY_CLASSIFICATIONS).map((classification) => [
    classification,
    result.classifications.filter((item) => item.classification === classification).length,
  ]);
  const lines = [
    `[api-production-reachability] modules=${result.classifications.length} ${counts
      .map(([classification, count]) => `${classification}=${count}`)
      .join(' ')}`,
    '[api-production-reachability] supported profiles:',
    ...result.profileEvidence.map(
      ({ profile, classification, proof }) => `- ${profile}: ${classification} (${proof})`
    ),
    '[api-production-reachability] dynamic imports:',
    ...result.dynamicImports.map(({ source, target }) => `- ${target}: ${source}`),
  ];
  const candidates = result.classifications.filter(({ classification }) =>
    [
      API_REACHABILITY_CLASSIFICATIONS.testSupport,
      API_REACHABILITY_CLASSIFICATIONS.orphan,
    ].includes(classification)
  );
  lines.push(
    '[api-production-reachability] cleanup candidates:',
    ...candidates.map(({ source, classification }) => `- ${classification}: ${source}`)
  );
  const classificationBySource = new Map(
    result.classifications.map(({ source, classification }) => [source, classification])
  );
  const exportCandidates = result.exportEvidence.filter(
    ({ source, classification }) =>
      classification === 'test-support-export' ||
      (classification === 'unused-export' &&
        [
          API_REACHABILITY_CLASSIFICATIONS.testSupport,
          API_REACHABILITY_CLASSIFICATIONS.orphan,
        ].includes(classificationBySource.get(source)))
  );
  lines.push(
    '[api-production-reachability] export candidates:',
    ...exportCandidates.map(
      ({ source, symbol, classification, consumers }) =>
        `- ${classification}: ${source}#${symbol}${
          consumers.length > 0 ? ` <- ${consumers.join(', ')}` : ''
        }`
    )
  );
  return lines.join('\n');
}

export async function runDependencyCruiseReport(baseDir = process.cwd()) {
  const config = readArchitectureDependencyConfig(baseDir);
  const report = await cruise(ARCHITECTURE_DEPENDENCY_TARGETS, {
    validate: true,
    ruleSet: { forbidden: config.forbidden ?? [] },
    baseDir,
    doNotFollow: config.options?.doNotFollow,
    exclude: config.options?.exclude,
    tsConfig: config.options?.tsConfig,
    tsPreCompilationDeps: true,
    outputType: 'json',
  });
  return parseCruiseOutput(report.output);
}

export async function runApiReachabilityCruiseReport(baseDir = process.cwd()) {
  const config = readArchitectureDependencyConfig(baseDir);
  const report = await cruise(['apps/api/src', 'apps/api/test'], {
    baseDir,
    doNotFollow: config.options?.doNotFollow,
    exclude: config.options?.exclude,
    tsConfig: config.options?.tsConfig,
    tsPreCompilationDeps: true,
    outputType: 'json',
  });
  return parseCruiseOutput(report.output);
}

export async function runDependencyCruise(baseDir = process.cwd()) {
  const cruiseResult = await runDependencyCruiseReport(baseDir);
  return cruiseResult.summary.violations ?? [];
}

export function formatCruiseViolations(violations) {
  return violations.map(
    (violation) =>
      `${violation.rule.name}: ${violation.from}${violation.to ? ` -> ${violation.to}` : ''}`
  );
}

export function formatAdapterCanonicalContractFindings(findings) {
  return findings.map((finding) => `${finding.ruleName}: ${finding.filePath} (${finding.reason})`);
}

export async function runArchitectureDependencyGuard(baseDir = process.cwd()) {
  const cruiseResult = await runDependencyCruiseReport(baseDir);
  const dependencyViolations = cruiseResult.summary.violations ?? [];
  const adapterContractFindings = collectAdapterCanonicalContractFindings(baseDir);
  const apiReachability = await collectApiProductionReachability(baseDir, { cruiseResult });

  return {
    dependencyViolations,
    adapterContractFindings,
    apiReachability,
  };
}

export async function main() {
  const result = await runArchitectureDependencyGuard();
  const dependencyMessages = formatCruiseViolations(result.dependencyViolations);
  const adapterContractMessages = formatAdapterCanonicalContractFindings(
    result.adapterContractFindings
  );
  const reachabilityMessages = formatApiReachabilityFindings(result.apiReachability.findings);
  const messages = [...dependencyMessages, ...adapterContractMessages, ...reachabilityMessages];

  console.log(formatApiReachabilityReport(result.apiReachability));

  if (messages.length > 0) {
    console.error('[architecture-dependencies] FAILED');
    for (const message of messages) {
      console.error(`- ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[architecture-dependencies] OK');
}

if ((process.argv[1] ? resolve(process.argv[1]) : '') === fileURLToPath(import.meta.url)) {
  await main();
}
