/** @ownedConcern Reconcile dynamic imports observed by the graph and TypeScript syntax. */
import { collectDescendants, sourceFileFor, ts } from './typescript-source.mjs';
import { dynamicImportSpecifier } from './module-symbol-references.mjs';

function graphDynamicImports(modules, productionSources) {
  return modules
    .filter(({ source }) => productionSources.has(source))
    .flatMap(({ source, dependencies }) =>
      (dependencies ?? [])
        .filter(({ dynamic }) => dynamic === true)
        .map(({ module }) => ({ source, target: module }))
    )
    .filter(({ target }) => typeof target === 'string');
}

function sourceDynamicImports(source, contents) {
  if (!contents) return [];
  const file = sourceFileFor(source, contents);
  return collectDescendants(file, ts.isCallExpression)
    .map(dynamicImportSpecifier)
    .filter((target) => target !== null)
    .map((target) => ({ source, target }));
}

function observationKey({ source, target }) {
  return [source, target].join('\0');
}

function reportOrder({ source, target }) {
  return [target, source].join('\0');
}

export function dynamicPackageImports(modules, productionSources, sourceContents = new Map()) {
  const graph = graphDynamicImports(modules, productionSources);
  const syntax = [...productionSources]
    .sort()
    .flatMap((source) => sourceDynamicImports(source, sourceContents.get(source)));
  const unique = new Map(
    [...graph, ...syntax].map((observation) => [observationKey(observation), observation])
  );
  return [...unique.values()].sort((left, right) =>
    reportOrder(left).localeCompare(reportOrder(right))
  );
}
