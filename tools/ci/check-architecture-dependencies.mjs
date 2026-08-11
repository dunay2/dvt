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

function importBindingNames(importClause, { includeTypeOnly = true } = {}) {
  if (!importClause) return [];
  const bindings = [];
  if (importClause.name) bindings.push(importClause.name.text);
  if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
    bindings.push(importClause.namedBindings.name.text);
  }
  if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
    for (const element of importClause.namedBindings.elements) {
      if (includeTypeOnly || !element.isTypeOnly) bindings.push(element.name.text);
    }
  }
  return bindings;
}

function analyzeLocalImportSemantics(module, contents) {
  if (!contents) return new Map();
  const parsed = sourceFileFor(module.source, contents);
  const dependenciesBySpecifier = new Map(
    (module.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
  );
  const analysis = new Map();

  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    const target = dependenciesBySpecifier.get(specifier);
    if (!/^\.\.?\//u.test(specifier) || !target?.startsWith('apps/api/')) continue;

    const current = analysis.get(specifier) ?? {
      target,
      hasRuntimeUse: false,
      hasTypeUse: false,
      hasSideEffectOnly: false,
      hasUnusedValue: false,
    };
    if (!statement.importClause) {
      current.hasSideEffectOnly = true;
    } else {
      const allBindingNames = importBindingNames(statement.importClause);
      const runtimeBindingNames = statement.importClause.isTypeOnly
        ? []
        : importBindingNames(statement.importClause, { includeTypeOnly: false });
      const hasRuntimeUse = runtimeBindingNames.some((name) => countIdentifier(parsed, name) > 1);
      current.hasRuntimeUse ||= hasRuntimeUse;
      current.hasTypeUse ||= allBindingNames.some((name) => countIdentifier(parsed, name) > 1);
      current.hasUnusedValue ||= runtimeBindingNames.length > 0 && !hasRuntimeUse;
    }
    analysis.set(specifier, current);
  }

  return analysis;
}

function isTypeOnlyDependency(dependency) {
  return (dependency.dependencyTypes ?? []).some(
    (dependencyType) => dependencyType === 'type-only' || dependencyType === 'type-import'
  );
}

function isRuntimeDependency(dependency, importAnalysis) {
  if (isTypeOnlyDependency(dependency)) return false;
  if (dependency.dynamic === true) return true;
  const localImport = importAnalysis.get(dependency.module);
  if (localImport) return localImport.hasRuntimeUse;
  return true;
}

function isMeaningfulTypeDependency(dependency, importAnalysis) {
  if (!isTypeOnlyDependency(dependency)) return false;
  const localImport = importAnalysis.get(dependency.module);
  return localImport ? localImport.hasTypeUse : true;
}

function traverseReachability(moduleMap, roots, sourceContents) {
  const staticReachable = new Set();
  const conditionalReachable = new Set();
  const typeReachable = new Set();
  const visitedStates = new Set();
  const importAnalysisBySource = new Map();
  const queue = roots.map((source) => ({
    source: normalizePath(source),
    conditional: false,
    mode: 'runtime',
  }));

  while (queue.length > 0) {
    const current = queue.shift();
    const stateKey = `${current.source}\0${current.mode}\0${current.conditional ? 'conditional' : 'static'}`;
    if (visitedStates.has(stateKey)) continue;
    visitedStates.add(stateKey);

    if (current.mode === 'type') typeReachable.add(current.source);
    else if (current.conditional) conditionalReachable.add(current.source);
    else staticReachable.add(current.source);

    const module = moduleMap.get(current.source);
    if (!module) continue;
    const importAnalysis =
      importAnalysisBySource.get(current.source) ??
      analyzeLocalImportSemantics(module, sourceContents.get(current.source));
    importAnalysisBySource.set(current.source, importAnalysis);

    for (const dependency of module.dependencies ?? []) {
      const target = dependency.resolved;
      if (!target?.startsWith('apps/api/')) continue;
      if (
        isMeaningfulTypeDependency(dependency, importAnalysis) &&
        !staticReachable.has(target) &&
        !conditionalReachable.has(target)
      ) {
        queue.push({ source: target, conditional: current.conditional, mode: 'type' });
      }
      if (current.mode === 'type' || !isRuntimeDependency(dependency, importAnalysis)) continue;
      queue.push({
        source: target,
        conditional: current.conditional || dependency.dynamic === true,
        mode: 'runtime',
      });
    }
  }

  return { staticReachable, conditionalReachable, typeReachable };
}

export function classifyApiSourceReachability({
  modules,
  sourceFiles,
  productionRoots = API_PRODUCTION_ROOTS,
  testRoots,
  sourceContents = new Map(),
}) {
  const normalizedModules = normalizeCruiseModules(modules);
  const moduleMap = new Map(normalizedModules.map((module) => [module.source, module]));
  const normalizedSourceFiles = [...new Set(sourceFiles.map(normalizePath))].sort();
  const normalizedTestRoots = [...new Set((testRoots ?? []).map(normalizePath))].sort();
  const normalizedSourceContents = new Map(
    [...sourceContents].map(([source, contents]) => [normalizePath(source), contents])
  );
  const productionReachability = traverseReachability(
    moduleMap,
    productionRoots,
    normalizedSourceContents
  );
  const testReachability = traverseReachability(
    moduleMap,
    normalizedTestRoots,
    normalizedSourceContents
  );

  const classifications = normalizedSourceFiles.map((source) => {
    let classification = API_REACHABILITY_CLASSIFICATIONS.orphan;
    let runtimeReachability = 'none';
    let retentionReason = 'unretained';
    if (productionReachability.staticReachable.has(source)) {
      classification = API_REACHABILITY_CLASSIFICATIONS.production;
      runtimeReachability = 'static';
      retentionReason = 'production-runtime';
    } else if (productionReachability.conditionalReachable.has(source)) {
      classification = API_REACHABILITY_CLASSIFICATIONS.conditionalProduction;
      runtimeReachability = 'conditional';
      retentionReason = 'production-runtime';
    } else if (productionReachability.typeReachable.has(source)) {
      classification = API_REACHABILITY_CLASSIFICATIONS.production;
      retentionReason = 'production-type-support';
    } else if (
      testReachability.staticReachable.has(source) ||
      testReachability.conditionalReachable.has(source) ||
      testReachability.typeReachable.has(source)
    ) {
      classification = API_REACHABILITY_CLASSIFICATIONS.testSupport;
      runtimeReachability =
        testReachability.staticReachable.has(source) ||
        testReachability.conditionalReachable.has(source)
          ? 'test'
          : 'none';
      retentionReason = 'test-support';
    }

    return { source, classification, runtimeReachability, retentionReason };
  });

  return {
    modules: normalizedModules,
    classifications,
    productionSources: new Set([
      ...productionReachability.staticReachable,
      ...productionReachability.conditionalReachable,
    ]),
    productionTypeSources: productionReachability.typeReachable,
    testSources: new Set([
      ...testReachability.staticReachable,
      ...testReachability.conditionalReachable,
      ...testReachability.typeReachable,
    ]),
  };
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
  productionRoots = API_PRODUCTION_ROOTS,
}) {
  const moduleMap = new Map(
    normalizeCruiseModules(modules).map((module) => [module.source, module])
  );
  const reachableExecutableScopes = collectProductionExecutableScopes({
    moduleMap,
    productionSources,
    sourceContents,
    productionRoots,
  });
  const evidence = new Map();
  const add = (profile, classification, proof, sources) => {
    const current = evidence.get(profile);
    evidence.set(profile, {
      profile,
      classification,
      proof,
      sources: [...new Set([...(current?.sources ?? []), ...sources])].sort(),
    });
  };

  for (const source of [...productionSources].sort()) {
    const contents = sourceContents.get(source);
    if (!contents) continue;
    const parsed = sourceFileFor(source, contents);
    const ifStatements = collectDescendants(parsed, ts.isIfStatement);

    for (const statement of ifStatements) {
      const statementScope = enclosingExecutableScope(statement, parsed);
      if (
        !reachableExecutableScopes.has(executableScopeKey(source, statementScope)) ||
        !isStaticallyReachable(statement, statementScope)
      ) {
        continue;
      }

      if (
        containsIdentifier(statement.expression, 'OBS_ENABLED') &&
        containsReachableReturnCall(statement.thenStatement, 'createNoopObservability')
      ) {
        const executableScope = enclosingExecutableScope(statement, parsed);
        add(
          'observability-noop',
          API_REACHABILITY_CLASSIFICATIONS.validNullObject,
          'OBS_ENABLED=false branch returns createNoopObservability()',
          [source]
        );
        if (
          hasReachableEnabledTarget(
            executableScope,
            statement,
            (node) =>
              ts.isNewExpression(node) &&
              ts.isIdentifier(node.expression) &&
              node.expression.text === 'OtelObservability'
          )
        ) {
          add(
            'observability-otel',
            API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
            'OBS_ENABLED=true branch constructs OtelObservability',
            [source]
          );
        }
      }

      const oidcCondition = ['OIDC_JWKS_URI', 'OIDC_ISSUER', 'OIDC_AUDIENCE'].every((identifier) =>
        containsIdentifier(statement.expression, identifier)
      );
      if (
        oidcCondition &&
        containsReachableCall(statement.thenStatement, 'buildProtectedRuntimeModule')
      ) {
        const protectedSource =
          importedSymbolTarget(moduleMap.get(source), parsed, 'buildProtectedRuntimeModule') ??
          source;
        add(
          'oidc-protected-runtime',
          API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
          'complete OIDC branch calls buildProtectedRuntimeModule()',
          [protectedSource]
        );
        if (statement.elseStatement) {
          add(
            'oidc-public-only',
            API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
            'OIDC branch has an explicit public-only alternative',
            [source]
          );
        }
        const protectedContents = sourceContents.get(protectedSource);
        const protectedParsed = protectedContents
          ? sourceFileFor(protectedSource, protectedContents)
          : null;
        const protectedScope = protectedParsed
          ? findNamedExecutableScope(protectedParsed, 'buildProtectedRuntimeModule')
          : null;
        if (
          protectedScope &&
          reachableExecutableScopes.has(executableScopeKey(protectedSource, protectedScope)) &&
          containsReachableDynamicImport(protectedScope, '@dvt/adapter-postgres')
        ) {
          add(
            'postgres-protected-storage',
            API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
            'OIDC-protected composition dynamically loads @dvt/adapter-postgres',
            [protectedSource]
          );
        }
      }

      if (
        containsIdentifier(statement.expression, 'DVT_INTENT_RECONCILER_ENABLED') &&
        containsReachableNullReturn(statement.thenStatement)
      ) {
        const executableScope = enclosingClassOrExecutableScope(statement, parsed);
        add(
          'reconciler-disabled',
          API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
          'disabled reconciler branch returns no runtime handle',
          [source]
        );
        if (hasReachableReconcilerEnabledPath(executableScope, statement, parsed)) {
          add(
            'reconciler-enabled',
            API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
            'enabled reconciler path composes the worker runtime',
            [source]
          );
        }
      }

      if (
        containsIdentifier(statement.expression, 'TEMPORAL_ADDRESS') &&
        containsReachableNullReturn(statement.thenStatement) &&
        hasReachableEnabledTarget(enclosingExecutableScope(statement, parsed), statement, (node) =>
          isDynamicImportOf(node, '@dvt/adapter-temporal')
        )
      ) {
        add(
          'temporal-provider',
          API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
          'configured Temporal branch dynamically loads @dvt/adapter-temporal',
          [source]
        );
      }
    }
  }

  return [...evidence.values()].sort((left, right) => left.profile.localeCompare(right.profile));
}

function sourceFileFor(source, contents) {
  return ts.createSourceFile(source, contents, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

function collectDescendants(root, predicate) {
  const matches = [];
  const visit = (node) => {
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
}

function isExecutableScope(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function enclosingExecutableScope(node, sourceFile) {
  for (let current = node.parent; current; current = current.parent) {
    if (isExecutableScope(current)) return current;
  }
  return sourceFile;
}

function enclosingClassOrExecutableScope(node, sourceFile) {
  let executableScope = null;
  for (let current = node.parent; current; current = current.parent) {
    if (!executableScope && isExecutableScope(current)) executableScope = current;
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) return current;
  }
  return executableScope ?? sourceFile;
}

function collectScopedDescendants(root, predicate) {
  const matches = [];
  const rootIsClass = ts.isClassDeclaration(root) || ts.isClassExpression(root);
  const visit = (node) => {
    if (node !== root) {
      if (rootIsClass && isExecutableScope(node) && node.parent !== root) return;
      if (!rootIsClass && (isExecutableScope(node) || ts.isClassDeclaration(node))) return;
    }
    if (predicate(node)) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return matches;
}

function staticPrimitiveValue(expression) {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  if (current.kind === ts.SyntaxKind.TrueKeyword) return { known: true, value: true };
  if (current.kind === ts.SyntaxKind.FalseKeyword) return { known: true, value: false };
  if (current.kind === ts.SyntaxKind.NullKeyword) return { known: true, value: null };
  if (ts.isNumericLiteral(current)) return { known: true, value: Number(current.text) };
  if (ts.isStringLiteral(current) || ts.isNoSubstitutionTemplateLiteral(current)) {
    return { known: true, value: current.text };
  }
  if (ts.isPrefixUnaryExpression(current) && current.operator === ts.SyntaxKind.ExclamationToken) {
    const operand = staticPrimitiveValue(current.operand);
    return operand.known ? { known: true, value: !operand.value } : operand;
  }
  return { known: false, value: undefined };
}

function staticBooleanValue(expression) {
  const value = staticPrimitiveValue(expression);
  if (value.known) return Boolean(value.value);
  return null;
}

function nodeIsWithin(node, root) {
  return node.pos >= root.pos && node.end <= root.end;
}

function statementAlwaysTerminates(statement) {
  if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) return true;
  if (ts.isBlock(statement)) {
    return statement.statements.some((nestedStatement) =>
      statementAlwaysTerminates(nestedStatement)
    );
  }
  if (ts.isTryStatement(statement)) {
    if (statement.finallyBlock && statementAlwaysTerminates(statement.finallyBlock)) return true;
    if (!statementAlwaysTerminates(statement.tryBlock)) return false;
    return !statement.catchClause || statementAlwaysTerminates(statement.catchClause.block);
  }
  if (ts.isSwitchStatement(statement)) {
    const switchValue = staticPrimitiveValue(statement.expression);
    if (!switchValue.known) return false;
    const clauses = statement.caseBlock.clauses;
    let selectedIndex = clauses.findIndex(
      (clause) =>
        ts.isCaseClause(clause) &&
        staticPrimitiveValue(clause.expression).known &&
        staticPrimitiveValue(clause.expression).value === switchValue.value
    );
    if (selectedIndex < 0) selectedIndex = clauses.findIndex(ts.isDefaultClause);
    if (selectedIndex < 0) return false;
    for (const clause of clauses.slice(selectedIndex)) {
      for (const clauseStatement of clause.statements) {
        if (ts.isBreakStatement(clauseStatement)) return false;
        if (statementAlwaysTerminates(clauseStatement)) return true;
      }
    }
    return false;
  }
  if (!ts.isIfStatement(statement)) return false;

  const condition = staticBooleanValue(statement.expression);
  if (condition === true) return statementAlwaysTerminates(statement.thenStatement);
  if (condition === false) {
    return statement.elseStatement ? statementAlwaysTerminates(statement.elseStatement) : false;
  }
  return (
    statement.elseStatement !== undefined &&
    statementAlwaysTerminates(statement.thenStatement) &&
    statementAlwaysTerminates(statement.elseStatement)
  );
}

function isStaticallyReachable(node, boundary) {
  for (let current = node; current && current !== boundary; current = current.parent) {
    const parent = current.parent;
    if (!parent) break;

    if (ts.isIfStatement(parent)) {
      const condition = staticBooleanValue(parent.expression);
      if (condition === false && nodeIsWithin(node, parent.thenStatement)) return false;
      if (condition === true && parent.elseStatement && nodeIsWithin(node, parent.elseStatement)) {
        return false;
      }
    }
    if (ts.isConditionalExpression(parent)) {
      const condition = staticBooleanValue(parent.condition);
      if (condition === false && nodeIsWithin(node, parent.whenTrue)) return false;
      if (condition === true && nodeIsWithin(node, parent.whenFalse)) return false;
    }
    if (ts.isBinaryExpression(parent) && nodeIsWithin(node, parent.right)) {
      const left = staticBooleanValue(parent.left);
      if (parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && left === false) {
        return false;
      }
      if (parent.operatorToken.kind === ts.SyntaxKind.BarBarToken && left === true) return false;
    }
    if (ts.isWhileStatement(parent) && staticBooleanValue(parent.expression) === false) {
      return false;
    }
    if (ts.isBlock(parent)) {
      const containingStatement = parent.statements.find((statement) =>
        nodeIsWithin(node, statement)
      );
      if (containingStatement) {
        const statementIndex = parent.statements.indexOf(containingStatement);
        if (
          parent.statements
            .slice(0, statementIndex)
            .some((statement) => statementAlwaysTerminates(statement))
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

function collectReachableScopedDescendants(root, predicate) {
  return collectScopedDescendants(root, predicate).filter((node) =>
    isStaticallyReachable(node, root)
  );
}

function containsIdentifier(root, identifier) {
  return (
    collectDescendants(root, (node) => ts.isIdentifier(node) && node.text === identifier).length > 0
  );
}

function containsReachableCall(root, callee) {
  return (
    collectReachableScopedDescendants(
      root,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === callee
    ).length > 0
  );
}

function containsReachableReturnCall(root, callee) {
  return (
    collectReachableScopedDescendants(
      root,
      (node) =>
        ts.isReturnStatement(node) &&
        node.expression !== undefined &&
        ts.isCallExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === callee
    ).length > 0
  );
}

function containsReachableNullReturn(root) {
  return (
    collectReachableScopedDescendants(
      root,
      (node) => ts.isReturnStatement(node) && node.expression?.kind === ts.SyntaxKind.NullKeyword
    ).length > 0
  );
}

function isDynamicImportOf(node, target) {
  return (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === target
  );
}

function containsReachableDynamicImport(root, target) {
  return (
    collectReachableScopedDescendants(root, (node) => isDynamicImportOf(node, target)).length > 0
  );
}

function hasReachableEnabledTarget(executableScope, guardStatement, predicate) {
  return collectReachableScopedDescendants(executableScope, predicate).some(
    (target) =>
      target.pos >= guardStatement.end ||
      (guardStatement.elseStatement && nodeIsWithin(target, guardStatement.elseStatement))
  );
}

function executableScopeName(scope) {
  return scope.name && ts.isIdentifier(scope.name) ? scope.name.text : null;
}

function reachableThisMethodCalls(scope) {
  return collectReachableScopedDescendants(
    scope,
    (node) =>
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword
  ).map((call) => ({ call, method: call.expression.name.text }));
}

function hasReachableReconcilerEnabledPath(scope, guardStatement, sourceFile) {
  const targetPredicate = (node) =>
    (ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'createIntentReconcilerRuntimeComposition') ||
    (ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'IntentReconcilerWorker');

  if (!ts.isClassDeclaration(scope) && !ts.isClassExpression(scope)) {
    return hasReachableEnabledTarget(scope, guardStatement, targetPredicate);
  }

  const className = scope.name && ts.isIdentifier(scope.name) ? scope.name.text : null;
  const compositionFactory = findNamedExecutableScope(
    sourceFile,
    'createIntentReconcilerRuntimeComposition'
  );
  if (
    !className ||
    !compositionFactory ||
    collectReachableScopedDescendants(
      compositionFactory,
      (node) =>
        ts.isNewExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === className
    ).length === 0
  ) {
    return false;
  }

  const guardMethod = enclosingExecutableScope(guardStatement, scope);
  const guardMethodName = executableScopeName(guardMethod);
  if (!guardMethodName) return false;

  const methods = new Map(
    scope.members
      .filter(isExecutableScope)
      .map((method) => [executableScopeName(method), method])
      .filter(([name]) => name !== null)
  );
  const callsByMethod = new Map(
    [...methods].map(([name, method]) => [name, reachableThisMethodCalls(method)])
  );
  const entryMethod = methods.get('create');
  if (!entryMethod) return false;
  if (guardMethod === entryMethod) {
    return hasReachableEnabledTarget(entryMethod, guardStatement, targetPredicate);
  }
  const methodsReachingTarget = new Set(
    [...methods]
      .filter(([, method]) => collectReachableScopedDescendants(method, targetPredicate).length > 0)
      .map(([name]) => name)
  );

  let changed = true;
  while (changed) {
    changed = false;
    for (const [methodName, calls] of callsByMethod) {
      if (
        !methodsReachingTarget.has(methodName) &&
        calls.some(({ method }) => methodsReachingTarget.has(method))
      ) {
        methodsReachingTarget.add(methodName);
        changed = true;
      }
    }
  }

  const entryCalls = callsByMethod.get('create') ?? [];
  const guardCalls = entryCalls.filter(({ method }) => method === guardMethodName);
  const targetCalls = entryCalls.filter(({ method }) => methodsReachingTarget.has(method));
  const directTargets = collectReachableScopedDescendants(entryMethod, targetPredicate);
  return guardCalls.some(({ call: guardCall }) =>
    [...targetCalls.map(({ call }) => call), ...directTargets].some(
      (target) => target.pos > guardCall.end
    )
  );
}

function findNamedExecutableScope(sourceFile, name) {
  return (
    collectDescendants(
      sourceFile,
      (node) =>
        isExecutableScope(node) &&
        node.name !== undefined &&
        ts.isIdentifier(node.name) &&
        node.name.text === name &&
        isStaticallyReachable(node, enclosingExecutableScope(node, sourceFile))
    )[0] ?? null
  );
}

function topLevelNamedExecutableScope(sourceFile, name) {
  return (
    sourceFile.statements.find(
      (statement) =>
        isExecutableScope(statement) &&
        statement.name !== undefined &&
        ts.isIdentifier(statement.name) &&
        statement.name.text === name
    ) ?? null
  );
}

function executableScopeKey(source, scope) {
  return `${source}:${scope.pos}:${scope.end}`;
}

function enclosingClassScope(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isClassDeclaration(current) || ts.isClassExpression(current)) return current;
  }
  return null;
}

function unwrapExpression(expression) {
  let current = expression;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAwaitExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

function collectProductionExecutableScopes({
  moduleMap,
  productionSources,
  sourceContents,
  productionRoots,
}) {
  const parsedBySource = new Map(
    [...productionSources].flatMap((source) => {
      const contents = sourceContents.get(source);
      return contents ? [[source, sourceFileFor(source, contents)]] : [];
    })
  );
  const reachable = new Set();
  const queued = new Set();
  const queue = [];
  const enqueue = (source, scope) => {
    if (!scope) return;
    const key = executableScopeKey(source, scope);
    if (queued.has(key)) return;
    queued.add(key);
    queue.push({ source, scope });
  };

  const resolveExportedExecutable = (source, exportedName, visited = new Set()) => {
    const parsed = parsedBySource.get(source);
    if (!parsed) return null;
    const visitKey = `${source}:${exportedName}`;
    if (visited.has(visitKey)) return null;
    visited.add(visitKey);

    const local = topLevelNamedExecutableScope(parsed, exportedName);
    if (local) return { source, scope: local };

    const module = moduleMap.get(source);
    const dependenciesBySpecifier = new Map(
      (module?.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
    );
    for (const statement of parsed.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      ) {
        continue;
      }
      const exported = statement.exportClause.elements.find(
        (element) => element.name.text === exportedName
      );
      if (!exported) continue;
      const targetSource = dependenciesBySpecifier.get(statement.moduleSpecifier.text);
      const targetName = exported.propertyName?.text ?? exported.name.text;
      if (targetSource) return resolveExportedExecutable(targetSource, targetName, visited);
    }
    return null;
  };

  const resolveIdentifier = (source, identifierName) => {
    const parsed = parsedBySource.get(source);
    if (!parsed) return null;
    const local = topLevelNamedExecutableScope(parsed, identifierName);
    if (local) return { source, scope: local };

    const module = moduleMap.get(source);
    const dependenciesBySpecifier = new Map(
      (module?.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
    );
    for (const statement of parsed.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.importClause?.namedBindings ||
        !ts.isNamedImports(statement.importClause.namedBindings)
      ) {
        continue;
      }
      const imported = statement.importClause.namedBindings.elements.find(
        (element) => element.name.text === identifierName
      );
      if (!imported) continue;
      const targetSource = dependenciesBySpecifier.get(statement.moduleSpecifier.text);
      const importedName = imported.propertyName?.text ?? imported.name.text;
      return targetSource ? resolveExportedExecutable(targetSource, importedName, new Set()) : null;
    }
    return null;
  };

  const productMethod = (factoryTarget, methodName) => {
    const returns = collectReachableScopedDescendants(
      factoryTarget.scope,
      (node) => ts.isReturnStatement(node) && node.expression !== undefined
    );
    for (const returnStatement of returns) {
      const expression = unwrapExpression(returnStatement.expression);
      if (expression && ts.isObjectLiteralExpression(expression)) {
        const method = expression.properties.find(
          (property) =>
            (ts.isMethodDeclaration(property) ||
              ts.isPropertyAssignment(property) ||
              ts.isShorthandPropertyAssignment(property)) &&
            property.name !== undefined &&
            ts.isIdentifier(property.name) &&
            property.name.text === methodName
        );
        if (method && ts.isMethodDeclaration(method)) {
          return { source: factoryTarget.source, scope: method };
        }
      }
      if (expression && ts.isNewExpression(expression) && ts.isIdentifier(expression.expression)) {
        const parsed = parsedBySource.get(factoryTarget.source);
        const classScope = parsed?.statements.find(
          (statement) =>
            ts.isClassDeclaration(statement) && statement.name?.text === expression.expression.text
        );
        const method = classScope?.members.find(
          (member) => executableScopeName(member) === methodName
        );
        if (method) return { source: factoryTarget.source, scope: method };
      }
    }
    return null;
  };

  const resolveCall = (source, scope, call) => {
    if (ts.isIdentifier(call.expression)) return resolveIdentifier(source, call.expression.text);
    if (!ts.isPropertyAccessExpression(call.expression)) return null;
    if (call.expression.expression.kind === ts.SyntaxKind.ThisKeyword) {
      const classScope = enclosingClassScope(scope);
      const method = classScope?.members.find(
        (member) => executableScopeName(member) === call.expression.name.text
      );
      return method ? { source, scope: method } : null;
    }
    if (ts.isCallExpression(call.expression.expression)) {
      const factoryTarget = resolveCall(source, scope, call.expression.expression);
      if (!factoryTarget) return null;
      enqueue(factoryTarget.source, factoryTarget.scope);
      return productMethod(factoryTarget, call.expression.name.text);
    }
    return null;
  };

  const parameterNameAt = (scope, index) => {
    const parameter = scope.parameters?.[index];
    return parameter && ts.isIdentifier(parameter.name) ? parameter.name.text : null;
  };

  const parameterIsDirectlyInvoked = (scope, parameterName) =>
    collectReachableScopedDescendants(
      scope,
      (node) =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === parameterName
    ).length > 0;

  const parameterIsInvokedByReturnedCallable = (scope, parameterName) =>
    collectReachableScopedDescendants(
      scope,
      (node) => ts.isReturnStatement(node) && node.expression !== undefined
    ).some((returnStatement) => {
      const returned = unwrapExpression(returnStatement.expression);
      if (!returned || (!ts.isArrowFunction(returned) && !ts.isFunctionExpression(returned))) {
        return false;
      }
      return (
        collectReachableScopedDescendants(
          returned,
          (node) =>
            ts.isCallExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === parameterName
        ).length > 0
      );
    });

  const callResultVariableName = (call, boundary) => {
    for (let current = call; current && current !== boundary; current = current.parent) {
      if (
        ts.isVariableDeclaration(current) &&
        ts.isIdentifier(current.name) &&
        current.initializer &&
        nodeIsWithin(call, current.initializer)
      ) {
        return current.name.text;
      }
    }
    return null;
  };

  const returnedCallableIsConsumed = (source, scope, producerCall) => {
    const variableName = callResultVariableName(producerCall, scope);
    if (!variableName) return false;
    return collectReachableScopedDescendants(scope, ts.isCallExpression).some((consumerCall) => {
      if (consumerCall.pos <= producerCall.end) return false;
      const parameterIndex = consumerCall.arguments.findIndex(
        (argument) => ts.isIdentifier(argument) && argument.text === variableName
      );
      if (parameterIndex < 0) return false;
      const consumerTarget = resolveCall(source, scope, consumerCall);
      const parameterName = consumerTarget
        ? parameterNameAt(consumerTarget.scope, parameterIndex)
        : null;
      return Boolean(
        parameterName && parameterIsDirectlyInvoked(consumerTarget.scope, parameterName)
      );
    });
  };

  const consumedParameterMethods = (scope, parameterName) => {
    const methods = new Set(
      collectReachableScopedDescendants(
        scope,
        (node) =>
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          node.expression.expression.text === parameterName
      ).map((call) => call.expression.name.text)
    );
    const loops = collectReachableScopedDescendants(scope, ts.isForOfStatement);
    for (const loop of loops) {
      if (!ts.isIdentifier(unwrapExpression(loop.expression))) continue;
      if (unwrapExpression(loop.expression).text !== parameterName) continue;
      if (!ts.isVariableDeclarationList(loop.initializer)) continue;
      const declaration = loop.initializer.declarations[0];
      if (!declaration || !ts.isIdentifier(declaration.name)) continue;
      for (const call of collectReachableScopedDescendants(loop.statement, ts.isCallExpression)) {
        if (
          ts.isPropertyAccessExpression(call.expression) &&
          ts.isIdentifier(call.expression.expression) &&
          call.expression.expression.text === declaration.name.text
        ) {
          methods.add(call.expression.name.text);
        }
      }
    }
    return methods;
  };

  const valueExpression = (scope, expression) => {
    if (!ts.isIdentifier(expression)) return expression;
    const declaration = collectReachableScopedDescendants(
      scope,
      (node) =>
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === expression.text &&
        node.initializer !== undefined
    )[0];
    return declaration?.initializer ?? expression;
  };

  const productFactoryCalls = (scope, expression) =>
    collectReachableScopedDescendants(valueExpression(scope, expression), ts.isCallExpression);

  for (const root of productionRoots) {
    if (productionSources.has(root)) enqueue(root, parsedBySource.get(root));
  }

  while (queue.length > 0) {
    const current = queue.shift();
    reachable.add(executableScopeKey(current.source, current.scope));
    const calls = collectReachableScopedDescendants(current.scope, ts.isCallExpression);
    for (const call of calls) {
      const target = resolveCall(current.source, current.scope, call);
      if (target) {
        enqueue(target.source, target.scope);
        for (let index = 0; index < call.arguments.length; index += 1) {
          const parameterName = parameterNameAt(target.scope, index);
          if (!parameterName) continue;
          const argument = call.arguments[index];
          if (ts.isIdentifier(argument)) {
            const callback = resolveIdentifier(current.source, argument.text);
            if (
              callback &&
              (parameterIsDirectlyInvoked(target.scope, parameterName) ||
                (parameterIsInvokedByReturnedCallable(target.scope, parameterName) &&
                  returnedCallableIsConsumed(current.source, current.scope, call)))
            ) {
              enqueue(callback.source, callback.scope);
            }
          }
          for (const methodName of consumedParameterMethods(target.scope, parameterName)) {
            for (const factoryCall of productFactoryCalls(current.scope, argument)) {
              const factoryTarget = resolveCall(current.source, current.scope, factoryCall);
              if (!factoryTarget) continue;
              const method = productMethod(factoryTarget, methodName);
              if (method) enqueue(method.source, method.scope);
            }
          }
        }
      }
    }
  }

  return reachable;
}

function importedSymbolTarget(module, parsed, symbol) {
  if (!module) return null;
  const dependenciesBySpecifier = new Map(
    (module.dependencies ?? []).map((dependency) => [dependency.module, dependency.resolved])
  );
  for (const statement of parsed.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.importClause?.namedBindings ||
      !ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      continue;
    }
    if (
      statement.importClause.namedBindings.elements.some((element) => element.name.text === symbol)
    ) {
      return dependenciesBySpecifier.get(statement.moduleSpecifier.text) ?? null;
    }
  }
  return null;
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
  productionTypeSources = new Set(),
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
      const hasProductionConsumer = consumers.some(
        (consumer) => productionSources.has(consumer) || productionTypeSources.has(consumer)
      );
      const hasInternalProductionUse =
        (productionSources.has(source) || productionTypeSources.has(source)) &&
        countIdentifier(parsed, symbol) > 1;
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
  return [...analyzeLocalImportSemantics(module, contents).values()]
    .filter(({ target, hasSideEffectOnly }) =>
      Boolean(hasSideEffectOnly && target?.startsWith('apps/api/src/'))
    )
    .map(({ target }) => target);
}

function collectUnusedLocalValueImports(module, contents) {
  return [...analyzeLocalImportSemantics(module, contents).values()]
    .filter(
      ({ target, hasUnusedValue, hasRuntimeUse }) =>
        hasUnusedValue && !hasRuntimeUse && target?.startsWith('apps/api/src/')
    )
    .map(({ target }) => target);
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
    for (const target of collectUnusedLocalValueImports(
      module,
      sourceContents.get(module.source) ?? ''
    )) {
      findings.push({
        ruleName: 'no-api-fake-reachability-import',
        source: module.source,
        target,
        reason: 'unused local value import cannot prove product reachability',
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

function applyDeploymentProfileClassifications(classifications, profileEvidence) {
  const validNullObjectSources = new Set(
    profileEvidence
      .filter(
        ({ classification }) => classification === API_REACHABILITY_CLASSIFICATIONS.validNullObject
      )
      .flatMap(({ sources }) => sources)
  );
  const conditionalSources = new Set(
    profileEvidence
      .filter(
        ({ classification }) =>
          classification === API_REACHABILITY_CLASSIFICATIONS.conditionalProduction
      )
      .flatMap(({ sources }) => sources)
  );
  const roots = new Set(API_PRODUCTION_ROOTS);

  return classifications.map((item) => {
    if (
      item.classification !== API_REACHABILITY_CLASSIFICATIONS.production ||
      roots.has(item.source)
    ) {
      return item;
    }
    if (validNullObjectSources.has(item.source)) {
      return {
        ...item,
        classification: API_REACHABILITY_CLASSIFICATIONS.validNullObject,
        retentionReason: 'production-null-object',
      };
    }
    if (conditionalSources.has(item.source)) {
      return {
        ...item,
        classification: API_REACHABILITY_CLASSIFICATIONS.conditionalProduction,
        runtimeReachability: 'conditional',
        retentionReason: 'production-profile',
      };
    }
    return item;
  });
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
  const classified = classifyApiSourceReachability({
    modules,
    sourceFiles,
    testRoots,
    sourceContents,
  });
  const profileEvidence = collectApiDeploymentProfileEvidence({
    modules: classified.modules,
    productionSources: classified.productionSources,
    testSources: classified.testSources,
    sourceContents,
  });
  const profileClassifications = applyDeploymentProfileClassifications(
    classified.classifications,
    profileEvidence
  );
  const classifiedWithProfiles = { ...classified, classifications: profileClassifications };
  const exportEvidence = collectApiExportReachabilityEvidence({
    modules: classified.modules,
    productionSources: classified.productionSources,
    productionTypeSources: classified.productionTypeSources,
    testSources: classified.testSources,
    sourceContents,
  });
  const changedSourceFiles = options.changedSourceFiles ?? listChangedApiSources();
  const findings = collectApiReachabilityFindings({
    ...classifiedWithProfiles,
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
    ...classifiedWithProfiles,
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
      ({ profile, classification, proof, sources }) =>
        `- ${profile}: ${classification} [${sources.join(', ')}] (${proof})`
    ),
    '[api-production-reachability] dynamic imports:',
    ...result.dynamicImports.map(({ source, target }) => `- ${target}: ${source}`),
  ];
  const productionTypeSupport = result.classifications.filter(
    ({ retentionReason }) => retentionReason === 'production-type-support'
  );
  lines.push(
    '[api-production-reachability] production type support:',
    ...productionTypeSupport.map(({ source }) => `- production-type-support: ${source}`)
  );
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
