/** @ownedConcern Classify API export consumers and runtime retention. */
import {
  API_PRODUCTION_ROOTS,
  API_SOURCE_FILE_PATTERN,
  API_TEST_FILE_PATTERN,
} from './api-reachability-policy.mjs';
import { indexCruiseModules, normalizeCruiseModules } from './cruise-module-graph.mjs';
import { exportedNames, importedNamesByTarget } from './module-symbol-references.mjs';
import { countIdentifier, sourceFileFor } from './typescript-source.mjs';

function exportKey(source, symbol) {
  return [source, symbol].join('\0');
}

function collectConsumers(moduleMap, sourceContents) {
  const index = new Map();
  for (const [consumer, contents] of sourceContents) {
    const module = moduleMap.get(consumer);
    if (!module) continue;
    const parsed = sourceFileFor(consumer, contents);
    for (const { target, symbol } of importedNamesByTarget(module, parsed)) {
      const key = exportKey(target, symbol);
      const consumers = index.get(key) ?? new Set();
      consumers.add(consumer);
      index.set(key, consumers);
    }
  }
  return index;
}

function consumersFor(index, source, symbol) {
  const direct = index.get(exportKey(source, symbol)) ?? [];
  const namespace = index.get(exportKey(source, '*')) ?? [];
  return [...new Set([...direct, ...namespace])].sort();
}

function classifyExport({ symbol, parsed, source, consumers, productionConsumers, testSources }) {
  if (API_PRODUCTION_ROOTS.includes(source)) return 'production-export';
  if (consumers.some((consumer) => productionConsumers.has(consumer))) return 'production-export';
  if (productionConsumers.has(source) && countIdentifier(parsed, symbol) > 1) {
    return 'production-export';
  }
  if (
    consumers.some((consumer) => API_TEST_FILE_PATTERN.test(consumer) || testSources.has(consumer))
  ) {
    return 'test-support-export';
  }
  return 'unused-export';
}

function sourceExportEvidence(source, contents, { index, productionConsumers, testSources }) {
  const parsed = sourceFileFor(source, contents);
  return exportedNames(parsed).map((symbol) => {
    const consumers = consumersFor(index, source, symbol);
    const classification = classifyExport({
      symbol,
      parsed,
      source,
      consumers,
      productionConsumers,
      testSources,
    });
    return { source, symbol, classification, consumers };
  });
}

export function collectApiExportReachabilityEvidence({
  modules,
  productionSources,
  productionTypeSources = new Set(),
  testSources = new Set(),
  sourceContents,
}) {
  const moduleMap = indexCruiseModules(normalizeCruiseModules(modules));
  const index = collectConsumers(moduleMap, sourceContents);
  const productionConsumers = new Set([...productionSources, ...productionTypeSources]);
  const context = { index, productionConsumers, testSources };
  return [...sourceContents]
    .filter(([source]) => API_SOURCE_FILE_PATTERN.test(source))
    .flatMap(([source, contents]) => sourceExportEvidence(source, contents, context))
    .sort((left, right) =>
      exportKey(left.source, left.symbol).localeCompare(exportKey(right.source, right.symbol))
    );
}
