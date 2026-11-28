/** @ownedConcern Classify module graph reachability from production roots and test roots. */
import {
  analyzeLocalImportSemantics,
  isMeaningfulTypeDependency,
  isRuntimeDependency,
} from './api-local-import-semantics.mjs';
import {
  API_PRODUCTION_ROOTS,
  API_REACHABILITY_CLASSIFICATIONS,
} from './api-reachability-policy.mjs';
import { indexCruiseModules, normalizeCruiseModules } from './cruise-module-graph.mjs';
import { normalizePath } from './source-files.mjs';

function stateMode(current) {
  if (current.mode === 'type') return 'type';
  return current.conditional ? 'conditional' : 'static';
}

function runtimeReached(reached, source) {
  return reached.static.has(source) || reached.conditional.has(source);
}

function discoverDependency(current, dependency, importAnalysis, { reached, queue }) {
  const target = dependency.resolved;
  if (!target?.startsWith('apps/api/')) return;
  if (!runtimeReached(reached, target) && isMeaningfulTypeDependency(dependency, importAnalysis)) {
    queue.push({ source: target, conditional: current.conditional, mode: 'type' });
  }
  if (current.mode === 'type' || !isRuntimeDependency(dependency, importAnalysis)) return;
  queue.push({
    source: target,
    conditional: current.conditional || dependency.dynamic === true,
    mode: 'runtime',
  });
}

function traverseReachability(moduleMap, roots, importAnalysisFor) {
  const reached = { static: new Set(), conditional: new Set(), type: new Set() };
  const visitedStates = new Set();
  const queue = roots.map((source) => ({
    source: normalizePath(source),
    conditional: false,
    mode: 'runtime',
  }));
  const traversal = { reached, queue };

  for (const current of queue) {
    const key = [current.source, current.mode, current.conditional].join('\0');
    if (visitedStates.has(key)) continue;
    visitedStates.add(key);
    reached[stateMode(current)].add(current.source);

    const module = moduleMap.get(current.source);
    if (!module) continue;
    const importAnalysis = importAnalysisFor(module);
    for (const dependency of module.dependencies) {
      discoverDependency(current, dependency, importAnalysis, traversal);
    }
  }
  return reached;
}

function describeSource(source, production, tests) {
  const classes = API_REACHABILITY_CLASSIFICATIONS;
  if (production.static.has(source)) {
    return result(source, classes.production, 'static', 'production-runtime');
  }
  if (production.conditional.has(source)) {
    return result(source, classes.conditionalProduction, 'conditional', 'production-runtime');
  }
  if (production.type.has(source)) {
    return result(source, classes.production, 'none', 'production-type-support');
  }
  if (runtimeReached(tests, source)) {
    return result(source, classes.testSupport, 'test', 'test-support');
  }
  if (tests.type.has(source)) {
    return result(source, classes.testSupport, 'none', 'test-support');
  }
  return result(source, classes.orphan, 'none', 'unretained');
}

function result(source, classification, runtimeReachability, retentionReason) {
  return { source, classification, runtimeReachability, retentionReason };
}

function importAnalysisReader(sourceContents) {
  const contentsBySource = new Map(
    [...sourceContents].map(([path, contents]) => [normalizePath(path), contents])
  );
  const analysis = new Map();
  return (module) => {
    if (!analysis.has(module.source)) {
      analysis.set(
        module.source,
        analyzeLocalImportSemantics(module, contentsBySource.get(module.source))
      );
    }
    return analysis.get(module.source);
  };
}

export function classifyApiSourceReachability({
  modules,
  sourceFiles,
  productionRoots = API_PRODUCTION_ROOTS,
  testRoots,
  sourceContents = new Map(),
}) {
  const normalizedModules = normalizeCruiseModules(modules);
  const moduleMap = indexCruiseModules(normalizedModules);
  const sources = [...new Set(sourceFiles.map(normalizePath))].sort();
  const tests = [...new Set((testRoots ?? []).map(normalizePath))].sort();
  const readAnalysis = importAnalysisReader(sourceContents);
  const fromProduction = traverseReachability(moduleMap, productionRoots, readAnalysis);
  const fromTests = traverseReachability(moduleMap, tests, readAnalysis);

  return {
    modules: normalizedModules,
    classifications: sources.map((source) => describeSource(source, fromProduction, fromTests)),
    productionSources: new Set([...fromProduction.static, ...fromProduction.conditional]),
    productionTypeSources: fromProduction.type,
    testSources: new Set([...fromTests.static, ...fromTests.conditional, ...fromTests.type]),
  };
}
